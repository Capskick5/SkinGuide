import json

file_path = r'C:\Users\ADMIN\Documents\FPTG\MSS\SkinGuide\my-doc\data\product_dataset.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for i, p in enumerate(data):
    slug = p.get('slug', f'product-{i}')
    img_url = f'https://picsum.photos/seed/{slug}/500/500'
    p['imageUrl'] = img_url
    p['images'] = [img_url]

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print('Updated images successfully!')
