import { google } from 'googleapis';
import fs from 'fs';
import https from 'https';

console.log('=== DIAGNÓSTICO FINAL ===\n');

// 1. Verificar hora del sistema vs Google
console.log('1. SINCRONIZACIÓN DE HORA:');
const localTime = new Date();
console.log('   Hora local:', localTime.toISOString());
console.log('   Timestamp:', localTime.getTime());

// Obtener hora de Google
console.log('   Consultando hora de Google...');
https.get('https://www.google.com', (res) => {
  const googleDate = res.headers.date;
  console.log('   Hora según Google:', googleDate);

  const googleTimestamp = new Date(googleDate).getTime();
  const localTimestamp = localTime.getTime();
  const diff = Math.abs(googleTimestamp - localTimestamp);
  console.log('   Diferencia:', diff, 'ms (', Math.round(diff/1000), 'segundos )');

  if (diff > 60000) {
    console.log('   ⚠️ DIFERENCIA MAYOR A 60 SEGUNDOS - PROBLEMA DETECTADO');
  } else {
    console.log('   ✓ Hora sincronizada correctamente');
  }
}).on('error', (e) => {
  console.log('   No se pudo consultar hora de Google:', e.message);
});

// 2. Leer credenciales y verificar consistencia
console.log('\n2. VERIFICACIÓN DE CREDENCIALES:');
const creds = JSON.parse(fs.readFileSync('./testingivoo-12-832dd77e3244.json', 'utf8'));
console.log('   Project ID:', creds.project_id);
console.log('   Client Email:', creds.client_email);
console.log('   Private Key ID:', creds.private_key_id);

// Extraer información de la clave
const keyLines = creds.private_key.split('\n');
console.log('   Líneas en private_key:', keyLines.length);

// 3. Probar autenticación con logging detallado
console.log('\n3. INTENTO DE AUTENTICACIÓN DETALLADO:');

async function testAuth() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    console.log('   - GoogleAuth creado');

    // Obtener cliente
    const client = await auth.getClient();
    console.log('   - Cliente obtenido, tipo:', client.constructor.name);

    // Intentar obtener token
    console.log('   - Solicitando token de acceso...');
    const token = await client.getAccessToken();
    console.log('   ✅ TOKEN OBTENIDO:', token.token ? token.token.substring(0, 50) + '...' : 'N/A');

    // Probar con Sheets
    console.log('   - Probando Google Sheets API...');
    const sheets = google.sheets({ version: 'v4', auth: client });

    const response = await sheets.spreadsheets.get({
      spreadsheetId: '1aJ67--rYVLWO4OyuWPJKO6pevYs6rLUq2atslq51Eq4',
    });

    console.log('   ✅ CONEXIÓN EXITOSA');
    console.log('   - Nombre del Sheet:', response.data.properties?.title);

  } catch (error) {
    console.error('   ❌ ERROR:', error.message);
    console.error('\n   Stack completo:');
    console.error(error.stack);

    if (error.response) {
      console.error('\n   Respuesta del servidor:');
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }

    // Análisis específico del error
    if (error.message.includes('invalid_grant')) {
      console.log('\n   🔴 ANÁLISIS "invalid_grant":');
      console.log('   Este error significa que el token JWT fue rechazado.');
      console.log('\n   Causas específicas:');
      console.log('   1. La clave privada no corresponde al client_email');
      console.log('   2. La cuenta de servicio fue eliminada después de crear la clave');
      console.log('   3. El proyecto testingivoo-12 tiene restricciones de acceso');
      console.log('   4. La clave fue descargada pero nunca se activó correctamente');
      console.log('\n   🔧 SOLUCIÓN:');
      console.log('   Crea una NUEVA clave desde cero en:');
      console.log('   https://console.cloud.google.com/iam-admin/serviceaccounts');
      console.log('   Selecciona la cuenta > Claves > Agregar Clave > Crear nueva clave');
    }
  }
}

// Esperar 2 segundos para que termine la consulta de hora
setTimeout(testAuth, 2000);
