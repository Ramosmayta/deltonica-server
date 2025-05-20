const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.raw({ type: 'application/vnd.teltonika.nmea', limit: '1mb' }));

function convertToDecimal(coord, direction) {
    const degLen = (direction === 'N' || direction === 'S') ? 2 : 3;
    const degrees = parseFloat(coord.slice(0, degLen));
    const minutes = parseFloat(coord.slice(degLen));
    let decimal = degrees + (minutes / 60);
    if (direction === 'S' || direction === 'W') {
        decimal = -decimal;
    }
    return decimal;
}

app.post('/gps-data', (req, res) => {
    const body = req.body;

    if (Buffer.isBuffer(body)) {
        const nmeaData = body.toString();
        const nmeaSentences = nmeaData.split('\n');

        let latitude = null;
        let longitude = null;
        let altitude = null;

        for (const sentence of nmeaSentences) {
            const parts = sentence.trim().split(',');

            if (parts[0] === '$GPGGA' || parts[0] === '$GNGNS') {
                const lat = parts[2];
                const latDir = parts[3];
                const lon = parts[4];
                const lonDir = parts[5];
                const alt = parts[9];

                if (lat && latDir && lon && lonDir && alt) {
                    latitude = convertToDecimal(lat, latDir);
                    longitude = convertToDecimal(lon, lonDir);
                    altitude = parseFloat(alt);
                    break; // ya encontramos una sentencia válida
                }
            }
        }

        if (latitude !== null && longitude !== null && altitude !== null) {
            console.log(`Lat: ${latitude}, Lon: ${longitude}, Alt: ${altitude} m`);
            res.json({
                latitude,
                longitude,
                altitude
            });
        } else {
            res.status(400).json({ error: 'No se encontraron datos válidos de posición en las sentencias NMEA' });
        }
    } else {
        res.status(400).json({ error: 'El cuerpo de la solicitud no es texto binario' });
    }
});

app.use((req, res) => {
    res.status(404).send('Ruta no encontrada');
});

const port = 3000;
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
