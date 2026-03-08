const admin = require('firebase-admin');

// Inicializar Firebase Admin con el service account del secret de GitHub
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://base-ac891-default-rtdb.firebaseio.com'
});

const db = admin.database();
const messaging = admin.messaging();

// Fechas a verificar: hoy y mañana (hora Argentina UTC-3)
function getFechas() {
  const now = new Date();
  // Ajustar a UTC-3
  const ar = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const hoy = ar.toISOString().split('T')[0];
  const manana = new Date(ar.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return { hoy, manana };
}

function pad(n) { return String(n).padStart(2, '0'); }

async function main() {
  const { hoy, manana } = getFechas();
  console.log(`Verificando eventos para hoy (${hoy}) y mañana (${manana})`);

  // Obtener todos los tokens registrados
  const tokensSnap = await db.ref('tokens').once('value');
  if (!tokensSnap.exists()) { console.log('No hay tokens registrados'); return; }

  // Obtener datos de todos los usuarios
  const datosSnap = await db.ref('datos').once('value');
  if (!datosSnap.exists()) { console.log('No hay datos de usuarios'); return; }

  const usuariosSnap = await db.ref('usuarios').once('value');
  const usuarios = usuariosSnap.val() || {};

  let enviadas = 0;
  const errores = [];

  // Por cada usuario que tenga tokens
  const tokensData = tokensSnap.val();
  for (const uid of Object.keys(tokensData)) {
    const userTokens = Object.values(tokensData[uid]).map(t => t.token).filter(Boolean);
    if (!userTokens.length) continue;

    const userData = datosSnap.child(uid).val();
    if (!userData || !userData.eventos) continue;

    const userInfo = usuarios[uid] || {};
    const nombre = userInfo.nombre || 'Estudiante';

    // Filtrar eventos de hoy y mañana
    const eventosHoy = (userData.eventos || []).filter(e => e.fecha === hoy);
    const eventosManana = (userData.eventos || []).filter(e => e.fecha === manana);

    const mensajes = [];

    if (eventosHoy.length > 0) {
      eventosHoy.forEach(e => {
        const ic = { tarea: '📝', examen: '🚨', evento: '📅', otro: '🔔' };
        mensajes.push({
          title: `${ic[e.tipo] || '📌'} ¡Hoy! ${e.titulo}`,
          body: e.materia ? `${e.materia}${e.desc ? ' — ' + e.desc : ''}` : (e.desc || 'Revisá tu agenda')
        });
      });
    }

    if (eventosManana.length > 0) {
      eventosManana.forEach(e => {
        const ic = { tarea: '📝', examen: '🚨', evento: '📅', otro: '🔔' };
        mensajes.push({
          title: `${ic[e.tipo] || '📌'} Mañana: ${e.titulo}`,
          body: e.materia ? `${e.materia}${e.desc ? ' — ' + e.desc : ''}` : (e.desc || 'Recordatorio para mañana')
        });
      });
    }

    if (!mensajes.length) continue;

    // Enviar una notificación por evento a cada token del usuario
    for (const msg of mensajes) {
      for (const token of userTokens) {
        try {
          await messaging.send({
            token,
            notification: {
              title: msg.title,
              body: msg.body
            },
            webpush: {
              notification: {
                icon: 'https://base-ac891.vercel.app/icon-192.png',
                badge: 'https://base-ac891.vercel.app/icon-192.png',
                requireInteraction: false
              },
              fcmOptions: {
                link: 'https://base-ac891.vercel.app/'
              }
            }
          });
          enviadas++;
        } catch (err) {
          // Token inválido — eliminarlo
          if (err.code === 'messaging/registration-token-not-registered') {
            await db.ref(`tokens/${uid}`).orderByChild('token').equalTo(token).once('value', snap => {
              snap.forEach(child => child.ref.remove());
            });
          } else {
            errores.push(`${uid}: ${err.message}`);
          }
        }
      }
    }

    console.log(`✅ ${nombre} (${uid}): ${mensajes.length} notificación(es) enviada(s)`);
  }

  console.log(`\nResumen: ${enviadas} push enviadas`);
  if (errores.length) console.log('Errores:', errores);

  process.exit(0);
}

main().catch(err => { console.error('Error fatal:', err); process.exit(1); });
