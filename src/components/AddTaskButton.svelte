<script lang="ts">
	import {TASK_SIZE} from "../Constants";
	import {StatusCode} from "../types";
	import {Context} from "../Context.svelte.js";

	const {
		taskId,
		context,
	}: {
		taskId: number,
		context: Context,
	} = $props();

	let taskData = $derived(context.projectData.getTask(taskId));
	
	let entered = $state(false);
	function onEnter() {
		entered = true;
	}
	function onLeave() {
		entered = false;
	}
	function addButtonPressed (event: MouseEvent) {
		console.log('add icon clicked')
		context.addTask(taskId);
		event.stopPropagation();
	}
	
</script>

<div class="hover-area"
	 onmouseenter={onEnter}
	 onmouseleave={onLeave}
	 onblur={onLeave}
	 style="
		left: {TASK_SIZE.width - 50/2}px;
		top: {TASK_SIZE.height/2 - 50/2}px;
		width: 50px;
		height: 50px;
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
			onblur={onLeave}
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
				cx="12" cy="12" r="11"
			/>
			<path 
				stroke-width="2"
				d="M5 12h14"
			/><path
				stroke-width="2"
				d="M12 5v14"
			/>
		</svg>
{/if}

<style>
	.hover-area {
		position: absolute;
		/*border: 2px dashed #888;*/
		border: none;
		background: transparent;
		pointer-events: auto;
	}
	
	:global(svg.draft) {
		stroke: #7E7E7E;
		fill: #1E1E1E;
	}
	:global(svg.ready) {
		stroke: #A1383D;
		fill: #2E2122;
	}
	:global(svg.in-progress) {
		stroke: #A6A45D;
		fill: #2C2C24;
	}
	:global(svg.done) {
		stroke: #3E9959;
		fill: #212B24;
	}
</style>
