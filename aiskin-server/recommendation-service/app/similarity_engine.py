import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class RecommendationEngine:
    def __init__(self, dataset_path: str):
        self.dataset_path = dataset_path
        self.df = None
        self._load_data()

    def _load_data(self):
        """Recommendations must come from the store catalog, never an external fallback."""
        self.df = pd.DataFrame()

    @staticmethod
    def _sellable_variant(product):
        variants = product.get('variants') or []
        sellable = []
        for variant in variants:
            if not isinstance(variant, dict) or variant.get('isActive', True) is False:
                continue

            tracks_inventory = variant.get('trackInventory', True) is not False
            levels = variant.get('inventoryLevels') or []
            available = sum(
                max(0, int(level.get('onHandQuantity') or 0) - int(level.get('reservedQuantity') or 0))
                for level in levels
                if isinstance(level, dict)
            )
            if tracks_inventory and available <= 0:
                continue

            sellable.append((variant, available, tracks_inventory))

        if not sellable:
            return None
        return min(sellable, key=lambda item: float(item[0].get('price') or product.get('price') or 0))

    @staticmethod
    def _add_evidence(records, skin_type, target_ingredients):
        requested = [str(item).strip().lower() for item in target_ingredients if str(item).strip()]
        for record in records:
            matched = []
            for ingredient in record.get('ingredientDetails') or []:
                name = ingredient.get('name', '')
                normalized_name = name.lower()
                if any(target in normalized_name or normalized_name in target for target in requested):
                    percentage = ingredient.get('percentage')
                    matched.append({
                        'name': name,
                        'percentage': percentage,
                        'concentrationEvidence': (
                            f"{percentage}%" if percentage is not None else "Chưa có dữ liệu nồng độ"
                        ),
                    })

            reasons = []
            if skin_type:
                reasons.append(f"Phù hợp loại da {skin_type}")
            if matched:
                reasons.append("Có thành phần mục tiêu: " + ", ".join(item['name'] for item in matched))
            record['matchedIngredients'] = matched
            record['matchReasons'] = reasons
        return records
            
    def update_data(self, products: list):
        """Cập nhật DataFrame từ danh sách JSON của Kafka/MongoDB."""
        if not products:
            return
            
        formatted_list = []
        for p in products:
            if not isinstance(p, dict) or p.get('isActive', True) is False:
                continue
            variant_result = self._sellable_variant(p)
            if variant_result is None:
                continue
            variant, available_quantity, tracks_inventory = variant_result

            # Chuyển đổi JSON thành dạng tương thích với engine
            # Extract ingredients
            ing_list = p.get('ingredients', [])
            if isinstance(ing_list, list):
                ing_str = ", ".join([i.get('name', '') if isinstance(i, dict) else str(i) for i in ing_list])
                ingredient_details = [
                    {
                        'name': str(item.get('name', '')).strip(),
                        'percentage': item.get('percentage'),
                        'isKey': item.get('isKey') is True,
                    }
                    for item in ing_list
                    if isinstance(item, dict) and str(item.get('name', '')).strip()
                ]
            else:
                ing_str = str(ing_list)
                ingredient_details = []
                
            # Skin types (one-hot encoding)
            skin_types_source = p.get('targetSkinTypes', p.get('skinTypes', []))
            skin_types = [st.lower() for st in skin_types_source] if isinstance(skin_types_source, list) else []
            
            # Label
            cat = str(p.get('categoryName', p.get('categoryId', '')) or '')
            
            # Map category to label
            label = cat
            if 'Cleanser' in cat: label = 'Cleanser'
            elif 'Moisturizer' in cat: label = 'Moisturizer'
            elif 'Treatment' in cat: label = 'Treatment'
            elif 'Mask' in cat: label = 'Face Mask'
            elif 'Eye' in cat: label = 'Eye cream'
            elif 'Sunscreen' in cat: label = 'Sun protect'
            
            formatted_list.append({
                'id': p.get('id', p.get('_id')),
                'slug': p.get('slug', ''),
                'imageUrl': p.get('imageUrl', ''),
                'brand': p.get('brandName', p.get('brandId', '')),
                'name': p.get('name', ''),
                'price': variant.get('price') or p.get('price', 0),
                'variantId': variant.get('id', variant.get('_id')),
                'variantName': variant.get('name'),
                'sku': variant.get('sku'),
                'volume': variant.get('volume'),
                'unit': variant.get('unit'),
                'availableQuantity': available_quantity,
                'trackInventory': tracks_inventory,
                'rank': 5.0, # Default rank
                'ingredients': ing_str,
                'ingredientDetails': ingredient_details,
                'label': label,
                'combination': 1 if 'combination' in skin_types else 0,
                'dry': 1 if 'dry' in skin_types else 0,
                'normal': 1 if 'normal' in skin_types else 0,
                'oily': 1 if 'oily' in skin_types else 0,
                'sensitive': 1 if 'sensitive' in skin_types else 0
            })
            
        self.df = pd.DataFrame(formatted_list)
        # Bỏ print tiếng việt để tránh lỗi charmap trên Windows

    def recommend(self, product_label: str, skin_type: str, target_ingredients: list, top_k: int = 5):
        """
        Thực thi Chiến lược Lai (Hybrid Strategy):
        1. Model 1 (Lọc Ngữ Cảnh)
        2. Model 2 (Vector hóa & TF-IDF)
        """
        if self.df is None or self.df.empty:
            return []

        # ==========================================
        # PHA 1: MODEL 1 - LỌC NGỮ CẢNH (RULE-BASED)
        # ==========================================
        filtered_df = self.df.copy()
        
        # 1.1. Lọc theo Loại Sản Phẩm (Label)
        if product_label:
            # Ví dụ: Label trong dataset có thể là 'Cleanser', 'Moisturizer'...
            # Ta dùng str.contains để match không phân biệt hoa thường
            filtered_df = filtered_df[filtered_df['label'].str.contains(product_label, case=False, na=False)]
        
        # 1.2. Lọc theo Loại Da (Skin Type)
        skin_type_col = skin_type.lower()
        if skin_type_col in filtered_df.columns:
            temp_df = filtered_df[filtered_df[skin_type_col] == 1]
            # Fallback: nếu không có sản phẩm nào hợp loại da, bỏ qua filter loại da
            if not temp_df.empty:
                filtered_df = temp_df
            
        # Nếu filter xong không còn sản phẩm nào thì báo rỗng
        if filtered_df.empty:
            return []
            
        # Reset index cho mảng đã lọc
        filtered_df = filtered_df.reset_index(drop=True)

        # ==========================================
        # PHA 2: MODEL 2 - PHÂN TÍCH CHUYÊN SÂU (TF-IDF)
        # ==========================================
        # Nếu không có target_ingredients, chỉ trả về Top sản phẩm được rating cao (rank)
        if not target_ingredients:
            sorted_df = filtered_df.sort_values(by='rank', ascending=False).head(top_k)
            return self._add_evidence(sorted_df.to_dict('records'), skin_type, target_ingredients)

        # Gộp danh sách thành phần yêu cầu thành chuỗi (để đưa vào AI NLP)
        target_text = " ".join(target_ingredients).lower()

        # Khởi tạo Vectorizer (Tfidf)
        # stop_words='english' giúp loại bỏ các từ vô nghĩa
        vectorizer = TfidfVectorizer(stop_words='english')

        # Nạp danh sách thành phần của các sản phẩm đã lọc vào AI
        # Fill NA bằng string rỗng để tránh lỗi
        product_ingredients = filtered_df['ingredients'].fillna("").str.lower()
        
        # Biến toàn bộ thành ma trận
        tfidf_matrix = vectorizer.fit_transform(product_ingredients)
        
        # Biến "Đơn thuốc" thành 1 vector để so khớp
        target_vector = vectorizer.transform([target_text])

        # Tính khoảng cách hình học (Cosine Similarity)
        # Kết quả trả về là một mảng điểm [0.1, 0.9, 0.05, ...]
        similarity_scores = cosine_similarity(target_vector, tfidf_matrix).flatten()

        # Gắn điểm số vào DataFrame
        filtered_df['match_score'] = similarity_scores

        # Sắp xếp theo điểm Match cao nhất, nếu hòa thì ưu tiên Rank cao hơn
        sorted_df = filtered_df.sort_values(by=['match_score', 'rank'], ascending=[False, False])
        
        # Lọc bỏ những sản phẩm có điểm match_score quá thấp (hoàn toàn không chứa chất nào)
        # (Chỉ lấy các sản phẩm có score > 0)
        final_df = sorted_df[sorted_df['match_score'] > 0].head(top_k)

        # Nếu không có sản phẩm nào match thành phần, fallback trả về top rank
        if final_df.empty:
            final_df = sorted_df.head(top_k)

        # Convert sang dạng Dictionary để trả về JSON
        records = final_df.to_dict('records')
        return self._add_evidence(records, skin_type, target_ingredients)
