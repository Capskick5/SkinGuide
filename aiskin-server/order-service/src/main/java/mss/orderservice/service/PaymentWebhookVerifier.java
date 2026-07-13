package mss.orderservice.service;

import mss.orderservice.config.MomoConfig;
import mss.orderservice.config.MomoEncoderUtils;
import mss.orderservice.config.VnpayConfig;
import mss.orderservice.utils.VnpayUtils;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class PaymentWebhookVerifier {

    private final MomoConfig momoConfig;
    private final VnpayConfig vnpayConfig;

    public PaymentWebhookVerifier(MomoConfig momoConfig, VnpayConfig vnpayConfig) {
        this.momoConfig = momoConfig;
        this.vnpayConfig = vnpayConfig;
    }

    public boolean verifyMomo(Map<String, Object> payload) {
        String supplied = value(payload.get("signature"));
        if (supplied.isBlank()) {
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
        String supplied = payload.getOrDefault("vnp_SecureHash", "");
        if (supplied.isBlank()) {
            return false;
        }
        Map<String, String> signedFields = new TreeMap<>(payload);
        signedFields.remove("vnp_SecureHash");
        signedFields.remove("vnp_SecureHashType");
        String canonical = signedFields.entrySet().stream()
                .filter(entry -> entry.getValue() != null && !entry.getValue().isEmpty())
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
        String expected = VnpayUtils.hmacSHA512(vnpayConfig.getHashSecret().trim(), canonical);
        return constantTimeEquals(expected.toLowerCase(), supplied.toLowerCase());
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.US_ASCII);
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
