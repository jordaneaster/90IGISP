// Mock for KafkaJS

// Store sent messages for assertions
const sentMessages = {};

class MockProducer {
  constructor() {
    this.connected = false;
  }
  
  connect() {
    this.connected = true;
    return Promise.resolve();
  }
  
  disconnect() {
    this.connected = false;
    return Promise.resolve();
  }
  
  send({ topic, messages }) {
    if (!sentMessages[topic]) {
      sentMessages[topic] = [];
    }
    
    const parsedMessages = messages.map(msg => {
      if (typeof msg.value === 'string') {
        try {
          return { ...msg, value: JSON.parse(msg.value) };
        } catch (e) {
          return msg;
        }
      }
      return msg;
    });
    
    sentMessages[topic].push(...parsedMessages);
    return Promise.resolve();
  }
}

class MockConsumer {
  constructor() {
    this.connected = false;
    this.subscribed = [];
    this.messageHandler = null;
    this.errorHandler = null;
  }
  
  connect() {
    this.connected = true;
    return Promise.resolve();
  }
  
  disconnect() {
    this.connected = false;
    return Promise.resolve();
  }
  
  subscribe({ topic, fromBeginning }) {
    this.subscribed.push({ topic, fromBeginning });
    return Promise.resolve();
  }
  
  run({ eachMessage, eachBatch }) {
    if (eachMessage) {
      this.messageHandler = eachMessage;
    }
    if (eachBatch) {
      this.batchHandler = eachBatch;
    }
    return Promise.resolve();
  }
  
  on(event, handler) {
    if (event === 'error') {
      this.errorHandler = handler;
    }
    return this;
  }
  
  // Helper to simulate receiving a message in tests
  async simulateMessage(topic, key, value) {
    if (this.messageHandler && this.subscribed.some(sub => sub.topic === topic)) {
      await this.messageHandler({
        topic,
        partition: 0,
        message: {
          key: key ? Buffer.from(key) : null,
          value: Buffer.from(JSON.stringify(value)),
          headers: {},
          timestamp: Date.now()
        }
      });
      return true;
    }
    return false;
  }
  
  // Helper to simulate an error
  async simulateError(error) {
    if (this.errorHandler) {
      await this.errorHandler(error);
      return true;
    }
    return false;
  }
}

class Kafka {
  constructor() {}
  
  producer() {
    return new MockProducer();
  }
  
  consumer() {
    return new MockConsumer();
  }
}

module.exports = {
  Kafka,
  // Export for test assertions
  _sentMessages: sentMessages,
  _reset() {
    Object.keys(sentMessages).forEach(key => delete sentMessages[key]);
  }
};
