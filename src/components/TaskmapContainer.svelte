<script lang="ts">
	import {onMount, tick} from "svelte";
	import {Platform} from "obsidian";
	import Toolbar from "./Toolbar.svelte";
	import Task from "./Task.svelte";
	import Panzoom, {type PanzoomObject} from '@panzoom/panzoom'
	import type {Context} from "../Context.svelte.js";
	import {MouseDown, StatusCode, type Vector2} from "../types";
	import Connection from "./Connection.svelte";
	import {NoTaskId, RootTaskId} from "../NodePositionsCalculator";
	import {DraggingManager} from "../DraggingManager.svelte";
	import {parseNumber} from "../Constants";
	import SettingsPanel from "./SettingsPanel.svelte";
	import {
		panDeltaFromWheel,
		scaleAfterKeyboardZoom,
		usesCommandModifier,
		wheelAction,
		wheelDeltaYOf,
		zoomKeyDirection,
	} from "../viewportInput";

	let {context}: {context: Context} = $props();
	
	let viewportEl: HTMLDivElement | null = null;
	let sceneEl: HTMLDivElement | null = null;
	let panzoom: PanzoomObject | null = null;
	let panstart: Vector2 = {x: 0, y: 0};
	let draggingManager = new DraggingManager([MouseDown.MIDDLE, MouseDown.LEFT]);
	
	onMount(async () => {
		if (!sceneEl) {
			throw new Error('No scene element');
		}
		if (!viewportEl) {
			throw new Error('No viewport');
		}
		
		panzoom = Panzoom(sceneEl, {
			maxScale: 3,
			minScale: 0.1,
			canvas: true,
			excludeClass: 'no-pan',
			cursor: 'default',
			// animate: true,
			noBind: true
		});
	});

	/** Lets keyboard shortcuts reach the map without clicking it first. */
	export function focusViewport() {
		if (viewportEl && !viewportEl.contains(viewportEl.doc.activeElement)) {
			viewportEl.focus({preventScroll: true});
		}
	}

	async function handleKey(e: KeyboardEvent) {
		console.debug('handleKey ', e.key);
		const zoomDirection = usesCommandModifier(e, Platform.isMacOS)
			? zoomKeyDirection(e)
			: null;
		if (zoomDirection !== null) {
			zoomByKeyboard(zoomDirection);
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		if (e.key === "Escape") {
			context.setSelectedTaskId(NoTaskId);
			context.cancelReparenting();
			context.chosenBlockerId = NoTaskId;
			context.chosenBlockedId = NoTaskId;
			e.stopPropagation();
			return;
		} else if (e.key === "Delete") {
			if (context.selectedTaskId !== NoTaskId) {
				context.versionedData.removeTaskSingle(context.selectedTaskId);
				context.selectedTaskId = NoTaskId;
			}
		} else if (usesCommandModifier(e, Platform.isMacOS) && e.key === "z") {
			context.versionedData.undo();
		} else if (usesCommandModifier(e, Platform.isMacOS) && e.key === "r") {
			context.versionedData.redo();
		} else {
			return;
		}
		context.save();
		context.incrementUpdateOnZoomCounter(); // required for TaskText update
		context.updateTaskPositions();
		e.stopPropagation();
		e.preventDefault();
		await tick();
	}

	function zoomByKeyboard(direction: 1 | -1) {
		if (!viewportEl) {
			return;
		}
		const panzoomEl = getPanzoom();
		const rect = viewportEl.getBoundingClientRect();
		const sensitivity = parseNumber(context.plugin.settings.zoomSensitivityKeyboard) ?? 100;
		panzoomEl.zoomToPoint(scaleAfterKeyboardZoom(panzoomEl.getScale(), direction, sensitivity), {
			clientX: rect.left + rect.width / 2,
			clientY: rect.top + rect.height / 2,
		});
		syncScale(panzoomEl.getScale());
	}

	function syncScale(scale: number) {
		context.setScale(scale);
		if (scale > 1) {
			context.incrementUpdateOnZoomCounter();
		}
	}
	
	function onwheel(e: WheelEvent) {
		e.preventDefault();
		const action = wheelAction({
			ctrlKey: e.ctrlKey,
			deltaMode: e.deltaMode,
			deltaX: e.deltaX,
			deltaY: e.deltaY,
			wheelDeltaY: wheelDeltaYOf(e),
		});
		if (action === "pan") {
			const panzoomEl = getPanzoom();
			const pan = panzoomEl.getPan();
			const delta = panDeltaFromWheel(
				e.deltaX,
				e.deltaY,
				panzoomEl.getScale(),
				context.plugin.settings.reversePan === true,
			);
			panzoomEl.pan(pan.x + delta.x, pan.y + delta.y);
			e.stopPropagation();
			return;
		}
		const sensitivity = action === "zoom-touchpad"
			? context.plugin.settings.zoomSensitivityTouchpad
			: context.plugin.settings.zoomSensitivityMouse;
		const base = action === "zoom-touchpad" ? 0.1 : 0.5;
		const scaleConstant = base * (parseNumber(sensitivity) ?? 100) / 100;

		getPanzoom().zoomWithWheel(e, {step: scaleConstant});
		syncScale(getPanzoom().getScale());
		e.stopPropagation();
	}
	
	function onpointerdown(e: PointerEvent) {
		// prevent auto-scroll
		e.preventDefault();
		draggingManager.onPointerDown(e);
		panstart = getPanzoom().getPan();
		e.stopPropagation();
	}
	
	function onpointermove(e: PointerEvent) {
		if (context.draggedTaskId != NoTaskId) {
			context.taskDraggingManager.onPointerMove(e);
			if (context.taskDraggingManager.isDragging) {
				context.updateTaskPositions(true);
			}
		} else {
			draggingManager.onPointerMove(e);
			if (draggingManager.isDragging) {
				// prevent auto-scroll
				e.preventDefault();
				// Capture the pointer so move events continue even if 
				// the mouse leaves the element during a fast drag
				(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
				const scale = getPanzoom().getScale();
				getPanzoom().pan(
					panstart.x + draggingManager.deltaX/scale,
					panstart.y + draggingManager.deltaY/scale
				);
			}
		}
		e.stopPropagation();
	}
	
	function onpointerup(e: PointerEvent) {
		console.debug('handlePointerUp', e.pointerId, e.button);
		if (draggingManager.isDragging) {
			// Release the pointer capture
			(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
		} else if (e.button as MouseDown == MouseDown.LEFT) {
			console.debug(`Window clicked + ${context.serializeForDebugging()}`);
			console.debug('selectedTaskId ' + context.selectedTaskId);
			context.pressedButtonCode = -1;
			context.setSelectedTaskId(-1);
			context.cancelReparenting();
			context.chosenBlockerId = NoTaskId;
			context.chosenBlockedId = NoTaskId;
			viewportEl!.focus();
			e.stopPropagation();
		}
		draggingManager.onPointerUp();
		context.finishTaskDragging(e, true);
	}
	
	function getPanzoom() {
		if (panzoom) {
			return panzoom;
		} else {
			throw new Error('No panzoom element');
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="viewport"
	class:is-panning={draggingManager.mouseDown === MouseDown.MIDDLE}
	class:unselect={context.chosenBlockerId !== NoTaskId || context.chosenBlockedId !== NoTaskId}
	role="application"
	bind:this={viewportEl}
	tabindex="-1"
	{onwheel}
	{onpointerdown}
	{onpointermove}
	{onpointerup}
	onkeydown={handleKey}
>
	<div
		class="scene"
		bind:this={sceneEl}
	>
		<svg class="svg-layer" overflow="visible">
			<defs>
				<marker id="arrow" markerWidth="5" markerHeight="10" refX="3" refY="3" orient="auto" markerUnits="strokeWidth">
					<path d="M-1,0 L-1,6 L4.5,3 z" fill="context-stroke" />
				</marker>
			</defs>
			<g class="svg-group">
			{#key context.versionedData.getConnectionsVersion()}
				{#each (context.versionedData.getTasks()
						.filter(t => !context.isTaskHidden(t.taskId))
						.filter(t => t.taskId !== RootTaskId)
						.filter(t => !context.versionedData.isBranchHidden(t.taskId))
				) as task (task.taskId)}
					<Connection
						startTaskId={task.parentId}
						endTaskId={task.taskId}
						{context}
						isBlockerConnection={false}
					/>
				{/each}
			{/key}
			</g>
		</svg>
		
		<div
			class="task-layer"
			role="presentation"
		>
			{#key context.versionedData.getViewUpdateCounter()}
				{#each context.versionedData.getTasks().filter(t => !context.isTaskHidden(t.taskId)) as task (task.taskId)}
					<Task taskId={task.taskId} {context} coords={context.getCurrentTaskPosition(task.taskId)}/>
				{/each}
			{/key}
		</div>
		
		<svg class="svg-layer" overflow="visible">
			<defs>
				<marker id="arrow" markerWidth="5" markerHeight="10" refX="3" refY="3" orient="auto" markerUnits="strokeWidth">
					<path d="M-1,0 L-1,6 L4.5,3 z" fill="context-stroke" />
				</marker>
			</defs>
			<g class="svg-group">
				{#if context.chosenBlockerId !== NoTaskId || context.chosenBlockedId !== NoTaskId || context.hoveredBlockerId !== NoTaskId || context.hoveredBlockedId !== NoTaskId}
					{#each (context.versionedData.getBlockerPairs().filter(
						p => {
							if (context.chosenBlockerId === NoTaskId && context.chosenBlockedId === NoTaskId) {
								return p.blocker === context.hoveredBlockerId || p.blocked === context.hoveredBlockedId;
							} else {
								return p.blocker === context.chosenBlockerId || p.blocked === context.chosenBlockedId;
							}
						}
					).filter(
						p => {
							const blockedT = context.versionedData.getTask(p.blocked);
							const blockerT = context.versionedData.getTask(p.blocker);
							return blockedT.status !== StatusCode.DONE && blockerT.status !== StatusCode.DONE && !blockerT.deleted && !blockedT.deleted;
						}
					)) as pair (pair.blocker + '-' + pair.blocked)}
						<Connection
							startTaskId={pair.blocker}
							endTaskId={pair.blocked}
							{context}
							isBlockerConnection={true}
						/>
					{/each}
				{/if}
			</g>
		</svg>
		
		{#if context.selectedTaskId !== -1}
			{#key context.selectedTaskId}
				<Toolbar context={context} taskId={context.selectedTaskId}/>
			{/key}
		{/if}
	</div>
</div>
<SettingsPanel {context}/>

<style>
	:global(.taskmap-view-container) {
		padding: 0 !important;
	}
	.viewport {
		width: 100%;
		height: 100%;
		overflow: hidden;
		position: relative;
		background: var(--tm-canvas-bg);
		touch-action: none; /* Prevents mobile browser interference */
	}
	.viewport.unselect {
		background: var(--tm-canvas-bg-unselect);
	}
	.viewport.is-panning {
		cursor: grabbing !important;
	}
	.viewport:not(.is-panning) {
		cursor: default;
	}
	.scene {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		/* Do NOT use flex centering here; it breaks coordinate math */
		transform-origin: 0 0;
	}
	.svg-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.svg-group {
		display: flex;
		transform-style: preserve-3d;
		position: absolute;
		align-items: center;
		justify-content: center;
	}
	.task-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		/*transform-origin: 0;*/
		/*align-items: center;*/
		/*justify-content: center;*/
		/*background-color: #1C1C1C;*/
		/* The 0.1deg rotation is invisible but forces high-res redraws */
		/*perspective: 1000px;*/
		/*transform: scale(var(--scale)) rotateX(0.1deg);*/
		will-change: transform;

		/* Prevents the browser from creating a low-res snapshot */
		/*backface-visibility: visible;*/

		/* Forces the browser to keep the vector data sharp */
		/*transform-style: preserve-3d;*/

		/* Ensure no blur filters are accidentally applied */
		/*filter: blur(0);*/
	}
	/* Ensure Tasks themselves have pointer-events: auto */
	:global(.task-layer > *) {
		pointer-events: auto;
	}
	/* Hide Obsidian popovers and tooltips when the 'is-dragging' class is present */
	:global(
		body.is-dragging-task .hover-popover,
		body.is-dragging-task .tooltip
	) {
		display: none !important;
		pointer-events: none !important;
	}
</style>
