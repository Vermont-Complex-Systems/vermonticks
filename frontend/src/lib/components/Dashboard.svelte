<script>
    import * as Sidebar from "$lib/components/ui/sidebar";
    import BaseMap from './BaseMap.svelte';
    import AppSidebar from './app-sidebar.svelte';

    let { mapData } = $props();
</script>

<Sidebar.Provider>
    <AppSidebar />

    <Sidebar.SidebarInset>
        
        <header class="flex h-10 shrink-0 items-center gap-2 px-4">
            <Sidebar.SidebarTrigger />
        </header>
        
        <main class="flex-1">
            <BaseMap {...mapData} />
        </main>

    </Sidebar.SidebarInset>
</Sidebar.Provider>