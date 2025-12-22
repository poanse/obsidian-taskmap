<script lang="ts">
	import { fade } from 'svelte/transition';
	import type {Vector2} from "../types";

	let { startPoint, endPoint}: {startPoint: Vector2, endPoint: Vector2} = $props();

	// Calculate the path string reactively
	let pathData = $derived.by(() => {
		const midX = (startPoint.x + endPoint.x) / 2;
		// M = Move to start
		// C = Cubic Bezier (ControlPoint1, ControlPoint2, EndPoint)
		return `M ${startPoint.x} ${startPoint.y} C ${midX} ${startPoint.y}, ${midX} ${endPoint.y}, ${endPoint.x} ${endPoint.y}`;
	});
</script>

<path
	in:fade={{duration: 500}}
	d={pathData}
	fill="transparent"
	stroke-linecap="round"
	vector-effect="non-scaling-stroke"
	shape-rendering="geometricPrecision"
/>

<style>
	path {
		position: absolute;
		transition: stroke 0.2s;
		pointer-events: none; /* Let clicks pass through to nodes below */
		stroke: #555;
		stroke-width: 4;
	}
</style>
