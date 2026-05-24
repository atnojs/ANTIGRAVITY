from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64

app = Flask(__name__)
CORS(app)


def process_to_lineart(image_data):
    nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("No se pudo leer la imagen")

    # Redimensionar si es muy grande (mejor rendimiento y resultados)
    h, w = img.shape[:2]
    max_dim = 1500
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)),
                         interpolation=cv2.INTER_AREA)

    # 1. Suavizar preservando bordes
    smooth = cv2.bilateralFilter(img, 9, 75, 75)

    # 2. Escala de grises
    gray = cv2.cvtColor(smooth, cv2.COLOR_BGR2GRAY)

    # 3. Técnica Dodge & Burn (lápiz de dibujo)
    #    Invertir y difuminar, luego mezclar con Color Dodge
    inverted = 255 - gray
    blurred_inv = cv2.GaussianBlur(inverted, (21, 21), sigmaX=0)
    sketch = cv2.divide(gray, 255 - blurred_inv, scale=256)

    # 4. Umbral para líneas limpias (negro sobre blanco)
    _, result = cv2.threshold(sketch, 210, 255, cv2.THRESH_BINARY)

    # 5. Cerrar pequeños huecos en las líneas
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    result = cv2.morphologyEx(result, cv2.MORPH_CLOSE, kernel_close, iterations=1)

    # 6. Engrosar ligeramente las líneas para mejor visibilidad al colorear
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    result = cv2.dilate(result, kernel_dilate, iterations=1)

    # Salida PNG (sin artefactos JPG en líneas nítidas)
    _, buffer = cv2.imencode('.png', result)
    return base64.b64encode(buffer).decode('utf-8')


@app.route('/process', methods=['POST'])
def handle_process():
    try:
        data = request.json
        result = process_to_lineart(data.get('image'))
        return jsonify({"image": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)