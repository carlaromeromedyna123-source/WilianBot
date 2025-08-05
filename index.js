const fs = require('fs'); const { default: 
makeWASocket, useSingleFileAuthState, 
DisconnectReason } = 
require('@whiskeysockets/baileys'); const { Boom } 
= require('@hapi/boom'); const path = 
require('path');
// Crear carpeta de sesiones si no existe
if (!fs.existsSync('./sessions')) 
fs.mkdirSync('./sessions');
// Leer estado de autenticación
const { state, saveState } = 
useSingleFileAuthState('./sessions/auth_info.json');
// Cargar comandos
const comandos = new Map(); const comandosPath = 
path.join(__dirname, 'comandos'); 
fs.readdirSync(comandosPath).forEach(file => {
  if (file.endsWith('.js')) { const comando = 
    require(path.join(comandosPath, file)); 
    comandos.set(comando.nombre, comando);
  }
});
// Función principal
async function iniciarBot() { const sock = 
  makeWASocket({
    auth: state, printQRInTerminal: true,
  });
  sock.ev.on('creds.update', saveState); 
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update; 
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error 
      = Boom)?.output?.statusCode !== 
      DisconnectReason.loggedOut; console.log('❌ 
      Conexión cerrada. ¿Reconectar?', 
      shouldReconnect); if (shouldReconnect) {
        iniciarBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Bot conectado 
      correctamente');
    }
  });
  // Escuchar mensajes
  sock.ev.on('messages.upsert', async ({ messages, 
  type }) => {
    if (type !== 'notify') return; const m = 
    messages[0]; if (!m.message || m.key.fromMe) 
    return; const mensajeTexto = 
    m.message.conversation || 
    m.message.extendedTextMessage?.text || ''; 
    const comandoNombre = 
    mensajeTexto.trim().split(' 
    ')[0].slice(1).toLowerCase(); // quitar "!" 
    const args = mensajeTexto.trim().split(' 
    ').slice(1); if (comandos.has(comandoNombre)) {
      try { await 
        comandos.get(comandoNombre).ejecutar(sock, 
        m, args);
      } catch (error) {
        console.error('❌ Error al ejecutar el 
        comando:', error); await 
        sock.sendMessage(m.key.remoteJid, { text: 
        'Ocurrió un error al ejecutar el comando.' 
        });
      }
    }
  });
}
iniciarBot();
