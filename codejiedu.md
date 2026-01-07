
`index.html` 文件的完整运行逻辑和主要函数介绍：

这个 `index.html` 文件是一个**基于网页的拼音输入法**，它提供拼音转汉字、候选词选择、剪贴板历史、词典管理和汉字练习等功能。

### 1. 总体结构 (Overall Structure)

*   **HTML 结构:** 页面采用 `<div class="main-layout">` 作为主容器，包含顶部工具栏 (`.toolbar`) 和内容区域 (`.content-area`)。内容区域又分为左侧的剪贴板历史面板 (`.history-panel`)、中间的核心输入/输出区域 (`.center-container`)。中间区域由一个输出卡片 (`.output-card`) 和一个输入卡片 (`.input-card`) 组成，二者之间有一个垂直调整大小的分割线。此外，还有一个覆盖层用于加载提示 (`#loading-overlay`) 和一个词典设置模态框 (`#dict-modal`)。
*   **CSS 样式:** 页面使用现代、简洁的 UI 设计，通过 CSS 变量定义颜色主题，响应式布局，并为按钮、卡片、模态框等元素提供了样式。练习模式下的汉字卡片有独特的动画效果。
*   **JavaScript:** 这是核心功能实现部分，包含了大量的逻辑来处理用户输入、词典查找、UI 渲染、状态管理和事件处理。

### 2. 主要功能模块及运行逻辑

#### 2.1 词典管理和加载 (Dictionary Management and Loading)

*   **`BUILT_IN_DICTS`:** 页面顶部定义了一个常量数组，包含所有内置词典的元数据（名称、路径、是否启用、类型）。
*   **`allDicts`:** 一个全局数组，存储所有（内置和用户导入的）词典的配置信息，包括从 localStorage 加载的用户配置。
*   **`fuzzySearchTrie` (Trie 树):** 这是一个核心数据结构，用于高效地存储和查找拼音及其对应的汉字。所有启用的词典内容都会被加载并构建到这个 Trie 树中。
*   **`loadAllDicts()`:** 异步函数，负责：
    1.  从 `localStorage` 加载用户保存的词典配置。
    2.  根据 `allDicts` 数组中的配置，通过 `fetch` 请求加载每个词典的 JSON 文件。
    3.  将所有启用的词典数据合并并构建 `fuzzySearchTrie`，以便进行拼音查找。
    4.  更新词典的词汇计数 (`wordCount`)。
    5.  `DB` 对象（`pinyin_trie` 库的实例）负责 Trie 树的实际构建和查询。
*   **`saveDictConfig()`:** 将 `allDicts` 数组的当前状态（包括启用/禁用状态和顺序）保存到 `localStorage` 中，实现配置持久化。
*   **`openDictModal()`, `closeDictModal()`:** 控制词典管理模态框的显示与隐藏。
*   **`renderModalDicts()`:** 根据 `allDicts` 的数据，在模态框中渲染已启用和未启用的词典列表，并提供拖拽排序、启用/禁用、删除等操作按钮。
*   **`toggleDictStatus(index)`:** 切换指定索引词典的启用/禁用状态，并触发 `saveDictConfig()` 和 `loadAllDicts()` 以更新输入法。
*   **`moveDictUp(index)`, `moveDictDown(index)`:** 在 `allDicts` 数组中上下移动词典的顺序，影响查找优先级。
*   **`handleDictDrop()`, `handleDictCardKeyDown()`:** 处理词典在模态框中的拖拽排序和键盘移动操作。
*   **`deleteDict(index)`:** 删除用户导入的词典（内置词典不可删除）。
*   **`handleImport(input)`:** 处理用户通过文件输入框导入新的 JSON 词典文件。

#### 2.2 核心输入法逻辑 (Core Input Method Logic)

