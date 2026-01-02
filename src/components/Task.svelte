<script lang="ts">
	import {Context} from "../Context.svelte.js";
	import {StatusCode} from "../types";
	import TaskText from "./TaskText.svelte";
	import AddTaskButton from "./AddTaskButton.svelte";
	import HideBranchButton from "./HideBranchButton.svelte";

	const {
		taskId,
		context,
		coords
	}: {
		taskId: number,
		context: Context,
		coords: {x: number, y: number}
	} = $props();
	
	let taskData = $derived(context.projectData.getTask(taskId));
	// let coords = $derived(context.getTaskPosition(taskId));
	let isUnselected = $derived(context.isAncestorOfHidden(taskId) || (context.isReparentingOn() && !context.isValidReparentingTarget(taskId)));
	let isHovered = $state(false);
	// derived here is a must
	let isSelected = $derived(context.isSelected(taskId));

	function finishEditing(success: boolean) {
		const selection = window.getSelection();
		if (selection) {
			selection.removeAllRanges()
		}
		// const input = (document.getElementById('titleInput') as HTMLInputElement);
		// input.selectionStart = 0;
		// input.selectionEnd = 1;
		// input.disabled = true;
	}

	function onPointerUp(event: PointerEvent) {
		console.log(`Task clicked ${taskId}`);
		if (context.taskDraggingManager.isDragging) {
			return;
		}
		if (context.isReparentingOn() && context.isValidReparentingTarget(taskId)) {
			context.finishReparenting(taskId);
		} else {
			context.setSelectedTaskId(taskData.taskId);
			// const input = (document.getElementById('titleInput') as HTMLInputElement);
			// input.disabled = false;
		}
		context.taskDraggingManager.onPointerUp(event);
		context.updateTaskPositions();
		event.stopPropagation();
	}
	
</script>

{#if !context.isTaskHidden(taskId) && !context.projectData.isBranchHidden(taskId)}
{#key context.updateOnZoomCounter}
<div
	class="task-container"
	style="
		top: {coords.y}px;
		left: {coords.x}px;
		pointer-events={context.taskDraggingManager.isDragging ? 'none' : 'auto'}
	"
>
	<div
		class="task"
		class:no-pan={true}
		class:hovered={isHovered || isSelected}
		class:draft={taskData.status === StatusCode.DRAFT}
		class:ready={taskData.status === StatusCode.READY}
		class:in-progress={taskData.status === StatusCode.IN_PROGRESS}
		class:done={taskData.status === StatusCode.DONE}
		class:unselect={isUnselected}
		onmouseenter={() => isHovered = true}
		onmouseleave={() => isHovered = false}
		onpointerdown={(event: PointerEvent) => {
			context.taskDraggingManager.setDraggedTaskId(taskId);
		}}
		onpointerup={onPointerUp}
		onblur={() => finishEditing(true)}
		role="presentation"
	>
		<TaskText
			{taskId}
			{isUnselected}
			{context}
			app={context.app}
			content={taskData.name}
			onSave={(newContent)=> {
				taskData.name = newContent;
				context.save();
			}}
			sourcePath={context.view.getFilePath()}
		/>
	</div>
	{#if !context.taskDraggingManager.isDragging}
		<AddTaskButton {context} {taskId} />
		<HideBranchButton {context} {taskId} />
	{/if}
</div>
{/key}
{/if}

<style>
	.task-container {
		z-index: 3; /* over lines*/
		position: absolute;
	}
	.task {
		/*background: #111;*/
		/*background-color: #1E1E1E;*/
		/*background: #0f0f0fff;*/
		border-style: solid;
		border-width: 2px;
		/*border-color: #7e7e7e;*/
		border-radius: 20px;
		/*padding: 35px;*/
		text-align: center;
		color: white;
		font-size: 20px;
		font-family: "Segoe UI";
		line-height: 1.5;
		width: 280px;
		height: 80px;
		display: flex;
		justify-content: center;
		align-items: center;
		position: absolute;
		transition: background-color 0.3s, border-color 0.3s;
		transform: translateZ(0);
		will-change: transform;
	}
	.task.hovered {
		width: 284px;
		height: 84px;
		border-width: 4px;
		transform: translate3d(-2px,-2px,0);
		cursor: pointer;
	}
	.task.draft {
		border-color: #7E7E7E;
		background-color: #1E1E1E;
	}
	.task.ready {
		border-color: #A1383D;
		background-color: #2E2122;
	}
	.task.in-progress {
		border-color: #A6A45D;
		background-color: #2C2C24;
	}
	.task.done {
		border-color: #3E9959;
		background-color: #212B24;
	}
	.task.unselect {
		border-color: color-mix(in srgb, #7E7E7E 100%, #000000 50%);
		background-color: color-mix(in srgb, #1E1E1E 100%, #000000 50%);
	}
</style>
