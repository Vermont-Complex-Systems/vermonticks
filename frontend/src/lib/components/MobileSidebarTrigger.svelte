<script>
    import * as Sidebar from "$lib/components/ui/sidebar";
    import { Menu } from '@lucide/svelte';

    const sidebar = Sidebar.useSidebar();
</script>

<!-- Mobile hamburger trigger - only show when sidebar is closed -->
{#if !sidebar.openMobile}
    <div class="sm:hidden fixed top-4 left-4 z-[100]">
        <button onclick={sidebar.toggle} class="p-2 bg-white/80 rounded">
            <Menu class="w-5 h-5 text-black stroke-2" />
        </button>
    </div>
{/if}