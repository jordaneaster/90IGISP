require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '1h',
  },
  postgres: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || 'gisdb',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'password',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || '90igisp',
    groupId: process.env.KAFKA_GROUP_ID || '90igisp-group',
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://bxdnbinhpmcvebxrigve.supabase.co',
    key: process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZG5iaW5ocG1jdmVieHJpZ3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4NTMwMzgsImV4cCI6MjA1NjQyOTAzOH0.Qe0n1moB4xDHRU5xHVWidIsnjZ9BxdWtWG95KBXOeG8',
    serviceKey: process.env.SUPABASE_SERVICE_KEY // Optional for admin operations
  },
};
