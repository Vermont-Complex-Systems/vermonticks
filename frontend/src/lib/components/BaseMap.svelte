<script>
    import { geoPath, geoBounds, geoMercator } from 'd3-geo';
    import { fetchWithCache } from '$lib/utils/geodata.js';
    
    let { width = 800, height = 600 } = $props();
    
    let vermontBoundary = $state();
    let countyBoundary = $state();
    let lakeChamplain = $state();
    let mapPaths = $state([]);
    let countyPaths = $state([]);
    let lakePaths = $state([]);
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
            
            if (vermontBoundary && vermontBoundary.features) {
                const bounds = geoBounds(vermontBoundary);
                projection = geoMercator().fitSize([width, height], vermontBoundary);
                pathGenerator = geoPath().projection(projection);

                mapPaths = vermontBoundary.features.map(feature => pathGenerator(feature));
                
                if (countyBoundary && countyBoundary.features) {
                    countyPaths = countyBoundary.features.map(feature => pathGenerator(feature));
                }
                
                if (lakeChamplain && lakeChamplain.features) {
                    lakePaths = lakeChamplain.features.map(feature => pathGenerator(feature));
                }
            }
        })();
    });
</script>

<svg {width} {height} style="border: 1px solid #ccc;">
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