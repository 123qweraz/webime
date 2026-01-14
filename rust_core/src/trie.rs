use serde::{Serialize, Deserialize};
use std::collections::HashMap;

// 候选词结构
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Candidate {
    pub text: String,
    pub desc: String, // 新增：存储英文释义或其他描述
    pub priority: i32,
}

// Trie 节点
struct TrieNode {
    children: HashMap<char, TrieNode>,
    values: Vec<Candidate>,
}

impl TrieNode {
    fn new() -> Self {
        TrieNode {
            children: HashMap::new(),
            values: Vec::new(),
        }
    }
}

pub struct Trie {
    root: TrieNode,
}

impl Trie {
    pub fn new() -> Self {
        Trie {
            root: TrieNode::new(),
        }
    }

    // 修改：增加 desc 参数
    pub fn insert(&mut self, key: &str, value: &str, desc: &str, priority: i32) {
        let mut node = &mut self.root;
        for c in key.chars() {
            node = node.children.entry(c).or_insert_with(TrieNode::new);
        }
        
        // 检查是否已存在（避免重复）
        // 如果 text 和 desc 都相同才算重复
        let exists = node.values.iter().any(|c| c.text == value && c.desc == desc);
        if !exists {
            node.values.push(Candidate {
                text: value.to_string(),
                desc: desc.to_string(),
                priority,
            });
            node.values.sort_by(|a, b| b.priority.cmp(&a.priority));
        }
    }

    pub fn search(&self, prefix: &str) -> Vec<Candidate> {
        let mut node = &self.root;
        for c in prefix.chars() {
            match node.children.get(&c) {
                Some(child) => node = child,
                None => return Vec::new(), 
            }
        }

        let mut results = Vec::new();
        self.collect_recursive(node, &mut results, 0);
        results.sort_by(|a, b| b.priority.cmp(&a.priority));
        if results.len() > 100 { results.truncate(100); }
        results
    }

    fn collect_recursive(&self, node: &TrieNode, results: &mut Vec<Candidate>, depth: usize) {
        if depth > 10 { return; }
        if !node.values.is_empty() { results.extend(node.values.clone()); }
        for child_node in node.children.values() {
            self.collect_recursive(child_node, results, depth + 1);
        }
    }

    pub fn exact_match(&self, pinyin: &str) -> Vec<Candidate> {
        let mut node = &self.root;
        for c in pinyin.chars() {
            match node.children.get(&c) {
                Some(child) => node = child,
                None => return Vec::new(),
            }
        }
        node.values.clone()
    }
}
