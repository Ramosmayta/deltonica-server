flowchart TD
    %% Inicio y servidor
    A[Inicio del servidor] --> B[app.listen(PORT)]
    %% Petición entrante
    C[Solicitud HTTP de un cliente] --> D{¿Ruta?}

    %% Rutas principales
    D -->|"/" GET| E[express.static ⇒ index.html]
    D -->|"/historial" GET| F[Retornar historialCoordenadas<br/>como JSON]

    %% Ruta GPS
    D -->|"/gps-data" POST| G[Middleware bodyParser.raw]
    G --> H{¿body es Buffer?}
    H -->|No| I[res.status(400) <br/>"Cuerpo inválido"]
    H -->|Sí| J[Convertir buffer a string<br/>y dividir en líneas]
    J --> K{¿Existe<br/>línea $GPGGA?}
    K -->|No| L[res.send<br/>"Datos procesados"]
    K -->|Sí| M[Extraer lat, lon, alt]
    M --> N[convertirCoordenadas()]
    N --> O[Push en historial (máx 50)]
    O --> P[res.send<br/>"Datos procesados"]

    %% 404
    D -->|Otra ruta| Q[res.status(404) <br/>"Ruta no encontrada"]
