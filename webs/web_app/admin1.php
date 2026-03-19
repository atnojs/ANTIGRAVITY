<?php
session_start();

// ========================================
// 🔐 CONFIGURACIÓN DE ADMINISTRADOR
// ========================================
$ADMIN_USER = 'a@a';  // ← CAMBIA TU USUARIO AQUÍ
$ADMIN_PASSWORD = '0';  // ← CAMBIA TU CONTRASEÑA AQUÍ
// ========================================

// Verificar login
if (isset($_POST['login'])) {
    if ($_POST['username'] === $ADMIN_USER && $_POST['password'] === $ADMIN_PASSWORD) {
        $_SESSION['admin_logged'] = true;
    } else {
        $error = 'Usuario o contraseña incorrectos';
    }
}

// Logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: admin.php');
    exit;
}

// Cargar datos
$jsonFile = 'web_data.json';
$data = json_decode(file_get_contents($jsonFile), true);

// Inicializar appUsage si no existe
if (!isset($data['appUsage'])) {
    $data['appUsage'] = [];
}

// Procesar acciones
if (isset($_SESSION['admin_logged']) && $_POST) {
    
    // Cambiar plan de usuario
    if (isset($_POST['change_plan'])) {
        $userId = $_POST['user_id'];
        $newPlan = $_POST['new_plan'];
        
        foreach ($data['users'] as &$user) {
            if ($user['id'] === $userId) {
                $user['currentPlan'] = $newPlan;
                $user['creditsToday'] = $data['plans'][$newPlan]['credits'];
                break;
            }
        }
        
        file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $success = 'Plan actualizado correctamente';
    }
    
    // Añadir/quitar créditos
    if (isset($_POST['adjust_credits'])) {
        $userId = $_POST['user_id'];
        $adjustment = intval($_POST['credit_adjustment']);
        
        foreach ($data['users'] as &$user) {
            if ($user['id'] === $userId) {
                $user['creditsToday'] = max(0, $user['creditsToday'] + $adjustment);
                break;
            }
        }
        
        file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $success = 'Créditos ajustados correctamente';
    }
    
    // Eliminar usuario
    if (isset($_POST['delete_user'])) {
        $userId = $_POST['user_id'];
        
        $data['users'] = array_filter($data['users'], function($user) use ($userId) {
            return $user['id'] !== $userId;
        });
        $data['users'] = array_values($data['users']);
        
        file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $success = 'Usuario eliminado correctamente';
    }
    
    // Editar planes
    if (isset($_POST['edit_plan'])) {
        $planKey = $_POST['plan_key'];
        $data['plans'][$planKey]['name'] = $_POST['plan_name'];
        $data['plans'][$planKey]['credits'] = intval($_POST['plan_credits']);
        $data['plans'][$planKey]['price'] = floatval($_POST['plan_price']);
        $data['plans'][$planKey]['description'] = $_POST['plan_description'];
        
        file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $success = 'Plan actualizado correctamente';
    }
    
    // Resetear créditos de todos los usuarios
    if (isset($_POST['reset_all_credits'])) {
        foreach ($data['users'] as &$user) {
            $user['creditsToday'] = $data['plans'][$user['currentPlan']]['credits'];
            $user['lastReset'] = date('D M d Y');
        }
        
        file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $success = 'Créditos reseteados para todos los usuarios';
    }
    
    // Resetear estadísticas
    if (isset($_POST['reset_stats'])) {
        $data['appUsage'] = [];
        file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $success = 'Estadísticas reseteadas correctamente';
    }
}

// Calcular estadísticas globales
$totalRequests = 0;
$totalCreditsUsed = 0;
foreach ($data['appUsage'] as $usage) {
    $totalRequests += $usage['totalRequests'];
    $totalCreditsUsed += $usage['totalCreditsUsed'];
}

