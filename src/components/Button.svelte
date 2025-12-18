<script lang="ts">
	import type {Context} from "../Context.svelte.js";
	import {IconCode, StatusCode} from "../types";
	import IconService from "../IconService";

	let {
		iconCode,
		context,
	}: {
		iconCode: IconCode,
		context: Context,
	} = $props();

	let isPressedDown = $state(false);
	let isPressed=$derived(context.pressedButtonIndex == iconCode);
	
	const stateful = iconCode != IconCode.FOCUS;
	
	function onpointerdown(event: MouseEvent) {
		isPressedDown = true;
		event.stopPropagation();
	}
	
	function onBlur() {
		isPressedDown = false;
	}
	
	function onpointerup(event: MouseEvent) {
		if (!isPressedDown) {
			return;
		}
		isPressedDown = false;
		if (isPressed) {
			isPressed = false;
			context.pressedButtonIndex = -1;
		} else if (stateful) {
			isPressed = true;
			context.pressedButtonIndex = iconCode;
		} else {
			context.pressedButtonIndex = -1;
		}
		let newStatus: StatusCode | null = null;
		if (iconCode == IconCode.STATUS_READY) {
			newStatus = StatusCode.READY;
		} else if (iconCode == IconCode.STATUS_DRAFT) {
			newStatus = StatusCode.DRAFT;
		} else if (iconCode == IconCode.STATUS_DONE) {
			newStatus = StatusCode.DONE;
		} else if (iconCode == IconCode.STATUS_IN_PROGRESS) {
			newStatus = StatusCode.IN_PROGRESS;
		}
		if (newStatus != null) {
			context.changeStatus(newStatus);
		}
		if (iconCode == IconCode.TRASH_SINGLE || iconCode == IconCode.TRASH_MULTIPLE) {
			context.removeTask(context.selectedTaskId);
		}
		event.stopPropagation();
	}
	
	function _getIcon() {
		if (iconCode == IconCode.STATUS) {
			return IconService.getStatusIcon(context.toolbarStatus);
		}
		return IconService.getIcon(iconCode);
	}
</script>

<div class="button"
	 class:no-pan={true}
	 class:is-pressed-up={isPressed}
	 class:is-pressed-down={isPressedDown}
	 {onpointerdown}
	 {onpointerup}
	 onmouseleave={onBlur}
	 onclick={(event: MouseEvent) => {
		 event.stopPropagation();
		 if (IconCode.FOCUS === iconCode) {
			 context.setSelectedTaskId(-1);
		 }
	 }}
	 role="presentation"
	 tabindex="-1"
>
	{@html _getIcon()}
</div>

<style>
	.button {
		width: 36px;
		height: 36px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 0;
		/*background-color: #e0e0e0;*/
		cursor: pointer;
		border-radius: 4px;
		user-select: none;

		background: #0f0f0fff;
		/*background-color: #1E1E1E;*/

		/* This handles the smooth color change for the SVG and Text */
		transition: background-color 0.2s, color 0.2s;

		:global(svg) {
			transition: stroke 0.2s;
			width: 20px;
			height: 20px;
			stroke: #bbb;
			fill: none;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
			will-change: transform,scale,translate;
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

	.button:hover {
		background-color: #343434;
		/*border-color: red;*/
		border-width: 0;
		outline: none;
	}

	.button.is-pressed-down {
		background-color: #343434;
		color: white;
		:global(svg) {
			stroke: white;
		}
	}
	.button.is-pressed-up {
		background-color: #343434;
		color: white;
		:global(svg) {
			stroke: white;
		}
	}
</style>
