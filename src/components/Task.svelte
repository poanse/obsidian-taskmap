<script lang="ts">
	import {Context} from "../Context.svelte.js";
	import {classStringFromStatusCode} from "../types";
	import TaskText from "./TaskText.svelte";
	import AddTaskButton from "./AddTaskButton.svelte";
	import HideBranchButton from "./HideBranchButton.svelte";
	import {NoTaskId} from "../NodePositionsCalculator";
	import {KeyRound, LockKeyhole} from "lucide-svelte";
	import {onMount} from "svelte";

	const {
		taskId,
		context,
		coords
	}: {
		taskId: number,
		context: Context,
		coords: {x: number, y: number}
	} = $props();
	
	let self: HTMLElement;
	let viewport: HTMLElement;

	onMount(() => {
		viewport = self?.closest('.viewport') as HTMLElement;
		return () => {
			viewport.focus();
		}
	});
	
	let taskData = $derived(context.versionedData.getTask(taskId));
	// let coords = $derived(context.getTaskPosition(taskId));
	let isHovered = $state(false);
	let isBlockerHighlighted = $derived(
		context.isBlockerHighlighted(taskId) || (
			isHovered
			&& (
				context.isValidBlockerTarget(taskId)
				|| context.isValidBlockedTarget(taskId)
			)
		)
	);
	let isUnselected = $derived(!isBlockerHighlighted && (
		context.isAncestorOfHidden(taskId)
		|| (context.isReparentingOn() && !context.isValidReparentingTarget(taskId))
		|| (context.chosenBlockedId !== NoTaskId && context.chosenBlockedId !== taskId)
		|| (context.chosenBlockerId !== NoTaskId && context.chosenBlockerId !== taskId)
	));
	// derived here is a must
	let isSelected = $derived(context.isSelected(taskId));

	function finishEditing() {
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
		console.debug(`Task clicked ${taskId}`);
		if (context.taskDraggingManager.isDragging) {
			return;
		}
		if (context.chosenBlockedId !== NoTaskId) {
			console.debug('Task click add blocker branch');
			if ( context.isValidBlockerTarget(taskId)){
				const blockerPair = {blocked: context.chosenBlockedId, blocker: taskId};
				if (context.versionedData.containsBlockerPair(blockerPair)) {
					context.versionedData.removeBlockerPair(blockerPair);
				} else {
					context.versionedData.addBlockerPair(blockerPair);
				}
				context.save();
			}
		}
		else if (context.chosenBlockerId !== NoTaskId) {
			console.debug('Task click add blocked branch');
			if (context.isValidBlockedTarget(taskId)) {
				const blockerPair = {blocked: taskId, blocker: context.chosenBlockerId};
				if (context.versionedData.containsBlockerPair(blockerPair)) {
					context.versionedData.removeBlockerPair(blockerPair);
				} else {
					context.versionedData.addBlockerPair(blockerPair);
				}
				context.save();
			}
		}
		else if (context.isReparentingOn()) {
			if (context.isValidReparentingTarget(taskId)) {
				context.finishReparenting(taskId);
				context.cancelReparenting();
			}
		} else {
			context.pressedButtonCode = -1;
			context.setSelectedTaskId(taskData.taskId);
			// const input = (document.getElementById('titleInput') as HTMLInputElement);
			// input.disabled = false;
		}
		context.finishTaskDragging(event);
		context.updateTaskPositions();
		event.stopPropagation();
	}

	let isBlockerHighlight = $derived(
		context.isBlockerHighlighted(taskId) || (
			isHovered
			&& (
				context.isValidBlockerTarget(taskId)
				|| context.isValidBlockedTarget(taskId)
			)
		)
	);
</script>

