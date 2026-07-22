import { request } from './httpClient'

/**
 * API calls cho Product Service (CRUD products, brands, categories, ingredients).
 * Backend: mss.productservice.controller.*
 */
export const productApi = {
  // ---------- Products ----------
  async listProducts({ auth = false } = {}) {
    return request('/products', { auth })
  },
  async listActiveProducts() {
    return request('/products/active', { auth: false })
  },
  async listFlashDeals() {
    return request('/products/flash-deals', { auth: false })
  },
  async getProduct(id, { auth = false } = {}) {
    return request(`/products/${id}`, { auth })
  },
  async getProductBySlug(slug, { auth = false } = {}) {
    return request(`/products/slug/${encodeURIComponent(slug)}`, { auth })
  },
  async getProductsByBrand(brandId) {
    return request(`/products/brand/${brandId}`, { auth: false })
  },
  async getProductsByCategory(categoryId) {
    return request(`/products/category/${categoryId}`, { auth: false })
  },
  async getProductsBySkinType(type) {
    return request(`/products/skin-type?type=${encodeURIComponent(type)}`, { auth: false })
  },
  async getProductsByConcern(concern) {
    return request(`/products/concern?concern=${encodeURIComponent(concern)}`, { auth: false })
  },
  async getProductsByIngredient(ingredientId) {
    return request(`/products/ingredient/${ingredientId}`, { auth: false })
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
    return request(`/products/search?keyword=${encodeURIComponent(keyword)}`, { auth: false })
  },
  async searchAdvancedProducts(
    {
      query = '',
      searchField = 'all',
      categoryId = '',
      isActive = '',
      sortBy = '',
      minPrice = '',
      maxPrice = '',
      brandId = '',
      skinType = '',
      concern = '',
      inStockOnly = '',
      page = 1,
      size = 12,
    },
    { auth = false } = {},
  ) {
    const params = new URLSearchParams()
    if (query) params.append('query', query)
    if (searchField) params.append('searchField', searchField)
    if (categoryId) params.append('categoryId', categoryId)
    if (isActive !== '') params.append('isActive', isActive)
    if (sortBy) params.append('sortBy', sortBy)
    if (minPrice !== '' && minPrice !== null && minPrice !== undefined) params.append('minPrice', minPrice)
    if (maxPrice !== '' && maxPrice !== null && maxPrice !== undefined) params.append('maxPrice', maxPrice)
    if (brandId) params.append('brandId', brandId)
    if (skinType) params.append('skinType', skinType)
    if (concern) params.append('concern', concern)
    if (inStockOnly !== '' && inStockOnly !== null && inStockOnly !== undefined) params.append('inStockOnly', inStockOnly)
    params.append('page', page)
    params.append('size', size)
    return request(`/products/search/advanced?${params.toString()}`, { auth })
  },
  async listInventoryMovements({ productId = '', variantId = '', page = 0, size = 20 } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (productId) params.append('productId', productId)
    if (variantId) params.append('variantId', variantId)
    return request(`/products/inventory/movements?${params.toString()}`)
  },
  async adjustInventory(data) {
    return request('/products/inventory/adjust', { method: 'POST', body: data })
  },

  // ---------- Brands ----------
  async listBrands() {
    return request('/brands', { auth: false })
  },
  async listActiveBrands() {
    return request('/brands/active', { auth: false })
  },
  async getBrand(id) {
    return request(`/brands/${id}`, { auth: false })
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
    return request('/categories', { auth: false })
  },
  async listActiveCategories() {
    return request('/categories/active', { auth: false })
  },
  async getCategory(id) {
    return request(`/categories/${id}`, { auth: false })
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
    return request('/ingredients', { auth: false })
  },
  async getIngredient(id) {
    return request(`/ingredients/${id}`, { auth: false })
  },
  async getIngredientBySlug(slug) {
    return request(`/ingredients/slug/${slug}`, { auth: false })
  },
  async searchIngredients(keyword) {
    return request(`/ingredients/search?keyword=${encodeURIComponent(keyword)}`, { auth: false })
  },
  async getIngredientsByConcern(concern) {
    return request(`/ingredients/by-concern?concern=${encodeURIComponent(concern)}`, { auth: false })
  },
  async getIngredientsByBenefit(benefit) {
    return request(`/ingredients/by-benefit?benefit=${encodeURIComponent(benefit)}`, { auth: false })
  },
  async getSafeIngredients(maxEwgScore = 3) {
    return request(`/ingredients/safe?maxEwgScore=${maxEwgScore}`, { auth: false })
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
