import base64
import os
import unittest
from unittest.mock import MagicMock

from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError


os.environ.setdefault(
    "JWT_SECRET",
    base64.b64encode(b"test-secret-key-that-is-at-least-32-bytes").decode(),
)

from app import main


class RecommendationOwnershipTest(unittest.TestCase):
    def setUp(self):
        self.original_db = main.db
        self.original_engine = main.engine
        main.db = MagicMock()
        main.engine = MagicMock()
        main.engine.recommend.return_value = []

    def tearDown(self):
        main.db = self.original_db
        main.engine = self.original_engine

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
            {
                "routineId": "routine-1",
                "userId": "user-1",
                "recordType": "routine",
                "schemaVersion": 2,
            }
        )

    def test_routine_recommendations_use_stable_step_codes_and_deduplicate(self):
        routine = {
            "routine": {
                "morning": [
                    {"step": "cleanser", "name": "Sữa rửa mặt", "recommended_ingredients": ["Glycerin"]},
                    {"step": "serum", "name": "Serum hỗ trợ", "recommended_ingredients": ["Niacinamide"]},
                ],
                "evening": [
                    {"step": "cleanser", "name": "Sữa rửa mặt", "recommended_ingredients": ["Glycerin"]},
                    {"step": "moisturizer", "name": "Kem dưỡng phục hồi", "recommended_ingredients": ["Ceramide"]},
                ],
            }
        }

        result = main._build_routine_recommendations(routine, "Normal")

        self.assertEqual(
            [item["stepCode"] for item in result],
            ["cleanser", "serum", "moisturizer"],
        )
        self.assertEqual(
            [call.kwargs["product_label"] for call in main.engine.recommend.call_args_list],
            ["Cleanser", "Treatment", "Moisturizer"],
        )

    def test_concurrent_generation_returns_the_single_saved_record(self):
        main.db.skincare_routines.find_one.return_value = {
            "_id": "routine-1",
            "scanId": "scan-1",
            "routine": {"morning": [], "evening": []},
        }
        main.db.ai_scan_results.find_one.return_value = {
            "_id": "scan-1",
            "userId": "user-1",
            "skinType": {"predicted": "Normal"},
        }
        main.db.product_recommendations.find_one.side_effect = [
            None,
            {"recommendations": [{"stepCode": "cleanser", "products": []}]},
        ]
        main.db.product_recommendations.insert_one.side_effect = DuplicateKeyError("duplicate")

        response = main.generate_routine_recommendation("routine-1", "user-1")

        self.assertEqual(response["data"], [{"stepCode": "cleanser", "products": []}])


if __name__ == "__main__":
    unittest.main()