{#if !context.isTaskHidden(taskId) && !context.versionedData.isBranchHidden(taskId)}
	{#key context.updateOnZoomCounter}
		<div
			class="task-container"
			bind:this={self}
			style="
				top: {coords.y}px;
				left: {coords.x}px;
				pointer-events={context.taskDraggingManager.isDragging ? 'none' : 'auto'}
			"
		>
			<div
				class={`task ${classStringFromStatusCode(taskData.status)}`}
				class:no-pan={true}
				class:hovered={
					(isHovered || isSelected)
					&& !(context.isReparentingOn() && !context.isValidReparentingTarget(taskId))
					&& !(context.chosenBlockerId !== NoTaskId && !context.isValidBlockedTarget(taskId))
					&& !(context.chosenBlockedId !== NoTaskId && !context.isValidBlockerTarget(taskId))
				}
				class:unselect={isUnselected}
				class:blocker-highlight={isBlockerHighlight}
				onmouseenter={() => isHovered = true}
				onmouseleave={() => isHovered = false}
				onpointerdown={(e: PointerEvent) => {
					if (context.editingTaskId === NoTaskId) {
						context.startTaskDragging(e, taskId);
					}
					e.stopPropagation();
				}}
				onpointerup={onPointerUp}
				onblur={() => finishEditing()}
				role="presentation"
				tabindex="-1"
			>
				<TaskText {taskId} {isUnselected} {context}/>
			</div>
			{#if !context.taskDraggingManager.isDragging 
				 && !context.isReparentingOn()
				 && !(context.chosenBlockedId !== NoTaskId)
				 && !(context.chosenBlockerId !== NoTaskId)}
				<AddTaskButton {context} {taskId} />
			{/if}
			{#if (context.versionedData.getChildren(taskId).length > 0)
				 && !context.isReparentingOn()
				 && !(context.chosenBlockedId !== NoTaskId)
				 && !(context.chosenBlockerId !== NoTaskId)}
				<HideBranchButton {context} {taskId} />
			{/if}
			{#if context.versionedData.isTaskBlocking(taskId)}
				<div
					class="icon-container"
					style="top: 4px;"
				>
					<KeyRound
						onmouseenter={() => context.hoveredBlockerId = taskId}
						onmouseleave={() => context.hoveredBlockerId = NoTaskId}
						class={
							classStringFromStatusCode(taskData.status)
							+ (isBlockerHighlight ? ' blocker-highlight' : '')
							+ (isUnselected ? ' unselect' : '')
						}
						style="transform: rotate(-90deg) scale(-1, 1);"
					/>
				</div>
			{/if}
			{#if context.versionedData.isTaskBlocked(taskId)}
				<div
					class="icon-container"
					style="top: 40px;"
				>
					<LockKeyhole
						onpointerenter={() => context.hoveredBlockedId = taskId}
						onpointerleave={() => context.hoveredBlockedId = NoTaskId}
						class={
							classStringFromStatusCode(taskData.status)
							+ (isBlockerHighlight ? ' blocker-highlight' : '')
							+ (isUnselected ? ' unselect' : '')
						}
					/>
				</div>
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
		font-family: var(--font-text);
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
		cursor: pointer;
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
	.task.ready.unselect {
		border-color: color-mix(in srgb, #672D2F 100%, #000000 50%);
		background-color: color-mix(in srgb, #2E2122 100%, #000000 50%);
	}
	.task.in-progress {
		border-color: #A6A45D;
		background-color: #2C2C24;
	}
	.task.in-progress.unselect {
		border-color: color-mix(in srgb, #898740 100%, #000000 50%);
		background-color: color-mix(in srgb, #2C2C24 100%, #000000 50%);
	}
	.task.done {
		border-color: #3E9959;
		background-color: #212B24;
	}
	.task.done.unselect {
		border-color: color-mix(in srgb, #30623E 100%, #000000 50%);
		background-color: color-mix(in srgb, #212B24 100%, #000000 50%);
	}
	.task.blocker-highlight {
		border-color: #E9973F;
		background-color: #2C2720;
		background-image: repeating-linear-gradient(
			-75deg,
			transparent,
			transparent 20px,
			rgba(233, 151, 63, 0.1) 20px,
			rgba(233, 151, 63, 0.1) 22px
		);
	}
	.icon-container {
		width: 36px;
		height: 36px;
		left: 8px;
		position: absolute;
		justify-content: center;
		align-items: center;
		display: inline-flex;
		pointer-events: auto;

		:global(svg.draft) {
			stroke: #7E7E7E;
		}
		:global(svg.draft.unselect) {
			stroke: color-mix(in srgb, #7E7E7E 100%, #000000 50%);
		}
		:global(svg.ready) {
			stroke: #672D2F;
		}
		:global(svg.ready.unselect) {
			stroke: color-mix(in srgb, #672D2F 100%, #000000 50%);
		}
		:global(svg.in-progress) {
			stroke: #898740;
		}
		:global(svg.in-progress.unselect) {
			stroke: color-mix(in srgb, #898740 100%, #000000 50%);
		}
		:global(svg.done) {
			stroke: #30623E;
		}
		:global(svg.done.unselect) {
			stroke: color-mix(in srgb, #30623E 100%, #000000 50%);
		}
		:global(svg.blocker-highlight) {
			stroke: #8A5F2F;
		}
	}
</style>
