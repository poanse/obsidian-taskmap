<script lang="ts">
	import {onMount} from "svelte";
	import Toolbar from "./Toolbar.svelte";
	import Task from "./Task.svelte";
	import Panzoom, {type PanzoomObject} from '@panzoom/panzoom'
	import type {Context} from "../Context.svelte.js";
	import {MouseDown} from "../types";

	let {context}: {context: Context} = $props();
	
	let viewportEl: HTMLDivElement | null = null;
	let sceneEl: HTMLDivElement | null = null;
	let panzoom: PanzoomObject | null = null;
	let isDragging = false;
	let mouseDown = $state(MouseDown.NONE); // -1 
	let startX = 0;
	let startY = 0;
	let panStartX = 0;
	let panStartY = 0;
	
	onMount(async () => {
		if (!sceneEl) {
			throw new Error('No mount element');
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
			e.stopPropagation();
		}
	}
	function onwheel(e: WheelEvent) {
		getPanzoom().zoomWithWheel(e);
		if (getPanzoom().getScale() > 1) {
			context.incrementUpdateOnZoomCounter();
		}
		e.stopPropagation();
	}
	function onpointerdown(e: PointerEvent) {
		console.log('handlePointerDown', e.pointerId, e.button);
		mouseDown = e.button as MouseDown;
		if (e.button == 1) {
			e.preventDefault(); // prevent auto-scroll
			// Capture the pointer so move events continue even if 
			// the mouse leaves the element during a fast drag
			(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
			startX = e.clientX;
			startY = e.clientY;
		}
		e.stopPropagation();
	}
	function onpointermove(e: PointerEvent) {
		console.log('handlePointerMove', e.pointerId, e.button);
		const deltaX = e.clientX - startX;
		const deltaY = e.clientY - startY;
		if (mouseDown == MouseDown.MIDDLE && !isDragging) {
			// Calculate distance moved
			const dist = Math.pow(deltaX, 2) + Math.pow(deltaY, 2);
			// If moved more than 5 pixels, it's a drag, not a click
			const thrDist = 5;
			if (dist > Math.pow(thrDist,2)) {
				isDragging = true;
				const pan = getPanzoom().getPan();
				panStartX = pan.x;
				panStartY = pan.y;
				// getPanzoom().handleMove(e);
			}
		}
		if (isDragging) {
			e.preventDefault();
			const scale = getPanzoom().getScale();
			getPanzoom().pan(panStartX+deltaX/scale, panStartY+deltaY/scale);
		}
		e.stopPropagation();
	}
	function onpointerup(e: PointerEvent) {
		console.log('handlePointerUp', e.pointerId, e.button);
		if (e.button as MouseDown == MouseDown.MIDDLE && isDragging) {
			// Release the pointer capture
			(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
		}
		mouseDown = MouseDown.NONE;
		isDragging = false;
		if (e.button as MouseDown == MouseDown.LEFT) {
			console.log(`Window clicked + ${context.serializeForDebugging()}`);
			console.log('selectedTaskId ' + context.selectedTaskId);
			context.pressedButtonIndex = -1;
			context.setSelectedTaskId(-1);
			viewportEl!.focus();
			e.stopPropagation();
		}
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
	class:is-panning={mouseDown === MouseDown.MIDDLE}
	bind:this={viewportEl}
	{onwheel}
	{onpointerdown}
	{onpointermove}
	{onpointerup}
	style="width: 100%; height: 100vh; overflow: hidden; position: relative; background: #1C1C1C;"
>
	<div
		class="task-container"
		bind:this={sceneEl}
		tabindex="-1"
		onkeydown={handleKey}
		style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;"
		role="presentation"
	>
		{#each context.projectData.tasks.filter(t => !t.deleted) as task}
			<Task taskId={task.taskId} {context} coords={context.getCurrentTaskPosition(task.taskId)} />
		{/each}

		{#if context.selectedTaskId !== -1}
			<Toolbar
				context={context}
			/>
		{/if}
	</div>
</div>

<style>
	.task-container {
		width: 100%;
		height: 100%;
		overflow: visible;

		background-color: #1C1C1C;

		transform: translateZ(0);
		will-change: transform;
	}
	.viewport {
		touch-action: none; /* Prevents mobile browser interference */
	}
	.viewport.is-panning {
		cursor: grabbing !important;
	}
	.viewport:not(.is-panning) {
		cursor: default;
	}
</style>
