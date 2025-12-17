<script lang="ts">
	import Button from "./Button.svelte";
	import { fade } from 'svelte/transition';
	import {
		TOOLBAR_PADDING,
		TOOLBAR_GAP,
		BUTTON_SIZE,
		TOOLBAR_SIZE, TASK_SIZE, TOOLBAR_SHIFT, SUBTOOLBAR_SHIFT
	} from "../pixi/Constants";
	// 1. Import the transition you want
	import {quintOut} from 'svelte/easing';
	import {slideCustom} from '../pixi/Custom';
	import type {UIState} from "../pixi/GlobalState.svelte.js";
	import {IconCode} from "../types";
	
	let {
		uiState
	}: {uiState: UIState} = $props();

	let position = $derived(uiState.getCurrentTaskPosition(uiState.selectedTaskId));
	
	function getTop() {
		return position.y - TOOLBAR_SIZE.height - TOOLBAR_SHIFT;
	}
	function getLeft() {
		return position.x + TASK_SIZE.width_hovered / 2 - TOOLBAR_SIZE.width / 2;
	}

</script>

<div
	class="toolbar"
	class:no-pan={true}
	in:fade={{ duration: 500 }}
	out:fade={{ duration: 300 }}
	style="
		top: {getTop()}px;
		left: {getLeft()}px;
	"
>
	{#key uiState.updateOnZoomCounter}
		<Button iconCode={IconCode.TRASH} {uiState}/>
		<Button iconCode={IconCode.KEY} {uiState} />
		<Button iconCode={IconCode.LOCK} {uiState} />
		<Button iconCode={IconCode.FOCUS} {uiState} />
		<Button iconCode={IconCode.STATUS} {uiState} />
	{/key}
</div>
{#if uiState.pressedButtonIndex === IconCode.TRASH}
	<div
		class="subtoolbar"
		transition:slideCustom={{ duration: 300, easing: quintOut, axis: '-y' }}
		style="
			top: {getTop() - 2 * BUTTON_SIZE - TOOLBAR_GAP - 2 * TOOLBAR_PADDING.y - SUBTOOLBAR_SHIFT}px;
			left: {getLeft()}px;
		"
	>
		{#key uiState.updateOnZoomCounter}
			<Button iconCode={IconCode.TRASH_SINGLE} {uiState} />
			<Button iconCode={IconCode.TRASH_MULTIPLE} {uiState} />
		{/key}
	</div>
{/if}
{#if uiState.pressedButtonIndex === IconCode.STATUS}
	<div
		class="subtoolbar"
		transition:slideCustom={{ duration: 300, easing: quintOut, axis: '-y' }}
		style="
			top: {getTop() - 4 * BUTTON_SIZE - 3*TOOLBAR_GAP - 2*TOOLBAR_PADDING.y - SUBTOOLBAR_SHIFT}px;
			left: {getLeft() + 4 * (BUTTON_SIZE + TOOLBAR_GAP)}px;
		"
	>
		{#key uiState.updateOnZoomCounter}
			<Button iconCode={IconCode.STATUS_DRAFT} {uiState} />
			<Button iconCode={IconCode.STATUS_READY} {uiState} />
			<Button iconCode={IconCode.STATUS_IN_PROGRESS} {uiState} />
			<Button iconCode={IconCode.STATUS_DONE} {uiState} />
		{/key}
	</div>
{/if}
