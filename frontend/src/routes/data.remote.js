// @ts-nocheck
import { prerender } from '$app/server';
import { db } from '$lib/db/index';
import {
  vermontBoundaries,
  countyBoundaries,
  townBoundaries,
  trails,
  waterFeatures as waterFeaturesTable,
  stateFeatures as stateFeaturesTable,
  elevationContours,
  cities,
  weather,
  allenSites,
  allenSamples,
  agrSurvey2024
} from '$lib/db/schema';
import { eq, sql } from 'drizzle-orm';

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
    stateData,
    elevationData
  ] = await Promise.all([
    db.select().from(vermontBoundaries),
    db.select().from(countyBoundaries),
    db.select().from(townBoundaries),
    db.select().from(trails),
    db.select().from(waterFeaturesTable),
    db.select().from(stateFeaturesTable),
    db.select().from(elevationContours)
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

  const elevationFeatures = elevationData.map(feature => ({
    type: "Feature",
    geometry: JSON.parse(feature.geometry),
    properties: {
      elevation: feature.elevation,
      contourType: feature.contourType,
      ...feature.properties ? JSON.parse(feature.properties) : {}
    }
  }));

  console.log(`Loaded features: ${vermontFeatures.length} Vermont, ${countyFeatures.length} counties, ${townFeatures.length} towns, ${trailFeatures.length} trails, ${waterFeatures.length} water, ${stateFeatures.length} states, ${elevationFeatures.length} contours`);

  return {
    vermontFeatures,
    countyFeatures,
    townFeatures,
    trailFeatures: trailFeatures,
    waterFeatures,
    stateFeatures,
    elevationFeatures
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

// Load Allen Lab research sites with coordinates and tick sample data
async function loadAllenSites() {
  console.log('Loading Allen Lab research sites with tick data...');

  // Get all sites
  const sites = await db.select().from(allenSites);

  // Use SQL to aggregate nymph counts by site and year
  const nymphCounts = await db.select({
    site: allenSamples.site,
    year: sql`substr(${allenSamples.date}, 1, 4)`,
    count: sql`count(*)`
  })
  .from(allenSamples)
  .where(eq(allenSamples.lifeStage, 'nymph'))
  .groupBy(allenSamples.site, sql`substr(${allenSamples.date}, 1, 4)`)
  .orderBy(allenSamples.site, sql`substr(${allenSamples.date}, 1, 4)`);

  // Get total sample counts per site
  const totalCounts = await db.select({
    site: allenSamples.site,
    totalSamples: sql`count(*)`,
    totalNymphs: sql`sum(case when ${allenSamples.lifeStage} = 'nymph' then 1 else 0 end)`
  })
  .from(allenSamples)
  .groupBy(allenSamples.site);

  // Create lookup maps
  const nymphsBysite = {};
  nymphCounts.forEach(row => {
    if (!nymphsBysite[row.site]) nymphsBysite[row.site] = [];
    nymphsBysite[row.site].push({ year: parseInt(row.year), count: row.count });
  });

  const totalsMap = {};
  totalCounts.forEach(row => {
    totalsMap[row.site] = {
      totalSamples: row.totalSamples,
      totalNymphs: row.totalNymphs
    };
  });

  const processedSites = sites.map(site => ({
    id: site.id,
    site: site.site,
    elevation: site.elevation,
    latitude: site.latitude,
    longitude: site.longitude,
    source: site.source,
    nymphTimeseries: nymphsBysite[site.site] || [],
    totalSamples: totalsMap[site.site]?.totalSamples || 0,
    totalNymphs: totalsMap[site.site]?.totalNymphs || 0
  }));

  console.log(`Loaded ${processedSites.length} Allen Lab research sites with tick data`);
  return processedSites;
}

// Normalize town names for matching (handle "St" vs "Saint", apostrophes, etc)
function normalizeTownName(name) {
  return name
    .toLowerCase()
    .replace(/^st\s/i, 'saint ')
    .replace(/\s+gore$/i, "'s gore")
    .replace(/averys/i, "avery's")
    .replace(/warrens/i, "warren's")
    .trim();
}

// Load AGR 2024 Tick Survey data joined with town boundaries
async function loadAgrSurvey() {
  console.log('Loading AGR 2024 Tick Survey data...');

  // Get all survey data (excluding TOTAL row)
  const surveyData = await db.select().from(agrSurvey2024);
  const filteredSurvey = surveyData.filter(s => s.town !== 'TOTAL');

  // Get all town boundaries
  const towns = await db.select().from(townBoundaries);

  // Create town name lookup map
  const townMap = new Map();
  towns.forEach(town => {
    const props = town.properties ? JSON.parse(town.properties) : {};
    const normalizedName = normalizeTownName(props.TOWNNAMEMC || town.townName);
    townMap.set(normalizedName, town);
  });

  // Join survey data with town boundaries
  const agrWithGeometry = filteredSurvey.map(survey => {
    const normalizedSurveyTown = normalizeTownName(survey.town);
    const matchedTown = townMap.get(normalizedSurveyTown);

    if (!matchedTown) {
      console.warn(`⚠ No town boundary match for: ${survey.town}`);
      return null;
    }

    return {
      type: 'Feature',
      geometry: JSON.parse(matchedTown.geometry),
      properties: {
        town: survey.town,
        county: survey.county,
        ticksTested: survey.ticksTested,
        borreliaBurgdorferiCount: survey.borreliaBurgdorferiCount,
        borreliaBurgdorferiPercent: survey.borreliaBurgdorferiPercent,
        anaplasmaPhagocytophilumCount: survey.anaplasmaPhagocytophilumCount,
        anaplasmaPhagocytophilumPercent: survey.anaplasmaPhagocytophilumPercent,
        babesiaMicrotiCount: survey.babesiaMicrotiCount,
        babesiaMicrotiPercent: survey.babesiaMicrotiPercent,
        borreliaMiyamotoiCount: survey.borreliaMiyamotoiCount,
        borreliaMiyamotoiPercent: survey.borreliaMiyamotoiPercent,
        deerTickVirusCount: survey.deerTickVirusCount,
        deerTickVirusPercent: survey.deerTickVirusPercent,
      }
    };
  }).filter(Boolean);

  console.log(`Loaded ${agrWithGeometry.length} AGR survey records with geometry (${filteredSurvey.length - agrWithGeometry.length} unmatched)`);
  return agrWithGeometry;
}

// Main prerender function - loads all raw map data from SQLite
export const loadMapData = prerender(async () => {
  const [geographicData, citiesWithWeather, allenResearchSites, agrSurveyData] = await Promise.all([
      loadGeographicData(),
      loadCitiesWithWeather(),
      loadAllenSites(),
      loadAgrSurvey()
  ]);

  return {
      ...geographicData,
      citiesWithWeather,
      allenSites: allenResearchSites,
      agrSurvey: agrSurveyData,
  };
});