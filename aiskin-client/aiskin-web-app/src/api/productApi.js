import { request } from './httpClient'

/**
 * API calls cho Product Service (CRUD products, brands, categories, ingredients).
 * Backend: mss.productservice.controller.*
 */
export const productApi = {
  // ---------- Products ----------
  async listProducts() {
    return request('/products')
  },
  async listActiveProducts() {
    return request('/products/active')
  },
  async getProduct(id) {
    return request(`/products/${id}`)
  },
  async getProductBySlug(slug) {
    return request(`/products/slug/${encodeURIComponent(slug)}`)
  },
  async getProductsByBrand(brandId) {
    return request(`/products/brand/${brandId}`)
  },
  async getProductsByCategory(categoryId) {
    return request(`/products/category/${categoryId}`)
  },
  async getProductsBySkinType(type) {
    return request(`/products/skin-type?type=${encodeURIComponent(type)}`)
  },
  async getProductsByConcern(concern) {
    return request(`/products/concern?concern=${encodeURIComponent(concern)}`)
  },
  async getProductsByIngredient(ingredientId) {
    return request(`/products/ingredient/${ingredientId}`)
  },
  async createProduct(data) {
    return request('/products', { method: 'POST', body: data })
  },
  async updateProduct(id, data) {
    return request(`/products/${id}`, { method: 'PUT', body: data })
  },
  async deleteProduct(id) {
    return request(`/products/${id}`, { method: 'DELETE' })
  },
  async searchProducts(keyword) {
    return request(`/products/search?keyword=${encodeURIComponent(keyword)}`)
  },

  // ---------- Brands ----------
  async listBrands() {
    return request('/brands')
  },
  async listActiveBrands() {
    return request('/brands/active')
  },
  async getBrand(id) {
    return request(`/brands/${id}`)
  },
  async createBrand(data) {
    return request('/brands', { method: 'POST', body: data })
  },
  async updateBrand(id, data) {
    return request(`/brands/${id}`, { method: 'PUT', body: data })
  },
  async deleteBrand(id) {
    return request(`/brands/${id}`, { method: 'DELETE' })
  },

  // ---------- Categories ----------
  async listCategories() {
    return request('/categories')
  },
  async listActiveCategories() {
    return request('/categories/active')
  },
  async getCategory(id) {
    return request(`/categories/${id}`)
  },
  async createCategory(data) {
    return request('/categories', { method: 'POST', body: data })
  },
  async updateCategory(id, data) {
    return request(`/categories/${id}`, { method: 'PUT', body: data })
  },
  async deleteCategory(id) {
    return request(`/categories/${id}`, { method: 'DELETE' })
  },

  // ---------- Ingredients ----------
  async listIngredients() {
    return request('/ingredients')
  },
  async getIngredient(id) {
    return request(`/ingredients/${id}`)
  },
  async getIngredientBySlug(slug) {
    return request(`/ingredients/slug/${slug}`)
  },
  async searchIngredients(keyword) {
    return request(`/ingredients/search?keyword=${encodeURIComponent(keyword)}`)
  },
  async getIngredientsByConcern(concern) {
    return request(`/ingredients/by-concern?concern=${encodeURIComponent(concern)}`)
  },
  async getIngredientsByBenefit(benefit) {
    return request(`/ingredients/by-benefit?benefit=${encodeURIComponent(benefit)}`)
  },
  async getSafeIngredients(maxEwgScore = 3) {
    return request(`/ingredients/safe?maxEwgScore=${maxEwgScore}`)
  },
  async createIngredient(data) {
    return request('/ingredients', { method: 'POST', body: data })
  },
  async updateIngredient(id, data) {
    return request(`/ingredients/${id}`, { method: 'PUT', body: data })
  },
  async deleteIngredient(id) {
    return request(`/ingredients/${id}`, { method: 'DELETE' })
  },
}

