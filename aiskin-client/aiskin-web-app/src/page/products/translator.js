export const categoryDict = {
  'Value & Gift Sets': 'Bộ quà tặng',
  'Mini Size': 'Kích thước mini',
  'Moisturizers': 'Kem dưỡng ẩm',
  'Wellness': 'Chăm sóc sức khỏe',
  'Lip Balms & Treatments': 'Son dưỡng & Đặc trị môi',
  'Cleansers': 'Sữa rửa mặt',
  'High Tech Tools': 'Thiết bị làm đẹp',
  'Sunscreen': 'Kem chống nắng',
  'Eye Care': 'Chăm sóc mắt',
  'Masks': 'Mặt nạ',
  'Treatments': 'Đặc trị',
  'Self Tanners': 'Làm nâu da'
};

export const tagDict = {
  // Mối quan tâm (Concerns)
  'Dryness': 'Khô da',
  'Pigmentation': 'Sắc tố/Nám',
  'Pores': 'Lỗ chân lông',
  'Acne': 'Mụn',
  'Wrinkles': 'Nếp nhăn',
  // Loại da (Skin Types)
  'Combination': 'Da hỗn hợp',
  'Oily': 'Da dầu',
  'Dry': 'Da khô',
  'Normal': 'Da thường',
  'Sensitive': 'Da nhạy cảm'
};

const nameKeywords = {
  'Lip Sleeping Mask': 'Mặt nạ ngủ môi',
  'Intense Hydration': 'Dưỡng ẩm sâu',
  'Moisture Cream': 'Kem dưỡng ẩm',
  'Cleanser': 'Sữa rửa mặt',
  'Sunscreen': 'Kem chống nắng',
  'Serum': 'Tinh chất',
  'Toner': 'Nước hoa hồng',
  'Essence': 'Nước thần',
  'Lotion': 'Sữa dưỡng',
  'Gel': 'Gel',
  'Mask': 'Mặt nạ',
  'Eye Cream': 'Kem mắt',
  'Treatment': 'Đặc trị',
  'Exfoliator': 'Tẩy tế bào chết',
  'Scrub': 'Tẩy da chết',
  'Balm': 'Sáp dưỡng',
  'Oil': 'Dầu dưỡng',
  'Peel': 'Lột tẩy',
  'Mist': 'Xịt khoáng',
  'Pads': 'Miếng dán',
  'Drops': 'Giọt',
  'Moisturizer': 'Kem dưỡng ẩm',
  'SPF': 'Chống nắng SPF',
  'Night': 'Ban đêm',
  'Day': 'Ban ngày',
  'Daily': 'Hàng ngày',
  'Hydrating': 'Cấp nước',
  'Brightening': 'Làm sáng da',
  'Anti-Aging': 'Chống lão hóa',
  'Purifying': 'Làm sạch',
  'Soothing': 'Làm dịu',
  'Calming': 'Làm dịu',
  'Repair': 'Phục hồi',
  'Firming': 'Săn chắc',
  'Lifting': 'Nâng cơ',
  'Acne': 'Trị mụn',
  'Blemish': 'Trị thâm mụn',
  'Pore': 'Lỗ chân lông',
  'Wrinkle': 'Nếp nhăn',
  'Dark Spot': 'Vết thâm',
  'Glow': 'Căng bóng'
};

export function translateCategory(enCat) {
  if (!enCat) return '';
  const translated = categoryDict[enCat] || enCat;
  // Viết hoa chữ cái đầu tiên (Quy tắc 3)
  return translated.charAt(0).toUpperCase() + translated.slice(1);
}

export function translateName(enName) {
  if (!enName) return '';
  let viName = enName;
  // Thay thế các từ khóa phổ biến sang tiếng Việt (Quy tắc 1)
  for (const [en, vi] of Object.entries(nameKeywords)) {
    // Dùng Regex để thay thế từ khóa không phân biệt hoa thường, nhưng giữ nguyên các từ khác (như Brand, Vitamin C)
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    viName = viName.replace(regex, vi);
  }
  return viName;
}

export function translateDescription(enDesc) {
  if (!enDesc) return '';
  // Cắt gọt và viết hoa chữ cái đầu tiên của từ đầu tiên (Quy tắc 2)
  const trimmed = enDesc.trim();
  let viDesc = trimmed;
  // Thay thế một số từ khóa trong mô tả
  for (const [en, vi] of Object.entries(nameKeywords)) {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    viDesc = viDesc.replace(regex, vi);
  }
  return viDesc.charAt(0).toUpperCase() + viDesc.slice(1);
}

export function translateTag(enTag) {
  if (!enTag) return '';
  return tagDict[enTag] || enTag;
}
