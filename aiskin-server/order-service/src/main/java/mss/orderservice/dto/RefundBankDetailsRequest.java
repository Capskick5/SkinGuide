package mss.orderservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RefundBankDetailsRequest(
        @NotBlank(message = "Tên ngân hàng là bắt buộc")
        @Size(max = 100, message = "Tên ngân hàng tối đa 100 ký tự")
        String bankName,

        @NotBlank(message = "Số tài khoản là bắt buộc")
        @Pattern(regexp = "^[0-9]{6,20}$", message = "Số tài khoản phải gồm 6 đến 20 chữ số")
        String accountNumber,

        @NotBlank(message = "Tên chủ tài khoản là bắt buộc")
        @Size(max = 100, message = "Tên chủ tài khoản tối đa 100 ký tự")
        String accountName
) {
}
