let currentState = InputState.NORMAL;
let buffer = "", committed = "", enFilter = "";
let combinedCandidates = [], pageIndex = 0;
let currentProcessedSegment = "";
let currentPrecedingBuffer = "";
let savedRange = null;

function setState(newState) {
    currentState = newState;
    updateFocus();
}

function updateFocus() {
    const hInput = document.getElementById("hidden-input");
    if (hInput && document.activeElement !== hInput) hInput.focus();
}

function saveSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (outputArea.contains(range.commonAncestorContainer)) {
            savedRange = range.cloneRange();
        }
    }
}

function restoreSelection() {
    const selection = window.getSelection();
    if (savedRange) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
    } else {
        const range = document.createRange();
        range.selectNodeContents(outputArea);
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
    if (currentState === InputState.TAB) {
        bufferDisplay.innerHTML = `<span style="color: var(--text-sec);">TAB: </span>${escapeHtml(buffer)}${enFilter ? ` <span style="color: #ff9500;">[${escapeHtml(enFilter)}]</span>` : ""}`;
    } else if (buffer) {
        bufferDisplay.innerHTML = escapeHtml(precedingBuffer) + `<span class="active-buffer-segment">${escapeHtml(activeSegment)}</span>`;
    } else {
        bufferDisplay.innerHTML = `<span style="color: var(--text-sec); font-size: 12px;">直接点击文字编辑 | 输入拼音开始</span>`;
    }
    
    // 只有在 buffer 为空时才显示虚拟光标，且不进行昂贵的选区恢复
    updateFakeCaret();
}

function updateFakeCaret() {
    const existingCaret = outputArea.querySelector(".fake-caret");
    if (existingCaret) existingCaret.remove();
    
    if (!buffer && document.activeElement === document.getElementById("hidden-input")) {
        const caret = document.createElement("span");
        caret.className = "fake-caret";
        caret.contentEditable = false;
        
        // 简化：直接插入到当前选区或末尾，不强制 restoreSelection
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            try {
                const range = selection.getRangeAt(0);
                if (outputArea.contains(range.commonAncestorContainer)) {
                    range.insertNode(caret);
                } else { outputArea.appendChild(caret); }
            } catch(e) { outputArea.appendChild(caret); }
        } else { outputArea.appendChild(caret); }
    }
}

function lookupCandidates(activeSegment) {
    if (!activeSegment) return [];
    const b_segment_for_lookup = activeSegment.toLowerCase();
    const isAllVowels = /^[aeiou]+$/.test(b_segment_for_lookup);
    let useExactMatch = (b_segment_for_lookup.length <= 1) || ((b_segment_for_lookup.length === 3 || b_segment_for_lookup.length === 4) && isAllVowels);
    
    const prefixNode = DB.getNode(b_segment_for_lookup);
    if (!prefixNode) return [];

    let list = [];
    let count = 0;
    const MAX_COLLECT = 200; // 限制检索数量，防止卡顿

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
        if (!useExactMatch) {
            for (const char in node.children) { collect(node.children[char], path + char); }
        }
    };
    collect(prefixNode, b_segment_for_lookup);
    return list;
}

function update() {
    if (currentState === InputState.PRACTICE) return;
    const { activeSegment, precedingBuffer } = getActiveSegment(buffer);
    currentProcessedSegment = activeSegment;
    currentPrecedingBuffer = precedingBuffer;
    updateBufferDisplay(buffer, activeSegment, precedingBuffer);
    
    if (buffer) {
        let list = lookupCandidates(activeSegment);
        const seen = new Set();
        combinedCandidates = list.sort((a, b) => b.w - a.w).filter((x) => !seen.has(x.text) && seen.add(x.text)).slice(0, 100);
    } else { combinedCandidates = []; }
    render();
}

function render() {
    const container = document.getElementById("main-candidates");
    if (!container) return;
    container.innerHTML = "";
    
    if (buffer) {
        const pageData = combinedCandidates.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
        const row = document.createElement("div");
        row.className = "candidate-row";
        row.innerHTML = `<div class="correction-seg-label">${currentProcessedSegment}:</div>`;
        const listContainer = document.createElement("div");
        listContainer.className = "candidate-list";
        pageData.forEach((item, i) => {
            const div = document.createElement("div");
            div.className = "candidate-item" + (i === 0 ? " active" : "");
            div.innerHTML = `<span class="cand-key">${(i + 1) % 10}</span><span class="cand-text">${escapeHtml(item.text)}</span>${item.desc ? `<span class="cand-desc">${escapeHtml(item.desc)}</span>` : ""}`;
            div.onclick = (e) => { e.stopPropagation(); selectCandidate(item.text); };
            listContainer.appendChild(div);
        });
        row.appendChild(listContainer);
        container.appendChild(row);
        
        const totalPages = Math.ceil(combinedCandidates.length / pageSize);
        document.getElementById("page-counter").innerText = `${pageIndex + 1} / ${totalPages || 1}`;
    } else {
        document.getElementById("page-counter").innerText = "";
    }
}

function selectCandidate(selectedText) {
    insertAtCursor(selectedText);
    resetInput();
    update();
}

function insertAtCursor(text) {
    const existingCaret = outputArea.querySelector(".fake-caret");
    if (existingCaret) existingCaret.remove();
    
    restoreSelection();
    outputArea.focus();
    document.execCommand("insertText", false, text);
    saveSelection();
    
    setTimeout(() => focusHiddenInput(), 0);
}

function clearOutput() {
    if (outputArea) outputArea.innerHTML = "";
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
