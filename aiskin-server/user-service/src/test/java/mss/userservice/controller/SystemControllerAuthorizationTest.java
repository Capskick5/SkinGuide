package mss.userservice.controller;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import static org.assertj.core.api.Assertions.assertThat;

class SystemControllerAuthorizationTest {

    @Test
    void endpointInventoryRequiresAdminRole() throws NoSuchMethodException {
        PreAuthorize authorization = SystemController.class
                .getDeclaredMethod("getEndpoints")
                .getAnnotation(PreAuthorize.class);

        assertThat(authorization).isNotNull();
        assertThat(authorization.value()).isEqualTo("hasRole('ADMIN')");
    }
}