*   **`InputState` (枚举):** 定义了输入法的几种状态：`NORMAL` (正常输入), `CANDIDATE_SELECT` (候选词选择), `EDIT` (输出区编辑), `CORRECTION` (修正模式), `PRACTICE` (练习模式)。
*   **`buffer`:** 全局变量，存储用户当前输入的拼音字符串。
*   **`committed`:** 全局变量，存储已经上屏的汉字内容。
*   **`outputArea`:** 显示最终上屏汉字的区域 (内容可编辑的 `div`)。
*   **`mainCandidates`:** 显示候选词的区域。
*   **`hiddenInput`:** 一个隐藏的 `<input>` 元素，用于捕获用户的实际键盘输入，避免浏览器默认行为干扰。
*   **`handleInput(e)`:** 这是核心的键盘事件处理函数，监听 `keydown` 事件：
    *   根据当前 `currentState` 处理不同逻辑。
    *   在 `NORMAL` 状态下，将输入的字母添加到 `buffer`，并调用 `update()` 更新候选词。
    *   处理 `Backspace`、`Space` (上屏或翻页)、`Enter` (上屏或切换修正模式)、数字键 (选择候选词) 等。
    *   在 `CANDIDATE_SELECT` 状态下，根据数字键选择候选词，或按 `Backspace` 返回。
    *   在 `CORRECTION` 状态下，处理修正输入框的 `Enter` (转换并上屏) 和 `Esc` (取消) 事件。
*   **`update()`:** 输入法每次状态或缓冲区改变时都会调用此函数来刷新 UI：
    *   根据 `buffer` 的内容，使用 `DB` (Trie 树) 进行拼音查找，获取候选词。
    *   分页显示候选词 (`mainCandidates`)。
    *   更新 `bufferDisplay` 和 `pageCounter`。
    *   在 `PRACTICE` 模式下，更新 `practiceInputDisplay` 显示当前输入。
*   **`commitCandidate(candidate)`:** 将选定的候选词上屏到 `committed` 变量，并清空 `buffer`，然后调用 `update()`。
*   **`setBuffer(value)`:** 设置 `buffer` 的值，并同步更新 `hiddenInput` 的值。
*   **`syncFromEditor()`:** 当 `outputArea` 处于编辑模式时，将 `outputArea` 的内容同步回 `committed` 变量。

#### 2.3 练习模式逻辑 (Practice Mode Logic)

*   **`PRACTICE_DICT_NAME`:** 定义用于练习模式的词典名称（例如 "一级字"）。
*   **`practiceWords`:** 存储从练习词典中加载和打乱后的汉字/拼音对。
*   **`currentPracticeWordIndex`:** 当前练习的词语在 `practiceWords` 数组中的索引。
*   **`initPracticeModeData()`:**
    1.  查找并加载名为 `PRACTICE_DICT_NAME` 的词典。
    2.  将词典中的所有汉字/拼音对提取到 `practiceWords` 数组中。
    3.  打乱 `practiceWords` 数组的顺序。
    4.  存储练习进度到 `localStorage` (`PRACTICE_PROGRESS_KEY`)。
*   **`startPracticeMode()`:**
    1.  如果 `practiceWords` 为空，则调用 `initPracticeModeData()` 初始化练习数据。
    2.  将 `currentState` 设置为 `InputState.PRACTICE`。
    3.  从 `localStorage` 加载上次的练习进度。
    4.  更新进度条 (`#progress-bar`)。
    5.  隐藏正常输入界面，显示练习模式的卡片区域 (`#practice-container`)。
    6.  调用 `loadCards()` 初始加载练习卡片。
    7.  切换工具栏中练习模式按钮的显示状态。
*   **`exitPracticeMode()`:**
    1.  将 `currentState` 恢复为 `InputState.NORMAL`。
    2.  隐藏练习模式界面，显示正常输入界面。
    3.  清除练习卡片内容和状态。
    4.  清除进度条和 `localStorage` 中的练习进度。
    5.  切换工具栏按钮状态。
