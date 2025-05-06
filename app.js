const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Middleware para manejar datos binarios (raw)
app.use(bodyParser.raw({ type: 'application/vnd.teltonika.nmea', limit: '1mb' }));

app.post('/gps-data', (req, res) => {
    const body = req.body; // Datos NMEA recibidos en el cuerpo de la solicitud (binario o texto)

    if (Buffer.isBuffer(body)) {
        const nmeaData = body.toString(); // Convertir los datos binarios a una cadena de texto
        console.log('Datos del GPS recibidos (NMEA):', nmeaData);

        // Procesar la cadena NMEA
        const nmeaSentences = nmeaData.split('\n'); // Separar por línea cada sentencia NMEA
        nmeaSentences.forEach(sentence => {
            console.log('Sentencia NMEA:', sentence);
        });

        res.json({ message: 'Datos NMEA recibidos y procesados' });
    } else {
        res.status(400).json({ error: 'El cuerpo de la solicitud no es texto' });
    }
});

app.use((req, res) => {
    res.status(404).send('Ruta no encontrada');
});

const port = 3000;
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

