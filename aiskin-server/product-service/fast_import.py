import json
import pymongo
from bson import ObjectId
import re

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s-]+', '-', text)
    return text.strip('-')

client = pymongo.MongoClient('mongodb+srv://hoannaa2011_db_user:nonoru04@user-service.hil3ccd.mongodb.net/?retryWrites=true&w=majority')
db = client['aiskin_product']

# Drop all collections to start fresh
db.products.drop()
db.brands.drop()
db.categories.drop()
db.ingredients.drop()
print("Dropped old collections.")

file_path = r'C:\Users\ADMIN\Documents\FPTG\MSS\SkinGuide\my-doc\data\product_dataset.json'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

brands_cache = {}
categories_cache = {}
ingredients_cache = {}

products_to_insert = []
brands_to_insert = []
categories_to_insert = []
ingredients_to_insert = []

for p in data:
    # Brand
    brand_name = p.get('brandName')
    if brand_name:
        brand_slug = slugify(brand_name)
        if brand_slug not in brands_cache:
            b_id = str(ObjectId())
            brands_cache[brand_slug] = b_id
            brands_to_insert.append({'_id': b_id, 'name': brand_name, 'slug': brand_slug, '_class': 'mss.productservice.model.Brand'})
        p['brandId'] = brands_cache[brand_slug]

    # Category
    cat_name = p.get('categoryName')
    if cat_name:
        cat_slug = slugify(cat_name)
        if cat_slug not in categories_cache:
            c_id = str(ObjectId())
            categories_cache[cat_slug] = c_id
            categories_to_insert.append({'_id': c_id, 'name': cat_name, 'slug': cat_slug, '_class': 'mss.productservice.model.Category'})
        p['categoryId'] = categories_cache[cat_slug]

    # Ingredients
    if p.get('ingredients'):
        updated_ings = []
        for ing in p['ingredients']:
            name = ing.get('name', '').strip()
            if not name:
                continue
            ing_slug = slugify(name)
            if not ing_slug:
                continue
            if ing_slug not in ingredients_cache:
                i_id = str(ObjectId())
                ingredients_cache[ing_slug] = i_id
                ingredients_to_insert.append({'_id': i_id, 'name': name, 'slug': ing_slug, '_class': 'mss.productservice.model.Ingredient'})
            
            ing['ingredientId'] = ingredients_cache[ing_slug]
            updated_ings.append(ing)
        p['ingredients'] = updated_ings

    # Add id and class to product
    p['_id'] = str(ObjectId())
    p['_class'] = 'mss.productservice.model.Product'
    p['isActive'] = True
    
    products_to_insert.append(p)

if brands_to_insert:
    db.brands.insert_many(brands_to_insert)
if categories_to_insert:
    db.categories.insert_many(categories_to_insert)
if ingredients_to_insert:
    db.ingredients.insert_many(ingredients_to_insert)
if products_to_insert:
    db.products.insert_many(products_to_insert)

print(f"Imported {len(products_to_insert)} products, {len(brands_to_insert)} brands, {len(categories_to_insert)} categories, {len(ingredients_to_insert)} ingredients successfully!")
