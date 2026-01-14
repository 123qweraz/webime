import json

with open('dicts/chinese/character/level-1_char_en.json', 'r') as f:
    data = json.load(f)

unknowns = []
for pinyin, items in data.items():
    for item in items:
        if item.get('en') == 'unknown':
            unknowns.append(item['char'])

print(f"Found {len(unknowns)} characters with 'unknown' definition.")
print(", ".join(unknowns))
