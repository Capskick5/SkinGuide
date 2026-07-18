package mss.orderservice.service;

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

public interface IGhnService {

    Map<String, Object> calculateFee(int toDistrictId, String toWardCode, int weight, int serviceTypeId);

    Map<String, Object> createOrder(Map<String, Object> orderData);

    Map<String, Object> getOrderDetail(String trackingCode);

    List<?> getProvinces();

    List<?> getDistricts(int provinceId);

    List<?> getWards(int districtId);
}
