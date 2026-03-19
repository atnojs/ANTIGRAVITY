<?php
/**
 * Base de datos simplificada usando archivos JSON
 */

class SimpleDB
{
    private $dataDir;
    
    public function __construct()
    {
        $this->dataDir = __DIR__ . '/data/';
        if (!file_exists($this->dataDir)) {
            mkdir($this->dataDir, 0777, true);
        }
    }
    
    private function loadData($file)
    {
        $path = $this->dataDir . $file . '.json';
        if (!file_exists($path)) {
            return [];
        }
        $content = file_get_contents($path);
        return json_decode($content, true) ?: [];
    }
    
    private function saveData($file, $data)
    {
        $path = $this->dataDir . $file . '.json';
        file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));
    }
    
    // Crear nueva conversación
    public function crearConversacion()
    {
        $conversaciones = $this->loadData('conversaciones');
        $id = time() . '_' . uniqid();
        $conversacion = [
            'id' => $id,
            'titulo' => 'Nueva Conversación',
            'created_at' => date('Y-m-d H:i:s')
        ];
        $conversaciones[$id] = $conversacion;
        $this->saveData('conversaciones', $conversaciones);
        return $id;
    }
    
    // Guardar mensaje
    public function guardarMensaje($conversacionId, $rol, $contenido, $imagenUrl = null)
    {
        $mensajes = $this->loadData('mensajes');
        
        if (!isset($mensajes[$conversacionId])) {
            $mensajes[$conversacionId] = [];
        }
        
        $mensaje = [
            'id' => count($mensajes[$conversacionId]) + 1,
            'conversacion_id' => $conversacionId,
            'rol' => $rol,
            'contenido' => $contenido,
            'imagen_url' => $imagenUrl,
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $mensajes[$conversacionId][] = $mensaje;
        $this->saveData('mensajes', $mensajes);
        
        // Actualizar título de conversación si es el primer mensaje
        if (count($mensajes[$conversacionId]) === 1) {
            $this->actualizarTituloConversacion($conversacionId, substr($contenido, 0, 50));
        }
        
        return $mensaje['id'];
    }
    
    private function actualizarTituloConversacion($id, $titulo)
    {
        $conversaciones = $this->loadData('conversaciones');
        if (isset($conversaciones[$id])) {
            $conversaciones[$id]['titulo'] = $titulo;
            $this->saveData('conversaciones', $conversaciones);
        }
    }
    
    // Obtener mensajes de una conversación
    public function obtenerMensajes($conversacionId)
    {
        $mensajes = $this->loadData('mensajes');
        return isset($mensajes[$conversacionId]) ? $mensajes[$conversacionId] : [];
    }
    
    // Obtener todas las conversaciones
    public function obtenerConversaciones()
    {
        $conversaciones = $this->loadData('conversaciones');
        $result = [];
        
        foreach ($conversaciones as $id => $conv) {
            $mensajes = $this->loadData('mensajes');
            $primerMensaje = '';
            
            if (isset($mensajes[$id]) && !empty($mensajes[$id])) {
                $primerMensaje = $mensajes[$id][0]['contenido'] ?? '';
            }
            
            $result[] = [
                'id' => $id,
                'titulo' => $conv['titulo'],
                'created_at' => $conv['created_at'],
                'primer_mensaje' => $primerMensaje
            ];
        }
        
        // Ordenar por fecha descendente
        usort($result, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });
        
        return array_slice($result, 0, 20);
    }
    
    // Obtener fotos de referencia
    public function obtenerReferencias()
    {
        $referencias = $this->loadData('referencias');
        if (empty($referencias)) {
            // Crear algunas referencias de ejemplo (sin imágenes reales)
            $referencias = [
                [
                    'id' => 1,
                    'nombre' => 'Antonio - Foto perfil',
                    'ruta' => 'referencias/antonio_perfil.jpg',
                    'descripcion' => 'Hombre hispano, 30 años, cabello oscuro, sonrisa natural, iluminación de estudio',
                    'created_at' => date('Y-m-d H:i:s')
                ],
                [
                    'id' => 2,
                    'nombre' => 'Antonio - Estilo casual',
                    'ruta' => 'referencias/antonio_casual.jpg',
                    'descripcion' => 'Vistiendo camisa azul, fondo urbano, luz natural de tarde',
                    'created_at' => date('Y-m-d H:i:s')
                ]
            ];
            $this->saveData('referencias', $referencias);
        }
        return $referencias;
    }
    
    // Agregar foto de referencia
    public function agregarReferencia($nombre, $ruta, $descripcion = null)
    {
        $referencias = $this->loadData('referencias');
        $id = count($referencias) + 1;
        
        $referencia = [
            'id' => $id,
            'nombre' => $nombre,
            'ruta' => $ruta,
            'descripcion' => $descripcion,
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $referencias[] = $referencia;
        $this->saveData('referencias', $referencias);
        return $id;
    }
    
    // Eliminar foto de referencia
    public function eliminarReferencia($id)
    {
        $referencias = $this->loadData('referencias');
        $referencias = array_filter($referencias, function($ref) use ($id) {
            return $ref['id'] != $id;
        });
        $this->saveData('referencias', array_values($referencias));
        return true;
    }
}