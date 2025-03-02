// MQTT Client for receiving IMU data from Arduino QMI8658 sensor
const mqtt = require('mqtt');
const fs = require('fs');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

// Configuration - matches the Arduino config.h file
const config = {
  broker: 'mqtt://test.mosquitto.org',
  port: 1883,
  topic: '/TX_TOPIC',
  clientId: 'backend_receiver_' + Math.random().toString(16).substring(2, 8),
  webPort: 3000
};

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Connect to MQTT broker
const client = mqtt.connect(config.broker, {
  port: config.port,
  clientId: config.clientId
});

// Store the latest data
let latestData = {
  timestamp: new Date().toISOString(),
  accelerometer: { x: 0, y: 0, z: 0 },
  gyroscope: { x: 0, y: 0, z: 0 },
  temperature: 0,
  deviceTime: '00:00:00',
  config: {
    accelerometer: { range: 4, odr: 1000, lpf_mode: 0 },
    gyroscope: { range: 64, odr: 896.8, lpf_mode: 3 }
  }
};

// Setup MQTT event handlers
client.on('connect', () => {
    console.log(`Connected to MQTT broker: ${config.broker}`);
    client.subscribe(config.topic, (err) => {
      if (err) {
        console.log(`Error subscribing to topic: ${config.topic}`, err);
      } else {
        console.log(`Subscribed to topic: ${config.topic}`);
      }
    });
  });
  

  client.on('message', (topic, message) => {
    try {
      // Parse the incoming JSON message
      const data = JSON.parse(message.toString());
      console.log('Received data:', data);
  
      // Convert accelerometer and gyroscope values from strings to numbers
      const accelerometer = {
        x: parseFloat(data.acc?.x) || 0,
        y: parseFloat(data.acc?.y) || 0,
        z: parseFloat(data.acc?.z) || 0
      };
  
      const gyroscope = {
        x: parseFloat(data.gyr?.x) || parseFloat(data.acc?.x) || 0,
        y: parseFloat(data.gyr?.y) || parseFloat(data.acc?.y) || 0,
        z: parseFloat(data.gyr?.z) || parseFloat(data.acc?.z) || 0
      };
  
      // Store the data with timestamp
      latestData = {
        timestamp: new Date().toISOString(),
        accelerometer: accelerometer,
        gyroscope: gyroscope,
        temperature: parseFloat(data.temp) || 0,
        deviceTime: data.time || '00:00:00',
        config: data.config || latestData.config
      };
  
      // Log the latest data object for debugging purposes
      console.log('Updated latest data:', latestData);
    // Save data to log file
    logData(latestData);
    
    // Broadcast to all WebSocket clients
    broadcastData(latestData);
    
  } catch (error) {
    console.error('Error processing message:', error);
    console.log('Raw message:', message.toString());
  }
});

client.on('error', (err) => {
  console.error('MQTT Client Error:', err);
});

client.on('close', () => {
    console.log('MQTT connection closed, attempting to reconnect...');
    client.reconnect();
  });
  
// Function to save data to log file
function logData(data) {
  const logEntry = JSON.stringify(data) + '\n';
  fs.appendFile('imu_data_log.jsonl', logEntry, (err) => {
    if (err) console.error('Error writing to log file:', err);
  });
}

