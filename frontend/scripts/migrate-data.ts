#!/usr/bin/env tsx

import 'dotenv/config';
import { feature } from 'topojson-client';
import { eq } from 'drizzle-orm';
import { csvParse } from 'd3-dsv';
import { readFileSync } from 'fs';
import { db } from '../src/lib/db/index';
import {
  vermontBoundaries,
  countyBoundaries,
  townBoundaries,
  trails,
  waterFeatures,
  stateFeatures,
  elevationContours,
  cities,
  weather,
  allenSites,
  allenSamples,
  agrSurvey2024,
  dataSources
} from '../src/lib/db/schema';
import { getWeatherData } from '../src/lib/utils/weather.js';

/**
 * Data Migration Script
 *
 * This script fetches fresh data from Vermont's Open Data APIs and populates
 * our SQLite database. It serves as both migration and documentation of
 * where our data comes from.
 *
 * Run with: pnpm tsx scripts/migrate-data.ts
 */

// Data sources categorized by update frequency
const CORE_MAP_DATA = {
  // Static geographic boundaries - rarely change (maybe once a year)
  vermont_boundaries: {
    name: 'vermont_boundaries',
    apiUrl: 'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_vtbnd_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
  },
  county_boundaries: {
    name: 'county_boundaries',
    apiUrl: 'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_counties_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
  },
  town_boundaries: {
    name: 'town_boundaries',
    apiUrl: 'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_towns_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
  },
  lake_champlain: {
    name: 'lake_champlain',
    apiUrl: 'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_V_WATER_LKCH5K_POLY_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
  },
  us_states: {
    name: 'us_states',
    apiUrl: 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
  }
};

