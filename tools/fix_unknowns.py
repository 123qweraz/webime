import json

corrections = {
    "泣": "weep",
    "驮": "carry on back",
    "咱": "we/us",
    "的": "of/possessive",
    "逐": "chase/pursue",
    "逮": "catch/arrest",
    "巴": "hope/cling to",
    "洁": "clean/pure",
    "稽": "inspect/bow",
    "啡": "coffee",
    "跛": "lame",
    "哩": "mile/particle",
    "我": "I/me",
    "磺": "sulfur",
    "揩": "wipe",
    "捧": "hold up/praise",
    "喊": "shout/call",
    "池": "pool/pond",
    "余": "surplus/spare",
    "懊": "regret/annoyed",
    "拗": "twist/stubborn",
    "穴": "cave/hole",
    "潦": "flooded/sloppy",
    "遇": "meet/encounter",
    "澡": "bath",
    "捍": "defend/guard",
    "澄": "clear/settle",
    "落": "fall/drop",
    "啊": "ah/oh",
    "歹": "bad/evil",
    "邑": "city/county",
    "莫": "do not/none",
    "肄": "study/practice",
    "颤": "tremble/shiver",
    "搞": "do/make",
    "许": "allow/promise",
    "魄": "soul/spirit",
    "颈": "neck",
    "把": "grasp/hold",
    "没": "not/have not",
    "枉": "crooked/wrong",
    "恃": "rely on",
    "碟": "dish/plate",
    "广": "wide/broad",
    "唧": "chirp/pump",
    "靡": "waste/extravagant",
    "肮": "dirty/filthy",
    "蔽": "cover/shield",
    "畜": "livestock",
    "姐": "sister",
    "年": "year",
    "也": "also/too",
    "嗽": "cough",
    "握": "grasp/hold",
    "跪": "kneel",
    "龟": "turtle/tortoise",
    "俺": "I/my",
    "盒": "box/case",
    "塌": "collapse",
    "抬": "lift/raise",
    "拖": "drag/delay",
    "移": "move/shift",
    "莉": "jasmine",
    "臂": "arm",
    "葡": "grape",
    "投": "throw/cast",
    "混": "mix/confuse",
    "蜻": "dragonfly",
    "尚": "still/esteem",
    "淌": "drip/trickle",
    "裳": "clothes",
    "奋": "strive/exert",
    "歇": "rest/stop",
    "否": "deny/negate",
    "幕": "curtain/screen",
    "挑": "pick/challenge",
    "呢": "particle",
    "赦": "pardon",
    "适": "fit/suitable",
    "援": "help/aid",
    "掘": "dig/excavate",
    "愉": "happy/pleasant",
    "掀": "lift/open",
    "踩": "step on",
    "这": "this",
    "蝶": "butterfly",
    "耐": "patient/endure",
    "若": "if/like"
}

file_path = 'dicts/chinese/character/level-1_char_en.json'

with open(file_path, 'r') as f:
    data = json.load(f)

updated_count = 0
for pinyin, items in data.items():
    for item in items:
        if item.get('en') == 'unknown':
            char = item['char']
            if char in corrections:
                item['en'] = corrections[char]
                updated_count += 1
            else:
                print(f"Warning: No correction found for {char}")

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Updated {updated_count} entries.")
