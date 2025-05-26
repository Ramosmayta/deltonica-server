const express = require('express'); 
const bodyParser = require('body-parser');
const app = express();

let ultimaLectura = null;
let historialLecturas = []; // Guardar hasta 50 coordenadas

// Middleware para manejar datos binarios
app.use(bodyParser.raw({ type: 'application/vnd.teltonika.nmea', limit: '1mb' }));

// Función para convertir coordenadas NMEA a decimal
function convertirCoordenadas(nmea, direccion) {
    const grados = parseInt(nmea.slice(0, direccion === 'lat' ? 2 : 3));
    const minutos = parseFloat(nmea.slice(direccion === 'lat' ? 2 : 3));
    let decimal = grados + minutos / 60;

    if (direccion === 'lat' && (nmea.includes('S') || nmea.endsWith('S'))) decimal *= -1;
    if (direccion === 'lon' && (nmea.includes('W') || nmea.endsWith('W'))) decimal *= -1;

    return decimal.toFixed(6);
}

// Página principal
app.get('/', (req, res) => {
    res.send(`
        <h1>Seguimiento GPS</h1>
        <p>Abre la consola del navegador (F12) para ver las últimas coordenadas GPS recibidas en tiempo real.</p>

        <script>
            async function mostrarHistorial() {
                try {
                    const res = await fetch('/historial');
                    const datos = await res.json();

                    console.clear();
                    console.log("📍 Historial de coordenadas (máximo 50):");

                    datos.forEach((punto, i) => {
                        console.log(\`#\${i + 1} 🕒 \${punto.timestamp} | 🌐 Lat: \${punto.lat}, Lon: \${punto.lon}, ⛰️ Alt: \${punto.alt || 'N/A'}\`);
                    });

                } catch (err) {
                    console.error("❌ Error al obtener historial:", err);
                }
            }

            // Ejecutar cada segundo
            setInterval(mostrarHistorial, 1000);
        </script>
    `);
});

// Ruta POST para datos NMEA
app.post('/gps-data', (req, res) => {
    const body = req.body;

    if (!Buffer.isBuffer(body)) {
        return res.status(400).json({ error: 'Cuerpo inválido' });
    }

    const data = body.toString();
    const lineas = data.split('\n');

    for (let linea of lineas) {
        if (linea.startsWith('$GPGGA')) {
            const partes = linea.split(',');
            const lat = convertirCoordenadas(partes[2], 'lat');
            const lon = convertirCoordenadas(partes[4], 'lon');
            const alt = partes[9];

            ultimaLectura = { lat, lon, alt };
            const timestamp = new Date().toISOString();
            const nuevaLectura = { lat, lon, alt, timestamp };

            historialLecturas.push(nuevaLectura);
            if (historialLecturas.length > 50) {
                historialLecturas.shift(); // Mantener solo las últimas 50
            }

            break; // Solo procesar la primera línea válida
        }
    }

    res.send({ message: 'Datos procesados correctamente' });
});

// Ruta para devolver el historial completo
app.get('/historial', (req, res) => {
    res.json(historialLecturas);
});

// Ruta 404
app.use((req, res) => {
    res.status(404).send('Ruta no encontrada');
});

// Usar puerto de entorno (para Render) o 3000 localmente
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});
