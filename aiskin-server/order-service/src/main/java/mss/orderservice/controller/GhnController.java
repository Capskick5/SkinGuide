package mss.orderservice.controller;

import lombok.RequiredArgsConstructor;
import mss.orderservice.service.GhnService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import mss.orderservice.service.IGhnService;

@RestController
@RequestMapping("/api/ghn")
@RequiredArgsConstructor
public class GhnController {

    private final IGhnService ghnService;

    @GetMapping("/provinces")
    public ResponseEntity<?> getProvinces() {
        return ResponseEntity.ok(ghnService.getProvinces());
    }

    @GetMapping("/districts")
    public ResponseEntity<?> getDistricts(@RequestParam int provinceId) {
        return ResponseEntity.ok(ghnService.getDistricts(provinceId));
    }

    @GetMapping("/wards")
    public ResponseEntity<?> getWards(@RequestParam int districtId) {
        return ResponseEntity.ok(ghnService.getWards(districtId));
    }

    @PostMapping("/fee")
    public ResponseEntity<?> calculateFee(@RequestBody Map<String, Object> request) {
        int toDistrictId = Integer.parseInt(request.get("to_district_id").toString());
        String toWardCode = request.get("to_ward_code").toString();
        int weight = request.containsKey("weight") ? Integer.parseInt(request.get("weight").toString()) : 500;
        int serviceTypeId = request.containsKey("service_type_id") ? Integer.parseInt(request.get("service_type_id").toString()) : 2;
        return ResponseEntity.ok(ghnService.calculateFee(toDistrictId, toWardCode, weight, serviceTypeId));
    }
}
