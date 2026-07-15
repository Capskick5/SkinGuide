package mss.userservice.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsMissingPermissionToSafeForbiddenResponse() {
        ResponseEntity<ErrorResponse> response = handler.handleAccessDenied(
                new AccessDeniedException("internal role detail"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).doesNotContain("internal role detail");
    }

    @Test
    void unexpectedErrorsDoNotExposeInternalMessages() {
        ResponseEntity<ErrorResponse> response = handler.handleGeneric(
                new RuntimeException("redis://cache.internal:6379"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("Đã xảy ra lỗi không mong muốn");
        assertThat(response.getBody().message()).doesNotContain("cache.internal");
    }
}
