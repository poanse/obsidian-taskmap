<script lang="ts">
	import type {UIState} from "../pixi/GlobalState.svelte.js";
	import {IconCode, StatusCode} from "../types";
	import IconService from "../pixi/IconService";

	let {
		iconCode,
		uiState,
	}: {
		iconCode: IconCode,
		uiState: UIState,
	} = $props();

	let isPressedDown = $state(false);
	let isPressed=$derived(uiState.pressedButtonIndex == iconCode);
	
	const stateful = iconCode != IconCode.FOCUS;
	
	function handleMouseDown(event: MouseEvent) {
		isPressedDown = true;
		event.stopPropagation();
	}
	
	function onBlur() {
		isPressedDown = false;
	}
	
	function handleMouseUp(event: MouseEvent) {
		if (!isPressedDown) {
			return;
		}
		isPressedDown = false;
		if (isPressed) {
			isPressed = false;
			uiState.pressedButtonIndex = -1;
		} else if (stateful) {
			isPressed = true;
			uiState.pressedButtonIndex = iconCode;
		} else {
			uiState.pressedButtonIndex = -1;
		}
		let newStatus: StatusCode | null = null;
		if (iconCode == IconCode.STATUS_READY) {
			newStatus = StatusCode.READY;
		} else if (iconCode == IconCode.STATUS_DRAFT) {
			newStatus = StatusCode.DRAFT;
		} else if (iconCode == IconCode.STATUS_DONE) {
			newStatus = StatusCode.DONE;
		} else if (iconCode == IconCode.STATUS_IN_PROGRESS) {
			newStatus = StatusCode.IN_PROGRESS;
		}
		if (newStatus != null) {
			uiState.changeStatus(newStatus);
		}
		if (iconCode == IconCode.TRASH_SINGLE || iconCode == IconCode.TRASH_MULTIPLE) {
			uiState.removeTask(uiState.selectedTaskId);
		}
		event.stopPropagation();
	}
	
	function _getIcon() {
		if (iconCode == IconCode.STATUS) {
			return IconService.getStatusIcon(uiState.toolbarStatus);
		}
		return IconService.getIcon(iconCode);
	}
</script>

<div class="button"
	 class:no-pan={true}
	 class:is-pressed-up={isPressed}
	 class:is-pressed-down={isPressedDown}
	 onmousedown={handleMouseDown}
	 onmouseup={handleMouseUp}
	 onmouseleave={onBlur}
	 onclick={(event: MouseEvent) => {
		 event.stopPropagation();
		 if (IconCode.FOCUS === iconCode) {
			 uiState.setSelectedTaskId(-1);
		 }
	 }}
	 role="presentation"
	 tabindex="-1"
>
	{@html _getIcon()}
</div>
