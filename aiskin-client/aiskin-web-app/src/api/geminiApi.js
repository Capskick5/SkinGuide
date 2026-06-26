/**
 * Gemini AI Client — chuyên gia tư vấn da & mỹ phẩm.
 * Hỗ trợ 2 định dạng key:
 *   - AIzaSy... → ?key= query param (key cũ)
 *   - AQ....    → Authorization: Bearer header (auth key mới từ AI Studio 2025+)
 * Tự động thử nhiều model nếu bị quota exceeded.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Thử lần lượt từ mới → cũ khi bị quota
const MODELS_TO_TRY = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]

// ─── Auth helper: tất cả key đều dùng ?key= query param ─────────────────────
function makeUrlAndHeaders(model, endpoint, streaming = false) {
  const headers = { 'Content-Type': 'application/json' }
  let url = `${BASE}/${model}:${endpoint}`
  url += streaming
    ? `?key=${GEMINI_API_KEY}&alt=sse`
    : `?key=${GEMINI_API_KEY}`
  return { url, headers }
}

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
- Phân tích da: da dầu, da khô, da hỗn hợp, da nhạy cảm, da thường
- Vấn đề da: mụn (trứng cá, đầu đen, viêm), thâm mụn, nám, tàn nhang, lão hóa, lỗ chân lông to, da sạm xỉn
- Thành phần mỹ phẩm: Retinol, Vitamin C, Niacinamide, AHA/BHA, Hyaluronic Acid, Ceramide, Peptide, SPF, v.v.
- Quy trình skincare: tẩy trang, sữa rửa mặt, toner, serum, dưỡng ẩm, chống nắng
- Kết hợp thành phần: cái nào dùng được cùng nhau, cái nào không nên kết hợp
- Thời điểm dùng: sáng/tối, tần suất, cách layering đúng

KHI TƯ VẤN SẢN PHẨM:
- Ưu tiên gợi ý sản phẩm từ danh mục hệ thống bên dưới
- Nêu tên sản phẩm CHÍNH XÁC như trong danh mục để hệ thống nhận diện
- Giải thích tại sao sản phẩm phù hợp với vấn đề của khách

${productContext
    ? `DANH MỤC SẢN PHẨM HIỆN CÓ:\n${productContext}\n\nChỉ gợi ý sản phẩm từ danh mục trên. Nêu tên chính xác.`
    : 'Hệ thống đang tải danh mục sản phẩm. Hãy tư vấn kiến thức skincare chung.'
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

// ─── Build Gemini request body ────────────────────────────────────────────────
function buildBody(history, userMessage, productContext) {
  const systemPrompt = buildSystemPrompt(productContext)
  const contents = history
    .filter((m) => m.role === 'user' || m.role === 'model')
    .map((m) => ({ role: m.role, parts: [{ text: m.text }] }))
  contents.push({ role: 'user', parts: [{ text: userMessage }] })
  return {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.8,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  }
}

// ─── Parse error message từ Gemini response ───────────────────────────────────
async function parseError(res) {
  try {
    const data = await res.json()
    return data?.error?.message || `HTTP ${res.status}`
  } catch {
    return `HTTP ${res.status}`
  }
}

// ─── Streaming: thử lần lượt các model ───────────────────────────────────────
export async function* streamToGemini({ history, userMessage, productContext }) {
  if (!GEMINI_API_KEY) {
    throw new Error('Chưa cấu hình VITE_GEMINI_API_KEY trong file .env')
  }

  const body = buildBody(history, userMessage, productContext)
  let lastError = null

  for (const model of MODELS_TO_TRY) {
    const { url, headers } = makeUrlAndHeaders(model, 'streamGenerateContent', true)

    let res
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
    } catch (e) {
      lastError = e.message
      continue
    }

    if (res.status === 429 || res.status === 503 || res.status === 403) {
      lastError = await parseError(res)
      // Thử model tiếp theo
      continue
    }

    if (!res.ok) {
      const msg = await parseError(res)
      throw new Error(msg)
    }

    // Stream thành công
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
          const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
          if (chunk) yield chunk
        } catch {
          // bỏ qua chunk lỗi
        }
      }
    }
    return // Kết thúc thành công, không thử model khác
  }

  // Tất cả model đều thất bại
  throw new Error(
    lastError ||
    'Không thể kết nối Gemini AI. Vui lòng kiểm tra API key và thử lại.'
  )
}
