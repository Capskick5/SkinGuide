import { translateCategory, translateName, translateTag } from './translator'

export function toArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

export function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

export function mapById(items) {
  return new Map(items.map((item) => [item.id, item]))
}

export function normalize(value) {
  return String(value || '').toLowerCase()
}

export function uploadUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('/@fs/')) return value

  const normalized = value.replace(/\\/g, '/').replace(/\/+/g, '/')
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `/@fs/${encodeURI(normalized)}`
  }

  return ''
}

export function resolveImageUrl(value) {
  return uploadUrl(value) || value || ''
}

export function makeSearchBlob(product, brandName, categoryName) {
  const ingredientNames = (product.ingredients || []).map((ingredient) => ingredient.name).join(' ')
  const ingredientIds = (product.ingredients || []).map((ingredient) => ingredient.ingredientId).join(' ')
  const concernNames = (product.targetConcerns || []).join(' ')
  const skinTypes = (product.targetSkinTypes || []).join(' ')
  const keyIngredientIds = (product.keyIngredientIds || []).join(' ')

  return {
    all: normalize([
      product.name,
      product.slug,
      brandName,
      categoryName,
      product.description,
      ingredientNames,
      ingredientIds,
      concernNames,
      skinTypes,
      keyIngredientIds,
    ].join(' ')),
    name: normalize(product.name),
    slug: normalize(product.slug),
    brand: normalize(brandName),
    category: normalize(categoryName),
    ingredient: normalize([ingredientNames, ingredientIds, keyIngredientIds].join(' ')),
    concern: normalize([concernNames, product.description].join(' ')),
  }
}

export function toProductCard(product, brandMap, categoryMap) {
  const brand = brandMap.get(product.brandId)
  const category = categoryMap.get(product.categoryId)
  const priceValue = Number(product.price) || 0

  return {
    id: product.id,
    slug: product.slug,
    brand: product.brandName || brand?.name || product.brandId || 'Không rõ thương hiệu',
    name: translateName(product.name),
    category: translateCategory(product.categoryName || category?.name || product.categoryId || 'Không rõ danh mục'),
    categoryId: product.categoryId,
    priceValue,
    price: money(product.price),
    imageUrl: resolveImageUrl(product.imageUrl),
    targetConcerns: (product.targetConcerns || []).map(translateTag),
    targetSkinTypes: (product.targetSkinTypes || []).map(translateTag),
    keyIngredientIds: product.keyIngredientIds || [],
    searchBlob: makeSearchBlob(product, product.brandName || brand?.name || '', product.categoryName || category?.name || ''),
  }
}
