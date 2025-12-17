<script lang="ts">
	import {TASK_SIZE} from "../pixi/Constants";
	import {StatusCode} from "../types";
	import {UIState} from "../pixi/GlobalState.svelte";
	import type {ProjectData} from "../ProjectData.svelte";

	const {
		taskId,
		uiState,
		projectData,
	}: {
		taskId: number,
		uiState: UIState,
		projectData: ProjectData,
	} = $props();

	let taskData = $derived(projectData.getTask(taskId));
	
	let entered = $state(false);
	function onEnter() {
		entered = true;
		console.log('enter');
	}
	function onLeave() {
		entered = false;
		console.log('leave');
	}
	function addButtonPressed (event: MouseEvent) {
		console.log('add icon clicked')
		uiState.addTask(taskId);
		event.stopPropagation();
	}
	
</script>
<div class="hover-area"
	 onmouseenter={onEnter}
	 onmouseleave={onLeave}
	 style="
			position: absolute;
		 	left: {TASK_SIZE.width - 50/2}px;
		 	top: {TASK_SIZE.height/2 - 50/2}px;
			width: 50px;
			height: 50px;
			border: 2px dashed #888;
			background: transparent;
			pointer-events: auto;
		"
>
</div>

{#if entered}
		<svg
			class="button-add"
			class:draft={taskData.status === StatusCode.DRAFT}
			class:ready={taskData.status === StatusCode.READY}
			class:in-progress={taskData.status === StatusCode.IN_PROGRESS}
			class:done={taskData.status === StatusCode.DONE}
			onmouseenter={onEnter}
			onmouseleave={onLeave}
			onclick={addButtonPressed}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"
			style="
					position: absolute;
					left: {TASK_SIZE.width - 41/2 - 1}px;
					top: {TASK_SIZE.height/2 - 41/2}px;
					width: 41;
					height: 41;
				"
		>
			<circle
				cx="12" cy="12" r="10"
			/>
			<path 
				stroke-width="1.5"
				d="M5 12h14"
			/><path
				stroke-width="1.5"
				d="M12 5v14"
			/>
		</svg>
{/if}
