import os
import threading
import time
from collections import defaultdict, deque

import aiohttp


GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


class ChatRateLimiter:
    def __init__(self, limit=10, window_seconds=60):
        self.limit = limit
        self.window_seconds = window_seconds
        self._requests = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, user_id):
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            requests = self._requests[user_id]
            while requests and requests[0] <= cutoff:
                requests.popleft()
            if len(requests) >= self.limit:
                return False
            requests.append(now)
            return True


class GroqChatService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()

    @property
    def available(self):
        return bool(self.api_key and self.model)

    @staticmethod
    def _product_context(engine, limit=30):
        if engine is None or engine.df is None or engine.df.empty:
            return "Danh mục sản phẩm hiện chưa sẵn sàng."

        lines = []
        for _, product in engine.df.head(limit).iterrows():
            name = str(product.get("name", "")).strip()
            if not name:
                continue
            brand = str(product.get("brand", "")).strip()
            ingredients = str(product.get("ingredients", "")).strip()[:240]
            price = product.get("price", "")
            lines.append(
                f"- {name} | thương hiệu: {brand or 'không rõ'} | "
                f"giá: {price} | thành phần: {ingredients or 'chưa cập nhật'}"
            )
        return "\n".join(lines) or "Danh mục sản phẩm hiện chưa sẵn sàng."

    def _messages(self, history, user_message, engine):
        product_context = self._product_context(engine)
        system_prompt = (
            "Bạn là AiSkin AI, trợ lý tư vấn skincare bằng tiếng Việt. "
            "Chỉ cung cấp hướng dẫn chăm sóc da mang tính tham khảo, không chẩn đoán y khoa. "
            "Khi gợi ý mua hàng, chỉ nêu chính xác sản phẩm có trong DANH MỤC bên dưới và giải thích "
            "thành phần nào phù hợp. Nếu dữ liệu không đủ, hãy nói rõ thay vì bịa.\n\n"
            f"DANH MỤC SẢN PHẨM HỆ THỐNG:\n{product_context}"
        )

        messages = [{"role": "system", "content": system_prompt}]
        for item in history[-10:]:
            role = item.get("role")
            content = str(item.get("content", "")).strip()[:2000]
            if role in {"user", "assistant"} and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_message})
        return messages

    async def answer(self, history, user_message, engine):
        if not self.available:
            raise RuntimeError("GROQ_API_KEY is not configured")

        timeout = aiohttp.ClientTimeout(total=30)
        payload = {
            "model": self.model,
            "messages": self._messages(history, user_message, engine),
            "temperature": 0.4,
            "max_tokens": 800,
            "stream": False,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(GROQ_URL, json=payload, headers=headers) as response:
                data = await response.json(content_type=None)
                if response.status >= 400:
                    message = data.get("error", {}).get("message", "Groq request failed")
                    raise RuntimeError(message)
                content = data.get("choices", [{}])[0].get("message", {}).get("content")
                if not content:
                    raise RuntimeError("Groq returned an empty response")
                return content.strip()
