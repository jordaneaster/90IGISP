const { Kafka } = require('kafkajs');
const config = require('../config/config');

/**
 * Kafka Messaging Service
 * Handles message queue for asynchronous processing
 */
const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
});

// Initialize producer
const producer = kafka.producer();
producer.connect()
  .then(() => console.log('Kafka Producer connected'))
  .catch(err => console.error('Kafka Producer connection error:', err));

/**
 * Send message to Kafka topic
 * @param {string} topic - Topic to send message to
 * @param {Object} message - Message payload
 */
async function sendMessage(topic, message) {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log(`Message sent to Kafka topic ${topic}`);
    return true;
  } catch (error) {
    console.error(`Error sending message to topic ${topic}:`, error);
    throw error;
  }
}

// Initialize consumer
const consumer = kafka.consumer({ groupId: config.kafka.groupId });

/**
 * Start GIS data access consumer
 * Listens for GIS data unlock requests and processes them
 */
async function startGISDataConsumer() {
  await consumer.connect();
  console.log('Kafka Consumer connected');
  
  await consumer.subscribe({ topic: 'gis-data-access', fromBeginning: false });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        console.log(`Processing message from Kafka topic ${topic}:`, data);
        
        // Mock function to unlock GIS data
        if (data.action === 'unlock') {
          console.log(`Unlocking GIS data ID ${data.dataId} for user ${data.userId}`);
          // In a real implementation, this would update database records
          // or trigger other systems to provide access
        }
      } catch (error) {
        console.error('Error processing Kafka message:', error);
      }
    },
  });
}

// Start the consumer in background
startGISDataConsumer().catch(err => {
  console.error('Failed to start Kafka consumer:', err);
});

module.exports = {
  sendMessage
};
