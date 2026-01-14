class Trie {
    constructor() {
        this.root = { children: {}, values: [] };
    }

    insert(key, value) {
        let node = this.root;
        for (const char of key) {
            if (!node.children[char]) {
                node.children[char] = { children: {}, values: [] };
            }
            node = node.children[char];
        }
        const items = Array.isArray(value) ? value : [value];
        node.values.push(...items);
    }

    getNode(prefix) {
        let node = this.root;
        for (const char of prefix) {
            if (!node.children[char]) return null;
            node = node.children[char];
        }
        return node;
    }
}

let DB = new Trie();
let PUNCTUATION_KEYS = new Set();

async function loadAllDicts() {
    DB = new Trie();
    PUNCTUATION_KEYS = new Set();
    console.log("加载词典中...");

    // Filter enabled dicts
    const enabledDicts = allDicts.filter((d) => d.enabled);
    
    // CHANGE: Sort enabledDicts by priority (descending) so high priority dicts are inserted LAST? 
    // Wait, DB.insert pushes to values. 
    // If multiple dicts have the same key, values are accumulated.
    // The order of candidates depends on the order of values in the array.
    // If we want high priority first, we should insert them first? 
    // Or we sort the values later?
    // Let's check how candidates are retrieved.
    
    // Sort dicts by priority DESCENDING (100 -> 10)
    enabledDicts.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Load dictionaries sequentially
    for (const dict of enabledDicts) {
        try {
            let dictData;
            if (dict.type === "built-in") {
                const response = await fetch(dict.path);
                if (!response.ok) {
                    const msg = `无法加载内置词典 ${dict.name}: ${response.status}`;
                    console.error(msg);
                    if (typeof showToast === 'function') showToast(msg, "error");
                    continue;
                }
                dictData = await response.json();
                dict.fetchedContent = dictData;
            } else if (dict.type === "user" && dict.content) {
                dictData = JSON.parse(dict.content);
            }

            if (dictData) {
                let currentWordCount = 0;
                const priority = dict.priority || 0;
                for (const k in dictData) {
                    let processedKey = k;
                    if (dict.name !== "标点符号") {
                        processedKey = k.toLowerCase();
                    } else {
                        PUNCTUATION_KEYS.add(k);
                    }

                    const items = Array.isArray(dictData[k])
                        ? dictData[k]
                        : [dictData[k]];
                    
                    const weightedItems = items.map(item => {
                        if (typeof item === 'string') {
                            return { char: item, priority: priority };
                        } else {
                            return { ...item, priority: priority || 0 };
                        }
                    });

                    DB.insert(processedKey, weightedItems);
                    currentWordCount += weightedItems.length;
                }
                dict.wordCount = currentWordCount;
            }
        } catch (e) {
            console.error("Failed to load or parse dict:", dict.name, e);
        }
    }
    console.log("所有启用的词典加载完成。");
    
    // 尝试同步到 Rust 引擎
    if (window.isRustReady) {
        syncDictsToRust();
    }
}

// 监听 Rust 引擎就绪事件
window.addEventListener('rust-engine-ready', () => {
    console.log("监听到 Rust 引擎就绪，开始同步词典...");
    syncDictsToRust();
});

function syncDictsToRust() {
    if (!window.RustEngine) return;
    
    // 防止重复同步? 或者 Rust 端有清空机制?
    // 目前简单处理：遍历当前 enabledDicts 同步
    // 注意：这可能会导致重复插入，但 Trie 树本身是可以处理幂等的（除了权重累加）
    // TODO: 在 Rust 端添加 clear 接口
    
    const enabledDicts = typeof allDicts !== 'undefined' ? allDicts.filter(d => d.enabled) : [];
    
    let count = 0;
    const startTime = performance.now();
    
    enabledDicts.forEach(dict => {
        if (!dict.fetchedContent) return; // 还没加载内容
        const data = dict.fetchedContent;
        const priority = dict.priority || 0;
        
        for (const key in data) {
            // 跳过标点符号，或者也加入? 
            // Rust 端目前全部当做小写处理了，除了 value
            // 我们保持和 JS 一致的逻辑
            let processedKey = key;
            if (dict.name !== "标点符号") {
                processedKey = key.toLowerCase();
            }
            
            const items = Array.isArray(data[key]) ? data[key] : [data[key]];
            items.forEach(item => {
                const text = typeof item === 'string' ? item : (item.char || item.text || ""); 
                if (!text) return; // Skip invalid items
                
                const desc = (typeof item === 'object' && item.en) ? item.en : "";
                
                // 调用 WASM 接口: insert_dict(key, text, desc, priority)
                window.RustEngine.insert_dict(processedKey, text, desc, priority);
                count++;
            });
        }
    });
    
    const timeCost = (performance.now() - startTime).toFixed(2);
    console.log(`已同步 ${count} 条词语到 Rust 引擎，耗时 ${timeCost}ms`);
}
