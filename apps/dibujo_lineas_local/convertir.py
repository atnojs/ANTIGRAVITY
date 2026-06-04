import os
import time
import requests
import json

BASE_PATH = "/mnt/e/ANTIGRAVITY/apps/dibujo_lineas_local"
INPUT_DIR = os.path.join(BASE_PATH, "entrada")
OUTPUT_DIR = os.path.join(BASE_PATH, "salida")
URL_PROMPT = "http://localhost:8188/prompt"
URL_UPLOAD = "http://localhost:8188/upload/image"
URL_HISTORY = "http://localhost:8188/history/"

def enviar_orden_dibujo(nombre_imagen):
    # Aquí está la clave: Usamos la red neuronal LineArt en lugar del algoritmo matemático
    workflow = {
        "3": { "class_type": "LoadImage", "inputs": { "image": nombre_imagen } },
        "14": { 
            "class_type": "LineArtPreprocessor", 
            "inputs": { "resolution": 1024, "image": ["3", 0] } 
        },
        "15": { "class_type": "ImageInvert", "inputs": { "image": ["14", 0] } },
        "16": { "class_type": "SaveImage", "inputs": { "filename_prefix": "DIBUJO", "images": ["15", 0] } }
    }
    
    try:
        data = json.dumps({"prompt": workflow}).encode('utf-8')
        response = requests.post(URL_PROMPT, data=data)
        resultado = response.json()
        
        if "error" in resultado:
            print(f"\n❌ EL MOTOR HA RECHAZADO LA ORDEN: {resultado['error']['message']}")
            return None
        return resultado.get("prompt_id")
    except Exception as e:
        print(f"Error al enviar la orden: {e}")
        return None

def esperar_y_descargar(prompt_id):
    while True:
        try:
            res = requests.get(URL_HISTORY + prompt_id)
            historia = res.json()
            
            if prompt_id in historia:
                outputs = historia[prompt_id].get("outputs", {})
                
                for node_id, node_output in outputs.items():
                    if "images" in node_output:
                        for img in node_output["images"]:
                            nombre = img["filename"]
                            subfolder = img["subfolder"]
                            tipo = img["type"]
                            
                            url_img = f"http://localhost:8188/view?filename={nombre}&subfolder={subfolder}&type={tipo}"
                            img_data = requests.get(url_img).content
                            
                            ruta_final = os.path.join(OUTPUT_DIR, nombre)
                            with open(ruta_final, "wb") as f_out:
                                f_out.write(img_data)
                            return True
                return False 
        except Exception as e:
            pass
        time.sleep(2)

def procesar():
    print("--- Vigilante Activo (Modo IA Avanzado LineArt) ---")
    while True:
        fotos = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith(('.jpg', '.png', '.jpeg'))]
        for foto in fotos:
            ruta_foto = os.path.join(INPUT_DIR, foto)
            print(f"\n[1] Subiendo {foto} al motor...")
            try:
                with open(ruta_foto, "rb") as f:
                    up = requests.post(URL_UPLOAD, files={"image": f})
                
                if up.status_code == 200:
                    print("[2] Ordenando al motor que dibuje...")
                    prompt_id = enviar_orden_dibujo(foto)
                    
                    if prompt_id:
                        print("[3] El motor está trabajando... (Atención: la primera foto tardará un poco más porque tiene que cargar el nuevo cerebro de dibujo)")
                        
                        if esperar_y_descargar(prompt_id):
                            print(f"[4] ¡Éxito! Dibujo guardado en la carpeta 'salida'.")
                            os.rename(ruta_foto, os.path.join(OUTPUT_DIR, "ORIGINAL_" + foto))
                        else:
                            print("❌ El motor falló internamente.")
                    else:
                        print("❌ Error: Orden rechazada.")
                else:
                    print("❌ Error: No se pudo subir la imagen.")
            except Exception as e:
                print(f"Esperando al motor... {e}")
                
        time.sleep(5)

if __name__ == "__main__":
    procesar()