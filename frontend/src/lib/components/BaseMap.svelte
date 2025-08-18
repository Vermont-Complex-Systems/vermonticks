<script>
    import { onMount } from 'svelte';
    import { geoPath, geoMercator } from 'd3-geo';
    import { feature } from 'topojson-client';
    import { fetchWithCache } from '$lib/utils/geodata.js';
    
    let { width = 800, height = 600 } = $props();
    
    let vermontPaths = $state([]);
    let countyPaths = $state([]);
    let statePaths = $state([]);
    let townPaths = $state([]);
    let lakePaths = $state([]);
    let trailPaths = $state([]);
    let cities = $state([]);
    let loading = $state(true);
    
    onMount(async () => {
        try {
            console.log('Loading map data...');
            
            // Load Vermont, county, town, and trail data
            const [vermontData, countyData, townData, trailData] = await Promise.all([
                fetchWithCache('vermont_offline', null, '/data/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_vtbnd_SP_v1_3419293524892445662.geojson'),
                fetchWithCache('counties_offline', null, '/data/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_counties_SP_v1_-196546973346571976.geojson'),
                fetchWithCache('towns_offline', null, '/data/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_towns_SP_v1_-4796836414587772833.geojson'),
                fetchWithCache('trails_offline', null, '/data/FS_VCGI_OPENDATA_Emergency_TRAILS_line_SP_v1_-1226006560882090274.geojson')
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
                
                // Generate trail paths
                if (trailData && trailData.features) {
                    trailPaths = trailData.features.map(feature => pathGenerator(feature));
                    console.log('Hiking trails loaded:', trailPaths.length, 'paths');
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
</script>

<svg {width} {height} class="w-full h-full">
    {#if loading}
        <rect x="0" y="0" {width} {height} fill="#f0f0f0" />
        <text x={width/2} y={height/2} text-anchor="middle" fill="black" font-size="16">
            Loading map data...
        </text>
    {:else}
        <!-- Surrounding states (background) -->
        {#each statePaths as path}
            <path d={path} fill="rgba(200, 200, 200, 0.1)" stroke="rgba(150, 150, 150, 0.5)" stroke-width="0.5"/>
        {/each}
        
        <!-- Vermont boundary -->
        {#each vermontPaths as path}
            <path d={path} fill="rgba(255, 165, 0, 0.1)" stroke="orange" stroke-width="2"/>
        {/each}
        
        <!-- County boundaries -->
        {#each countyPaths as path}
            <path d={path} fill="none" stroke="red" stroke-width="1"/>
        {/each}
        
        <!-- Town boundaries -->
        {#each townPaths as path}
            <path d={path} fill="none" stroke="gray" stroke-width="0.2"/>
        {/each}
        
        <!-- Hiking trails -->
        {#each trailPaths as path}
            <path d={path} fill="none" stroke="green" stroke-width="1" opacity="0.7"/>
        {/each}
        
        <!-- Lake Champlain -->
        {#each lakePaths as path}
            <path d={path} fill="lightblue"/>
        {/each}
        
        
        <!-- Cities -->
        {#each cities as city}
            <circle cx={city.coords[0]} cy={city.coords[1]} r="3" fill="black" />
            <text x={city.coords[0] + 5} y={city.coords[1] - 5} font-size="10" fill="black">{city.name}</text>
        {/each}
    {/if}
</svg>