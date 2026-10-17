export interface ShortcutDescription {
	action: string;
	/** Each inner list is one way to run the action. */
	combos: string[][];
}

/**
 * Shortcuts for the help window. macOS lists Cmd; the window notes that Ctrl also works.
 * Delete on macOS is the forward-delete key, reached with Fn.
 */
export function shortcutDescriptions(isMac: boolean): ShortcutDescription[] {
	const mod = isMac ? "Cmd" : "Ctrl";
	return [
		{ action: "Zoom in", combos: [[mod, "Up arrow"]] },
		{ action: "Zoom out", combos: [[mod, "Down arrow"]] },
		{ action: "Undo", combos: [[mod, "Z"]] },
		{
			action: "Redo",
			combos: [
				[mod, "R"],
				[mod, "Shift", "Z"],
			],
		},
		{
			action: "Remove selected task",
			combos: [isMac ? ["Fn", "Delete"] : ["Delete"]],
		},
		{
			action: "Clear selection or cancel toolbar action",
			combos: [["Escape"]],
		},
		{
			action: "Apply task name while renaming",
			combos: [["Escape"]],
		},
		{
			action: "Add line break while renaming",
			combos: [["Enter"]],
		},
		{
			action: "Choose highlighted suggestion",
			combos: [["Tab"]],
		},
	];
}
