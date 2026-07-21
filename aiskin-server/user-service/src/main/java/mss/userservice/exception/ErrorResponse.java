// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.exception;

import java.time.Instant;
import java.util.Map;

/**
 * Standard error body returned by the API.
 */
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        Map<String, String> fieldErrors
) {
    public static ErrorResponse of(int status, String error, String message) {
        return new ErrorResponse(Instant.now(), status, error, message, null);
    }

    public static ErrorResponse of(int status, String error, String message, Map<String, String> fieldErrors) {
        return new ErrorResponse(Instant.now(), status, error, message, fieldErrors);
    }
}
