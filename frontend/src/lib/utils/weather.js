// Weather.gov API integration for Vermont cities
export async function getWeatherData(lat, lon, cityName) {
    try {
        console.log(`Fetching weather for ${cityName} (${lat}, ${lon})`);
        
        // Step 1: Get grid point information
        const pointResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
        if (!pointResponse.ok) {
            throw new Error(`Point lookup failed: ${pointResponse.status}`);
        }
        
        const pointData = await pointResponse.json();
        const { gridId, gridX, gridY } = pointData.properties;
        
        console.log(`Grid info for ${cityName}: ${gridId} ${gridX},${gridY}`);
        
        // Step 2: Get current forecast
        const forecastResponse = await fetch(`https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast`);
        if (!forecastResponse.ok) {
            throw new Error(`Forecast failed: ${forecastResponse.status}`);
        }
        
        const forecastData = await forecastResponse.json();
        
        // Step 3: Get hourly forecast for more detailed data
        const hourlyResponse = await fetch(`https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast/hourly`);
        let hourlyData = null;
        if (hourlyResponse.ok) {
            hourlyData = await hourlyResponse.json();
        }
        
        // Parse the current period (usually the first forecast period)
        const currentPeriod = forecastData.properties.periods[0];
        const currentHourly = hourlyData?.properties?.periods?.[0];
        
        return {
            cityName,
            temperature: currentPeriod.temperature,
            temperatureUnit: currentPeriod.temperatureUnit,
            windSpeed: currentPeriod.windSpeed,
            windDirection: currentPeriod.windDirection,
            humidity: currentHourly?.relativeHumidity?.value,
            shortForecast: currentPeriod.shortForecast,
            detailedForecast: currentPeriod.detailedForecast,
            isDaytime: currentPeriod.isDaytime,
            icon: currentPeriod.icon,
            gridInfo: { gridId, gridX, gridY },
            lastUpdated: new Date().toISOString()
        };
        
    } catch (error) {
        console.warn(`Weather fetch failed for ${cityName}:`, error);
        return {
            cityName,
            error: error.message,
            lastUpdated: new Date().toISOString()
        };
    }
}

export async function getWeatherForCities(cities) {
    const weatherPromises = cities.map(city => 
        getWeatherData(city.lat, city.lon, city.name)
    );
    
    try {
        const weatherResults = await Promise.allSettled(weatherPromises);
        return weatherResults.map((result, index) => ({
            ...cities[index],
            weather: result.status === 'fulfilled' ? result.value : { 
                error: result.reason?.message || 'Unknown error',
                cityName: cities[index].name
            }
        }));
    } catch (error) {
        console.error('Error fetching weather for cities:', error);
        return cities.map(city => ({
            ...city,
            weather: { error: 'Weather unavailable', cityName: city.name }
        }));
    }
}