// com.fraudguard.service.OtpService
package com.fraudguard.service;

import com.fraudguard.constant.AppConstants;
import com.fraudguard.dto.response.OtpChallengeDto;
import com.fraudguard.dto.response.OtpVerifyResponseDto;
import com.fraudguard.entity.OtpChallenge;
import com.fraudguard.entity.Transaction;
import com.fraudguard.entity.User;
import com.fraudguard.exception.ApiException;
import com.fraudguard.exception.ResourceNotFoundException;
import com.fraudguard.messaging.FraudGuardEventProducer;
import com.fraudguard.messaging.event.TransactionKafkaEvent;
import com.fraudguard.repository.OtpChallengeRepository;
import com.fraudguard.repository.TransactionRepository;
import com.fraudguard.repository.UserRepository;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service managing 3D Secure (3DS) two-factor step-up OTP challenge issuance, verification, and automated expiry.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpChallengeRepository otpChallengeRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final OtpEmailService otpEmailService;
    private final PasswordEncoder passwordEncoder;
    private final FraudGuardEventProducer eventProducer;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${fraudguard.otp.expiry-minutes:5}")
    private int expiryMinutes;

    @Value("${fraudguard.otp.max-attempts:3}")
    private int maxAttempts;

    /**
     * Issues a 6-digit cryptographic OTP challenge for an elevated-risk transaction in PENDING_REVIEW status.
     *
     * @param transactionId transaction UUID
     * @param userEmail account holder email
     * @return OtpChallengeDto containing challenge metadata with masked destination email
     */
    @Transactional
    public OtpChallengeDto issueChallenge(String transactionId, String userEmail) {
        Transaction txn = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + transactionId));

        if (!AppConstants.TransactionStatus.PENDING_REVIEW.equalsIgnoreCase(txn.getStatus())) {
            log.warn("Cannot issue OTP challenge for transaction [{}] with status [{}]", transactionId, txn.getStatus());
            throw new ApiException("Transaction is not in PENDING_REVIEW status: " + txn.getStatus(), HttpStatus.BAD_REQUEST);
        }

        User user = userRepository.findById(txn.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found for transaction: " + txn.getUserId()));

        // Expire any existing pending challenge before issuing a fresh one
        otpChallengeRepository.findByTransactionIdAndStatus(transactionId, "PENDING")
                .ifPresent(existing -> {
                    existing.setStatus("EXPIRED");
                    otpChallengeRepository.save(existing);
                });

        // Generate 6-digit zero-padded OTP using cryptographically secure random generator
        String rawOtp = generateOtp();
        String otpHash = passwordEncoder.encode(rawOtp);
        OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(expiryMinutes > 0 ? expiryMinutes : 5);

        OtpChallenge challenge = OtpChallenge.builder()
                .transactionId(txn.getId())
                .userId(user.getId())
                .otpHash(otpHash)
                .expiresAt(expiresAt)
                .attempts(0)
                .maxAttempts(maxAttempts > 0 ? maxAttempts : 3)
                .status("PENDING")
                .build();

        otpChallengeRepository.save(challenge);

        txn.setOtpRequired(true);
        txn.setOtpStatus("AWAITING_OTP");
        transactionRepository.save(txn);

        // Dispatch notification email
        otpEmailService.sendOtpEmail(
                user.getEmail(),
                user.getName(),
                rawOtp,
                txn.getAmount(),
                txn.getCurrency(),
                txn.getId(),
                expiresAt
        );

        log.info("OTP challenge issued successfully: txn=[{}] user=[{}] expiresAt=[{}]",
                transactionId, user.getEmail(), expiresAt);

        return new OtpChallengeDto(
                txn.getId(),
                challenge.getStatus(),
                challenge.getExpiresAt(),
                challenge.getMaxAttempts(),
                maskEmail(user.getEmail()),
                "Security verification code dispatched. Enter the 6-digit code to complete payment."
        );
    }

    /**
     * Validates a customer-submitted 6-digit OTP code against the hashed challenge record.
     *
     * @param transactionId transaction UUID
     * @param submittedOtp 6-digit passcode
     * @param userId authenticated customer user ID
     * @return OtpVerifyResponseDto containing outcome status, remaining attempts, and navigation hint
     */
    @Transactional
    public OtpVerifyResponseDto verifyOtp(String transactionId, String submittedOtp, String userId) {
        Transaction txn = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + transactionId));

        if (!txn.getUserId().equals(userId)) {
            log.warn("Unauthorized attempt to verify OTP for txn [{}] by user [{}]", transactionId, userId);
            throw new ApiException("Access denied: You do not own this transaction challenge.", HttpStatus.FORBIDDEN);
        }

        Optional<OtpChallenge> activeChallengeOpt = otpChallengeRepository.findByTransactionIdAndStatus(transactionId, "PENDING");

        if (activeChallengeOpt.isEmpty()) {
            Optional<OtpChallenge> anyChallengeOpt = otpChallengeRepository.findByTransactionId(transactionId);
            if (anyChallengeOpt.isPresent()) {
                OtpChallenge last = anyChallengeOpt.get();
                if ("VERIFIED".equalsIgnoreCase(last.getStatus())) {
                    return new OtpVerifyResponseDto(true, "APPROVED", "OTP_VERIFIED", 0,
                            "Transaction has already been verified and approved.", "APPROVED");
                }
                return new OtpVerifyResponseDto(false, "BLOCKED", last.getStatus(), 0,
                        "Challenge is no longer active (" + last.getStatus() + "). Transaction declined.", "BLOCKED");
            }
            throw new ResourceNotFoundException("No active 3DS OTP challenge found for transaction: " + transactionId);
        }

        OtpChallenge challenge = activeChallengeOpt.get();
        OffsetDateTime now = OffsetDateTime.now();

        // 1. Check challenge expiration
        if (now.isAfter(challenge.getExpiresAt())) {
            challenge.setStatus("EXPIRED");
            txn.setOtpStatus("OTP_EXPIRED");
            txn.setStatus(AppConstants.TransactionStatus.BLOCKED);
            otpChallengeRepository.save(challenge);
            transactionRepository.save(txn);
            log.warn("OTP challenge expired for txn [{}]", transactionId);
            return new OtpVerifyResponseDto(false, "BLOCKED", "OTP_EXPIRED", 0,
                    "Verification code expired. Payment blocked for security.", "BLOCKED");
        }

        // 2. Increment attempt counter
        challenge.setAttempts(challenge.getAttempts() + 1);

        if (challenge.getAttempts() > challenge.getMaxAttempts()) {
            challenge.setStatus("EXHAUSTED");
            txn.setOtpStatus("OTP_FAILED");
            txn.setStatus(AppConstants.TransactionStatus.BLOCKED);
            otpChallengeRepository.save(challenge);
            transactionRepository.save(txn);
            log.warn("OTP attempts exhausted for txn [{}]", transactionId);
            return new OtpVerifyResponseDto(false, "BLOCKED", "OTP_FAILED", 0,
                    "Maximum verification attempts exceeded. Payment declined.", "BLOCKED");
        }

        // 3. Verify OTP code matches BCrypt hash
        boolean matches = passwordEncoder.matches(submittedOtp != null ? submittedOtp.trim() : "", challenge.getOtpHash());

        if (!matches) {
            int remaining = challenge.getMaxAttempts() - challenge.getAttempts();
            if (remaining <= 0) {
                challenge.setStatus("EXHAUSTED");
                txn.setOtpStatus("OTP_FAILED");
                txn.setStatus(AppConstants.TransactionStatus.BLOCKED);
                otpChallengeRepository.save(challenge);
                transactionRepository.save(txn);
                log.warn("Last OTP attempt failed for txn [{}], transaction BLOCKED", transactionId);
                return new OtpVerifyResponseDto(false, "BLOCKED", "OTP_FAILED", 0,
                        "Incorrect code. Maximum attempts exceeded. Payment declined.", "BLOCKED");
            }

            otpChallengeRepository.save(challenge);
            log.warn("Invalid OTP submitted for txn [{}], attempts: {}/{}, remaining: {}",
                    transactionId, challenge.getAttempts(), challenge.getMaxAttempts(), remaining);
            return new OtpVerifyResponseDto(false, txn.getStatus(), "AWAITING_OTP", remaining,
                    String.format("Incorrect code. %d %s remaining.", remaining, remaining == 1 ? "attempt" : "attempts"),
                    "RETRY");
        }

        // 4. Success: Approve transaction and finalize challenge
        challenge.setStatus("VERIFIED");
        challenge.setVerifiedAt(now);
        txn.setStatus(AppConstants.TransactionStatus.APPROVED);
        txn.setOtpStatus("OTP_VERIFIED");
        otpChallengeRepository.save(challenge);
        Transaction approvedTxn = transactionRepository.save(txn);

        // Publish transaction decision event to Kafka
        eventProducer.publishTransaction(new TransactionKafkaEvent(
                approvedTxn.getId(),
                approvedTxn.getUserId(),
                approvedTxn.getAmount(),
                approvedTxn.getCurrency(),
                approvedTxn.getStatus(),
                approvedTxn.getRiskScore() != null ? approvedTxn.getRiskScore() : 0,
                approvedTxn.getIpAddress(),
                approvedTxn.getIpCountry(),
                approvedTxn.getIsVpn() != null && approvedTxn.getIsVpn(),
                approvedTxn.getIsTor() != null && approvedTxn.getIsTor(),
                List.of(),
                OffsetDateTime.now(),
                "TXN_DECIDED"
        ));

        log.info("3DS OTP verified successfully — transaction [{}] APPROVED", transactionId);
        return new OtpVerifyResponseDto(true, "APPROVED", "OTP_VERIFIED", 0,
                "Payment successfully verified and approved.", "APPROVED");
    }

    /**
     * Retrieves status metadata for an active or past challenge.
     *
     * @param transactionId transaction UUID
     * @param userId authenticated user ID
     * @return OtpChallengeDto
     */
    @Transactional(readOnly = true)
    public OtpChallengeDto getChallengeStatus(String transactionId, String userId) {
        Transaction txn = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + transactionId));

        if (!txn.getUserId().equals(userId)) {
            throw new ApiException("Access denied: You do not own this transaction.", HttpStatus.FORBIDDEN);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Optional<OtpChallenge> challengeOpt = otpChallengeRepository.findByTransactionId(transactionId);
        if (challengeOpt.isEmpty()) {
            throw new ResourceNotFoundException("No OTP challenge found for transaction: " + transactionId);
        }

        OtpChallenge challenge = challengeOpt.get();
        return new OtpChallengeDto(
                txn.getId(),
                challenge.getStatus(),
                challenge.getExpiresAt(),
                challenge.getMaxAttempts(),
                maskEmail(user.getEmail()),
                "Challenge status: " + challenge.getStatus()
        );
    }

    /**
     * Periodic scheduled task to transition stale pending OTPs to EXPIRED and block associated transactions.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void expireStaleOtps() {
        OffsetDateTime now = OffsetDateTime.now();
        List<OtpChallenge> expiredChallenges = otpChallengeRepository.findByStatusAndExpiresAtBefore("PENDING", now);

        if (expiredChallenges.isEmpty()) {
            return;
        }

        for (OtpChallenge challenge : expiredChallenges) {
            challenge.setStatus("EXPIRED");
            transactionRepository.findById(challenge.getTransactionId()).ifPresent(txn -> {
                if (AppConstants.TransactionStatus.PENDING_REVIEW.equalsIgnoreCase(txn.getStatus())) {
                    txn.setStatus(AppConstants.TransactionStatus.BLOCKED);
                    txn.setOtpStatus("OTP_EXPIRED");
                    txn.setResolutionNotes("System automated block: 3DS OTP verification window expired.");
                    transactionRepository.save(txn);
                }
            });
            otpChallengeRepository.save(challenge);
        }

        log.info("Expired [{}] stale 3DS OTP challenges via scheduled reaper job", expiredChallenges.size());
    }

    /**
     * Generates a 6-digit zero-padded cryptographic integer passcode string.
     */
    public String generateOtp() {
        int code = SECURE_RANDOM.nextInt(1_000_000);
        return String.format("%06d", code);
    }

    /**
     * Masks customer email address preserving initial character and domain (e.g. "alex@gmail.com" -> "a***@gmail.com").
     */
    public String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "u***@example.com";
        }
        int atIndex = email.indexOf('@');
        String namePart = email.substring(0, atIndex);
        String domainPart = email.substring(atIndex);

        if (namePart.length() <= 1) {
            return namePart + "***" + domainPart;
        }
        return namePart.charAt(0) + "***" + domainPart;
    }
}
