<script lang="ts">
	import {onMount} from "svelte";
	import Toolbar from "./Toolbar.svelte";
	import Task from "./Task.svelte";
	import Panzoom, {type PanzoomObject} from '@panzoom/panzoom'
	import type {Context} from "../Context.svelte.js";
	import {MouseDown, type Vector2} from "../types";
	import Connection from "./Connection.svelte";
	import {NoTaskId, RootTaskId, V2} from "../NodePositionsCalculator";
	import {TASK_SIZE} from "../Constants";
	import {DraggingManager} from "../DraggingManager.svelte";

	let {context}: {context: Context} = $props();
	
	let viewportEl: HTMLDivElement | null = null;
	let sceneEl: HTMLDivElement | null = null;
	let svgGroupEl: SVGGElement | null = null;
	let panzoom: PanzoomObject | null = null;
	let panstart: Vector2 = {x: 0, y: 0};
	let draggingManager = new DraggingManager([MouseDown.MIDDLE, MouseDown.LEFT]);
	
	
	onMount(async () => {
		if (!sceneEl) {
			throw new Error('No scene element');
		}
		if (!svgGroupEl) {
			throw new Error('No svg group element');
		}
		if (!viewportEl) {
			throw new Error('No viewport');
		}
		
		panzoom = Panzoom(sceneEl, {
			maxScale: 3,
			minScale: 0.1,
			canvas: true,
			excludeClass: 'no-pan',
			cursor: 'default',
			// animate: true,
			noBind: true
		});
	});

	function handleKey(e: KeyboardEvent) {
		console.log('handleKey ', e.key);
		if (e.key === "Escape") {
			context.setSelectedTaskId(-1);
			context.cancelReparenting();
			e.stopPropagation();
		}
	}
	
	function onwheel(e: WheelEvent) {
		getPanzoom().zoomWithWheel(e);
		context.setScale(getPanzoom().getScale());
		if (getPanzoom().getScale() > 1) {
			context.incrementUpdateOnZoomCounter();
		}
		e.stopPropagation();
	}
	
	function onpointerdown(e: PointerEvent) {
		// prevent auto-scroll
		e.preventDefault();
		draggingManager.onPointerDown(e);
		panstart = getPanzoom().getPan();
		e.stopPropagation();
	}
	
	function onpointermove(e: PointerEvent) {
		console.log('handlePointerMove', e.pointerId, e.button);
		if (context.draggedTaskId != NoTaskId) {
			context.taskDraggingManager.onPointerMove(e);
			if (context.taskDraggingManager.isDragging) {
				context.updateTaskPositions(true);
			}
		} else {
			draggingManager.onPointerMove(e);
			if (draggingManager.isDragging) {
				// prevent auto-scroll
				e.preventDefault();
				// Capture the pointer so move events continue even if 
				// the mouse leaves the element during a fast drag
				(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
				const scale = getPanzoom().getScale();
				getPanzoom().pan(
					panstart.x + draggingManager.deltaX/scale,
					panstart.y + draggingManager.deltaY/scale
				);
			}
		}
		e.stopPropagation();
	}
	
	function onpointerup(e: PointerEvent) {
		console.log('handlePointerUp', e.pointerId, e.button);
		if (draggingManager.isDragging) {
			// Release the pointer capture
			(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
		} else if (e.button as MouseDown == MouseDown.LEFT) {
			console.log(`Window clicked + ${context.serializeForDebugging()}`);
			console.log('selectedTaskId ' + context.selectedTaskId);
			context.pressedButtonCode = -1;
			context.setSelectedTaskId(-1);
			context.cancelReparenting();
			viewportEl!.focus();
			e.stopPropagation();
		}
		draggingManager.onPointerUp(e);
		context.finishTaskDragging(e, true);
	}
	
	function getPanzoom() {
		if (panzoom) {
			return panzoom;
		} else {
			throw new Error('No panzoom element');
		}
	}
</script>

<div
	class="viewport"
	class:is-panning={draggingManager.mouseDown === MouseDown.MIDDLE}
	bind:this={viewportEl}
	tabindex="-1"
	{onwheel}
	{onpointerdown}
	{onpointermove}
	{onpointerup}
	onkeydown={handleKey}
>
	<div
		class="scene"
		bind:this={sceneEl}
	>
		<svg class="svg-layer" overflow="visible">
			<g class="svg-group" bind:this={svgGroupEl}>
				{#each (context.projectData.tasks
						.filter(t => !context.isTaskHidden(t.taskId))
						.filter(t => t.taskId !== RootTaskId)
						.filter(t => !context.projectData.isBranchHidden(t.taskId))
				) as task (task.taskId)}
					<Connection
						startPoint={V2.add(context.getCurrentTaskPosition(task.parentId), {x: TASK_SIZE.width, y: TASK_SIZE.height/2})}
						endPoint={V2.add(context.getCurrentTaskPosition(task.taskId), {x: 0, y: TASK_SIZE.height/2})}
					/>
				{/each}
			</g>
		</svg>
		<div
			class="task-layer"
			tabindex="-1"
			role="presentation"
		>
			{#each context.projectData.tasks.filter(t => !context.isTaskHidden(t.taskId)) as task (task.taskId)}
				<Task taskId={task.taskId} {context} coords={context.getCurrentTaskPosition(task.taskId)}/>
			{/each}

		</div>
		{#if context.selectedTaskId !== -1}
			{#key context.selectedTaskId}
				<Toolbar context={context} taskId={context.selectedTaskId}/>
			{/key}
		{/if}
	</div>
</div>

<style>
	.viewport {
		width: 100%;
		height: 100%;
		overflow: hidden;
		position: relative;
		background: #1C1C1C;
		touch-action: none; /* Prevents mobile browser interference */
	}
	.viewport.is-panning {
		cursor: grabbing !important;
	}
	.viewport:not(.is-panning) {
		cursor: default;
	}
	.scene {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		/* Do NOT use flex centering here; it breaks coordinate math */
		transform-origin: 0 0;
	}
	.svg-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.svg-group {
		display: flex;
		transform-style: preserve-3d;
		position: absolute;
		align-items: center;
		justify-content: center;
	}
	.task-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		/*transform-origin: 0;*/
		/*align-items: center;*/
		/*justify-content: center;*/
		/*background-color: #1C1C1C;*/
		/* The 0.1deg rotation is invisible but forces high-res redraws */
		/*perspective: 1000px;*/
		/*transform: scale(var(--scale)) rotateX(0.1deg);*/
		will-change: transform;

		/* Prevents the browser from creating a low-res snapshot */
		/*backface-visibility: visible;*/

		/* Forces the browser to keep the vector data sharp */
		/*transform-style: preserve-3d;*/

		/* Ensure no blur filters are accidentally applied */
		/*filter: blur(0);*/
	}
	/* Ensure Tasks themselves have pointer-events: auto */
	:global(.task-layer > *) {
		pointer-events: auto;
	}
	/* Hide Obsidian popovers and tooltips when the 'is-dragging' class is present */
	:global(
		body.is-dragging-task .hover-popover,
		body.is-dragging-task .tooltip
	) {
		display: none !important;
		pointer-events: none !important;
	}
</style>
