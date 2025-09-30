<script>
    import * as Sidebar from "$lib/components/ui/sidebar";
    import BaseMap from './BaseMap.svelte';
    import AppSidebar from './app-sidebar.svelte';

    let { mapData } = $props();
</script>

<Sidebar.Provider class="h-full">
    <AppSidebar />

    <Sidebar.SidebarInset>
        <main class="flex-1">
            <BaseMap {...mapData} />
        </main>
    </Sidebar.SidebarInset>
</Sidebar.Provider>