# WebIME - Agent Guidelines

## Project Overview
WebIME is a vanilla JavaScript input method editor without a build system. It uses:
- Native ES6+ JavaScript (no frameworks, no bundlers)
- HTML5 with `contenteditable` for the output area
- CSS3 with custom properties (CSS variables) for theming
- `localStorage` for settings and history persistence
- Fetch API for loading dictionary JSON files

---

## Development Commands

### Running the Project
```bash
# Simply open index.html in a browser - no server required
# Or use a simple HTTP server for better dev experience:
python3 -m http.server 8000
# Then open http://localhost:8000
```

### Testing
**No test framework is currently configured.** To run manual tests:
- Open `index.html` in a browser
- Open browser DevTools Console
- Test functionality manually, look for errors in console

To add automated testing (recommended):
```bash
# Install test framework
npm install --save-dev vitest @vitest/ui

# Create tests directory structure
tests/
├── unit/
│   ├── trie.test.js
│   ├── dict-manager.test.js
│   └── ime.test.js
└── e2e/
    └── user-flow.test.js
```

### Linting
**No linter is currently configured.** Recommended setup:
```bash
# Install ESLint
npm install --save-dev eslint

# Run ESLint
npx eslint js/*.js

# Auto-fix issues
npx eslint js/*.js --fix
```

---

## Code Style Guidelines

### JavaScript

#### Imports and Modules
- No ES modules (`import`/`export`) - uses global scope via script tags
- All scripts are loaded in `index.html` in dependency order
- Load order: `config.js` → `utils.js` → `trie.js` → `history.js` → `practice.js` → `dict-manager.js` → `ime.js` → `main.js`

#### Naming Conventions
- **Functions**: `camelCase` - `loadAllDicts()`, `handleKeyDown()`, `toggleTheme()`
- **Variables**: `camelCase` - `currentState`, `buffer`, `combinedCandidates`
- **Constants**: `SCREAMING_SNAKE_CASE` - `INPUT_STATE`, `SETTINGS_KEY`, `HISTORY_KEY`
- **Classes**: `PascalCase` - `Trie`, `DictManager` (if created)
- **DOM IDs**: `kebab-case` - `hidden-input`, `output-area`, `main-candidates`
- **CSS Classes**: `kebab-case` - `candidate-item`, `practice-card-content`, `toolbar`

#### Function Style
```javascript
// ✓ Good: Clear, early returns, single responsibility
function handleKeyDown(e) {
    if (!e || currentState === InputState.PRACTICE) return;
    const key = e.key;
    if (key === "Tab") {
        e.preventDefault();
        handleTabPress(e);
        return;
    }
    // ... handle other keys
}

// ✗ Avoid: Deeply nested conditionals
function handleKeyDown(e) {
    if (e) {
        if (currentState !== InputState.PRACTICE) {
            if (e.key === "Tab") {
                if (e.shiftKey) {
                    // deeply nested...
                }
            }
        }
    }
}
```

#### Error Handling
```javascript
// Use try-catch for async operations
async function loadAllDicts() {
    try {
        const response = await fetch(dict.path);
        if (!response.ok) {
            showErrorMessage(`无法加载词典: ${response.status}`);
            return;
        }
        const data = await response.json();
        // Process data...
    } catch (error) {
        console.error("加载词典失败:", error);
        showErrorMessage("加载词典失败", error);
    }
}

// Use try-catch for localStorage operations
function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("保存设置失败:", error);
        showToast("保存设置失败", "error");
    }
}
```

#### HTML/Text Sanitization
```javascript
// ALWAYS sanitize user input before inserting into DOM
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// When setting innerHTML
element.innerHTML = escapeHtml(userInput);
```

---

### CSS

#### CSS Variables (Custom Properties)
```css
:root {
    --primary: #007aff;
    --bg: #f5f5f7;
    --text-main: #1d1d1f;
    --border: rgba(0, 0, 0, 0.08);
    --radius-md: 12px;
}

body.dark-mode {
    --bg: #000000;
    --text-main: #f5f5f7;
}

/* Use variables everywhere */
.btn {
    background: var(--primary);
    color: var(--bg);
    border-radius: var(--radius-md);
}
```

#### Class Naming
- Use BEM-inspired naming: `.block__element--modifier`
- Examples: `.candidate-item`, `.candidate-item.active`, `.practice-card-content.flipped`

---

### JSON Dictionary Format

Dictionary files must follow this structure:
```json
{
  "pinyin": ["汉字1", "汉字2"],
  "another": {
    "char": "汉字",
    "en": "definition",
    "priority": 100
  }
}
```

Rules:
- Keys are pinyin (lowercase preferred for consistency)
- Values can be strings (single hanzi) or arrays (multiple)
- Objects with `char`, `en`, and `priority` fields for metadata
- Priority: higher number = higher ranking (e.g., 100 > 50)

---

## State Management

### Global State Variables
The app uses several global variables (defined in `config.js`):
- `currentState`: Current IME mode (NORMAL, PRACTICE, EDIT, etc.)
- `buffer`: Current typed pinyin string
- `combinedCandidates`: Array of matched candidates
- `pageIndex`: Current page in candidate list
- `settings`: User preferences from localStorage
- `allDicts`: Array of configured dictionaries

### State Persistence
```javascript
// Settings
localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

// History
localStorage.setItem(HISTORY_KEY, JSON.stringify(HISTORY));

// Practice Progress
const key = `${PRACTICE_PROGRESS_KEY}_${dictPath}_ch${chapter}`;
localStorage.setItem(key, currentIndex);
```

---

## Best Practices

1. **Avoid polluting global namespace**: Wrap new features in IIFE or modules
2. **Use `document.getElementById()` sparingly**: Cache DOM references
3. **Event delegation**: Attach listeners to parent containers where possible
4. **Async/await**: Use for all fetch operations, avoid callbacks
5. **Accessibility**: Add `aria-label` to buttons, ensure keyboard navigation works
6. **Performance**: Debounce input handlers, use `requestAnimationFrame` for animations
7. **Cross-browser**: Use `document.execCommand("insertText")` for contenteditable

---

## File Organization

```
webime/
├── index.html              # Main entry point
├── hanzi_explorer.html    # Character explorer tool
├── css/
│   └── style.css          # All styles (consider splitting)
├── js/
│   ├── config.js          # Constants and configuration
│   ├── utils.js           # Helper functions (escapeHtml, showToast)
│   ├── trie.js            # Trie data structure for dictionary lookup
│   ├── history.js         # History management
│   ├── practice.js        # Practice mode logic
│   ├── dict-manager.js    # Dictionary loading and UI
│   ├── ime.js            # Core IME state machine
│   └── main.js           # Event listeners and initialization
└── dicts/
    ├── chinese/           # Chinese dictionaries
    ├── japanese/          # Japanese dictionaries
    └── english/           # English dictionaries
```
