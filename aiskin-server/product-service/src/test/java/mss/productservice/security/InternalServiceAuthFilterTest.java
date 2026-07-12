package mss.productservice.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class InternalServiceAuthFilterTest {

    private final InternalServiceAuthFilter filter = new InternalServiceAuthFilter("test-secret");

    @Test
    void rejectsInternalRequestWithoutServiceToken() throws Exception {
        MockHttpServletRequest request = internalRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        verify(chain, never()).doFilter(request, response);
    }

    @Test
    void acceptsInternalRequestWithMatchingServiceToken() throws Exception {
        MockHttpServletRequest request = internalRequest();
        request.addHeader(InternalServiceAuthFilter.TOKEN_HEADER, "test-secret");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(chain).doFilter(request, response);
    }

    @Test
    void protectsInternalProductImport() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST", "/api/products/internal/import/json");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        verify(chain, never()).doFilter(request, response);
    }

    private MockHttpServletRequest internalRequest() {
        return new MockHttpServletRequest("POST", "/api/products/inventory/internal/reserve");
    }
}
