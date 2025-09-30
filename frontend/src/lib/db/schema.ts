import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Geographic Features Schema
 * Stores GeoJSON features from various Vermont geographic datasets
 */

// Vermont boundary polygons
export const vermontBoundaries = sqliteTable('vermont_boundaries', {
  id: integer('id').primaryKey(),
  name: text('name'),                    // Boundary name/identifier
  geometry: text('geometry').notNull(),   // GeoJSON geometry as JSON string
  properties: text('properties'),         // Additional properties as JSON
  source: text('source').notNull(),       // Data source URL
  updatedAt: integer('updated_at').notNull(),
});

// County boundaries
export const countyBoundaries = sqliteTable('county_boundaries', {
  id: integer('id').primaryKey(),
  countyName: text('county_name').notNull(),
  geometry: text('geometry').notNull(),
  properties: text('properties'),
  source: text('source').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Town/municipal boundaries
export const townBoundaries = sqliteTable('town_boundaries', {
  id: integer('id').primaryKey(),
  townName: text('town_name').notNull(),
  countyName: text('county_name'),
  geometry: text('geometry').notNull(),
  properties: text('properties'),
  source: text('source').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Trail networks
export const trails = sqliteTable('trails', {
  id: integer('id').primaryKey(),
  trailName: text('trail_name'),          // TRAILNAME or NAME property
  trailType: text('trail_type'),          // TRAILTYPE property
  geometry: text('geometry').notNull(),   // LineString geometry
  properties: text('properties'),         // Full properties JSON
  source: text('source').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Water features (Lake Champlain, etc.)
export const waterFeatures = sqliteTable('water_features', {
  id: integer('id').primaryKey(),
  name: text('name'),
  type: text('type'),                     // 'lake', 'river', etc.
  geometry: text('geometry').notNull(),
  properties: text('properties'),
  source: text('source').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Surrounding states (for context)
export const stateFeatures = sqliteTable('state_features', {
  id: integer('id').primaryKey(),
  stateName: text('state_name').notNull(),
  geometry: text('geometry').notNull(),
  properties: text('properties'),
  source: text('source').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Elevation contours
export const elevationContours = sqliteTable('elevation_contours', {
  id: integer('id').primaryKey(),
  elevation: real('elevation').notNull(),    // Elevation in feet
  contourType: text('contour_type'),         // 'index' or 'intermediate'
  geometry: text('geometry').notNull(),      // LineString geometry
  properties: text('properties'),            // Additional properties as JSON
  source: text('source').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Cities and Weather Schema
 * Vermont cities with coordinates and weather data
 */

// Vermont cities with static information
export const cities = sqliteTable('cities', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  population: integer('population'),
  county: text('county'),
  createdAt: integer('created_at').notNull(),
});

// Allen Lab research sites
export const allenSites = sqliteTable('allen_sites', {
  id: integer('id').primaryKey(),
  site: text('site').notNull(),
  elevation: integer('elevation'),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  createdAt: integer('created_at').notNull(),
  source: text('source').notNull(),
});

// Allen Lab tick samples
export const allenSamples = sqliteTable('allen_samples', {
  id: integer('id').primaryKey(),
  tickId: integer('tick_id').notNull(),
  date: text('date').notNull(), // ISO date string
  site: text('site').notNull(),
  lifeStage: text('life_stage').notNull(),
  bbResult: integer('bb_result').notNull(), // 0 or 1 for negative/positive
  createdAt: integer('created_at').notNull(),
  source: text('source').notNull(),
});

// Weather data for cities (refreshed periodically)
export const weather = sqliteTable('weather', {
  id: integer('id').primaryKey(),
  cityId: integer('city_id').notNull().references(() => cities.id),
  temperature: integer('temperature'),
  temperatureUnit: text('temperature_unit'),
  humidity: integer('humidity'),
  windSpeed: text('wind_speed'),
  windDirection: text('wind_direction'),
  shortForecast: text('short_forecast'),
  detailedForecast: text('detailed_forecast'),
  isDaytime: integer('is_daytime', { mode: 'boolean' }),
  icon: text('icon'),
  gridId: text('grid_id'),
  gridX: integer('grid_x'),
  gridY: integer('grid_y'),
  fetchedAt: integer('fetched_at').notNull(),
  source: text('source').notNull(),       // API endpoint used
});

/**
 * Data Source Tracking
 * Keep track of when data was last updated from various sources
 */
export const dataSources = sqliteTable('data_sources', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),  // 'vermont_boundaries', 'weather', etc.
  apiUrl: text('api_url'),                // Primary API endpoint
  fallbackUrl: text('fallback_url'),      // Fallback static file
  lastFetched: integer('last_fetched'),   // Timestamp of last successful fetch
  lastError: text('last_error'),          // Last error message if any
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

/**
 * Type exports for use in application code
 * Drizzle will generate these automatically, but we can also define them explicitly
 */

export type VermontBoundary = typeof vermontBoundaries.$inferSelect;
export type NewVermontBoundary = typeof vermontBoundaries.$inferInsert;

export type CountyBoundary = typeof countyBoundaries.$inferSelect;
export type NewCountyBoundary = typeof countyBoundaries.$inferInsert;

export type TownBoundary = typeof townBoundaries.$inferSelect;
export type NewTownBoundary = typeof townBoundaries.$inferInsert;

export type Trail = typeof trails.$inferSelect;
export type NewTrail = typeof trails.$inferInsert;

export type WaterFeature = typeof waterFeatures.$inferSelect;
export type NewWaterFeature = typeof waterFeatures.$inferInsert;

export type StateFeature = typeof stateFeatures.$inferSelect;
export type NewStateFeature = typeof stateFeatures.$inferInsert;

export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;

export type AllenSite = typeof allenSites.$inferSelect;
export type NewAllenSite = typeof allenSites.$inferInsert;

export type AllenSample = typeof allenSamples.$inferSelect;
export type NewAllenSample = typeof allenSamples.$inferInsert;

export type Weather = typeof weather.$inferSelect;
export type NewWeather = typeof weather.$inferInsert;

export type DataSource = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;