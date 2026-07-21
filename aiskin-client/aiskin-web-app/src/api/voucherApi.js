import { request } from './httpClient'

/**
 * Xem trước mã giảm giá lúc checkout. Endpoint chỉ tính toán (không ghi DB) — voucher
 * được xác nhận thật sự (tăng lượt dùng) ở backend khi đơn hàng được tạo thành công.
 */
export const voucherApi = {
  validate(code, subtotal) {
    const params = new URLSearchParams({ code, subtotal: String(subtotal) })
    return request(`/vouchers/validate?${params.toString()}`)
  },
}

export default voucherApi
