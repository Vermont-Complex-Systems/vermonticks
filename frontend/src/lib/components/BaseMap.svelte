<script>
    import { onMount } from 'svelte';
    import { geoPath, geoMercator } from 'd3-geo';
    import { feature } from 'topojson-client';
    import { fetchWithCache } from '$lib/utils/geodata.js';
    import { getWeatherForCities } from '$lib/utils/weather.js';
    
    let { width = 800, height = 600 } = $props();
    
    let vermontPaths = $state([]);
    let countyPaths = $state([]);
    let statePaths = $state([]);
    let townPaths = $state([]);
    let lakePaths = $state([]);
    let trailPaths = $state([]);
    let trailFeatures = $state([]); // Store original trail features with properties
    let cities = $state([]);
    let citiesWithWeather = $state([]);
    let loading = $state(true);
    let weatherLoading = $state(false);
    
    // Zoom and pan state
    let scale = $state(1);
    let translateX = $state(0);
    let translateY = $state(0);
    let isDragging = $state(false);
    let lastMousePos = { x: 0, y: 0 };
    
    // Tooltip state
    let tooltip = $state({ visible: false, x: 0, y: 0, text: '' });
    
    onMount(async () => {
        try {
            console.log('Loading map data...');
            
            // Load Vermont, county, town, and trail data
            const [vermontData, countyData, townData, trailData] = await Promise.all([
                fetchWithCache('vermont_offline', null, '/data/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_vtbnd_SP_v1_3419293524892445662.geojson'),
                fetchWithCache('counties_offline', null, '/data/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_counties_SP_v1_-196546973346571976.geojson'),
                fetchWithCache('towns_offline', null, '/data/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_towns_SP_v1_-4796836414587772833.geojson'),
                fetchWithCache('trails_offline', null, '/data/Trails.geojson')
            ]);
            
            if (vermontData && vermontData.features) {
                console.log('Vermont data received');
                
                // Set up basic projection with less padding to make Vermont bigger
                const projection = geoMercator().fitExtent([[20, 20], [width - 20, height - 20]], vermontData);
                const pathGenerator = geoPath().projection(projection);
                
                // Generate Vermont paths
                vermontPaths = vermontData.features.map(feature => pathGenerator(feature));
                console.log('Vermont boundary loaded:', vermontPaths.length, 'paths');
                
                // Generate county paths
                if (countyData && countyData.features) {
                    countyPaths = countyData.features.map(feature => pathGenerator(feature));
                    console.log('County boundaries loaded:', countyPaths.length, 'paths');
                }
                
                // Generate town paths
                if (townData && townData.features) {
                    townPaths = townData.features.map(feature => pathGenerator(feature));
                    console.log('Town boundaries loaded:', townPaths.length, 'paths');
                }
                
                // Generate trail paths and store features
                if (trailData && trailData.features) {
                    trailFeatures = trailData.features.map(feature => ({
                        path: pathGenerator(feature),
                        name: feature.properties?.TRAILNAME || feature.properties?.NAME || 'Unnamed Trail',
                        type: feature.properties?.TRAILTYPE || 'Trail'
                    }));
                    trailPaths = trailFeatures.map(trail => trail.path);
                    console.log('Hiking trails loaded:', trailPaths.length, 'paths');
                    console.log('Sample trail:', trailFeatures[0]); // Debug trail properties
                }
                
                // Set up cities (static data with coordinates)
                cities = [
                    { name: "Burlington", lat: 44.4759, lon: -73.2121, pop: 44743 },
                    { name: "Bennington", lat: 42.8781, lon: -73.1963, pop: 15333 },
                    { name: "Brattleboro", lat: 42.8509, lon: -72.5579, pop: 12184 },
                    { name: "Hartford", lat: 43.6478, lon: -72.3317, pop: 10686 },
                    { name: "Middlebury", lat: 44.0153, lon: -73.1673, pop: 9152 },
                    { name: "Springfield", lat: 43.2981, lon: -72.4823, pop: 9062 },
                    { name: "Barre", lat: 44.1970, lon: -72.5020, pop: 7923 },
                    { name: "St. Johnsbury", lat: 44.4192, lon: -72.0151, pop: 7364 },
                    { name: "Montpelier", lat: 44.2601, lon: -72.5806, pop: 8074 },
                    { name: "Rutland", lat: 43.6106, lon: -72.9726, pop: 15807 }
                ].map(city => ({
                    ...city,
                    coords: projection([city.lon, city.lat])
                }));
                console.log('Cities loaded:', cities.length, 'cities');
                
                // Load weather data for cities
                weatherLoading = true;
                try {
                    console.log('Loading weather data for cities...');
                    citiesWithWeather = await getWeatherForCities(cities);
                    console.log('Weather data loaded for', citiesWithWeather.length, 'cities');
                } catch (error) {
                    console.error('Failed to load weather data:', error);
                    citiesWithWeather = cities.map(city => ({ ...city, weather: { error: 'Weather unavailable' } }));
                } finally {
                    weatherLoading = false;
                }
                
                // Try to load lake from API (need proper WGS84 coordinates)
                try {
                    const lakeData = await fetchWithCache(
                        'lake_champlain',
                        'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_V_WATER_LKCH5K_POLY_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
                        null // Skip fallback file since it uses wrong coordinate system
                    );
                    
                    if (lakeData && lakeData.features) {
                        lakePaths = lakeData.features.map(feature => pathGenerator(feature));
                        console.log('Lake Champlain loaded:', lakePaths.length, 'paths');
                    }
                } catch (error) {
                    console.warn('Could not load lake from API:', error);
                }
                
                // Try to load surrounding states (optional)
                try {
                    const statesData = await fetchWithCache(
                        'us_states',
                        'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
                        null
                    );
                    
                    if (statesData) {
                        const statesGeoJSON = feature(statesData, statesData.objects.states);
                        const neighboringStates = statesGeoJSON.features.filter(state => 
                            ['New York', 'New Hampshire', 'Massachusetts', 'Connecticut', 'Maine'].includes(state.properties.name)
                        );
                        statePaths = neighboringStates.map(state => pathGenerator(state));
                        console.log('Surrounding states loaded:', statePaths.length, 'paths');
                    }
                } catch (error) {
                    console.warn('Could not load surrounding states:', error);
                }
                
            }
        } catch (error) {
            console.error('Error loading map data:', error);
        } finally {
            loading = false;
        }
    });
    
    // Zoom and pan functions
    function handleWheel(event) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(scale * delta, 1), 8);
        
        // Zoom towards mouse position
        const rect = event.currentTarget.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const scaleDiff = newScale - scale;
        translateX -= (mouseX - translateX) * scaleDiff / scale;
        translateY -= (mouseY - translateY) * scaleDiff / scale;
        
        scale = newScale;
    }
    
    function handleMouseDown(event) {
        isDragging = true;
        lastMousePos = { x: event.clientX, y: event.clientY };
        event.preventDefault();
    }
    
    function handleMouseMove(event) {
        if (!isDragging) return;
        
        const dx = event.clientX - lastMousePos.x;
        const dy = event.clientY - lastMousePos.y;
        
        translateX += dx;
        translateY += dy;
        
        lastMousePos = { x: event.clientX, y: event.clientY };
    }
    
    function handleMouseUp() {
        isDragging = false;
    }
    
    function resetZoom() {
        scale = 1;
        translateX = 0;
        translateY = 0;
    }
    
    // Tooltip functions
    function showTooltip(event, text) {
        const rect = event.currentTarget.closest('svg').getBoundingClientRect();
        tooltip = {
            visible: true,
            x: event.clientX - rect.left + 10,
            y: event.clientY - rect.top - 10,
            text: text
        };
    }
    
    function showCityTooltip(event, city) {
        const weather = city.weather;
        let weatherText = '';
        
        if (weather?.error) {
            weatherText = `Weather: ${weather.error}`;
        } else if (weather?.temperature) {
            weatherText = `${weather.temperature}°${weather.temperatureUnit} - ${weather.shortForecast}`;
            if (weather.humidity) {
                weatherText += `\nHumidity: ${weather.humidity}%`;
            }
            if (weather.windSpeed) {
                weatherText += `\nWind: ${weather.windSpeed} ${weather.windDirection}`;
            }
        } else if (weatherLoading) {
            weatherText = 'Loading weather...';
        } else {
            weatherText = 'Weather data unavailable';
        }
        
        const text = `${city.name}\nPopulation: ${city.pop.toLocaleString()}\n${weatherText}`;
        showTooltip(event, text);
    }
    
    function hideTooltip() {
        tooltip.visible = false;
    }
