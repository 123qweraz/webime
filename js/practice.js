let practiceWords = [];
let currentPracticeWordIndex = 0;
let isPracticeAnimating = false;
let cardLeft, cardCenter, cardRight;
let practiceCards = [];
let showPinyinHint = false;

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

    // Sort words to ensure chapter splitting is consistent
    allWords.sort((a, b) => a.pinyin.localeCompare(b.pinyin));

    const chapterSize = 20;
    const chapterIndex = settings.practice_chapter || 0;
    const startIdx = chapterIndex * chapterSize;
    const endIdx = Math.min(startIdx + chapterSize, allWords.length);
    
    practiceWords = allWords.slice(startIdx, endIdx);
    
    // Update the dictionary name and chapter info in UI
    const toolbar = document.getElementById("practice-toolbar-left");
    if (toolbar) {
        toolbar.style.display = "flex";
        toolbar.innerHTML = `
            <div style="font-weight: 800; font-size: 14px; background: var(--primary-light); color: var(--primary); padding: 4px 12px; border-radius: 8px;">
                ${practiceDict.name} - 第 ${chapterIndex + 1} 章 (${practiceWords.length} 词)
            </div>
        `;
    }

    seededShuffle(practiceWords, `${dictPath}_${chapterIndex}`);
    return true;
}

async function startPracticeMode() {
    practiceWords = []; 
    showLoadingMessage("准备练习...");
    const success = await initPracticeModeData();
    hideLoadingMessage();
    if (!success) return;

    setState(InputState.PRACTICE);

    const progressKey = getPracticeProgressKey();
    const savedIndex = localStorage.getItem(progressKey);
    currentPracticeWordIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
    
    if (currentPracticeWordIndex >= practiceWords.length) {
        currentPracticeWordIndex = 0;
    }

    document.getElementById("output-card").style.display = "none";
    document.getElementById("practice-container").style.display = "flex";
    document.getElementById("practice-footer").style.display = "flex";
    document.getElementById("toggle-pinyin-btn").style.display = "inline-flex";

    cardLeft = document.getElementById("card-left");
    cardCenter = document.getElementById("card-center");
    cardRight = document.getElementById("card-right");
    practiceCards = [cardLeft, cardCenter, cardRight];

    document.getElementById("practice-mode-btn").style.display = "none";
    document.getElementById("exit-practice-mode-btn").style.display = "flex";

    loadCards();
    setBuffer(""); // Clear buffer on start
    focusHiddenInput();
}

async function restartPracticeMode() {
    currentPracticeWordIndex = 0;
    await startPracticeMode();
}

function exitPracticeMode() {
    isPracticeAnimating = false;
    setState(InputState.NORMAL);

    document.getElementById("output-card").style.display = "flex";
    document.getElementById("practice-container").style.display = "none";
    document.getElementById("practice-footer").style.display = "none";
    document.getElementById("toggle-pinyin-btn").style.display = "none";
    
    const toolbar = document.getElementById("practice-toolbar-left");
    if (toolbar) toolbar.style.display = "none";

    practiceCards.forEach((card) => {
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
        exitPracticeMode();
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
        alert("练习完成! 🎉");
        localStorage.removeItem(getPracticeProgressKey());
        exitPracticeMode();
        return;
    }
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
                    const placeholder = showPinyinHint ? char : ""; // Remove the underscore here
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
