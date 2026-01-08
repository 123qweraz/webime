let currentState = InputState.NORMAL;
let buffer = "", committed = "", enFilter = "";
let combinedCandidates = [], pageIndex = 0;
let currentProcessedSegment = "";
let currentPrecedingBuffer = "";

function setState(newState) {
    currentState = newState;
    updateFocus();
}

function updateFocus() {
    if (buffer) {
        const hInput = document.getElementById("hidden-input");
        if (hInput) hInput.focus();
    } else {
        // If no buffer, we are effectively in "edit" mode by default
        // but hidden-input still captures keys for starting a new buffer
        const hInput = document.getElementById("hidden-input");
        if (hInput) hInput.focus();
    }
}

function getActiveSegment(buffer) {
    if (!buffer) return { activeSegment: "", precedingBuffer: "" };

    // Support multi-segment (correction style) if buffer contains spaces
    if (buffer.includes(" ")) {
        const segments = buffer.split(/\s+/);
        const lastSeg = segments[segments.length - 1];
        const preceding = buffer.substring(0, buffer.length - lastSeg.length);
        return { activeSegment: lastSeg, precedingBuffer: preceding };
    }

    let activeSegment = "";
    let precedingBuffer = buffer;
    
    let lastPinyinCharIndex = -1;
    for (let i = buffer.length - 1; i >= 0; i--) {
        if (/[a-zA-Z']/.test(buffer[i])) {
            lastPinyinCharIndex = i;
        } else {
            break; 
        }
    }

    if (lastPinyinCharIndex !== -1) {
        let firstPinyinCharIndex = lastPinyinCharIndex;
        for (let i = lastPinyinCharIndex - 1; i >= 0; i--) {
            if (/[a-zA-Z']/.test(buffer[i])) {
                firstPinyinCharIndex = i;
            } else {
                break;
            }
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
        if (enFilter) {
            bufferHTML += ` <span style="color: #ff9500;">[${escapeHtml(enFilter)}]</span>`;
        }
    } else if (buffer) {
        bufferHTML = escapeHtml(precedingBuffer) + `<span class="active-buffer-segment">${escapeHtml(activeSegment)}</span>`;
    } else {
        bufferHTML = `<span style="color: var(--text-sec); font-size: 12px;">直接点击上方文字可编辑 | 输入拼音开始</span>`;
    }
    bufferDisplay.innerHTML = bufferHTML;
}

function lookupCandidates(activeSegment) {
    if (!activeSegment) return [];
    
    const b_segment_for_lookup = activeSegment.toLowerCase();
    const isAllVowels = /^[aeiou]+$/.test(b_segment_for_lookup);
    
    let useExactMatch = false;
    if (
        (b_segment_for_lookup.length <= 1) ||
        ((b_segment_for_lookup.length === 3 || b_segment_for_lookup.length === 4) && isAllVowels)
    ) {
        useExactMatch = true;
    }

    const prefixNode = DB.getNode(b_segment_for_lookup);
    let list = [];

    if (prefixNode) {
        const collect = (node, path) => {
            if (useExactMatch && path !== b_segment_for_lookup) return; 
            
            if (node.values.length > 0) {
                let weight = 1000;
                if (path === b_segment_for_lookup) weight += 10000; 
                weight -= (path.length - b_segment_for_lookup.length) * 100;
                
                node.values.forEach((i) =>
                    list.push({
                        text: i.char || i,
                        desc: i.en || (typeof i === "object" ? i.en : ""),
                        w: weight + (i.priority || 0),
                    }),
                );
            }

            if (!useExactMatch) {
                 for (const char in node.children) {
                    collect(node.children[char], path + char);
                }
            }
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
        combinedCandidates = list
            .sort((a, b) => b.w - a.w)
            .filter((x) => !seen.has(x.text) && seen.add(x.text));
    } else {
        combinedCandidates = [];
    }
    render();
}

function render() {
    const container = document.getElementById("main-candidates");
    const inputCard = document.getElementById("input-container");
    container.innerHTML = "";
    
    if (currentState === InputState.TAB) {
        inputCard.classList.add("tab-mode");
    } else {
        inputCard.classList.remove("tab-mode");
    }

    let display = combinedCandidates;
    if (currentState === InputState.TAB && enFilter) {
        display = combinedCandidates.filter(
            (i) =>
                i.desc &&
                i.desc.toLowerCase().startsWith(enFilter.toLowerCase()),
        );
        if (display.length === 1) {
            selectCandidate(display[0].text);
            return;
        }
    }

    const totalPages = Math.ceil(display.length / pageSize);
    document.getElementById("page-counter").innerText =
        buffer && display.length > 0
            ? `${pageIndex + 1} / ${totalPages || 1}`
            : "";
    
    if (pageIndex >= totalPages && totalPages > 0) {
        pageIndex = totalPages - 1;
    }

    const pageData = display.slice(
        pageIndex * pageSize,
        (pageIndex + 1) * pageSize,
    );
    
    if (buffer) {
        // Create a row-based layout even for normal input to save space and match "correction" style
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

            let innerHTML = `<span class="cand-key">${(i + 1) % 10}</span>`;
            innerHTML += `<span class="cand-text">${escapeHtml(item.text)}</span>`;
            if (item.desc) {
                innerHTML += `<span class="cand-desc">${escapeHtml(item.desc)}</span>`;
            }
            
            div.innerHTML = innerHTML;
            div.onclick = (e) => {
                e.stopPropagation();
                selectCandidate(item.text);
            };
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
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        committed += text;
        syncOutputArea();
        return;
    }

    const range = selection.getRangeAt(0);
    // Check if focus is in output-area
    if (outputArea.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        committed = outputArea.innerText;
    } else {
        committed += text;
        syncOutputArea();
    }
}

function syncOutputArea() {
    if (outputArea) {
        outputArea.innerText = committed;
        outputArea.scrollTop = outputArea.scrollHeight;
    }
}

function clearOutput() {
    committed = "";
    if (outputArea) outputArea.innerText = "";
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

// Remove the old correction functions as they are now integrated
function enterCorrectionMode() {
    // Standard buffer with spaces now behaves like correction mode
    if (buffer) {
        if (!buffer.endsWith(" ")) setBuffer(buffer + " ");
    }
    update();
}

function toggleEditMode() {
    // Output area is now always editable
    focusOutputArea();
}

function focusOutputArea() {
    if (outputArea) {
        outputArea.focus();
    }
}