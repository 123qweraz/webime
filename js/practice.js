let practiceWords = [];
let currentPracticeWordIndex = 0;
let isPracticeAnimating = false;
let cardLeft, cardCenter, cardRight;
let practiceCards = [];
let showPinyinHint = false;
let autoTTS = false;
let isBrowseMode = false; // New: Browse Mode State
let directoryPageIndex = 0;
const directoryPageSize = 20;

function getHanziChar(hanziObject) {
    if (typeof hanziObject === 'object' && hanziObject !== null && hanziObject.char) {
        return hanziObject.char;
    }
    return hanziObject;
}

// New: Get English definition
function getHanziEn(hanziObject) {
    if (typeof hanziObject === 'object' && hanziObject !== null && hanziObject.en) {
        return hanziObject.en;
    }
    return "";
}

function getPracticeProgressKey() {
    const dictPath = settings.practice_dict_path || "default";
    const chapter = settings.practice_chapter || 0;
    return `${PRACTICE_PROGRESS_KEY}_${dictPath.replace(/[^a-zA-Z0-9]/g, '_')}_ch${chapter}`;
}

function speakCurrentWord(e) {
    if (e) {
        e.stopPropagation(); 
        focusHiddenInput();
    }
    
    if (currentPracticeWordIndex >= practiceWords.length) return;
    const word = practiceWords[currentPracticeWordIndex];
    if (!word) return;

    const hanzi = getHanziChar(word.hanzi);
    const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(hanzi)}&le=zh`;
    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
        console.error("Play audio failed:", err);
        showToast("播放音频失败", "error");
    });
}

function toggleAutoTTS() {
    autoTTS = !autoTTS;
    const btn = document.getElementById("toggle-tts-btn");
    if (btn) btn.classList.toggle("active", autoTTS);
    
    if (autoTTS) {
        speakCurrentWord();
        showToast("自动朗读已开启", "info");
    } else {
        showToast("自动朗读已关闭", "info");
    }
    focusHiddenInput();
}

// New: Toggle Browse Mode
function toggleBrowseMode() {
    isBrowseMode = !isBrowseMode;
    
    const btn = document.getElementById("toggle-browse-btn");
    if (btn) btn.classList.toggle("active", isBrowseMode);
    
    // Toggle Input Container visibility
    const inputContainer = document.getElementById("input-container");
    if (inputContainer) {
        // Use opacity to preserve layout if needed, or display none. 
        // Display none is better if we want to remove distraction.
        inputContainer.style.visibility = isBrowseMode ? "hidden" : "visible";
    }

    // Reset flips when switching modes
    resetCardFlips();
    
    // If entering Browse Mode, make sure we show the current card cleanly
    // (loadCards will populate En/Hanzi fields)
    loadCards();

    showToast(isBrowseMode ? "已进入浏览模式 (Left/Right/Space/Swipe)" : "已退出浏览模式", "info");
}

function resetCardFlips() {
    practiceCards.forEach(c => {
        const content = c.querySelector(".practice-card-content");
        if (content) content.classList.remove("flipped");
    });
}

function flipCurrentCard() {
    if (!cardCenter) return;
    const content = cardCenter.querySelector(".practice-card-content");
    if (content) {
        content.classList.toggle("flipped");
    }
}

function navigateBrowse(delta) {
    if (!isBrowseMode || isPracticeAnimating) return;
    
    const nextIndex = currentPracticeWordIndex + delta;
    if (nextIndex >= 0 && nextIndex < practiceWords.length) {
        isPracticeAnimating = true;
        currentPracticeWordIndex = nextIndex;
        
        // Reset flip before moving
        resetCardFlips();
        
        // Short delay to allow flip reset visual
        // Or just move immediately? Moving immediately is snappier.
        loadCards();
        setTimeout(() => { isPracticeAnimating = false; }, 300);
        
        // Auto-speak? Maybe not in browse mode unless requested
    } else if (nextIndex >= practiceWords.length) {
         showNextPracticeWord(); // Will show completion screen
    }
}

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
    let practiceDict = allDicts.find((d) => (d.path || d.name) === dictPath && d.enabled);
    
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

    allWords.sort((a, b) => a.pinyin.localeCompare(b.pinyin));
    seededShuffle(allWords, dictPath);

    const chapterSize = 20;
    const totalChapters = Math.ceil(allWords.length / chapterSize);
    let chapterIndex = parseInt(settings.practice_chapter, 10);
    
    if (isNaN(chapterIndex) || chapterIndex < 0 || chapterIndex >= totalChapters) {
        chapterIndex = 0;
        settings.practice_chapter = 0;
        saveSettings();
    }

    const startIdx = chapterIndex * chapterSize;
    const endIdx = Math.min(startIdx + chapterSize, allWords.length);
    
    practiceWords = allWords.slice(startIdx, endIdx);
    
    const toolbar = document.getElementById("practice-toolbar-left");
    if (toolbar) {
        toolbar.style.display = "none";
        toolbar.innerHTML = "";
    }

    return true;
}

function handlePracticeKeyDown(e) {
    if (currentState !== InputState.PRACTICE) return;

    if (e.key === "F2") {
        e.preventDefault();
        togglePinyinHint();
        return;
    }

    if (e.key === "F3") {
        e.preventDefault();
        speakCurrentWord();
        return;
    }

    // New: Browse Mode Navigation
    if (isBrowseMode) {
        if (e.key === " " || e.key === "Enter") {
             e.preventDefault();
             flipCurrentCard();
             return;
        }
        // Right Arrow or = : Next
        if (e.key === "ArrowRight" || e.key === "=") {
             e.preventDefault();
             navigateBrowse(1);
             return;
        }
        // Left Arrow or - : Previous
        if (e.key === "ArrowLeft" || e.key === "-") {
             e.preventDefault();
             navigateBrowse(-1);
             return;
        }
    }

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

// New: Swipe Logic
let touchStartX = 0;
let touchEndX = 0;

function initSwipeHandlers() {
    const container = document.getElementById("practice-container");
    if (!container || container.dataset.swipeInitialized) return;
    
    container.dataset.swipeInitialized = "true";

    container.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    container.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    let isMouseDown = false;
    container.addEventListener('mousedown', e => {
        isMouseDown = true;
        touchStartX = e.screenX;
        touchEndX = e.screenX; // Reset end to start on new press
    });
    
    container.addEventListener('mouseup', e => {
        if (!isMouseDown) return;
        isMouseDown = false;
        touchEndX = e.screenX;
        handleSwipe();
    });
    
    // Add Click handler to Center Card for Flip
    // Note: We use the slot to catch clicks, but we must check if it's a swipe
    if (cardCenter) {
        cardCenter.onclick = (e) => {
            if (isBrowseMode && Math.abs(touchEndX - touchStartX) < 10) {
                 flipCurrentCard();
            }
        };
    }
}

function handleSwipe() {
    if (!isBrowseMode) return;
    const threshold = 50;
    if (touchEndX < touchStartX - threshold) {
        // Swiped Left -> Next (Drag card left to see next)
        // Wait, standard convention:
        // Drag Left -> Pulling next content from right? Or Pushing current content to left?
        // Pushing current to left means Next.
        navigateBrowse(1);
    }
    if (touchEndX > touchStartX + threshold) {
        // Swiped Right -> Previous
        navigateBrowse(-1);
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

    // Initialize Swipe Handlers
    initSwipeHandlers();

    document.getElementById("practice-mode-btn").style.display = "none";
    document.getElementById("exit-practice-mode-btn").style.display = "flex";

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
    if (footer) footer.style.display = "none"; 
    
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

    const dictData = practiceDict.fetchedContent;
    let allWords = [];
    for (const pinyin in dictData) {
        const pinyinData = dictData[pinyin];
        const hanziArray = Array.isArray(pinyinData) ? pinyinData : [pinyinData];
        hanziArray.forEach((hanzi) => {
            allWords.push({ pinyin, hanzi });
        });
    }
    
    allWords.sort((a, b) => a.pinyin.localeCompare(b.pinyin));
    seededShuffle(allWords, dictPath);

    const wordCount = allWords.length;
    const totalChapters = Math.ceil(wordCount / directoryPageSize);
    const totalPages = Math.ceil(totalChapters / directoryPageSize);
    
    if (totalPages > 0) {
        directoryPageIndex = Math.max(0, Math.min(directoryPageIndex, totalPages - 1));
    } else {
        directoryPageIndex = 0;
    }

    const currentChapter = parseInt(settings.practice_chapter, 10);
    if (!isNaN(currentChapter) && currentChapter >= 0) {
        const targetPage = Math.floor(currentChapter / directoryPageSize);
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
        const start = i * directoryPageSize + 1;
        const end = Math.min((i + 1) * directoryPageSize, wordCount);
        
        const progressKey = `${PRACTICE_PROGRESS_KEY}_${dictPath.replace(/[^a-zA-Z0-9]/g, '_')}_ch${i}`;
        const savedProgress = localStorage.getItem(progressKey);
        const progressPercent = savedProgress ? Math.floor((parseInt(savedProgress, 10) / (end - start + 1)) * 100) : 0;

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
    
    const inputContainer = document.getElementById("input-container");
    if (inputContainer) {
        inputContainer.style.display = "flex";
        // Reset visibility if needed
        inputContainer.style.visibility = "visible";
    }
    
    // Reset browse mode
    isBrowseMode = false;
    const browseBtn = document.getElementById("toggle-browse-btn");
    if (browseBtn) browseBtn.classList.remove("active");

    [cardLeft, cardCenter, cardRight].forEach(c => c.style.display = "flex");
    
    const footer = document.getElementById("practice-footer");
    if (footer) {
        footer.style.display = "flex";
        const chapterIndex = parseInt(settings.practice_chapter, 10);
        // Add Browse Mode Button here
        footer.innerHTML = `
            <div class="footer-chapter-label">第 ${chapterIndex + 1} 章</div>
            <button id="back-to-dir-btn" class="btn btn-toggle" onclick="showPracticeDirectory()">章节目录</button>
            <button id="toggle-browse-btn" class="btn btn-toggle" onclick="toggleBrowseMode()">浏览模式</button>
            <button id="toggle-pinyin-btn" class="btn btn-toggle ${showPinyinHint ? 'active' : ''}" onclick="togglePinyinHint()">显示拼音 (F2)</button>
            <button id="play-sound-btn" class="btn btn-toggle" onclick="speakCurrentWord()">朗读 (F3)</button>
            <button id="toggle-tts-btn" class="btn btn-toggle ${autoTTS ? 'active' : ''}" onclick="toggleAutoTTS()">自动朗读</button>
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
    await initPracticeModeData();
    showPracticeDirectory();
}

