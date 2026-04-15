<script lang="ts">
	import type {Context} from "../Context.svelte.js";
	import {SettingsIconCode} from "../types";
	import SettingsButton from "./SettingsButton.svelte";
	
	let { context }: { context: Context } = $props();
</script>

{#if !context.taskDraggingManager.isDragging}
	<div
		class="settings-panel"
		role="toolbar"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		onpointerdown={(e) => e.stopPropagation()}
		onpointerup={(e) => e.stopPropagation()}
	>
		<SettingsButton iconCode={SettingsIconCode.SETTINGS_MENU} {context}/>
		<div
			class="undo-redo-container"
		>
			<SettingsButton iconCode={SettingsIconCode.SETTINGS_UNDO} {context}/>
			<SettingsButton iconCode={SettingsIconCode.SETTINGS_REDO} {context}/>
		</div>
	</div>
{/if}

<style>
	/* Figma: x 0, y 2, blur 4, spread 0, color #000000 (use the same opacity as in Figma) */
	.settings-panel {
		box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 1);
		gap: 72px;
		padding: 4px 4px;
		background: #1E1E1E;
		border-radius: 4px;
		border-color: #1E1E1E;
		border-style: solid;
		border-width: 2px;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		position: absolute;
		will-change: transform,scale,translate;
		width: 148px;
		height: 28px;
		bottom: 15px;
		left: 15px;
		/*transform: translate(-50%, -50%);*/
	}
	.undo-redo-container {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
	}
</style>
