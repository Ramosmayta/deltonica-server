const express = require('express'); 
const bodyParser = require('body-parser');
const app = express();

let ultimaLectura = null;

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
    if (!ultimaLectura) {
        return res.send(`
            <h1>Datos GPS de Teltonika</h1>
            <p>No se han recibido datos aún.</p>
        `);
    }

    res.send(`
        <h1>Última posición GPS recibida:</h1>
        <ul>
            <li><strong>Latitud:</strong> ${ultimaLectura.lat}</li>
            <li><strong>Longitud:</strong> ${ultimaLectura.lon}</li>
            <li><strong>Altitud:</strong> ${ultimaLectura.alt || 'N/A'} metros</li>
        </ul>
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
            break; // tomamos la primera válida
        }
    }

    res.send({ message: 'Datos procesados correctamente' });
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