function exitPracticeMode() {
    isPracticeAnimating = false;
    isBrowseMode = false;
    setState(InputState.NORMAL);
    document.removeEventListener("keydown", handlePracticeKeyDown);

    document.getElementById("output-card").style.display = "flex";
    document.getElementById("practice-container").style.display = "none";
    document.getElementById("practice-footer").style.display = "none";
    document.getElementById("toggle-pinyin-btn").style.display = "none";
    
    const inputContainer = document.getElementById("input-container");
    if (inputContainer) {
        inputContainer.style.display = "flex";
        inputContainer.style.visibility = "visible";
    }

    const dirBtn = document.getElementById("back-to-dir-btn");
    if (dirBtn) dirBtn.style.display = "none";
    
    const toolbar = document.getElementById("practice-toolbar-left");
    if (toolbar) toolbar.style.display = "none";

    practiceCards.forEach((card) => {
        card.style.display = "flex"; 
        card.classList.remove("visible", "current", "incorrect");
        const pyDisp = card.querySelector(".pinyin-display");
        const hzDisp = card.querySelector(".hanzi-display");
        const enDisp = card.querySelector(".en-display");
        const content = card.querySelector(".practice-card-content");
        
        if (pyDisp) pyDisp.textContent = "";
        if (hzDisp) hzDisp.textContent = "";
        if (enDisp) enDisp.textContent = "";
        if (content) content.classList.remove("flipped");
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
    // Reset visuals
    practiceCards.forEach((card) => {
        card.classList.remove("visible", "current", "incorrect");
        const pyDisp = card.querySelector(".pinyin-display");
        const hzDisp = card.querySelector(".hanzi-display");
        const enDisp = card.querySelector(".en-display");
        if (pyDisp) pyDisp.textContent = "";
        if (hzDisp) hzDisp.textContent = "";
        if (enDisp) enDisp.textContent = "";
    });

    // Helper to populate a card
    const populateCard = (card, word) => {
        card.querySelector(".hanzi-display").textContent = getHanziChar(word.hanzi);
        const enDisp = card.querySelector(".en-display");
        if (enDisp) enDisp.textContent = getHanziEn(word.hanzi);
        // Note: Pinyin display logic is handled by updatePracticeInputDisplay for Center Card
        // For side cards, we just show raw pinyin
        return card;
    };

    if (currentPracticeWordIndex < practiceWords.length) {
        const word = practiceWords[currentPracticeWordIndex];
        populateCard(cardCenter, word);
        
        updatePracticeInputDisplay(); 
        cardCenter.classList.add("visible", "current");
        
        if (autoTTS && !isBrowseMode) { // Disable auto-tts in browse mode to avoid noise? Or keep it?
            setTimeout(() => speakCurrentWord(), 300);
        }
    } else {
        exitPracticeMode();
        return;
    }

    // Next word (Left)
    if (currentPracticeWordIndex + 1 < practiceWords.length) {
        const nextWord = practiceWords[currentPracticeWordIndex + 1];
        const card = populateCard(cardLeft, nextWord);
        card.classList.add("visible");
    }

    // Previous word (Right)
    if (currentPracticeWordIndex - 1 >= 0) {
        const prevWord = practiceWords[currentPracticeWordIndex - 1];
        const card = populateCard(cardRight, prevWord);
        // Side cards always show simple pinyin
        card.querySelector(".pinyin-display").textContent = prevWord.pinyin;
        card.classList.add("visible");
    }
}

function showNextPracticeWord() {
    if (currentPracticeWordIndex >= practiceWords.length) {
        localStorage.removeItem(getPracticeProgressKey());
        cardLeft.style.display = "none";
        cardRight.style.display = "none";
        cardCenter.classList.add("visible", "current");
        cardCenter.classList.remove("incorrect");
        
        const pyDisp = cardCenter.querySelector(".pinyin-display");
        const hzDisp = cardCenter.querySelector(".hanzi-display");
        const enDisp = cardCenter.querySelector(".en-display");
        
        if (pyDisp) pyDisp.innerHTML = "";
        if (enDisp) enDisp.innerHTML = "";
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
            // In Browse Mode, we might want to just show the Pinyin if requested, 
            // without input validation colors.
            // But if we want to support "Typing to verify" even in Browse Mode, we keep this.
            // If Browse Mode hides input, buffer is likely empty.
            if (isBrowseMode && !buffer) {
                 // Show full Pinyin if hint is on, or if we decide to show it always in Browse Mode?
                 // Let's stick to hint logic.
                 if (showPinyinHint) {
                     cardPinyinDisplay.textContent = targetPinyin;
                 } else {
                     cardPinyinDisplay.textContent = targetPinyin.replace(/./g, "_"); // Or empty?
                     // In Browse mode, usually you want to see the question (Hanzi) and guess Pinyin/English.
                     // So hiding Pinyin is correct until flip?
                     // But if we flip, we see English.
                     // Maybe Front should have Pinyin?
                     // Let's assume standard behavior: Hidden Pinyin unless Hint is On.
                     cardPinyinDisplay.innerHTML = targetPinyin.split('').map(c => `<span class="char-placeholder">${showPinyinHint ? c : "_"}</span>`).join('');
                 }
                 return;
            }

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
    
    // Disable input in Browse Mode?
    if (isBrowseMode) {
        // Clear input to prevent buffer accumulation
        event.target.value = "";
        return;
    }

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
        
        setBuffer("");
        const hInput = document.getElementById("hidden-input");
        if (hInput) hInput.value = "";
        
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