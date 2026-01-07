let allDicts = [];
let draggedDictIndex = null;

function loadDictConfig() {
    const storedDicts = JSON.parse(localStorage.getItem(DICTS_CONFIG_KEY));
    if (storedDicts && storedDicts.length > 0) {
        allDicts = storedDicts;
        BUILT_IN_DICTS.forEach((builtInDict) => {
            if (!allDicts.find((d) => d.path === builtInDict.path && d.type === builtInDict.type)) {
                allDicts.push(builtInDict);
            }
        });
    } else {
        allDicts = [...BUILT_IN_DICTS];
    }
}

function saveDictConfig() {
    localStorage.setItem(DICTS_CONFIG_KEY, JSON.stringify(allDicts));
    saveSettings();
}

function openDictModal() {
    document.getElementById("dict-modal").style.display = "flex";
    switchDictTab('chinese'); // Default to Chinese tab
}

function closeDictModal() {
    document.getElementById("dict-modal").style.display = "none";
}

async function switchDictTab(tabName) {
    // Update tab UI
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
    const isEnabled = allDicts.some(d => d.tag === lang && d.enabled);
    
    container.innerHTML = `
        <div class="language-toggle-card">
            <div>
                <h4>${lang === 'chinese' ? '中文输入方案' : '日文输入方案'}</h4>
                <p style="font-size: 12px; color: #666; margin: 5px 0 0 0;">
                    ${lang === 'chinese' ? '包含一级字、二级字、词组、三四字词语及标点。' : '包含 N1-N5 词汇及假名。'}
                </p>
            </div>
            <button class="btn ${isEnabled ? 'active' : ''}" onclick="toggleLanguageGroup('${lang}')">
                ${isEnabled ? '已启用' : '点击启用'}
            </button>
        </div>
        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
            内置词典已根据语义优先级自动排序
        </p>
    `;
}

function renderUserTab() {
    const container = document.getElementById('tab-user');
    const userDicts = allDicts.filter(d => d.type === 'user');
    
    let html = `
        <div class="import-section">
            <input type="file" id="dict-file-input" style="display: none" onchange="handleImport(this)" />
            <button class="btn btn-action" onclick="document.getElementById('dict-file-input').click()" style="width: 100%; justify-content: center;">
                导入新词典 (.json)
            </button>
        </div>
        <div class="dict-sections">
            <h4>用户词典</h4>
            <div id="user-dict-list" class="dict-list">
    `;

    if (userDicts.length === 0) {
        html += `<p style="color: #999; text-align: center; padding: 20px;">暂无用户词典</p>`;
    } else {
        userDicts.forEach((dict, index) => {
            const actualIndex = allDicts.indexOf(dict);
            html += `
                <div class="dict-card">
                    <span class="dict-card-name">${dict.name} (${dict.wordCount || 0} 词)</span>
                    <div class="dict-card-actions">
                        <button class="btn btn-sm" onclick="toggleDictStatus(${actualIndex})">
                            ${dict.enabled ? '禁用' : '启用'}
                        </button>
                        <button class="btn btn-sm delete" onclick="deleteDict(${actualIndex})">删除</button>
                    </div>
                </div>
            `;
        });
    }

    html += `</div></div>`;
    container.innerHTML = html;
}

async function toggleLanguageGroup(lang) {
    const otherLang = lang === 'chinese' ? 'japanese' : 'chinese';
    const isEnabling = !allDicts.some(d => d.tag === lang && d.enabled);

    allDicts.forEach(dict => {
        if (dict.tag === lang) {
            dict.enabled = isEnabling;
        } else if (dict.tag === otherLang && isEnabling) {
            dict.enabled = false; // Disable other language when enabling this one
        }
    });

    saveDictConfig();
    await loadAllDicts();
    renderLanguageTab(lang);
    updatePracticeDictSelector();
    showToast(`${lang === 'chinese' ? '中文' : '日文'}词典已${isEnabling ? '启用' : '禁用'}`, "info");
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
