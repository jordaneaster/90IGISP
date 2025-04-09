const { gql } = require('apollo-server-express');

/**
 * GraphQL Schema Definition
 * Defines types and operations for the GraphQL API
 */
const typeDefs = gql`
  # Custom scalars
  scalar JSON

  # GIS data coordinate point
  type Coordinates {
    lat: Float!
    lng: Float!
  }

  # Main GIS data type
  type GISData {
    id: ID!
    name: String!
    coordinates: Coordinates!
    geojson: JSON
    properties: JSON
    distance: Float
  }

  # Queries
  type Query {
    # Get a specific GIS point by ID
    gisPoint(id: ID!): GISData
    
    # Get GIS points within a radius
    gisPointsWithinRadius(
      lat: Float!,
      lng: Float!,
      radius: Float!
    ): [GISData]
  }

  # Mutations
  type Mutation {
    # Unlock access to GIS data
    unlockGISData(id: ID!): Boolean
  }
`;

module.exports = typeDefs;