*   **`loadCards()`:** 首次进入练习模式时，加载最初的三个卡片（左侧预备、中间当前、右侧空）。
*   **`showNextPracticeWord()`:**
    1.  在用户完成一个词语的练习后，更新 `currentPracticeWordIndex`。
    2.  根据 `currentPracticeWordIndex` 更新左、中、右三个练习卡片的内容，实现卡片滑动的视觉效果。
    3.  更新进度条。
    4.  如果所有词语练习完毕，则弹出完成提示并退出练习模式。

#### 2.4 剪贴板历史 (Clipboard History)

*   **`HISTORY`:** 全局数组，存储剪贴板历史记录。
*   **`saveHistory()`:** 将 `HISTORY` 数组保存到 `localStorage`，并限制历史记录数量。
*   **`loadHistory()`:** 从 `localStorage` 加载历史记录到 `HISTORY` 数组。
*   **`toggleHistoryPanel()`:** 切换剪贴板历史面板的显示/隐藏，并保存其状态到 `settings`。
*   **`updateHistoryUI(historyItems)`:** 渲染剪贴板历史列表 (`#historyList`)，显示时间、文本和删除按钮。点击历史项可将其内容重新插入输出区。
*   **`clearHistory()`:** 清空所有剪贴板历史记录。
*   **`deleteHistoryItem(index)`:** 删除指定索引的剪贴板历史项。
*   **`archiveAndCopy()`:** 将 `committed` 变量中的内容复制到系统剪贴板，并将其保存到 `HISTORY` 中，然后清空 `committed`。

#### 2.5 用户界面和反馈 (UI and Feedback)

*   **`toggleEditMode()`:** 切换输出区域 (`#output-area`) 的编辑/锁定模式。在编辑模式下，`outputArea` 变为 `contentEditable`。
*   **`focusHiddenInput()`:** 将焦点设置到隐藏的输入框 (`#hidden-input`)，确保键盘输入被捕获。
*   **`showToast(message, type, duration)`:** 显示短暂的、非侵入性的提示信息（成功、错误、警告、信息）。
*   **`showErrorMessage(message, error)`:** 显示错误消息，并使用 `showToast` 和在输出区域添加错误提示。
*   **`showLoadingMessage(message)`, `hideLoadingMessage()`:** 控制加载动画和提示 (`#loading-overlay`) 的显示与隐藏。
*   **调整器 (Resizer):** 页面中包含水平 (`#left-resizer`) 和垂直 (`#center-v-resizer`) 调整器，允许用户调整面板和卡片的大小。相关的 JavaScript 逻辑（在代码的底部）负责处理鼠标拖拽事件来实现这些调整功能。

### 3. 事件监听器 (Event Listeners)

*   **`DOMContentLoaded`:** 页面加载完成后初始化输入法，包括加载设置、历史、词典等。
*   **`keydown` (在 `hidden-input` 上):** 核心输入处理，如上述 `handleInput` 函数所述。
*   **`click` (在候选词、历史项、词典卡片等):** 处理 UI 元素的交互。
*   **`onchange` (在文件输入框):** 处理词典文件导入。
*   **`oninput` (在 `output-area`):** 处理输出区域内容编辑时的同步。
*   **`dragstart`, `dragover`, `dragleave`, `drop`, `dragend`:** 处理词典卡片的拖拽排序。
*   **`resize` (在 `window` 对象):** 调整页面布局或响应式元素大小。

### 总结

`index.html` 实现了一个功能丰富的网页拼音输入法。其核心逻辑围绕 `fuzzySearchTrie` 构建，通过 `handleInput` 监听用户键盘输入，动态生成候选词。`update` 函数负责刷新界面。此外，它还提供了用户自定义词典、汉字练习、剪贴板历史等辅助功能，通过 `localStorage` 实现了用户配置和数据的持久化。整体设计考虑了用户体验，包含了加载提示、Toast 消息、模态框等交互元素。
