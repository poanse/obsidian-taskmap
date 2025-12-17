<script lang="ts">
	import {UIState} from "../pixi/GlobalState.svelte.js";
	import type {ProjectData} from "../ProjectData.svelte.js";
	import {StatusCode} from "../types";
	import TaskText from "./TaskText.svelte";
	import AddTaskButton from "./AddTaskButton.svelte";

	const {
		taskId,
		uiState,
		projectData,
		coords
	}: {
		taskId: number,
		uiState: UIState,
		projectData: ProjectData,
		coords: {x: number, y: number}
	} = $props();
	
	let taskData = $derived(projectData.getTask(taskId));
	// let coords = $derived(uiState.getTaskPosition(taskId));
	
	let isHovered = $state(false);
	// derived here is a must
	let isSelected = $derived(uiState.isSelected(taskData.taskId));
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
				uiState.save();
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
			uiState.setSelectedTaskId(taskData.taskId);
			// const input = (document.getElementById('titleInput') as HTMLInputElement);
			// input.disabled = false;
		}
		event.stopPropagation();
	}
	
	function onTextClick(event: Event) {
		console.log('TextClicked');
		if (!isSelected) {
			uiState.setSelectedTaskId(taskData.taskId);
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


{#if !projectData.isTaskDeleted(taskId)}
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
				{uiState}
				app={uiState.app}
				content={taskData.name}
				onSave={(newContent)=> {
					taskData.name = newContent;
					uiState.save();
				}}
				sourcePath={uiState.getActiveView().getFilePath()}
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
	<AddTaskButton {uiState} {projectData} {taskId} />
</div>
{/if}

<!--top: {coords.y}px;-->
<!--left: {coords.x}px;-->

<!--style="-->
<!--position: absolute;-->
<!--top: {coords.y + task.shiftY + task.height /2 - fontSize/2 - 7}px;-->
<!--left: {coords.x + task.shiftX + task.strokeWidthSelected-2}px;-->
<!--"-->

<!--onclick={onTextClick}-->


<!--<div-->
<!--	class="taskText"-->
<!--	onclick={onTextClick}-->
<!--	onblur={() => finishEditing(true)}-->
<!--	role="presentation"-->
<!--&gt;-->
<!--	<input-->
<!--		class="textInput"-->
<!--		type="text"-->
<!--		id="titleInput"-->
<!--		bind:value={inputValue}-->
<!--		onkeydown={textInputHandleKey}-->
<!--		disabled={!isSelected}-->
<!--		style='{ !isSelected? "pointer-events: none;": ""}'-->
<!--	/>-->
<!--</div>-->


<!--{#if isSelected}-->
<!--	<input-->
<!--		class="textInput"-->
<!--		type="text"-->
<!--		id="titleInput"-->
<!--		bind:value={inputValue}-->
<!--		onkeydown={handleKey}-->
<!--	/>-->
<!--{:else}-->
<!--	{taskData.name}-->
<!--{/if}-->
