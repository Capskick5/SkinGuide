# Model B: điều kiện trước khi bật

Model B hỗ trợ nhận diện **dấu hiệu da nhìn thấy được**, không chẩn đoán bệnh. Hiện service chủ động để Model B ở trạng thái `unavailable` cho đến khi có đủ các điều kiện dưới đây.

## Bắt buộc

1. Dataset có giấy phép và nguồn rõ ràng; mỗi ảnh có thể mang nhiều nhãn.
2. Tách train/validation/test cố định theo người hoặc nhóm ảnh để tránh leakage.
3. Mô hình dùng `sigmoid` và threshold riêng cho từng nhãn, không dùng `softmax` một lớp.
4. Checkpoint lưu kiến trúc, thứ tự nhãn, preprocessing, threshold, nguồn dataset và test macro F1.
5. Chỉ hiển thị nhãn phát hiện; không suy ra `mild/moderate/severe` nếu dataset không có ground truth mức độ.

## Contract checkpoint

```text
model: resnet50_multilabel
task: multi_label_classification
class_names: Acne, Blackheads, Dark_Spots, Pigmentation, Pores, Redness, Wrinkles
preprocessing: image_size, mean, std
decision_thresholds: threshold cho đủ từng class
evidence: dataset và test_metrics.macro_f1
model_state_dict: trọng số PyTorch
```

Khi chưa đủ contract, hệ thống vẫn chạy Model A, tạo routine nền tảng theo loại da và ghi `analysisScope=skin_type_only`.