</script>

<div class="relative">
    <svg 
        {width} 
        {height} 
        class="w-full h-full cursor-move"
        role="img"
        aria-label="Interactive map of Vermont showing trails, counties, and cities"
        onwheel={handleWheel}
        onmousedown={handleMouseDown}
        onmousemove={handleMouseMove}
        onmouseup={handleMouseUp}
        onmouseleave={handleMouseUp}
    >
        {#if loading}
            <rect x="0" y="0" {width} {height} fill="#f0f0f0" />
            <text x={width/2} y={height/2} text-anchor="middle" fill="black" font-size="16">
                Loading map data...
            </text>
        {:else}
            <g transform="translate({translateX},{translateY}) scale({scale})">
                <!-- Surrounding states (background) -->
                {#each statePaths as path}
                    <path d={path} fill="rgba(200, 200, 200, 0.1)" stroke="rgba(150, 150, 150, 0.5)" stroke-width={0.5/scale}/>
                {/each}
                
                <!-- Vermont boundary -->
                {#each vermontPaths as path}
                    <path d={path} fill="rgba(255, 165, 0, 0.1)" stroke="orange" stroke-width={2/scale}/>
                {/each}
                
                <!-- County boundaries -->
                {#each countyPaths as path}
                    <path d={path} fill="none" stroke="black" stroke-width={1/scale}/>
                {/each}
                
                <!-- Town boundaries -->
                {#each townPaths as path}
                    <path d={path} fill="none" stroke="gray" stroke-width={0.2/scale}/>
                {/each}
                
                <!-- Hiking trails -->
                {#each trailFeatures as trail, i}
                    <path 
                        d={trail.path} 
                        fill="none" 
                        stroke="green" 
                        stroke-width={2/scale} 
                        opacity="0.7"
                    />
                {/each}
                
                <!-- Lake Champlain -->
                {#each lakePaths as path}
                    <path d={path} fill="lightblue"/>
                {/each}
                
                <!-- Cities with weather data -->
                {#each citiesWithWeather.length > 0 ? citiesWithWeather : cities as city}
                    <g class="city-group cursor-pointer">
                        <circle 
                            cx={city.coords[0]} 
                            cy={city.coords[1]} 
                            r={3/scale} 
                            fill={city.weather?.temperature ? 
                                (city.weather.temperature > 70 ? '#ff6b6b' : 
                                 city.weather.temperature > 50 ? '#ffd93d' : 
                                 city.weather.temperature > 32 ? '#6bcf7f' : '#74c0fc') : 'black'} 
                            stroke="white" 
                            stroke-width={0.5/scale}
                            onmouseenter={(e) => showCityTooltip(e, city)}
                            onmouseleave={hideTooltip}
                        />
                        <text 
                            x={city.coords[0] + 5/scale} 
                            y={city.coords[1] - 5/scale} 
                            font-size={10/scale} 
                            fill="black"
                            onmouseenter={(e) => showCityTooltip(e, city)}
                            onmouseleave={hideTooltip}
                        >
                            {city.name}
                        </text>
                        {#if city.weather?.temperature && !city.weather.error}
                            <text 
                                x={city.coords[0] + 5/scale} 
                                y={city.coords[1] + 8/scale} 
                                font-size={8/scale} 
                                fill="#666"
                                onmouseenter={(e) => showCityTooltip(e, city)}
                                onmouseleave={hideTooltip}
                            >
                                {city.weather.temperature}°{city.weather.temperatureUnit}
                            </text>
                        {/if}
                    </g>
                {/each}
            </g>
        {/if}
    </svg>
    
    {#if !loading}
        <!-- Reset button -->
        <button 
            onclick={resetZoom}
            class="absolute top-2 right-2 bg-white border border-gray-300 px-3 py-1 text-sm rounded shadow-sm hover:bg-gray-50"
        >
            Reset Zoom
        </button>
        
        <!-- Zoom indicator -->
        <div class="absolute top-2 left-2 bg-white border border-gray-300 px-2 py-1 text-xs rounded shadow-sm">
            {Math.round(scale * 100)}%
        </div>
        
        <!-- Weather loading indicator -->
        {#if weatherLoading}
            <div class="absolute top-16 left-2 bg-blue-100 border border-blue-300 px-3 py-2 text-sm rounded shadow-sm">
                Loading weather data...
            </div>
        {/if}
        
        <!-- Tooltip -->
        {#if tooltip.visible}
            <div 
                class="absolute bg-black text-white px-2 py-1 text-xs rounded shadow-lg pointer-events-none z-50 whitespace-pre-line"
                style="left: {tooltip.x}px; top: {tooltip.y}px;"
            >
                {tooltip.text}
            </div>
        {/if}
    {/if}
</div>