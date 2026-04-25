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
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
