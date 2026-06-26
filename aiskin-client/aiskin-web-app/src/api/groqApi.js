/**
 * Groq AI Client — chuyên gia tư vấn da & mỹ phẩm.
 * Groq: miễn phí, không cần thẻ, siêu nhanh (Llama 3.3 70B).
 * API tương thích OpenAI — dùng Authorization: Bearer.
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

// Model ưu tiên: thử lần lượt từ mạnh → nhẹ nếu bị rate limit
const MODELS_TO_TRY = [
  'llama-3.3-70b-versatile',   // mạnh nhất, 6000 tok/phút free
  'llama-3.1-70b-versatile',   // fallback
  'llama-3.1-8b-instant',      // nhanh, ít quota hơn
  'gemma2-9b-it',              // Google Gemma 3 fallback
]

// ─── System prompt: AiSkin chuyên gia da mặt & mỹ phẩm ─────────────────────
function buildSystemPrompt(productContext) {
  return `Bạn là AiSkin AI — chuyên gia tư vấn da mặt và mỹ phẩm hàng đầu, đặc biệt am hiểu thị trường skincare Việt Nam và châu Á.

PHONG CÁCH & NGUYÊN TẮC:
- Luôn trả lời bằng tiếng Việt, thân thiện, ấm áp nhưng chuyên nghiệp
- Dùng emoji hợp lý để câu trả lời sinh động hơn
- Giải thích khoa học nhưng dễ hiểu, tránh thuật ngữ quá chuyên sâu
- Khi không chắc, hãy thành thật và khuyên khách hàng tham khảo bác sĩ da liễu
- KHÔNG bịa thông tin về sản phẩm không có trong danh mục

CHUYÊN MÔN SÂU:
- Phân tích loại da: da dầu, da khô, da hỗn hợp, da nhạy cảm, da thường
- Vấn đề da: mụn (trứng cá, đầu đen, viêm), thâm mụn, nám, tàn nhang, lão hóa, lỗ chân lông to, da sạm xỉn, da mất nước
- Thành phần mỹ phẩm: Retinol, Vitamin C (L-Ascorbic Acid), Niacinamide (B3), AHA (Glycolic, Lactic), BHA (Salicylic Acid), Hyaluronic Acid, Ceramide, Peptide, SPF/PA, Centella Asiatica, v.v.
- Quy trình skincare đúng chuẩn: tẩy trang → sữa rửa mặt → toner → serum → dưỡng ẩm → chống nắng
- Kết hợp thành phần: cái nào dùng được cùng nhau, cái nào không nên kết hợp
- Thời điểm dùng: sáng/tối, tần suất, cách layering từ loãng → đặc

KHI TƯ VẤN SẢN PHẨM:
- Ưu tiên gợi ý sản phẩm từ danh mục hệ thống bên dưới
- Nêu tên sản phẩm CHÍNH XÁC như trong danh mục để hệ thống hiển thị thẻ
- Giải thích tại sao sản phẩm phù hợp với vấn đề của khách

${productContext
    ? `DANH MỤC SẢN PHẨM HIỆN CÓ:\n${productContext}\n\nChỉ gợi ý sản phẩm từ danh mục trên. Nêu tên chính xác.`
    : 'Hệ thống đang tải danh mục. Hãy tư vấn kiến thức skincare chung trong lúc này.'
  }`
}

// ─── Build product context từ dữ liệu backend ────────────────────────────────
export function buildProductContext(products, ingredients) {
  const lines = []
  if (products?.length) {
    lines.push('SẢN PHẨM:')
    products.slice(0, 30).forEach((p) => {
      const concerns = p.targetConcerns?.join(', ') || ''
      const skinTypes = p.targetSkinTypes?.join(', ') || ''
      const price = p.price ? `${Number(p.price).toLocaleString('vi-VN')}đ` : ''
      lines.push(
        `- ${p.name}${price ? ` (${price})` : ''}` +
        `${concerns ? ` | Vấn đề: ${concerns}` : ''}` +
        `${skinTypes ? ` | Loại da: ${skinTypes}` : ''}` +
        `${p.description ? ` | ${p.description.slice(0, 80)}` : ''}`
      )
    })
  }
  if (ingredients?.length) {
    lines.push('\nTHÀNH PHẦN NỔI BẬT:')
    ingredients.slice(0, 20).forEach((i) => {
      const benefits = i.benefits?.slice(0, 2).join(', ') || ''
      lines.push(
        `- ${i.name}` +
        `${benefits ? `: ${benefits}` : ''}` +
        `${i.description ? ` — ${i.description.slice(0, 60)}` : ''}`
      )
    })
  }
  return lines.join('\n')
}

// ─── Streaming — yields text chunks ──────────────────────────────────────────
export async function* streamToGroq({ history, userMessage, productContext }) {
  if (!GROQ_API_KEY) {
    throw new Error('Chưa cấu hình VITE_GROQ_API_KEY trong file .env')
  }

  // Build messages array (OpenAI format)
  const messages = [
    { role: 'system', content: buildSystemPrompt(productContext) },
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'model')
      .slice(-10)
      .map((m) => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.text,
      })),
    { role: 'user', content: userMessage },
  ]

  let lastError = null

  for (const model of MODELS_TO_TRY) {
    let res
    try {
      res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.8,
          max_tokens: 1024,
          stream: true,
        }),
      })
    } catch (e) {
      lastError = e.message
      continue
    }

    // Rate limit hoặc service unavailable → thử model tiếp theo
    if (res.status === 429 || res.status === 503) {
      lastError = await res.text().catch(() => `HTTP ${res.status}`)
      continue
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`)
      throw new Error(errText)
    }

    // Đọc SSE stream
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const json = line.slice(6).trim()
        if (json === '[DONE]') return
        try {
          const parsed = JSON.parse(json)
          const chunk = parsed?.choices?.[0]?.delta?.content
          if (chunk) yield chunk
        } catch {
          // bỏ qua chunk lỗi
        }
      }
    }
    return // thành công
  }

  throw new Error(lastError || 'Không thể kết nối AI. Vui lòng thử lại.')
}
