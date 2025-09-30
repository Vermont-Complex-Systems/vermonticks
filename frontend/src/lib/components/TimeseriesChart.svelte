<script>
    let { data = [], width = 300, height = 200  } = $props();
    
    import { Dot, Line, Plot } from 'svelteplot'
</script>

<Plot grid {height} {width} marginRight={30} frame> 
    <Dot {data} x="year" y="count" stroke="black"/>
    <Line {data} x="year" y="count" stroke="black"/>
</Plot>
