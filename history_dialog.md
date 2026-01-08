# History Dialog

## 2026-01-08 01:40
- **Task**: Remove Practice Info Bar and Progress Text.
- **Key Actions**:
    1. **UI Removal**: Removed the `practice-info-bar` and its inner `practice-progress-text` from `index.html`.
    2. **Logic Cleanup**: Deleted the `updatePracticeProgress` function and all its calls and references in `js/practice.js`.
    3. **Style Cleanup**: Removed CSS styles for `#practice-info-bar` and `#practice-progress-text` from `css/style.css`.

## 2026-01-08 01:30
- **Task**: Remove Progress Bar from Practice Mode.
- **Key Actions**:
    1. **UI Removal**: Deleted the progress bar element and its container from `index.html`.
    2. **Logic Cleanup**: Removed progress bar percentage calculation and DOM update logic from `js/practice.js`.
    3. **Style Cleanup**: Removed related CSS styles for `#progress-container` and `#progress-bar`.

## 2026-01-08 01:25
- **Task**: Remove Jump and Dictionary Selection from Practice Mode.
- **Key Actions**:
    1. **UI Removal**: Removed the dictionary selector and jump box from `index.html`.
    2. **Code Cleanup**: Deleted the `jumpToWord` function and removed the jump-related logic from `js/practice.js`.
    3. **Default Logic**: Updated `initPracticeModeData` to automatically select the first enabled dictionary if no practice dictionary is specified in settings.

## 2026-01-08 01:20
- **Task**: Critical bug fix for Practice Mode startup.
- **Key Actions**:
    1. **Fixed Startup Bug**: Restored the missing `return true` in `initPracticeModeData` which was preventing practice mode from initializing.
    2. **Verified Pinyin Display**: Confirmed that the "Show Pinyin" logic is intact and functional.

## 2026-01-08 01:15
- **Task**: Fix dictionary selection and jump functionality.
- **Key Actions**:
    1. **Fixed Dictionary Selection**: Added logic to immediately reload practice data and restart practice mode when the dictionary is changed in the selector.
    2. **Improved Jump UI**: Added a dedicated "Jump" button next to the input field for better usability.
    3. **Bug Fix (Data Loading)**: Fixed a bug in `initPracticeModeData` where `practiceWords` were not correctly extracted if the dictionary data format was not an array.
    4. **Improved Jump Logic**: Added better validation and error messaging for the jump input.
    5. **Initialization Order**: Fixed a race condition where the dictionary selector might be populated before dictionaries are fully loaded.

## 2026-01-08 01:00
- **Task**: Fix practice mode card layout, pinyin carry-over, and relocate toolbar functions.
- **Key Actions**:
    1. **Fixed Card Visibility**: Increased `center-container` max-width to 1200px to ensure all three cards are visible.
    2. **UI Relocation**: Moved Jump and Show Pinyin functions from the top bar to a new footer below the cards.
    3. **Bug Fix (Pinyin Leak)**: Corrected issue where the previous word's pinyin would persist on the new card by immediately clearing the display.
    4. **Jump Function Fixed**: Improved `jumpToWord` reliability by resetting animation state and clearing inputs properly.
    5. **Style Update**: Removed red underline from incorrect pinyin characters.

## 2026-01-08 00:45
- **Task**: Refine Practice Mode UI and fix critical bugs (Pinyin carry-over, Jump failure, Card roles).
- **Completed Changes**:
    1. **UI Layout Update**: Moved the "Jump to Word" box and "Show Pinyin (F2)" button from the top toolbar into the practice info bar area for better focus and cleaner UI.
    2. **Card Role Swap**: Swapped the positions of side cards. Now the **Left** card shows the "Next" (preview) word, and the **Right** card shows the "Completed" (history) word.
    3. **Completed Card Enhancement**: The Right (completed) card now displays both the **Hanzi and Pinyin** of the previously practiced word.
    4. **Removed Pinyin Underscores**: Deleted the `_` placeholder and bottom border for untyped pinyin characters in the center card to meet the "no underscore" requirement.
    5. **Fixed Pinyin Carry-over Bug**: Implemented immediate clearing of the `hidden-input` value and `buffer` when a word is completed correctly, preventing leftover characters from leaking into the next word.
    6. **Fixed Jump Function**: Corrected `jumpToWord` to properly clear the input buffer and update the card display before focusing.
    7. **UI Styling**: Updated `style.css` to handle the new horizontal layout of the practice info bar.

## 2026-01-08 00:30
- **Task**: Fix bugs in Practice Mode (Shuffle inconsistency, Card layout, Missing animations, Logic redundancy).
- **Completed Changes**:
    1. **Fixed Shuffle Bug**: Implemented a `seededShuffle` based on the dictionary path. This ensures that the practice word order remains consistent across page refreshes for the same dictionary, fixing the "random jump" issue when resuming progress.
    2. **Dictionary-Specific Progress**: Updated practice progress tracking to use dictionary-specific keys in `localStorage`. Progress in one dictionary no longer affects others.
    3. **Fixed Card Layout**: Corrected `loadCards` logic where `cardLeft` was incorrectly used for the next word. Now `cardRight` shows the next word and `cardLeft` shows the previous word.
    4. **Added Shake Animation**: Implemented the missing CSS `@keyframes shake` and `.incorrect` class styling in `style.css` to provide visual feedback for typing errors.
    5. **Consolidated Logic**: Moved practice-specific input handling from `main.js` to `practice.js` (`handlePracticeInput`) to reduce redundancy and improve encapsulation.
    6. **Input Debouncing**: Used `isPracticeAnimating` to prevent rapid key presses from advancing multiple words simultaneously.
    7. **Code Cleanup**: Removed redundant progress updates and fixed card element clearing in `exitPracticeMode`.

## 2026-01-08 00:05
- **Task**: Fix reported issues: `update` function refactoring, Tab mode display, dictionary switching, and practice mode invalid state.
- **Completed Changes**:
    1. **Refactored `update` Function**: Split `update` into `getActiveSegment`, `updateBufferDisplay`, and `lookupCandidates` for better readability and maintenance.
    2. **Fixed Tab Mode Display**: Explicitly handled the rendering of the buffer, separator (`-`), and filter text in `updateBufferDisplay` to ensure they are visible.
    3. **Improved Dictionary Switching**: Modified `toggleLanguageDicts` to implement a "switch" behavior. Enabling one language (Chinese/Japanese) now automatically disables the other, and the toggle logic is improved (enable all if any disabled).
    4. **Practice Mode Fixes**: ensured `update` loop returns early when in `PRACTICE` state to prevent interference, and verified input handling logic.

## 2026-01-07 23:55
- **Task**: Continue implementation of Practice Mode pinyin feedback and address new requirement for history logging.
- **Context**: The last commit added CSS classes for pinyin feedback on the card itself but hasn't fully integrated them into the input logic.
- **Completed Changes**:
    1. **Pinyin Feedback**: Updated `updatePracticeInputDisplay` to provide real-time feedback on the card's `pinyin-display` using the `char-correct`, `char-incorrect`, and `char-placeholder` classes.
    2. **Placeholders**: Changed initial pinyin placeholders from underscores to actual letters in light gray for better guidance.
    3. **Case Insensitivity**: Made the practice mode completion check case-insensitive.
    4. **Safety**: Added null checks for `currentInputDisplay` to prevent errors when `#practice-input-display` is missing from the HTML.
    5. **Error Feedback**: Added a shake animation to the card when incorrect pinyin is typed in Practice Mode.
    6. **History Logging**: Created `history_dialog.md` and started logging major changes.
