<script lang="ts">
	import { Context } from "../Context.svelte.js";
	import {ParentToChildHorizontalGap} from "../NodePositionsCalculator";
	import { Eye, EyeClosed  } from 'lucide-svelte';

	const { taskId, context }: { taskId: number, context: Context } = $props();

	let taskData = $derived(context.versionedData.getTask(taskId));
	let entered = $state(false);

	function hidePressed(event: PointerEvent) {
		context.versionedData.toggleHidden(taskId);
		context.save();
		event.stopPropagation();
		context.finishTaskDragging(event, true);
	}
	// should be in line with css below
	const buttonHalfSize = 25;
	let taskSize = $derived(context.getTaskSize(taskId));
	let left = $derived(taskSize.x + ParentToChildHorizontalGap / 2 - buttonHalfSize);
	let top = $derived(taskSize.y / 2 - buttonHalfSize);
</script>

<div
	class="hover-container-hide-branch-button"
	role="group"
	onpointerenter={() => entered = true}
	onpointerleave={() => entered = false}
	style="
		left: {left}px;
		top: {top}px;
	"
>
	{#if taskData.hidden}
		<EyeClosed
			onpointerdown={(e) => e.stopPropagation()}
			onpointerup={hidePressed}
		/>
	{:else if entered && !taskData.hidden}
		<Eye
			onpointerdown={(e) => e.stopPropagation()}
			onpointerup={hidePressed}
		/>
	{/if}
</div>

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
		pointer-events: visible;
		cursor: pointer;

		:global(svg) {
			transition: stroke 0.2s;
			width: 41px;
			height: 41px;
			stroke: #bbb;
			fill: none;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
			will-change: transform,scale,translate;
		}
	}
</style>
