import { PluginSettingTab, App, Setting } from "obsidian";
import type TaskmapPlugin from "./main";

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
			.setName("Zoom sensitivity (touchpad)")
			.setDesc("In percents")
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
			.setDesc("In percents")
			.addText((text) =>
				text
					.setPlaceholder("100")
					.setValue(this.plugin.settings.zoomSensitivityMouse)
					.onChange(async (value) => {
						this.plugin.settings.zoomSensitivityMouse = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
