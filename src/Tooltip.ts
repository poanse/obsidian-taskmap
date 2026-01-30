import { setTooltip } from "obsidian";
import { IconCode } from "./types";

/**
 * Svelte Action to add an Obsidian-native tooltip to an element.
 *
 * @param node - The DOM element to attach the tooltip to.
 * @param text - The text to display in the tooltip.
 */
export function tooltip(node: HTMLElement, text: string) {
	setTooltip(node, text, {
		placement: "top",
	});

	return {
		update(newText: string) {
			// Update the tooltip if the text prop changes
			setTooltip(node, newText, {
				placement: "top",
			});
		},
	};
}

export function getTooltipText(code: IconCode) {
	switch (code) {
		case IconCode.FOCUS:
			return "Focus";
		case IconCode.CREATE_LINKED_NOTE:
			return "Add link";
		case IconCode.REPARENT:
			return "Reparent";
		case IconCode.KEY:
			return "Add blocker task";
		case IconCode.LOCK:
			return "Block another task";
		case IconCode.REMOVE:
			return "Remove";
		case IconCode.REMOVE_SINGLE:
			return "Remove single task";
		case IconCode.REMOVE_MULTIPLE:
			return "Remove task branch";
		case IconCode.STATUS:
			return "Status";
		case IconCode.STATUS_DRAFT:
			return "Draft";
		case IconCode.STATUS_READY:
			return "Ready";
		case IconCode.STATUS_IN_PROGRESS:
			return "In progress";
		case IconCode.STATUS_DONE:
			return "Done";
		default:
			return "placeholder tooltip";
	}
}
