# History Dialog

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

## 2026-01-08 00:05
- **Task**: Fix reported issues: `update` function refactoring, Tab mode display, dictionary switching, and practice mode invalid state.
- **Completed Changes**:
    1. **Refactored `update` Function**: Split `update` into `getActiveSegment`, `updateBufferDisplay`, and `lookupCandidates` for better readability and maintenance.
    2. **Fixed Tab Mode Display**: Explicitly handled the rendering of the buffer, separator (`-`), and filter text in `updateBufferDisplay` to ensure they are visible.
    3. **Improved Dictionary Switching**: Modified `toggleLanguageDicts` to implement a "switch" behavior. Enabling one language (Chinese/Japanese) now automatically disables the other, and the toggle logic is improved (enable all if any disabled).
    4. **Practice Mode Fixes**: ensured `update` loop returns early when in `PRACTICE` state to prevent interference, and verified input handling logic.
