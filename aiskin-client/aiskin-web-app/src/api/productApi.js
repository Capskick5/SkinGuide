import { request } from './httpClient'

/**
 * API calls cho Product Service (CRUD products, brands, categories, ingredients).
 * Backend: mss.productservice.controller.*
 */
export const productApi = {
  // ---------- Products ----------
  async listProducts() {
    return request('/api/products')
  },
  async getProduct(id) {
    return request(`/api/products/${id}`)
  },
  async createProduct(data) {
    return request('/api/products', { method: 'POST', body: data })
  },
  async updateProduct(id, data) {
    return request(`/api/products/${id}`, { method: 'PUT', body: data })
  },
  async deleteProduct(id) {
    return request(`/api/products/${id}`, { method: 'DELETE' })
  },
  async searchProducts(keyword) {
    return request(`/api/products/search?keyword=${encodeURIComponent(keyword)}`)
  },

  // ---------- Brands ----------
  async listBrands() {
    return request('/api/brands')
  },
  async getBrand(id) {
    return request(`/api/brands/${id}`)
  },
  async createBrand(data) {
    return request('/api/brands', { method: 'POST', body: data })
  },
  async updateBrand(id, data) {
    return request(`/api/brands/${id}`, { method: 'PUT', body: data })
  },
  async deleteBrand(id) {
    return request(`/api/brands/${id}`, { method: 'DELETE' })
  },

  // ---------- Categories ----------
  async listCategories() {
    return request('/api/categories')
  },
  async getCategory(id) {
    return request(`/api/categories/${id}`)
  },
  async createCategory(data) {
    return request('/api/categories', { method: 'POST', body: data })
  },
  async updateCategory(id, data) {
    return request(`/api/categories/${id}`, { method: 'PUT', body: data })
  },
  async deleteCategory(id) {
    return request(`/api/categories/${id}`, { method: 'DELETE' })
  },

  // ---------- Ingredients ----------
  async listIngredients() {
    return request('/api/ingredients')
  },
  async getIngredient(id) {
    return request(`/api/ingredients/${id}`)
  },
  async createIngredient(data) {
    return request('/api/ingredients', { method: 'POST', body: data })
  },
  async updateIngredient(id, data) {
    return request(`/api/ingredients/${id}`, { method: 'PUT', body: data })
  },
  async deleteIngredient(id) {
    return request(`/api/ingredients/${id}`, { method: 'DELETE' })
  },
}