// Si no está logueado, mostrar formulario de login
if (!isset($_SESSION['admin_logged'])) {
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0c;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .login-box {
            background: #141418;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 3rem;
            width: 100%;
            max-width: 400px;
        }
        h1 {
            color: #00d9ff;
            margin-bottom: 2rem;
            text-align: center;
        }
        input {
            width: 100%;
            padding: 1rem;
            background: #0a0a0c;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            color: #fff;
            font-size: 1rem;
            margin-bottom: 1rem;
        }
        button {
            width: 100%;
            padding: 1rem;
            background: #00d9ff;
            border: none;
            border-radius: 6px;
            color: #0a0a0c;
            font-weight: 600;
            cursor: pointer;
            font-size: 1rem;
        }
        button:hover { background: #00b8d4; }
        .error {
            background: rgba(244, 67, 54, 0.2);
            border: 1px solid #f44336;
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 1rem;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="login-box">
        <h1>🔐 Admin Panel</h1>
        <?php if (isset($error)): ?>
            <div class="error"><?= $error ?></div>
        <?php endif; ?>
        <form method="POST">
            <input type="text" name="username" placeholder="Usuario" required autofocus>
            <input type="password" name="password" placeholder="Contraseña" required>
            <button type="submit" name="login">Entrar</button>
        </form>
    </div>
</body>
</html>
<?php
exit;
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Administración</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0c;
            color: #fff;
            line-height: 1.6;
        }
        
        .header {
            background: #141418;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding: 1.5rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .header h1 {
            color: #00d9ff;
            font-size: 1.5rem;
        }
        
        .header-actions {
            display: flex;
            gap: 1rem;
        }
        
        .header a {
            color: rgba(255,255,255,0.7);
            text-decoration: none;
            padding: 0.5rem 1rem;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            transition: all 0.3s;
        }
        
        .header a:hover {
            background: rgba(255,255,255,0.05);
            color: #fff;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .alert {
            padding: 1rem 1.5rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .alert.success {
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid #4caf50;
            color: #4caf50;
        }
        
        .tabs {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            flex-wrap: wrap;
        }
        
        .tab {
            padding: 1rem 1.5rem;
            background: none;
            border: none;
            color: rgba(255,255,255,0.7);
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.3s;
            font-size: 1rem;
        }
        
        .tab:hover { color: #fff; }
        .tab.active {
            color: #00d9ff;
            border-bottom-color: #00d9ff;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }
        
        .stat-card {
            background: #141418;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 1.5rem;
        }
        
        .stat-card h3 {
            color: rgba(255,255,255,0.7);
            font-size: 0.9rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
        }
        
        .stat-card .value {
            font-size: 2rem;
            font-weight: 700;
            color: #00d9ff;
        }
        
        .stat-card.warning .value {
            color: #ffc107;
        }
        
        .stat-card.success .value {
            color: #4caf50;
        }
        
        table {
            width: 100%;
            background: #141418;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            overflow: hidden;
            border-collapse: collapse;
        }
        
        th {
            background: rgba(0, 217, 255, 0.1);
            color: #00d9ff;
            padding: 1rem;
            text-align: left;
            font-weight: 600;
        }
        
        td {
            padding: 1rem;
            border-top: 1px solid rgba(255,255,255,0.05);
        }
        
        tr:hover {
            background: rgba(255,255,255,0.02);
        }
        
        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
        }
        
        .badge.free { background: rgba(158, 158, 158, 0.2); color: #9e9e9e; }
        .badge.basic { background: rgba(33, 150, 243, 0.2); color: #2196f3; }
        .badge.premium { background: rgba(255, 193, 7, 0.2); color: #ffc107; }
        
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-primary {
            background: #00d9ff;
            color: #0a0a0c;
        }
        
        .btn-primary:hover { background: #00b8d4; }
        
        .btn-danger {
            background: rgba(244, 67, 54, 0.2);
            color: #f44336;
            border: 1px solid #f44336;
        }
        
        .btn-danger:hover {
            background: #f44336;
            color: #fff;
        }
        
        .btn-secondary {
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.7);
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .btn-secondary:hover {
            background: rgba(255,255,255,0.1);
            color: #fff;
        }
        
        .actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(5px);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal.active { display: flex; }
        
        .modal-content {
            background: #141418;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }
        
        .modal h2 {
            color: #00d9ff;
            margin-bottom: 1.5rem;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: rgba(255,255,255,0.7);
        }
        
        input, select, textarea {
            width: 100%;
            padding: 0.75rem;
            background: #0a0a0c;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            color: #fff;
            font-size: 1rem;
        }
        
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #00d9ff;
        }
        
        .form-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 2rem;
        }
        
        .search-box {
            margin-bottom: 1.5rem;
        }
        
        .search-box input {
            max-width: 400px;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 0.5rem;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #00d9ff, #00b8d4);
            transition: width 0.3s;
        }
        
        .app-usage-card {
            background: #141418;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        
        .app-usage-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .app-usage-title {
            font-size: 1.25rem;
            color: #00d9ff;
            font-weight: 600;
        }
        
        .app-usage-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .app-usage-stat {
            text-align: center;
        }
        
        .app-usage-stat-label {
            color: rgba(255,255,255,0.7);
            font-size: 0.85rem;
            margin-bottom: 0.25rem;
        }
        
        .app-usage-stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #00d9ff;
        }
        
        @media (max-width: 768px) {
            .header {
                flex-direction: column;
                gap: 1rem;
            }
            
            .stats {
                grid-template-columns: 1fr;
            }
            
            .tabs {
                overflow-x: auto;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1><i class="fas fa-shield-alt"></i> Panel de Administración</h1>
        <div class="header-actions">
            <a href="index.html" target="_blank"><i class="fas fa-external-link-alt"></i> Ver Sitio</a>
            <a href="?logout=1"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a>
        </div>
    </div>
    
    <div class="container">
        <?php if (isset($success)): ?>
            <div class="alert success">
                <i class="fas fa-check-circle"></i>
                <?= $success ?>
            </div>
        <?php endif; ?>
        
        <!-- Estadísticas Globales -->
        <div class="stats">
            <div class="stat-card">
                <h3>Total Usuarios</h3>
                <div class="value"><?= count($data['users']) ?></div>
            </div>
            <div class="stat-card">
                <h3>Usuarios Gratuitos</h3>
                <div class="value"><?= count(array_filter($data['users'], fn($u) => $u['currentPlan'] === 'free')) ?></div>
            </div>
            <div class="stat-card">
                <h3>Usuarios Básicos</h3>
                <div class="value"><?= count(array_filter($data['users'], fn($u) => $u['currentPlan'] === 'basic')) ?></div>
            </div>
            <div class="stat-card">
                <h3>Usuarios Premium</h3>
                <div class="value"><?= count(array_filter($data['users'], fn($u) => $u['currentPlan'] === 'premium')) ?></div>
            </div>
            <div class="stat-card warning">
                <h3>Total Solicitudes</h3>
                <div class="value"><?= $totalRequests ?></div>
            </div>
            <div class="stat-card success">
                <h3>Créditos Consumidos</h3>
                <div class="value"><?= $totalCreditsUsed ?></div>
            </div>
        </div>
        
        <!-- Tabs -->
        <div class="tabs">
            <button class="tab active" onclick="switchTab('stats')">
                <i class="fas fa-chart-bar"></i> Estadísticas
            </button>
            <button class="tab" onclick="switchTab('users')">
                <i class="fas fa-users"></i> Usuarios
            </button>
            <button class="tab" onclick="switchTab('plans')">
                <i class="fas fa-tags"></i> Planes
            </button>
            <button class="tab" onclick="switchTab('apps')">
                <i class="fas fa-th"></i> Apps
            </button>
        </div>
        
        <!-- Tab: Estadísticas de Uso -->
        <div id="tab-stats" class="tab-content active">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2 style="color: #00d9ff;">📊 Estadísticas de Uso por App</h2>
                <form method="POST" style="display: inline;">
                    <button type="submit" name="reset_stats" class="btn btn-danger" onclick="return confirm('¿Resetear TODAS las estadísticas?')">
                        <i class="fas fa-trash"></i> Resetear Estadísticas
                    </button>
                </form>
            </div>
            
            <?php if (empty($data['appUsage'])): ?>
                <div style="text-align: center; padding: 3rem; color: rgba(255,255,255,0.5);">
                    <i class="fas fa-chart-line" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>No hay estadísticas de uso todavía</p>
                    <p style="font-size: 0.9rem;">Las estadísticas aparecerán cuando los usuarios empiecen a usar las apps</p>
                </div>
            <?php else: ?>
                <?php 
                // Ordenar apps por más usadas
                $sortedUsage = $data['appUsage'];
                uasort($sortedUsage, fn($a, $b) => $b['totalRequests'] - $a['totalRequests']);
                
                foreach ($sortedUsage as $appId => $usage): 
                    $app = array_filter($data['apps'], fn($a) => $a['id'] === $appId);
                    $app = reset($app);
                    if (!$app) continue;
                    
                    // Calcular porcentaje de uso
                    $percentage = $totalRequests > 0 ? ($usage['totalRequests'] / $totalRequests) * 100 : 0;
                ?>
                <div class="app-usage-card">
                    <div class="app-usage-header">
                        <div>
                            <div class="app-usage-title">
                                <?= $app['icon'] ?> <?= htmlspecialchars($app['title']) ?>
                            </div>
                            <div style="color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-top: 0.25rem;">
                                <?= number_format($percentage, 1) ?>% del total de solicitudes
                            </div>
                        </div>
                    </div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: <?= $percentage ?>%"></div>
                    </div>
                    
                    <div class="app-usage-stats">
                        <div class="app-usage-stat">
                            <div class="app-usage-stat-label">Solicitudes</div>
                            <div class="app-usage-stat-value"><?= $usage['totalRequests'] ?></div>
                        </div>
                        <div class="app-usage-stat">
                            <div class="app-usage-stat-label">Créditos Usados</div>
                            <div class="app-usage-stat-value"><?= $usage['totalCreditsUsed'] ?></div>
                        </div>
                        <div class="app-usage-stat">
                            <div class="app-usage-stat-label">Usuarios Únicos</div>
                            <div class="app-usage-stat-value"><?= count($usage['userRequests']) ?></div>
                        </div>
                        <div class="app-usage-stat">
                            <div class="app-usage-stat-label">Último Uso</div>
                            <div class="app-usage-stat-value" style="font-size: 0.9rem;">
                                <?= $usage['lastUsed'] ? date('d/m/Y H:i', strtotime($usage['lastUsed'])) : 'Nunca' ?>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Top 5 usuarios de esta app -->
                    <?php if (!empty($usage['userRequests'])): ?>
                    <details style="margin-top: 1rem;">
                        <summary style="cursor: pointer; color: rgba(255,255,255,0.7); padding: 0.5rem;">
                            <i class="fas fa-users"></i> Ver usuarios que más usan esta app
                        </summary>
                        <div style="margin-top: 1rem;">
                            <table style="font-size: 0.9rem;">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Solicitudes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php 
                                    arsort($usage['userRequests']);
                                    $topUsers = array_slice($usage['userRequests'], 0, 5, true);
                                    foreach ($topUsers as $email => $requests): 
                                    ?>
                                    <tr>
                                        <td><?= htmlspecialchars($email) ?></td>
                                        <td><?= $requests ?></td>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </details>
                    <?php endif; ?>
                </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
        
        <!-- Tab: Usuarios -->
        <div id="tab-users" class="tab-content">
            <div class="search-box">
                <input type="text" id="search-users" placeholder="🔍 Buscar por email..." onkeyup="filterUsers()">
            </div>
            
            <form method="POST" style="margin-bottom: 1rem;">
                <button type="submit" name="reset_all_credits" class="btn btn-primary" onclick="return confirm('¿Resetear créditos de TODOS los usuarios?')">
                    <i class="fas fa-sync"></i> Resetear Créditos de Todos
                </button>
            </form>
            
            <table id="users-table">
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Plan</th>
                        <th>Créditos Hoy</th>
                        <th>Registro</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($data['users'] as $user): ?>
                    <tr>
                        <td><?= htmlspecialchars($user['email']) ?></td>
                        <td>
                            <span class="badge <?= $user['currentPlan'] ?>">
                                <?= $data['plans'][$user['currentPlan']]['name'] ?>
                            </span>
                        </td>
                        <td><?= $user['creditsToday'] ?></td>
                        <td><?= date('d/m/Y', strtotime($user['registrationDate'])) ?></td>
                        <td>
                            <div class="actions">
                                <button class="btn btn-secondary" onclick="openChangePlanModal('<?= $user['id'] ?>', '<?= $user['email'] ?>', '<?= $user['currentPlan'] ?>')">
                                    <i class="fas fa-exchange-alt"></i> Plan
                                </button>
                                <button class="btn btn-secondary" onclick="openCreditsModal('<?= $user['id'] ?>', '<?= $user['email'] ?>', <?= $user['creditsToday'] ?>)">
                                    <i class="fas fa-coins"></i> Créditos
                                </button>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="user_id" value="<?= $user['id'] ?>">
                                    <button type="submit" name="delete_user" class="btn btn-danger" onclick="return confirm('¿Eliminar usuario <?= htmlspecialchars($user['email']) ?>?')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </form>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <!-- Tab: Planes -->
        <div id="tab-plans" class="tab-content">
            <table>
                <thead>
                    <tr>
                        <th>Plan</th>
                        <th>Créditos/Día</th>
                        <th>Precio</th>
                        <th>Descripción</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($data['plans'] as $key => $plan): ?>
                    <tr>
                        <td><span class="badge <?= $key ?>"><?= $plan['name'] ?></span></td>
                        <td><?= $plan['credits'] ?></td>
                        <td><?= $plan['price'] > 0 ? '$' . $plan['price'] : 'Gratis' ?></td>
                        <td><?= $plan['description'] ?? '-' ?></td>
                        <td>
                            <button class="btn btn-primary" onclick="openEditPlanModal('<?= $key ?>', <?= htmlspecialchars(json_encode($plan)) ?>)">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <!-- Tab: Apps -->
        <div id="tab-apps" class="tab-content">
            <p style="color: rgba(255,255,255,0.7); margin-bottom: 1rem;">
                <i class="fas fa-info-circle"></i> Para gestionar las apps, usa el modo edición en la página principal.
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Título</th>
                        <th>URL</th>
                        <th>Créditos</th>
                        <th>Orden</th>
                    </tr>
                </thead>
                <tbody>
                    <?php 
                    $sortedApps = $data['apps'];
                    usort($sortedApps, fn($a, $b) => $a['order'] - $b['order']);
                    foreach ($sortedApps as $app): 
                    ?>
                    <tr>
                        <td><?= htmlspecialchars($app['title']) ?></td>
                        <td><a href="<?= htmlspecialchars($app['url']) ?>" target="_blank" style="color: #00d9ff;"><?= htmlspecialchars($app['url']) ?></a></td>
                        <td><?= $app['creditsPerRequest'] ?></td>
                        <td><?= $app['order'] ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Modales (igual que antes) -->
    <div id="modal-change-plan" class="modal">
        <div class="modal-content">
            <h2>Cambiar Plan de Usuario</h2>
            <form method="POST">
                <input type="hidden" name="user_id" id="change-plan-user-id">
                <div class="form-group">
                    <label>Usuario</label>
                    <input type="text" id="change-plan-email" readonly>
                </div>
                <div class="form-group">
                    <label>Nuevo Plan</label>
                    <select name="new_plan" required>
                        <?php foreach ($data['plans'] as $key => $plan): ?>
                        <option value="<?= $key ?>"><?= $plan['name'] ?> (<?= $plan['credits'] ?> créditos/día)</option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('modal-change-plan')">Cancelar</button>
                    <button type="submit" name="change_plan" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>
    
    <div id="modal-credits" class="modal">
        <div class="modal-content">
            <h2>Ajustar Créditos</h2>
            <form method="POST">
                <input type="hidden" name="user_id" id="credits-user-id">
                <div class="form-group">
                    <label>Usuario</label>
                    <input type="text" id="credits-email" readonly>
                </div>
                <div class="form-group">
                    <label>Créditos Actuales</label>
                    <input type="number" id="credits-current" readonly>
                </div>
                <div class="form-group">
                    <label>Ajuste (+ para añadir, - para quitar)</label>
                    <input type="number" name="credit_adjustment" placeholder="Ej: +10 o -5" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('modal-credits')">Cancelar</button>
                    <button type="submit" name="adjust_credits" class="btn btn-primary">Aplicar</button>
                </div>
            </form>
        </div>
    </div>
    
    <div id="modal-edit-plan" class="modal">
        <div class="modal-content">
            <h2>Editar Plan</h2>
            <form method="POST">
                <input type="hidden" name="plan_key" id="edit-plan-key">
                <div class="form-group">
                    <label>Nombre del Plan</label>
                    <input type="text" name="plan_name" id="edit-plan-name" required>
                </div>
                <div class="form-group">
                    <label>Créditos por Día</label>
                    <input type="number" name="plan_credits" id="edit-plan-credits" required>
                </div>
                <div class="form-group">
                    <label>Precio Mensual ($)</label>
                    <input type="number" step="0.01" name="plan_price" id="edit-plan-price" required>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea name="plan_description" id="edit-plan-description" rows="3"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('modal-edit-plan')">Cancelar</button>
                    <button type="submit" name="edit_plan" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        function switchTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById('tab-' + tab).classList.add('active');
        }
        
        function openChangePlanModal(userId, email, currentPlan) {
            document.getElementById('change-plan-user-id').value = userId;
            document.getElementById('change-plan-email').value = email;
            document.querySelector('[name="new_plan"]').value = currentPlan;
            document.getElementById('modal-change-plan').classList.add('active');
        }
        
        function openCreditsModal(userId, email, credits) {
            document.getElementById('credits-user-id').value = userId;
            document.getElementById('credits-email').value = email;
            document.getElementById('credits-current').value = credits;
            document.getElementById('modal-credits').classList.add('active');
        }
        
        function openEditPlanModal(key, plan) {
            document.getElementById('edit-plan-key').value = key;
            document.getElementById('edit-plan-name').value = plan.name;
            document.getElementById('edit-plan-credits').value = plan.credits;
            document.getElementById('edit-plan-price').value = plan.price;
            document.getElementById('edit-plan-description').value = plan.description || '';
            document.getElementById('modal-edit-plan').classList.add('active');
        }
        
        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }
        
        function filterUsers() {
            const search = document.getElementById('search-users').value.toLowerCase();
            const rows = document.querySelectorAll('#users-table tbody tr');
            
            rows.forEach(row => {
                const email = row.cells[0].textContent.toLowerCase();
                row.style.display = email.includes(search) ? '' : 'none';
            });
        }
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    </script>
</body>
</html>