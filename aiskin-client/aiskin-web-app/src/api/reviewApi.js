import { request } from './httpClient'

export const reviewApi = {
  getSummary(productId, page = 0, size = 10) {
    return request(`/orders/reviews/product/${encodeURIComponent(productId)}?page=${page}&size=${size}`, { auth: false })
  },

  getEligibility(productId) {
    return request(`/orders/reviews/product/${encodeURIComponent(productId)}/me`)
  },

  create(productId, body) {
    return request(`/orders/reviews/product/${encodeURIComponent(productId)}`, { method: 'POST', body })
  },

  update(reviewId, body) {
    return request(`/orders/reviews/${encodeURIComponent(reviewId)}`, { method: 'PUT', body })
  },

  delete(reviewId) {
    return request(`/orders/reviews/${encodeURIComponent(reviewId)}`, { method: 'DELETE' })
  },
}
