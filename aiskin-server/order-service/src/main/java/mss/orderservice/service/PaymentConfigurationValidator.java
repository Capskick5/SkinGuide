// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.service;

import lombok.RequiredArgsConstructor;
import mss.orderservice.config.MomoConfig;
import mss.orderservice.config.VnpayConfig;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.stream.Stream;

@Component
@RequiredArgsConstructor
public class PaymentConfigurationValidator {

    private final MomoConfig momoConfig;
    private final VnpayConfig vnpayConfig;

    public boolean isMomoConfigured() {
        return allConfigured(
                momoConfig.getEndpoint(),
                momoConfig.getPartnerCode(),
                momoConfig.getAccessKey(),
                momoConfig.getSecretKey(),
                momoConfig.getReturnUrl(),
                momoConfig.getNotifyUrl());
    }

    public boolean isVnpayConfigured() {
        return allConfigured(
                vnpayConfig.getTmnCode(),
                vnpayConfig.getHashSecret(),
                vnpayConfig.getUrl(),
                vnpayConfig.getReturnUrl());
    }

    public void requireMomoConfigured() {
        requireConfigured(isMomoConfigured(), "MoMo");
    }

    public void requireVnpayConfigured() {
        requireConfigured(isVnpayConfigured(), "VNPay");
    }

    private boolean allConfigured(String... values) {
        return Stream.of(values).allMatch(this::isConfiguredValue);
    }

    private boolean isConfiguredValue(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String normalized = value.trim().toUpperCase();
        return !normalized.startsWith("REPLACE_") && !normalized.equals("CHANGE_ME");
    }

    private void requireConfigured(boolean configured, String provider) {
        if (!configured) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    provider + " chưa được cấu hình trên máy chủ");
        }
    }
}
