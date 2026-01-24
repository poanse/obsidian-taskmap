<script lang="ts">
	import {onMount, tick} from "svelte";
	import {App, Component, MarkdownRenderer} from "obsidian";
	import {LinkSuggest} from "../LinkSuggest";
	import type {Context} from "../Context.svelte.js";
	import {getFromRelativePath, isLink} from "../LinkManager";
	import type {TaskData} from "../types";
	import {NoTaskId} from "../NodePositionsCalculator";

	// PROPS
	let {
		taskId,
		isUnselected,
		context,
		app,
	}: {
		taskId: number,
		isUnselected: boolean,
		context: Context,
		app: App;
	} = $props();

	// STATE
	let taskData = context.projectData.getTask(taskId);
	let isSelected = $derived(context.isSelected(taskId));
	let isEditing = $derived(context.editingTaskId === taskId);
	let suggest: LinkSuggest | null = null;
	let textPreviewEl: HTMLElement;
	let textEditEl: HTMLTextAreaElement;
	let component = new Component(); // Required by Obsidian to manage render lifecycle
	let isDragging = $derived(context.taskDraggingManager.isDragging);
	onMount(() => {
		if(!isEditing && textPreviewEl) {
			renderMarkdown();
		}
		return () => {
			// Clean up Obsidian component references to prevent memory leaks
			component.unload();
		};
	});
	$effect(() => {
		if (textPreviewEl) {
			renderMarkdown();
		}
		if (context.taskDraggingManager.isDragging) {
			document.body.classList.add('is-dragging-task');
		} else {
			document.body.classList.remove('is-dragging-task');
		}

		// Cleanup function for when component is unmounted
		return () => document.body.classList.remove('is-dragging-task');
	});
	
	function handlePreviewClick(e: PointerEvent) {
		if (isDragging) {
			return;
		}
		context.finishTaskDragging(e);
		console.log('task text clicked');
		if (context.isSelected(taskId)) {
			e.stopPropagation();
			toggleEdit();
			return;
		}
		const target = e.target as HTMLElement;
		const link = target.closest(".internal-link");
		if (link && taskData.path) {
			const file = getFromRelativePath(context.app, taskData.path);
			if (file) {
				e.preventDefault(); // TODO: is this line needed?
				e.stopPropagation();
				context.openOrFocusNote(file);
			}
		} 
	}

	function handlePreviewMouseOver(e: MouseEvent) {
		if (isDragging) {
			return;
		}
		const target = e.target as HTMLElement;
		const link = target.closest(".internal-link");

		if (link) {
			// Trigger the native hover preview
			app.workspace.trigger("hover-link", {
				event: e,
				source: "preview",
				hoverParent: textPreviewEl,
				targetEl: link,
				linktext: link.getAttribute("data-href"),
				sourcePath: ""
			});
		}
	}
	
	async function renderMarkdown() {
		textPreviewEl.empty(); // Clear previous render
		const content = taskData.name;
		await MarkdownRenderer.render(
			app,
			content,
			textPreviewEl,
			"",
			component,
		);
		// After rendering, find all links and disable their native dragging
		const links = textPreviewEl.querySelectorAll('a, .internal-link, .external-link');
		links.forEach(link => {
			link.setAttribute('draggable', 'false');
			// Optional: prevent dragging on the specific link level too
			(link as HTMLElement).ondragstart = (e) => e.preventDefault();
		});
	}

	async function toggleEdit() {
		context.editingTaskId = taskId;
		// Wait for DOM update so textarea exists, then focus
		await tick();
		if (textEditEl) {
			textEditEl.focus();
			suggest = new LinkSuggest(app, textEditEl);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			textEditEl.blur(); // Triggers handleBlur
		} else if (e.key === "Tab" && suggest !== null) {
			// another hack to select suggest on tab
			e.preventDefault();
			textEditEl.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
		}
	}

	async function handleBlur() {
		// TODO: throws error because text preview doesn't exit when blur on textedit happens
		context.editingTaskId = NoTaskId;
		handleInput();
		await tick(); // Wait for DOM to render preview element
		await renderMarkdown();
	}
	
	function handleInput() {
		if (textEditEl === null) {
			return;
		}
		taskData.name = textEditEl.value;
		if (isLink(taskData.name)) {
			const file = context.linkManager.getFromLink(taskData.name);
			if (file === null) {
				throw new Error(`Link [${taskData.name}] points to a nonexistent file`);
			}
			taskData.path = file.path;
		} else {
			taskData.path = undefined;
		}
		context.save();
	}
</script>


<div
	class="task-text-container"
	class:selected={isSelected}
	class:not-selected={!isSelected}
	onpointerup={handlePreviewClick}
>
	{#if isEditing}
		<textarea
			class="text-edit tasktext"
			class:unselect={isUnselected}
			maxlength="28"
			bind:this={textEditEl}
			onblur={handleBlur}
			onkeydown={handleKeydown}
			oninput={handleInput}
		>{taskData.name}</textarea>
	{:else}
		<div
			class="text-preview tasktext"
			class:unselect={isUnselected}
			tabindex="0"
			bind:this={textPreviewEl}
			onpointerup={handlePreviewClick}
			onmouseover={handlePreviewMouseOver}
		>
		</div>
	{/if}
</div>
<!--onkeydown={(e) => e.key === 'Enter' && toggleEdit()}-->

<style>
	.task-text-container {
		width: 160px;
		height: 60px;
		display: flex;
		justify-content: center;
		align-items: center;
		position: absolute;
		padding: 0;
		gap: 0;
	}
	.tasktext {
		margin: 0;
		padding: 0;
		gap: 0;
		border: none;
		/*transform: translate3d(0,20px,0);*/
		width: 160px;
		/*height: 60px;*/
		/*width: 100%;*/
		/*height: 100%;*/
		background: transparent;
		resize: none;
		font-size: 20px;
		font-family: var(--font-text);
		line-height: 1.5;
		/*border: 4px solid #707070;*/
		/*border-radius: 22px;*/
		outline: none;
		box-shadow: none;
		/*padding: 35px;*/
		position: absolute;
		text-align: center;
		justify-content: center;
		align-items: center;
		color: white;
		overflow: hidden;
	}
	.tasktext.unselect {
		color: color-mix(in srgb, #7E7E7E 100%, #000000 50%);
	}
	.task-text-container.selected .tasktext:hover {
		cursor: text;
	}
	.task-text-container.not-selected .tasktext:hover {
		/*cursor: default;*/
	}

	.text-edit {
		display: flex;
		align-items: center;
		field-sizing: content;
	}
	.text-edit:hover {
		background-color: transparent;
	}
	.text-edit:focus {
		border: none;
		outline: none;
		box-shadow: none;
	}
	.text-preview {
		overflow: visible;
		white-space: pre-wrap;
		word-wrap: break-word;
		p {
			top: 0;
			width: 160px;
			height: 60px;
			line-height: 1.5;
			margin: 0;
			padding: 0;
			gap: 0;
			border: none;
			text-align: center;
			justify-content: center;
			align-items: center;
			/*white-space: pre-wrap;*/
			/*word-wrap: break-word;*/
			overflow: visible;
		}
	}
</style>
