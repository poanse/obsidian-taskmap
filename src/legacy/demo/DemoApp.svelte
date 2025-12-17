<script lang="ts">
	import {tick} from "svelte";
	import {TEXT_COLOR, TEXT_STYLE} from "../TaskView";
	import {match, P} from "ts-pattern";

	let coords = $state({ x: 150, y: 150 });
	let dragging = $state(false);
	let taskClicked = $state(false);
	let editing = $state(false);
	const maxLength = 20;
	const taskNameEditSize = 20;
	const fontSize = 20;
	const fontFamily = match(TEXT_STYLE.fontFamily)
		.returnType<string>()
		.with(P.string, (str) => str)
		.with(P.array<string>(), (ar)=> ar[0])
		.exhaustive()
	;

	let textInput = $state('Task 1');
	let title = $state("Task 1");
	
	let task = $state({
		width: 240,
		height: 80,
		shiftX: 2,
		shiftY: 50,
		rx: 30,
		strokeWidthSelected: 4,
		strokeWidthDefault: 2,
	});
	let toolbar = $state({
		width: 100,
		height: 30,
		shiftX: 0,
		shiftY: 0,
	});
	toolbar.shiftX = (task.width - toolbar.width) / 2;
	
	const onMouseMove = (e: MouseEvent) => {
		if (dragging) {
			coords = { x: e.layerX, y: e.layerY };
		}
	};
	const onMouseUp = () => {
		if (dragging) {
			dragging = false;
		} else if (editing) {
			finishEditing(true)
		} else if (taskClicked) {
			taskClicked = false;
		}
	};
	const onMousedown = () => {
		dragging = true;
	};
	const onTaskClick = () => {
		if (!taskClicked) {
			taskClicked = true;
		} else if (!editing) {
			taskClicked = false;
		}
	};
	const onTextClick = () => {
		if (!taskClicked) {
			taskClicked = true;
		} else if (!editing) {
			editing = true;
			textInput = title;
			tick().then(() => {
				const el = document.getElementById("titleInput");
				if (el) el.focus();
			});
		}
	};
	
	const taskStrokeWidth = () => {
		return taskClicked ? task.strokeWidthSelected : task.strokeWidthDefault;
	};

	function finishEditing(success: boolean) {
		if (success && textInput.trim() !== "") {
			title = textInput.trim();
			// taskmapView.debouncedSave();
		}
		textInput = title;
		editing = false;
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === "Enter") finishEditing(true);
		if (e.key === "Escape") finishEditing(false);
	}
</script>

<svg class="Canvas"
	 width="100%"
	 height="100%"
	 onmousemove={onMouseMove}
	 onmouseup={onMouseUp}
	 role="presentation"
>
	<svg class="Task"
		role="presentation"
		width="{task.width + task.shiftX + 2 * task.strokeWidthSelected}px"
		height="{task.height + task.shiftY + 2 *task.strokeWidthSelected}px"
		x={coords.x}
		y={coords.y}
	>
		<rect class="taskBg"
			onmousedown={onMousedown}
			onclick={onTaskClick}
			width={task.width}
			height={task.height}
			x="{task.shiftX}px"
			y="{task.shiftY}px"
			rx={task.rx}
			fill=#ff3e00
			stroke-width="{taskStrokeWidth()}"
			stroke="white"
			role="presentation"
		>
		</rect>

		<text
			  onmousedown={onMousedown}
			  onclick={onTextClick}
			  x={task.width / 2 + task.shiftX}
			  y={task.height / 2 + task.shiftY}
			  fill={TEXT_COLOR}
			  stroke={TEXT_COLOR}
			  font-weight="normal"
			  stroke-width="1px"
			  dominant-baseline="middle"
			  text-anchor="middle"
			  role="presentation"
			  font-size="{fontSize}px"
			  font-family="{fontFamily}"
		>
			{title}
		</text>

		{#if taskClicked}
			<rect class="toolbarBg"
				  x={toolbar.shiftX}
				  y={toolbar.shiftY}
				  width={toolbar.width}
				  height={toolbar.height}
			>
			</rect>
		{/if}
	</svg>
</svg>

{#if editing}
<div
	class="textEditDiv"
	xmlns="http://www.w3.org/1999/xhtml"
	style="
		position: absolute;
		top: {coords.y + task.shiftY + task.height /2 - fontSize/2 - 7}px;
		left: {coords.x + task.shiftX + task.strokeWidthSelected-2}px;
	"
>
	<input
		id="titleInput"
		bind:value={textInput}
		onkeydown={handleKey}
		size={taskNameEditSize}
		maxlength={maxLength}
		style="
			font-family: {fontFamily};
			font-size: {fontSize}px;
			color: {TEXT_COLOR};
			background-color: #ff3e00;
			border: 0px;
			outline-width: 0px;
			padding-left: 5px;
			text-align: center;
			/*dominant-baseline: middle;*/
			/*text-anchor: middle;*/
		"
	/>
</div>
{/if}

<!--onblur={() => finishEditing(true)}-->


<style>
	svg {
		position: absolute;
		left: 0;
		/*right: 200px;*/
		top: 0;
		/*bottom: 100px;*/
	}
	.textEditDiv {
		position: absolute;
		top: 500px;
		left: 500px;
	}
</style>
