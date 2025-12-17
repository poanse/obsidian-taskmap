<script lang="ts">
	import {onDestroy, onMount} from "svelte";
	import Toolbar from "./Toolbar.svelte";
	import Task from "./Task.svelte";
	import Panzoom, {type PanzoomObject} from '@panzoom/panzoom'
	import type {Context} from "../types";

	let {uiState, projectData}: Context = $props();
	
	let viewportEl: HTMLDivElement | null = null;
	let sceneEl: HTMLDivElement | null = null;
	let panzoom: PanzoomObject | null = null;
	let isDragging = false;
	let mouseDown = $state(false);
	let startX = 0;
	let startY = 0;
	

	// Cleanup listeners to prevent memory leaks
	onDestroy(() => {
		if (viewportEl && panzoom) {
			viewportEl.removeEventListener('wheel', panzoom.zoomWithWheel);
		}
	});

	onMount(async () => {
		if (!sceneEl) {
			throw new Error('No mount element');
		}
		if (!viewportEl) {
			throw new Error('No viewport');
		}
		
		// 1. Initialize Panzoom on the child (scene), NOT the wrapper
		panzoom = Panzoom(sceneEl, {
			maxScale: 3, // not higher than 1 to avoid lowRes svg rendering
			minScale: 0.1,
			// Important: Use the wrapper as the bounds for event handling
			// This fixes the "Infinite" panning issue because the parent catches the events
			canvas: true,
			excludeClass: 'no-pan',
			cursor: 'default',
			// animate: true,
		});

		// 2. Fix Zoom: Manually bind the wheel event to the viewport
		viewportEl.addEventListener('wheel', 
			(ev) => {
				getPanzoom().zoomWithWheel(ev);
				if (getPanzoom().getScale() > 1) {
					uiState.incrementUpdateOnZoomCounter();
				}
			}
		);

		// 3. Fix Panning from "empty space": Bind down event to viewport
		// This ensures you can drag even if the element is off-center
		viewportEl.addEventListener('pointerdown', (e) => {
			getPanzoom().handleDown(e);

			// Track click vs drag
			isDragging = false;
			startX = e.clientX;
			startY = e.clientY;
		});
	});

	function handleKey(e: KeyboardEvent) {
		console.log('handleKey ', e.key);
		if (e.key === "Escape") {
			uiState.setSelectedTaskId(-1);
			e.stopPropagation();
		}
	}
	function handlePointerUp(e: PointerEvent) {
		// Calculate distance moved
		const dist = Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2);
		// If moved more than 5 pixels, it's a drag, not a click
		const thrDist = 5;
		if (dist > Math.pow(thrDist,2)) {
			isDragging = true;
		}
	}

	function handleCanvasClick(e: MouseEvent) {
		// 4. Fix Click: Only trigger logic if we haven't dragged
		if (isDragging) {
			e.stopPropagation(); // Stop propagation if it was a drag
			return;
		}
		console.log('Canvas clicked!', e);
		if (!mouseDown) {
			return
		}
		mouseDown = false;
		console.log(`Window clicked + ${uiState.serializeForDebugging()}`);
		console.log('selectedTaskId ' + uiState.selectedTaskId);
		uiState.pressedButtonIndex = -1;
		uiState.setSelectedTaskId(-1);
		sceneEl!.focus();
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
	bind:this={viewportEl}
	onpointerup={handlePointerUp}
	style="width: 100%; height: 100vh; overflow: hidden; position: relative; background: #1C1C1C;"
>
	<div
		class="pixi-container"
		bind:this={sceneEl}
		onpointerdown={() => mouseDown = true}
		onclick={handleCanvasClick}
		tabindex="-1"
		onkeydown={handleKey}
		style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;"
		role="presentation"
	>
		{#each projectData.tasks.filter(t => !t.deleted) as task}
			<Task taskId={task.taskId} {uiState} {projectData} coords={uiState.getCurrentTaskPosition(task.taskId)} />
		{/each}

		{#if uiState.selectedTaskId !== -1}
			<Toolbar
				uiState={uiState}
			/>
		{/if}
	</div>
</div>
