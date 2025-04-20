CareGuardian-IMU
================

CareGuardian-IMU resuelve el problema de visualizar datos de sensores inerciales (IMU) en tiempo real de forma sencilla, usando herramientas accesibles y de propósito general como Node.js, WebSocket y Chart.js.

    const imuSocket = new WebSocket("ws://localhost:3000");
    imuSocket.onmessage = (data) => updateGraph(data);

Características
---------------

- Visualización en tiempo real de datos de acelerómetro y giroscopio.
- Integración con sensores IMU como el QMI8658.
- Interfaz web ligera y dinámica basada en Chart.js.
- Comunicación eficiente mediante MQTT y WebSockets.

Instalación
-----------

Instala CareGuardian-IMU ejecutando:

    git clone https://github.com/AsGuizar/LCD-WATCH-TESTING.git
    cd LCD-WATCH-TESTING
    npm install
    node index.js


Después abre tu navegador en `http://localhost:3000`.

Contribuciones
--------------

- Seguimiento de errores: https://github.com/AsGuizar/LCD-WATCH-TESTING/issues
- Código fuente: https://github.com/AsGuizar/LCD-WATCH-TESTING 

Soporte
-------

Si encuentras algún problema o deseas contribuir, puedes escribirnos o abrir un issue directamente en GitHub.


