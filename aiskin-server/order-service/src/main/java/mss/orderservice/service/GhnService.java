package mss.orderservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import mss.orderservice.config.GhnConfig;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GhnService {

    private final GhnConfig ghnConfig;
    private final RestTemplate restTemplate = new RestTemplate();

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Token", ghnConfig.getToken());
        headers.set("ShopId", ghnConfig.getShopId());
        return headers;
    }

    public Map<String, Object> calculateFee(int toDistrictId, String toWardCode, int weight, int serviceTypeId) {
        String url = ghnConfig.getApiUrl() + "/shipping-order/fee";
        
        Map<String, Object> request = new HashMap<>();
        request.put("to_district_id", toDistrictId);
        request.put("to_ward_code", toWardCode);
        request.put("weight", weight);
        request.put("service_type_id", serviceTypeId);
        request.put("insurance_value", 0);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, createHeaders());

        try {
            Map response = restTemplate.postForObject(url, entity, Map.class);
            return (Map<String, Object>) response.get("data");
        } catch (Exception e) {
            log.error("Lỗi tính phí GHN: {}", e.getMessage());
            // Trả về phí mặc định nếu lỗi (Ví dụ: 30k)
            Map<String, Object> defaultFee = new HashMap<>();
            defaultFee.put("total", 30000);
            return defaultFee;
        }
    }

    public String createOrder(Map<String, Object> orderData) {
        String url = ghnConfig.getApiUrl() + "/shipping-order/create";
        
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(orderData, createHeaders());

        try {
            Map response = restTemplate.postForObject(url, entity, Map.class);
            Map<String, Object> data = (Map<String, Object>) response.get("data");
            return (String) data.get("order_code");
        } catch (Exception e) {
            log.error("Lỗi tạo đơn GHN: {}", e.getMessage());
            throw new RuntimeException("Lỗi kết nối GHN");
        }
    }

    public Object getProvinces() {
        String url = ghnConfig.getApiUrl().replace("/v2", "") + "/master-data/province";
        HttpEntity<String> entity = new HttpEntity<>(createHeaders());
        try {
            Map response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, Map.class).getBody();
            return response != null ? response.get("data") : java.util.Collections.emptyList();
        } catch (Exception e) {
            log.error("Lỗi lấy danh sách tỉnh GHN: {}", e.getMessage());
            return java.util.Collections.emptyList();
        }
    }

    public Object getDistricts(int provinceId) {
        String url = ghnConfig.getApiUrl().replace("/v2", "") + "/master-data/district?province_id=" + provinceId;
        HttpEntity<String> entity = new HttpEntity<>(createHeaders());
        try {
            Map response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, Map.class).getBody();
            return response != null ? response.get("data") : java.util.Collections.emptyList();
        } catch (Exception e) {
            log.error("Lỗi lấy danh sách quận huyện GHN: {}", e.getMessage());
            return java.util.Collections.emptyList();
        }
    }

    public Object getWards(int districtId) {
        String url = ghnConfig.getApiUrl().replace("/v2", "") + "/master-data/ward?district_id=" + districtId;
        HttpEntity<String> entity = new HttpEntity<>(createHeaders());
        try {
            Map response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, Map.class).getBody();
            return response != null ? response.get("data") : java.util.Collections.emptyList();
        } catch (Exception e) {
            log.error("Lỗi lấy danh sách phường xã GHN: {}", e.getMessage());
            return java.util.Collections.emptyList();
        }
    }
}
