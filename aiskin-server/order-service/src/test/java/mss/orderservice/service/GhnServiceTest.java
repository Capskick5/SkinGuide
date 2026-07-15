package mss.orderservice.service;

import mss.orderservice.config.GhnConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

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
    void fallsBackToOpenProvinceDataWhenGhnIsUnavailable() {
        server.expect(requestTo("https://ghn.test/shiip/public-api/master-data/province"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));
        server.expect(requestTo("https://provinces.open-api.vn/api/v1/p/"))
                .andRespond(withSuccess("""
                        [{"code":79,"name":"Hồ Chí Minh"}]
                        """, MediaType.APPLICATION_JSON));

        List<?> provinces = service.getProvinces();

        assertThat(provinces).hasSize(1);
        java.util.Map<?, ?> province = (java.util.Map<?, ?>) provinces.getFirst();
        assertThat(province.get("ProvinceID")).isEqualTo(79);
        assertThat(province.get("ProvinceName")).isEqualTo("Hồ Chí Minh");

        Map<String, Object> fee = service.calculateFee(1, "1", 500, 2);
        assertThat(fee).containsEntry("total", 30000).containsEntry("source", "FALLBACK");
        server.verify();
    }

    @Test
    void refusesShipmentCreationWhenCredentialsAreMissing() {
        GhnConfig config = new GhnConfig();
        config.setApiUrl(API_URL);
        GhnService unconfiguredService = new GhnService(config, new RestTemplate());

        assertThatThrownBy(() -> unconfiguredService.createOrder(Map.of()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GHN chưa được cấu hình");
    }
}
