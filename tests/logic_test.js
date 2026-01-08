const fs = require('fs');

// Mock browser environment
global.localStorage = {
    getItem: () => null,
    setItem: () => null
};
global.document = {
    getElementById: () => ({ addEventListener: () => {}, appendChild: () => {}, innerHTML: "" }),
    addEventListener: () => {}
};
global.window = { addEventListener: () => {} };

// Minimal Trie implementation for testing based on trie.js
class MockTrie {
    constructor() {
        this.root = { children: {}, values: [] };
    }
    insert(key, value) {
        let node = this.root;
        for (const char of key) {
            if (!node.children[char]) node.children[char] = { children: {}, values: [] };
            node = node.children[char];
        }
        node.values.push(value);
    }
    getNode(key) {
        let node = this.root;
        for (const char of key) {
            if (!node.children[char]) return null;
            node = node.children[char];
        }
        return node;
    }
}

const DB = new MockTrie();
DB.insert("nihao", "你好");
DB.insert("ni", "你");
DB.insert("hao", "好");

function lookupCandidates(activeSegment) {
    if (!activeSegment) return [];
    const b_segment_for_lookup = activeSegment.toLowerCase();
    const prefixNode = DB.getNode(b_segment_for_lookup);
    let list = [];
    if (prefixNode) {
        const collect = (node, path) => {
            if (node.values.length > 0) {
                let weight = 1000;
                if (path === b_segment_for_lookup) weight += 10000;
                node.values.forEach((i) => list.push({ text: i, w: weight }));
            }
            for (const char in node.children) {
                collect(node.children[char], path + char);
            }
        };
        collect(prefixNode, b_segment_for_lookup);
    }
    return list;
}

// Test Cases Execution
console.log("Running TC-IME-01: Basic Pinyin Input...");
const res1 = lookupCandidates("nihao");
console.log("Results for 'nihao':", res1);
if (res1.some(r => r.text === "你好")) {
    console.log("TC-IME-01 PASSED");
} else {
    console.log("TC-IME-01 FAILED");
}

console.log("\nRunning TC-EDGE-01: No Match...");
const res2 = lookupCandidates("xyz");
console.log("Results for 'xyz':", res2);
if (res2.length === 0) {
    console.log("TC-EDGE-01 PASSED");
} else {
    console.log("TC-EDGE-01 FAILED");
}

console.log("\nRunning TC-IME-02: Prefix Match...");
const res3 = lookupCandidates("ni");
console.log("Results for 'ni':", res3);
if (res3.some(r => r.text === "你") && res3.some(r => r.text === "你好")) {
    console.log("TC-IME-02 PASSED");
} else {
    console.log("TC-IME-02 FAILED");
}
