import { PluginSettingTab, App, Setting, TFolder } from "obsidian";
import type TaskmapPlugin from "./main";
import { FolderSuggest } from "./helpers/FolderSuggest";
import { isThemeChoice } from "./TaskmapSettings";

export class TaskmapSettingTab extends PluginSettingTab {
	plugin: TaskmapPlugin;

	constructor(app: App, plugin: TaskmapPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Theme")
			.setDesc(
				"Obsidian follows the active theme. Light and dark use the plugin's own colors.",
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("obsidian", "Obsidian")
					.addOption("light", "Light")
					.addOption("dark", "Dark")
					.setValue(this.plugin.settings.theme)
					.onChange(async (value) => {
						if (!isThemeChoice(value)) {
							return;
						}
						this.plugin.settings.theme = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Zoom sensitivity (touchpad)")
			.setDesc("As a percentage")
			.addText((text) =>
				text
					.setPlaceholder("100")
					.setValue(this.plugin.settings.zoomSensitivityTouchpad)
					.onChange(async (value) => {
						this.plugin.settings.zoomSensitivityTouchpad = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Zoom sensitivity (mouse)")
			.setDesc("As a percentage")
			.addText((text) =>
				text
					.setPlaceholder("100")
					.setValue(this.plugin.settings.zoomSensitivityMouse)
					.onChange(async (value) => {
						this.plugin.settings.zoomSensitivityMouse = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Note folder")
			.setDesc(
				"Notes created from tasks will be placed in this folder. If blank, they will be placed in the default location for this vault.",
			)
			.addText((text) => {
				new FolderSuggest(this.app, text.inputEl);
				text.setPlaceholder("")
					.setValue(this.plugin.settings.newNoteFolder)
					.onChange(async (value) => {
						if (
							value === "" ||
							this.plugin.app.vault.getAbstractFileByPath(
								value,
							) instanceof TFolder
						) {
							this.plugin.settings.newNoteFolder = value;
							await this.plugin.saveSettings();
						}
					});
			});
	}
}
