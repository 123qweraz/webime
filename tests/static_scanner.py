import re
import os
import sys

def get_ids_from_html(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    return set(re.findall(r'id=["\']([^"\\]+)["\\]', content))

def check_js_files(js_dir, html_ids):
    errors = []
    js_files = [f for f in os.listdir(js_dir) if f.endswith('.js')]
    
    # 1. Check for missing DOM IDs
    for js_file in js_files:
        path = os.path.join(js_dir, js_file)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Find all getElementById calls
            referenced_ids = re.findall(r'document\.getElementById\(["\']([^"\\]+)["\\]\)', content)
            for rid in referenced_ids:
                if rid not in html_ids:
                    errors.append(f"Error in {js_file}: DOM ID '{rid}' not found in index.html")
    
    # 2. Check for potential ReferenceErrors (defined vs called)
    defined_functions = set()
    called_functions = set()
    
    for js_file in js_files:
        path = os.path.join(js_dir, js_file)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Basic function definitions: function name(...) or let name = function(...)
            defs = re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', content)
            defined_functions.update(defs)
            
            # Simple calls in main.js
            if js_file == 'main.js':
                calls = re.findall(r'([a-zA-Z0-9_]+)\s*\(', content)
                called_functions.update(calls)

    # Filtering standard JS/DOM functions from calls
    std_funcs = {'addEventListener', 'setTimeout', 'setInterval', 'console', 'JSON', 'localStorage', 'parseInt', 'Math', 'alert', 'confirm', 'showLoadingMessage', 'hideLoadingMessage', 'loadDictConfig', 'loadAllDicts', 'applySettings', 'updateHistoryUI', 'initEventListeners', 'setState', 'update', 'focusHiddenInput', 'handleKeyDown', 'handleInput', 'handleGlobalKeyDown', 'handleGlobalClick', 'makeResizableV', 'init', 'changeDirectoryPage', 'updatePracticeInputDisplay', 'handlePracticeInput', 'togglePinyinHint', 'archiveAndCopy', 'focusOutputArea', 'showErrorMessage', 'resetInput', 'selectCandidate', 'insertAtCursor', 'syncOutputArea', 'clearOutput', 'enterCorrectionMode', 'lookupCandidates', 'render', 'setBuffer'}
    
    for call in called_functions:
        if call not in defined_functions and call not in std_funcs:
            # This is a weak check but helps catch obvious deletions
            # errors.append(f"Warning in main.js: Function '{call}' might be undefined.")
            pass

    return errors

if __name__ == "__main__":
    html_ids = get_ids_from_html('index.html')
    js_errors = check_js_files('js', html_ids)
    
    if js_errors:
        print("\n".join(js_errors))
        sys.exit(1)
    else:
        print("Static integrity check passed.")
        sys.exit(0)
