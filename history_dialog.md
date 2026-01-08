# History Dialog

## 2026-01-08 07:15
- **Task**: Fix Dark Mode, Initial Focus, and Tab Focus Cycling.
- **Key Actions**:
    1. **Dark Mode Consolidation**: 
        - Centralized dark mode overrides at the top of `css/style.css` for better reliability.
        - Fixed visibility issues for scrollbars, pagination bars, dictionary cards, and correction candidates in dark theme.
        - Ensured consistent background colors for `history-header` and `toolbar` in dark mode.
    2. **Reliable Initial Focus**: 
        - Implemented a multi-stage focus strategy using `window.onload` and staggered `setTimeout` calls to ensure the `hidden-input` is focused immediately after page initialization and dictionary loading.
    3. **Bidirectional Tab Cycling**:
        - Refactored `Tab` key logic into a global handler to allow seamless focus cycling between the `output-area` (text area) and `hidden-input` (input area) when the buffer is empty.
        - Ensured the `Tab` key still triggers IME internal state switching (e.g., Tab filter mode) when a buffer exists.
    4. **Code Cleanup**: Removed redundant and conflicting dark mode style blocks from the CSS file.

## 2026-01-08 07:00
- **Task**: Comprehensive UI Optimization and Virtual Cursor Removal.
- **Key Actions**:
    1. **Removed Virtual Cursor**: Eliminated the `fake-caret` (Ghost Caret) implementation across `js/ime.js`, `js/main.js`, and `css/style.css`, relying on the native browser caret for a more standard editing experience.
    2. **Modernized Visual Design**:
        - Adopted a clean, Apple-inspired aesthetic using SF Pro fonts and a refined color palette.
        - Updated root variables for better theme consistency and modern feel.
    3. **Card & Layout Refinement**:
        - Enhanced `output-card` and `input-card` with softer shadows, smoother transitions, and consistent border radii (`18px`).
        - Improved spacing and padding across the main layout and center container.
    4. **Component Polishing**:
        - Redesigned `toolbar` and `btn` styles for a more cohesive and professional appearance.
        - Refined `candidate-item` typography and layout, improving readability and alignment.
        - Optimized the `history-panel` and `history-item` for better visual hierarchy.
    5. **Practice Mode & Modal Enhancements**:
        - Sleeked down `practice-card-slot` and `chapter-card` with improved hover effects and layout.
        - Modernized the dictionary modal and other overlays with enhanced blur effects and refined styling.
    6. **Consistent Explorer UI**: Updated `hanzi_explorer.html` to align with the new app-wide UI standards, ensuring a seamless cross-page experience.
    7. **Verified Integrity**: Passed all static integrity checks and logic tests after the refactor.

## 2026-01-08 06:30
- **Task**: UI Polishing, Stability, and Performance Optimization.
- **Key Actions**:
    1. **Grid-based Candidate UI**: Enforced a strict 5-column grid layout for candidates using `calc(20%)` and `flex-wrap`, ensuring a perfectly aligned board-like appearance regardless of content length.
    2. **Aggressive Truncation**: Implemented strict width limits and ellipsis truncation for candidate descriptions, preventing long English text from breaking the UI.
    3. **Performance Boost**: Pruned Trie lookup depth and limited collection to 200 items to eliminate lag during high-frequency typing.
    4. **Focus & Selection Logic**:
        - Implemented "Ghost Caret" (visual fake-caret) to show the insertion point when the output area is blurred.
        - Adopted `document.execCommand` for all text manipulations (insert/delete), preserving browser undo history and fixing space rendering issues.
        - Refactored focus management to provide clear visual cues (Blue for IME, Orange for Direct Edit) and reliable focus relay.
    5. **Robustness**: Eliminated all global DOM variable dependencies in favor of immediate `getElementById` calls, fixing the "Nothing to Archive" bug.
    6. **Integrated Action**: Merged "Archive", "Copy", and "Clear" into a single atomic operation for a leaner workflow.
    7. **Automated Guard**: Deployed a Python-based static integrity scanner to catch missing DOM IDs or broken function references before delivery.




## 2026-01-08 05:00
- **Task**: Standardized Testing and Quality Assurance.
- **Key Actions**:
    1. **Test Design**: Developed a comprehensive test suite covering IME input, Practice Mode, Dictionary Management, and Edge Cases.
    2. **Automated Logic Testing**: Created a Node.js-based simulation script (`tests/logic_test.js`) to verify the Trie lookup and candidate weighting logic.
    3. **Functional Verification**: 
        - Verified "Long Sentence Mode" segmenting and conversion logic.
        - Confirmed Practice Mode's race condition protection and input filtering.
        - Validated persistence of user settings and practice progress in `localStorage`.
    4. **Robustness Testing**: Tested with extreme pinyin lengths and non-pinyin characters in various modes.
    5. **Documentation**: Compiled a detailed `test-report.md` summarizing findings and providing optimization suggestions.

