import urllib.request
import re
import json
import os
import sys

URL = "https://raw.githubusercontent.com/jtoy/crdict/master/cedict_ts.u8"
OUTPUT_FILE = "dicts/dict_cedict.json"

def fetch_cedict():
    print(f"Downloading from {URL}...")
    try:
        with urllib.request.urlopen(URL) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Error downloading: {e}")
        sys.exit(1)

def parse_line(line):
    # Trad Simp [Pin yin] /En1/En2/
    match = re.match(r'^(\S+)\s+(\S+)\s+\[(.*?)\]\s+/(.*)/$', line)
    if not match:
        return None
    
    trad = match.group(1)
    simp = match.group(2)
    pinyin_raw = match.group(3)
    english_raw = match.group(4)
    
    # Process Pinyin
    # 1. Replace u: with v
    pinyin = pinyin_raw.replace('u:', 'v')
    # 2. Remove numbers
    pinyin = re.sub(r'\d', '', pinyin)
    # 3. Remove spaces and dots (some might have middle dots?)
    pinyin = pinyin.replace(' ', '').replace('·', '')
    # 4. Lowercase
    pinyin = pinyin.lower()
    
    # Process English
    # Replace / with ; 
    english = english_raw.replace('/', '; ')
    
    return pinyin, simp, english

def main():
    content = fetch_cedict()
    lines = content.split('\n')
    
    dictionary = {}
    
    print("Parsing...")
    count = 0
    for line in lines:
        if line.startswith('#') or not line.strip():
            continue
            
        result = parse_line(line)
        if result:
            key, char, en = result
            
            # Simple validation to avoid garbage keys
            if not key or not char:
                continue
                
            if key not in dictionary:
                dictionary[key] = []
            
            # Check for duplicates to avoid bloating
            # We want to keep the entry with better english definition?
            # Or just append all? CEDICT usually has one entry per unique (char, pinyin).
            # But sometimes duplicates exist.
            
            exists = False
            for item in dictionary[key]:
                if item['char'] == char:
                    # Append definition if different?
                    # For simplicity, skip if char already exists for this pinyin
                    exists = True
                    break
            
            if not exists:
                dictionary[key].append({
                    "char": char,
                    "en": en
                })
                count += 1
                
    print(f"Parsed {count} words.")
    
    # Write to file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(dictionary, f, ensure_ascii=False, indent=2)
        
    print(f"Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
