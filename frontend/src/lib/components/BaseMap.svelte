<script>
    // @ts-nocheck
    import { geoPath, geoMercator } from "d3-geo";
    import { zoom, zoomIdentity } from "d3-zoom";
    import { select } from "d3-selection";
    import TimeseriesChart from './TimeseriesChart.svelte';

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
    } = $props();

    // container & dimensions
    let mapContainer = $state();
    let width = $state(1200);
    let height = $state(800);

    // projection depends on dimensions
    const projection = $derived(
        geoMercator().fitExtent(
            [[20, 5], [width - 20, height - 5]],
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

    // zoom state - using simple transform values instead of D3 transform object
    let scale = $state(1);
    let translateX = $state(0);
    let translateY = $state(0);
    let zoomBehavior;

    // Setup D3 zoom on container, but manage transform state in Svelte
    $effect(() => {
        if (!mapContainer) return;

        zoomBehavior = zoom()
            .scaleExtent([1, 20])
            .on("zoom", (event) => {
                scale = event.transform.k;
                translateX = event.transform.x;
                translateY = event.transform.y;
            });

        select(mapContainer).call(zoomBehavior);

        return () => {
            select(mapContainer).on('.zoom', null);
        };
    });

    function resetZoom() {
        if (zoomBehavior && mapContainer) {
            select(mapContainer).transition().duration(500).call(zoomBehavior.transform, zoomIdentity);
        }
    }

    // tooltip
    let tooltip = $state({ visible: false, x: 0, y: 0, text: "", component: null, data: null });

    function showTooltip(event, text, component = null, data = null) {
        const rect = mapContainer.getBoundingClientRect();
        tooltip = {
            visible: true,
            x: event.clientX - rect.left + 10,
            y: event.clientY - rect.top - 10,
            text,
            component,
            data
        };
    }
    
    function hideTooltip() {
        tooltip = { visible: false, x: 0, y: 0, text: "", component: null, data: null };
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
        const text = `${site.site}\nElevation: ${site.elevation || "N/A"} ft\nTotal Nymphs: ${site.totalNymphs || 0}\nTotal Samples: ${site.totalSamples || 0}`;
        showTooltip(event, text, null, site.nymphTimeseries);
    }
    
</script>

<div bind:this={mapContainer} bind:clientWidth={width} bind:clientHeight={height} class="w-full h-screen overflow-hidden relative">
    <svg
        viewBox="0 0 {width} {height}"
        preserveAspectRatio="xMidYMid meet"
        class="w-full h-full"
    >
        <!-- Zoomed map geometry -->
        <g transform="translate({translateX},{translateY}) scale({scale})">

            <!-- Surrounding states -->
            {#each stateFeatures as feature}
                <path d={path(feature)} fill="rgba(200,200,200,0.1)" stroke="rgba(150,150,150,0.5)" stroke-width={0.5/scale}/>
            {/each}

            <!-- Vermont -->
            {#each vermontFeatures as feature}
                <path d={path(feature)} fill="rgba(255,165,0,0.1)" stroke-width={2/scale}/>
            {/each}

            <!-- Counties -->
            {#each countyFeatures as feature}
                <path d={path(feature)} fill="none" stroke="black" stroke-width={1/scale}/>
            {/each}

            <!-- Towns -->
            {#each townFeatures as feature}
                <path d={path(feature)} fill="none" stroke="gray" stroke-width={0.2/scale}/>
            {/each}

            <!-- Trails -->
            {#each trailFeatures as trail}
                <path d={path(trail)} fill="none" stroke="green" stroke-width={2/scale} opacity="0.3"/>
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
                        cx={city.coords[0] * scale + translateX}
                        cy={city.coords[1] * scale + translateY}
                        r={3}
                        fill={city.weather?.temperature
                            ? city.weather.temperature > 70 ? "#ff6b6b"
                            : city.weather.temperature > 50 ? "#ffd93d"
                            : city.weather.temperature > 32 ? "#6bcf7f" : "#74c0fc"
                            : "black"}
                        stroke="white"
                        stroke-width="0.5"
                        role="img"
                        aria-label={city.name}
                        onmouseenter={(e) => showCityTooltip(e, city)}
                        onmouseleave={hideTooltip}
                    />
                    <text
                        x={city.coords[0] * scale + translateX + 5}
                        y={city.coords[1] * scale + translateY - 5}
                        font-size="10"
                        fill="black"
                        role="img"
                        aria-label={city.name}
                        onmouseenter={(e) => showCityTooltip(e, city)}
                        onmouseleave={hideTooltip}
                    >
                        {city.name}
                    </text>
                    {#if city.weather?.temperature && !city.weather.error}
                        <text
                            x={city.coords[0] * scale + translateX + 5}
                            y={city.coords[1] * scale + translateY + 8}
                            font-size="8"
                            fill="#666"
                            role="img"
                            aria-label={`${city.weather.temperature}°${city.weather.temperatureUnit}`}
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
                        cx={site.coords[0] * scale + translateX}
                        cy={site.coords[1] * scale + translateY}
                        r={4}
                        fill="#8F9FBF"
                        stroke="white"
                        stroke-width="1"
                        role="img"
                        aria-label={site.site}
                        onmouseenter={(e) => showAllenSiteTooltip(e, site)}
                        onmouseleave={hideTooltip}
                    />
                    {#if scale > 7}
                        <text
                            x={site.coords[0] * scale + translateX + 6}
                            y={site.coords[1] * scale + translateY - 6}
                            font-size="12"
                            fill="#8F9FBF"
                            font-weight="600"
                            role="img"
                            aria-label={site.site}
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

    <!-- Tooltip -->
    {#if tooltip.visible}
        <div
            class="absolute bg-white border border-gray-300 p-3 rounded shadow-lg pointer-events-none z-50"
            style="left: {tooltip.x}px; top: {tooltip.y}px;"
        >
            <div class="text-xs text-gray-700 mb-2 whitespace-pre-line">
                {tooltip.text}
            </div>
            {#if tooltip.data && tooltip.data.length > 0}
                <TimeseriesChart data={tooltip.data} />
            {/if}
        </div>
    {/if}
</div>
