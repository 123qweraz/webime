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
    if (hInput) hInput.focus();
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
    let activeSegment = "", precedingBuffer = buffer;
    let lastPinyinCharIndex = -1;
    for (let i = buffer.length - 1; i >= 0; i--) {
        if (/[a-zA-Z']/.test(buffer[i])) { lastPinyinCharIndex = i; } else { break; }
    }
    if (lastPinyinCharIndex !== -1) {
        let firstPinyinCharIndex = lastPinyinCharIndex;
        for (let i = lastPinyinCharIndex - 1; i >= 0; i--) {
            if (/[a-zA-Z']/.test(buffer[i])) { firstPinyinCharIndex = i; } else { break; }
        }
        activeSegment = buffer.substring(firstPinyinCharIndex);
        precedingBuffer = buffer.substring(0, firstPinyinCharIndex);
    } else if (buffer.length > 0) { 
        const lastChar = buffer.slice(-1);
        if(typeof PUNCTUATION_KEYS !== 'undefined' && PUNCTUATION_KEYS.has(lastChar)) {
            activeSegment = lastChar;
            precedingBuffer = buffer.slice(0, -1);
        }
    }
    return { activeSegment, precedingBuffer };
}

function updateBufferDisplay(buffer, activeSegment, precedingBuffer) {
    const bufferDisplay = document.getElementById("buffer-display");
    if (!bufferDisplay) return;
    let bufferHTML;
    if (currentState === InputState.TAB) {
        bufferHTML = `<span style="color: var(--text-sec);">TAB 检索: </span>` + escapeHtml(buffer);
        if (enFilter) bufferHTML += ` <span style="color: #ff9500;">[${escapeHtml(enFilter)}]</span>`;
    } else if (buffer) {
        bufferHTML = escapeHtml(precedingBuffer) + `<span class="active-buffer-segment">${escapeHtml(activeSegment)}</span>`;
    } else {
        bufferHTML = `<span style="color: var(--text-sec); font-size: 12px;">直接点击上方文字可编辑 | 输入拼音开始</span>`;
    }
    bufferDisplay.innerHTML = bufferHTML;
    updateFakeCaret();
}

function updateFakeCaret() {
    const existingCaret = outputArea.querySelector(".fake-caret");
    if (existingCaret) existingCaret.remove();
    if (!buffer && document.activeElement === document.getElementById("hidden-input")) {
        const caret = document.createElement("span");
        caret.className = "fake-caret";
        caret.contentEditable = false;
        restoreSelection();
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.insertNode(caret);
        } else {
            outputArea.appendChild(caret);
        }
        const hInput = document.getElementById("hidden-input");
        if (document.activeElement !== hInput) hInput.focus();
    }
}

function lookupCandidates(activeSegment) {
    if (!activeSegment) return [];
    const b_segment_for_lookup = activeSegment.toLowerCase();
    const isAllVowels = /^[aeiou]+$/.test(b_segment_for_lookup);
    let useExactMatch = (b_segment_for_lookup.length <= 1) || ((b_segment_for_lookup.length === 3 || b_segment_for_lookup.length === 4) && isAllVowels);
    const prefixNode = DB.getNode(b_segment_for_lookup);
    let list = [];
    if (prefixNode) {
        const collect = (node, path) => {
            if (useExactMatch && path !== b_segment_for_lookup) return; 
            if (node.values.length > 0) {
                let weight = 1000;
                if (path === b_segment_for_lookup) weight += 10000; 
                weight -= (path.length - b_segment_for_lookup.length) * 100;
                node.values.forEach((i) => list.push({
                    text: i.char || i,
                    desc: i.en || (typeof i === "object" ? i.en : ""),
                    w: weight + (i.priority || 0),
                }));
            }
            if (!useExactMatch) { for (const char in node.children) { collect(node.children[char], path + char); } }
        };
        collect(prefixNode, b_segment_for_lookup);
    }
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
        combinedCandidates = list.sort((a, b) => b.w - a.w).filter((x) => !seen.has(x.text) && seen.add(x.text));
    } else { combinedCandidates = []; }
    render();
}

function render() {
    const container = document.getElementById("main-candidates");
    const inputCard = document.getElementById("input-container");
    if (!container) return;
    container.innerHTML = "";
    if (currentState === InputState.TAB) { inputCard.classList.add("tab-mode"); } else { inputCard.classList.remove("tab-mode"); }
    let display = combinedCandidates;
    if (currentState === InputState.TAB && enFilter) {
        display = combinedCandidates.filter((i) => i.desc && i.desc.toLowerCase().startsWith(enFilter.toLowerCase()));
        if (display.length === 1) { selectCandidate(display[0].text); return; }
    }
    const totalPages = Math.ceil(display.length / pageSize);
    document.getElementById("page-counter").innerText = buffer && display.length > 0 ? `${pageIndex + 1} / ${totalPages || 1}` : "";
    if (pageIndex >= totalPages && totalPages > 0) { pageIndex = totalPages - 1; }
    const pageData = display.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
    if (buffer) {
        const row = document.createElement("div");
        row.className = "candidate-row";
        const label = document.createElement("div");
        label.className = "correction-seg-label";
        label.textContent = currentProcessedSegment + ":";
        row.appendChild(label);
        const listContainer = document.createElement("div");
        listContainer.className = "candidate-list";
        pageData.forEach((item, i) => {
            const div = document.createElement("div");
            div.className = "candidate-item";
            if (i === 0) div.classList.add("active");
            div.innerHTML = `<span class="cand-key">${(i + 1) % 10}</span><span class="cand-text">${escapeHtml(item.text)}</span>${item.desc ? `<span class="cand-desc">${escapeHtml(item.desc)}</span>` : ""}`;
            div.onclick = (e) => { e.stopPropagation(); selectCandidate(item.text); };
            listContainer.appendChild(div);
        });
        row.appendChild(listContainer);
        container.appendChild(row);
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
    if (!document.execCommand("insertText", false, text)) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    saveSelection();
    committed = outputArea.innerText;
    setTimeout(() => focusHiddenInput(), 0);
}

function clearOutput() {
    committed = "";
    if (outputArea) { outputArea.innerHTML = ""; }
    resetInput();
    update();
    focusHiddenInput();
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

function enterCorrectionMode() {
    if (buffer) { if (!buffer.endsWith(" ")) setBuffer(buffer + " "); }
    update();
}

function focusOutputArea() {
    if (outputArea) { outputArea.focus(); }
}