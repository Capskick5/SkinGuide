package mss.userservice.dto;

/**
 * Generic response for OTP-issuing endpoints.
 * `devOtp` is populated only in dev (app.otp.expose-in-response=true).
 */
public record OtpResponse(
        String message,
        String devOtp
) {
}
