import json
import os

def filter_hsk_phrases(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    phrases = []
    with open(input_path, 'r', encoding='utf-8') as f:
        for line in f:
            word = line.strip()
            # 仅保留长度大于 1 的词组
            if len(word) > 1:
                phrases.append(word)

    # 去重并保持顺序
    seen = set()
    unique_phrases = [x for x in phrases if not (x in seen or seen.add(x))]

    # 构造初步字典（英文暂时留空或占位）
    # 在实际应用中，这里可以通过调用翻译 API 或匹配现有词库来填充
    result = {phrase: "" for phrase in unique_phrases}

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Success: Processed {len(unique_phrases)} phrases.")
    print(f"Output saved to: {output_path}")

if __name__ == "__main__":
    input_file = "dicts/chinese/first_dict/hsk30-pleco.txt"
    output_file = "dicts/chinese/first_dict/hsk30_phrases_empty.json"
    filter_hsk_phrases(input_file, output_file)
