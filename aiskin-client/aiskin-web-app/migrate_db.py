import os

from pymongo import MongoClient


def required_env(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def migrate_product_names():
    client = MongoClient(required_env('MONGODB_URI_PRODUCT'))
    try:
        db = client.get_default_database('aiskin_product')
        brands = {b['_id']: b.get('name') for b in db.brands.find()}
        categories = {c['_id']: c.get('name') for c in db.categories.find()}

        updates = 0
        for product in db.products.find():
            brand_id = product.get('brandId')
            category_id = product.get('categoryId')
            brand_name = brands.get(brand_id) if brand_id else None
            category_name = categories.get(category_id) if category_id else None

            if brand_name or category_name:
                db.products.update_one(
                    {'_id': product['_id']},
                    {'$set': {'brandName': brand_name, 'categoryName': category_name}},
                )
                updates += 1

        print(f"Updated {updates} products with brandName and categoryName.")
    finally:
        client.close()


if __name__ == '__main__':
    migrate_product_names()
