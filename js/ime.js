let currentState = InputState.NORMAL;
let buffer = "", committed = "", enFilter = "";
let combinedCandidates = [], pageIndex = 0;
let currentProcessedSegment = "";
let currentPrecedingBuffer = "";
let savedRange = null;
let lastModeSwitchTime = 0;
let userFreq = JSON.parse(localStorage.getItem("ime_user_freq") || "{}");

function getOutputArea() {
    return document.getElementById("output-area");
}

function setState(newState) {
    currentState = newState;
    updateFocus();
}

function updateFocus() {
    const hInput = document.getElementById("hidden-input");
    // 只有在拼音 buffer 存在时，才强制夺取焦点给 IME
    if (buffer && hInput && document.activeElement !== hInput) {
        hInput.focus();
    }
}

function saveSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const area = getOutputArea();
        if (area && area.contains(range.commonAncestorContainer)) {
            savedRange = range.cloneRange();
        }
    }
}

function restoreSelection() {
    const selection = window.getSelection();
    const area = getOutputArea();
    if (!area) return;

    if (savedRange) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
    } else {
        const range = document.createRange();
        range.selectNodeContents(area);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        savedRange = range.cloneRange();
    }
}

function getActiveSegment(buffer) {
    if (!buffer) return { activeSegment: "", precedingBuffer: "" };
    if (buffer.includes(" ")) {
        const segments = buffer.split(/\s+/);
        const lastSeg = segments[segments.length - 1];
        const preceding = buffer.substring(0, buffer.length - lastSeg.length);
        return { activeSegment: lastSeg, precedingBuffer: preceding };
    }
    let lastPinyinCharIndex = -1;
    for (let i = buffer.length - 1; i >= 0; i--) {
        if (/[a-zA-Z']/.test(buffer[i])) { lastPinyinCharIndex = i; } else { break; }
    }
    if (lastPinyinCharIndex !== -1) {
        let firstPinyinCharIndex = lastPinyinCharIndex;
        for (let i = lastPinyinCharIndex - 1; i >= 0; i--) {
            if (/[a-zA-Z']/.test(buffer[i])) { firstPinyinCharIndex = i; } else { break; }
        }
        return { activeSegment: buffer.substring(firstPinyinCharIndex), precedingBuffer: buffer.substring(0, firstPinyinCharIndex) };
    }
    return { activeSegment: buffer.slice(-1), precedingBuffer: buffer.slice(0, -1) };
}

function updateBufferDisplay(buffer, activeSegment, precedingBuffer) {
    const bufferDisplay = document.getElementById("buffer-display");
    if (!bufferDisplay) return;
    if (currentState === InputState.EN) {
        bufferDisplay.innerHTML = `<span style="color: var(--text-sec);">EN: </span>${escapeHtml(buffer)}${enFilter ? ` <span style="color: #ff9500;">[${escapeHtml(enFilter)}]</span>` : ""}`;
    } else if (currentState === InputState.TAB_EN) {
        bufferDisplay.innerHTML = `<span style="color: var(--text-sec);">TAB+EN: </span>${escapeHtml(buffer)}${enFilter ? ` <span style="color: #ff9500;">[${escapeHtml(enFilter)}]</span>` : ""}`;
    } else if (currentState === InputState.TAB) {
        bufferDisplay.innerHTML = `<span style="color: var(--text-sec);">TAB: </span>${escapeHtml(buffer)}${enFilter ? ` <span style="color: #ff9500;">[${escapeHtml(enFilter)}]</span>` : ""}`;
    } else if (buffer) {
        bufferDisplay.innerHTML = escapeHtml(precedingBuffer) + `<span class="active-buffer-segment">${escapeHtml(activeSegment)}</span>`;
    } else {
        bufferDisplay.innerHTML = `<span style="color: var(--text-sec); font-size: 12px;">直接点击文字编辑 | 输入拼音开始</span>`;
    }
}

function lookupCandidates(activeSegment) {
    if (!activeSegment) return [];
    
    // Fuzzy expansion
    let segmentVariants = [activeSegment.toLowerCase()];
    if (typeof settings !== 'undefined' && settings.fuzzy) {
        segmentVariants = expandFuzzy(activeSegment.toLowerCase());
    }

    let list = [];
    let count = 0;
    const MAX_COLLECT = 500;
    const originalSegment = activeSegment.toLowerCase();
    
    const isDynamic = typeof settings !== 'undefined' && settings.dynamicFreq;

    for (const variant of segmentVariants) {
        const isExactVariant = (variant === originalSegment);
        
        // Relax exact match requirement for English (or mixed) input
        const b_segment_for_lookup = variant;
        const isAllVowels = /^[aeiou]+$/.test(b_segment_for_lookup);
        let useExactMatch = (b_segment_for_lookup.length <= 1) || ((b_segment_for_lookup.length === 3 || b_segment_for_lookup.length === 4) && isAllVowels);
        
        // --- Rust Engine Hook ---
        if (window.RustEngine && window.isRustReady) {
            try {
                // 1. 常规前缀搜索
                const jsonStr = window.RustEngine.search(b_segment_for_lookup);
                const rustCandidates = JSON.parse(jsonStr);
                
                if (rustCandidates && rustCandidates.length > 0) {
                    let baseW = (variant === originalSegment) ? 10000 : 1000;
                    if (!isExactVariant) baseW -= 500;
                    
                    rustCandidates.forEach(c => {
                         let w = baseW + (c.priority || 0);
                                                  if (isDynamic) {
                                                                                   const key = originalSegment + "_" + c.text;
                                                                                   const freq = userFreq[key] || 0;
                                                                                   if (freq > 0) {
                                                                                       // Logarithmic boost
                                                                                       w += Math.log2(freq + 1) * 200;
                                                                                   }
                                                                               }                                                  
                                                  list.push({ text: c.text, desc: c.desc || "", w: w });
                                                  count++;
                                             });
                }

                // 2. 智能整句/长句搜索 (HMM/Viterbi)
                // 只有当 buffer 比较长时才触发，避免单字输入时的干扰
                // 且只针对原始输入 (originalSegment)
                if (originalSegment.length > 4) {
                    const sentenceJson = window.RustEngine.search_sentence(originalSegment);
                    const sentenceCandidates = JSON.parse(sentenceJson);
                    if (sentenceCandidates && sentenceCandidates.length > 0) {
                        // 这是一个经过算法计算出的“最佳整句”
                        // 我们赋予它极高的权重，使其排在第一位
                        // 并添加一个特殊的标记（如 emoji 或样式）让用户知道这是智能联想
                        sentenceCandidates.forEach(c => {
                            list.push({ 
                                text: c.text, 
                                desc: "✨ 智能整句", // 添加描述
                                w: 9999999 // 超级权重
                            });
                        });
                    }
                }
                
                if (rustCandidates && rustCandidates.length > 0) {
                    // Rust 模式下，如果找到了结果，通常我们就用 Rust 的结果了
                    // 但为了保险，还是让它流下去被去重逻辑处理
                }
            } catch (e) {
                console.error("Rust search error:", e);
            }
        }
        // ------------------------

        const prefixNode = DB.getNode(b_segment_for_lookup);
        if (!prefixNode) continue;
        
        const collect = (node, path) => {
            if (count > MAX_COLLECT) return;
            if (useExactMatch && path !== b_segment_for_lookup) return; 
            if (node.values.length > 0) {
                let baseW = (path === originalSegment) ? 10000 : 1000;
                // If fuzzy variant match
                if (path !== originalSegment) {
                     // Prefer exact matches of the variant (e.g. "zha" for "zha") over prefixes ("zhang" for "zha")
                     // But penalize relative to original input
                     baseW = (path === variant) ? 9000 : 900;
                }
                
                baseW -= (path.length - originalSegment.length) * 100;
                if (!isExactVariant) baseW -= 500; // Fuzzy penalty

                node.values.forEach((i) => {
                    let w = baseW + (i.priority || 0);
                    const text = i.char || i;
                    
                    if (isDynamic) {
                        // Check usage frequency
                        // Key: originalSegment + "_" + text (bind to what user actually typed)
                        // Or bind to the variant? 
                        // If I type "z", select "在" (freq++). Next time I type "z", "在" should be higher.
                        // If I type "zai", "在" matches exactly.
                        // I think binding to originalSegment is better.
                        const key = originalSegment + "_" + text;
                        const freq = userFreq[key] || 0;
                        if (freq > 0) {
                            // w += Math.min(freq * 500, 20000); // Old Linear
                            w += Math.log2(freq + 1) * 200; // New Logarithmic
                        }
                    }
                    
                    list.push({ text: text, desc: i.en || (typeof i === "object" ? i.en : ""), w: w });
                    count++;
                });
            }
            if (!useExactMatch) { for (const char in node.children) { collect(node.children[char], path + char); } }
        };
        collect(prefixNode, b_segment_for_lookup);
    }
    return list;
}

function expandFuzzy(segment) {
    if (!settings.fuzzy) return [segment];
    let variants = new Set([segment]);
    const add = (v) => variants.add(v);

    if (settings.fuzzy.z_zh) {
        Array.from(variants).forEach(v => {
            if (v.startsWith("zh")) add("z" + v.substring(2));
            else if (v.startsWith("z")) add("zh" + v.substring(1));
        });
    }

    if (settings.fuzzy.c_ch) {
        Array.from(variants).forEach(v => {
            if (v.startsWith("ch")) add("c" + v.substring(2));
            else if (v.startsWith("c")) add("ch" + v.substring(1));
        });
    }

    if (settings.fuzzy.s_sh) {
        Array.from(variants).forEach(v => {
            if (v.startsWith("sh")) add("s" + v.substring(2));
            else if (v.startsWith("s")) add("sh" + v.substring(1));
        });
    }

    if (settings.fuzzy.n_ng) {
        Array.from(variants).forEach(v => {
            if (v.endsWith("ang")) add(v.substring(0, v.length - 1));
            else if (v.endsWith("an")) add(v + "g");
            
            if (v.endsWith("eng")) add(v.substring(0, v.length - 1));
            else if (v.endsWith("en")) add(v + "g");
            
            if (v.endsWith("ing")) add(v.substring(0, v.length - 1));
            else if (v.endsWith("in")) add(v + "g");
        });
    }
    
    return Array.from(variants);
}

function update() {
    if (currentState === InputState.PRACTICE) return;
    const { activeSegment, precedingBuffer } = getActiveSegment(buffer);
    currentProcessedSegment = activeSegment;
    currentPrecedingBuffer = precedingBuffer;
    updateBufferDisplay(buffer, activeSegment, currentPrecedingBuffer);
    if (buffer) {
        let list = lookupCandidates(activeSegment);
        const seen = new Set();
        let results = list.sort((a, b) => b.w - a.w).filter((x) => !seen.has(x.text) && seen.add(x.text));

        if ((currentState === InputState.TAB || currentState === InputState.TAB_EN) && enFilter) {
            results = results.filter(i => i.desc && i.desc.toLowerCase().startsWith(enFilter.toLowerCase()));
            if (results.length === 1) {
                const autoSelectText = (currentState === InputState.TAB_EN && results[0].desc) ? results[0].desc : results[0].text;
                setTimeout(() => selectCandidate(autoSelectText), 0);
                return;
            }
        }

        if (currentState === InputState.EN || currentState === InputState.TAB_EN) {
            results = results.sort((a, b) => {
                const aHasEn = a.desc && a.desc.trim() !== "";
                const bHasEn = b.desc && b.desc.trim() !== "";
                if (aHasEn && !bHasEn) return -1;
                if (!aHasEn && bHasEn) return 1;
                return b.w - a.w;
            });
        }

        combinedCandidates = results.slice(0, 100);
    } else { combinedCandidates = []; }
    render();
}

function render() {
    const container = document.getElementById("main-candidates");
    const inputCard = document.getElementById("input-container");
    if (!container || !inputCard) return;
    container.innerHTML = "";
    if (currentState === InputState.TAB || currentState === InputState.TAB_EN) { inputCard.classList.add("tab-mode"); }
    else { inputCard.classList.remove("tab-mode"); }
    if (buffer) {
        const pageData = combinedCandidates.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
        const row = document.createElement("div");
        row.className = "candidate-row";
        const listContainer = document.createElement("div");
        listContainer.className = "candidate-list";
        pageData.forEach((item, i) => {
            const div = document.createElement("div");
            div.className = "candidate-item" + (i === 0 ? " active" : "");
            const isEnglishMode = currentState === InputState.EN || currentState === InputState.TAB_EN;
            if (isEnglishMode && item.desc) {
                div.innerHTML = `<span class="cand-key">${(i + 1) % 10}</span><span class="cand-text">${escapeHtml(item.desc)}</span><span class="cand-desc">${escapeHtml(item.text)}</span>`;
            } else {
                div.innerHTML = `<span class="cand-key">${(i + 1) % 10}</span><span class="cand-text">${escapeHtml(item.text)}</span>${item.desc ? `<span class="cand-desc">${escapeHtml(item.desc)}</span>` : ""}`;
            }
            const isEnglishModeClick = currentState === InputState.EN || currentState === InputState.TAB_EN;
            if (isEnglishModeClick && item.desc) {
                div.onclick = (e) => { e.stopPropagation(); selectCandidate(item.desc); };
            } else {
                div.onclick = (e) => { e.stopPropagation(); selectCandidate(item.text); };
            }
            listContainer.appendChild(div);
        });
        row.appendChild(listContainer);
        container.appendChild(row);
        const totalPages = Math.ceil(combinedCandidates.length / pageSize);
        const counter = document.getElementById("page-counter");
        if (counter) counter.innerText = `${pageIndex + 1} / ${totalPages || 1}`;
    } else {
        const counter = document.getElementById("page-counter");
        if (counter) counter.innerText = "";
    }
}

function selectCandidate(selectedText) {
    if (typeof settings !== 'undefined' && settings.dynamicFreq) {
        const key = currentProcessedSegment.toLowerCase() + "_" + selectedText;
        userFreq[key] = (userFreq[key] || 0) + 1;
        localStorage.setItem("ime_user_freq", JSON.stringify(userFreq));
    }

    const isEnglishMode = currentState === InputState.EN || currentState === InputState.TAB_EN;
    insertAtCursor(selectedText + (isEnglishMode ? " " : ""));
    resetInput();
    update();
}

function selectCandidateEnglish() {
    if (combinedCandidates.length > 0) {
        const candidate = combinedCandidates[0];
        if (candidate.desc) {
            selectCandidate(candidate.desc);
        } else {
            showToast("当前候选词无英文释义", "warning");
        }
    }
}

function insertAtCursor(text) {
    // Intercept for Hanzi Practice Mode
    if (typeof currentState !== 'undefined' && 
        currentState === InputState.PRACTICE && 
        typeof currentPracticeMode !== 'undefined' && 
        currentPracticeMode === PRACTICE_MODE.HANZI) {
        
        if (typeof window.checkHanziMatch === 'function') {
            window.checkHanziMatch(text.trim()); // Trim because English mode appends space, standard mode might not but good safety
        }
        resetInput();
        update(); 
        return;
    }

    const area = getOutputArea();
    if (!area) return;
    restoreSelection();
    area.focus();
    document.execCommand("insertText", false, text);
    saveSelection();
    setTimeout(() => focusHiddenInput(), 0);
}

function clearOutput() {
    const area = getOutputArea();
    if (area) area.innerHTML = "";
    resetInput();
    update();
}

function setBuffer(value) {
    buffer = value;
    const hInput = document.getElementById("hidden-input");
    if (hInput) hInput.value = value;
}

function resetInput() {
    setBuffer("");
    currentPrecedingBuffer = "";
    currentProcessedSegment = "";
    enFilter = "";
    setState(InputState.NORMAL);
    pageIndex = 0;
}
