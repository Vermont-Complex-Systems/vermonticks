<script>
    import * as Sidebar from "$lib/components/ui/sidebar";
    import BaseMap from './BaseMap.svelte';
    import AppSidebar from './app-sidebar.svelte';
    import MobileSidebarTrigger from './MobileSidebarTrigger.svelte';

    let { mapData } = $props();
</script>

<Sidebar.Provider class="h-full">
    <AppSidebar />

    <Sidebar.SidebarInset>
        <MobileSidebarTrigger />

        <main class="flex-1">
            <BaseMap {...mapData} />
        </main>
    </Sidebar.SidebarInset>
</Sidebar.Provider>