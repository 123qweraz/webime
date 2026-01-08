let currentState = InputState.NORMAL;
let buffer = "", committed = "", enFilter = "";
let combinedCandidates = [], pageIndex = 0;
let currentProcessedSegment = "";
let currentPrecedingBuffer = "";

function setState(newState) {
    currentState = newState;
    if (outputArea) {
        if (currentState === InputState.NORMAL) {
            outputArea.classList.add("locked");
        } else {
            outputArea.classList.remove("locked");
        }
    }
    updateFocus();
}

function updateFocus() {
    if (currentState === InputState.EDIT) {
        outputArea.focus();
    } else if (currentState === InputState.CORRECTION) {
        correctionInput.focus();
    } else {
        const hInput = document.getElementById("hidden-input");
        if (hInput) hInput.focus();
    }
}

function getActiveSegment(buffer) {
    if (!buffer) return { activeSegment: "", precedingBuffer: "" };

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
        bufferHTML = escapeHtml(buffer) + "-";
        if (enFilter) {
            bufferHTML += ` <span style="color: #ff9500;">${escapeHtml(enFilter)}</span>`;
        }
    } else if (buffer) {
        bufferHTML = escapeHtml(precedingBuffer) + `<span class="active-buffer-segment">${escapeHtml(activeSegment)}</span>`;
    } else {
        bufferHTML = "";
    }
    bufferDisplay.innerHTML = bufferHTML;
}

