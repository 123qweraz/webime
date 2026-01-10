let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");

async function init() {
    try {
        loadDictConfig();
        await loadAllDicts();
        applySettings();
        updateHistoryUI(HISTORY);
        initEventListeners();
        setState(InputState.NORMAL);
        update();
        hideLoadingMessage();
        
        // Ensure focus after everything is rendered
        window.addEventListener('load', () => setTimeout(focusHiddenInput, 100));
        setTimeout(focusHiddenInput, 100);
        setTimeout(focusHiddenInput, 500); // Back-up focus
    } catch (error) {
        showErrorMessage("初始化失败");
        hideLoadingMessage();
    }
}

function applySettings() {
    const inputCard = document.getElementById("input-container");
    if (inputCard && settings.inputHeight) inputCard.style.height = settings.inputHeight + "px";
    document.getElementById("historyPanel").style.display = settings.history ? "flex" : "none";
    document.getElementById("l-hist-btn").classList.toggle("active", settings.history);
    document.body.classList.toggle('dark-mode', settings.theme === 'dark');
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function toggleTheme() {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings();
    applySettings();
    showToast(`已切换至${settings.theme === 'dark' ? '深色' : '浅色'}模式`, "info");
}

function initEventListeners() {
    const hInput = document.getElementById("hidden-input");
    const outputArea = document.getElementById("output-area");
    if (!hInput || !outputArea) return;

    hInput.addEventListener("keydown", handleKeyDown);
    hInput.addEventListener("input", handleInput);
    
    hInput.addEventListener("focus", () => {
        const container = document.getElementById("input-container");
        if (container) container.classList.add("focused");
        const card = document.getElementById("output-card");
        if (card) card.classList.remove("focused");
    });
    
        outputArea.addEventListener("focus", () => {
            const card = document.getElementById("output-card");
            if (card) card.classList.add("focused");
            const container = document.getElementById("input-container");
            if (container) container.classList.remove("focused");
        });
        
        outputArea.addEventListener("blur", saveSelection);
    
        outputArea.addEventListener("mouseup", saveSelection);    outputArea.addEventListener("keyup", (e) => {
        saveSelection();
    });
    outputArea.addEventListener("click", (e) => {
        saveSelection();
        e.stopPropagation();
    });

    document.addEventListener("keydown", handleGlobalKeyDown);
    document.addEventListener("click", handleGlobalClick);
    window.addEventListener("visibilitychange", () => { if (!document.hidden) updateFocus(); });
}

function focusHiddenInput() {
    const hInput = document.getElementById("hidden-input");
    if (hInput && document.activeElement !== hInput) hInput.focus();
}

function handleKeyDown(e) {
    const key = e.key;
    const hInput = document.getElementById("hidden-input");
    const outputArea = document.getElementById("output-area");
    if (!hInput || !outputArea) return;

    if (currentState === InputState.PRACTICE) return;

    if (buffer) {
        if (key === "=") { e.preventDefault(); if ((pageIndex + 1) * pageSize < combinedCandidates.length) { pageIndex++; render(); } return; }
        if (key === "-") { e.preventDefault(); if (pageIndex > 0) { pageIndex--; render(); } return; }
    }

    if (key === "Tab") {
        if (buffer) {
            e.preventDefault();

            if (e.shiftKey) {
                insertAtCursor(buffer + "\t");
                resetInput();
                update();
                return;
            }

            if (currentState === InputState.EN) {
                setState(InputState.NORMAL);
            } else if (currentState === InputState.TAB_EN) {
                setState(InputState.TAB);
            } else {
                const isTabMode = currentState === InputState.TAB;
                setState(isTabMode ? InputState.TAB_EN : InputState.EN);
            }
            pageIndex = 0; update();
        }
        // If no buffer, let handleGlobalKeyDown handle focus cycling
        return;
    }

    if (key === "Shift") {
        if (buffer) {
            e.preventDefault();

            const now = Date.now();
            if ((currentState === InputState.TAB || currentState === InputState.TAB_EN) && (now - lastModeSwitchTime < 500)) {
                e.preventDefault();
                if (combinedCandidates.length > 0) {
                    const candidate = combinedCandidates[0];
                    if (candidate.desc) {
                        selectCandidate(candidate.desc);
                    } else {
                        showToast("当前候选词无英文释义", "warning");
                    }
                }
                lastModeSwitchTime = 0;
                return;
            }

            lastModeSwitchTime = now;
            if (currentState === InputState.TAB) {
                setState(InputState.NORMAL);
            } else if (currentState === InputState.TAB_EN) {
                setState(InputState.EN);
            } else if (currentState === InputState.EN) {
                setState(InputState.TAB_EN);
            } else {
                setState(InputState.TAB);
            }
            enFilter = ""; pageIndex = 0; update();
        }
        return;
    }

    if ((currentState === InputState.TAB || currentState === InputState.TAB_EN) && buffer) {
        if (/^[a-zA-Z]$/.test(key)) { e.preventDefault(); enFilter += key; pageIndex = 0; update(); return; }
        if (key === "Backspace") {
            e.preventDefault();
            if (enFilter) { enFilter = enFilter.slice(0, -1); update(); }
            else {
                if (currentState === InputState.TAB_EN) {
                    setState(InputState.EN);
                } else {
                    setState(InputState.NORMAL);
                }
                update();
            }
            return;
        }
    }

    if (/^[0-9]$/.test(key)) {
        if (buffer && combinedCandidates.length > 0) {
            const idx = key === "0" ? 9 : parseInt(key) - 1;
            if (combinedCandidates[idx]) {
                e.preventDefault();
                const isEnglishMode = currentState === InputState.EN || currentState === InputState.TAB_EN;
                if (isEnglishMode && combinedCandidates[idx].desc) {
                    selectCandidate(combinedCandidates[idx].desc);
                } else {
                    selectCandidate(combinedCandidates[idx].text);
                }
                return;
            }
        }
    } else if (key === "Enter") {
        e.preventDefault();
        if (buffer) {
            // Enter 键直接上屏原始字母 (Literal Buffer)
            insertAtCursor(buffer); 
            resetInput();
        } else { 
            insertAtCursor("\n"); 
        }
        update();
    } else if (key === "Backspace") {
        if (buffer) { e.preventDefault(); buffer = buffer.slice(0, -1); hInput.value = buffer; update(); } 
        else {
            e.preventDefault();
            restoreSelection();
            outputArea.focus();
            document.execCommand("delete", false, null);
            saveSelection();
            setTimeout(() => focusHiddenInput(), 0);
        }
    } else if (key === " ") {
        e.preventDefault();
        if (buffer) {
            if (combinedCandidates.length > 0) {
                const isEnglishMode = currentState === InputState.EN || currentState === InputState.TAB_EN;
                const candidate = combinedCandidates[0];
                if (isEnglishMode && candidate.desc) {
                    selectCandidate(candidate.desc);
                } else {
                    selectCandidate(candidate.text);
                }
            }
        } else { insertAtCursor(" "); update(); }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setBuffer(buffer + key);
        pageIndex = 0;
        update();
    }
}

function handleInput(event) {
    const hInput = document.getElementById("hidden-input");
    if (!hInput) return;
    if (currentState === InputState.PRACTICE) { handlePracticeInput(event); return; }
    setBuffer(hInput.value); pageIndex = 0; update();
}

function handleGlobalKeyDown(e) {
    const key = e.key.toLowerCase();
    const outputArea = document.getElementById("output-area");
    if (!outputArea) return;
    
    // Global Tab handler for cycling focus when not typing
    if (e.key === "Tab" && !buffer) {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement === outputArea) {
            saveSelection();
            focusHiddenInput();
        } else {
            restoreSelection();
            outputArea.focus();
        }
        return;
    }

    if (e.ctrlKey && key === "e") { e.preventDefault(); outputArea.focus(); return; }
    if (e.ctrlKey && key === "g") { e.preventDefault(); searchGoogle(); return; }
    if (e.ctrlKey && key === "c") {
        if (currentState !== InputState.EDIT) { e.preventDefault(); archiveAndCopy(); }
        return;
    }
    if (e.key === "Escape" && buffer) { resetInput(); update(); }
}

function handleGlobalClick(e) {
    const outputArea = document.getElementById("output-area");
    if (!outputArea) return;
    if (outputArea.contains(e.target) || e.target.closest(".candidate-item")) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "BUTTON" || e.target.isContentEditable) return;
    focusHiddenInput();
}

function makeResizableV(resizerId, topPanelId, bottomPanelId) {
    const resizer = document.getElementById(resizerId);
    if (!resizer) return;
    const bottomPanel = document.getElementById(bottomPanelId);
    resizer.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const startY = e.clientY, startH = bottomPanel.offsetHeight;
        const onMove = (ev) => { bottomPanel.style.height = Math.max(150, startH + (startY - ev.clientY)) + "px"; };
        const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); settings.inputHeight = bottomPanel.offsetHeight; saveSettings(); };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    });
}

document.addEventListener("DOMContentLoaded", init);
