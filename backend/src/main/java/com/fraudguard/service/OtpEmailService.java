// com.fraudguard.service.OtpEmailService
package com.fraudguard.service;

import com.fraudguard.exception.OtpDeliveryException;
import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Enterprise email dispatch service for 3D Secure (3DS) OTP challenge delivery.
 */
@Slf4j
@Service
public class OtpEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Autowired
    public OtpEmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Constructs and dispatches a secure HTML OTP challenge email to the account holder.
     *
     * @param toEmail destination customer email
     * @param customerName customer full name
     * @param rawOtp 6-digit plain text OTP
     * @param amount transaction monetary amount
     * @param currency transaction 3-letter currency code
     * @param transactionId transaction UUID
     * @param expiresAt challenge expiration timestamp
     */
    public void sendOtpEmail(
            String toEmail,
            String customerName,
            String rawOtp,
            BigDecimal amount,
            String currency,
            String transactionId,
            OffsetDateTime expiresAt
    ) {
        String shortTxnId = transactionId != null && transactionId.length() >= 8
                ? transactionId.substring(0, 8).toUpperCase()
                : (transactionId != null ? transactionId : "N/A");

        // Format spaced OTP for display (e.g. "0 4 7 2 9 1")
        String spacedOtp = rawOtp.chars()
                .mapToObj(c -> String.valueOf((char) c))
                .reduce((a, b) -> a + " " + b)
                .orElse(rawOtp);

        String subject = String.format("FraudGuard: Your verification code is %s", rawOtp);
        String htmlContent = buildHtmlEmail(customerName, spacedOtp, amount, currency, shortTxnId);

        // Always log OTP prominently in system logs for instant developer and test verification
        log.info("╔════════════════════════════════════════════════════════════════╗");
        log.info("║ 🛡️ 3DS OTP STEP-UP CODE DISPATCHED                            ║");
        log.info("║ To:        {}                                 ║", toEmail);
        log.info("║ Code:      {}                                                 ║", rawOtp);
        log.info("║ Amount:    {} {}                                              ║", amount, currency);
        log.info("║ Txn Ref:   {}                                           ║", shortTxnId);
        log.info("║ Expires:   {}                             ║", expiresAt);
        log.info("╚════════════════════════════════════════════════════════════════╝");

        // If mailSender is not configured or in local mock mode (no username and default host), complete successfully
        if (mailSender == null || mailUsername == null || mailUsername.isBlank()) {
            log.info("No SMTP username configured; logged OTP challenge to console for local testing.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailUsername.contains("@") ? mailUsername : "security@fraudguard.io", "FraudGuard Security");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Successfully delivered 3DS OTP email via SMTP to [{}]", toEmail);

        } catch (Exception ex) {
            log.error("Failed to transmit 3DS OTP email to [{}] via SMTP: {}", toEmail, ex.getMessage(), ex);
            // If explicit SMTP credentials are provided, treat delivery failure as a critical exception
            throw new OtpDeliveryException("Failed to send 3DS OTP email: " + ex.getMessage(), ex);
        }
    }

    private String buildHtmlEmail(String name, String spacedOtp, BigDecimal amount, String cur, String ref) {
        String safeName = name != null && !name.isBlank() ? name : "Valued Customer";
        String amountFormatted = amount != null ? String.format("$%,.2f", amount) : "$0.00";

        return """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FraudGuard Security Check</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 16px 32px; border-bottom: 1px solid #334155; background: linear-gradient(180deg, #1e1b4b 0%%, #1e293b 100%%);">
              <div style="font-size: 24px; line-height: 1; margin-bottom: 8px;">🛡️</div>
              <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">FraudGuard Security Check</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">3D Secure Two-Factor Step-Up Authentication</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #e2e8f0; line-height: 1.5;">Hi <strong>%s</strong>,</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #cbd5e1; line-height: 1.6;">
                A transaction of <strong style="color: #ffffff;">%s %s</strong> requires your authorization before it can be processed.
              </p>

              <!-- Passcode Box -->
              <div style="background-color: #090d16; border: 2px dashed #4f46e5; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 24px;">
                <span style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #818cf8; letter-spacing: 0.1em; margin-bottom: 8px;">Your One-Time Passcode</span>
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; color: #38bdf8; letter-spacing: 0.25em;">%s</span>
              </div>

              <!-- Rules & Timing -->
              <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="font-size: 12px; color: #94a3b8; padding-bottom: 6px;">⏱️ <strong>Expires:</strong> In 5 minutes</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #94a3b8; padding-bottom: 6px;">🔒 <strong>Attempts allowed:</strong> 3 attempts maximum</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #94a3b8;">🔖 <strong>Transaction Ref:</strong> <code style="color: #cbd5e1; background: #0f172a; padding: 2px 6px; border-radius: 4px;">%s</code></td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #334155; padding-top: 16px;">
                If you did not initiate this payment, please contact FraudGuard support immediately. Never share this code with anyone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""".formatted(safeName, amountFormatted, cur != null ? cur : "USD", spacedOtp, ref);
    }
}
