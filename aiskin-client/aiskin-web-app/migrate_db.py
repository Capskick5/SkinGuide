from pymongo import MongoClient

def migrate_product_names():
    uri = 'mongodb+srv://hoannaa2011_db_user:nonoru04@user-service.hil3ccd.mongodb.net/aiskin_product?retryWrites=true&w=majority'
    db = MongoClient(uri).aiskin_product
    
    brands = {b['_id']: b.get('name') for b in db.brands.find()}
    categories = {c['_id']: c.get('name') for c in db.categories.find()}
    
    updates = 0
    for p in db.products.find():
        b_id = p.get('brandId')
        c_id = p.get('categoryId')
        
        b_name = brands.get(b_id) if b_id else None
        c_name = categories.get(c_id) if c_id else None
        
        if b_name or c_name:
            db.products.update_one(
                {'_id': p['_id']}, 
                {'$set': {'brandName': b_name, 'categoryName': c_name}}
            )
            updates += 1
            
    print(f"Updated {updates} products with brandName and categoryName.")

migrate_product_names()
