import json

file_path = r"C:\Users\ADMIN\Documents\FPTG\MSS\SkinGuide\my-doc\research\algorithm\skincare-products-eda-sentiment-analysis.ipynb"
with open(file_path, "r", encoding="utf-8") as f:
    d = json.load(f)

text_chunks = []
for c in d.get("cells", []):
    cell_type = c.get("cell_type", "")
    source = "".join(c.get("source", []))
    text_chunks.append(f"[{cell_type.upper()}]\n{source}\n")

with open("notebook_parsed.txt", "w", encoding="utf-8") as out:
    out.write("\n".join(text_chunks))
print("Successfully parsed notebook")
