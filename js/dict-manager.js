let allDicts = [];

function loadDictConfig() {
    const storedDicts = JSON.parse(localStorage.getItem(DICTS_CONFIG_KEY)) || [];
    
    // Separate user dicts (preserve them always)
    const userDicts = storedDicts.filter(d => d.type === 'user');
    
    // Rebuild built-in dicts from latest config (source of truth for paths/names)
    // but try to restore 'enabled' state from storage if name matches.
    const mergedBuiltIns = BUILT_IN_DICTS.map(builtIn => {
        // Try to find a matching entry in stored dicts to restore preference
        // We match by Name, because Path might have changed (e.g. English case fix)
        const match = storedDicts.find(d => 
            d.type === 'built-in' && 
            (d.name === builtIn.name || 
             // Legacy support for renamed dicts
             (builtIn.name === "生僻字" && d.name === "三级字"))
        );
        
        if (match) {
            // Keep the new configuration (path, priority, etc.) but restore enabled state
            return {
                ...builtIn,
                enabled: match.enabled
            };
        } else {
            // New dictionary found in config
            return { ...builtIn };
        }
    });
    
    // Combine and save
    allDicts = [...mergedBuiltIns, ...userDicts];
    
    // Always save to clean up obsolete built-ins (zombies) from storage
    saveDictConfig();
}

function saveDictConfig() {
    localStorage.setItem(DICTS_CONFIG_KEY, JSON.stringify(allDicts));
    saveSettings();
}

function openSettingsSidebar() {
    const isPractice = (currentState === InputState.PRACTICE);
    const practiceTabBtn = document.getElementById("tab-btn-practice");
    const sidebarTitle = document.querySelector("#settings-sidebar h3");
    
    // Only show practice tab when in practice mode
    if (practiceTabBtn) {
        practiceTabBtn.style.display = isPractice ? "block" : "none";
    }
    
    if (sidebarTitle) {
        sidebarTitle.textContent = isPractice ? "练习词典与章节" : "词典方案设置";
    }
    
    document.getElementById("settings-sidebar").classList.add("open");
    document.getElementById("settings-sidebar-backdrop").classList.add("active");
    
    if (isPractice) {
        switchDictTab('practice');
    } else {
        switchDictTab('chinese');
    }
}

function closeSettingsSidebar() {
    document.getElementById("settings-sidebar").classList.remove("open");
    document.getElementById("settings-sidebar-backdrop").classList.remove("active");
}

async function switchDictTab(tabName) {
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    if (tabName === 'chinese' || tabName === 'japanese') {
        renderLanguageTab(tabName);
    } else if (tabName === 'user') {
        renderUserTab();
    } else if (tabName === 'settings') {
        renderSettingsTab();
    } else if (tabName === 'practice') {
        renderPracticeTab();
    }
}

// Helper function to check if a dictionary is a subject dict
function isSubjectDict(d) {
    const subjectNames = ["数学名词", "物理名词", "化学名词", "生物名词", "历史名词", "地理名词", "政治经济", "英语语法", "计算机名词"];
    return subjectNames.includes(d.name);
}

function isEnglishDict(d) {
    return d.name === "常用英语 (短)" || d.name === "常用英语 (长)";
}

