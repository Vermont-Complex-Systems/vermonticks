<script>
    import * as Sidebar from "$lib/components/ui/sidebar";
    import BaseMap from './BaseMap.svelte';
    
    let mapWidth = $state(1200);
    let mapHeight = $state(800);
    
    $effect(() => {
        if (typeof window !== 'undefined') {
            mapWidth = window.innerWidth - 250; // Account for sidebar
            mapHeight = window.innerHeight - 64; // Account for header
        }
    });
</script>

<Sidebar.Provider>
    <Sidebar.Sidebar>
        <Sidebar.SidebarHeader>
            <div class="px-4 py-2">
                <h2 class="text-sm font-bold">MAP2LE</h2>
                <p class="text-xs italic text-muted-foreground">Monitoring, Analysis, and Prediction of Pathogens in Local Ecosystems</p>
            </div>
        </Sidebar.SidebarHeader>
        <Sidebar.SidebarContent>
            <Sidebar.SidebarGroup>
                <Sidebar.SidebarGroupLabel>Activity</Sidebar.SidebarGroupLabel>
                <Sidebar.SidebarGroupContent class="px-2">
                    <select class="w-full p-2 text-sm border rounded bg-white">
                        <option value="hiking" selected>Hiking</option>
                        <option>Select activity...</option>
                    </select>
                </Sidebar.SidebarGroupContent>
            </Sidebar.SidebarGroup>
            
            <Sidebar.SidebarGroup>
                <Sidebar.SidebarGroupLabel>Vector</Sidebar.SidebarGroupLabel>
                <Sidebar.SidebarGroupContent class="px-2">
                    <select class="w-full p-2 text-sm border rounded bg-white max-h-32 overflow-y-auto" size="4">
                        <option value="american-dog-tick">American dog tick</option>
                        <option value="blacklegged-tick" selected>Blacklegged tick</option>
                        <option value="lone-star-tick">Lone Star tick</option>
                        <option value="winter-tick">Winter tick</option>
                    </select>
                </Sidebar.SidebarGroupContent>
            </Sidebar.SidebarGroup>
            
            <Sidebar.SidebarGroup>
                <Sidebar.SidebarGroupLabel>Pathogen</Sidebar.SidebarGroupLabel>
                <Sidebar.SidebarGroupContent class="px-2">
                    <select class="w-full p-2 text-sm border rounded bg-white max-h-32 overflow-y-auto" size="4">
                        <option value="lyme" selected>Lyme (B. burgdorferi)</option>
                        <option value="anaplasmosis">Anaplasmosis (A. phagocytophilum)</option>
                        <option value="babesiosis">Babesiosis (B. microti)</option>
                        <option value="hard-tick-fever">Hard tick relapsing fever</option>
                    </select>
                </Sidebar.SidebarGroupContent>
            </Sidebar.SidebarGroup>
            
            <Sidebar.SidebarSeparator />
            
            <Sidebar.SidebarGroup>
                <Sidebar.SidebarGroupLabel>Model</Sidebar.SidebarGroupLabel>
                <Sidebar.SidebarGroupContent class="px-2">
                    <p class="text-xs text-muted-foreground mb-2 italic">You can also choose different models to forecast the risk based on various indices</p>
                    <select class="w-full p-2 text-sm border rounded bg-white">
                        <option value="autoregressive" selected>Autoregressive</option>
                        <option>Select model...</option>
                    </select>
                </Sidebar.SidebarGroupContent>
            </Sidebar.SidebarGroup>
        </Sidebar.SidebarContent>
    </Sidebar.Sidebar>
    
    <Sidebar.SidebarInset>
        <header class="flex h-16 shrink-0 items-center gap-2 px-4">
            <Sidebar.SidebarTrigger />
        </header>
        <main class="flex-1">
            <BaseMap width={mapWidth} height={mapHeight} />
        </main>
    </Sidebar.SidebarInset>
</Sidebar.Provider>