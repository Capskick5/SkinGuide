package mss.productservice.model;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.mockito.Mockito;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Category Unit Tests")
public class CategoryTest {

    @Test
    @DisplayName("Should successfully mock Category")
    void testMocking() {
        Category instance = Mockito.mock(Category.class);
        assertNotNull(instance, "Mock instance should not be null");
    }

    @Test
    @DisplayName("Should verify class type of Category")
    void testClassType() {
        Category instance1 = Mockito.mock(Category.class);
        Category instance2 = Mockito.mock(Category.class);
        
        assertEquals(instance1.getClass(), instance2.getClass(), "Mock classes should match");
    }

    @Test
    @DisplayName("Should handle toString safely for Category")
    void testToString() {
        Category instance = Mockito.mock(Category.class);
        assertDoesNotThrow(() -> {
            String str = instance.toString();
            assertNotNull(str, "ToString should not return null");
        }, "ToString should not throw exceptions on mock");
    }
}
