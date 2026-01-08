let practiceWords = [];
let currentPracticeWordIndex = 0;
let isPracticeAnimating = false;
let cardLeft, cardCenter, cardRight;
let practiceCards = [];
let showPinyinHint = false;
let directoryPageIndex = 0;
const directoryPageSize = 20; // 减小页大小，确保不滚动也能看到底部

function getHanziChar(hanziObject) {
    if (typeof hanziObject === 'object' && hanziObject !== null && hanziObject.char) {
        return hanziObject.char;
    }
    return hanziObject;
}

function getPracticeProgressKey() {
    const dictPath = settings.practice_dict_path || "default";
    const chapter = settings.practice_chapter || 0;
    return `${PRACTICE_PROGRESS_KEY}_${dictPath.replace(/[^a-zA-Z0-9]/g, '_')}_ch${chapter}`;
}

// Simple seeded shuffle to ensure consistency across refreshes for the same dictionary
function seededShuffle(array, seed) {
    let m = array.length, t, i;
    const random = (s) => {
        var x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    };
    
    let s = 0;
    for (let j = 0; j < seed.length; j++) {
        s += seed.charCodeAt(j);
    }

    while (m) {
        i = Math.floor(random(s++) * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
}

async function initPracticeModeData() {
    let dictPath = settings.practice_dict_path;
    
    // Find the current dictionary, ensuring it exists and is enabled
    let practiceDict = allDicts.find((d) => (d.path || d.name) === dictPath && d.enabled);
    
    // If not found or disabled, fallback to the first enabled dictionary
    if (!practiceDict) {
        practiceDict = allDicts.find(d => d.enabled && (d.wordCount > 0 || d.type === 'built-in'));
        if (practiceDict) {
            dictPath = practiceDict.path || practiceDict.name;
            settings.practice_dict_path = dictPath;
            settings.practice_chapter = 0;
            saveSettings();
        }
    }

    if (!practiceDict) {
        showErrorMessage("请先在词典设置中启用至少一个词典!");
        return false;
    }

    if (!practiceDict.fetchedContent) {
        try {
            if (practiceDict.type === 'built-in') {
                const response = await fetch(practiceDict.path);
                if (!response.ok) throw new Error(`Network response was not ok for ${practiceDict.path}`);
                practiceDict.fetchedContent = await response.json();
            } else {
                practiceDict.fetchedContent = JSON.parse(practiceDict.content);
            }
        } catch (error) {
            showErrorMessage(`加载练习词典失败: ${error.message}`);
            return false;
        }
    }

    const dictData = practiceDict.fetchedContent;
    let allWords = [];
    if (dictData) {
        for (const pinyin in dictData) {
            const pinyinData = dictData[pinyin];
            const hanziArray = Array.isArray(pinyinData) ? pinyinData : [pinyinData];
            hanziArray.forEach((hanzi) => {
                allWords.push({ pinyin, hanzi });
            });
        }
    }

    if (allWords.length === 0) {
        showErrorMessage("该词典没有可练习的内容!");
        return false;
    }

    // Sort words to ensure consistent starting state before shuffling
    allWords.sort((a, b) => a.pinyin.localeCompare(b.pinyin));
    
    // CHANGE: Shuffle instead of sort, using dictPath as seed for consistency
    seededShuffle(allWords, dictPath);

    const chapterSize = 20;
    const totalChapters = Math.ceil(allWords.length / chapterSize);
    let chapterIndex = parseInt(settings.practice_chapter, 10);
    
    // Validate chapterIndex
    if (isNaN(chapterIndex) || chapterIndex < 0 || chapterIndex >= totalChapters) {
        chapterIndex = 0;
        settings.practice_chapter = 0;
        saveSettings();
    }

    const startIdx = chapterIndex * chapterSize;
    const endIdx = Math.min(startIdx + chapterSize, allWords.length);
    
    practiceWords = allWords.slice(startIdx, endIdx);
    
    // 移除：不再向顶部工具栏注入繁杂信息，保持工具栏简洁
    const toolbar = document.getElementById("practice-toolbar-left");
    if (toolbar) {
        toolbar.style.display = "none";
        toolbar.innerHTML = "";
    }

    // practiceWords are already "random" because allWords was shuffled. 
    // But if we want to shuffle the chapter content itself *again* relative to how it was sliced?
    // Actually, seededShuffle on allWords effectively randomizes the chapter content.
    // The previous code shuffled practiceWords with `${dictPath}_${chapterIndex}`.
    // We can keep it or remove it. Removing it is simpler as long as allWords shuffle is good.
    // But let's keep it to be safe against "ordered chunks" if seededShuffle is weak.
    // Actually, if we shuffle allWords, we don't strictly need to shuffle practiceWords again, 
    // but doing so doesn't hurt.
    // Let's remove the second shuffle to avoid confusion, trusting the first one.
    // seededShuffle(practiceWords, `${dictPath}_${chapterIndex}`); 
    
    return true;
}

function handlePracticeKeyDown(e) {
    if (currentState !== InputState.PRACTICE) return;

    // F2: Toggle Pinyin Hint
    if (e.key === "F2") {
        e.preventDefault();
        togglePinyinHint();
        return;
    }

    // Directory View Shortcuts
    const dirView = document.getElementById("practice-directory");
    if (dirView && dirView.style.display !== "none") {
        if (e.key === "-" || e.key === "ArrowLeft") {
            e.preventDefault();
            changeDirectoryPage(-1);
        } else if (e.key === "=" || e.key === "ArrowRight") {
            e.preventDefault();
            changeDirectoryPage(1);
        }
    }
}

async function startPracticeMode() {
    practiceWords = []; 
    showLoadingMessage("准备练习...");
    const success = await initPracticeModeData();
    hideLoadingMessage();
    if (!success) return;

    setState(InputState.PRACTICE);
    document.addEventListener("keydown", handlePracticeKeyDown);

    document.getElementById("output-card").style.display = "none";
    document.getElementById("practice-container").style.display = "flex";
    document.getElementById("practice-footer").style.display = "flex";
    document.getElementById("toggle-pinyin-btn").style.display = "inline-flex";

    // Add Directory Button to footer if not exists
    let dirBtn = document.getElementById("back-to-dir-btn");
    if (!dirBtn) {
        const footer = document.getElementById("practice-footer");
        dirBtn = document.createElement("button");
        dirBtn.id = "back-to-dir-btn";
        dirBtn.className = "btn btn-toggle";
        dirBtn.innerHTML = "章节目录";
        dirBtn.onclick = showPracticeDirectory;
        footer.insertBefore(dirBtn, footer.firstChild);
    }
    dirBtn.style.display = "inline-flex";

    cardLeft = document.getElementById("card-left");
    cardCenter = document.getElementById("card-center");
    cardRight = document.getElementById("card-right");
    practiceCards = [cardLeft, cardCenter, cardRight];

    document.getElementById("practice-mode-btn").style.display = "none";
    document.getElementById("exit-practice-mode-btn").style.display = "flex";

    // If a chapter is already selected in settings, load cards, otherwise show directory
    if (typeof settings.practice_chapter !== 'undefined' && settings.practice_chapter !== null) {
        showChapterPractice();
    } else {
        showPracticeDirectory();
    }
}

function showPracticeDirectory() {
    const dirView = document.getElementById("practice-directory");
    const footer = document.getElementById("practice-footer");
    const cards = [cardLeft, cardCenter, cardRight];
    
    cards.forEach(c => c.style.display = "none");
    dirView.style.display = "grid";
    if (footer) footer.style.display = "none"; // 目录模式隐藏底部控制栏
    
    // Hide input container in directory view
    const inputContainer = document.getElementById("input-container");
    if (inputContainer) inputContainer.style.display = "none";

    renderDirectoryContent();
}

function renderDirectoryContent() {
    const dirView = document.getElementById("practice-directory");
    const dictPath = settings.practice_dict_path;
    const practiceDict = allDicts.find((d) => (d.path || d.name) === dictPath && d.enabled);
    
    if (!practiceDict || !practiceDict.fetchedContent) {
        dirView.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;">加载词典失败...</div>`;
        return;
    }

    // IMPORTANT: Shuffle words exactly like in initPracticeModeData
    const dictData = practiceDict.fetchedContent;
    let allWords = [];
    for (const pinyin in dictData) {
        const pinyinData = dictData[pinyin];
        const hanziArray = Array.isArray(pinyinData) ? pinyinData : [pinyinData];
        hanziArray.forEach((hanzi) => {
            allWords.push({ pinyin, hanzi });
        });
    }
    
    // Sort words first to ensure consistent starting state before shuffling
    allWords.sort((a, b) => a.pinyin.localeCompare(b.pinyin));

    // SHUFFLE instead of sort
    seededShuffle(allWords, dictPath);

    const wordCount = allWords.length;
    const chapterSize = 20;
    const totalChapters = Math.ceil(wordCount / chapterSize);
    const totalPages = Math.ceil(totalChapters / directoryPageSize);
    
    // Fix Bug: Ensure directoryPageIndex is within valid bounds
    if (totalPages > 0) {
        directoryPageIndex = Math.max(0, Math.min(directoryPageIndex, totalPages - 1));
    } else {
        directoryPageIndex = 0;
    }

    const currentChapter = parseInt(settings.practice_chapter, 10);
    // Auto-detect page index if coming from a specific chapter for the first time
    if (!isNaN(currentChapter) && currentChapter >= 0) {
        const targetPage = Math.floor(currentChapter / directoryPageSize);
        // Only jump if we are at page 0 or the current page would be empty
        if (directoryPageIndex === 0 || directoryPageIndex >= totalPages) {
            directoryPageIndex = targetPage;
        }
    }

    const startChapter = directoryPageIndex * directoryPageSize;
    const endChapter = Math.min(startChapter + directoryPageSize, totalChapters);

    const paginationHtml = `
        <div class="pagination-bar">
            <button class="btn btn-sm" onclick="changeDirectoryPage(-1)" ${directoryPageIndex === 0 ? 'disabled' : ''}>上一页 (-)</button>
            <div class="pagination-center">
                <span class="page-text">第 ${directoryPageIndex + 1} / ${totalPages} 页</span>
                <div class="page-jump-group">
                    <input type="number" class="page-jump-input" min="1" max="${totalPages}" placeholder="Go" 
                        onkeydown="if(event.key==='Enter') jumpToDirectoryPage(this.value)">
                    <button class="btn btn-sm btn-action" onclick="jumpToDirectoryPage(this.previousElementSibling.value)">跳转</button>
                </div>
            </div>
            <button class="btn btn-sm" onclick="changeDirectoryPage(1)" ${directoryPageIndex === totalPages - 1 ? 'disabled' : ''}>下一页 (=)</button>
        </div>
    `;

    let html = `
        <div class="directory-header-v2">
            <div class="dict-info-box">
                <div class="dict-name-main">${practiceDict.name}</div>
                <div class="dict-stats-sub">
                    共 ${totalChapters} 章节 • ${wordCount} 词汇
                    ${!isNaN(currentChapter) ? ` • <span style="color:var(--primary)">当前: 第 ${currentChapter + 1} 章</span>` : ""}
                </div>
            </div>
            <button class="btn btn-sm" onclick="openSettingsSidebar()">更换词典</button>
        </div>
    `;

    for (let i = startChapter; i < endChapter; i++) {
        const isActive = i === currentChapter;
        const start = i * chapterSize + 1;
        const end = Math.min((i + 1) * chapterSize, wordCount);
        
        const progressKey = `${PRACTICE_PROGRESS_KEY}_${dictPath.replace(/[^a-zA-Z0-9]/g, '_')}_ch${i}`;
        const savedProgress = localStorage.getItem(progressKey);
        const progressPercent = savedProgress ? Math.floor((parseInt(savedProgress, 10) / (end - start + 1)) * 100) : 0;

        // Optionally show word range hint (pinyin of first and last word)
        const firstWordPy = allWords[start-1].pinyin;
        const lastWordPy = allWords[end-1].pinyin;

        html += `
            <div class="chapter-card ${isActive ? 'active' : ''}" onclick="selectChapter(${i})">
                <div class="chapter-card-main">
                    <div class="chapter-title">第 ${i + 1} 章</div>
                    <div class="chapter-info">${start} - ${end} 词</div>
                    <div class="chapter-range-hint">${firstWordPy} ... ${lastWordPy}</div>
                </div>
                ${progressPercent > 0 ? `
                    <div class="chapter-progress-tag" style="width: ${Math.min(progressPercent, 100)}%;"></div>
                    <div class="chapter-progress-text">${progressPercent}%</div>
                ` : ''}
            </div>
        `;
    }

    html += `<div style="grid-column: 1/-1; margin-top: 20px;">${paginationHtml}</div>`;

    dirView.innerHTML = html;
    // Scroll to top of directory view after page change
    dirView.scrollTop = 0;
}

function changeDirectoryPage(delta) {
    directoryPageIndex += delta;
    renderDirectoryContent();
}

function jumpToDirectoryPage(val) {
    const page = parseInt(val, 10);
    if (!isNaN(page)) {
        const dictPath = settings.practice_dict_path;
        const practiceDict = allDicts.find((d) => (d.path || d.name) === dictPath && d.enabled);
        if (practiceDict) {
            let allWordsCount = 0;
            for (const p in practiceDict.fetchedContent) {
                const data = practiceDict.fetchedContent[p];
                allWordsCount += Array.isArray(data) ? data.length : 1;
            }
            const totalPages = Math.ceil(Math.ceil(allWordsCount / 20) / directoryPageSize);
            directoryPageIndex = Math.max(0, Math.min(page - 1, totalPages - 1));
            renderDirectoryContent();
        }
    }
}

async function selectChapter(index) {
    settings.practice_chapter = index;
    saveSettings();
    showLoadingMessage("加载章节...");
    await initPracticeModeData();
    hideLoadingMessage();
    showChapterPractice();
}

function showChapterPractice() {
    document.getElementById("practice-directory").style.display = "none";
    
    // Show input container in practice view
    const inputContainer = document.getElementById("input-container");
    if (inputContainer) inputContainer.style.display = "flex";

    [cardLeft, cardCenter, cardRight].forEach(c => c.style.display = "flex");
    
    const footer = document.getElementById("practice-footer");
    if (footer) {
        footer.style.display = "flex";
        const chapterIndex = parseInt(settings.practice_chapter, 10);
        // 清空并重新构建底部控制栏，确保“第 X 章”与按钮同级
        footer.innerHTML = `
            <div class="footer-chapter-label">第 ${chapterIndex + 1} 章</div>
            <button id="back-to-dir-btn" class="btn btn-toggle" onclick="showPracticeDirectory()">章节目录</button>
            <button id="toggle-pinyin-btn" class="btn btn-toggle ${showPinyinHint ? 'active' : ''}" onclick="togglePinyinHint()">显示拼音 (F2)</button>
        `;
    }

    const progressKey = getPracticeProgressKey();
    const savedIndex = localStorage.getItem(progressKey);
    currentPracticeWordIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
    
    if (currentPracticeWordIndex >= practiceWords.length) {
        currentPracticeWordIndex = 0;
    }
    
    loadCards();
    focusHiddenInput();
}

async function restartPracticeMode() {
    // This is called when dictionary changes or user explicitly restarts
    // We want to show the directory first to let them pick a chapter
    await initPracticeModeData();
    showPracticeDirectory();
}

function exitPracticeMode() {
    isPracticeAnimating = false;
    setState(InputState.NORMAL);
    document.removeEventListener("keydown", handlePracticeKeyDown);

    document.getElementById("output-card").style.display = "flex";
    document.getElementById("practice-container").style.display = "none";
    document.getElementById("practice-footer").style.display = "none";
    document.getElementById("toggle-pinyin-btn").style.display = "none";
    
    // Restore input container visibility (just in case)
    const inputContainer = document.getElementById("input-container");
    if (inputContainer) inputContainer.style.display = "flex";

    const dirBtn = document.getElementById("back-to-dir-btn");
    if (dirBtn) dirBtn.style.display = "none";
    
    const toolbar = document.getElementById("practice-toolbar-left");
    if (toolbar) toolbar.style.display = "none";

    practiceCards.forEach((card) => {
        card.style.display = "flex"; // Reset for next time
        card.classList.remove("visible", "current", "incorrect");
        const pyDisp = card.querySelector(".pinyin-display");
        const hzDisp = card.querySelector(".hanzi-display");
        if (pyDisp) pyDisp.textContent = "";
        if (hzDisp) hzDisp.textContent = "";
    });

    document.getElementById("practice-mode-btn").style.display = "flex";
    document.getElementById("exit-practice-mode-btn").style.display = "none";
}

function togglePinyinHint() {
    showPinyinHint = !showPinyinHint;
    const btn = document.getElementById("toggle-pinyin-btn");
    if (btn) btn.classList.toggle("active", showPinyinHint);
    updatePracticeInputDisplay();
}

function loadCards() {
    practiceCards.forEach((card) => {
        card.classList.remove("visible", "current", "incorrect");
        const pyDisp = card.querySelector(".pinyin-display");
        const hzDisp = card.querySelector(".hanzi-display");
        if (pyDisp) pyDisp.textContent = "";
        if (hzDisp) hzDisp.textContent = "";
    });

    if (currentPracticeWordIndex < practiceWords.length) {
        const word = practiceWords[currentPracticeWordIndex];
        cardCenter.querySelector(".hanzi-display").textContent = getHanziChar(word.hanzi);
        updatePracticeInputDisplay(); 
        cardCenter.classList.add("visible", "current");
    } else {
        // Should not happen if check is done before calling loadCards, but safe guard
        showNextPracticeWord();
        return;
    }

    // Next word on the LEFT (Preview)
    if (currentPracticeWordIndex + 1 < practiceWords.length) {
        const nextWord = practiceWords[currentPracticeWordIndex + 1];
        cardLeft.querySelector(".hanzi-display").textContent = getHanziChar(nextWord.hanzi);
        cardLeft.classList.add("visible");
    }

    // Completed word on the RIGHT (History)
    if (currentPracticeWordIndex - 1 >= 0) {
        const prevWord = practiceWords[currentPracticeWordIndex - 1];
        cardRight.querySelector(".hanzi-display").textContent = getHanziChar(prevWord.hanzi);
        cardRight.querySelector(".pinyin-display").textContent = prevWord.pinyin;
        cardRight.classList.add("visible");
    }
}

function showNextPracticeWord() {
    if (currentPracticeWordIndex >= practiceWords.length) {
        // Chapter Complete
        localStorage.removeItem(getPracticeProgressKey());
        
        // Hide other cards
        cardLeft.style.display = "none";
        cardRight.style.display = "none";
        
        // Show completion on center card
        cardCenter.classList.add("visible", "current");
        cardCenter.classList.remove("incorrect");
        
        const pyDisp = cardCenter.querySelector(".pinyin-display");
        const hzDisp = cardCenter.querySelector(".hanzi-display");
        
        if (pyDisp) pyDisp.innerHTML = "";
        if (hzDisp) {
            hzDisp.innerHTML = `
                <div style="font-size: 24px; margin-bottom: 20px;">🎉 章节完成!</div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-action" onclick="loadNextChapter()">下一章</button>
                    <button class="btn" onclick="retryChapter()">重练</button>
                    <button class="btn" onclick="showPracticeDirectory()">返回</button>
                </div>
            `;
        }
        return;
    }
    loadCards();
    focusHiddenInput();
}

async function loadNextChapter() {
    const currentChapter = parseInt(settings.practice_chapter, 10);
    settings.practice_chapter = currentChapter + 1;
    saveSettings();
    showLoadingMessage("加载下一章...");
    await initPracticeModeData();
    hideLoadingMessage();
    showChapterPractice();
}

async function retryChapter() {
    const progressKey = getPracticeProgressKey();
    localStorage.removeItem(progressKey);
    currentPracticeWordIndex = 0;
    
    // Re-shuffle? The user might want the same words if they are retrying.
    // But initPracticeModeData uses deterministic shuffle based on dictPath_chapterIndex.
    // So re-calling it will give same order.
    
    // However, if we want to "Retry", we probably just want to reset index.
    // We don't need to reload data if it's the same chapter.
    // But to be safe and ensure clean state:
    loadCards();
    focusHiddenInput();
}

function updatePracticeInputDisplay() {
    if (currentState !== InputState.PRACTICE) return;

    const currentWord = practiceWords[currentPracticeWordIndex];
    if (!currentWord) return;

    const targetPinyin = currentWord.pinyin.toLowerCase();
    const typedPinyin = buffer.toLowerCase();

    if (cardCenter) {
        const cardPinyinDisplay = cardCenter.querySelector(".pinyin-display");
        if (cardPinyinDisplay) {
            let cardHTML = "";
            for (let i = 0; i < targetPinyin.length; i++) {
                const char = targetPinyin[i];
                if (i < typedPinyin.length) {
                    if (typedPinyin[i] === char) {
                        cardHTML += `<span class="char-correct">${char}</span>`;
                    } else {
                        cardHTML += `<span class="char-incorrect">${typedPinyin[i]}</span>`;
                    }
                } else {
                    const placeholder = showPinyinHint ? char : "_"; 
                    cardHTML += `<span class="char-placeholder">${placeholder}</span>`;
                }
            }
            cardPinyinDisplay.innerHTML = cardHTML;
        }
    }
}

function handlePracticeInput(event) {
    if (currentState !== InputState.PRACTICE) return;
    
    // 修改：允许单引号，支持 xi'an 等拼音
    const val = event.target.value.replace(/[^a-zA-Z']/g, "");
    setBuffer(val);
    updatePracticeInputDisplay();

    const currentWord = practiceWords[currentPracticeWordIndex];
    if (!currentWord) return;
    
    const targetPinyin = currentWord.pinyin.toLowerCase();
    const typedPinyin = buffer.toLowerCase();

    if (typedPinyin && !targetPinyin.startsWith(typedPinyin)) {
        cardCenter.classList.remove("incorrect"); 
        void cardCenter.offsetWidth; 
        cardCenter.classList.add("incorrect");
    } else { 
        cardCenter.classList.remove("incorrect"); 
    }

    if (typedPinyin === targetPinyin && !isPracticeAnimating) {
        isPracticeAnimating = true;
        
        // Clear buffer IMMEDIATELY to prevent leak to next card
        setBuffer("");
        const hInput = document.getElementById("hidden-input");
        if (hInput) hInput.value = "";
        
        // Clear current card's pinyin display immediately
        if (cardCenter) {
            const cardPinyinDisplay = cardCenter.querySelector(".pinyin-display");
            if (cardPinyinDisplay) cardPinyinDisplay.innerHTML = "";
        }

        currentPracticeWordIndex++;
        localStorage.setItem(getPracticeProgressKey(), currentPracticeWordIndex);
        
        setTimeout(() => { 
            showNextPracticeWord(); 
            isPracticeAnimating = false;
        }, 150);
    }
}
