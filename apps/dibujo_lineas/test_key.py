import requests
import base64
import json
import re
import os

# Read API key from config.php or .htaccess using relative paths
api_key = None
try:
    with open("config.php", "r") as f:
        content = f.read()
        match = re.search(r"define\('A',\s*'([^']+)'\)", content)
        if match:
            api_key = match.group(1)
except Exception as e:
    print(f"Error reading config.php: {e}")

if not api_key:
    try:
        with open("../.htaccess", "r") as f:
            for line in f:
                if 'SetEnv A' in line:
                    api_key = line.split('"')[1]
                    break
    except Exception as e:
        print(f"Error reading .htaccess: {e}")

if not api_key:
    print("No API key found.")
    exit(1)

print(f"Testing API key: {api_key[:10]}...{api_key[-5:] if len(api_key) > 10 else ''}")

# Generate a tiny 1x1 PNG image in base64
tiny_png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

model = "gemini-3.1-flash-image-preview"
url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

body = {
    "contents": [{
        "parts": [
            {"inlineData": {"data": tiny_png_b64, "mimeType": "image/png"}},
            {"text": "Convert this image to a line drawing."}
        ]
    }],
    "generationConfig": {
        "responseModalities": ["IMAGE"]
    }
}

print("Sending request to Gemini API...")
try:
    r = requests.post(url, json=body, headers={"Content-Type": "application/json"}, timeout=30)
    print(f"HTTP Status: {r.status_code}")
    print("Response body:")
    print(json.dumps(r.json(), indent=2))
except Exception as e:
    print(f"Request failed: {e}")
