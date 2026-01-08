let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
const hInput = document.getElementById("hidden-input");
const outputArea = document.getElementById("output-area");
const correctionInput = document.getElementById("correction-input");

async function init() {
    try {
        console.log("开始初始化输入法...");
        showLoadingMessage("正在初始化输入法...");

        if (typeof settings.outputFlexGrow === "undefined") settings.outputFlexGrow = 2;
        if (typeof settings.inputFlexGrow === "undefined") settings.inputFlexGrow = 3;
        if (typeof settings.history === "undefined") settings.history = true;

        loadDictConfig();
        await loadAllDicts();
        applySettings();
        updateHistoryUI(HISTORY);

        initEventListeners();
        setState(InputState.NORMAL);
        update();

        console.log("输入法初始化完成");
        hideLoadingMessage();
    } catch (error) {
        console.error("输入法初始化失败:", error);
        showErrorMessage("输入法初始化失败，请刷新页面重试");
        hideLoadingMessage();
    }
}

function applySettings() {
    const outputCard = document.getElementById("output-card");
    const inputCard = document.getElementById("input-container");
    
    // Use height for input card stability
    if (inputCard && settings.inputHeight) {
        inputCard.style.height = settings.inputHeight + "px";
    }
    
    document.getElementById("historyPanel").style.display = settings.history ? "flex" : "none";
    document.getElementById("l-hist-btn").classList.toggle("active", settings.history);
    
    // Apply theme
    const isDark = settings.theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.textContent = isDark ? '浅色模式' : '深色模式';
}

