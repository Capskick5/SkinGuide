import pymongo
client = pymongo.MongoClient('mongodb+srv://hoannaa2011_db_user:nonoru04@user-service.hil3ccd.mongodb.net/?retryWrites=true&w=majority')
db = client['aiskin_product']

res1 = db.products.update_many({'isActive': {'$exists': False}}, {'$set': {'isActive': True}})
res2 = db.products.update_many({'isActive': None}, {'$set': {'isActive': True}})

print(f"Updated {res1.modified_count + res2.modified_count} products.")

res3 = db.brands.update_many({'isActive': {'$exists': False}}, {'$set': {'isActive': True}})
res4 = db.brands.update_many({'isActive': None}, {'$set': {'isActive': True}})

res5 = db.categories.update_many({'isActive': {'$exists': False}}, {'$set': {'isActive': True}})
res6 = db.categories.update_many({'isActive': None}, {'$set': {'isActive': True}})

res7 = db.ingredients.update_many({'isActive': {'$exists': False}}, {'$set': {'isActive': True}})
res8 = db.ingredients.update_many({'isActive': None}, {'$set': {'isActive': True}})

print("Finished fixing isActive flags.")
