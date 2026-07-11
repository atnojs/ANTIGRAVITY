<?php
// Claves privadas. Rellénalas en el SERVIDOR (Hostinger), NUNCA en el repo.
// F               = clave de FLUX / Black Forest Labs (generación de imágenes)
// DEEPSEEK_API_KEY = clave de DeepSeek (modelo de texto para "Mejorar Prompt")
// En Hostinger, F ya está en el .htaccess raíz (SetEnv F ...) y la clave de
// DeepSeek está como SetEnv B, así que pueden dejarse vacías aquí: el proxy
// las tomará del entorno (DEEPSEEK_API_KEY o B).
define('F', '');
define('DEEPSEEK_API_KEY', '');
