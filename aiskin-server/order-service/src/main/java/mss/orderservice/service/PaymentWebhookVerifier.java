// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.service;

import mss.orderservice.config.MomoConfig;
import mss.orderservice.config.MomoEncoderUtils;
import mss.orderservice.config.VnpayConfig;
import mss.orderservice.utils.VnpayUtils;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@Service
public class PaymentWebhookVerifier {

    private final MomoConfig momoConfig;
    private final VnpayConfig vnpayConfig;
    private final PaymentConfigurationValidator configurationValidator;

    public PaymentWebhookVerifier(
            MomoConfig momoConfig,
            VnpayConfig vnpayConfig,
            PaymentConfigurationValidator configurationValidator) {
        this.momoConfig = momoConfig;
        this.vnpayConfig = vnpayConfig;
        this.configurationValidator = configurationValidator;
    }

    public boolean verifyMomo(Map<String, Object> payload) {
        if (!configurationValidator.isMomoConfigured()) {
            return false;
        }
        String supplied = value(payload.get("signature"));
        String partnerCode = value(payload.get("partnerCode"));
        if (supplied.isBlank() || !constantTimeEquals(momoConfig.getPartnerCode(), partnerCode)) {
            return false;
        }
        String raw = "accessKey=" + momoConfig.getAccessKey()
                + "&amount=" + value(payload.get("amount"))
                + "&extraData=" + value(payload.get("extraData"))
                + "&message=" + value(payload.get("message"))
                + "&orderId=" + value(payload.get("orderId"))
                + "&orderInfo=" + value(payload.get("orderInfo"))
                + "&orderType=" + value(payload.get("orderType"))
                + "&partnerCode=" + value(payload.get("partnerCode"))
                + "&payType=" + value(payload.get("payType"))
                + "&requestId=" + value(payload.get("requestId"))
                + "&responseTime=" + value(payload.get("responseTime"))
                + "&resultCode=" + value(payload.get("resultCode"))
                + "&transId=" + value(payload.get("transId"));
        String expected = MomoEncoderUtils.signHmacSHA256(raw, momoConfig.getSecretKey());
        return constantTimeEquals(expected, supplied);
    }

    public boolean verifyVnpay(Map<String, String> payload) {
        if (!configurationValidator.isVnpayConfigured()) {
            return false;
        }
        String supplied = payload.getOrDefault("vnp_SecureHash", "");
        if (supplied.isBlank()) {
            return false;
        }
        String terminalCode = payload.get("vnp_TmnCode");
        if (terminalCode != null && !constantTimeEquals(vnpayConfig.getTmnCode(), terminalCode)) {
            return false;
        }
        Map<String, String> signedFields = new java.util.HashMap<>(payload);
        signedFields.remove("vnp_SecureHash");
        signedFields.remove("vnp_SecureHashType");
        String expected = VnpayUtils.hmacSHA512(
                vnpayConfig.getHashSecret().trim(),
                VnpayUtils.canonicalize(signedFields));
        return constantTimeEquals(expected.toLowerCase(), supplied.toLowerCase());
    }

    private String value(Object value) {
        return value == null ? "" : value.toString();
    }

    private boolean constantTimeEquals(String expected, String supplied) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                supplied.getBytes(StandardCharsets.UTF_8));
    }
}
