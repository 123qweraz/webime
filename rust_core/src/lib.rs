mod trie;
mod pinyin;

use wasm_bindgen::prelude::*;
use trie::Trie;
use serde::{Serialize, Deserialize};

#[cfg(feature = "console_error_panic_hook")]
use std::panic;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[derive(Clone, Serialize, Debug)]
struct PathNode {
    text: String,
    score: f64,
}

#[wasm_bindgen]
pub struct WebImeEngine {
    trie: Trie,
}

#[wasm_bindgen]
impl WebImeEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> WebImeEngine {
        #[cfg(feature = "console_error_panic_hook")]
        panic::set_hook(Box::new(console_error_panic_hook::hook));
        
        WebImeEngine {
            trie: Trie::new(),
        }
    }

    pub fn insert_dict(&mut self, key: &str, value: &str, desc: &str, priority: i32) {
        self.trie.insert(key, value, desc, priority);
    }

    pub fn search(&self, prefix: &str) -> String {
        let results = self.trie.search(prefix);
        serde_json::to_string(&results).unwrap_or("[]".to_string())
    }

    // --- 新增：整句搜索 (Viterbi 简化版) ---
    pub fn search_sentence(&self, input_pinyin: &str) -> String {
        if input_pinyin.is_empty() { return "[]".to_string(); }

        // 1. 切分拼音
        let segments = pinyin::split_pinyin(input_pinyin);
        let n = segments.len();
        
        // dp[i] 存储到达第 i 个边界时的 (累积最高分, 完整句子文本)
        // 边界: 0 [wo] 1 [ai] 2 [bei] 3 [jing] 4
        let mut dp: Vec<Option<(f64, String)>> = vec![None; n + 1];
        dp[0] = Some((0.0, String::new()));

        // 2. 动态规划
        for i in 0..n {
            // 如果点 i 不可达，则跳过
            if dp[i].is_none() { continue; }
            let (current_score, current_text) = dp[i].clone().unwrap();

            // 尝试从 i 跳到 j (最多向后看 4 个拼音，因为很少有词超过 4 个字)
            for len in 1..=4 {
                let j = i + len;
                if j > n { break; }

                // 拼接拼音片段，例如 ["tian", "an", "men"] -> "tiananmen"
                let pinyin_segment = segments[i..j].join("");
                
                // 在 Trie 中查找完全匹配该拼音的词
                let candidates = self.trie.exact_match(&pinyin_segment);

                if !candidates.is_empty() {
                    // 贪心策略：只取该拼音下权重最高的那一个词来构建路径
                    // (如果要标准的 Viterbi，应该保留所有候选作为下一层的状态，但这会使状态空间爆炸)
                    // (Beam Search 是一种折中，这里我们用 Top-1 Beam)
                    let best_cand = &candidates[0]; // 已经是按 priority 降序
                    
                    // 简单的评分逻辑: 
                    // 基础分 = priority
                    // 长度奖励 = 字符数 * 1000 (倾向于长词)
                    let word_len = best_cand.text.chars().count();
                    let len_bonus = (word_len as f64) * 2000.0; 
                    
                    // 防止 priority 为负数或过小影响计算，这里假设 priority 都是正数或加上 offset
                    let new_score = current_score + (best_cand.priority as f64) + len_bonus;

                    // 更新 dp[j]
                    if let Some((existing_score, _)) = dp[j] {
                        if new_score > existing_score {
                            dp[j] = Some((new_score, current_text.clone() + &best_cand.text));
                        }
                    } else {
                        dp[j] = Some((new_score, current_text.clone() + &best_cand.text));
                    }
                }
            }
        }

        // 3. 收集结果
        // 我们不仅返回整句，也可以顺便返回分段的结果作为备选？
        // 目前只返回一个“最佳整句”包装在 list 里，为了配合 UI 显示
        if let Some((_, best_sentence)) = &dp[n] {
            // 构造一个 Candidate 格式的 JSON
            let result = vec![trie::Candidate {
                text: best_sentence.clone(),
                desc: "✨ 智能整句".to_string(),
                priority: 999999, // 置顶
            }];
            return serde_json::to_string(&result).unwrap_or("[]".to_string());
        }

        // 如果算法失败（路径断裂），回退到返回空
        "[]".to_string()
    }

    pub fn ping(&self) -> String {
        "Pong from Rust!".to_string()
    }
}
