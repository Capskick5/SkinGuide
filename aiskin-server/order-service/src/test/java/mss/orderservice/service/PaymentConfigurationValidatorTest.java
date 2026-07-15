package mss.orderservice.service;

import mss.orderservice.config.MomoConfig;
import mss.orderservice.config.VnpayConfig;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PaymentConfigurationValidatorTest {

    @Test
    void missingOrPlaceholderSecretsAreNotConsideredConfigured() {
        MomoConfig momo = new MomoConfig();
        momo.setEndpoint("https://momo.test/create");
        momo.setPartnerCode("PARTNER");
        momo.setAccessKey("ACCESS");
        momo.setSecretKey("REPLACE_WITH_SECRET");
        momo.setReturnUrl("http://localhost/momo-return");
        momo.setNotifyUrl("http://localhost/momo-ipn");
        PaymentConfigurationValidator validator =
                new PaymentConfigurationValidator(momo, new VnpayConfig());

        assertThat(validator.isMomoConfigured()).isFalse();
        assertThatThrownBy(validator::requireMomoConfigured)
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("chưa được cấu hình");
    }

    @Test
    void completeVnpayConfigurationIsAccepted() {
        VnpayConfig vnpay = new VnpayConfig();
        vnpay.setTmnCode("TMN");
        vnpay.setHashSecret("SECRET");
        vnpay.setUrl("https://vnpay.test/pay");
        vnpay.setReturnUrl("http://localhost/vnpay-return");
        PaymentConfigurationValidator validator =
                new PaymentConfigurationValidator(new MomoConfig(), vnpay);

        assertThat(validator.isVnpayConfigured()).isTrue();
    }
}
