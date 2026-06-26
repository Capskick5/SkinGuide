import json
import urllib.request
import random

print("Fetching makeup API...")
req = urllib.request.Request('http://makeup-api.herokuapp.com/api/v1/products.json')
with urllib.request.urlopen(req) as response:
    makeup_data = json.loads(response.read())

images_by_type = {}
for p in makeup_data:
    ptype = p.get('product_type')
    img = p.get('image_link')
    if ptype and img and not img.endswith('missing.png'):
        if ptype not in images_by_type:
            images_by_type[ptype] = []
        images_by_type[ptype].append(img)

# Fallback pool
all_images = [img for imgs in images_by_type.values() for img in imgs]

def get_image_for_category(cat):
    cat = cat.lower() if cat else ""
    if 'lip' in cat:
        pool = images_by_type.get('lipstick', []) + images_by_type.get('lip_liner', [])
    elif 'eye' in cat or 'mascara' in cat:
        pool = images_by_type.get('eyeshadow', []) + images_by_type.get('eyeliner', []) + images_by_type.get('mascara', [])
    elif 'treatment' in cat or 'serum' in cat:
        # Nail polish bottles look like serums
        pool = images_by_type.get('nail_polish', [])
    elif 'cleanser' in cat or 'moisturizer' in cat or 'sunscreen' in cat or 'mask' in cat:
        # Foundations and bronzers come in tubes/bottles/compacts similar to these
        pool = images_by_type.get('foundation', []) + images_by_type.get('bronzer', [])
    else:
        pool = all_images
        
    if not pool:
        pool = all_images
        
    return random.choice(pool) if pool else None

file_path = r'C:\Users\ADMIN\Documents\FPTG\MSS\SkinGuide\my-doc\data\product_dataset.json'
print("Loading dataset...")
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Updating images...")
for p in data:
    img_url = get_image_for_category(p.get('categoryName', ''))
    if not img_url:
        img_url = 'https://picsum.photos/500/500'
    # Many makeup API urls are http, convert to https for better compatibility
    img_url = img_url.replace('http://', 'https://')
    p['imageUrl'] = img_url
    p['images'] = [img_url]

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Images updated successfully!")
