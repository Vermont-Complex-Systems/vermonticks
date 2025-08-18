<script>
    import { geoPath, geoBounds, geoMercator } from 'd3-geo';
    import { feature } from 'topojson-client';
    import { fetchWithCache } from '$lib/utils/geodata.js';
    
    let { width = 800, height = 600 } = $props();
    
    let vermontBoundary = $state();
    let countyBoundary = $state();
    let lakeChamplain = $state();
    let surroundingStates = $state();
    let mapPaths = $state([]);
    let countyPaths = $state([]);
    let lakePaths = $state([]);
    let statePaths = $state([]);
    let projection = $state();
    let pathGenerator = $state();

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
                projection = geoMercator().fitExtent([[50, 50], [width * 0.6, height - 50]], vermontBoundary);
                pathGenerator = geoPath().projection(projection);

                mapPaths = vermontBoundary.features.map(feature => pathGenerator(feature));
                
                if (countyBoundary && countyBoundary.features) {
                    countyPaths = countyBoundary.features.map(feature => pathGenerator(feature));
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
    {#each lakePaths as path, i}
        <path d={path} fill="lightblue" stroke="blue" stroke-width="1"/>
    {/each}
</svg>