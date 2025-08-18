<script>
    import { geoPath, geoBounds, geoMercator } from 'd3-geo';
    import { feature } from 'topojson-client';
    import { fetchWithCache } from '$lib/utils/geodata.js';
    
    let { width = 800, height = 600 } = $props();
    
    let vermontBoundary = $state();
    let countyBoundary = $state();
    let townBoundary = $state();
    let hikingTrails = $state();
    let lakeChamplain = $state();
    let surroundingStates = $state();
    let mapPaths = $state([]);
    let countyPaths = $state([]);
    let townPaths = $state([]);
    let trailPaths = $state([]);
    let lakePaths = $state([]);
    let statePaths = $state([]);
    let projection = $state();
    let pathGenerator = $state();
    
    // Major Vermont cities (incorporated cities only)
    const cities = [
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
    ];

    $effect(() => {
        (async () => {
            vermontBoundary = await fetchWithCache(
                'vermont',
                'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_vtbnd_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
                '/src/data/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_vtbnd_SP_v1_3419293524892445662.geojson'
            );
            
            countyBoundary = await fetchWithCache(
                'counties',
                'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_counties_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
                '/src/data/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_counties_SP_v1_-196546973346571976.geojson'
            );
            
            try {
                townBoundary = await fetchWithCache(
                    'towns',
                    'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_towns_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
                    '/src/data/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_towns_SP_v1_-4796836414587772833.geojson'
                );
                console.log('Town boundary loaded:', townBoundary);
            } catch (error) {
                console.error('Failed to load town boundaries:', error);
            }
            
            hikingTrails = await fetchWithCache(
                'hiking_trails',
                'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Emergency_TRAILS_line_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
                '/src/data/FS_VCGI_OPENDATA_Emergency_TRAILS_line_SP_v1_-1226006560882090274.geojson'
            );
            
            lakeChamplain = await fetchWithCache(
                'lake_champlain',
                'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_V_WATER_LKCH5K_POLY_SP_v1/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson',
                '/src/data/FS_VCGI_OPENDATA_V_WATER_LKCH5K_POLY_SP_v1_-684187697646999143.geojson'
            );
            
            surroundingStates = await fetchWithCache(
                'us_states',
                'https://cdn.jsdelivr.net/npm/us-atlas@3/states-50m.json',
                null
            );

            if (vermontBoundary && vermontBoundary.features) {
                projection = geoMercator().fitExtent([[50, 0], [width * 0.9, height - 50]], vermontBoundary);
                pathGenerator = geoPath().projection(projection);

                mapPaths = vermontBoundary.features.map(feature => pathGenerator(feature));
                
                if (countyBoundary && countyBoundary.features) {
                    countyPaths = countyBoundary.features.map(feature => pathGenerator(feature));
                }
                
                if (townBoundary && townBoundary.features) {
                    townPaths = townBoundary.features.map(feature => pathGenerator(feature));
                }
                
                if (hikingTrails && hikingTrails.features) {
                    trailPaths = hikingTrails.features.map(feature => pathGenerator(feature));
                }
                
                if (lakeChamplain && lakeChamplain.features) {
                    lakePaths = lakeChamplain.features.map(feature => pathGenerator(feature));
                }
                
                if (surroundingStates) {
                    const statesGeoJSON = feature(surroundingStates, surroundingStates.objects.states);
                    const neighboringStates = statesGeoJSON.features.filter(state => 
                        ['New York', 'New Hampshire', 'Massachusetts', 'Connecticut', 'Maine'].includes(state.properties.name)
                    );
                    statePaths = neighboringStates.map(state => pathGenerator(state));
                }
            }
        })();
    });
</script>

<svg {width} {height} class="w-full h-full">
    {#each statePaths as path, i}
        <path d={path} fill="rgba(200, 200, 200, 0.1)" stroke="rgba(150, 150, 150, 0.5)" stroke-width="0.5"/>
    {/each}
    {#each mapPaths as path, i}
        <path d={path} fill="rgba(255, 165, 0, 0.1)" stroke="orange" stroke-width="1"/>
    {/each}
    {#each countyPaths as path, i}
        <path d={path} fill="none" stroke="red" stroke-width="1"/>
    {/each}
    {#each townPaths as path, i}
        <path d={path} fill="none" stroke="gray" stroke-width="0.2"/>
    {/each}
    {#each trailPaths as path, i}
        <path d={path} fill="none" stroke="green" stroke-width="1" opacity="0.7"/>
    {/each}
    {#each lakePaths as path, i}
        <path d={path} fill="lightblue"/>
    {/each}
    
    {#if projection}
        {#each cities as city}
            {@const [x, y] = projection([city.lon, city.lat])}
            <circle cx={x} cy={y} r="3" fill="black" />
            <text x={x + 5} y={y - 5} font-size="10" fill="black">{city.name}</text>
        {/each}
    {/if}
</svg>