import unittest

from app.formulas.routine_builder import generate_routine
from app.formulas.scoring import load_ingredient_rules, score_ingredients


class IngredientRuleTest(unittest.TestCase):
    def test_all_model_a_skin_types_have_ranked_ingredients(self):
        for skin_type in ("Dry", "Normal", "Oily"):
            with self.subTest(skin_type=skin_type):
                ranked = score_ingredients(skin_type, [])
                self.assertGreaterEqual(len(ranked), 4)
                self.assertTrue(all(item["match_score"] == 2 for item in ranked))

    def test_issue_targets_rank_ahead_of_skin_type_only_targets(self):
        ranked = score_ingredients("Oily", [{"name": "Acne"}])

        self.assertEqual(ranked[0]["name"], "Niacinamide")
        salicylic = next(item for item in ranked if item["name"] == "Salicylic Acid")
        self.assertIn("Acne", salicylic["matched_issues"])
        self.assertEqual(salicylic["match_score"], 3)

    def test_rule_sources_are_reviewable_https_links(self):
        rules = load_ingredient_rules()

        self.assertTrue(rules["sources"])
        self.assertTrue(all(url.startswith("https://") for url in rules["sources"].values()))


class RoutineRuleTest(unittest.TestCase):
    def test_skin_type_only_routine_does_not_invent_treatment(self):
        routine, ingredients = generate_routine("Dry", [])
        evening_steps = {step["step"] for step in routine["evening"]}

        self.assertNotIn("treatment", evening_steps)
        self.assertNotIn("exfoliant", evening_steps)
        self.assertTrue(ingredients)
        self.assertTrue(next(step for step in routine["morning"] if step["step"] == "serum")["recommended_ingredients"])

    def test_visible_issue_adds_targeted_treatment(self):
        routine, _ = generate_routine("Oily", [{"name": "Acne"}])
        treatment = next(step for step in routine["evening"] if step["step"] == "treatment")
        exfoliant = next(step for step in routine["evening"] if step["step"] == "exfoliant")

        self.assertIn("Salicylic Acid", treatment["recommended_ingredients"])
        self.assertEqual(exfoliant["recommended_ingredients"], ["Salicylic Acid"])


if __name__ == "__main__":
    unittest.main()
