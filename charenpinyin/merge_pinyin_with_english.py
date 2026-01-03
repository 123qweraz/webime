#!/usr/bin/env python3
import json

PINYIN_JSON = "dict_hanzi.json"  # 第①种
ENGLISH_JSON = "dict_en_char.json"  # 第②种
OUTPUT_JSON = "merged.json"

# ===== 1️⃣ 加载数据 =====
with open(PINYIN_JSON, "r", encoding="utf-8") as f:
    pinyin_data = json.load(f)

with open(ENGLISH_JSON, "r", encoding="utf-8") as f:
    english_data = json.load(f)

# ===== 2️⃣ 英文词库反转：汉字 -> 英文 =====
char_to_english = {}

for en, chars in english_data.items():
    if chars:
        ch = chars[0]
        # 只保留第一个英文解释
        if ch not in char_to_english:
            char_to_english[ch] = en

# ===== 3️⃣ 合并 =====
merged = {}

for py, chars in pinyin_data.items():
    merged[py] = []
    for ch in chars:
        merged[py].append({"char": ch, "en": char_to_english.get(ch)})

# ===== 4️⃣ 输出 =====
with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(merged, f, ensure_ascii=False, indent=2)

print("完成：已给拼音词表挂载英文释义")
