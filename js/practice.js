let practiceWords = [];
let currentPracticeWordIndex = 0;
let isPracticeAnimating = false;
let currentPracticeMode = PRACTICE_MODE.PINYIN; // Default to Pinyin
let cardLeft, cardCenter, cardRight;
let practiceCards = [];
let showPinyinHint = false;
let currentCommittedHanzi = "";
let hideHanzi = false;
let showEnglishHint = false;
// ttsMode: 0=Off, 1=Target(Zh/Jp), 2=Definition(En), 3=Both
let ttsMode = 0;
let tempErrorChar = null; 
let isBrowseMode = false;
let currentRotationAngle = 0; // New: Track rotation
let directoryPageIndex = 0;
const directoryPageSize = 20;

function getHanziChar(hanziObject) {
    if (typeof hanziObject === 'object' && hanziObject !== null && hanziObject.char) {
        return hanziObject.char;
    }
    return hanziObject;
}

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
    
    if (currentPracticeWordIndex >= practiceWords.length) return Promise.resolve();
    const word = practiceWords[currentPracticeWordIndex];
    if (!word) return Promise.resolve();

    const hanzi = getHanziChar(word.hanzi);
    // If it's an array (like in English dicts), join them or pick first
    const text = Array.isArray(hanzi) ? hanzi.join("，") : hanzi;
    
    // Detect Language based on dictionary path or current settings
    // Simple heuristic: check if path contains "japanese" or check characters?
    let lang = 'zh';
    if (settings.practice_dict_path && settings.practice_dict_path.includes('japanese')) {
        lang = 'jap';
    }
    
    const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=${lang}`;
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve; // Resolve on error too so chain continues
        audio.play().catch(err => {
            console.error("Play audio failed:", err);
            // showToast("播放音频失败", "error"); // Suppress toast for auto-play flow to avoid spam
            resolve();
        });
    });
}

function speakCurrentEnglish(e) {
    if (e) {
        e.stopPropagation();
        focusHiddenInput();
    }
    
    if (currentPracticeWordIndex >= practiceWords.length) return Promise.resolve();
    const word = practiceWords[currentPracticeWordIndex];
    if (!word) return Promise.resolve();

    let textToRead = "";
    const en = getHanziEn(word.hanzi);
    if (en) {
        textToRead = en;
    } else {
        // Fallback: If pinyin looks like English (and no explicit EN definition), read pinyin
        // This covers English dictionaries where pinyin="April"
        if (/^[a-zA-Z\s']+$/.test(word.pinyin)) {
            textToRead = word.pinyin;
        }
    }

    if (!textToRead) {
        if (e) showToast("无英语内容可朗读", "warning");
        return Promise.resolve();
    }

    const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(textToRead)}&le=en`;
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(err => {
            console.error("Play English audio failed:", err);
            if (e) showToast("播放失败", "error");
            resolve();
        });
    });
}

function handleManualRead(e) {
    if (e) {
        e.stopPropagation();
        focusHiddenInput();
    }
    
    // If ttsMode is 0 (Off), F3 should read Target (default behavior)
    if (ttsMode === 2) { 
        speakCurrentEnglish();
    } else if (ttsMode === 3) { 
        speakCurrentWord().then(() => setTimeout(speakCurrentEnglish, 200));
    } else { 
        speakCurrentWord();
    }
}

function toggleAutoTTS() {
    ttsMode = (ttsMode + 1) % 4;
    const btn = document.getElementById("toggle-tts-btn");
    
    let label = "自动朗读";
    let msg = "";
    
    switch(ttsMode) {
        case 0:
            label = "自动: 关闭";
            msg = "自动朗读已关闭";
            if (btn) btn.classList.remove("active");
            break;
        case 1:
            label = "自动: 词";
            msg = "自动朗读: 仅读单词 (中/日)";
            if (btn) btn.classList.add("active");
            break;
        case 2:
            label = "自动: 义";
            msg = "自动朗读: 仅读释义 (英)";
            if (btn) btn.classList.add("active");
            break;
        case 3:
            label = "自动: 双语";
            msg = "自动朗读: 双语模式";
            if (btn) btn.classList.add("active");
            break;
    }
    
    if (btn) btn.innerText = label;
    showToast(msg, "info");
    
    if (ttsMode > 0) {
        triggerAutoTTS();
    }
    focusHiddenInput();
}

