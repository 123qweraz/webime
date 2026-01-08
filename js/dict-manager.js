let allDicts = [];

function loadDictConfig() {
    const storedDicts = JSON.parse(localStorage.getItem(DICTS_CONFIG_KEY));
    if (storedDicts && storedDicts.length > 0) {
        allDicts = storedDicts;
        BUILT_IN_DICTS.forEach((builtInDict) => {
            const existing = allDicts.find((d) => d.path === builtInDict.path && d.type === builtInDict.type);
            if (!existing) {
                allDicts.push(builtInDict);
            } else {
                existing.tag = builtInDict.tag;
                if (builtInDict.name === "三级字" || builtInDict.name === "生僻字") {
                    existing.name = "生僻字";
                }
            }
        });
    } else {
        allDicts = JSON.parse(JSON.stringify(BUILT_IN_DICTS));
    }
}

function saveDictConfig() {
    localStorage.setItem(DICTS_CONFIG_KEY, JSON.stringify(allDicts));
    saveSettings();
}

function openDictModal() {
    const isPractice = (currentState === InputState.PRACTICE);
    const practiceTabBtn = document.getElementById("tab-btn-practice");
    const modalTitle = document.querySelector("#dict-modal h3");
    
    // Only show practice tab when in practice mode
    if (practiceTabBtn) {
        practiceTabBtn.style.display = isPractice ? "block" : "none";
    }

    if (modalTitle) {
        modalTitle.textContent = isPractice ? "练习词典与章节" : "词典方案设置";
    }

    document.getElementById("dict-modal").style.display = "flex";
    
    if (isPractice) {
        switchDictTab('practice');
    } else {
        switchDictTab('chinese');
    }
}

function closeDictModal() {
    document.getElementById("dict-modal").style.display = "none";
}

async function switchDictTab(tabName) {
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });

    if (tabName === 'chinese' || tabName === 'japanese') {
        renderLanguageTab(tabName);
    } else if (tabName === 'user') {
        renderUserTab();
    } else if (tabName === 'practice') {
        renderPracticeTab();
    }
}

function renderLanguageTab(lang) {
    const container = document.getElementById(`tab-${lang}`);
    const mainDicts = allDicts.filter(d => d.tag === lang && d.name !== "生僻字");
    const isEnabled = mainDicts.some(d => d.enabled);

    let html = `
        <div class="dict-card ${isEnabled ? 'enabled' : 'disabled'}" style="border-left: 4px solid var(--primary); padding: 20px;">
            <div style="flex: 1;">
                <h4 style="margin: 0; font-size: 18px;">${lang === 'chinese' ? '中文全能方案' : '日文语境方案'}</h4>
                <p style="font-size: 13px; color: var(--text-sec); margin: 8px 0;">
                    ${lang === 'chinese' ? '最完善的中文输入体验，支持词组与智能联想。' : '包含完整的假名与 N1-N5 级别常用词汇。'}
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;">
                    ${mainDicts.map(d => `<span style="font-size: 10px; background: var(--bg); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">${d.name}</span>`).join('')}
                </div>
            </div>
            <button class="btn ${isEnabled ? '' : 'btn-action'}" onclick="toggleLanguageGroup('${lang}')" style="min-width: 100px; justify-content: center;">
                ${isEnabled ? '已启用' : '启用方案'}
            </button>
        </div>
    `;

    if (lang === 'chinese') {
        const rareDict = allDicts.find(d => d.name === "生僻字");
        const isRareEnabled = rareDict ? rareDict.enabled : false;
        html += `
            <div class="practice-section-title" style="margin-top: 25px;">扩展选项</div>
            <div class="dict-card ${isRareEnabled ? 'enabled' : 'disabled'}">
                <div style="flex: 1;">
                    <h4 style="margin: 0;">生僻字库</h4>
                    <p style="font-size: 12px; color: var(--text-sec); margin: 4px 0;">包含三级字库等极低频汉字。</p>
                </div>
                <button class="btn ${isRareEnabled ? '' : 'btn-action'}" onclick="toggleRareDict()">
                    ${isRareEnabled ? '禁用' : '启用'}
                </button>
            </div>
        `;
    }

    container.innerHTML = html;
}

async function toggleLanguageGroup(lang) {
    const mainDicts = allDicts.filter(d => d.tag === lang && d.name !== "生僻字");
    const currentlyEnabled = mainDicts.some(d => d.enabled);
    const targetState = !currentlyEnabled;

    allDicts.forEach(dict => {
        if (dict.tag === lang && dict.name !== "生僻字") {
            dict.enabled = targetState;
        }
    });

    saveDictConfig();
    showLoadingMessage(`正在${targetState ? '开启' : '关闭'}${lang === 'chinese' ? '中文' : '日文'}方案...`);
    await loadAllDicts();
    hideLoadingMessage();
    
    renderLanguageTab(lang);
}

