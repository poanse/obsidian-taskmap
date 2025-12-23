<script lang="ts">
	import { onMount, tick } from "svelte";
	import {MarkdownRenderer, Component, App} from "obsidian";
	import {LinkSuggest} from "../LinkSuggest";
	import type {Context} from "../Context.svelte.js";

	// PROPS
	let {
		taskId,
		context,
		app,
		content,
		sourcePath,
		onSave
	}: {
		taskId: number,
		context: Context,
		app: App;
		content: string;
		sourcePath: string;
		onSave: (newContent: string) => void
	} = $props();

	// STATE

	let isSelected = $derived(context.isSelected(taskId));
	let isEditing = $state(false);
	let suggest: LinkSuggest | null = null;
	let textPreviewEl: HTMLElement;
	let textEditEl: HTMLTextAreaElement;
	let component = new Component(); // Required by Obsidian to manage render lifecycle

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
		if (!isEditing && textPreviewEl) {
			renderMarkdown();
		}
	});
	function handlePreviewClick(e: MouseEvent) {
		console.log('task text clicked');
		const target = e.target as HTMLElement;

		// Check if the clicked element (or its parent) is an internal link
		const internalLink = target.closest(".internal-link");
		if (internalLink) {
			// Prevent the default "Swap to Edit" behavior
			e.preventDefault(); // TODO: is this line needed?
			e.stopPropagation();

			const href = internalLink.getAttribute("data-href");
			if (href === null) {
				throw new Error('href is null');
			}

			// Open the link using Obsidian's API
			// Whether to open in a new tab or in current one
			const openInNewLeaf = e.ctrlKey || e.metaKey;

			app.workspace.openLinkText(href, sourcePath, openInNewLeaf);
			return;
		}

		const externalLink = target.closest("a.external-link");
		if (externalLink){
			e.stopPropagation();
			return;
		}
		
		if (context.isSelected(taskId)) {
			toggleEdit();
			e.stopPropagation();
		}
	}

	function handlePreviewMouseOver(e: MouseEvent) {
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
				sourcePath: sourcePath
			});
		}
	}
	async function renderMarkdown() {
		textPreviewEl.empty(); // Clear previous render
		await MarkdownRenderer.render(
			app,
			content,
			textPreviewEl,
			sourcePath,
			component
		);
	}

	async function toggleEdit() {
		isEditing = true;
		// Wait for DOM update so textarea exists, then focus
		await tick();
		if (textEditEl) {
			textEditEl.focus();
			suggest = new LinkSuggest(app, textEditEl);
		}
	}

	export function handleBlur() {
		isEditing = false;
		onSave(content); // Persist changes
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
			maxlength="28"
			bind:this={textEditEl}
			bind:value={content}
			onblur={handleBlur}
			onkeydown={handleKeydown}
		></textarea>
	{:else}
		<div
			class="text-preview tasktext"
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
		font-family: "Segoe UI";
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
