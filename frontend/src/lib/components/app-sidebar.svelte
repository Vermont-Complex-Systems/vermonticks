<script>
    import * as Sidebar from "$lib/components/ui/sidebar";
    import { X } from '@lucide/svelte';
    import {
        sidebarState,
        updateActivity,
        updateVector,
        updatePathogen,
        updateModel
    } from "$lib/stores/shared.svelte";
	import { base } from "$app/paths";

    const sidebar = Sidebar.useSidebar();
</script>

<Sidebar.Sidebar collapsible="offcanvas" class="bg-gray-200">
    <Sidebar.SidebarHeader class="relative">
        <!-- Close button positioned at top-right -->
        <div class="sm:hidden absolute top-2 right-2 z-10">
            <button onclick={sidebar.toggle} class="p-1 hover:bg-gray-300 rounded">
                <X class="w-5 h-5 text-gray-600" />
            </button>
        </div>

        <div class="px-5 py-2">
            <div>
                <img src="{base}/MAP2LE_AbstractLogo.png" alt="MAP2LE Logo" class="w-30 h-auto mb-2 mix-blend-multiply opacity-80" />
                <p class="text-s italic text-muted-foreground">Monitoring, Analysis, and Prediction of Pathogens in Local Ecosystems</p>
            </div>
        </div>
    </Sidebar.SidebarHeader>


    <Sidebar.SidebarContent>
        <Sidebar.SidebarGroup>
            <Sidebar.SidebarGroupLabel>Activity</Sidebar.SidebarGroupLabel>
            <Sidebar.SidebarGroupContent class="px-2">
                <select
                    class="w-full p-2 text-sm border rounded bg-white"
                    bind:value={sidebarState.activity}
                    onchange={() => updateActivity(sidebarState.activity)}
                >
                    <option value="hiking">Hiking</option>
                    <option value="">Select activity...</option>
                </select>
            </Sidebar.SidebarGroupContent>
        </Sidebar.SidebarGroup>

        <Sidebar.SidebarGroup>
            <Sidebar.SidebarGroupLabel>Vector</Sidebar.SidebarGroupLabel>
            <Sidebar.SidebarGroupContent class="px-2">
                <select
                    class="w-full p-2 text-sm border rounded bg-white max-h-32 overflow-y-auto"
                    size="4"
                    bind:value={sidebarState.vector}
                    onchange={() => updateVector(sidebarState.vector)}
                >
                    <option value="american-dog-tick">American dog tick</option>
                    <option value="blacklegged-tick">Blacklegged tick</option>
                    <option value="lone-star-tick">Lone Star tick</option>
                    <option value="winter-tick">Winter tick</option>
                </select>
            </Sidebar.SidebarGroupContent>
        </Sidebar.SidebarGroup>

        <Sidebar.SidebarGroup>
            <Sidebar.SidebarGroupLabel>Pathogen</Sidebar.SidebarGroupLabel>
            <Sidebar.SidebarGroupContent class="px-2">
                <select
                    class="w-full p-2 text-sm border rounded bg-white max-h-32 overflow-y-auto"
                    size="4"
                    bind:value={sidebarState.pathogen}
                    onchange={() => updatePathogen(sidebarState.pathogen)}
                >
                    <option value="lyme">Lyme (B. burgdorferi)</option>
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
                <select
                    class="w-full p-2 text-sm border rounded bg-white"
                    bind:value={sidebarState.model}
                    onchange={() => updateModel(sidebarState.model)}
                >
                    <option value="autoregressive">Autoregressive</option>
                    <option value="">Select model...</option>
                </select>
            </Sidebar.SidebarGroupContent>
        </Sidebar.SidebarGroup>
    </Sidebar.SidebarContent>
</Sidebar.Sidebar>