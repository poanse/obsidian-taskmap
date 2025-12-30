<script lang="ts">
	import Button from "./Button.svelte";
	import { fade } from 'svelte/transition';
	import {
		TOOLBAR_PADDING,
		TOOLBAR_GAP,
		BUTTON_SIZE,
		TOOLBAR_SIZE, TASK_SIZE, TOOLBAR_SHIFT, SUBTOOLBAR_SHIFT
	} from "../Constants";
	// 1. Import the transition you want
	import {quintOut} from 'svelte/easing';
	import {slideCustom} from '../Custom';
	import type {Context} from "../Context.svelte.js";
	import {IconCode, toIconCode} from "../types";
	
	let {
		context
	}: {context: Context} = $props();

	let position = $derived(context.getCurrentTaskPosition(context.selectedTaskId));
	
	function getTop() {
		return position.y - TOOLBAR_SIZE.height - TOOLBAR_SHIFT;
	}
	function getLeft() {
		return position.x + TASK_SIZE.width_hovered / 2 - TOOLBAR_SIZE.width / 2;
	}
	
	let isLeafTask = $derived(context.selectedTaskId != -1 && context.projectData.getChildren(context.selectedTaskId).length === 0);

</script>

{#if context.selectedTaskId !== -1}
<div
	class="toolbar"
	class:no-pan={true}
	in:fade={{ duration: 500 }}
	out:fade={{ duration: 300 }}
	onclick={(e) => e.stopPropagation()}
	onpointerdown={(e) => e.stopPropagation()}
	onpointerup={(e) => e.stopPropagation()}
	style="
		top: {getTop()}px;
		left: {getLeft()}px;
	"
>
	{#key context.updateOnZoomCounter}
		{#if context.isRemoveButtonEnabled()}
			<Button iconCode={IconCode.REMOVE} {context}/>
		{/if}
		<Button iconCode={IconCode.KEY} {context} />
		<Button iconCode={IconCode.LOCK} {context} />
		<Button iconCode={IconCode.FOCUS} {context} />
		<Button iconCode={IconCode.STATUS} {context} />
		<Button iconCode={IconCode.CREATE_LINKED_NOTE} {context} />
	{/key}
</div>
{/if}

{#if context.pressedButtonCode === IconCode.REMOVE && context.selectedTaskId !== -1}
	<div
		class="subtoolbar"
		transition:slideCustom={{ duration: 300, easing: quintOut, axis: '-y' }}
		style="
			top: {getTop() - 2 * BUTTON_SIZE - TOOLBAR_GAP - 2 * TOOLBAR_PADDING.y - SUBTOOLBAR_SHIFT - 2}px;
			left: {getLeft() - 2}px;
		"
	>
		{#key context.updateOnZoomCounter}
			<Button iconCode={IconCode.REMOVE_SINGLE} {context} />
			<Button iconCode={IconCode.REMOVE_MULTIPLE} {context} />
		{/key}
	</div>
{/if}

{#if context.pressedButtonCode === IconCode.STATUS && context.selectedTaskId !== -1}
	<div
		class="subtoolbar"
		transition:slideCustom={{ duration: 300, easing: quintOut, axis: '-y' }}
		style="
			top: {getTop() - (isLeafTask ? 2 : 1) * 2 * BUTTON_SIZE - ((isLeafTask ? 2 : 0) + 1)*TOOLBAR_GAP - 2*TOOLBAR_PADDING.y - SUBTOOLBAR_SHIFT - 2}px;
			left: {getLeft() + 4 * (BUTTON_SIZE + TOOLBAR_GAP) - 2}px;
		"
	>
		{#key context.updateOnZoomCounter}
			{#if isLeafTask}
				<Button iconCode={IconCode.STATUS_DRAFT} {context} />
				<Button iconCode={IconCode.STATUS_READY} {context} />
				<Button iconCode={IconCode.STATUS_IN_PROGRESS} {context} />
				<Button iconCode={IconCode.STATUS_DONE} {context} />
			{:else}
				<Button iconCode={IconCode.STATUS_DRAFT} {context} />
				<Button iconCode={toIconCode(context.projectData.calculateStatus(context.selectedTaskId))} {context} />
			{/if}
		{/key}
	</div>
{/if}

<style>
	.toolbar {
		gap: 2px;
		padding: 2px 2px;
		/*background: #181818;*/
		background: #0f0f0fff;
		/*background-color: #1E1E1E;*/
		border-radius: 8px;
		border-color: #343434;
		border-style: solid;
		border-width: 2px;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		position: absolute;
		transform: translate3d(-2px,-2px,0);
		will-change: transform,scale,translate;
		min-width: 98px;
		min-height: 22px;
		/*transform: translate(-50%, -50%);*/
	}
	.subtoolbar {
		/*margin-top: 10px;*/
		/*border: 1px solid #ccc;*/
		/*background: #181818;*/

		border-color: #343434;
		border-style: solid;
		border-width: 2px;
		background: #0f0f0fff;
		/*background-color: #1E1E1E;*/
		overflow: hidden; /* Important for slide animations to look clean */
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 2px;
		border-radius: 8px;
		justify-content: center;
		align-items: center;
		position: absolute;
	}
</style>
