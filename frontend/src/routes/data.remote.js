import { prerender } from '$app/server';
import { db } from '$lib/db/index';
import {
  vermontBoundaries,
  countyBoundaries,
  townBoundaries,
  trails,
  waterFeatures as waterFeaturesTable,
  stateFeatures as stateFeaturesTable,
  cities,
  weather,
  allenSites
} from '$lib/db/schema';
import { eq } from 'drizzle-orm';

// Load geographic boundaries from SQLite as raw GeoJSON
async function loadGeographicData() {
  console.log('Loading geographic boundaries from database...');

  // Load all geographic data from SQLite in parallel
  const [
    vermontData,
    countyData,
    townData,
    trailData,
    waterData,
    stateData
  ] = await Promise.all([
    db.select().from(vermontBoundaries),
    db.select().from(countyBoundaries),
    db.select().from(townBoundaries),
    db.select().from(trails),
    db.select().from(waterFeaturesTable),
    db.select().from(stateFeaturesTable)
  ]);

  // Return raw GeoJSON features
  const vermontFeatures = vermontData.map(feature => ({
    type: "Feature",
    geometry: JSON.parse(feature.geometry),
    properties: feature.properties ? JSON.parse(feature.properties) : {}
  }));

  const countyFeatures = countyData.map(feature => ({
    type: "Feature",
    geometry: JSON.parse(feature.geometry),
    properties: { countyName: feature.countyName, ...feature.properties ? JSON.parse(feature.properties) : {} }
  }));

  const townFeatures = townData.map(feature => ({
    type: "Feature",
    geometry: JSON.parse(feature.geometry),
    properties: { townName: feature.townName, countyName: feature.countyName, ...feature.properties ? JSON.parse(feature.properties) : {} }
  }));

  const trailFeatures = trailData.map(trail => ({
    type: "Feature",
    geometry: JSON.parse(trail.geometry),
    properties: {
      name: trail.trailName,
      type: trail.trailType,
      ...trail.properties ? JSON.parse(trail.properties) : {}
    }
  }));

  const waterFeatures = waterData.map(feature => ({
    type: "Feature",
    geometry: JSON.parse(feature.geometry),
    properties: { name: feature.name, type: feature.type, ...feature.properties ? JSON.parse(feature.properties) : {} }
  }));

  const stateFeatures = stateData.map(feature => ({
    type: "Feature",
    geometry: JSON.parse(feature.geometry),
    properties: { stateName: feature.stateName, ...feature.properties ? JSON.parse(feature.properties) : {} }
  }));

  console.log(`Loaded features: ${vermontFeatures.length} Vermont, ${countyFeatures.length} counties, ${townFeatures.length} towns, ${trailFeatures.length} trails, ${waterFeatures.length} water, ${stateFeatures.length} states`);

  return {
    vermontFeatures,
    countyFeatures,
    townFeatures,
    trailFeatures: trailFeatures,
    waterFeatures,
    stateFeatures
  };
}

// Load cities with coordinates and weather data
async function loadCitiesWithWeather() {
  console.log('Loading cities and weather from database...');

  // Get cities with their latest weather data
  const citiesWithWeather = await db.select({
      id: cities.id,
      name: cities.name,
      latitude: cities.latitude,
      longitude: cities.longitude,
      population: cities.population,
      county: cities.county,
      temperature: weather.temperature,
      temperatureUnit: weather.temperatureUnit,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      windDirection: weather.windDirection,
      shortForecast: weather.shortForecast,
      detailedForecast: weather.detailedForecast,
      isDaytime: weather.isDaytime,
      icon: weather.icon,
      fetchedAt: weather.fetchedAt
    })
    .from(cities)
    .leftJoin(weather, eq(cities.id, weather.cityId));

  // Return raw data - let client handle projection
  const processedCities = citiesWithWeather.map(city => ({
    id: city.id,
    name: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
    population: city.population,
    county: city.county,
    weather: city.temperature ? {
      temperature: city.temperature,
      temperatureUnit: city.temperatureUnit,
      humidity: city.humidity,
      windSpeed: city.windSpeed,
      windDirection: city.windDirection,
      shortForecast: city.shortForecast,
      detailedForecast: city.detailedForecast,
      isDaytime: city.isDaytime,
      icon: city.icon,
      fetchedAt: city.fetchedAt
    } : { error: 'Weather data unavailable' }
  }));

  console.log(`Loaded ${processedCities.length} cities with weather data`);
  return processedCities;
}

// Load Allen Lab research sites with coordinates
async function loadAllenSites() {
  console.log('Loading Allen Lab research sites...');

  const sites = await db.select().from(allenSites);

  const processedSites = sites.map(site => ({
    id: site.id,
    site: site.site,
    elevation: site.elevation,
    latitude: site.latitude,
    longitude: site.longitude,
    source: site.source
  }));

  console.log(`Loaded ${processedSites.length} Allen Lab research sites`);
  return processedSites;
}

// Main prerender function - loads all raw map data from SQLite
export const loadMapData = prerender(async () => {
  const [geographicData, citiesWithWeather, allenResearchSites] = await Promise.all([
      loadGeographicData(),
      loadCitiesWithWeather(),
      loadAllenSites()
  ]);
  
  return {
      ...geographicData,
      citiesWithWeather,
      allenSites: allenResearchSites,
  };
});