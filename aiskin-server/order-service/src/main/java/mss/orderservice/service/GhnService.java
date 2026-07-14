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
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GhnService {

    private static final String PROVINCE_FALLBACK_API = "https://provinces.open-api.vn/api/v1";

    private final GhnConfig ghnConfig;
    private final RestTemplate restTemplate;

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

    public Map<String, Object> getOrderDetail(String trackingCode) {
        String url = ghnConfig.getApiUrl() + "/shipping-order/detail";
        
        Map<String, Object> request = new HashMap<>();
        request.put("order_code", trackingCode);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, createHeaders());

        try {
            Map response = restTemplate.postForObject(url, entity, Map.class);
            return (Map<String, Object>) response.get("data");
        } catch (Exception e) {
            log.error("Lỗi lấy chi tiết đơn GHN {}: {}", trackingCode, e.getMessage());
            return null;
        }
    }

    public List<?> getProvinces() {
        String url = ghnConfig.getApiUrl().replace("/v2", "") + "/master-data/province";
        return getMasterData(url, "tỉnh/thành phố", "/p/", null, "ProvinceID", "ProvinceName");
    }

    public List<?> getDistricts(int provinceId) {
        String url = ghnConfig.getApiUrl().replace("/v2", "") + "/master-data/district?province_id=" + provinceId;
        return getMasterData(url, "quận/huyện", "/p/" + provinceId + "?depth=2",
                "districts", "DistrictID", "DistrictName");
    }

    public List<?> getWards(int districtId) {
        String url = ghnConfig.getApiUrl().replace("/v2", "") + "/master-data/ward?district_id=" + districtId;
        return getMasterData(url, "phường/xã", "/d/" + districtId + "?depth=2",
                "wards", "WardCode", "WardName");
    }

    private List<?> getMasterData(
            String url,
            String label,
            String fallbackPath,
            String nestedListKey,
            String targetCodeKey,
            String targetNameKey) {
        HttpEntity<String> entity = new HttpEntity<>(createHeaders());
        try {
            Map response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, Map.class).getBody();
            Object data = response != null ? response.get("data") : null;
            if (data instanceof List<?> list && !list.isEmpty()) {
                return list;
            }
            throw new IllegalStateException("GHN trả về danh sách rỗng");
        } catch (Exception e) {
            log.error("Lỗi lấy danh sách {} GHN: {}", label, e.getMessage());
            return getFallbackOptions(fallbackPath, nestedListKey, targetCodeKey, targetNameKey);
        }
    }

    /**
     * Keep local checkout usable when GHN credentials are absent/expired.
     * The fallback API uses the same three-level administrative structure but
     * different field names, so values are normalized to the GHN response shape.
     */
    private List<Map<String, Object>> getFallbackOptions(
            String path,
            String nestedListKey,
            String targetCodeKey,
            String targetNameKey) {
        try {
            Object response = restTemplate.getForObject(PROVINCE_FALLBACK_API + path, Object.class);
            Object rawItems = nestedListKey == null
                    ? response
                    : response instanceof Map<?, ?> map ? map.get(nestedListKey) : null;

            if (!(rawItems instanceof List<?> items)) {
                return java.util.Collections.emptyList();
            }

            List<Map<String, Object>> normalized = items.stream()
                    .filter(Map.class::isInstance)
                    .map(Map.class::cast)
                    .filter(item -> item.get("code") != null && item.get("name") != null)
                    .map(item -> {
                        Map<String, Object> option = new HashMap<>();
                        option.put(targetCodeKey, "WardCode".equals(targetCodeKey)
                                ? String.valueOf(item.get("code"))
                                : item.get("code"));
                        option.put(targetNameKey, item.get("name"));
                        return option;
                    })
                    .toList();
            log.warn("Đang dùng dữ liệu địa giới dự phòng cho {} ({} mục)", path, normalized.size());
            return normalized;
        } catch (Exception fallbackError) {
            log.error("Không tải được dữ liệu địa giới dự phòng {}: {}", path, fallbackError.getMessage());
            return java.util.Collections.emptyList();
        }
    }
}
