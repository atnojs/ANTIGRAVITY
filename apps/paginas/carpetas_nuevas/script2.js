// Nuevo script.js simplificado
async function checkPassword(inputPassword) {
  try {
    const response = await fetch('validar_password.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password: inputPassword })
    });
    
    if (!response.ok) throw new Error('Error de red');
    const result = await response.json();
    
    return result.success;
  } catch (error) {
    console.error('Error al validar:', error);
    return false;
  }
}

window.checkPassword = checkPassword;