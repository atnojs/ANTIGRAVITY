import requests
import base64
import json
import os

# Read the API key from .htaccess
api_key = None
htaccess_paths = [
    r"e:\ANTIGRAVITY\apps\.htaccess",
    r"../.htaccess",
    r"../../.htaccess"
]

for path in htaccess_paths:
    try:
        if os.path.exists(path):
            with open(path, 'r') as f:
                for line in f:
                    if 'SetEnv A' in line or 'SetEnv GEMINI_API_KEY' in line:
                        api_key = line.split('"')[1]
                        break
            if api_key:
                print(f"API Key found in {path}")
                break
    except Exception as e:
        pass

if not api_key or api_key == 'PEGA_TU_API_KEY_AQUI':
    print("ERROR: No API key found in .htaccess. Please paste your Google API key first.")
    exit(1)

print(f"API Key found: {api_key[:10]}...")

model = "gemini-3.1-flash-image-preview"
url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

# Use a tiny transparent 1x1 PNG base64 encoded for a self-contained test
img_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

# Test 1: camelCase format (what the current code sends)
print("\n--- Test 1: camelCase format ---")
body_camel = {
    "contents": [{
        "parts": [
            {"inlineData": {"data": img_b64, "mimeType": "image/png"}},
            {"text": "Transform the given input image into a clean, crisp, black and white line-art drawing, specifically designed to be a high-quality coloring book page."}
        ]
    }],
    "generationConfig": {
        "responseModalities": ["IMAGE"],
        "imageConfig": {
            "aspectRatio": "1:1",
            "imageSize": "1K"
        }
    }
}

r = requests.post(url, json=body_camel, headers={"Content-Type": "application/json"}, timeout=60)
print(f"Status: {r.status_code}")
try:
    resp = r.json()
    if "error" in resp:
        print(f"Error: {resp['error'].get('message', resp['error'])}")
    else:
        print(f"Success! Keys: {list(resp.keys())}")
        if "candidates" in resp:
            parts = resp["candidates"][0]["content"]["parts"]
            for p in parts:
                if "inlineData" in p:
                    print(f"  Got image! mimeType={p['inlineData']['mimeType']}, size={len(p['inlineData']['data'])} chars")
                elif "inline_data" in p:
                    print(f"  Got image (snake)! mimeType={p['inline_data']['mime_type']}, size={len(p['inline_data']['data'])} chars")
                elif "text" in p:
                    print(f"  Got text: {p['text'][:100]}...")
except:
    print(f"Raw response: {r.text[:500]}")