function renderLanguageTab(lang) {
    const container = document.getElementById(`tab-${lang}`);
    const mainDicts = allDicts.filter(d => d.tag === lang && d.name !== "生僻字" && !isSubjectDict(d) && !isEnglishDict(d));
    const isEnabled = mainDicts.some(d => d.enabled);
    
    let title = '';
    let desc = '';
    if (lang === 'chinese') {
        title = '中文全能方案';
        desc = '最完善的中文输入体验，支持词组与智能联想。';
    } else if (lang === 'japanese') {
        title = '日文语境方案';
        desc = '包含完整的假名与 N1-N5 级别常用词汇。';
    }
    
    let html = `
        <div class="dict-card ${isEnabled ? 'enabled' : 'disabled'}" style="border-left: 4px solid var(--primary); padding: 20px;">
            <div style="flex: 1;">
                <h4 style="margin: 0; font-size: 18px;">${title}</h4>
                <p style="font-size: 13px; color: var(--text-sec); margin: 8px 0;">
                    ${desc}
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;">
                    ${mainDicts.map(d => `<span style="font-size: 10px; background: var(--bg); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">${d.name}</span>`).join('')}
                </div>
            </div>
            <button class="btn btn-action" onclick="toggleLanguageGroup('${lang}')" style="min-width: 100px; justify-content: center;">
                ${isEnabled ? '已启用' : '启用方案'}
            </button>
        </div>
    `;
    
    if (lang === 'chinese') {
        const rareDict = allDicts.find(d => d.name === "生僻字");
        const isRareEnabled = rareDict ? rareDict.enabled : false;
        
        const subjectDicts = allDicts.filter(d => isSubjectDict(d));
        const isSubjectEnabled = subjectDicts.some(d => d.enabled);
        
        const englishDicts = allDicts.filter(d => isEnglishDict(d));
        const isEnglishEnabled = englishDicts.some(d => d.enabled);
        
        html += `
            <div class="practice-section-title" style="margin-top: 25px;">扩展选项</div>
            <div class="dict-card ${isRareEnabled ? 'enabled' : 'disabled'}">
                <div style="flex: 1;">
                    <h4 style="margin: 0;">生僻字库</h4>
                    <p style="font-size: 12px; color: var(--text-sec); margin: 4px 0;">包含三级字库等极低频汉字。</p>
                </div>
                <button class="btn btn-action" onclick="toggleRareDict()">
                    ${isRareEnabled ? '禁用' : '启用'}
                </button>
            </div>
            
            <div class="dict-card ${isSubjectEnabled ? 'enabled' : 'disabled'}">
                <div style="flex: 1;">
                    <h4 style="margin: 0;">专业学科词库</h4>
                    <p style="font-size: 12px; color: var(--text-sec); margin: 4px 0;">包含数学、物理、计算机等学科名词。</p>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                        ${subjectDicts.map(d => `<span style="font-size: 9px; background: var(--bg); padding: 1px 6px; border-radius: 3px; border: 1px solid var(--border);">${d.name}</span>`).join('')}
                    </div>
                </div>
                <button class="btn btn-action" onclick="toggleSubjectGroup()">
                    ${isSubjectEnabled ? '禁用' : '启用'}
                </button>
            </div>
            
            <div class="dict-card ${isEnglishEnabled ? 'enabled' : 'disabled'}">
                <div style="flex: 1;">
                    <h4 style="margin: 0;">英语词汇提示</h4>
                    <p style="font-size: 12px; color: var(--text-sec); margin: 4px 0;">在中文输入模式下提供英语单词补全。</p>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                        ${englishDicts.map(d => `<span style="font-size: 9px; background: var(--bg); padding: 1px 6px; border-radius: 3px; border: 1px solid var(--border);">${d.name}</span>`).join('')}
                    </div>
                </div>
                <button class="btn btn-action" onclick="toggleEnglishGroup()">
                    ${isEnglishEnabled ? '禁用' : '启用'}
                </button>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

async function toggleLanguageGroup(lang) {
    const mainDicts = allDicts.filter(d => d.tag === lang && d.name !== "生僻字" && !isSubjectDict(d) && !isEnglishDict(d));
    const currentlyEnabled = mainDicts.some(d => d.enabled);
    const targetState = !currentlyEnabled;
    
    allDicts.forEach(dict => {
        if (dict.tag === lang && dict.name !== "生僻字" && !isSubjectDict(dict) && !isEnglishDict(dict)) {
            dict.enabled = targetState;
        }
    });
    
    let langName = '中文';
    if (lang === 'japanese') langName = '日文';
    
    saveDictConfig();
    showLoadingMessage(`正在${targetState ? '开启' : '关闭'}${langName}方案...`);
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

async function toggleSubjectGroup() {
    const subjectDicts = allDicts.filter(d => isSubjectDict(d));
    const currentlyEnabled = subjectDicts.some(d => d.enabled);
    const targetState = !currentlyEnabled;
    
    subjectDicts.forEach(d => d.enabled = targetState);
    
    saveDictConfig();
    showLoadingMessage(`正在${targetState ? '开启' : '关闭'}专业学科词库...`);
    await loadAllDicts();
    hideLoadingMessage();
    renderLanguageTab('chinese');
}

async function toggleEnglishGroup() {
    const englishDicts = allDicts.filter(d => isEnglishDict(d));
    const currentlyEnabled = englishDicts.some(d => d.enabled);
    const targetState = !currentlyEnabled;
    
    englishDicts.forEach(d => d.enabled = targetState);
    
    saveDictConfig();
    showLoadingMessage(`正在${targetState ? '开启' : '关闭'}英语词汇提示...`);
    await loadAllDicts();
    hideLoadingMessage();
    renderLanguageTab('chinese');
}

// Function to toggle a single dictionary
async function toggleSingleDict(path) {
    const dict = allDicts.find(d => d.path === path);
    if (dict) {
        dict.enabled = !dict.enabled;
        saveDictConfig();
        showLoadingMessage(`正在${dict.enabled ? '开启' : '关闭'}${dict.name}...`);
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
                        <button class="btn btn-sm btn-action" onclick="toggleDictStatus(${actualIndex})">
                            ${dict.enabled ? '禁用' : '启用'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDict(${actualIndex})">删除</button>
                    </div>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    
    // Data Backup Section
    html += `
        <div style="margin-top: 30px; border-top: 1px solid var(--border); padding-top: 20px;">
            <div class="practice-section-title">数据备份与恢复</div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-action" onclick="exportBackup()" style="flex: 1; justify-content: center;">
                    📤 导出备份
                </button>
                <button class="btn" onclick="document.getElementById('backup-file-input').click()" style="flex: 1; justify-content: center; background: var(--bg); border: 1px solid var(--border);">
                    📥 恢复备份
                </button>
                <input type="file" id="backup-file-input" style="display: none" onchange="importBackup(this)" />
            </div>
            <p style="font-size: 11px; color: var(--text-sec); margin-top: 8px;">
                包含：设置、用户词典、词频数据、历史记录及练习进度。
            </p>
        </div>
    `;

    // Danger Zone
    html += `
        <div style="margin-top: 40px; border-top: 1px solid var(--border); padding-top: 20px;">
            <div class="practice-section-title" style="color: var(--danger);">危险区域</div>
            <div class="dict-card" style="border-color: var(--danger); background: rgba(255, 59, 48, 0.05);">
                <div style="flex: 1;">
                    <h4 style="margin: 0; color: var(--danger);">重置应用</h4>
                    <p style="font-size: 12px; color: var(--text-sec); margin: 4px 0;">清除所有数据（词典、历史、设置）并刷新。</p>
                </div>
                <button class="btn btn-danger" onclick="resetApplication()">重置</button>
            </div>
        </div>
    `;
    
    html += `</div>`;
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
                <p style="color: var(--text-sec); margin-bottom: 20px;">请先在"中文"、"日语"或"用户"标签页中启用需要练习的词典</p>
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
        closeSettingsSidebar();
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

function renderSettingsTab() {
    const container = document.getElementById('tab-settings');
    
    let html = `
        <div class="practice-section-title">常规设置</div>
        <div class="dict-card" style="display: block;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0;">
                <div style="flex: 1; padding-right: 10px;">
                    <div style="font-weight: 500;">动态词频</div>
                    <div style="font-size: 11px; color: var(--text-sec); margin-top: 2px;">根据使用习惯自动调整候选词顺序</div>
                </div>
                <label class="switch">
                    <input type="checkbox" ${settings.dynamicFreq ? 'checked' : ''} onchange="toggleSetting('dynamicFreq')">
                    <span class="slider round"></span>
                </label>
            </div>
        </div>

        <div class="practice-section-title">模糊音设置 (Fuzzy Pinyin)</div>
        <div class="dict-card" style="display: block;">
            <div style="padding-bottom: 10px; border-bottom: 1px solid var(--border); margin-bottom: 10px;">
                <p style="font-size: 13px; color: var(--text-sec);">启用模糊音后，输入声母或韵母时会自动匹配相似发音。例如启用 "z-zh" 后，输入 "z" 也会匹配 "zh"。</p>
            </div>
    `;

    const fuzzyOptions = [
        { key: 'z_zh', label: 'z ↔ zh' },
        { key: 'c_ch', label: 'c ↔ ch' },
        { key: 's_sh', label: 's ↔ sh' },
        { key: 'n_ng', label: 'n ↔ ng' } // This usually means an/ang, en/eng, in/ing
    ];

    fuzzyOptions.forEach(opt => {
        const isEnabled = settings.fuzzy && settings.fuzzy[opt.key];
        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0;">
                <span style="font-weight: 500;">${opt.label}</span>
                <label class="switch">
                    <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="toggleFuzzy('${opt.key}')">
                    <span class="slider round"></span>
                </label>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function toggleFuzzy(key) {
    if (!settings.fuzzy) settings.fuzzy = {};
    settings.fuzzy[key] = !settings.fuzzy[key];
    saveSettings();
    renderSettingsTab();
}

function toggleSetting(key) {
    settings[key] = !settings[key];
    saveSettings();
    renderSettingsTab();
}

function exportBackup() {
    const backup = {
        settings: JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"),
        dictsConfig: JSON.parse(localStorage.getItem(DICTS_CONFIG_KEY) || "[]"),
        userFreq: JSON.parse(localStorage.getItem("ime_user_freq") || "{}"),
        history: JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"),
        practiceProgress: JSON.parse(localStorage.getItem(PRACTICE_PROGRESS_KEY) || "{}"),
        timestamp: Date.now()
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webime_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("备份已导出", "success");
}

function importBackup(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (!confirm("恢复备份将覆盖当前的设置、词典配置和历史记录。\n确定要继续吗？")) {
        input.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const backup = JSON.parse(e.target.result);
            if (backup.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.settings));
            if (backup.dictsConfig) localStorage.setItem(DICTS_CONFIG_KEY, JSON.stringify(backup.dictsConfig));
            if (backup.userFreq) localStorage.setItem("ime_user_freq", JSON.stringify(backup.userFreq));
            if (backup.history) localStorage.setItem(HISTORY_KEY, JSON.stringify(backup.history));
            if (backup.practiceProgress) localStorage.setItem(PRACTICE_PROGRESS_KEY, JSON.stringify(backup.practiceProgress));
            
            showToast("备份恢复成功，即将刷新...", "success");
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error("恢复备份失败:", error);
            showToast("恢复失败，文件格式错误", "error");
        }
    };
    reader.readAsText(file);
    input.value = "";
}