<script lang="ts">
	import type {Context} from "../Context.svelte.js";
	import {classStringFromStatusCode, IconCode, isStatusCode, toStatusCode} from "../types";
	import {
		Circle,
		KeyRound,
		LocateFixed,
		LockKeyhole,
		RectangleHorizontal,
		SquareArrowOutUpRight,
		Trash2,
		Unplug
	} from 'lucide-svelte';
	import {getTooltipText, tooltip} from "../Tooltip";
	import {NoTaskId} from "../NodePositionsCalculator";

	let {
		iconCode,
		context,
	}: {
		iconCode: IconCode,
		context: Context,
	} = $props();

	let isPressedDown = $state(false);
	let isPressed = $derived(context.pressedButtonCode == iconCode);
	
	const stateful = [IconCode.REMOVE, IconCode.STATUS, IconCode.KEY, IconCode.LOCK].contains(iconCode);
	
	function onpointerdown(event: MouseEvent) {
		isPressedDown = true;
		event.preventDefault();
		event.stopPropagation();
	}
	
	function onBlur() {
		isPressedDown = false;
	}

	let isButtonDisabled = $derived(
		(context.isReparentingOn() && [IconCode.LOCK, IconCode.KEY].contains(iconCode))
		|| (context.chosenBlockerId !== NoTaskId && [IconCode.REPARENT].contains(iconCode))
		|| (context.chosenBlockedId !== NoTaskId && [IconCode.REPARENT].contains(iconCode))
	);
	
	function onpointerup(event: MouseEvent) {
		if (!isPressedDown) {
			return;
		}
		if (isButtonDisabled) {
			return;
		}
		if (context.pressedButtonCode !== iconCode) {
			context.cancelReparenting();
			context.chosenBlockerId = NoTaskId;
			context.chosenBlockedId = NoTaskId;
		}
		isPressedDown = false;
		if (isPressed) {
			isPressed = false;
			context.pressedButtonCode = -1;
		} else if (stateful) {
			isPressed = true;
			context.pressedButtonCode = iconCode;
		} else {
			context.pressedButtonCode = -1;
		}
		if (isStatusCode(iconCode)) {
			context.changeStatus(toStatusCode(iconCode));
		}else if (iconCode == IconCode.REPARENT) {
			context.startReparenting(context.selectedTaskId);
		} else if (iconCode === IconCode.FOCUS) {
			context.changeFocusedTask(context.selectedTaskId);
		} else if (iconCode == IconCode.REMOVE_SINGLE) {
			context.removeTaskSingle(context.selectedTaskId);
		} else if (iconCode == IconCode.REMOVE_MULTIPLE) {
			context.removeTaskBranch(context.selectedTaskId);
		} else if (iconCode == IconCode.CREATE_LINKED_NOTE) {
			context.createLinkedNote(context.selectedTaskId);
		} else if (iconCode == IconCode.KEY) {
			context.chosenBlockedId = context.chosenBlockedId === NoTaskId ? context.selectedTaskId : NoTaskId;
		} else if (iconCode == IconCode.LOCK) {
			context.chosenBlockerId = context.chosenBlockerId === NoTaskId ? context.selectedTaskId : NoTaskId;
		}
		event.stopPropagation();
	}

	let classString = $derived(`
		${(isPressed && !isButtonDisabled) ? 'is-pressed-up ': ''}
		${(isPressedDown && !isButtonDisabled) ? 'is-pressed-down ': '' }
		${iconCode === IconCode.STATUS ? classStringFromStatusCode(context.toolbarStatus) + ' ': ""}
	`);
</script>

<div class="button"
	 use:tooltip={getTooltipText(iconCode)}
	 class:disabled={isButtonDisabled}
	 class:no-pan={true}
	 class:is-pressed-up={isPressed}
	 class:is-pressed-down={isPressedDown}
	 {onpointerdown}
	 {onpointerup}
	 onmouseleave={onBlur}
	 onclick={(event: MouseEvent) => {
		 event.stopPropagation();
	 }}
	 role="presentation"
	 tabindex="-1"
