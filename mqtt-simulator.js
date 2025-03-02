const mqtt = require('mqtt');

// Configuration for the MQTT broker
const config = {
  broker: 'mqtt://test.mosquitto.org', // Broker address
  port: 1883, // Port
  topic: '/TX_TOPIC', // Topic to publish to
  clientId: 'random_data_publisher_' + Math.random().toString(16).substring(2, 8)
};

// Connect to the MQTT broker
const client = mqtt.connect(config.broker, {
  port: config.port,
  clientId: config.clientId
});

// Function to generate random IMU data
function generateRandomData() {
  return {
    acc: {
      x: (Math.random() * 2 - 1).toFixed(2), // Random value between -1 and 1
      y: (Math.random() * 2 - 1).toFixed(2),
      z: (Math.random() * 2 - 1).toFixed(2)
    },
    gyr: {
      x: (Math.random() * 200 - 100).toFixed(2), // Random value between -100 and 100 degrees per second
      y: (Math.random() * 200 - 100).toFixed(2),
      z: (Math.random() * 200 - 100).toFixed(2)
    },
    temp: (Math.random() * 30 + 15).toFixed(2), // Random temperature between 15 and 45 °C
    time: new Date().toISOString(),
    config: {
      accelerometer: { range: 4, odr: 1000, lpf_mode: 0 },
      gyroscope: { range: 64, odr: 896.8, lpf_mode: 3 }
    }
  };
}

// When the client is connected to the broker
client.on('connect', () => {
  console.log(`Connected to MQTT broker: ${config.broker}`);
  
  // Publish random data every 1 second
  setInterval(() => {
    const randomData = generateRandomData();
    const message = JSON.stringify(randomData);
    
    // Publish the random data to the topic
    client.publish(config.topic, message, (err) => {
      if (err) {
        console.error('Error publishing message:', err);
      } else {
        console.log('Published data:', message);
      }
    });
  }, 1000); // Publish every 1 second
});

// Handle connection errors
client.on('error', (err) => {
  console.error('MQTT Client Error:', err);
});
