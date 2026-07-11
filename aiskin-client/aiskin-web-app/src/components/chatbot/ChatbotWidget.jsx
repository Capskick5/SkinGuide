import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import { streamToGroq, buildProductContext } from '@/api/groqApi'
import { PATHS } from '@/route/paths'

// ─── Quick question chips ──────────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  'Da dầu nên dùng gì?',
  'Cách trị mụn hiệu quả',
  'Retinol và Vitamin C có dùng chung được không?',
  'Quy trình skincare buổi sáng',
  'Sản phẩm dưỡng ẩm tốt nhất',
]

// ─── Format VND price ─────────────────────────────────────────────────────────
function formatPrice(price) {
  if (!price && price !== 0) return ''
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

// ─── Match product names mentioned in AI response ────────────────────────────
function findMentionedProducts(text, allProducts) {
  if (!allProducts?.length || !text) return []
  const found = []
  for (const p of allProducts) {
    if (p.name && text.toLowerCase().includes(p.name.toLowerCase())) {
      found.push(p)
      if (found.length >= 4) break
    }
  }
  return found
}

// ─── Render text with markdown bold (**text**) and line breaks ────────────────
function FormattedText({ text }) {
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, li) => {
        if (!line.trim()) return <div key={li} className="h-1" />
        const parts = line.split(/(\*\*[^*]+\*\*)/g)
        return (
          <p key={li} className="leading-relaxed">
            {parts.map((part, pi) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={pi}>{part.slice(2, -2)}</strong>
              ) : (
                <span key={pi}>{part}</span>
              )
            )}
          </p>
        )
      })}
    </div>
  )
}

// ─── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ product }) {
  return (
    <Link
      to={PATHS.PRODUCT_DETAIL.replace(':id', product.id)}
      className="flex gap-3 p-3 rounded-xl border border-border-pink/60 bg-white/70 hover:bg-primary-light hover:border-primary/50 transition-all group no-underline backdrop-blur-sm"
    >
      <div className="w-14 h-14 rounded-xl bg-surface-soft border border-border-pink/30 overflow-hidden shrink-0">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/30">
            <Icon name="inventory_2" className="text-2xl" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-on-surface leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </p>
        {product.price != null && (
          <p className="text-[11px] text-primary font-bold mt-0.5">{formatPrice(product.price)}</p>
        )}
        {product.description && (
          <p className="text-[10px] text-on-surface-variant/70 mt-0.5 line-clamp-1">{product.description}</p>
        )}
      </div>
      <Icon name="chevron_right" className="text-primary/40 group-hover:text-primary text-sm self-center shrink-0 transition-colors" />
    </Link>
  )
}

// ─── Main ChatbotWidget ───────────────────────────────────────────────────────
/**
 * AI Chatbot sử dụng Gemini 2.0 Flash, chuyên tư vấn da mặt & mỹ phẩm.
 * - Stream response từng ký tự như ChatGPT
 * - Inject context sản phẩm thực từ backend
 * - Hiển thị product cards khi AI đề cập sản phẩm
 * - Ghi nhớ toàn bộ lịch sử chat
 */
