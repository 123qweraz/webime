let practiceWords = [];
let currentPracticeWordIndex = 0;
let isPracticeAnimating = false;
let cardLeft, cardCenter, cardRight;
let currentInputDisplay;
let practiceCards = [];
let showPinyinHint = false;

function getHanziChar(hanziObject) {
    if (typeof hanziObject === 'object' && hanziObject !== null && hanziObject.char) {
        return hanziObject.char;
    }
    return hanziObject;
}

async function initPracticeModeData() {
    const dictPath = settings.practice_dict_path;
    if (!dictPath) {
        showErrorMessage("未选择练习词典!");
        return false;
    }

    const practiceDict = allDicts.find((d) => (d.path || d.name) === dictPath);
    if (!practiceDict) {
        showErrorMessage(`练习词典未找到!`);
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
    practiceWords = [];
    for (const pinyin in dictData) {
        dictData[pinyin].forEach((hanzi) => {
            practiceWords.push({ pinyin, hanzi });
        });
    }

    // Shuffle
    for (let i = practiceWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [practiceWords[i], practiceWords[j]] = [practiceWords[j], practiceWords[i]];
    }

    return true;
}

async function startPracticeMode() {
    practiceWords = []; 
    showLoadingMessage("准备练习...");
    const success = await initPracticeModeData();
    hideLoadingMessage();
    if (!success) return;

    setState(InputState.PRACTICE);

    const savedIndex = localStorage.getItem(PRACTICE_PROGRESS_KEY);
    currentPracticeWordIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
    if (currentPracticeWordIndex >= practiceWords.length) currentPracticeWordIndex = 0;

    updatePracticeProgress();

    document.getElementById("output-card").style.display = "none";
    document.getElementById("practice-container").style.display = "flex";
    document.getElementById("practice-info-bar").style.display = "flex";
    document.getElementById("practice-toolbar-left").style.display = "flex";
    document.getElementById("toggle-pinyin-btn").style.display = "inline-flex";

    cardLeft = document.getElementById("card-left");
    cardCenter = document.getElementById("card-center");
    cardRight = document.getElementById("card-right");
    practiceCards = [cardLeft, cardCenter, cardRight];

    document.getElementById("practice-mode-btn").style.display = "none";
    document.getElementById("exit-practice-mode-btn").style.display = "flex";

    loadCards();
    focusHiddenInput();
}

function updatePracticeProgress() {
    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("practice-progress-text");
    if (practiceWords.length > 0) {
        const percent = ((currentPracticeWordIndex + 1) / practiceWords.length) * 100;
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${currentPracticeWordIndex + 1} / ${practiceWords.length}`;
    }
}

function jumpToWord(index) {
    const idx = parseInt(index) - 1;
    if (isNaN(idx) || idx < 0 || idx >= practiceWords.length) {
        showToast("请输入有效的索引序号", "warning");
        return;
    }
    currentPracticeWordIndex = idx;
    localStorage.setItem(PRACTICE_PROGRESS_KEY, currentPracticeWordIndex);
    loadCards();
    updatePracticeProgress();
    setBuffer("");
    update();
    focusHiddenInput();
    document.getElementById("practice-jump-input").value = "";
}

function exitPracticeMode() {
    isPracticeAnimating = false;
    setState(InputState.NORMAL);

    document.getElementById("output-card").style.display = "flex";
    document.getElementById("practice-container").style.display = "none";
    document.getElementById("practice-info-bar").style.display = "none";
    document.getElementById("practice-toolbar-left").style.display = "none";
    document.getElementById("toggle-pinyin-btn").style.display = "none";

    practiceCards.forEach((card) => {
        card.classList.remove("visible", "current", "incorrect");
        card.querySelector(".pinyin-display").textContent = "";
        card.querySelector(".hanzi-display").textContent = "";
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
        card.querySelector(".pinyin-display").textContent = "";
        card.querySelector(".hanzi-display").textContent = "";
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

    if (currentPracticeWordIndex + 1 < practiceWords.length) {
        const nextWord = practiceWords[currentPracticeWordIndex + 1];
        cardLeft.querySelector(".hanzi-display").textContent = getHanziChar(nextWord.hanzi);
        cardLeft.classList.add("visible");
    }
}

function showNextPracticeWord() {
    if (currentPracticeWordIndex >= practiceWords.length) {
        alert("练习完成! 🎉");
        localStorage.removeItem(PRACTICE_PROGRESS_KEY);
        exitPracticeMode();
        return;
    }
    updatePracticeProgress();
    loadCards();
    setBuffer("");
    update();
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
