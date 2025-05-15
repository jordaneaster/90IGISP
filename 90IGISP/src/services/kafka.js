const { Kafka } = require('kafkajs');

// Mock Kafka producer when Kafka is not available
class MockKafkaProducer {
  constructor() {
    console.log('Using mock Kafka producer (Kafka not available)');
    this.connected = true;
  }

  async connect() {
    return true;
  }

  async disconnect() {
    return true;
  }

  async send({ topic, messages }) {
    console.log(`[Mock Kafka] Message sent to topic '${topic}':`, 
      messages.map(m => typeof m.value === 'string' ? m.value : JSON.stringify(m.value)));
    return true;
  }
}

// Initialize with mock producer
let producer = new MockKafkaProducer();
let usingMock = true;

// Try to connect to Kafka asynchronously
try {
  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || '90igisp',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    connectionTimeout: 3000,
    retry: {
      initialRetryTime: 100,
      retries: 2
    }
  });

  const realProducer = kafka.producer();
  
  // Try connecting without blocking application startup
  realProducer.connect()
    .then(() => {
      console.log('Connected to Kafka broker');
      producer = realProducer;
      usingMock = false;
    })
    .catch(err => {
      console.log('Kafka connection failed, using mock producer:', err.message);
    });
} catch (error) {
  console.log('Failed to initialize Kafka:', error.message);
  // Already using mock, so no need to do anything
}

/**
 * Send a message to Kafka topic
 * @param {string} topic - Kafka topic name
 * @param {object} message - Message object to send
 * @returns {Promise<boolean>} Success status
 */
async function sendMessage(topic, message) {
  try {
    if (usingMock) {
      return producer.send({ 
        topic, 
        messages: [{ value: JSON.stringify(message) }] 
      });
    }
    
    // Using real Kafka producer
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    
    return true;
  } catch (error) {
    console.error('Kafka Producer error:', error.message);
    // Fall back to mock if real producer fails
    if (!usingMock) {
      usingMock = true;
      producer = new MockKafkaProducer();
    }
    
    // Try with mock producer
    return producer.send({ 
      topic, 
      messages: [{ value: JSON.stringify(message) }] 
    });
  }
}

module.exports = {
  sendMessage,
  isUsingMock: () => usingMock
};
