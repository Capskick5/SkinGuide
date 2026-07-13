package mss.orderservice.service;

import mss.orderservice.config.MomoConfig;
import mss.orderservice.config.MomoEncoderUtils;
import mss.orderservice.config.VnpayConfig;
import mss.orderservice.utils.VnpayUtils;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentWebhookVerifierTest {

    private final MomoConfig momoConfig = momoConfig();
    private final VnpayConfig vnpayConfig = vnpayConfig();
    private final PaymentWebhookVerifier verifier = new PaymentWebhookVerifier(momoConfig, vnpayConfig);

    @Test
    void acceptsValidMomoSignatureAndRejectsTamperedAmount() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("amount", 130000);
        payload.put("extraData", "");
        payload.put("message", "Successful.");
        payload.put("orderId", "ORD-1");
        payload.put("orderInfo", "Thanh toan");
        payload.put("orderType", "momo_wallet");
        payload.put("partnerCode", "PARTNER");
        payload.put("payType", "qr");
        payload.put("requestId", "req-1");
        payload.put("responseTime", 123456789L);
        payload.put("resultCode", 0);
        payload.put("transId", 99L);
        String raw = "accessKey=ACCESS&amount=130000&extraData=&message=Successful."
                + "&orderId=ORD-1&orderInfo=Thanh toan&orderType=momo_wallet"
                + "&partnerCode=PARTNER&payType=qr&requestId=req-1"
                + "&responseTime=123456789&resultCode=0&transId=99";
        payload.put("signature", MomoEncoderUtils.signHmacSHA256(raw, "SECRET"));

        assertThat(verifier.verifyMomo(payload)).isTrue();
        payload.put("amount", 1);
        assertThat(verifier.verifyMomo(payload)).isFalse();
    }

    @Test
    void acceptsValidVnpaySignatureAndRejectsTampering() {
        Map<String, String> payload = new HashMap<>();
        payload.put("vnp_Amount", "13000000");
        payload.put("vnp_TxnRef", "ORD-1");
        payload.put("vnp_SecureHash", VnpayUtils.hmacSHA512(
                "VNP_SECRET", "vnp_Amount=13000000&vnp_TxnRef=ORD-1"));

        assertThat(verifier.verifyVnpay(payload)).isTrue();
        payload.put("vnp_Amount", "100");
        assertThat(verifier.verifyVnpay(payload)).isFalse();
    }

    private MomoConfig momoConfig() {
        MomoConfig config = new MomoConfig();
        config.setAccessKey("ACCESS");
        config.setSecretKey("SECRET");
        return config;
    }

    private VnpayConfig vnpayConfig() {
        VnpayConfig config = new VnpayConfig();
        config.setHashSecret("VNP_SECRET");
        return config;
    }
}