>
	{#if iconCode === IconCode.REMOVE_SINGLE}
		<RectangleHorizontal class={classString}/>
	{:else if iconCode === IconCode.REMOVE_MULTIPLE}
		<svg class={"custom-svg " + classString} viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
			<path d="M8.53882 3.7002V4.5H5.53882V3.7002H8.53882ZM8.73901 3.5V2.5C8.73901 2.38954 8.64927 2.2998 8.53882 2.2998H5.53882C5.42836 2.2998 5.33862 2.38954 5.33862 2.5V3.5C5.33862 3.61046 5.42836 3.7002 5.53882 3.7002V4.5L5.43628 4.49512C4.96585 4.44722 4.5916 4.07297 4.5437 3.60254L4.53882 3.5V2.5C4.53882 1.94772 4.98653 1.5 5.53882 1.5H8.53882C9.0911 1.5 9.53882 1.94772 9.53882 2.5V3.5C9.53882 4.01768 9.14549 4.44379 8.64136 4.49512L8.53882 4.5V3.7002C8.64928 3.7002 8.73901 3.61046 8.73901 3.5Z"/>
			<path d="M8.53882 7.7002V8.5H5.53882V7.7002H8.53882ZM8.73901 7.5V6.5C8.73901 6.38954 8.64927 6.2998 8.53882 6.2998H5.53882C5.42836 6.2998 5.33862 6.38954 5.33862 6.5V7.5C5.33862 7.61046 5.42836 7.7002 5.53882 7.7002V8.5L5.43628 8.49512C4.96585 8.44722 4.5916 8.07297 4.5437 7.60254L4.53882 7.5V6.5C4.53882 5.94772 4.98653 5.5 5.53882 5.5H8.53882C9.0911 5.5 9.53882 5.94772 9.53882 6.5V7.5C9.53882 8.01768 9.14549 8.44379 8.64136 8.49512L8.53882 8.5V7.7002C8.64928 7.7002 8.73901 7.61046 8.73901 7.5Z"/>
			<path d="M2.56174 6.15378V3.84616C2.56174 3.07296 3.18893 2.44577 3.96213 2.44577H4.80881V3.24655H3.96213C3.63076 3.24655 3.36252 3.51479 3.36252 3.84616V6.15378C3.36252 6.48515 3.63076 6.75436 3.96213 6.75436H4.80881V7.55417H3.96213C3.18893 7.55417 2.56174 6.92698 2.56174 6.15378Z"/>
			<path d="M2.96191 4.59954V5.40033H0.5V4.59954H2.96191Z"/>
		</svg>
	{:else if iconCode === IconCode.REMOVE}
		<Trash2 class={classString}/>
	{:else if iconCode === IconCode.KEY}
		<KeyRound class={classString}/>
	{:else if iconCode === IconCode.LOCK}
		<LockKeyhole class={classString}/>
	{:else if iconCode === IconCode.REPARENT}
		<Unplug class={classString}/>
	{:else if iconCode === IconCode.FOCUS}
		<LocateFixed class={classString + " focus"}/>
	{:else if iconCode === IconCode.CREATE_LINKED_NOTE}
		<SquareArrowOutUpRight class={classString}/>
	{:else if iconCode === IconCode.STATUS}
		<Circle class={classString}/>
	{:else if iconCode === IconCode.STATUS_DRAFT}
		<Circle class={classString + " draft"}/>
	{:else if iconCode === IconCode.STATUS_READY}
		<Circle class={classString + " ready"}/>
	{:else if iconCode === IconCode.STATUS_IN_PROGRESS}
		<Circle class={classString + " in-progress"}/>
	{:else if iconCode === IconCode.STATUS_DONE}
		<Circle class={classString + " done"}/>
	{/if}
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
		border-radius: 8px;
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
		.custom-svg {
			stroke-width: 0.083;
			fill: #bbb;
		}
		:global(svg.focus) {
			width: 21px;
			height: 21px;
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

	.button.disabled {
		:global(svg) {
			stroke: grey;			
		}
	}
	
	.button:hover:not(.disabled){
		background-color: #343434;
		/*border-color: red;*/
		border-width: 0;
		outline: none;
	}
	
	.button.is-pressed-down:not(.disabled){
		background-color: #343434;
		color: white;
		:global(svg) {
			stroke: white;
		}
	}
	.button.is-pressed-up:not(.disabled){
		background-color: #343434;
		color: white;
		:global(svg) {
			stroke: white;
		}
	}
</style>
