<script lang="ts">
	import { TASK_SIZE } from "../Constants";
	import { Context } from "../Context.svelte.js";
	import {ParentToChildHorizontalShift} from "../NodePositionsCalculator";
	import { Eye, EyeClosed  } from 'lucide-svelte';

	const { taskId, context }: { taskId: number, context: Context } = $props();

	let taskData = $derived(context.projectData.getTask(taskId));
	let entered = $state(false);

	function hidePressed(event: MouseEvent) {
		context.projectData.toggleHidden(taskId);
		event.stopPropagation();
	}
</script>

{#if context.projectData.getChildren(taskId).length > 0}
	<div
		class="hover-container-hide-branch-button"
		onmouseenter={() => entered = true}
		onmouseleave={() => entered = false}
		style="
			left: {TASK_SIZE.width / 2 + ParentToChildHorizontalShift / 2 - 50/2}px;
			top: {TASK_SIZE.height / 2 - 50 / 2}px;
		"
	>
		{#if taskData.hidden}
			<EyeClosed onclick={hidePressed}/>
		{:else if entered && !taskData.hidden}
			<Eye onclick={hidePressed}/>
		{/if}
	</div>
{/if}

<style>
	.hover-container-hide-branch-button {
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

		:global(svg) {
			transition: stroke 0.2s;
			width: 41px;
			height: 41px;
			stroke: #bbb;
			fill: #181818;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
			will-change: transform,scale,translate;
		}
	}
</style>
