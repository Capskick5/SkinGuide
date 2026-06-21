import json
import os
from .scoring import score_ingredients

RULES_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge", "routine_rules.json")

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
    
    # Lấy ra tên của một số thành phần top đầu (vd: top 3) để gợi ý vào bước Treatment/Serum
    recommended_actives = [ing["name"] for ing in top_ingredients[:3]] if top_ingredients else []
    
    routine = {
        "morning": [],
        "evening": []
    }
    
    # Xây dựng lộ trình Buổi sáng
    for step in rules.get("morning", []):
        if step.get("required") or (step.get("depends_on_condition") and len(conditions) > 0):
            routine_step = {
                "step": step["step"],
                "name": step["name"],
                "reason": step["reason"],
            }
            # Nếu bước này cần trị liệu (serum/treatment), gợi ý thành phần
            if step.get("depends_on_condition") and recommended_actives:
                routine_step["recommended_ingredients"] = recommended_actives
            
            routine["morning"].append(routine_step)
            
    # Xây dựng lộ trình Buổi tối
    for step in rules.get("evening", []):
        if step.get("required") or (step.get("depends_on_condition") and len(conditions) > 0):
            routine_step = {
                "step": step["step"],
                "name": step["name"],
                "reason": step["reason"],
            }
            # Nếu bước này cần trị liệu (serum/treatment), gợi ý thành phần
            if step.get("depends_on_condition") and recommended_actives:
                routine_step["recommended_ingredients"] = recommended_actives
            
            routine["evening"].append(routine_step)
            
    return routine, top_ingredients[:5]