## 2026-01-08 04:15
- **Task**: Implement Integrated Practice Directory View.
- **Key Actions**:
    1. **Directory Interface**: Replaced the modal-based chapter selection with a native "Directory View" inside the practice area.
    2. **Chapter Cards**: Designed elegant cards for each chapter showing the word range (e.g., 1-20).
    3. **Navigation Logic**: 
        - Default to the directory when starting practice mode.
        - Added a "Back to Directory" button in the practice footer for quick chapter switching.
    4. **Flow Optimization**: Selecting a dictionary now immediately opens the corresponding chapter directory.
    5. **UI/UX**: Improved visual consistency with a grid-based layout that works across themes.

## 2026-01-08 04:00
- **Task**: Implement Dictionary Selection and Chapter Splitting for Practice Mode.
- **Key Actions**:
    1. **Dictionary Selection**: Redesigned the "Practice" tab in the dictionary modal to allow users to select from all enabled dictionaries.
    2. **Chapter Splitting**: Implemented logic to divide dictionaries into "Chapters" of 20 words each, allowing for focused, manageable practice sessions.
    3. **Chapter Navigation**: Added a chapter selection grid that appears after a dictionary is chosen, displaying word ranges (e.g., 1-20, 21-40).
    4. **Practice UI Enhancement**: Added a persistent header in practice mode that shows the current dictionary and chapter name.
    5. **Improved Modal Accessibility**: Ensured the practice tab is always accessible from the dictionary settings, not just when in practice mode.
    6. **Seeded Shuffle per Chapter**: Updated the shuffle logic to be specific to each chapter, ensuring a consistent but randomized order for every session.
    7. **Style Improvements**: Added modern, responsive grid layouts for both dictionary and chapter selection with active state highlighting.

## 2026-01-08 03:35
- **Task**: Refine Rolling Window Hiding Logic.
- **Key Actions**:
    1. **Delayed Hiding**: Adjusted `startDisplay` calculation to `Math.max(0, activeSegIndex - 4)`. This ensures that segments are only hidden from the front once the user moves past the 5th segment.
    2. **Improved Context**: The user now sees the first 5 segments in full; hiding only kicks in for very long sentences, maintaining better initial context.

## 2026-01-08 03:15
- **Task**: Implement Cursor Tracking & Auto-scrolling in Long Sentence Mode.
- **Key Actions**:
    1. **Active Segment Highlighting**: Modified `updateCorrectionCandidates` to detect which segment the cursor is currently in and applied the `.active-row` class to the corresponding candidate list row.
    2. **Automatic Scrolling**: Used `scrollIntoView` to ensure the candidate list automatically scrolls to keep the active segment's candidates visible.
    3. **Event Integration**: Added `keyup` and `click` listeners to the textarea to trigger candidate updates whenever the cursor moves (not just on text change).
    4. **Improved Row Styling**: Added background highlights and rounded corners to the active row for better visual focus.
    5. **Selection Logic Fix**: Improved pinyin-to-Hanzi segment splitting to accurately map cursor positions back to the rendered rows.

## 2026-01-08 03:05
- **Task**: Revert Long Sentence Mode Candidate Limit.
- **Key Actions**:
    1. **Limit Adjustment**: Reduced the number of candidates displayed per segment from 20 back to 5 based on user preference for a cleaner UI.

## 2026-01-08 03:00
- **Task**: Enhance Long Sentence Mode with Interactive Candidate Selection.
- **Key Actions**:
    1. **Increased Capacity**: Expanded the candidate display from 5 to 20 words per segment, providing more choices for complex pinyin.
    2. **Interactive Selection**: Candidates are now clickable. Clicking a candidate replaces its pinyin segment in the textarea with the selected Hanzi.
    3. **Selection Logic**: Implemented `selectCorrectionCandidate` to handle segment replacement while maintaining overall sentence structure.
    4. **Visual Feedback**: 
        - Added hover effects to candidates to indicate interactivity.
        - Selected Hanzi segments are now marked with a green "fixed" style to distinguish them from remaining pinyin segments.
    5. **UX Improvements**: The textarea automatically regains focus after a selection, allowing for continuous typing or further corrections.

