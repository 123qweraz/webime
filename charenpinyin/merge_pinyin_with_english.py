#!/usr/bin/env python3
import json
import sys
from collections import OrderedDict


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(data, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def merge_bc(char_en, pinyin_chars):
    """
    char_en: dict, char -> en
    pinyin_chars: dict, pinyin -> [char]
    """
    result = OrderedDict()

    for pinyin in sorted(pinyin_chars.keys()):
        result[pinyin] = []
        for char in pinyin_chars[pinyin]:
            result[pinyin].append({"char": char, "en": char_en.get(char)})

    return result


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(
            "用法: python merge_bc_to_a.py char_en.json pinyin_chars.json output.json"
        )
        sys.exit(1)

    char_en = load_json(sys.argv[1])
    pinyin_chars = load_json(sys.argv[2])

    merged = merge_bc(char_en, pinyin_chars)
    save_json(merged, sys.argv[3])

    print(f"✔ 合并完成，拼音数: {len(merged)}")