export default function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'init',
      role: 'model',
      text: 'Xin chào! 👋 Tôi là **AiSkin AI** — chuyên gia tư vấn da mặt và mỹ phẩm của bạn.\n\nBạn đang gặp vấn đề gì với da? Tôi có thể giúp bạn chọn sản phẩm phù hợp, giải thích thành phần, hoặc xây dựng quy trình skincare riêng! 🌸',
      products: [],
    },
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [unread, setUnread] = useState(1)
  const [contextReady, setContextReady] = useState(false)
  const [allProducts, setAllProducts] = useState([])
  const productContextRef = useRef('')
  const endRef = useRef(null)
  const abortRef = useRef(false)

  // ─── Load product context on mount ─────────────────────────────────────────
  useEffect(() => {
    async function loadContext() {
      try {
        const [products, ingredients] = await Promise.allSettled([
          productApi.getActiveProducts(),
          productApi.listIngredients(),
        ])
        const prods = products.status === 'fulfilled' ? (products.value || []) : []
        const ings = ingredients.status === 'fulfilled' ? (ingredients.value || []) : []
        setAllProducts(prods)
        productContextRef.current = buildProductContext(prods, ings)
        setContextReady(true)
      } catch {
        setContextReady(true) // proceed without context
      }
    }
    loadContext()
  }, [])

  // ─── Auto scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [open, messages])

  const handleToggle = () => {
    if (!open) setUnread(0)
    setOpen((current) => !current)
  }

  // ─── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || streaming) return

    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), products: [] }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    abortRef.current = false

    // Build history for Gemini (exclude init message and product cards)
    const botMsgId = Date.now() + 1
    const placeholder = { id: botMsgId, role: 'model', text: '', products: [], streaming: true }
    setMessages((prev) => [...prev, placeholder])

    try {
      // Build conversation history (last 10 turns for context window)
      const history = messages
        .filter((m) => m.id !== 'init')
        .slice(-10)
        .map((m) => ({ role: m.role === 'bot' ? 'model' : m.role, text: m.text }))

      let fullText = ''
      const generator = streamToGroq({
        history,
        userMessage: text.trim(),
        productContext: productContextRef.current,
      })

      for await (const chunk of generator) {
        if (abortRef.current) break
        fullText += chunk
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, text: fullText } : m
          )
        )
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
      }

      // After streaming done: match products mentioned
      const mentionedProducts = findMentionedProducts(fullText, allProducts)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, text: fullText, products: mentionedProducts, streaming: false }
            : m
        )
      )
      if (!open) setUnread((n) => n + 1)
    } catch (err) {
      const errText = err?.message?.includes('API_KEY_INVALID') || err?.message?.includes('API key')
        ? '❌ API key không hợp lệ. Vui lòng kiểm tra lại VITE_GEMINI_API_KEY trong file .env.'
        : `❌ Có lỗi xảy ra: ${err?.message || 'Vui lòng thử lại.'}`
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId ? { ...m, text: errText, streaming: false } : m
        )
      )
    } finally {
      setStreaming(false)
    }
  }, [streaming, messages, allProducts, open])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([{
      id: 'init',
      role: 'model',
      text: 'Chat đã được làm mới! 🌸 Tôi sẵn sàng tư vấn da và mỹ phẩm cho bạn.',
      products: [],
    }])
  }

  return (
    <>
      {/* ── Floating button ── */}
      <button
        type="button"
        id="chatbot-toggle-btn"
        onClick={handleToggle}
        className={[
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-bg text-white',
          'flex items-center justify-center shadow-[0_8px_30px_rgba(177,14,107,0.4)]',
          'hover:scale-110 transition-all duration-200 active:scale-95',
        ].join(' ')}
        aria-label="Mở AI tư vấn da"
      >
        <Icon name={open ? 'close' : 'smart_toy'} className="text-2xl" />
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[11px] flex items-center justify-center font-bold animate-pulse">
            {unread}
          </span>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          id="chatbot-panel"
          className={[
            'fixed bottom-24 right-6 z-50 w-[400px] max-h-[600px] flex flex-col',
            'bg-surface-container-lowest border border-border-pink rounded-3xl',
            'shadow-[0_20px_80px_rgba(177,14,107,0.25)]',
            'animate-slide-up overflow-hidden',
          ].join(' ')}
        >
          {/* Header */}
          <div className="gradient-bg p-4 flex items-center gap-3 rounded-t-3xl shrink-0">
            <div className="relative">
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
                <Icon name="smart_toy" className="text-white text-2xl" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white/50 rounded-full" />
            </div>
            <div className="text-white flex-1">
              <p className="text-label-md font-bold">AiSkin AI</p>
              <p className="text-[11px] opacity-80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-300 rounded-full inline-block animate-pulse" />
                {contextReady ? 'Gemini 2.0 Flash · Chuyên gia da mặt' : 'Đang tải dữ liệu sản phẩm...'}
              </p>
            </div>
            <button
              type="button"
              onClick={clearChat}
              title="Cuộc trò chuyện mới"
              className="text-white/60 hover:text-white transition-colors mr-2"
            >
              <Icon name="refresh" className="text-lg" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <Icon name="close" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((m) => (
              <div
                key={m.id}
                className={['flex gap-2.5', m.role === 'user' ? 'flex-row-reverse' : ''].join(' ')}
              >
                {m.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Icon name="smart_toy" className="text-white text-sm" />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Text bubble */}
                  <div
                    className={[
                      'inline-block max-w-[90%] px-4 py-3 rounded-2xl text-body-sm',
                      m.role === 'user'
                        ? 'gradient-bg text-white rounded-tr-sm ml-auto block'
                        : 'bg-surface-soft border border-border-pink/40 text-on-surface rounded-tl-sm',
                    ].join(' ')}
                  >
                    {m.role === 'user' ? (
                      <p className="leading-relaxed">{m.text}</p>
                    ) : (
                      <FormattedText text={m.text} />
                    )}
                    {/* Blinking cursor while streaming */}
                    {m.streaming && (
                      <span className="inline-block w-0.5 h-4 bg-primary/70 ml-0.5 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Product cards */}
                  {m.products?.length > 0 && !m.streaming && (
                    <div className="space-y-2 max-w-[92%]">
                      <p className="text-[11px] text-on-surface-variant/60 font-medium flex items-center gap-1">
                        <Icon name="storefront" className="text-sm" />
                        Sản phẩm được đề cập:
                      </p>
                      {m.products.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                      <Link
                        to={PATHS.PRODUCTS}
                        className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium mt-1 no-underline"
                      >
                        <Icon name="arrow_forward" className="text-xs" />
                        Xem tất cả sản phẩm
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Quick chips */}
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hidden shrink-0">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                disabled={streaming}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-primary-light border border-border-pink text-[11px] text-primary hover:bg-primary hover:text-white transition-all shrink-0 disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-border-pink/40 flex gap-2 shrink-0 bg-surface-container-lowest">
            <input
              type="text"
              id="chatbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={streaming ? 'AI đang trả lời...' : 'Hỏi về da, mỹ phẩm, thành phần...'}
              disabled={streaming}
              className="flex-1 px-4 py-2.5 rounded-full border border-border-pink bg-surface-soft text-body-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60"
            />
            <button
              type="button"
              id="chatbot-send-btn"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="w-10 h-10 rounded-full gradient-bg text-white flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-40 shrink-0 shadow-sm"
            >
              <Icon name={streaming ? 'hourglass_empty' : 'send'} className="text-lg" />
            </button>
          </div>

          {/* Powered by footer */}
          <div className="px-4 pb-3 flex items-center justify-center gap-1 text-[10px] text-on-surface-variant/40 shrink-0">
            <Icon name="auto_awesome" className="text-xs" />
            <span>Powered by Groq · Llama 3.3 70B · Miễn phí</span>
          </div>
        </div>
      )}
    </>
  )
}
