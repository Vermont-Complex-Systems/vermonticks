<script>
    import { json } from 'd3-fetch';
    import { geoPath, geoAlbersUsa, geoBounds, geoMercator } from 'd3-geo';
    
    let vermontBoundary = $state();
    let countyBoundary = $state();
    let mapPaths = $state([]);
    let countyPaths = $state([]);

    const width = 800;
    const height = 600;

    let projection = $state();
    let pathGenerator = $state();

    $effect(() => {
        (async () => {
            vermontBoundary = await json('/src/data/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_vtbnd_SP_v1_3419293524892445662.geojson');
            countyBoundary = await json('/src/data/FS_VCGI_OPENDATA_Boundary_BNDHASH_poly_counties_SP_v1_-196546973346571976.geojson');
            
            console.log('Vermont GeoJSON:', vermontBoundary);
            console.log('County GeoJSON:', countyBoundary);

            if (vermontBoundary && vermontBoundary.features) {
                // Get bounds of Vermont
                const bounds = geoBounds(vermontBoundary);
                console.log('Vermont bounds:', bounds);

                // Create projection fitted to Vermont bounds
                projection = geoMercator().fitSize([width, height], vermontBoundary);
                pathGenerator = geoPath().projection(projection);

                mapPaths = vermontBoundary.features.map(feature => pathGenerator(feature));
                console.log('Generated paths:', mapPaths);
                
                if (countyBoundary && countyBoundary.features) {
                    countyPaths = countyBoundary.features.map(feature => pathGenerator(feature));
                }
            } else {
                console.log('No features found in GeoJSON');
            }
        })();
    });
</script>

<h1>Vermont Map</h1>
<p>Loaded: {vermontBoundary ? 'Yes' : 'No'} | Features: {vermontBoundary?.features?.length || 0} | Paths: {mapPaths.length}</p>

<svg {width} {height} style="border: 1px solid #ccc;">
    {#each mapPaths as path, i}
        <path d={path} fill="rgba(255, 165, 0, 0.1)" stroke="orange" stroke-width="1"/>
    {/each}
    {#each countyPaths as path, i}
        <path d={path} fill="none" stroke="red" stroke-width="1"/>
    {/each}
</svg>

