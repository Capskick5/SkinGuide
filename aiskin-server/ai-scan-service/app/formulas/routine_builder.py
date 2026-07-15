import json
import os

from .scoring import score_ingredients

RULES_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge", "routine_rules.json")
EXFOLIATING_INGREDIENTS = {"Salicylic Acid", "Glycolic Acid", "Lactic Acid"}
MOISTURIZING_INGREDIENTS = {"Hyaluronic Acid", "Glycerin", "Ceramide", "Panthenol"}


def _ingredient_names(ingredients, predicate=None, limit=3):
    names = []
    for ingredient in ingredients:
        if predicate and not predicate(ingredient):
            continue
        name = ingredient["name"]
        if name not in names:
            names.append(name)
        if len(names) >= limit:
            break
    return names


def _step_ingredients(step_code, ranked_ingredients):
    issue_ingredients = [
        ingredient
        for ingredient in ranked_ingredients
        if any(match not in {"Dry", "Normal", "Oily", "Combination", "Sensitive"}
               for match in ingredient["matched_issues"])
    ]
    if step_code == "serum":
        return _ingredient_names(ranked_ingredients)
    if step_code == "treatment":
        return _ingredient_names(issue_ingredients)
    if step_code == "exfoliant":
        return _ingredient_names(
            issue_ingredients,
            predicate=lambda ingredient: ingredient["name"] in EXFOLIATING_INGREDIENTS,
            limit=2,
        )
    if step_code == "moisturizer":
        return _ingredient_names(
            ranked_ingredients,
            predicate=lambda ingredient: ingredient["name"] in MOISTURIZING_INGREDIENTS,
            limit=3,
        )
    if step_code == "cleanser":
        return _ingredient_names(
            ranked_ingredients,
            predicate=lambda ingredient: ingredient["name"] in {"Glycerin", "Panthenol"},
            limit=1,
        )
    if step_code == "sunscreen":
        return ["Zinc Oxide"]
    return []

def load_routine_rules():
    try:
        with open(RULES_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading routine rules: {e}")
        return {"morning": [], "evening": []}

def generate_routine(skin_type, conditions):
    """
    Tạo lộ trình chuẩn dựa trên luật và kết quả chấm điểm thành phần.
    """
    rules = load_routine_rules()
    top_ingredients = score_ingredients(skin_type, conditions)
    
    routine = {
        "morning": [],
        "evening": []
    }
    
    # Xây dựng lộ trình Buổi sáng
    for step in rules.get("morning", []):
        if (
            step.get("required")
            or step.get("depends_on_skin_type")
            or (step.get("depends_on_condition") and len(conditions) > 0)
        ):
            routine_step = {
                "step": step["step"],
                "name": step["name"],
                "reason": step["reason"],
            }
            recommended_ingredients = _step_ingredients(step["step"], top_ingredients)
            if recommended_ingredients:
                routine_step["recommended_ingredients"] = recommended_ingredients
            
            routine["morning"].append(routine_step)
            
    # Xây dựng lộ trình Buổi tối
    for step in rules.get("evening", []):
        if (
            step.get("required")
            or step.get("depends_on_skin_type")
            or (step.get("depends_on_condition") and len(conditions) > 0)
        ):
            routine_step = {
                "step": step["step"],
                "name": step["name"],
                "reason": step["reason"],
            }
            recommended_ingredients = _step_ingredients(step["step"], top_ingredients)
            if recommended_ingredients:
                routine_step["recommended_ingredients"] = recommended_ingredients
            
            routine["evening"].append(routine_step)
            
    return routine, top_ingredients[:5]
