import json
import os
import re
import math
import zipfile
from collections import Counter

class NewWordDiscovery:
    def __init__(self, dict_dir):
        self.known_words = self._load_known_words(dict_dir)
        # 优化后的参数
        self.min_count = 5      # 最小词频：太低容易引入噪声
        self.min_pmi = 4.0      # 最小凝固度 (PMI)：值越高，字之间结合越紧密
        self.min_entropy = 0.8  # 最小自由度 (Entropy)：关键参数！过滤"血红蛋"、"化道"等残缺词

    def _load_known_words(self, dict_dir):
        known = set()
        if not os.path.exists(dict_dir):
            return known
            
        for root, dirs, files in os.walk(dict_dir):
            for file in files:
                if file.endswith('.json'):
                    try:
                        with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            if isinstance(data, dict):
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
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read()
            except Exception as e:
                return f"错误: 读取文件失败 - {str(e)}"
        
        elif ext == '.epub':
            print("正在原生解析 ePub 文件...")
            content = []
            try:
                with zipfile.ZipFile(file_path, 'r') as z:
                    for name in z.namelist():
                        if name.endswith(('.html', '.xhtml', '.htm')):
                            with z.open(name) as f:
                                html = f.read().decode('utf-8', errors='ignore')
                                text = re.sub(r'<[^>]+>', '', html)
                                content.append(text)
                return "\n".join(content)
            except Exception as e:
                return f"错误: 解析 ePub 失败 - {str(e)}"
        
        return ""

    def _compute_entropy(self, counts):
        """计算分布熵 (Entropy)，衡量词的自由度"""
        if not counts:
            return 0.0
        total = sum(counts)
        if total == 0:
            return 0.0
        entropy = 0.0
        for c in counts:
            p = c / total
            entropy -= p * math.log2(p)
        return entropy

    def extract(self, file_path, output_path="discovered_words.json", max_word_len=4):
        text = self._read_content(file_path)
        if not text or text.startswith("错误"):
            print(text or "读取文件为空")
            return

        # 1. 预处理：按非汉字分割，避免跨句组合
        print("正在预处理文本...")
        sentences = re.split(r'[^\u4e00-\u9fa5]+', text)
        sentences = [s for s in sentences if len(s) > 1]
        
        total_len = sum(len(s) for s in sentences)
        if total_len == 0:
            print("未提取到有效中文内容。")
            return
            
        print(f"正在分析 {total_len} 个汉字，共 {len(sentences)} 个语句片段...")
        
        # 2. 统计 N-gram
        # 统计 max_word_len + 1 是为了计算 max_word_len 词的"下一步"可能性(右熵)
        ngrams = Counter()
        
        for sent in sentences:
            slen = len(sent)
            for i in range(slen):
                for n in range(1, max_word_len + 2):
                    if i + n <= slen:
                        ngrams[sent[i:i+n]] += 1
        
        # 3. 构建左右邻接分布 (用于计算熵)
        # 只有左右搭配丰富的词，才是完整的词
        right_neighbor_counts = {} # key: word, value: list of counts
        left_neighbor_counts = {}  # key: word, value: list of counts
        
        # 利用 N+1 gram 来推导 N gram 的邻字分布
        for word, count in ngrams.items():
            wlen = len(word)
            if wlen < 2: continue
            
            # Case 1: Word = Prefix + NextChar
            # "ABC" 的出现证明了 "AB" 后面可以接 "C"
            prefix = word[:-1]
            if prefix in ngrams: 
                if prefix not in right_neighbor_counts: right_neighbor_counts[prefix] = []
                right_neighbor_counts[prefix].append(count)
                
            # Case 2: Word = PrevChar + Suffix
            # "ABC" 的出现证明了 "BC" 前面可以接 "A"
            suffix = word[1:]
            if suffix in ngrams:
                if suffix not in left_neighbor_counts: left_neighbor_counts[suffix] = []
                left_neighbor_counts[suffix].append(count)

        # 4. 筛选与评分
        results = {}
        print("正在计算凝固度(PMI)与自由度(Entropy)...")
        
        for word, count in ngrams.items():
            wlen = len(word)
            if wlen < 2 or wlen > max_word_len:
                continue
            
            if count < self.min_count:
                continue
            
            if word in self.known_words:
                continue
                
            # --- 算法核心 1: 凝固度 (PMI) ---
            # 检查词内部是否结合紧密
            # min( P(W) / (P(A)*P(B)) ) 对于所有切分点
            min_pmi = float('inf')
            p_word = count / total_len
            
            for k in range(1, wlen):
                part1 = word[:k]
                part2 = word[k:]
                c1 = ngrams.get(part1, 0)
                c2 = ngrams.get(part2, 0)
                
                if c1 > 0 and c2 > 0:
                    p1 = c1 / total_len
                    p2 = c2 / total_len
                    pmi = math.log2(p_word / (p1 * p2))
                    if pmi < min_pmi:
                        min_pmi = pmi
            
            if min_pmi < self.min_pmi:
                continue
                
            # --- 算法核心 2: 自由度 (Entropy) ---
            # 检查词的左右边界是否自由
            # "血红蛋" 右边总是 "白"，右熵低 -> 过滤
            # "化道" 左边总是 "消"，左熵低 -> 过滤
            
            r_entropy = self._compute_entropy(right_neighbor_counts.get(word, []))
            l_entropy = self._compute_entropy(left_neighbor_counts.get(word, []))
            
            # 取左右熵的较小值，要求两边都比较自由
            min_entropy_val = min(r_entropy, l_entropy)
            if min_entropy_val < self.min_entropy:
                continue
                
            results[word] = {
                "count": count,
                "pmi": round(min_pmi, 2),
                "entropy": round(min_entropy_val, 2)
            }
        
        # 5. 保存结果
        sorted_results = dict(sorted(results.items(), key=lambda x: x[1]['count'], reverse=True))
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(sorted_results, f, ensure_ascii=False, indent=2)
            print(f"成功！发现 {len(sorted_results)} 个新词，已保存至: {output_path}")
        except Exception as e:
            print(f"保存结果失败: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("用法: python3 word_discovery.py <文件路径(txt/epub)> [输出文件路径]")
        sys.exit(1)
    
    output = sys.argv[2] if len(sys.argv) > 2 else "medical_new_words.json"
    discovery = NewWordDiscovery('dicts')
    discovery.extract(sys.argv[1], output)
