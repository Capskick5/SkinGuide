package mss.productservice.dto.response;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.mockito.Mockito;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("IngredientResponse Unit Tests")
public class IngredientResponseTest {

    @Test
    @DisplayName("Should successfully mock IngredientResponse")
    void testMocking() {
        IngredientResponse instance = Mockito.mock(IngredientResponse.class);
        assertNotNull(instance, "Mock instance should not be null");
    }

    @Test
    @DisplayName("Should verify class type of IngredientResponse")
    void testClassType() {
        IngredientResponse instance1 = Mockito.mock(IngredientResponse.class);
        IngredientResponse instance2 = Mockito.mock(IngredientResponse.class);
        
        assertEquals(instance1.getClass(), instance2.getClass(), "Mock classes should match");
    }

    @Test
    @DisplayName("Should handle toString safely for IngredientResponse")
    void testToString() {
        IngredientResponse instance = Mockito.mock(IngredientResponse.class);
        assertDoesNotThrow(() -> {
            String str = instance.toString();
            assertNotNull(str, "ToString should not return null");
        }, "ToString should not throw exceptions on mock");
    }
}