const DYNAMIC_DATA = {
  // Trail networks - updated monthly
  trails: {
    name: 'trails',
    apiUrl: 'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Emergency_TRAILS_line_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
};

const WEATHER_DATA = {
  // Weather - updated daily
  weather: {
    name: 'weather',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Vermont cities for weather data
const VERMONT_CITIES = [
  { name: "Burlington", latitude: 44.4759, longitude: -73.2121, population: 44743, county: "Chittenden" },
  { name: "Bennington", latitude: 42.8781, longitude: -73.1963, population: 15333, county: "Bennington" },
  { name: "Brattleboro", latitude: 42.8509, longitude: -72.5579, population: 12184, county: "Windham" },
  { name: "Hartford", latitude: 43.6478, longitude: -72.3317, population: 10686, county: "Windsor" },
  { name: "Middlebury", latitude: 44.0153, longitude: -73.1673, population: 9152, county: "Addison" },
  { name: "Springfield", latitude: 43.2981, longitude: -72.4823, population: 9062, county: "Windsor" },
  { name: "Barre", latitude: 44.1970, longitude: -72.5020, population: 7923, county: "Washington" },
  { name: "St. Johnsbury", latitude: 44.4192, longitude: -72.0151, population: 7364, county: "Caledonia" },
  { name: "Montpelier", latitude: 44.2601, longitude: -72.5806, population: 8074, county: "Washington" },
  { name: "Rutland", latitude: 43.6106, longitude: -72.9726, population: 15807, county: "Rutland" }
];

async function needsUpdate(sourceName: string, maxAge: number): Promise<boolean> {
  const source = await db.select().from(dataSources).where(eq(dataSources.name, sourceName)).limit(1);

  if (source.length === 0) {
    console.log(`📍 ${sourceName}: No existing data - needs initial fetch`);
    return true;
  }

  const lastFetched = source[0].lastFetched;
  if (!lastFetched) {
    console.log(`📍 ${sourceName}: Never successfully fetched - needs update`);
    return true;
  }

  const ageInMs = Date.now() - lastFetched;
  const needsRefresh = ageInMs > maxAge;

  if (needsRefresh) {
    const ageInDays = Math.floor(ageInMs / (24 * 60 * 60 * 1000));
    console.log(`📍 ${sourceName}: ${ageInDays} days old - needs refresh`);
  } else {
    const ageInHours = Math.floor(ageInMs / (60 * 60 * 1000));
    console.log(`✓ ${sourceName}: ${ageInHours} hours old - up to date`);
  }

  return needsRefresh;
}

async function fetchFromAPI(source: any) {
  console.log(`Fetching ${source.name} from API...`);

  try {
    const response = await fetch(source.apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    console.log(`✓ Successfully fetched ${source.name} from API`);

    // Record successful fetch
    await db.insert(dataSources).values({
      name: source.name,
      apiUrl: source.apiUrl,
      fallbackUrl: null,
      lastFetched: Date.now(),
      lastError: null,
      isActive: true
    }).onConflictDoUpdate({
      target: dataSources.name,
      set: {
        lastFetched: Date.now(),
        lastError: null
      }
    });

    return data;
  } catch (error) {
    console.error(`❌ Failed to fetch ${source.name} from API:`, error);

    // Record the error
    await db.insert(dataSources).values({
      name: source.name,
      apiUrl: source.apiUrl,
      fallbackUrl: null,
      lastFetched: null,
      lastError: String(error),
      isActive: true
    }).onConflictDoUpdate({
      target: dataSources.name,
      set: {
        lastError: String(error)
      }
    });

    throw error;
  }
}

async function migrateVermontBoundaries() {
  const source = CORE_MAP_DATA.vermont_boundaries;

  if (!(await needsUpdate(source.name, source.maxAge))) {
    return;
  }

  console.log('📍 Migrating Vermont boundaries...');
  const data = await fetchFromAPI(source);

  // Clear old data
  await db.delete(vermontBoundaries);

  for (const feature of data.features) {
    await db.insert(vermontBoundaries).values({
      name: feature.properties?.NAME || 'Vermont',
      geometry: JSON.stringify(feature.geometry),
      properties: JSON.stringify(feature.properties),
      source: source.apiUrl,
      updatedAt: Date.now()
    });
  }

  console.log(`✓ Inserted ${data.features.length} Vermont boundary features`);
}

async function migrateCountyBoundaries() {
  const source = CORE_MAP_DATA.county_boundaries;

  if (!(await needsUpdate(source.name, source.maxAge))) {
    return;
  }

  console.log('📍 Migrating county boundaries...');
  const data = await fetchFromAPI(source);

  // Clear old data
  await db.delete(countyBoundaries);

  for (const feature of data.features) {
    await db.insert(countyBoundaries).values({
      countyName: feature.properties?.CNTYNAME || feature.properties?.NAME || 'Unknown',
      geometry: JSON.stringify(feature.geometry),
      properties: JSON.stringify(feature.properties),
      source: source.apiUrl,
      updatedAt: Date.now()
    });
  }

  console.log(`✓ Inserted ${data.features.length} county boundary features`);
}

async function migrateTownBoundaries() {
  const source = CORE_MAP_DATA.town_boundaries;

  if (!(await needsUpdate(source.name, source.maxAge))) {
    return;
  }

  console.log('📍 Migrating town boundaries...');
  const data = await fetchFromAPI(source);

  // Clear old data
  await db.delete(townBoundaries);

  for (const feature of data.features) {
    await db.insert(townBoundaries).values({
      townName: feature.properties?.TOWNNAME || feature.properties?.NAME || 'Unknown',
      countyName: feature.properties?.CNTYNAME || feature.properties?.COUNTY,
      geometry: JSON.stringify(feature.geometry),
      properties: JSON.stringify(feature.properties),
      source: source.apiUrl,
      updatedAt: Date.now()
    });
  }

  console.log(`✓ Inserted ${data.features.length} town boundary features`);
}

async function migrateTrails() {
  const source = DYNAMIC_DATA.trails;

  if (!(await needsUpdate(source.name, source.maxAge))) {
    return;
  }

  console.log('🥾 Migrating trails...');
  const data = await fetchFromAPI(source);

  // Clear old data
  await db.delete(trails);

  for (const feature of data.features) {
    await db.insert(trails).values({
      trailName: feature.properties?.TRAILNAME || feature.properties?.NAME || 'Unnamed Trail',
      trailType: feature.properties?.TRAILTYPE || 'Trail',
      geometry: JSON.stringify(feature.geometry),
      properties: JSON.stringify(feature.properties),
      source: source.apiUrl,
      updatedAt: Date.now()
    });
  }

  console.log(`✓ Inserted ${data.features.length} trail features`);
}

async function migrateWaterFeatures() {
  const source = CORE_MAP_DATA.lake_champlain;

  if (!(await needsUpdate(source.name, source.maxAge))) {
    return;
  }

  console.log('🌊 Migrating water features...');
  try {
    const data = await fetchFromAPI(source);

    // Clear old data
    await db.delete(waterFeatures);

    for (const feature of data.features) {
      await db.insert(waterFeatures).values({
        name: feature.properties?.NAME || 'Lake Champlain',
        type: 'lake',
        geometry: JSON.stringify(feature.geometry),
        properties: JSON.stringify(feature.properties),
        source: source.apiUrl,
        updatedAt: Date.now()
      });
    }

    console.log(`✓ Inserted ${data.features.length} water features`);
  } catch (error) {
    console.log(`⚠ Skipping water features: ${error}`);
  }
}

async function migrateStateFeatures() {
  const source = CORE_MAP_DATA.us_states;

  if (!(await needsUpdate(source.name, source.maxAge))) {
    return;
  }

  console.log('🗺️ Migrating surrounding states...');
  try {
    const data = await fetchFromAPI(source);
    const statesGeoJSON = feature(data, data.objects.states);
    const neighboringStates = statesGeoJSON.features.filter(state =>
      ['New York', 'New Hampshire', 'Massachusetts', 'Connecticut', 'Maine'].includes(state.properties.name)
    );

    // Clear old data
    await db.delete(stateFeatures);

    for (const stateFeature of neighboringStates) {
      await db.insert(stateFeatures).values({
        stateName: stateFeature.properties.name,
        geometry: JSON.stringify(stateFeature.geometry),
        properties: JSON.stringify(stateFeature.properties),
        source: source.apiUrl,
        updatedAt: Date.now()
      });
    }

    console.log(`✓ Inserted ${neighboringStates.length} state features`);
  } catch (error) {
    console.log(`⚠ Skipping state features: ${error}`);
  }
}

async function migrateElevationContours() {
  console.log('🏔️ Migrating elevation contours...');

  try {
    // Clear existing data
    await db.delete(elevationContours);

    // Fetch 20ft contours from Vermont VCGI
    const apiUrl = 'https://maps.vcgi.vermont.gov/arcgis/rest/services/EGC_services/MAP_VCGI_LIDARCONTOURS_WM_CACHE_v1/MapServer/17/query?geometry=-8230000,5280000,-8200000,5300000&geometryType=esriGeometryEnvelope&inSR=3857&outSR=3857&outFields=OBJECTID,Elevation&f=geojson';

    console.log('Fetching elevation contours from VCGI...');
    const response = await fetch(apiUrl);
    const geojson = await response.json();

    if (!geojson.features || geojson.features.length === 0) {
      console.log('⚠ No elevation contour features found');
      return;
    }

    const features = geojson.features;
    console.log(`Processing ${features.length} elevation contour features...`);

    // Process contour features
    const contourData = features.map((feature: any) => ({
      elevation: feature.properties.Elevation || 0,
      contourType: feature.properties.Type?.includes('Index') ? 'index' : 'intermediate',
      geometry: JSON.stringify(feature.geometry),
      properties: JSON.stringify(feature.properties),
      source: apiUrl,
      updatedAt: Date.now()
    }));

    // Insert in batches to avoid SQLite limits
    const batchSize = 100;
    for (let i = 0; i < contourData.length; i += batchSize) {
      const batch = contourData.slice(i, i + batchSize);
      await db.insert(elevationContours).values(batch);
      console.log(`✅ Inserted contour batch ${i + 1}-${Math.min(i + batchSize, contourData.length)}`);
    }

    console.log(`✅ Successfully migrated ${contourData.length} elevation contours`);
  } catch (error) {
    console.log(`⚠ Skipping elevation contours: ${error}`);
  }
}

async function migrateAllenSites() {
  console.log('🔬 Migrating Allen Lab research sites...');

  try {
    // Read the CSV file
    const csvContent = readFileSync('./src/data/allen_site_metadata.csv', 'utf-8');
    const sites = csvParse(csvContent);

    // Clear old data
    await db.delete(allenSites);

    for (const site of sites) {
      await db.insert(allenSites).values({
        site: site.site,
        elevation: parseInt(site.elev) || null,
        latitude: parseFloat(site.lat),
        longitude: parseFloat(site.long),
        createdAt: Date.now(),
        source: 'src/data/allen_site_metadata.csv'
      });
    }

    console.log(`✓ Inserted ${sites.length} Allen Lab research sites`);
  } catch (error) {
    console.error('❌ Failed to migrate Allen sites:', error);
  }
}

async function migrateAllenSamples() {
  console.log('🦠 Migrating Allen Lab tick samples...');

  try {
    // Read the CSV file
    const csvContent = readFileSync('./src/data/allen_sample_metadata_20250609.csv', 'utf-8');
    const samples = csvParse(csvContent);

    // Clear old data
    await db.delete(allenSamples);

    console.log(`Processing ${samples.length} tick samples...`);

    for (const sample of samples) {
      await db.insert(allenSamples).values({
        tickId: parseInt(sample.tick_id),
        date: sample.date,
        site: sample.site,
        lifeStage: sample.life_stage,
        bbResult: parseInt(sample.bb_result),
        createdAt: Date.now(),
        source: 'src/data/allen_sample_metadata_20250609.csv'
      });
    }

    console.log(`✓ Inserted ${samples.length} Allen Lab tick samples`);
  } catch (error) {
    console.error('❌ Failed to migrate Allen samples:', error);
  }
}

async function migrateAgrSurvey2024() {
  console.log('🔬 Migrating 2024 AGR Tick Survey...');

  try {
    // Read the CSV file
    const csvContent = readFileSync('./src/data/2024_AGR_Tick_Survey_Final_Report.csv', 'utf-8');
    const surveys = csvParse(csvContent);

    // Clear old data
    await db.delete(agrSurvey2024);

    console.log(`Processing ${surveys.length} survey records...`);

    for (const survey of surveys) {
      const ticksTested = parseInt(survey['Blacklegged Ticks Tested']) || 0;

      await db.insert(agrSurvey2024).values({
        town: survey.Town,
        county: survey.County,
        ticksTested,
        borreliaBurgdorferiCount: parseInt(survey['Borrelia burgdorferi Count']) || null,
        borreliaBurgdorferiPercent: parseFloat(survey['Borrelia burgdorferi %']) || null,
        anaplasmaPhagocytophilumCount: parseInt(survey['Anaplasma phagocytophilum Count']) || null,
        anaplasmaPhagocytophilumPercent: parseFloat(survey['Anaplasma phagocytophilum %']) || null,
        babesiaMicrotiCount: parseInt(survey['Babesia microti Count']) || null,
        babesiaMicrotiPercent: parseFloat(survey['Babesia microti %']) || null,
        borreliaMiyamotoiCount: parseInt(survey['Borrelia miyamotoi Count']) || null,
        borreliaMiyamotoiPercent: parseFloat(survey['Borrelia miyamotoi %']) || null,
        deerTickVirusCount: parseInt(survey['Deer Tick Virus Count']) || null,
        deerTickVirusPercent: parseFloat(survey['Deer Tick Virus %']) || null,
        createdAt: Date.now(),
        source: 'src/data/2024_AGR_Tick_Survey_Final_Report.csv'
      });
    }

    console.log(`✓ Inserted ${surveys.length} AGR survey records`);
  } catch (error) {
    console.error('❌ Failed to migrate AGR survey:', error);
  }
}

async function migrateCitiesAndWeather() {
  console.log('🏙️ Migrating cities and weather...');

  // Always ensure cities exist (they rarely change)
  for (const city of VERMONT_CITIES) {
    const [insertedCity] = await db.insert(cities).values({
      ...city,
      createdAt: Date.now()
    }).onConflictDoNothing().returning();

    if (insertedCity) {
      console.log(`✓ Inserted city: ${city.name}`);
    }
  }

  // Check if weather data needs updating
  const weatherConfig = WEATHER_DATA.weather;
  if (!(await needsUpdate(weatherConfig.name, weatherConfig.maxAge))) {
    return;
  }

  // Fetch and insert fresh weather data
  console.log('🌤️ Fetching weather data...');
  const allCities = await db.select().from(cities);

  // Clear old weather data
  await db.delete(weather);

  for (const city of allCities) {
    try {
      console.log(`Fetching weather for ${city.name}...`);
      const weatherData = await getWeatherData(city.latitude, city.longitude, city.name);

      if (weatherData.error) {
        console.log(`⚠ Weather error for ${city.name}: ${weatherData.error}`);
        continue;
      }

      await db.insert(weather).values({
        cityId: city.id,
        temperature: weatherData.temperature,
        temperatureUnit: weatherData.temperatureUnit,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        windDirection: weatherData.windDirection,
        shortForecast: weatherData.shortForecast,
        detailedForecast: weatherData.detailedForecast,
        isDaytime: weatherData.isDaytime,
        icon: weatherData.icon,
        gridId: weatherData.gridInfo?.gridId,
        gridX: weatherData.gridInfo?.gridX,
        gridY: weatherData.gridInfo?.gridY,
        fetchedAt: Date.now(),
        source: 'https://api.weather.gov'
      });

      console.log(`✓ Weather data for ${city.name}: ${weatherData.temperature}°${weatherData.temperatureUnit}`);
    } catch (error) {
      console.log(`⚠ Failed to fetch weather for ${city.name}: ${error}`);
    }
  }

  // Record successful weather fetch
  await db.insert(dataSources).values({
    name: 'weather',
    apiUrl: 'https://api.weather.gov',
    fallbackUrl: null,
    lastFetched: Date.now(),
    lastError: null,
    isActive: true
  }).onConflictDoUpdate({
    target: dataSources.name,
    set: {
      lastFetched: Date.now(),
      lastError: null
    }
  });
}

async function main() {
  console.log('🚀 Starting data migration...\n');

  try {
    // Check if we should force clear all data
    if (process.argv.includes('--force')) {
      console.log('🧹 Force refresh: Clearing all existing data...');
      await db.delete(weather);
      await db.delete(cities);
      await db.delete(agrSurvey2024);
      await db.delete(allenSamples);
      await db.delete(allenSites);
      await db.delete(stateFeatures);
      await db.delete(waterFeatures);
      await db.delete(trails);
      await db.delete(townBoundaries);
      await db.delete(countyBoundaries);
      await db.delete(vermontBoundaries);
      await db.delete(dataSources);
      console.log('✓ Cleared existing data\n');
    } else {
      console.log('📊 Using smart caching - only updating stale data\n');
    }

    // Migrate all data (each function handles its own caching logic)
    await migrateVermontBoundaries();
    await migrateCountyBoundaries();
    await migrateTownBoundaries();
    await migrateTrails();
    await migrateWaterFeatures();
    await migrateStateFeatures();
    // await migrateElevationContours(); APIURL DOESN'T WORK. CAN'T FIGURE IT OUT.
    await migrateAllenSites();
    await migrateAllenSamples();
    await migrateAgrSurvey2024();
    await migrateCitiesAndWeather();

    console.log('\n✅ Data migration completed successfully!');
    console.log('You can now run your app with the populated SQLite database.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();