package mss.orderservice.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/orders");

    @Test
    void mapsMissingPermissionToSafeForbiddenResponse() {
        ResponseEntity<ApiError> response = handler.handleAccessDenied(
                new AccessDeniedException("internal role detail"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).doesNotContain("internal role detail");
    }

    @Test
    void unexpectedErrorsDoNotExposeInternalMessages() {
        ResponseEntity<ApiError> response = handler.handleUnexpected(
                new RuntimeException("mongodb://database-host.internal:27017"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("Đã xảy ra lỗi hệ thống");
        assertThat(response.getBody().message()).doesNotContain("database-host.internal");
    }
}
