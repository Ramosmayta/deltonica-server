const express = require('express'); 
const bodyParser = require('body-parser');
const app = express();
const path = require('path');

let historialCoordenadas = []; // Guarda hasta 50 puntos

// Middleware para manejar datos binarios
app.use(bodyParser.raw({ type: 'application/vnd.teltonika.nmea', limit: '1mb' }));

// Función para convertir coordenadas NMEA a decimal, incluyendo dirección (N/S, E/W)
function convertirCoordenadas(nmea, direccionCardinal, tipo) {
    if (!nmea || !direccionCardinal) return null;

    const grados = parseInt(nmea.slice(0, tipo === 'lat' ? 2 : 3));
    const minutos = parseFloat(nmea.slice(tipo === 'lat' ? 2 : 3));
    let decimal = grados + minutos / 60;

    if ((tipo === 'lat' && direccionCardinal === 'S') ||
        (tipo === 'lon' && direccionCardinal === 'W')) {
        decimal *= -1;
    }

    return decimal.toFixed(6);
}

// Página principal con mapa Leaflet
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Ruta que entrega historial de puntos
app.get('/historial', (req, res) => {
    res.json(historialCoordenadas);
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
            const lat = convertirCoordenadas(partes[2], partes[3], 'lat');
            const lon = convertirCoordenadas(partes[4], partes[5], 'lon');
            const alt = partes[9];

            if (lat && lon) {
                const nuevaLectura = { lat, lon, alt };
                historialCoordenadas.push(nuevaLectura);
                if (historialCoordenadas.length > 50) {
                    historialCoordenadas.shift(); // Mantiene solo los últimos 50
                }
            }

            break; // Toma solo la primera línea válida
        }
    }

    res.send({ message: 'Datos procesados correctamente' });
});

// Ruta 404
app.use((req, res) => {
    res.status(404).send('Ruta no encontrada');
});

// Iniciar servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});