function triggerAutoTTS() {
    if (ttsMode === 0 || isBrowseMode) return;
    
    const p1 = (ttsMode === 1 || ttsMode === 3) ? () => speakCurrentWord() : () => Promise.resolve();
    const p2 = (ttsMode === 2 || ttsMode === 3) ? () => speakCurrentEnglish() : () => Promise.resolve();

    // If Both, play P1 then P2.
    // If Target Only, play P1.
    // If Def Only, play P2.
    // Note: If ttsMode=2, p1 is empty resolve.
    
    p1().then(() => {
        if (ttsMode === 3) {
             setTimeout(() => p2(), 200);
        } else if (ttsMode === 2) {
             p2();
        }
    });
}

function toggleBrowseMode() {
    isBrowseMode = !isBrowseMode;
    
    const btn = document.getElementById("toggle-browse-btn");
    if (btn) btn.classList.toggle("active", isBrowseMode);
    
    const inputContainer = document.getElementById("input-container");
    if (inputContainer) {
        inputContainer.style.visibility = isBrowseMode ? "hidden" : "visible";
    }

    resetCardFlips();
    loadCards();
    showToast(isBrowseMode ? "已进入浏览模式 (点击/滚轮/滑动)" : "已退出浏览模式", "info");
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

// New: Rotate Current Card
function rotateCurrentCard(e) {
    if (e) e.stopPropagation();
    if (!cardCenter) return;
    const content = cardCenter.querySelector(".practice-card-content");
    if (content) {
        currentRotationAngle += 45;
        content.style.setProperty("--rot-angle", `${currentRotationAngle}deg`);
    }
}

function navigateBrowse(delta) {
    if (!isBrowseMode || isPracticeAnimating) return;
    
    const nextIndex = currentPracticeWordIndex + delta;
    if (nextIndex >= 0 && nextIndex < practiceWords.length) {
        isPracticeAnimating = true;
        currentPracticeWordIndex = nextIndex;
        
        resetCardFlips();
        
        // Also reset rotation when navigating
        currentRotationAngle = 0;
        if (cardCenter) {
            const content = cardCenter.querySelector(".practice-card-content");
            if (content) content.style.setProperty("--rot-angle", "0deg");
        }

        loadCards();
        setTimeout(() => { isPracticeAnimating = false; }, 300);
        
    } else if (nextIndex >= practiceWords.length) {
         showNextPracticeWord();
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
        handleManualRead(e);
        return;
    }

    if (e.key === "F4") {
        e.preventDefault();
        toggleHanziPrompt();
        return;
    }

    if (e.key === "F8") {
        e.preventDefault();
        toggleEnglishHint();
        return;
    }

    if (e.key === "F5") {
        e.preventDefault();
        speakCurrentEnglish();
        return;
    }

    if (isBrowseMode) {
        if (e.key === " " || e.key === "Enter") {
             e.preventDefault();
             flipCurrentCard();
             return;
        }
        if (e.key === "ArrowRight" || e.key === "=") {
             e.preventDefault();
             navigateBrowse(1);
             return;
        }
        if (e.key === "ArrowLeft" || e.key === "-") {
             e.preventDefault();
             navigateBrowse(-1);
             return;
        }
    }

    // New: Enter key to load next chapter when complete
    if (e.key === "Enter" && currentPracticeWordIndex >= practiceWords.length) {
        e.preventDefault();
        loadNextChapter();
        return;
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

// Swipe and Interaction Logic
let touchStartX = 0;
let touchEndX = 0;
let lastWheelTime = 0;

function initSwipeHandlers() {
    const container = document.getElementById("practice-container");
    if (!container) return;
    
    // Only add listeners once for event listeners, but we can re-assign onclicks
    if (!container.dataset.swipeInitialized) {
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
            touchEndX = e.screenX;
        });
        
        container.addEventListener('mouseup', e => {
            if (!isMouseDown) return;
            isMouseDown = false;
            touchEndX = e.screenX;
            handleSwipe();
        });

        // Mouse Wheel
        container.addEventListener('wheel', e => {
            if (!isBrowseMode) return;
            e.preventDefault();
            
            const now = Date.now();
            if (now - lastWheelTime < 300) return;
            lastWheelTime = now;

            if (e.deltaY > 0 || e.deltaX > 0) {
                navigateBrowse(1); // Next
            } else {
                navigateBrowse(-1); // Previous
            }
        }, { passive: false });
        
        // Background clicks
        container.addEventListener('click', (e) => {
            if (!isBrowseMode) return;
            // Only trigger if clicking directly on container or slot (not content which handles its own click)
            if (e.target === container || e.target.classList.contains("practice-card-slot")) {
                const width = container.clientWidth;
                const x = e.offsetX;
                if (x < width * 0.2) {
                    navigateBrowse(-1);
                } else if (x > width * 0.8) {
                    navigateBrowse(1);
                }
            }
        });
    }

    // Re-assign onclick handlers every time to ensure they use current scope/logic
    // AND ensure we use the global variables cardLeft/Center/Right which are updated in startPracticeMode
    if (cardCenter) {
        cardCenter.onclick = (e) => {
            e.stopPropagation();
            if (isBrowseMode && Math.abs(touchEndX - touchStartX) < 10) {
                 flipCurrentCard();
            }
        };
        // Add rotation button click handler
        const rotBtn = cardCenter.querySelector(".card-rotate-btn");
        if (rotBtn) rotBtn.onclick = rotateCurrentCard;
    }

    if (cardLeft) {
        cardLeft.onclick = (e) => {
            if (isBrowseMode) {
                e.stopPropagation();
                navigateBrowse(1); // Left Card = Next Word (User Preference)
            }
        };
        const rotBtn = cardLeft.querySelector(".card-rotate-btn");
        if (rotBtn) rotBtn.onclick = (e) => {
             e.stopPropagation();
             const content = cardLeft.querySelector(".practice-card-content");
             if (content) {
                 const current = parseInt(content.style.getPropertyValue("--rot-angle") || 0);
                 content.style.setProperty("--rot-angle", `${current + 45}deg`);
             }
        };
    }

    if (cardRight) {
        cardRight.onclick = (e) => {
            if (isBrowseMode) {
                e.stopPropagation();
                navigateBrowse(-1); // Right Card = Previous Word
            }
        };
        const rotBtn = cardRight.querySelector(".card-rotate-btn");
        if (rotBtn) rotBtn.onclick = (e) => {
             e.stopPropagation();
             const content = cardRight.querySelector(".practice-card-content");
             if (content) {
                 const current = parseInt(content.style.getPropertyValue("--rot-angle") || 0);
                 content.style.setProperty("--rot-angle", `${current + 45}deg`);
             }
        };
    }
}

function handleSwipe() {
    if (!isBrowseMode) return;
    const threshold = 50;
    if (touchEndX < touchStartX - threshold) {
        navigateBrowse(1); // Drag left -> Next
    }
    if (touchEndX > touchStartX + threshold) {
        navigateBrowse(-1); // Drag right -> Previous
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

    if (!cardLeft || !cardCenter || !cardRight) {
        showErrorMessage("练习模式卡片元素初始化失败");
        return;
    }
    practiceCards = [cardLeft, cardCenter, cardRight];

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
    try {
        const success = await initPracticeModeData();
        hideLoadingMessage();
        if (success) {
            showChapterPractice();
        }
    } catch (error) {
        hideLoadingMessage();
        showErrorMessage("加载章节失败", error);
    }
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
        
        // Determine label for current mode
        let modeLabel = "模式: 拼音";
        if (currentPracticeMode === PRACTICE_MODE.ENGLISH) modeLabel = "模式: 英语";
        if (currentPracticeMode === PRACTICE_MODE.HANZI) modeLabel = "模式: 汉字";

        footer.innerHTML = `
            <div class="footer-chapter-label">第 ${chapterIndex + 1} 章</div>
            <button id="toggle-mode-btn" class="btn btn-toggle" onclick="togglePracticeMode()">${modeLabel}</button>
            <button id="back-to-dir-btn" class="btn btn-toggle" onclick="showPracticeDirectory()">章节目录</button>
            <button id="toggle-browse-btn" class="btn btn-toggle" onclick="toggleBrowseMode()">浏览模式</button>
            <button id="toggle-pinyin-btn" class="btn btn-toggle ${showPinyinHint ? 'active' : ''}" onclick="togglePinyinHint()">显示拼音 (F2)</button>
            <button id="toggle-hanzi-btn" class="btn btn-toggle ${hideHanzi ? 'active' : ''}" onclick="toggleHanziPrompt()">隐藏汉字 (F4)</button>
            <button id="toggle-english-btn" class="btn btn-toggle ${showEnglishHint ? 'active' : ''}" onclick="toggleEnglishHint()">显示释义 (F8)</button>
            <button id="play-sound-btn" class="btn btn-toggle" onclick="handleManualRead(event)">朗读 (F3)</button>
            <button id="toggle-tts-btn" class="btn btn-toggle ${ttsMode > 0 ? 'active' : ''}" onclick="toggleAutoTTS()">
                ${ttsMode === 0 ? '自动: 关闭' : ttsMode === 1 ? '自动: 词' : ttsMode === 2 ? '自动: 义' : '自动: 双语'}
            </button>
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
        if (content) {
            content.classList.remove("flipped");
            content.style.setProperty("--rot-angle", "0deg");
        }
    });

    document.getElementById("practice-mode-btn").style.display = "flex";
    document.getElementById("exit-practice-mode-btn").style.display = "none";
}

function togglePracticeMode() {
    if (currentPracticeMode === PRACTICE_MODE.PINYIN) {
        currentPracticeMode = PRACTICE_MODE.ENGLISH;
        showToast("已切换至英语练习模式", "info");
    } else if (currentPracticeMode === PRACTICE_MODE.ENGLISH) {
        currentPracticeMode = PRACTICE_MODE.HANZI;
        showToast("已切换至汉字拼写模式", "info");
    } else {
        currentPracticeMode = PRACTICE_MODE.PINYIN;
        showToast("已切换至拼音练习模式", "info");
    }
    
    // Refresh footer label
    showChapterPractice();
}

function togglePinyinHint() {
    showPinyinHint = !showPinyinHint;
    const btn = document.getElementById("toggle-pinyin-btn");
    if (btn) btn.classList.toggle("active", showPinyinHint);
    updatePracticeInputDisplay();
}

function toggleHanziPrompt() {
    hideHanzi = !hideHanzi;
    const btn = document.getElementById("toggle-hanzi-btn");
    if (btn) btn.classList.toggle("active", hideHanzi);
    if (hideHanzi) {
        showToast("已隐藏汉字提示 (盲打/释义模式)", "info");
    } else {
        showToast("已显示汉字提示", "info");
    }
    loadCards();
}

function toggleEnglishHint() {
    showEnglishHint = !showEnglishHint;
    const btn = document.getElementById("toggle-english-btn");
    if (btn) btn.classList.toggle("active", showEnglishHint);
    
    if (showEnglishHint) {
        showToast("已显示英文释义", "info");
    } else {
        showToast("已隐藏英文释义", "info");
    }
    loadCards();
}

function loadCards() {
    tempErrorChar = null;
    // Reset visuals
    practiceCards.forEach((card) => {
        card.classList.remove("visible", "current", "incorrect");
        const pyDisp = card.querySelector(".pinyin-display");
        const hzDisp = card.querySelector(".hanzi-display");
        const enDisp = card.querySelector(".card-back .en-display");
        const frontEnDisp = card.querySelector(".card-front .en-display");
        
        const content = card.querySelector(".practice-card-content");
        if (pyDisp) pyDisp.textContent = "";
        if (hzDisp) hzDisp.textContent = "";
        if (enDisp) enDisp.textContent = "";
        if (frontEnDisp) frontEnDisp.textContent = "";
        
        // Reset rotation visually for all cards when loading
        if (content) {
            content.style.setProperty("--rot-angle", "0deg");
            if (card === cardCenter) currentRotationAngle = 0;
        }
    });

    const populateCard = (card, word) => {
        let hanziText = getHanziChar(word.hanzi);
        if (Array.isArray(hanziText)) hanziText = hanziText.join("，");
        
        const enText = getHanziEn(word.hanzi);
        const pinyinText = word.pinyin || "";
        
        const frontHanzi = card.querySelector(".card-front .hanzi-display");
        const backHanzi = card.querySelector(".card-back .hanzi-display");
        const frontEn = card.querySelector(".card-front .en-display");
        const backEn = card.querySelector(".card-back .en-display");
        const pinyinDisp = card.querySelector(".pinyin-display");

        // Dynamic Font Scaling
        const adjustFontSize = (el, text, baseSize, thresholds) => {
            if (!el) return;
            let size = baseSize;
            for (const t of thresholds) {
                if (text.length > t.len) size = t.size;
            }
            el.style.fontSize = size + "px";
        };

        // Adjust Hanzi Size: Default 64px, >4 chars -> 40px, >8 chars -> 28px
        const hanziThresholds = [{len: 4, size: 40}, {len: 8, size: 28}];
        
        // Adjust Pinyin Size: Default 22px, >12 chars -> 18px, >20 chars -> 14px
        const pinyinThresholds = [{len: 12, size: 18}, {len: 20, size: 14}];

        const isEnglishMode = currentPracticeMode === PRACTICE_MODE.ENGLISH;
        const isHanziMode = currentPracticeMode === PRACTICE_MODE.HANZI;

        if (hideHanzi) {
            // Blind Mode (Applies to all modes basically)
            // If Hanzi Mode + Blind Mode -> Show English/Pinyin, Hide Hanzi (Target)
            // Wait, Hanzi Mode ALREADY hides Hanzi because it's the target.
            
            if (frontHanzi) {
                frontHanzi.style.display = "none";
                frontHanzi.textContent = hanziText;
            }
            if (frontEn) {
                frontEn.style.display = "block"; 
                if (enText) {
                    frontEn.textContent = enText;
                } else {
                    frontEn.innerHTML = `<span style="font-size:16px; color:var(--text-sec);">(无英文释义)</span>`;
                }
            }
        } else {
            // Normal Visibility Logic
            if (frontHanzi) {
                if (isHanziMode) {
                    // In Hanzi Mode, Hanzi is the target, so we hide it on front card (show placeholder usually, but here we just hide text)
                    // We need to show the prompt (English or Pinyin)
                    frontHanzi.style.display = "none"; 
                } else {
                    frontHanzi.style.display = ""; 
                    frontHanzi.textContent = hanziText;
                    adjustFontSize(frontHanzi, hanziText, 64, hanziThresholds);
                }
            }
            
            if (frontEn) {
                // In English Mode, English is target (so hidden/placeholder handled by updatePracticeInputDisplay)
                // In Hanzi Mode, English is prompt (Visible)
                // In Pinyin Mode, English is optional hint (showEnglishHint)
                
                if (isHanziMode) {
                     frontEn.style.display = "block";
                     if (enText) frontEn.textContent = enText;
                     else frontEn.innerHTML = `<span style="font-size:16px; color:var(--text-sec);">(无英文释义)</span>`;
                } else if (isEnglishMode) {
                     // Target is English. We show Hanzi/Pinyin. English display is for Input.
                     // The actual text is hidden, placeholders shown by updatePracticeInputDisplay
                     frontEn.style.display = "block";
                     frontEn.textContent = ""; // Will be filled by placeholders
                } else {
                    if (showEnglishHint) {
                        frontEn.style.display = "block";
                        if (enText) {
                            frontEn.textContent = enText;
                        } else {
                            frontEn.innerHTML = `<span style="font-size:16px; color:var(--text-sec);">(无英文释义)</span>`;
                        }
                    } else {
                        frontEn.style.display = "none";
                    }
                }
            }
        }
        
        // Pinyin Display Logic on Front
        if (pinyinDisp) {
             if (isHanziMode) {
                 // Show Pinyin as hint? Yes, usually useful.
                 pinyinDisp.textContent = pinyinText;
                 adjustFontSize(pinyinDisp, pinyinText, 22, pinyinThresholds);
             } else if (isEnglishMode) {
                 // Show Pinyin as hint
                 pinyinDisp.textContent = pinyinText;
                 adjustFontSize(pinyinDisp, pinyinText, 22, pinyinThresholds);
             } else {
                 // Pinyin Mode: Target. Handled by updatePracticeInputDisplay.
                 pinyinDisp.textContent = ""; 
             }
        }

        // Back always has full info
        if (backHanzi) {
            backHanzi.textContent = hanziText;
            adjustFontSize(backHanzi, hanziText, 32, [{len: 6, size: 24}, {len: 12, size: 18}]);
        }
        if (backEn) backEn.textContent = enText;
        
        // Adjust Pinyin display if it exists (for history card)
        if (card === cardRight) {
             if (pinyinDisp) {
                 pinyinDisp.textContent = pinyinText;
                 adjustFontSize(pinyinDisp, pinyinText, 22, pinyinThresholds);
             }
             // History card (Right) should show Hanzi usually
             if (frontHanzi) {
                 frontHanzi.style.display = "";
                 frontHanzi.textContent = hanziText;
                 adjustFontSize(frontHanzi, hanziText, 32, hanziThresholds);
             }
        } 
        
        if (card === cardCenter) {
            // For center card, we also want the placeholder font to be smaller if pinyin is long
             if (!isHanziMode && !isEnglishMode) {
                 adjustFontSize(pinyinDisp, pinyinText, 22, pinyinThresholds);
             }
        }

        return card;
    };

    if (currentPracticeWordIndex < practiceWords.length) {
        const word = practiceWords[currentPracticeWordIndex];
        populateCard(cardCenter, word);
        
        updatePracticeInputDisplay(); 
        cardCenter.classList.add("visible", "current");
        
        if (ttsMode > 0 && !isBrowseMode) { 
            setTimeout(() => triggerAutoTTS(), 300);
        }
    } else {
        exitPracticeMode();
        return;
    }

    // Next word (Left) - REVERTED: Left shows Next
    if (currentPracticeWordIndex + 1 < practiceWords.length) {
        const nextWord = practiceWords[currentPracticeWordIndex + 1];
        const card = populateCard(cardLeft, nextWord);
        // Left side now shows Next (User Preference)
        // Optionally show pinyin for review? No, upcoming.
        card.classList.add("visible");
    }

    // Previous word (Right) - REVERTED: Right shows Previous
    if (currentPracticeWordIndex - 1 >= 0) {
        const prevWord = practiceWords[currentPracticeWordIndex - 1];
        const card = populateCard(cardRight, prevWord);
        // Right side is history
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
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
                    <div style="font-size: 24px; margin-bottom: 20px;">🎉 章节完成!</div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-action" style="background: var(--primary);" onclick="loadNextChapter()">下一章 (Enter)</button>
                        <button class="btn" onclick="retryChapter()">重练</button>
                        <button class="btn" onclick="showPracticeDirectory()">返回</button>
                    </div>
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
    isPracticeAnimating = false;
    
    // Reshuffle current chapter words for variety
    seededShuffle(practiceWords, Date.now().toString());
    
    // showChapterPractice handles layout restoration (display: flex) and loadCards
    showChapterPractice();
}

function updatePracticeInputDisplay() {
    if (currentState !== InputState.PRACTICE) return;

    const currentWord = practiceWords[currentPracticeWordIndex];
    if (!currentWord) return;

    let targetText = "";
    let typedText = "";
    let displayEl = null;

    if (currentPracticeMode === PRACTICE_MODE.ENGLISH) {
        targetText = getHanziEn(currentWord.hanzi) || "";
        typedText = buffer; // In English mode, buffer holds typed letters
        if (cardCenter) displayEl = cardCenter.querySelector(".card-front .en-display");
    } else if (currentPracticeMode === PRACTICE_MODE.HANZI) {
        targetText = getHanziChar(currentWord.hanzi) || "";
        if (Array.isArray(targetText)) targetText = targetText.join("");
        typedText = currentCommittedHanzi;
        if (cardCenter) displayEl = cardCenter.querySelector(".card-front .hanzi-display");
        
        // In Hanzi mode, we must ensure the element is visible for placeholders
        if (displayEl) displayEl.style.display = "block";
    } else {
        // Pinyin Mode
        targetText = currentWord.pinyin.toLowerCase();
        typedText = buffer.toLowerCase();
        if (cardCenter) displayEl = cardCenter.querySelector(".pinyin-display");
    }

    if (!displayEl) return;

    if (isBrowseMode && !typedText) {
         if (currentPracticeMode === PRACTICE_MODE.HANZI) {
             // Browse Mode + Hanzi Mode: Just show the Hanzi (Answer) or Placeholders?
             // Usually browse mode shows the answer.
             displayEl.textContent = targetText;
             return;
         }
         
         if (currentPracticeMode === PRACTICE_MODE.ENGLISH) {
             if (showEnglishHint) {
                 displayEl.textContent = targetText;
             } else {
                 // English Mode Browse: Show placeholders
                 displayEl.innerHTML = targetText.split('').map(c => `<span class="char-placeholder">${/[a-zA-Z0-9]/.test(c) ? "_" : c}</span>`).join('');
             }
             return;
         }

         if (showPinyinHint) {
             displayEl.textContent = targetText;
         } else {
             displayEl.innerHTML = targetText.split('').map(c => `<span class="char-placeholder">${showPinyinHint ? c : "_"}</span>`).join('');
         }
         return;
    }

    let cardHTML = "";
    // Logic: Iterate through targetText. 
    // If index < typedText.length, show typed char (or check correctness).
    // Else show placeholder.
    
    // Note: typedText for Pinyin/English is raw chars.
    // For Hanzi, it's correct Hanzi characters (verified by checkHanziMatch).
    
    for (let i = 0; i < targetText.length; i++) {
        const char = targetText[i];
        
        if (i < typedText.length) {
            // Already typed/committed
            const typedChar = typedText[i];
            // Check matching (Case insensitive for English/Pinyin)
            let match = typedChar === char;
            if (currentPracticeMode !== PRACTICE_MODE.HANZI) {
                 match = typedChar.toLowerCase() === char.toLowerCase();
            }
            
            if (match) {
                 cardHTML += `<span class="char-placeholder" style="color: var(--text-main); opacity: 1; border-bottom-color: var(--primary);">${typedChar}</span>`;
            } else {
                 cardHTML += `<span class="char-placeholder char-incorrect" style="color: var(--danger); font-weight: bold;">${typedChar}</span>`;
            }
        } else if (i === typedText.length && tempErrorChar) {
            // Temporary error display
            cardHTML += `<span class="char-placeholder char-incorrect" style="color: var(--danger); font-weight: bold;">${tempErrorChar}</span>`;
        } else {
            // Remaining placeholders
            let placeholder = "_";
            // For spaces or punctuation, maybe show them?
            if (!/[a-zA-Z0-9\u4e00-\u9fa5]/.test(char)) {
                placeholder = char;
            }
            
            // Hints
            if (currentPracticeMode === PRACTICE_MODE.PINYIN && showPinyinHint) placeholder = char;
            if (currentPracticeMode === PRACTICE_MODE.ENGLISH && showEnglishHint) placeholder = char;
            
            cardHTML += `<span class="char-placeholder">${placeholder}</span>`;
        }
    }
    
    // Append extra error chars
    if (typedText.length >= targetText.length && tempErrorChar) {
          cardHTML += `<span class="char-placeholder char-incorrect" style="color: var(--danger); font-weight: bold;">${tempErrorChar}</span>`;
    }

    displayEl.innerHTML = cardHTML;
}

function checkHanziMatch(text) {
    if (currentPracticeMode !== PRACTICE_MODE.HANZI) return;
    
    const currentWord = practiceWords[currentPracticeWordIndex];
    if (!currentWord) return;
    
    let targetText = getHanziChar(currentWord.hanzi) || "";
    if (Array.isArray(targetText)) targetText = targetText.join("");
    
    const nextExpected = targetText.substring(currentCommittedHanzi.length);
    let matchedLength = 0;

    // Direct match
    if (nextExpected.startsWith(text)) {
        matchedLength = text.length;
    } else {
        // Relaxed Punctuation Match
        // Map common English punctuation to Chinese equivalents if the expected char is Chinese punctuation
        const punctMap = {
            ',': '，',
            '.': '。',
            '?': '？',
            '!': '！',
            ':': '：',
            ';': '；',
            '(': '（',
            ')': '）',
            '[': '【',
            ']': '】',
            '<': '《',
            '>': '》',
            ' ': ' ' // Match space with space? Or ignore space?
        };
        
        // Check if the input text (or its mapped version) matches the start of nextExpected
        let mappedText = "";
        for (let char of text) {
            mappedText += punctMap[char] || char;
        }

        if (nextExpected.startsWith(mappedText)) {
            matchedLength = mappedText.length;
        } else if (text.length === 1 && punctMap[text] && nextExpected.startsWith(punctMap[text])) {
            // Single char check (redundant but safe)
            matchedLength = 1;
            text = punctMap[text]; // Use the correct char for display
        }
    }

    if (matchedLength > 0) {
        // Correct match (use the text from target to ensure correct display logic if we did loose match)
        // Actually, we should append the *Expected* text to committed, to keep it clean.
        const matchedSegment = nextExpected.substring(0, matchedLength);
        currentCommittedHanzi += matchedSegment;
        
        updatePracticeInputDisplay();
        
        if (currentCommittedHanzi === targetText && !isPracticeAnimating) {
             isPracticeAnimating = true;
             // Success
             setTimeout(() => { 
                currentCommittedHanzi = "";
                currentPracticeWordIndex++;
                localStorage.setItem(getPracticeProgressKey(), currentPracticeWordIndex);
                showNextPracticeWord();
                isPracticeAnimating = false;
            }, 300);
        }
    } else {
        // Incorrect match
        showToast(`输入错误: 期望 "${nextExpected[0]}", 实际 "${text}"`, "warning");
        // Shake animation
        if (cardCenter) {
            cardCenter.classList.remove("incorrect"); 
            void cardCenter.offsetWidth; 
            cardCenter.classList.add("incorrect");
        }
    }
}

// Expose globally
window.checkHanziMatch = checkHanziMatch;

function handlePracticeInput(event) {
    if (currentState !== InputState.PRACTICE) return;
    
    // Hanzi Mode: Handled by main IME logic -> checkHanziMatch
    if (currentPracticeMode === PRACTICE_MODE.HANZI) return;

    if (isBrowseMode) {
        event.target.value = "";
        return;
    }

    const currentWord = practiceWords[currentPracticeWordIndex];
    if (!currentWord) return;
    
    let targetText = "";
    if (currentPracticeMode === PRACTICE_MODE.ENGLISH) {
        targetText = getHanziEn(currentWord.hanzi) || "";
    } else {
        targetText = currentWord.pinyin.toLowerCase();
    }
    
    // For English, allow spaces and punctuation?
    // Let's filter input based on target.
    // If target has spaces, allow spaces.
    let val = event.target.value;
    
    // Case insensitive match
    // Check prefix
    const targetPrefix = targetText.substring(0, val.length);
    
    // For English, "Apple" vs "apple". Input usually lowercase or whatever.
    // Let's enforce case-insensitive check but maybe preserve input case in buffer?
    
    if (val.length > targetText.length || targetPrefix.toLowerCase() !== val.toLowerCase()) {
         // Error
         const wrongChar = val.slice(-1);
         if (cardCenter) {
            cardCenter.classList.remove("incorrect"); 
            void cardCenter.offsetWidth; 
            cardCenter.classList.add("incorrect");
        }
        
        tempErrorChar = wrongChar;
        updatePracticeInputDisplay();
        setTimeout(() => {
            tempErrorChar = null;
            updatePracticeInputDisplay();
        }, 500);

        // Revert
        let validVal = val.substring(0, val.length - 1);
        while(validVal.length > 0 && targetText.substring(0, validVal.length).toLowerCase() !== validVal.toLowerCase()) {
            validVal = validVal.substring(0, validVal.length - 1);
        }
        val = validVal;
        event.target.value = val;
    } else {
        if (cardCenter) cardCenter.classList.remove("incorrect");
        if (tempErrorChar) tempErrorChar = null;
    }

    setBuffer(val);
    updatePracticeInputDisplay();

    // Check completion
    if (val.toLowerCase() === targetText.toLowerCase() && !isPracticeAnimating) {
        isPracticeAnimating = true;
        setBuffer("");
        const hInput = document.getElementById("hidden-input");
        if (hInput) hInput.value = "";
        
        if (cardCenter) {
            const display = currentPracticeMode === PRACTICE_MODE.ENGLISH ? 
                cardCenter.querySelector(".en-display") : 
                cardCenter.querySelector(".pinyin-display");
            if (display) display.innerHTML = "";
        }

        currentPracticeWordIndex++;
        localStorage.setItem(getPracticeProgressKey(), currentPracticeWordIndex);
        
        setTimeout(() => { 
            showNextPracticeWord(); 
            isPracticeAnimating = false;
        }, 150);
    }
}