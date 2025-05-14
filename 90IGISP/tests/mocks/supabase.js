// Mock for Supabase client

// Mock data repositories
const mockData = {
  gis_points: [
    { id: '1', name: 'Test Point', geom: {}, properties: { type: 'landmark' } },
    { id: '2', name: 'Another Point', geom: {}, properties: { type: 'facility' } }
  ],
  shipments: [
    { 
      id: '1', 
      origin: { type: 'Point', coordinates: [-122.4194, 37.7749] }, 
      destination: { type: 'Point', coordinates: [-74.0060, 40.7128] },
      weight: 5000,
      company_id: '1',
      industry: 'electronics',
      revenue_bracket: 3,
      status: 'pending'
    }
  ],
  tracking_events: [],
  crs_groups: [],
  cost_splits: []
};

// Helper functions to simulate query building
class QueryBuilder {
  constructor(table, data) {
    this.table = table;
    this.data = [...data];
    this.filters = [];
    this.limitVal = null;
    this.orderField = null;
    this.orderDirection = 'asc';
    this.selectedFields = '*';
  }

  select(fields) {
    this.selectedFields = fields;
    return this;
  }

  eq(field, value) {
    this.filters.push(item => item[field] === value);
    return this;
  }

  neq(field, value) {
    this.filters.push(item => item[field] !== value);
    return this;
  }

  in(field, values) {
    this.filters.push(item => values.includes(item[field]));
    return this;
  }

  gte(field, value) {
    this.filters.push(item => item[field] >= value);
    return this;
  }

  lte(field, value) {
    this.filters.push(item => item[field] <= value);
    return this;
  }

  limit(value) {
    this.limitVal = value;
    return this;
  }

  order(field, { ascending }) {
    this.orderField = field;
    this.orderDirection = ascending ? 'asc' : 'desc';
    return this;
  }

  rpc(funcName, params) {
    // Mock RPC calls
    if (funcName === 'nearby_points') {
      // Mock for finding points within radius
      return {
        data: this.data.slice(0, 2),
        error: null
      };
    }
    if (funcName === 'get_tracking_coordinates') {
      return {
        data: { lat: 37.7749, lng: -122.4194 },
        error: null
      };
    }
    if (funcName === 'calculate_distance') {
      return {
        data: 3956, // Mock distance in km
        error: null
      };
    }
    if (funcName === 'points_within_radius') {
      return {
        data: this.data.slice(0, 2).map(p => ({
          ...p,
          lat: 37.7749,
          lng: -122.4194,
          distance: 500
        })),
        error: null
      };
    }
    if (funcName === 'within_route_buffer') {
      return {
        data: this.data.filter(s => s.status === 'pending'),
        error: null
      };
    }
    return this;
  }

  single() {
    return this.execute(true);
  }

  execute(single = false) {
    let result = [...this.data];
    
    // Apply filters
    if (this.filters.length) {
      for (const filter of this.filters) {
        result = result.filter(filter);
      }
    }
    
    // Apply order
    if (this.orderField) {
      result.sort((a, b) => {
        if (a[this.orderField] < b[this.orderField]) {
          return this.orderDirection === 'asc' ? -1 : 1;
        }
        if (a[this.orderField] > b[this.orderField]) {
          return this.orderDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    // Apply limit
    if (this.limitVal && result.length > this.limitVal) {
      result = result.slice(0, this.limitVal);
    }
    
    return {
      data: single ? (result.length > 0 ? result[0] : null) : result,
      error: null
    };
  }

  async then(callback) {
    callback(this.execute());
  }

  insert(data) {
    const newItems = Array.isArray(data) ? data : [data];
    
    // Add IDs if not provided
    newItems.forEach(item => {
      if (!item.id) {
        item.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      if (!item.created_at) {
        item.created_at = new Date().toISOString();
      }
    });
    
    this.data.push(...newItems);
    
    return {
      data: newItems,
      error: null,
      select: () => this
    };
  }

  update(data) {
    const updated = [];
    
    this.data = this.data.map(item => {
      let shouldUpdate = true;
      
      // Apply filters
      for (const filter of this.filters) {
        if (!filter(item)) {
          shouldUpdate = false;
          break;
        }
      }
      
      if (shouldUpdate) {
        updated.push({ ...item, ...data });
        return { ...item, ...data };
      }
      
      return item;
    });
    
    return {
      data: updated,
      error: null,
      select: () => this
    };
  }

  delete() {
    let deleted = [];
    let remaining = [];
    
    for (const item of this.data) {
      let shouldDelete = true;
      
      // Apply filters
      for (const filter of this.filters) {
        if (!filter(item)) {
          shouldDelete = false;
          break;
        }
      }
      
      if (shouldDelete) {
        deleted.push(item);
      } else {
        remaining.push(item);
      }
    }
    
    this.data = remaining;
    
    return {
      data: deleted,
      error: null
    };
  }
}

const createClient = () => {
  const tables = {};
  
  // Populate tables with initial data
  for (const [tableName, tableData] of Object.entries(mockData)) {
    tables[tableName] = new QueryBuilder(tableName, tableData);
  }
  
  return {
    from: (table) => {
      if (!tables[table]) {
        tables[table] = new QueryBuilder(table, []);
      }
      return tables[table];
    },
    rpc: (funcName, params) => {
      // Mock global RPC functions
      if (funcName === 'get_geojson_for_point') {
        return {
          data: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749]
          },
          error: null
        };
      }
      if (funcName === 'st_makepoint') {
        return { data: `POINT(${params.xcoord} ${params.ycoord})`, error: null };
      }
      if (funcName === 'st_setsrid') {
        return { data: params.geom, error: null };
      }
      if (funcName === 'st_transform') {
        return { data: params.geom, error: null };
      }
      if (funcName === 'calculate_route_metrics') {
        return {
          data: {
            distance_meters: 3800000, // ~3800km
            total_cost: 5200.50
          },
          error: null
        };
      }
      return { data: null, error: { message: `Unknown RPC function: ${funcName}` } };
    }
  };
};

// Export mock Supabase client
module.exports = {
  createClient
};

// Export helper for direct test access to mock data
module.exports.mockData = mockData;
