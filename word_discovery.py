import json
import os
import re
import math
import zipfile
from collections import Counter
from xml.dom import minidom

class NewWordDiscovery:
    def __init__(self, dict_dir):
        self.known_words = self._load_known_words(dict_dir)
        self.min_count = 5
        self.min_pmi = 3.0

    def _load_known_words(self, dict_dir):
        known = set()
        for root, dirs, files in os.walk(dict_dir):
            for file in files:
                if file.endswith('.json'):
                    try:
                        with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            for val in data.values():
                                if isinstance(val, list):
                                    for item in val:
                                        if isinstance(item, dict) and 'char' in item:
                                            known.add(item['char'])
                                        elif isinstance(item, str):
                                            known.add(item)
                    except:
                        continue
        return known

    def _read_content(self, file_path):
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.txt':
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        
        elif ext == '.epub':
            print("正在原生解析 ePub 文件...")
            content = []
            try:
                with zipfile.ZipFile(file_path, 'r') as z:
                    # 查找所有 html/xhtml 文件
                    for name in z.namelist():
                        if name.endswith(('.html', '.xhtml', '.htm')):
                            with z.open(name) as f:
                                html = f.read().decode('utf-8', errors='ignore')
                                # 简单去除 HTML 标签
                                text = re.sub(r'<[^>]+>', '', html)
                                content.append(text)
                return "\n".join(content)
            except Exception as e:
                return f"错误: 解析 ePub 失败 - {str(e)}"
        
        return ""

    def extract(self, file_path, output_path="discovered_words.json", max_word_len=4):
        text = self._read_content(file_path)
        if text.startswith("错误:"):
            print(text)
            return

        # 仅保留汉字进行分析
        text = "".join(re.findall(r'[\u4e00-\u9fa5]+', text))
        total_len = len(text)
        if total_len == 0:
            print("未提取到有效文本内容。")
            return
            
        print(f"正在分析 {total_len} 个汉字...")
        
        ngram_counts = [Counter() for _ in range(max_word_len + 1)]
        for i in range(total_len):
            for n in range(1, max_word_len + 2):
                if i + n <= total_len:
                    ngram_counts[min(n, max_word_len)].update([text[i:i+n]])
        
        results = {}
        for n in range(2, max_word_len + 1):
            for word, count in ngram_counts[n].items():
                if count < self.min_count or word in self.known_words:
                    continue
                
                p_word = count / total_len
                p_chars = [ngram_counts[1][char] / total_len for char in word]
                pmi = math.log2(p_word / (p_chars[0] * p_chars[1]))
                
                if pmi > self.min_pmi:
                    results[word] = {
                        "count": count,
                        "pmi": round(pmi, 2)
                    }
        
        sorted_results = dict(sorted(results.items(), key=lambda x: x[1]['count'], reverse=True))
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(sorted_results, f, ensure_ascii=False, indent=2)
        
        print(f"成功！从书籍中发现 {len(sorted_results)} 个新词词组，已保存至: {output_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("用法: python3 word_discovery.py <文件路径(txt/epub)> [输出文件路径]")
        sys.exit(1)
    
    output = sys.argv[2] if len(sys.argv) > 2 else "medical_new_words.json"
    discovery = NewWordDiscovery('dicts')
    discovery.extract(sys.argv[1], output)