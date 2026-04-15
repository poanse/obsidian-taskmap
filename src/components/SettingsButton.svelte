<script lang="ts">
	import type {Context} from "../Context.svelte.js";
	import {SettingsIconCode} from "../types";
	import {getTooltipTextSettings, tooltip} from "../Tooltip";
	import {Redo2, Settings, Undo2} from 'lucide-svelte';

	let { iconCode,	context }: { iconCode: SettingsIconCode, context: Context } = $props();

	let isPressedDown = $state(false);
	
	function onpointerdown(event: MouseEvent) {
		isPressedDown = true;
		event.preventDefault();
		event.stopPropagation();
	}
	
	function onBlur() {
		isPressedDown = false;
	}

	let isButtonDisabled = $derived(
		(iconCode == SettingsIconCode.NONE)
		|| (iconCode == SettingsIconCode.SETTINGS_MENU)
		|| (iconCode == SettingsIconCode.SETTINGS_UNDO && !context.versionedData.canUndo())
		|| (iconCode == SettingsIconCode.SETTINGS_REDO && !context.versionedData.canRedo())
	);
	
	function onpointerup(event: MouseEvent) {
		if (!isPressedDown) {
			return;
		}
		if (isButtonDisabled) {
			return;
		}
		isPressedDown = false;
		event.stopPropagation();
		
		if (iconCode == SettingsIconCode.SETTINGS_UNDO) {
			context.versionedData.undo();
		} else if (iconCode == SettingsIconCode.SETTINGS_REDO) {
			context.versionedData.redo();
		}
	}

	let classString = $derived(`
		${(isPressedDown && !isButtonDisabled) ? 'is-pressed-down ': '' }
	`);
</script>

<div class="button"
	 use:tooltip={getTooltipTextSettings(iconCode)}
	 class:disabled={isButtonDisabled}
	 class:no-pan={true}
	 class:is-pressed-down={isPressedDown}
	 {onpointerdown}
	 {onpointerup}
	 onmouseleave={onBlur}
	 onclick={(event: MouseEvent) => {
		 event.stopPropagation();
	 }}
	 role="presentation"
	 tabindex="-1"
>
	{#if iconCode === SettingsIconCode.SETTINGS_MENU}
		<Settings class={classString}/>
	{:else if iconCode === SettingsIconCode.SETTINGS_UNDO}
		<Undo2 class={classString}/>
	{:else if iconCode === SettingsIconCode.SETTINGS_REDO}
		<Redo2 class={classString}/>
	{/if}
</div>

<style>
	.button {
		width: 24px;
		height: 24px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0px;
		padding: 0px;
		/*background-color: #e0e0e0;*/
		cursor: pointer;
		border-radius: 4px;
		user-select: none;

		/*background-color: #1E1E1E;*/

		/* This handles the smooth color change for the SVG and Text */
		transition: background-color 0.2s, color 0.2s;
		
		:global(svg) {
			transition: stroke 0.2s;
			width: 14px;
			height: 14px;
			stroke: #bbb;
			fill: none;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
			will-change: transform,scale,translate;
		}
	}

	.button.disabled {
		color: color-mix(in srgb, #7E7E7E 100%, #000000 50%);
		
		:global(svg) {
			stroke: grey;			
		}
		:global(svg.done) {
			stroke: color-mix(in srgb, #30623E 100%, #000000 50%);
		}
	}
	
	.button:hover:not(.disabled){
		background-color: #343434;
		/*border-color: red;*/
		border-width: 0;
		outline: none;
	}
	
	.button.is-pressed-down:not(.disabled){
		background-color: #343434;
		color: white;
		:global(svg) {
			stroke: white;
		}
	}
</style>
