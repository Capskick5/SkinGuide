import json
import re
from functools import lru_cache
from pathlib import Path


RULES_PATH = Path(__file__).resolve().parents[1] / "knowledge" / "ingredient_rules.json"
SKIN_TYPE_ALIASES = {
    "dry": "Dry",
    "normal": "Normal",
    "oily": "Oily",
    "combination": "Combination",
    "sensitive": "Sensitive",
}
ISSUE_ALIASES = {
    "acne": "Acne",
    "blackheads": "Blackheads",
    "dark_spots": "Dark_Spots",
    "darkspots": "Dark_Spots",
    "pigmentation": "Pigmentation",
    "pores": "Pores",
    "enlarged_pores": "Pores",
    "redness": "Redness",
    "wrinkles": "Wrinkles",
}


def _normalize_key(value) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower())
    return normalized.strip("_")


@lru_cache(maxsize=1)
def load_ingredient_rules() -> dict:
    with RULES_PATH.open("r", encoding="utf-8") as handle:
        rules = json.load(handle)

    required_sections = {"ingredients", "skinTypes", "issues", "sources"}
    missing = required_sections.difference(rules)
    if missing:
        raise RuntimeError(f"Ingredient rules are missing sections: {sorted(missing)}")

    known_ingredients = set(rules["ingredients"])
    referenced = {
        ingredient
        for targets in list(rules["skinTypes"].values()) + list(rules["issues"].values())
        for ingredient in targets
    }
    unknown = referenced.difference(known_ingredients)
    if unknown:
        raise RuntimeError(f"Ingredient rules reference unknown ingredients: {sorted(unknown)}")
    return rules


def _condition_name(condition) -> str:
    if not isinstance(condition, dict):
        return ""
    raw_name = condition.get("name") or condition.get("issue")
    return ISSUE_ALIASES.get(_normalize_key(raw_name), "")


def score_ingredients(skin_type, conditions):
    """Rank cosmetic ingredients from transparent skin-type and visible-issue rules."""
    rules = load_ingredient_rules()
    scores = {}
    matched_rules = {}

    normalized_skin_type = SKIN_TYPE_ALIASES.get(_normalize_key(skin_type))
    if normalized_skin_type:
        for ingredient in rules["skinTypes"].get(normalized_skin_type, []):
            scores[ingredient] = scores.get(ingredient, 0) + 2
            matched_rules.setdefault(ingredient, []).append(normalized_skin_type)

    for condition in conditions or []:
        issue_name = _condition_name(condition)
        if not issue_name:
            continue
        for ingredient in rules["issues"].get(issue_name, []):
            scores[ingredient] = scores.get(ingredient, 0) + 3
            matches = matched_rules.setdefault(ingredient, [])
            if issue_name not in matches:
                matches.append(issue_name)

    ingredient_order = {name: index for index, name in enumerate(rules["ingredients"])}
    ranked_names = sorted(
        scores,
        key=lambda name: (-scores[name], ingredient_order[name]),
    )

    ranked = []
    for name in ranked_names:
        details = rules["ingredients"][name]
        ranked.append({
            "name": name,
            "description": details["description"],
            "usage": details.get("usage", "Dùng theo hướng dẫn trên nhãn sản phẩm."),
            "caution": details.get("caution", "Ngưng dùng nếu da kích ứng kéo dài."),
            "match_score": scores[name],
            "matched_issues": matched_rules[name],
            "evidence": details.get("evidence", []),
        })
    return ranked
