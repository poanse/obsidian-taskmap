<script lang="ts">
	import type {TaskId, Vector2} from "../types";
	import {NoTaskId, ParentToChildHorizontalShift, V2} from "../NodePositionsCalculator";
	import type {Context} from "../Context.svelte";
	import {TASK_SIZE} from "../Constants";

	let {startTaskId, endTaskId, context, isBlockerConnection}: {
		startTaskId: TaskId,
		endTaskId: TaskId,
		context: Context,
		isBlockerConnection: boolean,
	} = $props();

	function isStartTaskDepthLE(start: TaskId, end: TaskId){
		return context.projectData.getTask(start).depth <= context.projectData.getTask(end).depth;
	}

	function getConnectionPointShift(start: TaskId, end: TaskId) {
		return {
			x: isStartTaskDepthLE(start, end) ? TASK_SIZE.width : 0,
			y: TASK_SIZE.height/2
		};
	}
	let startPoint = $derived(V2.add(
		context.getCurrentTaskPosition(startTaskId),
		getConnectionPointShift(startTaskId, endTaskId)
	));
	let endPoint = $derived(V2.add(
		context.getCurrentTaskPosition(endTaskId),
		getConnectionPointShift(endTaskId, startTaskId)
	));
	let midX = $derived(
		isBlockerConnection
		? (context.chosenBlockerId !== NoTaskId
			? endPoint.x + (isStartTaskDepthLE(startTaskId, endTaskId) ? -1 : 1) * (ParentToChildHorizontalShift - TASK_SIZE.width) / 2
			: startPoint.x + (isStartTaskDepthLE(startTaskId, endTaskId) ? 1 : -1) * (ParentToChildHorizontalShift - TASK_SIZE.width) / 2
		)
		: (startPoint.x + endPoint.x) / 2
	);
	
	let isUnselected = $derived(
		context.chosenBlockedId !== NoTaskId
		|| context.chosenBlockerId !== NoTaskId
	);
	
	function createBlockerPath(
		startPoint: Vector2,
		endPoint: Vector2,
		midpointX: number,
		cornerRadius = 10
	): string {
		const { x: x1, y: y1 } = startPoint;
		const { x: x2, y: y2 } = endPoint;

		// Calculate the path with 3 segments and 2 right angles
		// Segment 1: Start to midpoint X
		// Segment 2: Vertical/horizontal transition
		// Segment 3: To endpoint

		// Calculate corner points
		const corner1X = midpointX;
		const corner1Y = y1;
		const corner2X = midpointX;
		const corner2Y = y2;

		// Adjust for rounded corners
		const dx1 = Math.abs(corner1X - x1) > cornerRadius ? Math.sign(corner1X - x1) * cornerRadius : 0;
		const dy2 = Math.abs(corner2Y - corner1Y) > cornerRadius ? Math.sign(corner2Y - corner1Y) * cornerRadius : 0;
		const dx3 = Math.abs(x2 - corner2X) > cornerRadius ? Math.sign(x2 - corner2X) * cornerRadius : 0;

		const arrowShift = (x2 > x1 ? -1 : 1) * 5;
		// Build path with rounded corners using quadratic curves
		const pathD = `
			M ${x1},${y1}
			L ${corner1X - dx1},${y1}
			Q ${corner1X},${y1} ${corner1X},${y1 + dy2}
			L ${corner2X},${corner2Y - dy2}
			Q ${corner2X},${corner2Y} ${corner2X + dx3},${corner2Y}
			L ${x2+arrowShift},${y2}
		  `.trim().replace(/\s+/g, ' ');
		return pathD;
	}

	// Calculate the path string reactively
	let pathData = $derived.by(() => {
		if (isBlockerConnection) {
			return createBlockerPath(
				startPoint,
				endPoint,
				midX
			);
		} else {
			// M = Move to start
			// C = Cubic Bezier (ControlPoint1, ControlPoint2, EndPoint)
			return `M ${startPoint.x} ${startPoint.y} C ${midX} ${startPoint.y}, ${midX} ${endPoint.y}, ${endPoint.x} ${endPoint.y}`;
		}
	});
</script>

<path
	class="connection"
	class:isBlockerConnection={isBlockerConnection}
	class:unselect={isUnselected}
	d={pathData}
	fill="transparent"
	stroke-linecap="round"
	vector-effect="non-scaling-stroke"
	shape-rendering="geometricPrecision"
	marker-end={isBlockerConnection ? "url(#arrow)": "none"}
/>

<style>
	path {
		position: absolute;
		transition: stroke 0.2s;
		pointer-events: none; /* Let clicks pass through to nodes below */
		stroke: #7E7E7E;
		stroke-width: 3;
	}
	.connection.unselect {
		stroke: color-mix(in srgb, #7E7E7E 100%, #000000 50%);
	}
	.connection.isBlockerConnection {
		stroke: #E9973F;
	}
</style>
