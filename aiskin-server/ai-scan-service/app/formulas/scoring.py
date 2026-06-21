import pandas as pd
import ast
import re
import os

# Đường dẫn tới dataset
DATASET_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "datasets", "ingredientsList.csv")

def parse_tags(val):
    if pd.isna(val):
        return []
    try:
        items = ast.literal_eval(val)
        return [x.strip() for x in items if x.strip()]
    except (ValueError, SyntaxError):
        return [val.strip()] if val.strip() else []

def get_ingredients_dataframe():
    try:
        df = pd.read_csv(DATASET_PATH)
        df = df.dropna(subset=["name"]).reset_index(drop=True)
        df["good_for_tags"] = df["who_is_it_good_for"].apply(parse_tags)
        df["avoid_tags"] = df["who_should_avoid"].apply(parse_tags)
        return df
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return pd.DataFrame()

def score_ingredients(skin_type, conditions):
    """
    Tính điểm các thành phần dựa trên loại da và vấn đề da.
    - skin_type: str (ví dụ: "Oily", "Dry")
    - conditions: list dict (ví dụ: [{"name": "acne", "severity": 70}])
    Trả về danh sách các thành phần (tên và thông tin) được sắp xếp theo điểm số.
    """
    df = get_ingredients_dataframe()
    if df.empty:
        return []

    # Map các loại da / vấn đề về định dạng tag trong dataset
    target_tags = []
    
    # Map skin_type
    skin_type_mapping = {
        "oily": "Oily",
        "dry": "Dry and dehydrated skin",
        "combination": "Combination",
        "normal": "Normal",
        "sensitive": "Sensitive"
    }
    
    mapped_skin_type = skin_type_mapping.get(skin_type.lower(), "")
    if mapped_skin_type:
        target_tags.append(mapped_skin_type)

    # Map conditions
    condition_mapping = {
        "acne": "Acne",
        "blackheads": "Blackheads",
        "dark_spots": "Pigmentation",
        "pigmentation": "Pigmentation",
        "pores": "Enlarged Pores",
        "wrinkles": "Wrinkles",
        "redness": "Redness"
    }
    
    for cond in conditions:
        # Hỗ trợ cả key "name" (manual) và "issue" (từ ultimate_skin_inference.py)
        cond_name = cond.get("name", cond.get("issue", "")).lower()
        mapped_cond = condition_mapping.get(cond_name, "")
        if mapped_cond:
            # Thêm nhiều lần dựa trên severity để tăng trọng số (tùy chọn)
            # Ở đây ta chỉ lấy tag
            target_tags.append(mapped_cond)
            
    scored_ingredients = []
    
    for idx, row in df.iterrows():
        good_tags = row["good_for_tags"]
        avoid_tags = row["avoid_tags"]
        
        # Nếu loại da hoặc vấn đề nằm trong avoid_tags -> bỏ qua hoàn toàn
        # Nhưng thực tế trong dataset, avoid_tags chủ yếu là "Related Allergy" hoặc "Pregnancy"
        # Đôi khi có "Oily" hoặc "Dry Dehydrated".
        should_avoid = False
        for avoid in avoid_tags:
            if avoid in target_tags:
                should_avoid = True
                break
                
        if should_avoid:
            continue
            
        # Tính điểm dựa trên số lượng tag match
        match_score = 0
        matched_issues = []
        for tag in target_tags:
            if tag in good_tags:
                match_score += 1
                matched_issues.append(tag)
                
        if match_score > 0:
            scored_ingredients.append({
                "name": row["name"],
                "description": row["short_description"] if pd.notna(row["short_description"]) else "",
                "match_score": match_score,
                "matched_issues": matched_issues,
                "url": row["url"] if pd.notna(row["url"]) else ""
            })
            
    # Sort theo điểm giảm dần
    scored_ingredients = sorted(scored_ingredients, key=lambda x: x["match_score"], reverse=True)
    return scored_ingredients
