const BUILT_IN_DICTS = [
    {
        name: "常用字 (新)",
        path: "dicts/chinese_new/chars/chars.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        category: "character",
        priority: 100,
    },
    {
        name: "二级字 (新)",
        path: "dicts/chinese_new/chars/level2.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        category: "character",
        priority: 80,
    },
    {
        name: "三级字 (新)",
        path: "dicts/chinese_new/chars/level3.json",
        enabled: false,
        type: "built-in",
        tag: "chinese",
        category: "character",
        priority: 70,
    },
    {
        name: "核心词组",
        path: "dicts/chinese_new/words/words.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        category: "vocabulary",
        priority: 95,
    },
    {
        name: "新词扩展",
        path: "dicts/chinese_new/words/new_words.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        category: "vocabulary",
        priority: 90,
    },
    {
        name: "简拼词典",
        path: "dicts/chinese_new/words/words_jianpin.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        category: "vocabulary",
        priority: 88,
    },
    {
        name: "姓名",
        path: "dicts/chinese_new/words/capital_word/name.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        category: "vocabulary",
        priority: 85,
    },
    {
        name: "地名",
        path: "dicts/chinese_new/words/capital_word/place.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        category: "vocabulary",
        priority: 85,
    },
    {
        name: "常用英语 (短)",
        path: "dicts/chinese/english/dict_enlt5s.json",
        enabled: false,
        type: "built-in",
        tag: "chinese",
        category: "english",
        priority: 20,
    },
    {
        name: "常用英语 (长)",
        path: "dicts/chinese/english/dict_5_10s.json",
        enabled: false,
        type: "built-in",
        tag: "chinese",
        category: "english",
        priority: 20,
    },
    {
        name: "常用单字快捷",
        path: "dicts/chinese/other/dict_single.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        category: "other",
        priority: 95,
    },
    {
        name: "Emoji 表情",
        path: "dicts/chinese/other/dict_emoji.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        category: "other",
        priority: 85,
    },
    {
        name: "标点符号",
        path: "dicts/chinese/other/punctuation.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        category: "other",
        priority: 40,
    },
    {
        name: "kana",
        path: "dicts/japanese/kana.json",
        enabled: false,
        type: "built-in",
        tag: "japanese",
        priority: 10,
    },
];

const InputState = {
    NORMAL: "normal",
    PRACTICE: "practice",
    EDIT: "edit",
    CORRECTION: "correction",
    TAB: "tab",
    EN: "en",
    TAB_EN: "tab_en",
};

const PRACTICE_MODE = {
    PINYIN: "pinyin",
    ENGLISH: "english",
    HANZI: "hanzi"
};

const PRACTICE_PROGRESS_KEY = "webime_practice_progress";
const STARTUP_GUIDE_KEY = "webime_startup_guide_seen";
const DICTS_CONFIG_KEY = "ime_dicts_config";
const SETTINGS_KEY = "ime_settings";
const HISTORY_KEY = "ime_history_v18";
const pageSize = 10;

let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
if (settings.showStrokeAux === undefined) settings.showStrokeAux = true;

