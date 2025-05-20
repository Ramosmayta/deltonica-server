const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Middleware para manejar datos binarios (raw)
app.use(bodyParser.raw({ type: 'application/vnd.teltonika.nmea', limit: '1mb' }));

// Ruta para la página principal
app.get('/', (req, res) => {
    res.send(`
        <h1>Datos GPS de Teltonika</h1>
        <p>Envia datos a la ruta /gps-data (POST) para ver los datos NMEA aquí.</p>
    `);
});

// Ruta para recibir los datos NMEA
app.post('/gps-data', (req, res) => {
    const body = req.body; // Datos NMEA recibidos en el cuerpo de la solicitud (binario o texto)

    if (Buffer.isBuffer(body)) {
        const nmeaData = body.toString(); // Convertir los datos binarios a una cadena de texto
        console.log('Datos del GPS recibidos (NMEA):', nmeaData);

        // Procesar la cadena NMEA
        const nmeaSentences = nmeaData.split('\n'); // Separar por línea cada sentencia NMEA
        let processedData = '';
        nmeaSentences.forEach(sentence => {
            processedData += `<p>Sentencia NMEA: ${sentence}</p>`;
        });

        // Devolver los datos procesados en la respuesta HTTP
        res.send(`
            <h1>Datos NMEA recibidos</h1>
            <div>${processedData}</div>
        `);
    } else {
        res.status(400).json({ error: 'El cuerpo de la solicitud no es texto' });
    }
});

// Ruta para manejar 404 (cuando no se encuentra la ruta)
app.use((req, res) => {
    res.status(404).send('Ruta no encontrada');
});

// Iniciar el servidor en el puerto 3000
const port = 3000;
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
