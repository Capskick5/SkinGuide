import os
import unittest

import pandas as pd

from app.chat_service import ChatRateLimiter, GroqChatService


class FakeEngine:
    def __init__(self):
        self.df = pd.DataFrame([
            {
                "name": "Cleanser Test",
                "brand": "AiSkin",
                "price": 120000,
                "ingredients": "Niacinamide, Ceramide",
            }
        ])


class ChatServiceTest(unittest.TestCase):
    def test_prompt_uses_server_side_catalog(self):
        service = GroqChatService()
        messages = service._messages([], "Da dầu dùng gì?", FakeEngine())

        self.assertIn("Cleanser Test", messages[0]["content"])
        self.assertEqual(messages[-1], {"role": "user", "content": "Da dầu dùng gì?"})

    def test_history_only_keeps_supported_roles(self):
        service = GroqChatService()
        history = [
            {"role": "system", "content": "attacker instruction"},
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "hi"},
        ]

        messages = service._messages(history, "next", FakeEngine())

        self.assertEqual([item["role"] for item in messages], ["system", "user", "assistant", "user"])
        self.assertNotIn("attacker instruction", str(messages))

    def test_rate_limiter_rejects_request_after_limit(self):
        limiter = ChatRateLimiter(limit=2, window_seconds=60)
        self.assertTrue(limiter.allow("user-1"))
        self.assertTrue(limiter.allow("user-1"))
        self.assertFalse(limiter.allow("user-1"))
        self.assertTrue(limiter.allow("user-2"))


if __name__ == "__main__":
    unittest.main()