// Function to broadcast data to all WebSocket clients
function broadcastData(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Setup WebSocket server
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send the latest data to new clients
  ws.send(JSON.stringify(latestData));
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Set up the Express routes
app.use(express.static('public'));

// Create HTML page for viewing data
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <title>IMU Data Monitor</title>
    <style>
        .data-container {
            margin-bottom: 20px;
        }
        .chart-container {
            height: 300px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        <h1 class="text-center">IMU Data Monitor</h1>
        
        <div class="row mt-4">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">Sensor Readings</div>
                    <div class="card-body">
                        <p><strong>Device Time:</strong> <span id="deviceTime">--:--:--</span></p>
                        <p><strong>Server Time:</strong> <span id="timestamp">--:--:--</span></p>
                        <p><strong>Temperature:</strong> <span id="temperature">0</span> °C</p>
                        
                        <h5 class="mt-3">Accelerometer</h5>
                        <p>X: <span id="accX">0</span> g</p>
                        <p>Y: <span id="accY">0</span> g</p>
                        <p>Z: <span id="accZ">0</span> g</p>
                        
                        <h5 class="mt-3">Gyroscope</h5>
                        <p>X: <span id="gyrX">0</span> dps</p>
                        <p>Y: <span id="gyrY">0</span> dps</p>
                        <p>Z: <span id="gyrZ">0</span> dps</p>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">Sensor Configuration</div>
                    <div class="card-body">
                        <h5>Accelerometer</h5>
                        <p>Range: <span id="accRange">4</span> G</p>
                        <p>ODR: <span id="accODR">1000</span> Hz</p>
                        <p>LPF Mode: <span id="accLPF">0</span></p>
                        
                        <h5 class="mt-3">Gyroscope</h5>
                        <p>Range: <span id="gyrRange">64</span> DPS</p>
                        <p>ODR: <span id="gyrODR">896.8</span> Hz</p>
                        <p>LPF Mode: <span id="gyrLPF">3</span></p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">Accelerometer Data</div>
                    <div class="card-body">
                        <div class="chart-container">
                            <canvas id="accelerometerChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">Gyroscope Data</div>
                    <div class="card-body">
                        <div class="chart-container">
                            <canvas id="gyroscopeChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">Connection Status</div>
                    <div class="card-body">
                        <p>MQTT Broker: <span id="brokerStatus">Connecting...</span></p>
                        <p>WebSocket: <span id="wsStatus">Connecting...</span></p>
                        <p>Last Update: <span id="lastUpdate">Never</span></p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Initialize WebSocket connection
        const ws = new WebSocket(\`ws://\${window.location.host}/ws\`);
        
        // Initialize charts
        const accChartCtx = document.getElementById('accelerometerChart').getContext('2d');
        const gyrChartCtx = document.getElementById('gyroscopeChart').getContext('2d');
        
        // Configure time settings
        const maxDataPoints = 100;
        const timeData = Array(maxDataPoints).fill('');
        
        // Configure accelerometer data arrays
        const accXData = Array(maxDataPoints).fill(0);
        const accYData = Array(maxDataPoints).fill(0);
        const accZData = Array(maxDataPoints).fill(0);
        
        // Configure gyroscope data arrays
        const gyrXData = Array(maxDataPoints).fill(0);
        const gyrYData = Array(maxDataPoints).fill(0);
        const gyrZData = Array(maxDataPoints).fill(0);
        
        // Create accelerometer chart
        const accChart = new Chart(accChartCtx, {
            type: 'line',
            data: {
                labels: timeData,
                datasets: [
                    {
                        label: 'X',
                        data: accXData,
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    },
                    {
                        label: 'Y',
                        data: accYData,
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1
                    },
                    {
                        label: 'Z',
                        data: accZData,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Acceleration (g)'
                        }
                    }
                }
            }
        });
        
        // Create gyroscope chart
        const gyrChart = new Chart(gyrChartCtx, {
            type: 'line',
            data: {
                labels: timeData,
                datasets: [
                    {
                        label: 'X',
                        data: gyrXData,
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    },
                    {
                        label: 'Y',
                        data: gyrYData,
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1
                    },
                    {
                        label: 'Z',
                        data: gyrZData,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Angular Velocity (°/s)'
                        }
                    }
                }
            }
        });
        
        // Update WebSocket status
        ws.onopen = () => {
            document.getElementById('wsStatus').textContent = 'Connected';
            document.getElementById('wsStatus').style.color = 'green';
        };
        
        ws.onclose = () => {
            document.getElementById('wsStatus').textContent = 'Disconnected';
            document.getElementById('wsStatus').style.color = 'red';
        };
        
        ws.onerror = () => {
            document.getElementById('wsStatus').textContent = 'Error';
            document.getElementById('wsStatus').style.color = 'red';
        };
        
        // Handle incoming data
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Update sensor readings
                document.getElementById('deviceTime').textContent = data.deviceTime;
                document.getElementById('timestamp').textContent = new Date(data.timestamp).toLocaleTimeString();
                document.getElementById('temperature').textContent = data.temperature.toFixed(2);
                
                document.getElementById('accX').textContent = data.accelerometer.x.toFixed(4);
                document.getElementById('accY').textContent = data.accelerometer.y.toFixed(4);
                document.getElementById('accZ').textContent = data.accelerometer.z.toFixed(4);
                
                document.getElementById('gyrX').textContent = data.gyroscope.x.toFixed(4);
                document.getElementById('gyrY').textContent = data.gyroscope.y.toFixed(4);
                document.getElementById('gyrZ').textContent = data.gyroscope.z.toFixed(4);
                
                // Update configuration if available
                if (data.config) {
                    if (data.config[0] && data.config[1]) {
                        // Array format from Arduino
                        document.getElementById('accRange').textContent = data.config[0].range;
                        document.getElementById('accODR').textContent = data.config[0].odr;
                        document.getElementById('accLPF').textContent = data.config[0].lpf_mode;
                        
                        document.getElementById('gyrRange').textContent = data.config[1].range;
                        document.getElementById('gyrODR').textContent = data.config[1].odr;
                        document.getElementById('gyrLPF').textContent = data.config[1].lpf_mode;
                    } else if (data.config.accelerometer && data.config.gyroscope) {
                        // Object format
                        document.getElementById('accRange').textContent = data.config.accelerometer.range;
                        document.getElementById('accODR').textContent = data.config.accelerometer.odr;
                        document.getElementById('accLPF').textContent = data.config.accelerometer.lpf_mode;
                        
                        document.getElementById('gyrRange').textContent = data.config.gyroscope.range;
                        document.getElementById('gyrODR').textContent = data.config.gyroscope.odr;
                        document.getElementById('gyrLPF').textContent = data.config.gyroscope.lpf_mode;
                    }
                }
                
                // Update charts
                const now = new Date().toLocaleTimeString();
                
                // Remove oldest data point and add new one
                timeData.shift();
                timeData.push(now);
                
                accXData.shift();
                accYData.shift();
                accZData.shift();
                accXData.push(data.accelerometer.x);
                accYData.push(data.accelerometer.y);
                accZData.push(data.accelerometer.z);
                
                gyrXData.shift();
                gyrYData.shift();
                gyrZData.shift();
                gyrXData.push(data.gyroscope.x);
                gyrYData.push(data.gyroscope.y);
                gyrZData.push(data.gyroscope.z);
                
                // Update charts
                accChart.update();
                gyrChart.update();
                
                // Update last update time
                document.getElementById('lastUpdate').textContent = now;
                document.getElementById('brokerStatus').textContent = 'Connected';
                document.getElementById('brokerStatus').style.color = 'green';
                
            } catch (error) {
                console.error('Error parsing WebSocket data:', error);
            }
        };
    </script>
</body>
</html>
  `);
});

// get the latest data
app.get('/api/data', (req, res) => {
  res.json(latestData);
});

// Start the server
server.listen(config.webPort, () => {
  console.log(`Server running at http://localhost:${config.webPort}`);
});

// Handle program termination
process.on('SIGINT', () => {
  client.end();
  console.log('MQTT client disconnected');
  process.exit();
});