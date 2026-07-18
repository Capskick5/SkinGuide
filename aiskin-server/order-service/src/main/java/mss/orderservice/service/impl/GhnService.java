package mss.orderservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import mss.orderservice.config.GhnConfig;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import mss.orderservice.service.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GhnService implements IGhnService {

    private static final String PROVINCE_FALLBACK_API = "https://provinces.open-api.vn/api/v1";

    private final GhnConfig ghnConfig;

    private final RestTemplate restTemplate;

    private final AtomicBoolean credentialsRejected = new AtomicBoolean(false);

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (hasText(ghnConfig.getToken())) {
            headers.set("Token", ghnConfig.getToken());
        }
        if (hasText(ghnConfig.getShopId())) {
            headers.set("ShopId", ghnConfig.getShopId());
        }
        return headers;
    }

    public Map<String, Object> calculateFee(int toDistrictId, String toWardCode, int weight, int serviceTypeId) {
        if (!canCallGhn()) {
            return fallbackFee();
        }
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
            rejectInvalidCredentials(e);
            log.warn("Không tính được phí GHN, dùng phí dự phòng ({})", failureSummary(e));
            return fallbackFee();
        }
    }

    public Map<String, Object> createOrder(Map<String, Object> orderData) {
        if (!canCallGhn()) {
            throw new IllegalStateException("GHN chưa được cấu hình hoặc credential đã bị từ chối");
        }
        String url = ghnConfig.getApiUrl() + "/shipping-order/create";
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(orderData, createHeaders());
        try {
            Map response = restTemplate.postForObject(url, entity, Map.class);
            return (Map<String, Object>) response.get("data");
        } catch (Exception e) {
            rejectInvalidCredentials(e);
            throw new IllegalStateException("Không thể tạo vận đơn GHN", e);
        }
    }

    public Map<String, Object> getOrderDetail(String trackingCode) {
        if (!canCallGhn()) {
            return null;
        }
        String url = ghnConfig.getApiUrl() + "/shipping-order/detail";
        Map<String, Object> request = new HashMap<>();
        request.put("order_code", trackingCode);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, createHeaders());
        try {
            Map response = restTemplate.postForObject(url, entity, Map.class);
            return (Map<String, Object>) response.get("data");
        } catch (Exception e) {
            rejectInvalidCredentials(e);
            log.warn("Không lấy được chi tiết đơn GHN {} ({})", trackingCode, failureSummary(e));
            return null;
        }
    }

    public List<?> getProvinces() {
        String url = ghnConfig.getApiUrl().replace("/v2", "") + "/master-data/province";
        return getMasterData(url, "tỉnh/thành phố", "/p/", null, "ProvinceID", "ProvinceName");
    }

    public List<?> getDistricts(int provinceId) {
        String url = ghnConfig.getApiUrl().replace("/v2", "") + "/master-data/district?province_id=" + provinceId;
        return getMasterData(url, "quận/huyện", "/p/" + provinceId + "?depth=2", "districts", "DistrictID", "DistrictName");
    }

    public List<?> getWards(int districtId) {
        String url = ghnConfig.getApiUrl().replace("/v2", "") + "/master-data/ward?district_id=" + districtId;
        return getMasterData(url, "phường/xã", "/d/" + districtId + "?depth=2", "wards", "WardCode", "WardName");
    }

    private List<?> getMasterData(String url, String label, String fallbackPath, String nestedListKey, String targetCodeKey, String targetNameKey) {
        if (!canCallGhn()) {
            return getFallbackOptions(fallbackPath, nestedListKey, targetCodeKey, targetNameKey);
        }
        HttpEntity<String> entity = new HttpEntity<>(createHeaders());
        try {
            Map response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, Map.class).getBody();
            Object data = response != null ? response.get("data") : null;
            if (data instanceof List<?> list && !list.isEmpty()) {
                return list;
            }
            throw new IllegalStateException("GHN trả về danh sách rỗng");
        } catch (Exception e) {
            rejectInvalidCredentials(e);
            log.warn("Không lấy được danh sách {} từ GHN, dùng dữ liệu dự phòng ({})", label, failureSummary(e));
            return getFallbackOptions(fallbackPath, nestedListKey, targetCodeKey, targetNameKey);
        }
    }

    private boolean canCallGhn() {
        return hasText(ghnConfig.getToken()) && hasText(ghnConfig.getShopId()) && !credentialsRejected.get();
    }

    private void rejectInvalidCredentials(Exception exception) {
        if (exception instanceof HttpClientErrorException clientError && (clientError.getStatusCode().value() == 401 || clientError.getStatusCode().value() == 403)) {
            if (credentialsRejected.compareAndSet(false, true)) {
                log.warn("GHN credential bị từ chối; tạm ngừng gọi GHN cho tới khi service restart");
            }
        }
    }

    private Map<String, Object> fallbackFee() {
        Map<String, Object> fee = new HashMap<>();
        fee.put("total", 30000);
        fee.put("source", "FALLBACK");
        return fee;
    }

    private String failureSummary(Exception exception) {
        if (exception instanceof HttpClientErrorException clientError) {
            return "HTTP " + clientError.getStatusCode().value();
        }
        return exception.getClass().getSimpleName();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    /**
     * Keep local checkout usable when GHN credentials are absent/expired.
     * The fallback API uses the same three-level administrative structure but
     * different field names, so values are normalized to the GHN response shape.
     */
    private List<Map<String, Object>> getFallbackOptions(String path, String nestedListKey, String targetCodeKey, String targetNameKey) {
        try {
            Object response = restTemplate.getForObject(PROVINCE_FALLBACK_API + path, Object.class);
            Object rawItems = nestedListKey == null ? response : response instanceof Map<?, ?> map ? map.get(nestedListKey) : null;
            if (!(rawItems instanceof List<?> items)) {
                return java.util.Collections.emptyList();
            }
            List<Map<String, Object>> normalized = items.stream().filter(Map.class::isInstance).map(Map.class::cast).filter(item -> item.get("code") != null && item.get("name") != null).map(item -> {
                Map<String, Object> option = new HashMap<>();
                option.put(targetCodeKey, "WardCode".equals(targetCodeKey) ? String.valueOf(item.get("code")) : item.get("code"));
                option.put(targetNameKey, item.get("name"));
                return option;
            }).toList();
            log.warn("Đang dùng dữ liệu địa giới dự phòng cho {} ({} mục)", path, normalized.size());
            return normalized;
        } catch (Exception fallbackError) {
            log.error("Không tải được dữ liệu địa giới dự phòng {}: {}", path, fallbackError.getMessage());
            return java.util.Collections.emptyList();
        }
    }
}
