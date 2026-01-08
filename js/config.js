const BUILT_IN_DICTS = [
    {
        name: "一级字",
        path: "dicts/chinese/first_dict/dict.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        priority: 100,
    },
    {
        name: "词组词典",
        path: "dicts/chinese/first_dict/dict_cizu.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        priority: 90,
    },
    {
        name: "二级字",
        path: "dicts/chinese/second_dict/level-2_char_en.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        priority: 80,
    },
    {
        name: "生僻字",
        path: "dicts/chinese/third_dict/level-3_char_en.json",
        enabled: false,
        type: "built-in",
        tag: "chinese",
        priority: 70,
    },
    {
        name: "三字词语",
        path: "dicts/chinese/second_dict/three_character_word.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        priority: 60,
    },
    {
        name: "四字词语",
        path: "dicts/chinese/second_dict/four_character_word.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        priority: 50,
    },
    {
        name: "标点符号",
        path: "dicts/chinese/punctuation.json",
        enabled: true,
        type: "built-in",
        tag: "chinese",
        priority: 40,
    },
    {
        name: "N5",
        path: "dicts/japanese/N5.json",
        enabled: false,
        type: "built-in",
        tag: "japanese",
        priority: 10,
    },
    {
        name: "N4",
        path: "dicts/japanese/N4.json",
        enabled: false,
        type: "built-in",
        tag: "japanese",
        priority: 10,
    },
    {
        name: "N3",
        path: "dicts/japanese/N3.json",
        enabled: false,
        type: "built-in",
        tag: "japanese",
        priority: 10,
    },
    {
        name: "N2",
        path: "dicts/japanese/N2.json",
        enabled: false,
        type: "built-in",
        tag: "japanese",
        priority: 10,
    },
    {
        name: "N1",
        path: "dicts/japanese/N1.json",
        enabled: false,
        type: "built-in",
        tag: "japanese",
        priority: 10,
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
};

const PRACTICE_PROGRESS_KEY = "webime_practice_progress";
const DICTS_CONFIG_KEY = "ime_dicts_config";
const SETTINGS_KEY = "ime_settings";
const HISTORY_KEY = "ime_history_v18";
const pageSize = 10;
