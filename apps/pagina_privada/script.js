// ESTE CÓDIGO VA EN TU ARCHIVO: Paginas/pagina_privada/script.js

async function checkPassword(inputPassword) {
  try {
    const response = await fetch('/Paginas/pagina_privada/validar_password.php', { // La URL está bien
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // CAMBIO IMPORTANTE AQUÍ
      },
      body: JSON.stringify({ password: inputPassword }), // CAMBIO IMPORTANTE AQUÍ
    });

    if (!response.ok) {
      const errorText = await response.text(); // Para ver más detalles del error si no es OK
      console.error('Error de red en script.js al validar:', response.status, errorText);
      throw new Error('Error de red: ' + response.status);
    }

    const result = await response.json(); // Esto debería funcionar ahora
    // Este console.log te mostrará la respuesta completa de depuración de tu PHP
    console.log("Respuesta de validar_password.php (llamado desde script.js):", result); 
    return result.success === true; // Comparamos estrictamente con true
  } catch (error) {
    console.error('Error en checkPassword (script.js):', error);
    return false;
  }
}

// Si en tu script.js tenías algo como "window.checkPassword = checkPassword;" para hacerlo global,
// asegúrate de que siga estando si la función activateEditMode (que está en privada.html)
// depende de que checkPassword sea global. Si ambas funciones (activateEditMode y checkPassword)
// estuvieran en este mismo script.js, no sería necesario hacerlo global.
// Por ahora, solo asegúrate que esta es la función que se usa.

window.checkPassword = checkPassword;