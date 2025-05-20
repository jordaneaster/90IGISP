// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('apollo-server-express');
const config = require('./config/config');
const authMiddleware = require('./middleware/auth');
const apiRoutes = require('./routes/api');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://your-vercel-app-name.vercel.app', 
        'https://your-custom-domain.com'
      ] 
    : 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// JWT Authentication middleware (90Auth)
app.use(authMiddleware);

// API Routes
app.use('/api', apiRoutes);

// Apollo GraphQL Server
async function startApolloServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      return { user: req.user };
    },
  });
  
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
  console.log(`GraphQL endpoint available at http://localhost:${config.port}/graphql`);
}

startApolloServer().catch(err => {
  console.error('Failed to start Apollo Server:', err);
});

// Start the server
app.listen(config.port, () => {
  console.log(`90IGISP server running on port ${config.port}`);
  console.log(`API Gateway (90Auth) ready for authentication`);
});
