<script lang="ts">
	import {Context} from "../Context.svelte.js";
	import {StatusCode} from "../types";
	import TaskText from "./TaskText.svelte";
	import AddTaskButton from "./AddTaskButton.svelte";

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
	
	let isHovered = $state(false);
	// derived here is a must
	let isSelected = $derived(context.isSelected(taskId));
	let editing = $state(false);
	let inputValue = $state(taskData.name);
	const useNewTextElement = true;

	function startEditing() {
		editing = true;
		inputValue = taskData.name;
	}

	function finishEditing(success: boolean) {
		if (!useNewTextElement) {
			if (success && inputValue.trim() !== "") {
				taskData.name = inputValue.trim();
				context.save();
			}
			inputValue = taskData.name;
			editing = false;
		}
		const selection = window.getSelection();
		if (selection) {
			selection.removeAllRanges()
		}
		// const input = (document.getElementById('titleInput') as HTMLInputElement);
		// input.selectionStart = 0;
		// input.selectionEnd = 1;
		// input.disabled = true;
	}

	function textInputHandleKey(e: KeyboardEvent) {
		console.log('textInputHandleKey ', e.key);
		if (!editing) {
			return;
		}
		console.log('textInputHandleKey handled', e.key);
		if (e.key === "Enter") {
			finishEditing(true);
			e.stopPropagation();
		}
		if (e.key === "Escape") {
			finishEditing(false);
			e.stopPropagation();
		}
	}


	let mouseDown = $state(false);
	function onTaskClick(event: Event) {
		console.log(`Task clicked ${taskId}`);
		if (!mouseDown) {
			return;
		}
		mouseDown = false;
		if (editing) {
			finishEditing(true);
		} else {
			context.setSelectedTaskId(taskData.taskId);
			// const input = (document.getElementById('titleInput') as HTMLInputElement);
			// input.disabled = false;
		}
		event.stopPropagation();
	}
	
	function onTextClick(event: Event) {
		console.log('TextClicked');
		if (!isSelected) {
			context.setSelectedTaskId(taskData.taskId);
			// const input = (document.getElementById('titleInput') as HTMLInputElement);
			// input.disabled = false;
		} else if (editing == false) {
			startEditing();
		}
		// } else if (editing) {
		// 	finishEditing(true);
		// }
		event.stopPropagation();
	}
</script>


{#if !context.projectData.isTaskDeleted(taskId)}
{#key context.updateOnZoomCounter}
<div
	class="task-container"
	style="
		top: {coords.y}px;
		left: {coords.x}px;
		position: absolute;
	"
>
	<div
		class="task"
		class:no-pan={true}
		class:draft={taskData.status === StatusCode.DRAFT}
		class:ready={taskData.status === StatusCode.READY}
		class:in-progress={taskData.status === StatusCode.IN_PROGRESS}
		class:done={taskData.status === StatusCode.DONE}
		onmouseenter={() => isHovered = true}
		onmouseleave={() => isHovered = false}
		onmousedown={(event: MouseEvent) => {
			mouseDown = true;
			event.stopPropagation();
		}}
		class:hovered={isHovered || isSelected}
		onclick={onTaskClick}
		onblur={() => finishEditing(true)}
		role="presentation"
	>
		{#if useNewTextElement}
			<TaskText
				{taskId}
				{context}
				app={context.app}
				content={taskData.name}
				onSave={(newContent)=> {
					taskData.name = newContent;
					context.save();
				}}
				sourcePath={context.getActiveView().getFilePath()}
			/>
		{:else}
		<input
			class="textInput"
			class:no-pan={true}
			type="text"
			id="titleInput"
			bind:value={inputValue}
			onclick={onTextClick}
			onblur={() => finishEditing(true)}
			onmousedown={(e: MouseEvent) => e.stopPropagation()}
			onkeydown={textInputHandleKey}
			disabled={!isSelected}
			style='{ !isSelected? "pointer-events: none;": ""}'
		/>
		{/if}
	</div>
	<AddTaskButton {context} {taskId} />
</div>
{/key}
{/if}

<style>
	.task-container {
		z-index: 3; /* over lines*/
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
</style>
