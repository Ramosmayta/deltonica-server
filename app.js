const express = require('express'); 
const bodyParser = require('body-parser');
const app = express();

let historialCoordenadas = []; // Guarda hasta 50 puntos

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

// Página principal con mapa Leaflet
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Mapa en Tiempo Real - Teltonika</title>
    <meta charset="utf-8">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        #map { height: 100vh; width: 100vw; }
    </style>
</head>
<body>
    <div id="map"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        const map = L.map('map').setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        let marker = null;
        let polyline = L.polyline([], { color: 'blue' }).addTo(map);

        async function actualizarMapa() {
            try {
                const res = await fetch('/historial');
                const puntos = await res.json();
                if (puntos.length === 0) return;

                const coords = puntos.map(p => [parseFloat(p.lat), parseFloat(p.lon)]);
                const ultima = coords[coords.length - 1];

                polyline.setLatLngs(coords);

                if (!marker) {
                    marker = L.marker(ultima).addTo(map);
                } else {
                    marker.setLatLng(ultima);
                }

                map.setView(ultima, 15);
            } catch (err) {
                console.error("Error actualizando mapa:", err);
            }
        }

        setInterval(actualizarMapa, 1000);
    </script>
</body>
</html>
    `);
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
            const lat = convertirCoordenadas(partes[2], 'lat');
            const lon = convertirCoordenadas(partes[4], 'lon');
            const alt = partes[9];

            const nuevaLectura = { lat, lon, alt };

            historialCoordenadas.push(nuevaLectura);
            if (historialCoordenadas.length > 50) {
                historialCoordenadas.shift(); // Mantiene solo los últimos 50
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
