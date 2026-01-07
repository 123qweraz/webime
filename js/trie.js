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

    const loadPromises = allDicts
        .filter((d) => d.enabled)
        .map((dict) => {
            return new Promise(async (resolve) => {
                try {
                    let dictData;
                    if (dict.type === "built-in") {
                        const response = await fetch(dict.path);
                        if (!response.ok) {
                            console.error(`无法加载内置词典 ${dict.name}: ${response.status}`);
                            return resolve();
                        }
                        dictData = await response.json();
                        dict.fetchedContent = dictData;
                    } else if (dict.type === "user" && dict.content) {
                        dictData = JSON.parse(dict.content);
                    }

                    if (dictData) {
                        let currentWordCount = 0;
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
                            DB.insert(processedKey, items);
                            currentWordCount += items.length;
                        }
                        dict.wordCount = currentWordCount;
                    }
                } catch (e) {
                    console.error("Failed to load or parse dict:", dict.name, e);
                }
                resolve();
            });
        });
    await Promise.all(loadPromises);
    console.log("所有启用的词典加载完成。");
}
