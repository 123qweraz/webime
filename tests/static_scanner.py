import os
import re
import sys

def scan_files():
    print("Starting Static Integrity Scan...")
    
    # 1. Collect HTML files
    html_files = [f for f in os.listdir('.') if f.endswith('.html')]
    if not html_files:
        print("No HTML files found.")
        return

    # 2. Collect JS files
    js_dir = 'js'
    if not os.path.exists(js_dir):
        print("JS directory not found.")
        return
    js_files = [os.path.join(js_dir, f) for f in os.listdir(js_dir) if f.endswith('.js')]

    # 3. Extract IDs from HTML
    ids_in_html = set()
    for hf in html_files:
        try:
            with open(hf, 'r', encoding='utf-8') as f:
                content = f.read()
                # Match id="value" or id='value'
                ids = re.findall(r'id=["\']([^"\\]+)["\\]', content)
                ids_in_html.update(ids)
        except Exception as e:
            print(f"Error reading {hf}: {e}")

    print(f"Found {len(ids_in_html)} unique IDs in HTML.")

    # 4. Extract getElementById calls from JS
    ids_in_js = set()
    for jf in js_files:
        try:
            with open(jf, 'r', encoding='utf-8') as f:
                content = f.read()
                # Match document.getElementById("value")
                ids = re.findall(r'getElementById\(["\']([^"\\]+)["\\]\)', content)
                ids_in_js.update(ids)
        except Exception as e:
            print(f"Error reading {jf}: {e}")

    print(f"Found {len(ids_in_js)} unique ID references in JS.")

    # 5. Check for missing IDs
    missing = ids_in_js - ids_in_html
    
    # Ignore some known dynamic IDs or common patterns if necessary
    # For now, report all.
    if missing:
        print("\n[ERROR] The following IDs are referenced in JS but NOT found in HTML:")
        for m in missing:
            print(f"  - {m}")
        print("\nPotential causes: Dynamic ID generation, missing HTML elements, or typo.")
        sys.exit(1)
    else:
        print("\n[SUCCESS] All JS-referenced IDs are present in HTML.")
        sys.exit(0)

if __name__ == "__main__":
    scan_files()
