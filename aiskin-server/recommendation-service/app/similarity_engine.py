import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os

class RecommendationEngine:
    def __init__(self, dataset_path: str):
        self.dataset_path = dataset_path
        self.df = None
        self._load_data()

    def _load_data(self):
        """Tải dữ liệu mỹ phẩm từ file CSV."""
        if os.path.exists(self.dataset_path):
            self.df = pd.read_csv(self.dataset_path)
            # Chuẩn hóa tên cột để dễ filter (viết thường)
            self.df.columns = [col.lower() if isinstance(col, str) else col for col in self.df.columns]
        else:
            raise FileNotFoundError(f"Dataset not found at {self.dataset_path}")

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
        # Các cột da trong dataset: 'combination', 'dry', 'normal', 'oily', 'sensitive' chứa giá trị 1/0
        skin_type_col = skin_type.lower()
        if skin_type_col in filtered_df.columns:
            filtered_df = filtered_df[filtered_df[skin_type_col] == 1]
            
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
            return sorted_df.to_dict('records')

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
        return final_df.to_dict('records')
