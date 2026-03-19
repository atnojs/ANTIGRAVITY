<?php
/**
 * Conexión a la base de datos MySQL
 */
require_once 'config.php';

class Database
{
    private static $instance = null;
    private $connection;

    private function __construct()
    {
        try {
            $this->connection = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            error_log("Error de conexión: " . $e->getMessage());
            throw new Exception("Error de conexión a la base de datos");
        }
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection()
    {
        return $this->connection;
    }

    // Crear nueva conversación
    public function crearConversacion()
    {
        $stmt = $this->connection->prepare("INSERT INTO conversaciones () VALUES ()");
        $stmt->execute();
        return $this->connection->lastInsertId();
    }

    // Guardar mensaje
    public function guardarMensaje($conversacionId, $rol, $contenido, $imagenUrl = null)
    {
        $stmt = $this->connection->prepare(
            "INSERT INTO mensajes (conversacion_id, rol, contenido, imagen_url) VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([$conversacionId, $rol, $contenido, $imagenUrl]);
        return $this->connection->lastInsertId();
    }

    // Obtener mensajes de una conversación
    public function obtenerMensajes($conversacionId)
    {
        $stmt = $this->connection->prepare(
            "SELECT * FROM mensajes WHERE conversacion_id = ? ORDER BY created_at ASC"
        );
        $stmt->execute([$conversacionId]);
        return $stmt->fetchAll();
    }

    // Obtener todas las conversaciones
    public function obtenerConversaciones()
    {
        $stmt = $this->connection->query(
            "SELECT c.*, 
                    (SELECT contenido FROM mensajes WHERE conversacion_id = c.id ORDER BY created_at ASC LIMIT 1) as primer_mensaje
             FROM conversaciones c 
             ORDER BY c.created_at DESC 
             LIMIT 20"
        );
        return $stmt->fetchAll();
    }

    // Obtener fotos de referencia
    public function obtenerReferencias()
    {
        $stmt = $this->connection->query("SELECT * FROM referencias ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    // Agregar foto de referencia
    public function agregarReferencia($nombre, $ruta, $descripcion = null)
    {
        $stmt = $this->connection->prepare(
            "INSERT INTO referencias (nombre, ruta, descripcion) VALUES (?, ?, ?)"
        );
        $stmt->execute([$nombre, $ruta, $descripcion]);
        return $this->connection->lastInsertId();
    }

    // Eliminar foto de referencia
    public function eliminarReferencia($id)
    {
        $stmt = $this->connection->prepare("DELETE FROM referencias WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
?>