import { Modal, Platform } from "obsidian";
import type { Context } from "./Context.svelte.js";
import {
	shortcutDescriptions,
	type ShortcutDescription,
} from "./shortcuts";
import "./shortcuts.css";

export class ShortcutsModal extends Modal {
	constructor(context: Context) {
		super(context.app);
	}

	onOpen() {
		this.setTitle("Keyboard shortcuts");
		const { contentEl } = this;
		const list = contentEl.createDiv({ cls: "taskmap-shortcuts-list" });
		for (const shortcut of shortcutDescriptions(Platform.isMacOS)) {
			appendShortcut(list, shortcut);
		}
		if (Platform.isMacOS) {
			contentEl.createDiv({
				cls: "taskmap-shortcuts-note",
				text: "Ctrl works in place of Cmd.",
			});
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}

function appendShortcut(parent: HTMLElement, shortcut: ShortcutDescription) {
	const row = parent.createDiv({ cls: "taskmap-shortcut" });
	row.createDiv({ cls: "taskmap-shortcut-action", text: shortcut.action });

	const keys = row.createDiv({ cls: "taskmap-shortcut-keys" });
	shortcut.combos.forEach((combo, index) => {
		if (index > 0) {
			keys.createSpan({ cls: "taskmap-shortcut-or", text: "or" });
		}
		const comboEl = keys.createSpan({ cls: "taskmap-shortcut-combo" });
		for (const key of combo) {
			comboEl.createSpan({ cls: "taskmap-shortcut-key", text: key });
		}
	});
}
