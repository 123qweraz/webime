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
    document.getElementById("dict-modal").style.display = "flex";
    switchDictTab('chinese');
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
    }
}

function renderLanguageTab(lang) {
    const container = document.getElementById(`tab-${lang}`);
    const mainDicts = allDicts.filter(d => d.tag === lang && d.name !== "生僻字");
    const isEnabled = mainDicts.some(d => d.enabled);

    let html = `
        <div class="dict-card ${isEnabled ? 'enabled' : 'disabled'}">
            <div style="flex: 1;">
                <h4>${lang === 'chinese' ? '中文输入方案' : '日文输入方案'}</h4>
                <p style="font-size: 12px; color: #666; margin: 5px 0 0 0;">
                    ${lang === 'chinese' ? '包含一级字、二级字、词组、三四字词语及标点。' : '包含 N1-N5 词汇及假名。'}
                </p>
            </div>
            <button class="btn ${isEnabled ? '' : 'btn-action'}" onclick="toggleLanguageGroup('${lang}')">
                ${isEnabled ? '禁用方案' : '启用方案'}
            </button>
        </div>
    `;

    if (lang === 'chinese') {
        const rareDict = allDicts.find(d => d.name === "生僻字");
        const isRareEnabled = rareDict ? rareDict.enabled : false;
        html += `
            <div class="dict-card ${isRareEnabled ? 'enabled' : 'disabled'}" style="margin-top: 10px;">
                <div style="flex: 1;">
                    <h4>生僻字 (三级字库)</h4>
                    <p style="font-size: 12px; color: #666; margin: 5px 0 0 0;">包含更多低频汉字，开启后可能影响候选词排序。</p>
                </div>
                <button class="btn ${isRareEnabled ? '' : 'btn-action'}" onclick="toggleRareDict()">
                    ${isRareEnabled ? '禁用' : '启用'}
                </button>
            </div>
        `;
    }

    html += `<p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">内置词典已根据语义优先级自动排序</p>`;
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
    updatePracticeDictSelector();
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
        updatePracticeDictSelector();
    }
}

async function deleteDict(index) {
    if (allDicts[index].type === "built-in") return;
    if (confirm(`确定要删除词典 "${allDicts[index].name}" 吗？`)) {
        allDicts.splice(index, 1);
        saveDictConfig();
        await loadAllDicts();
        renderUserTab();
        updatePracticeDictSelector();
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

function updatePracticeDictSelector() {
    const selectEl = document.getElementById('practice-dict-select');
    if (!selectEl) return;

    const currentSelection = selectEl.value;
    selectEl.innerHTML = '';

    const enabledDicts = allDicts.filter(d => d.enabled && d.wordCount > 0);

    if (enabledDicts.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "无可用词典";
        selectEl.appendChild(option);
        return;
    }

    enabledDicts.forEach(dict => {
        const option = document.createElement('option');
        option.value = dict.path || dict.name;
        option.textContent = `练习: ${dict.name}`;
        selectEl.appendChild(option);
    });

    if (enabledDicts.some(d => (d.path || d.name) === currentSelection)) {
        selectEl.value = currentSelection;
    } else if (enabledDicts.length > 0) {
        selectEl.value = enabledDicts[0].path || enabledDicts[0].name;
    }
    
    selectEl.onchange = () => {
        settings.practice_dict_path = selectEl.value;
        saveSettings();
        showToast(`练习词典已切换`, 'info');
    };
    
    settings.practice_dict_path = selectEl.value;
    saveSettings();
}