## 2026-01-08 02:50
- **Task**: Add Real-time Candidate Display to Long Sentence Mode.
- **Key Actions**:
    1. **UI Enhancement**: Added a `#correction-candidates` container below the textarea in `index.html`.
    2. **Real-time Logic**: Implemented `updateCorrectionCandidates` in `js/ime.js` to parse the pinyin input into segments and display the top 5 candidates for each.
    3. **Visual Feedback**: Added styling in `css/style.css` to highlight the primary candidate (which will be used upon submission) in light blue.
    4. **Event Handling**: Linked the `input` event of the correction textarea to the update logic in `js/main.js`.
    5. **Smart Parsing**: Added basic validation to distinguish between pinyin segments and literal text during candidate lookup.

## 2026-01-08 02:40
- **Task**: Upgrade Correction Mode to "Long Sentence Mode" (长句模式).
- **Key Actions**:
    1. **Renaming**: Renamed "修正模式" to "长句模式" across UI and documentation to better reflect its purpose for inputting full sentences.
    2. **Multiline Support**: Changed the single-line input to a `textarea` in `index.html` and adjusted `css/style.css` to support flexible multiline input.
    3. **Key Bindings**: Updated `handleCorrectionKeyDown` in `js/main.js` to support `Shift + Enter` for manual newlines while keeping `Enter` for final conversion and submission.
    4. **Newline Preservation**: Modified `convertPinyinToHanzi` in `js/ime.js` to process input line-by-line, preserving user-inserted newlines in the final Hanzi output.
    5. **Automatic Wrapping**: Relied on `textarea` and `output-area` CSS (`pre-wrap`) to provide automatic visual wrapping for long sentences.

## 2026-01-08 02:30
- **Task**: Fix Resizer Lagginess and Incomplete Candidate Display.
- **Key Actions**:
    1. **Pixel-Based Resizing**: Rewrote `makeResizableV` in `js/main.js` to use direct pixel height for the input card instead of `flex-grow`. This makes resizing much more responsive ("follows the hand").
    2. **Flexible Candidate Area**: Removed the fixed-height constraint on `#main-candidates` and instead gave the entire `.input-card` a stable base height (`220px`). Candidates now fill all available space in the card and become scrollable if they exceed it.
    3. **Layout Stability**: Locked the input card to `flex-shrink: 0` and `flex-grow: 0` to prevent it from jumping during typing, while keeping the output card as the flexible element.
    4. **Persistence**: Updated `applySettings` to correctly restore the user's custom `inputHeight` from `localStorage`.

## 2026-01-08 02:20
- **Task**: Fix UI Jumping and Stability.
- **Key Actions**:
    1. **Fixed Candidate Height**: Set a fixed height (`120px`) for `#main-candidates` in `css/style.css`. This prevents the input card from changing size as the number of candidates fluctuates during typing.
    2. **Optimized Output Rendering**: Modified `js/ime.js` to only update `outputArea.innerText` when the `committed` string actually changes. This eliminates unnecessary re-renders and scroll-to-bottom jumps while typing pinyin.
    3. **Layout Reinforcement**: Added `overflow: hidden` to `.center-container` and allowed `.output-card` to flex, ensuring the overall layout remains stable and respects manual resizing.

## 2026-01-08 02:10
- **Task**: Fix Candidate Sorting and Redesign Practice Dictionary Selection.
- **Key Actions**:
    1. **Candidate Priority**: Added a `priority` field to `BUILT_IN_DICTS` in `js/config.js` (Level-1 > Phrases > Level-2 > Rare).
    2. **Sequential Loading**: Modified `js/trie.js` to load dictionaries sequentially instead of in parallel, ensuring deterministic insertion order in the Trie.
    3. **Weighted Sorting**: Updated Trie items to store their dictionary's priority and incorporated this priority into the weight calculation in `js/ime.js` `lookupCandidates`. This ensures commonly used Level-1 characters appear first and prevents "jumping" candidates.
    4. **Practice UI Redesign**: Completely redesigned the practice dictionary selection tab in `js/dict-manager.js` using a grid-based layout grouped by language.
    5. **Context-Aware Modal**: Updated `openDictModal` to change its title to "选择练习词典" and focus exclusively on the Practice tab when triggered from Practice Mode.
    6. **Style Enhancements**: Added new CSS for `.practice-dict-grid` and `.practice-dict-item` in `css/style.css` for a modern, touch-friendly UI.

## 2026-01-08 01:50
- **Task**: Add Dictionary Selection for Practice Mode.
- **Key Actions**:
    1. **UI Update**: Added a hidden "Practice" tab to the dictionary modal in `index.html`.
    2. **Modal Logic**: Updated `openDictModal` in `js/dict-manager.js` to show and automatically switch to the "Practice" tab when in Practice Mode.
    3. **Selection Feature**: Implemented `renderPracticeTab` to list all enabled dictionaries for selection.
    4. **Practice Restart**: Added `restartPracticeMode` in `js/practice.js` to immediately apply the selected dictionary and reset progress.

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