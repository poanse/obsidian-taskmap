<script lang="ts">
	import { TASK_SIZE } from "../Constants";
	import { StatusCode } from "../types";
	import { Context } from "../Context.svelte.js";

	const { taskId, context }: { taskId: number, context: Context } = $props();

	let taskData = $derived(context.projectData.getTask(taskId));
	let entered = $state(false);

	function addButtonPressed(event: MouseEvent) {
		context.addTask(taskId);
		event.stopPropagation();
	}
</script>

<div
	class="hover-container-add-task-button"
	onmouseenter={() => entered = true}
	onmouseleave={() => entered = false}
	style="
		left: {TASK_SIZE.width - 50/2}px;
		top: {TASK_SIZE.height/2 - 50/2}px;
	"
>
	{#if entered}
		<svg
			class="button-add"
			class:draft={taskData.status === StatusCode.DRAFT}
			class:ready={taskData.status === StatusCode.READY}
			class:in-progress={taskData.status === StatusCode.IN_PROGRESS}
			class:done={taskData.status === StatusCode.DONE}
			onclick={addButtonPressed}
			viewBox="0 0 24 24"
		>
			<circle cx="12" cy="12" r="11" />
			<path stroke-width="2" d="M5 12h14" /><path stroke-width="2" d="M12 5v14" />
		</svg>
	{/if}
</div>

<style>
	.hover-container-add-task-button {
		position: absolute;
		width: 50px;
		height: 50px;

		/* Centering logic for the SVG */
		display: flex;
		align-items: center;
		justify-content: center;

		/* Ensure the transparent area still catches mouse events */
		background: transparent;
		pointer-events: auto;
		cursor: pointer;

		.button-add {
			width: 41px;
			height: 41px;
			stroke-width: 1;
			fill: none;
			stroke: currentColor;
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
	}
</style>
