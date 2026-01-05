import json
from collections import defaultdict

INPUT_FILE = "cizu_dict.json"

files = {
    "1字.json": defaultdict(list),
    "2字.json": defaultdict(list),
    "3字.json": defaultdict(list),
    "4字.json": defaultdict(list),
    "4字以上.json": defaultdict(list),
    "儿化词.json": defaultdict(list),
}

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

for key, words in data.items():
    for word in words:
        # ===== 儿化词优先 =====
        if word.endswith("儿"):
            files["儿化词.json"][key].append(word)
            continue

        length = len(word)

        if length == 1:
            files["1字.json"][key].append(word)
        elif length == 2:
            files["2字.json"][key].append(word)
        elif length == 3:
            files["3字.json"][key].append(word)
        elif length == 4:
            files["4字.json"][key].append(word)
        else:
            files["4字以上.json"][key].append(word)

# ===== 写文件（自动去空 key）=====
for filename, content in files.items():
    clean = {k: v for k, v in content.items() if v}
    if not clean:
        continue

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(clean, f, ensure_ascii=False, indent=2)

print("完成：已按字数 + 儿化词拆分为多个 JSON 文件")
