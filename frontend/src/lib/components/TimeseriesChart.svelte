<script>
    let { data = [] } = $props();

    import { Dot, Line, Plot } from 'svelteplot'
    import { innerWidth } from 'svelte/reactivity/window';

    // Responsive sizing: fixed size on mobile to avoid zoom interference
    let width = $derived(innerWidth.current >= 640 ? 300 : 350);
    let height = $derived(innerWidth.current >= 640 ? 170 : 150);
</script>

<div class="w-full">
    {#if width > 0}
        <Plot {width} {height} marginRight={25} frame y={{grid:true}}>
            <Dot {data} x="year" y="count" stroke="black"/>
            <Line {data} x="year" y="count" stroke="black"/>
        </Plot>
    {/if}
</div>