function lookupCandidates(activeSegment) {
    if (!activeSegment) return [];
    
    const b_segment_for_lookup = activeSegment.toLowerCase();
    const isAllVowels = /^[aeiou]+$/.test(b_segment_for_lookup);
    
    let useExactMatch = false;
    if (
        b_segment_for_lookup.length <= 2 ||
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
    if (currentState === InputState.EDIT) return;

    if (outputArea && outputArea.innerText !== committed) {
        outputArea.innerText = committed;
        outputArea.scrollTop = outputArea.scrollHeight;
    }
    
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
    const pageData = display.slice(
        pageIndex * pageSize,
        (pageIndex + 1) * pageSize,
    );
    document.getElementById("main-candidates").innerHTML = pageData
        .map(
            (item, i) => `
        <div class="candidate-item" onclick="selectCandidate('${item.text}')">
            <span class="cand-key">${(i + 1) % 10}</span><div class="cand-text">${item.text}</div>
            ${item.desc ? `<div class="cand-desc">${item.desc}</div>` : ""}
        </div>`,
        )
        .join("");
}

function selectCandidate(selectedText) {
    const newBuffer = currentPrecedingBuffer + selectedText;
    committed += newBuffer;
    resetInput();
    update();
}

function resetInput() {
    setBuffer("");
    currentPrecedingBuffer = "";
    currentProcessedSegment = "";
    enFilter = "";
    setState(InputState.NORMAL);
    pageIndex = 0;
}

function setBuffer(value) {
    buffer = value;
    const hInput = document.getElementById("hidden-input");
    if (hInput) hInput.value = value;
}

function enterCorrectionMode() {
    setState(InputState.CORRECTION);
    const wrapper = document.getElementById("correction-wrapper");
    const input = document.getElementById("correction-input");
    wrapper.style.display = "block";
    input.value = buffer;
    input.focus();
    updateCorrectionCandidates();
}

function updateCorrectionCandidates() {
    const input = document.getElementById("correction-input");
    const candidatesContainer = document.getElementById("correction-candidates");
    if (!input || !candidatesContainer) return;

    const text = input.value;
    const selectionStart = input.selectionStart;
    
    const segments = [];
    const regex = /\S+/g;
    let match;
    let activeSegIndex = -1;

    while ((match = regex.exec(text)) !== null) {
        const segText = match[0];
        const start = match.index;
        const end = start + segText.length;
        
        segments.push({
            text: segText,
            start: start,
            end: end
        });

        if (selectionStart >= start && selectionStart <= end) {
            activeSegIndex = segments.length - 1;
        }
    }
    
    if (activeSegIndex === -1 && segments.length > 0 && selectionStart >= segments[segments.length-1].end) {
        activeSegIndex = segments.length - 1;
    }

    if (segments.length === 0) {
        candidatesContainer.innerHTML = "";
        return;
    }

    // Rolling Window: Show 5 segments. 
    // Only starts hiding the "front" after the active index exceeds 4.
    const displayCount = 5;
    const startDisplay = Math.max(0, activeSegIndex - (displayCount - 1));
    const displaySegments = segments.slice(startDisplay, startDisplay + displayCount);

    let html = "";
    if (startDisplay > 0) {
        html += `<div style="font-size: 10px; color: var(--text-sec); padding-left: 10px; margin-bottom: 4px;">... 已隐藏前文</div>`;
    }

    html += displaySegments.map((segObj, i) => {
        const segIndex = startDisplay + i;
        const seg = segObj.text;
        const isActiveRow = segIndex === activeSegIndex;
        
        if (!/^[a-zA-Z']+$/.test(seg)) {
            return `
                <div class="correction-candidate-row ${isActiveRow ? 'active-row' : ''}" data-seg-index="${segIndex}">
                    <span class="correction-seg-label">已选:</span>
                    <div class="correction-seg-candidates">
                        <span class="correction-cand fixed">${escapeHtml(seg)}</span>
                    </div>
                </div>
            `;
        }
        
        const candidates = lookupCandidates(seg).slice(0, 5);
        if (candidates.length === 0) {
             return `
                <div class="correction-candidate-row ${isActiveRow ? 'active-row' : ''}" data-seg-index="${segIndex}">
                    <span class="correction-seg-label">${escapeHtml(seg)}:</span>
                    <div class="correction-seg-candidates">
                        <span class="correction-cand" style="color: var(--text-sec); font-style: italic; cursor: default;">无结果</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="correction-candidate-row ${isActiveRow ? 'active-row' : ''}" data-seg-index="${segIndex}">
                <span class="correction-seg-label">${escapeHtml(seg)}:</span>
                <div class="correction-seg-candidates">
                    ${candidates.map((c, i) => `
                        <span class="correction-cand ${i === 0 ? 'active' : ''}" 
                              onclick="selectCorrectionCandidate(${segIndex}, '${c.text.replace(/'/g, "\\'")}')">
                            ${escapeHtml(c.text)}
                        </span>`).join('')}
                </div>
            </div>
        `;
    }).join("");

    if (startDisplay + displayCount < segments.length) {
        html += `<div style="font-size: 10px; color: var(--text-sec); padding-left: 10px; margin-top: 4px;">... 后面还有 ${segments.length - (startDisplay + displayCount)} 组</div>`;
    }

    candidatesContainer.innerHTML = html;
}

function selectCorrectionCandidate(segIndex, candidateText) {
    const input = document.getElementById("correction-input");
    if (!input) return;
    
    // Split by whitespace but preserve segments
    const segments = input.value.trim().split(/\s+/);
    if (segments[segIndex]) {
        segments[segIndex] = candidateText;
        input.value = segments.join(" ");
        updateCorrectionCandidates();
        input.focus();
    }
}

function exitCorrectionMode(action) {
    const wrapper = document.getElementById("correction-wrapper");
    const input = document.getElementById("correction-input");
    
    if (action === "convert_sentence") {
        const pinyinPhrase = input.value.trim();
        if (pinyinPhrase) {
            committed += convertPinyinToHanzi(pinyinPhrase);
        }
        setBuffer("");
    } else if (action === "sync_out_buffer") {
        setBuffer(input.value.trim());
        pageIndex = 0;
        setTimeout(() => update(), 0);
    }

    setState(InputState.NORMAL);
    wrapper.style.display = "none";
    update();
}

function convertPinyinToHanzi(pinyinString) {
    const lines = pinyinString.split(/\r?\n/);
    return lines.map(line => {
        const pinyinSegments = line.trim().split(/\s+/);
        let hanziResult = [];
        for (const segment of pinyinSegments) {
            if (!segment) continue;
            const node = DB.getNode(segment.toLowerCase());
            let foundHanzi = null;
            if (node && node.values.length > 0) {
                foundHanzi = node.values[0].char || node.values[0];
            }
            hanziResult.push(foundHanzi || segment);
        }
        return hanziResult.join("");
    }).join("\n");
}

function toggleEditMode() {
    const isEditing = currentState === InputState.EDIT;
    setState(isEditing ? InputState.NORMAL : InputState.EDIT);
    const outputCard = document.getElementById("output-card");
    const editBtn = document.getElementById("edit-mode-btn");
    if (isEditing) {
        outputCard.classList.remove("editing");
        outputArea.classList.add("locked");
        outputArea.contentEditable = false;
        editBtn.textContent = "锁定模式";
    } else {
        outputCard.classList.add("editing");
        outputArea.classList.remove("locked");
        outputArea.contentEditable = true;
        editBtn.textContent = "编辑模式";
    }
}