async function toggleRareDict() {
    const rareDict = allDicts.find(d => d.name === "生僻字");
    if (rareDict) {
        rareDict.enabled = !rareDict.enabled;
        saveDictConfig();
        showLoadingMessage(`正在${rareDict.enabled ? '开启' : '关闭'}生僻字库...`);
        await loadAllDicts();
        hideLoadingMessage();
        renderLanguageTab('chinese');
    }
}

function renderUserTab() {
    const container = document.getElementById('tab-user');
    const userDicts = allDicts.filter(d => d.type === 'user');
    
    let html = `
        <div class="import-section" style="margin-bottom: 20px;">
            <input type="file" id="dict-file-input" style="display: none" onchange="handleImport(this)" />
            <button class="btn btn-action" onclick="document.getElementById('dict-file-input').click()" style="width: 100%; justify-content: center;">
                导入新词典 (.json)
            </button>
        </div>
        <div class="dict-sections">
            <h4 style="margin-bottom: 10px;">用户词典</h4>
            <div id="user-dict-list" class="dict-list">
    `;

    if (userDicts.length === 0) {
        html += `<p style="color: #999; text-align: center; padding: 20px;">暂无用户词典</p>`;
    } else {
        userDicts.forEach((dict) => {
            const actualIndex = allDicts.indexOf(dict);
            html += `
                <div class="dict-card ${dict.enabled ? 'enabled' : 'disabled'}">
                    <span class="dict-card-name">${dict.name} (${dict.wordCount || 0} 词)</span>
                    <div class="dict-card-actions">
                        <button class="btn btn-sm" onclick="toggleDictStatus(${actualIndex})">
                            ${dict.enabled ? '禁用' : '启用'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDict(${actualIndex})">删除</button>
                    </div>
                </div>
            `;
        });
    }

    html += `</div></div>`;
    container.innerHTML = html;
}

async function toggleDictStatus(index) {
    if (allDicts[index]) {
        allDicts[index].enabled = !allDicts[index].enabled;
        saveDictConfig();
        await loadAllDicts();
        renderUserTab();
    }
}

async function deleteDict(index) {
    if (allDicts[index].type === "built-in") return;
    if (confirm(`确定要删除词典 "${allDicts[index].name}" 吗？`)) {
        allDicts.splice(index, 1);
        saveDictConfig();
        await loadAllDicts();
        renderUserTab();
    }
}

function renderPracticeTab() {
    const container = document.getElementById('tab-practice');
    const enabledDicts = allDicts.filter(d => d.enabled && (d.wordCount > 0 || d.type === 'built-in'));
    const currentPath = settings.practice_dict_path;

    if (enabledDicts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <p style="color: var(--text-sec); margin-bottom: 20px;">请先在“中文”、“日语”或“用户”标签页中启用需要练习的词典</p>
                <button class="btn" onclick="switchDictTab('chinese')">前往启用词典</button>
            </div>
        `;
        return;
    }

    let html = `
        <div class="practice-tab-container">
            <div class="practice-section-title">选择练习方案</div>
            <div class="practice-dict-grid">
    `;

    const groups = [
        { tag: 'chinese', title: '中文词典' },
        { tag: 'japanese', title: '日文词典' },
        { tag: 'user', title: '用户词典' }
    ];

    enabledDicts.forEach(dict => {
        const path = dict.path || dict.name;
        const isActive = path === currentPath;
        html += `
            <div class="practice-dict-item ${isActive ? 'active' : ''}" onclick="selectPracticeDict('${path}')">
                <div class="practice-dict-name">${dict.name}</div>
                <div class="practice-dict-count">${dict.wordCount || 0} 词</div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

function selectPracticeDict(path) {
    settings.practice_dict_path = path;
    settings.practice_chapter = null; // Reset chapter when dict changes
    saveSettings();
    renderPracticeTab();
    
    if (typeof restartPracticeMode === 'function') {
        restartPracticeMode();
    }
    
    if (currentState === InputState.PRACTICE) {
        closeDictModal();
    }
}

async function handleImport(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const content = JSON.parse(e.target.result);
            const newDict = {
                name: file.name.replace(".json", ""),
                enabled: true,
                type: "user",
                tag: "user",
                content: JSON.stringify(content),
            };
            allDicts.push(newDict);
            saveDictConfig();
            await loadAllDicts();
            renderUserTab();
            showToast(`已导入词典: ${newDict.name}`, "success");
        } catch (error) {
            console.error("导入词典失败:", error);
            showToast("导入失败，请检查文件格式", "error");
        }
    };
    reader.readAsText(file);
    input.value = "";
}