import base64
import os
import unittest
from unittest.mock import MagicMock

from fastapi import HTTPException


os.environ.setdefault(
    "JWT_SECRET",
    base64.b64encode(b"test-secret-key-that-is-at-least-32-bytes").decode(),
)

from app import main


class RecommendationOwnershipTest(unittest.TestCase):
    def setUp(self):
        self.original_db = main.db
        main.db = MagicMock()

    def tearDown(self):
        main.db = self.original_db

    def test_get_recommendations_rejects_unowned_routine(self):
        main.db.skincare_routines.find_one.return_value = None

        with self.assertRaises(HTTPException) as context:
            main.get_routine_recommendations("routine-1", "user-1")

        self.assertEqual(context.exception.status_code, 404)
        main.db.skincare_routines.find_one.assert_called_once_with(
            {"_id": "routine-1", "userId": "user-1"},
            {"_id": 1},
        )

    def test_get_recommendations_filters_record_by_owner(self):
        main.db.skincare_routines.find_one.return_value = {"_id": "routine-1"}
        main.db.product_recommendations.find_one.return_value = None

        response = main.get_routine_recommendations("routine-1", "user-1")

        self.assertEqual(response["data"], [])
        main.db.product_recommendations.find_one.assert_called_once_with(
            {"routineId": "routine-1", "userId": "user-1"}
        )


if __name__ == "__main__":
    unittest.main()
