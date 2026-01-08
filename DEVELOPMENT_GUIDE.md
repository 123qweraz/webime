# WebIME Development Guide

This document provides a technical overview of the system architecture, core logic, and functional modules of the WebIME project.

---

## 1. System Architecture

WebIME is a lightweight, browser-based Input Method Editor (IME) built with vanilla JavaScript. It follows a modular design focused on performance and extensibility.

### 1.1 Core Engine (Trie Structure)
The backbone of the IME is a **Prefix Tree (Trie)** implementation (referenced as `DB` or `fuzzySearchTrie`).
- **Efficiency**: Allows $O(K)$ lookup time, where $K$ is the length of the pinyin sequence.
- **Multilingual Support**: Can simultaneously index Chinese (Pinyin), Japanese (Romaji), and custom English datasets.
- **Weighting**: Candidates are ranked based on a combination of dictionary priority and path distance.

### 1.2 Input State Machine
The application operates as a finite state machine to handle context-specific keyboard events:
- `NORMAL`: Standard buffer-to-candidate lookup.
- `PRACTICE`: Locked-card mode for typing drills with real-time validation.
- `CORRECTION`: Long-sentence mode utilizing a `textarea` for segment-based refinement.
- `EDIT`: Content-editable mode for the output area.
- `TAB`: Auxiliary filtering based on English annotations.

---

## 2. Key Modules

### 2.1 Dictionary Management (`dict-manager.js`)
Handles the lifecycle of linguistic data:
- **Loading**: Asynchronously fetches JSON dictionaries and populates the Trie.
- **Persistence**: Dictionary enabled/disabled states are stored in `localStorage`.
- **Hybrid Input**: Supports concurrent active dictionaries, allowing seamless switching between languages without changing settings.

### 2.2 IME Logic (`ime.js` & `main.js`)
- **Hidden Input Capture**: Uses a transparent `#hidden-input` element to capture keystrokes, bypassing default browser behaviors while maintaining focus.
- **Buffer Processing**: Splitting raw pinyin into "preceding buffer" and "active segment" to support progressive input.
- **Candidate Rendering**: Dynamically generates candidate tiles with keyboard index mappings (1-0).

### 2.3 Practice Suite (`practice.js`)
A gamified typing tutor integrated into the IME:
- **Chapter Splitting**: Dictionaries are automatically divided into manageable "chapters" (20 words each).
- **Visual Feedback**: Implements a sliding card UI with CSS animations for "Correct" (green) and "Incorrect" (shake) feedback.
- **Progress Tracking**: Saves current chapter and word index to `localStorage`, allowing users to resume sessions.

### 2.4 Clipboard & History (`history.js`)
- **Archiving Workflow**: `Ctrl + C` triggers a dual action—copying the current `committed` text to the system clipboard and prepending it to the local history panel.
- **Data Retention**: Maintains a sliding window of the last 50 entries.

---

## 3. Data Flow

1. **Input**: User types into the invisible input field.
2. **Lookup**: The `update()` loop queries the Trie with the current buffer.
3. **Render**: Candidate items are generated and injected into the DOM.
4. **Commit**: Selecting a candidate (via space/number) moves text from the buffer to the `committed` string.
5. **Output**: The `output-area` DOM is updated to reflect the `committed` state.

---

## 4. Technical Constraints & UI
- **Styling**: Leverages CSS Variables for theme consistency (Light/Dark mode).
- **Layout**: Uses a flexible grid/flexbox system with manual "resizers" for customizable workspace dimensions.
- **Zero-Dependency**: No external libraries are used for core logic, ensuring sub-second load times.