function toggleTheme() {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings();
    applySettings();
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function initEventListeners() {
    hInput.addEventListener("keydown", handleKeyDown);
    hInput.addEventListener("input", handleInput);
    correctionInput.addEventListener("keydown", handleCorrectionKeyDown);
    correctionInput.addEventListener("input", handleCorrectionInput);
    correctionInput.addEventListener("keyup", handleCorrectionInput);
    correctionInput.addEventListener("click", handleCorrectionInput);
    document.addEventListener("keydown", handleGlobalKeyDown);
    document.addEventListener("click", handleGlobalClick);
    window.addEventListener("visibilitychange", () => { if (!document.hidden) updateFocus(); });

    makeResizableV("center-v-resizer", "output-card", "input-container");
}

function focusHiddenInput() {
    if (hInput) {
        hInput.focus();
    }
}

function handleKeyDown(e) {
    if (currentState === InputState.CORRECTION) return;
    const key = e.key;

    if (e.ctrlKey && key.toLowerCase() === "i") {
        e.preventDefault();
        enterCorrectionMode();
        return;
    }

    if (currentState === InputState.PRACTICE) {
        if (key === "Enter" || key === " ") {
            e.preventDefault();
        }
        if (key === "Backspace") {
            setTimeout(() => {
                setBuffer(hInput.value);
                updatePracticeInputDisplay();
            }, 0);
        }
        // Add pagination support for directory view
        const dirView = document.getElementById("practice-directory");
        if (dirView && dirView.style.display !== "none") {
            if (key === "=") { e.preventDefault(); changeDirectoryPage(1); return; }
            if (key === "-") { e.preventDefault(); changeDirectoryPage(-1); return; }
        }
        return;
    }

    if (buffer && currentState !== InputState.TAB) {
        if (key === "=") { e.preventDefault(); if ((pageIndex + 1) * pageSize < combinedCandidates.length) { pageIndex++; render(); } return; }
        if (key === "-") { e.preventDefault(); if (pageIndex > 0) { pageIndex--; render(); } return; }
    }

    if (key === "Tab") {
        e.preventDefault();
        if (buffer) {
            setState(currentState === InputState.TAB ? InputState.NORMAL : InputState.TAB);
            enFilter = "";
            pageIndex = 0; // 修复：进入 Tab 模式重置页码
            update();
        }
        return;
    }

    if (currentState === InputState.TAB && buffer) {
        if (/^[a-zA-Z]$/.test(key)) { e.preventDefault(); enFilter += key; pageIndex = 0; update(); return; }
        if (key === "Backspace") { e.preventDefault(); if (enFilter) { enFilter = enFilter.slice(0, -1); update(); } else { setState(InputState.NORMAL); update(); } return; }
    }

    if (/^[0-9]$/.test(key)) {
        if (buffer && combinedCandidates.length > 0) {
            const idx = key === "0" ? 9 : parseInt(key) - 1;
            const list = currentState === InputState.TAB ? combinedCandidates.filter(c => c.desc && c.desc.startsWith(enFilter)) : combinedCandidates;
            const pageData = list.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
            if (pageData[idx]) { e.preventDefault(); selectCandidate(pageData[idx].text); return; }
        }
    } else if (key === "Enter") {
        e.preventDefault();
        if (buffer) {
            if (currentProcessedSegment && combinedCandidates.length > 0) { selectCandidate(combinedCandidates[0].text); }
            else { committed += buffer; setBuffer(""); pageIndex = 0; enFilter = ""; setState(InputState.NORMAL); }
        } else { committed += "\n"; }
        update();
    } else if (key === "Backspace") {
        e.preventDefault();
        if (buffer) { buffer = buffer.slice(0, -1); hInput.value = buffer; update(); }
        else if (committed) { committed = committed.slice(0, -1); update(); }
    } else if (key === " ") {
        e.preventDefault();
        if (buffer) {
            const list = currentState === InputState.TAB ? combinedCandidates.filter(c => c.desc && c.desc.startsWith(enFilter)) : combinedCandidates;
            const pageData = list.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
            if (pageData[0]) selectCandidate(pageData[0].text);
        } else { committed += " "; update(); }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setBuffer(buffer + key);
        pageIndex = 0;
        update();
    }
}

function handleInput(event) {
    if (currentState === InputState.PRACTICE) {
        handlePracticeInput(event);
        return;
    }
    if (currentState !== InputState.TAB && currentState !== InputState.EDIT) {
        setBuffer(hInput.value);
        pageIndex = 0;
        update();
    }
}

function handleGlobalKeyDown(e) {
    const key = e.key.toLowerCase();
    if (e.key === "F2") {
        if (currentState === InputState.PRACTICE) {
            e.preventDefault();
            togglePinyinHint();
        }
        return;
    }
    if (e.ctrlKey && key === "e") { e.preventDefault(); toggleEditMode(); return; }
    if (e.ctrlKey && key === "c") {
        if (currentState !== InputState.EDIT && currentState !== InputState.CORRECTION) { e.preventDefault(); archiveAndCopy(); }
        return;
    }
    if (e.key === "Escape") {
        if (currentState === InputState.EDIT) setState(InputState.NORMAL);
        if (currentState === InputState.CORRECTION) { e.preventDefault(); exitCorrectionMode("sync_out_buffer"); }
    }
}

function handleCorrectionKeyDown(e) {
    if (e.key === "Enter") {
        if (!e.shiftKey) {
            e.preventDefault();
            exitCorrectionMode("convert_sentence");
        }
        // Shift + Enter is allowed to perform default newline action
    } else if (e.key === "Escape") {
        e.preventDefault();
        exitCorrectionMode("sync_out_buffer");
    }
}

function handleCorrectionInput() {
    updateCorrectionCandidates();
}

function handleGlobalClick(e) {
    if (currentState === InputState.EDIT && outputArea.contains(e.target)) return;
    if (currentState === InputState.CORRECTION && document.getElementById("correction-wrapper").contains(e.target)) return;
    
    // 修复：如果点击的是输入框、文本域或其他可编辑元素，不要强制夺取焦点
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
    
    focusHiddenInput();
}

function makeResizableV(resizerId, topPanelId, bottomPanelId) {
    const resizer = document.getElementById(resizerId);
    if (!resizer) return;
    const bottomPanel = document.getElementById(bottomPanelId);
    
    resizer.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = bottomPanel.offsetHeight;

        const doDrag = (ev) => {
            const deltaY = startY - ev.clientY;
            const newHeight = Math.max(150, startHeight + deltaY);
            bottomPanel.style.height = newHeight + "px";
        };

        const stopDrag = () => {
            document.removeEventListener("mousemove", doDrag);
            document.removeEventListener("mouseup", stopDrag);
            settings.inputHeight = bottomPanel.offsetHeight;
            saveSettings();
        };
        document.addEventListener("mousemove", doDrag);
        document.addEventListener("mouseup", stopDrag);
    });
}

document.addEventListener("DOMContentLoaded", init);
