<script>
    import Dashboard from '$lib/components/Dashboard.svelte';
    import { loadMapData } from './data.remote.js';
</script>

{#await loadMapData()}
    <div class="flex h-screen items-center justify-center">
        <div class="text-center">
            <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p class="text-lg text-gray-600">Loading map data...</p>
        </div>
    </div>
{:then mapData}
    <Dashboard {mapData} />
{:catch error}
    <div class="flex h-screen items-center justify-center">
        <div class="text-center">
            <h1 class="text-2xl font-bold text-red-600 mb-4">Error Loading Map</h1>
            <p class="text-gray-600">{error.message}</p>
            <button
                onclick={() => window.location.reload()}
                class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Retry
            </button>
        </div>
    </div>
{/await}

