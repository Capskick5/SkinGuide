package mss.orderservice.service;

import mss.orderservice.config.GhnConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GhnServiceTest {

    private static final String API_URL = "https://ghn.test/shiip/public-api/v2";

    private GhnService service;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        GhnConfig config = new GhnConfig();
        config.setApiUrl(API_URL);
        config.setToken("token");
        config.setShopId("shop");
        RestTemplate restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        service = new GhnService(config, restTemplate);
    }

    @Test
    void returnsProvinceDataFromGhnEnvelope() {
        server.expect(requestTo("https://ghn.test/shiip/public-api/master-data/province"))
                .andRespond(withSuccess("""
                        {"code":200,"data":[{"ProvinceID":202,"ProvinceName":"Hồ Chí Minh"}]}
                        """, MediaType.APPLICATION_JSON));

        List<?> provinces = service.getProvinces();

        assertThat(provinces).hasSize(1);
        server.verify();
    }

    @Test
    void reportsServiceUnavailableInsteadOfReturningAnEmptyList() {
        server.expect(requestTo("https://ghn.test/shiip/public-api/master-data/province"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(service::getProvinces)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode())
                        .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
        server.verify();
    }
}
