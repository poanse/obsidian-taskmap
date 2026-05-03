<script lang="ts">
	import {onMount, tick} from "svelte";
	import {Component, MarkdownRenderer, Notice} from "obsidian";
	import {LinkSuggest} from "../helpers/LinkSuggest";
	import type {Context} from "../Context.svelte.js";
	import {
		generateTextContentFromTask,
		isLink,
		linkFromFilePath,
		nameFromLink, taskNameFromFile,
		taskPathFromFile
	} from "../LinkManager";
	import {NoTaskId} from "../NodePositionsCalculator";

	let {
		taskId,
		isUnselected,
		context,
	}: {
		taskId: number,
		isUnselected: boolean,
		context: Context,
	} = $props();

	// STATE
	let taskData = $derived(context.versionedData.getTask(taskId));
	let isSelected = $derived(context.isSelected(taskId));
	let isEditing = $derived(context.editingTaskId === taskId);
	let suggest: LinkSuggest | null = null;
	let textPreviewEl = $state<HTMLElement | undefined>(undefined);
	let textEditEl = $state<HTMLTextAreaElement | undefined>(undefined);
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
		console.debug('task text clicked');
		if (context.isSelected(taskId)) {
			e.stopPropagation();
			toggleEdit();
			return;
		}
		const target = e.target as HTMLElement;
		const link = target.closest(".internal-link");
		if (link && taskData.path) {
			const file = context.app.vault.getFileByPath(taskData.path);
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

		if (link && textPreviewEl) {
			// Trigger the native hover preview
			context.app.workspace.trigger("hover-link", {
				event: e,
				source: "preview",
				hoverParent: textPreviewEl,
				targetEl: link,
				linktext: link.getAttribute("data-href"),
				sourcePath: taskData.path ?? ""
			});
		}
	}
	
	async function renderMarkdown() {
		if (!textPreviewEl) {
			return;
		}
		textPreviewEl.empty(); // Clear previous render
		const content = generateTextContentFromTask(context.app, taskData);
		await MarkdownRenderer.render(
			context.app,
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
			suggest = new LinkSuggest(context.app, textEditEl);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		const el = textEditEl;
		if (!el) {
			return;
		}
		if (e.key === "Enter") {
			e.preventDefault();
			el.blur(); // Triggers handleBlur
		} else if (e.key === "Tab" && suggest !== null) {
			// another hack to select suggest on tab
			e.preventDefault();
			el.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
		} else if (e.key == "Escape" && isEditing) {
			e.stopPropagation();
			el.blur();
		} else if (e.key == "Escape") {
			el.blur();
		} else {
			e.stopPropagation();
		}
	}

	async function handleBlur() {
		// TODO: throws error because text preview doesn't exit when blur on textedit happens
		context.editingTaskId = NoTaskId;
		handleInput();
		textEditEl?.parentElement?.parentElement?.focus();
		await tick(); // Wait for DOM to render preview element
		await renderMarkdown();
	}
	
	function handleInput() {
		if (textEditEl == null) {
			return;
		}
		let path;
		let name;
		let maybeLink = textEditEl.value;
		if (textEditEl.value == taskData.name) {
			// no changes
			return;
		}
		if (isLink(maybeLink)) {
			const file = context.linkManager.getFromLink(maybeLink);
			if (file !== null) {
				path = taskPathFromFile(file);
				name = taskNameFromFile(file);
			} else {
				new Notice(`Link ${maybeLink} points to a nonexistent file`);
				path = undefined;
				name = nameFromLink(context.app, maybeLink);
			}
		} else {
			path = undefined;
			name = maybeLink;
		}
		context.versionedData.setName(taskId, name, path);
		context.save();
	}
</script>

<div
	class="task-text-container"
	class:selected={isSelected}
	class:not-selected={!isSelected}
	role="group"
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
		>{taskData.path ? linkFromFilePath(taskData.path) : taskData.name}</textarea>
	{:else}
		<div
			class="text-preview tasktext"
			class:unselect={isUnselected}
			role="group"
			bind:this={textPreviewEl}
			onpointermove={handlePreviewMouseOver}
		>
		</div>
	{/if}
</div>

<style>
	:root, .task-text-container {
		--task-width: 180px;
		--task-height: 60px;
		--task-line-height: 1.1;
		/*--task-line-height: 1.5;*/
		--task-font-size: 20px;
	}
	.task-text-container {
		width: var(--task-width);
		height: var(--task-height);
		display: flex;
		justify-content: center;
		align-items: center;
		position: absolute;
		padding: 0;
		gap: 0;
	}
	.task-text-container.selected .tasktext:hover {
		cursor: text;
	}
	.tasktext {
		margin: 0;
		padding: 0;
		gap: 0;
		border: none;
		/*transform: translate3d(0,20px,0);*/
		width: var(--task-width);
		/*height: var(--task-height);*/
		/*width: 100%;*/
		/*height: 100%;*/
		background: transparent;
		resize: none;
		font-size: var(--task-font-size);
		font-family: var(--font-text);
		line-height: var(--task-line-height);
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

	.text-edit {
		display: flex;
		field-sizing: content;
		padding-top: 5px; /* fixes text jumping between text-edit and text-preview */
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
		:global {
			p {
				top: 0;
				width: var(--task-width);
				height: var(--task-height);
				line-height: var(--task-line-height);
				margin: 0;
				padding: 0;
				gap: 0;
				border: none;
				text-align: center;
				justify-content: center;
				align-items: center;
				overflow: visible;
			}
		}
	}
</style>
