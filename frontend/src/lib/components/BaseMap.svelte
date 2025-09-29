<script>
    // @ts-nocheck
    import { geoPath, geoMercator } from "d3-geo";
    import { zoom, zoomIdentity } from "d3-zoom";
    import { select } from "d3-selection";

    // props (Svelte 5 runes style)
    let {
        vermontFeatures = [],
        countyFeatures = [],
        townFeatures = [],
        trailFeatures = [],
        waterFeatures = [],
        stateFeatures = [],
        citiesWithWeather = [],
        allenSites = [],
        loading = false,
        error = null,
    } = $props();

    // container & dimensions
    let mapContainer = $state();
    let svg;
    let g;
    let width = $state(1200);
    let height = $state(800);

    // projection depends on dimensions
    const projection = $derived(
        geoMercator().fitExtent(
            [[20, 0], [width - 20, height - 60]],
            { type: "FeatureCollection", features: vermontFeatures }
        )
    );
    
    const path = $derived(geoPath().projection(projection));

    // coords (recomputed if projection changes)
    const citiesWithCoords = $derived(
        citiesWithWeather.map(city => ({
            ...city,
            coords: projection([city.longitude, city.latitude]),
        }))
    );
    const allenSitesWithCoords = $derived(
        allenSites.map(site => ({
            ...site,
            coords: projection([site.longitude, site.latitude]),
        }))
    );

    // zoom state
    let currentTransform = $state(zoomIdentity);
    let zoomBehavior;

    $effect(() => {
        if (!svg || !g) return;

        zoomBehavior = zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                currentTransform = event.transform;
                g.setAttribute("transform", currentTransform);
            });

        select(svg).call(zoomBehavior);
    });

    function resetZoom() {
        select(svg).transition().duration(500).call(zoomBehavior.transform, zoomIdentity);
    }

    // tooltip
    let tooltip = $state({ visible: false, x: 0, y: 0, text: "" });

    function showTooltip(event, text) {
        const rect = svg.getBoundingClientRect();
        tooltip = {
            visible: true,
            x: event.clientX - rect.left + 10,
            y: event.clientY - rect.top - 10,
            text,
        };
    }
    
    function hideTooltip() {
        tooltip.visible = false;
    }

    function showCityTooltip(event, city) {
        const weather = city.weather;
        let weatherText = "";

        if (weather?.error) {
            weatherText = `Weather: ${weather.error}`;
        } else if (weather?.temperature) {
            weatherText = `${weather.temperature}°${weather.temperatureUnit} - ${weather.shortForecast}`;
            if (weather.humidity) weatherText += `\nHumidity: ${weather.humidity}%`;
            if (weather.windSpeed) weatherText += `\nWind: ${weather.windSpeed} ${weather.windDirection}`;
        } else {
            weatherText = "Weather data unavailable";
        }

        const text = `${city.name}\nPopulation: ${city.population?.toLocaleString() || "N/A"}\n${weatherText}`;
        showTooltip(event, text);
    }

    function showAllenSiteTooltip(event, site) {
        const text = `${site.site}\nElevation: ${site.elevation || "N/A"} ft\nLat: ${site.latitude.toFixed(4)}, Lon: ${site.longitude.toFixed(4)}`;
        showTooltip(event, text);
    }
    
    $inspect(currentTransform)
</script>

<div bind:this={mapContainer} bind:clientWidth={width} bind:clientHeight={height} class="w-full h-screen overflow-hidden relative">
    <svg
        bind:this={svg}
        viewBox="0 0 {width} {height}"
        preserveAspectRatio="xMidYMid meet"
        class="w-full h-full"
    >
        <!-- Zoomed map geometry -->
        <g bind:this={g}>
            
            <!-- Surrounding states -->
            {#each stateFeatures as feature}
                <path d={path(feature)} fill="rgba(200,200,200,0.1)" stroke="rgba(150,150,150,0.5)" stroke-width={0.5/currentTransform.k}/>
            {/each}

            <!-- Vermont -->
            {#each vermontFeatures as feature}
                <path d={path(feature)} fill="rgba(255,165,0,0.1)" stroke="orange" stroke-width={2/currentTransform.k}/>
            {/each}

            <!-- Counties -->
            {#each countyFeatures as feature}
                <path d={path(feature)} fill="none" stroke="black" stroke-width={1/currentTransform.k}/>
            {/each}

            <!-- Towns -->
            {#each townFeatures as feature}
                <path d={path(feature)} fill="none" stroke="gray" stroke-width={0.2/currentTransform.k}/>
            {/each}

            <!-- Trails -->
            {#each trailFeatures as trail}
                <path d={path(trail)} fill="none" stroke="green" stroke-width={2/currentTransform.k} opacity="0.3"/>
            {/each}

            <!-- Water -->
            {#each waterFeatures as feature}
                <path d={path(feature)} fill="lightblue"/>
            {/each}
        </g>

        <!-- Constant-size overlay for markers + labels -->
        <g>
            {#each citiesWithCoords as city}
                <g class="cursor-pointer">
                    <circle
                        cx={currentTransform.applyX(city.coords[0])}
                        cy={currentTransform.applyY(city.coords[1])}
                        r={3}
                        fill={city.weather?.temperature
                            ? city.weather.temperature > 70 ? "#ff6b6b"
                            : city.weather.temperature > 50 ? "#ffd93d"
                            : city.weather.temperature > 32 ? "#6bcf7f" : "#74c0fc"
                            : "black"}
                        stroke="white"
                        stroke-width="0.5"
                        onmouseenter={(e) => showCityTooltip(e, city)}
                        onmouseleave={hideTooltip}
                    />
                    <text
                        x={currentTransform.applyX(city.coords[0]) + 5}
                        y={currentTransform.applyY(city.coords[1]) - 5}
                        font-size="10"
                        fill="black"
                        onmouseenter={(e) => showCityTooltip(e, city)}
                        onmouseleave={hideTooltip}
                    >
                        {city.name}
                    </text>
                    {#if city.weather?.temperature && !city.weather.error}
                        <text
                            x={currentTransform.applyX(city.coords[0]) + 5}
                            y={currentTransform.applyY(city.coords[1]) + 8}
                            font-size="8"
                            fill="#666"
                            onmouseenter={(e) => showCityTooltip(e, city)}
                            onmouseleave={hideTooltip}
                        >
                            {city.weather.temperature}°{city.weather.temperatureUnit}
                        </text>
                    {/if}
                </g>
            {/each}

            {#each allenSitesWithCoords as site}
                <g class="cursor-pointer">
                    <circle
                        cx={currentTransform.applyX(site.coords[0])}
                        cy={currentTransform.applyY(site.coords[1])}
                        r={2}
                        fill="red"
                        stroke="white"
                        stroke-width="0.5"
                        onmouseenter={(e) => showAllenSiteTooltip(e, site)}
                        onmouseleave={hideTooltip}
                    />
                    {#if currentTransform.k > 7}
                        <text
                            x={currentTransform.applyX(site.coords[0]) + 4}
                            y={currentTransform.applyY(site.coords[1]) - 4}
                            font-size="8"
                            fill="red"
                            onmouseenter={(e) => showAllenSiteTooltip(e, site)}
                            onmouseleave={hideTooltip}
                        >
                            {site.site}
                        </text>
                    {/if}
                </g>
            {/each}
        </g>
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
            {Math.round(currentTransform.k * 100)}%
        </div>

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
