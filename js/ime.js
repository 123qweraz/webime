let currentState = InputState.NORMAL;
let buffer = "", committed = "", enFilter = "";
let combinedCandidates = [], pageIndex = 0;
let currentProcessedSegment = "";
let currentPrecedingBuffer = "";
let savedRange = null;
let lastModeSwitchTime = 0;

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
    const b_segment_for_lookup = activeSegment.toLowerCase();
    const isAllVowels = /^[aeiou]+$/.test(b_segment_for_lookup);
    // Relax exact match requirement for English (or mixed) input
    // If length > 1 and not purely vowels, we allow prefix matching to find longer English words
    // But for short segments (length 1), we still prefer exact match to avoid noise?
    // Actually, for "a", we want "a" -> "一个".
    // If we type "a", and have "apple" -> "苹果".
    // If exact match is required for "a", we only get "一个".
    // If we type "ap", length 2.
    // If "ap" is not all vowels, useExactMatch = false.
    // So "ap" will find "apple".
    
    // The previous logic:
    // let useExactMatch = (b_segment_for_lookup.length <= 1) || ((b_segment_for_lookup.length === 3 || b_segment_for_lookup.length === 4) && isAllVowels);
    
    // "ok" -> length 2. isAllVowels=false. useExactMatch=false. Should work.
    // "a" -> length 1. useExactMatch=true.
    
    // Maybe the user wants "apple" to show up when typing "a"?
    // If useExactMatch is true for "a", it WON'T show descendants like "apple".
    // This suppresses "apple" candidate when typing "a".
    // This is probably desired for Pinyin (don't show "ai", "an", "ang" when typing "a").
    
    // But for English, typing "a" should probably show "apple"?
    // If I enable English, maybe I want prefix matching even for short words?
    // But that would flood the candidates with every English word starting with "a".
    
    // I will keep the logic as is for now, assuming "wufa qiyong" is about not loading.
    
    let useExactMatch = (b_segment_for_lookup.length <= 1) || ((b_segment_for_lookup.length === 3 || b_segment_for_lookup.length === 4) && isAllVowels);
    const prefixNode = DB.getNode(b_segment_for_lookup);
    if (!prefixNode) return [];
    let list = [];
    let count = 0;
    const MAX_COLLECT = 200;
    const collect = (node, path) => {
        if (count > MAX_COLLECT) return;
        if (useExactMatch && path !== b_segment_for_lookup) return; 
        if (node.values.length > 0) {
            let baseW = (path === b_segment_for_lookup) ? 10000 : 1000;
            baseW -= (path.length - b_segment_for_lookup.length) * 100;
            node.values.forEach((i) => {
                list.push({ text: i.char || i, desc: i.en || (typeof i === "object" ? i.en : ""), w: baseW + (i.priority || 0) });
                count++;
            });
        }
        if (!useExactMatch) { for (const char in node.children) { collect(node.children[char], path + char); } }
    };
    collect(prefixNode, b_segment_for_lookup);
    return list;
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
