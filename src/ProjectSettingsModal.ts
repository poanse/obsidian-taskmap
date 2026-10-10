import { Modal, Setting, TFolder } from "obsidian";
import type { Context } from "./Context.svelte.js";
import { FolderSuggest } from "./helpers/FolderSuggest";

export class ProjectSettingsModal extends Modal {
	constructor(private readonly context: Context) {
		super(context.app);
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "Project settings" });

		new Setting(contentEl)
			.setName("Note folder")
			.setDesc(
				"Notes created from tasks will be placed in this folder. If blank, they will be placed in the default location for this vault.",
			)
			.addText((text) => {
				new FolderSuggest(this.app, text.inputEl);
				text.setPlaceholder("")
					.setValue(this.context.versionedData.getFolderPath() ?? "")
					.onChange((value) => {
						if (
							value === "" ||
							this.app.vault.getAbstractFileByPath(
								value,
							) instanceof TFolder
						) {
							this.context.versionedData.setFolderPath(value);
							this.context.save();
						}
					});
			});

		// Modal.open focuses the first control after onOpen returns. That
		// focuses the note folder field and opens its suggestions.
		this.suppressInitialFocus();
	}

	/** Leave the note folder field inactive until its text input is clicked. */
	private suppressInitialFocus() {
		const controls = Array.from(
			this.contentEl.querySelectorAll<HTMLElement>(
				"input, select, textarea",
			),
		);
		const previous = controls.map((control) =>
			control.getAttribute("tabindex"),
		);
		for (const control of controls) {
			control.tabIndex = -1;
		}
		const view = this.contentEl.ownerDocument.defaultView ?? window;
		view.setTimeout(() => {
			controls.forEach((control, index) => {
				const prior = previous[index];
				if (prior === null) {
					control.removeAttribute("tabindex");
				} else {
					control.setAttribute("tabindex", prior);
				}
			});
		}, 0);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
