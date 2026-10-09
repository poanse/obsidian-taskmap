<script lang="ts">
	import { Platform } from "obsidian";
	import { StatusCode } from "../types";
	import { Context } from "../Context.svelte.js";

	const { taskId, context }: { taskId: number, context: Context } = $props();

	let taskData = $derived(context.versionedData.getTask(taskId));
	let entered = $state(false);
	// Touch UI has no hover, so the button follows selection. Desktop stays hover-only.
	const isMobile = Platform.isMobile;
	let showButton = $derived(isMobile ? context.isSelected(taskId) : entered);

	function addButtonPressed(event: PointerEvent) {
		console.debug('addButtonPressed');
		context.addTask(taskId);
		context.finishTaskDragging(event);
		event.stopPropagation();
	}
</script>

<div
	class="hover-container-add-task-button"
	role="group"
	onpointerenter={() => entered = true}
	onpointerleave={() => entered = false}
	style="left: {context.getTaskSize(taskId).x - 50/2}px;"
>
	{#if showButton}
		<svg
			role="button"
			tabindex="0"
			class="button-add"
			class:draft={taskData.status === StatusCode.DRAFT}
			class:ready={taskData.status === StatusCode.READY}
			class:in-progress={taskData.status === StatusCode.IN_PROGRESS}
			class:done={taskData.status === StatusCode.DONE}
			onpointerdown={(e: PointerEvent) => e.stopPropagation()}
			onpointerup={addButtonPressed}
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
		top: 50%;
		transform: translateY(-50%);

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
			fill: var(--button-fill, none);
			stroke: var(--button-stroke, currentColor);
		}
		.button-add.draft       { --button-stroke: var(--tm-draft-border);       --button-fill: var(--tm-draft-bg); }
		.button-add.ready       { --button-stroke: var(--tm-ready-border);       --button-fill: var(--tm-ready-bg); }
		.button-add.in-progress { --button-stroke: var(--tm-in-progress-border); --button-fill: var(--tm-in-progress-bg); }
		.button-add.done        { --button-stroke: var(--tm-done-border);        --button-fill: var(--tm-done-bg); }
	}
</style>
