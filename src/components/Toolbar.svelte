<script lang="ts">
	import Button from "./Button.svelte";
	import { fade } from 'svelte/transition';
	import {
		TOOLBAR_GAP,
		TOOLBAR_BUTTON_SIZE,
		TOOLBAR_SIZE, TASK_SIZE, TOOLBAR_SHIFT, SUBTOOLBAR_SHIFT, SUBTOOLBAR_BUTTON_SIZE, SUBTOOLBAR_GAP,
		SUBTOOLBAR_PADDING
	} from "../Constants";
	import {quintOut} from 'svelte/easing';
	import {slideCustom} from '../Custom';
	import type {Context} from "../Context.svelte.js";
	import {
		buttonTextFromIconCode,
		IconCode, StatusCode, type TaskId, toIconCode
	} from "../types";
	import {RootTaskId} from "../NodePositionsCalculator";
	
	let {
		taskId,
		context
	}: {taskId: TaskId,
		context: Context} = $props();

	let position = $derived(context.getCurrentTaskPosition(taskId));
	
	function getTop() {
		return position.y - TOOLBAR_SIZE.height - TOOLBAR_SHIFT;
	}
	function getLeft() {
		return position.x + TASK_SIZE.width_hovered / 2;
	}
	let isLeafTask = $derived(context.projectData.getChildren(taskId).length === 0);
	
	let toolbarButtons = $derived(taskId == RootTaskId ? [
		IconCode.CREATE_LINKED_NOTE,
		IconCode.FOCUS,
		IconCode.STATUS_SUBMENU

	] : [
		IconCode.CREATE_LINKED_NOTE,
		IconCode.REMOVE_SUBMENU,
		IconCode.REPARENT,
		IconCode.KEY,
		IconCode.LOCK,
		IconCode.FOCUS,
		IconCode.STATUS_SUBMENU
	]);
	
	let removeButtons = [
		IconCode.REMOVE_SINGLE,
		IconCode.REMOVE_MULTIPLE
	];
	
	let statusButtons = $derived((isLeafTask ? [
		StatusCode.DRAFT,
		StatusCode.READY,
		StatusCode.IN_PROGRESS,
		StatusCode.DONE,
	]: [
		StatusCode.DRAFT,
		context.projectData.calculateStatus(taskId)
	]).map(x => toIconCode(x)));
	
	let subtoolbarTopShift = (buttons: IconCode[]) => {
		return - (buttons.length * SUBTOOLBAR_BUTTON_SIZE + (buttons.length -1)*SUBTOOLBAR_GAP + 2*SUBTOOLBAR_PADDING.y + SUBTOOLBAR_SHIFT);
	};
</script>

{#if !context.taskDraggingManager.isDragging}
	<div
		class="toolbar"
		class:no-pan={true}
		in:fade|global={{ duration: 500 }}
		out:fade|global={{ duration: 300 }}
		onclick={(e) => e.stopPropagation()}
		onpointerdown={(e) => e.stopPropagation()}
		onpointerup={(e) => e.stopPropagation()}
		style="
			top: {getTop()}px;
			left: {getLeft()}px;
		"
	>
		{#key context.updateOnZoomCounter}
			{#each toolbarButtons as button}
				<Button iconCode={button} {context} />
			{/each}
		{/key}

		{#key context.updateOnZoomCounter}
			{#if context.pressedButtonCode === IconCode.REMOVE_SUBMENU}
				<div
					class="subtoolbar"
					transition:slideCustom={{ duration: 300, easing: quintOut, axis: '-y' }}
					style="
						top: {subtoolbarTopShift(removeButtons)}px;
						left: {toolbarButtons.indexOf(IconCode.REMOVE_SUBMENU) * (TOOLBAR_BUTTON_SIZE + TOOLBAR_GAP) - 128/2 + TOOLBAR_BUTTON_SIZE / 2}px;
					"
				>
					{#key context.updateOnZoomCounter}
						<Button iconCode={IconCode.REMOVE_SINGLE} {context} text={buttonTextFromIconCode(IconCode.REMOVE_SINGLE)}/>
						<Button iconCode={IconCode.REMOVE_MULTIPLE} {context} text={buttonTextFromIconCode(IconCode.REMOVE_MULTIPLE)}/>
					{/key}
				</div>
			{/if}
		{/key}

		{#key context.updateOnZoomCounter}
			{#if context.pressedButtonCode === IconCode.STATUS_SUBMENU}
				<div
					class="subtoolbar"
					transition:slideCustom={{ duration: 300, easing: quintOut, axis: '-y' }}
					style="
						top: {subtoolbarTopShift(statusButtons)}px;
						left: {toolbarButtons.indexOf(IconCode.STATUS_SUBMENU) * (TOOLBAR_BUTTON_SIZE + TOOLBAR_GAP) - 128/2 + TOOLBAR_BUTTON_SIZE / 2}px;
					"
				>
					{#each statusButtons as button}
						<Button iconCode={button} {context} text={buttonTextFromIconCode(button)}/>
					{/each}
				</div>
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
		transform: translate3d(-2px,-2px,0) translateX(-50%);
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
		border-radius: 8px;
		background: #0f0f0fff;
		/*background-color: #1E1E1E;*/
		overflow: hidden; /* Important for slide animations to look clean */
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 4px;
		justify-content: center;
		align-items: center;
		position: absolute;
	}
</style>
