package mss.productservice.controller;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CatalogWriteAuthorizationTest {

    @Test
    void everyCatalogWriteEndpointRequiresExplicitPermission() {
        List<Class<?>> controllers = List.of(
                BrandController.class,
                CategoryController.class,
                IngredientController.class
        );

        controllers.stream()
                .flatMap(controller -> Arrays.stream(controller.getDeclaredMethods()))
                .filter(this::isWriteEndpoint)
                .forEach(method -> assertThat(method.getAnnotation(PreAuthorize.class))
                        .as("%s.%s must declare its write permission",
                                method.getDeclaringClass().getSimpleName(), method.getName())
                        .isNotNull());
    }

    @Test
    void operationalReadEndpointsRequireManagementAccess() throws NoSuchMethodException {
        Method movements = InventoryController.class.getDeclaredMethod(
                "getMovements", String.class, String.class, int.class, int.class);
        Method endpoints = SystemController.class.getDeclaredMethod("getEndpoints");

        assertThat(movements.getAnnotation(PreAuthorize.class)).isNotNull();
        assertThat(endpoints.getAnnotation(PreAuthorize.class)).isNotNull();
    }

    private boolean isWriteEndpoint(Method method) {
        return method.isAnnotationPresent(PostMapping.class)
                || method.isAnnotationPresent(PutMapping.class)
                || method.isAnnotationPresent(DeleteMapping.class);
    }
}
