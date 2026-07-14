import unittest

from app.similarity_engine import RecommendationEngine


def product(product_id, active=True, on_hand=10, reserved=0, variant_active=True):
    return {
        "_id": product_id,
        "name": f"Product {product_id}",
        "slug": f"product-{product_id}",
        "isActive": active,
        "categoryName": "Cleanser",
        "targetSkinTypes": ["Oily"],
        "ingredients": [{"name": "Niacinamide", "percentage": None}],
        "variants": [
            {
                "_id": f"variant-{product_id}",
                "name": "100ml",
                "sku": f"SKU-{product_id}",
                "price": 150000,
                "isActive": variant_active,
                "trackInventory": True,
                "inventoryLevels": [
                    {"warehouseId": "MAIN", "onHandQuantity": on_hand, "reservedQuantity": reserved}
                ],
            }
        ],
    }


class RecommendationInventoryTest(unittest.TestCase):
    def setUp(self):
        self.engine = RecommendationEngine(None)

    def test_only_indexes_active_products_with_available_variants(self):
        self.engine.update_data([
            product("sellable"),
            product("inactive-product", active=False),
            product("inactive-variant", variant_active=False),
            product("out-of-stock", on_hand=4, reserved=4),
        ])

        self.assertEqual(self.engine.df["id"].tolist(), ["sellable"])

    def test_recommendation_contains_checkout_variant_contract(self):
        self.engine.update_data([product("sellable", on_hand=9, reserved=2)])

        result = self.engine.recommend("Cleanser", "Oily", ["Niacinamide"], top_k=3)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["variantId"], "variant-sellable")
        self.assertEqual(result[0]["availableQuantity"], 7)
        self.assertEqual(result[0]["sku"], "SKU-sellable")
        self.assertEqual(result[0]["matchedIngredients"], [{
            "name": "Niacinamide",
            "percentage": None,
            "concentrationEvidence": "Chưa có dữ liệu nồng độ",
        }])
        self.assertIn("Có thành phần mục tiêu: Niacinamide", result[0]["matchReasons"])

    def test_non_tracked_active_variant_is_sellable(self):
        item = product("service-item", on_hand=0)
        item["variants"][0]["trackInventory"] = False

        self.engine.update_data([item])

        self.assertEqual(self.engine.df["id"].tolist(), ["service-item"])


if __name__ == "__main__":
    unittest.main()
