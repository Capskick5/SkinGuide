import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import MobileNav from './MobileNav'
import CartDrawer from '@/components/cart/CartDrawer'
import ChatbotWidget from '@/components/chatbot/ChatbotWidget'

/**
 * Layout chung (phong cách QuillBot):
 * - Shell nền hồng chứa Sidebar trái + TopNav cùng màu.
 * - Vùng nội dung là một panel trắng bo góc lớn "nổi" bên trong shell.
 *   Desktop: panel cố định dưới topnav và CUỘN BÊN TRONG -> góc bo tròn
 *   luôn hiển thị, không bị mất khi scroll.
 */
export default function AppLayout() {
  return (
    <div className="bg-nav text-on-surface min-h-screen md:pl-sidebar">
      <Sidebar />
      <TopNav />

      {/* Panel nội dung trắng: chỉ bo 2 góc trên, phủ kín phải + dưới */}
      <main className="md:fixed md:top-[52px] md:left-sidebar md:right-0 md:bottom-0 px-2 pt-2 pb-20 md:p-0">
        <div className="bg-canvas rounded-t-[2rem] shadow-[0_8px_30px_rgba(177,14,107,0.08)] min-h-[calc(100vh-72px)] md:min-h-0 md:h-full md:overflow-y-auto scrollbar-hidden px-4 md:px-8 lg:px-12 py-8 md:py-10">
          <div className="w-full max-w-container-max mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      <MobileNav />

      {/* Cart drawer – global, luôn sẵn sàng */}
      <CartDrawer />

      {/* AI Chatbot widget – nổi góc dưới phải */}
      <ChatbotWidget />
    </div>
  )
}

