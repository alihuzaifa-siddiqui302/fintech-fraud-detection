// com.fraudguard.controller.OtpController
package com.fraudguard.controller;

import com.fraudguard.dto.request.OtpVerifyRequest;
import com.fraudguard.dto.response.OtpChallengeDto;
import com.fraudguard.dto.response.OtpVerifyResponseDto;
import com.fraudguard.entity.User;
import com.fraudguard.exception.ApiException;
import com.fraudguard.exception.ResourceNotFoundException;
import com.fraudguard.repository.UserRepository;
import com.fraudguard.service.OtpService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Customer endpoints managing 3D Secure (3DS) two-factor step-up OTP challenge issuance and verification.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/customer/otp")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class OtpController {

    private final OtpService otpService;
    private final UserRepository userRepository;

    /**
     * Issues (or re-issues) a 3DS OTP challenge for a transaction held in PENDING_REVIEW status.
     *
     * @param payload request body containing transactionId
     * @return ResponseEntity with OtpChallengeDto
     */
    @PostMapping("/issue")
    public ResponseEntity<OtpChallengeDto> issueOtpChallenge(@RequestBody Map<String, String> payload) {
        String transactionId = payload != null ? payload.get("transactionId") : null;
        if (transactionId == null || transactionId.isBlank()) {
            throw new ApiException("transactionId is required in request payload", HttpStatus.BAD_REQUEST);
        }

        User user = getAuthenticatedUser();
        log.info("Customer [{}] requested 3DS OTP issue for transaction [{}]", user.getEmail(), transactionId);

        OtpChallengeDto challengeDto = otpService.issueChallenge(transactionId.trim(), user.getEmail());
        return ResponseEntity.ok(challengeDto);
    }

    /**
     * Submits a 6-digit OTP code to verify a pending transaction challenge.
     *
     * @param request validated OtpVerifyRequest
     * @return ResponseEntity with OtpVerifyResponseDto
     */
    @PostMapping("/verify")
    public ResponseEntity<OtpVerifyResponseDto> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        User user = getAuthenticatedUser();
        log.info("Customer [{}] submitting OTP verification for transaction [{}]", user.getEmail(), request.getTransactionId());

        OtpVerifyResponseDto response = otpService.verifyOtp(
                request.getTransactionId().trim(),
                request.getOtp().trim(),
                user.getId()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves current challenge status for a transaction (useful for polling and checkout state restoration).
     *
     * @param transactionId transaction UUID
     * @return ResponseEntity with OtpChallengeDto
     */
    @GetMapping("/status/{transactionId}")
    public ResponseEntity<OtpChallengeDto> getOtpStatus(@PathVariable String transactionId) {
        User user = getAuthenticatedUser();
        OtpChallengeDto challengeDto = otpService.getChallengeStatus(transactionId.trim(), user.getId());
        return ResponseEntity.ok(challengeDto);
    }

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated customer not found: " + email));
    }
}
