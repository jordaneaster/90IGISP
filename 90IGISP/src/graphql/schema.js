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

  # Tracking event for shipments
  type TrackingEvent {
    id: ID!
    shipmentId: ID!
    location: Coordinates!
    metadata: JSON
    timestamp: String!
  }
  
  # Company information
  type Company {
    id: ID!
    name: String!
    industry: String!
    revenueBracket: Int!
  }
  
  # Shipment data
  type Shipment {
    id: ID!
    origin: Coordinates!
    destination: Coordinates!
    weight: Float!
    company: Company!
    status: String!
    currentLocation: TrackingEvent
  }
  
  # Matched load for CRS
  type MatchedLoad {
    id: ID!
    shipments: [Shipment!]!
    totalWeight: Float!
    routeGeometry: JSON
    createdAt: String!
  }
  
  # Cost split for a company
  type CostSplit {
    shipmentId: ID!
    companyId: ID!
    companyName: String
    cost: Float!
  }
  
  # Cost breakdown
  type CostBreakdown {
    shipmentId: ID!
    totalGroupCost: Float!
    companyCost: Float!
    individualCost: Float!
    savings: Float!
    savingsPercentage: Float!
    breakdown: [CostSplit!]!
  }
  
  # Route efficiency metrics
  type EfficiencyMetrics {
    routeId: ID!
    totalDistance: Float!
    fuelConsumption: Float!
    co2Emissions: Float!
    timeEstimate: Float!
    costPerMile: Float!
  }
  
  # Input for load matching
  input MatchedLoadsInput {
    origin: CoordinatesInput!
    destination: CoordinatesInput!
    weight: Float!
    companyId: ID!
    industryType: String!
    revenueBracket: Int!
  }
  
  # Input for coordinates
  input CoordinatesInput {
    lat: Float!
    lng: Float!
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
    
    # Get matched loads for a shipment request
    matchedLoads(input: MatchedLoadsInput!): MatchedLoad
    
    # Track shipments for a company
    trackShipments(companyId: ID!): [TrackingEvent!]!
    
    # Get cost breakdown for a shipment
    costBreakdown(shipmentId: ID!): CostBreakdown!
    
    # Get route efficiency metrics
    routeEfficiencyMetrics(routeId: ID!): EfficiencyMetrics!
  }

  # Mutations
  type Mutation {
    # Unlock access to GIS data
    unlockGISData(id: ID!): Boolean
    
    # Record a tracking event
    recordTrackingEvent(
      shipmentId: ID!,
      lat: Float!,
      lng: Float!,
      metadata: JSON
    ): TrackingEvent
  }
`;

module.exports = typeDefs;
