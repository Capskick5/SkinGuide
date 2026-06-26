import requests
import json
import time

url = "http://localhost:8082/api/products/import/json"
file_path = r"C:\Users\ADMIN\Documents\FPTG\MSS\SkinGuide\my-doc\data\product_dataset.json"

print(f"Loading data from {file_path}...")
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Sending {len(data)} products to {url}...")
# Try up to 5 times in case server is still starting
for i in range(5):
    try:
        response = requests.post(url, json=data, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 200:
            break
    except Exception as e:
        print(f"Attempt {i+1} failed: {e}")
        time.sleep(5)
