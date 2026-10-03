import {
	PluginSettingTab,
	App,
	Setting,
	TFolder,
	type SettingControl,
	type SettingDefinitionControl,
} from "obsidian";
import type TaskmapPlugin from "./main";
import { FolderSuggest } from "./helpers/FolderSuggest";
import {
	DEFAULT_SETTINGS,
	isSettingKey,
	isThemeChoice,
	type TaskmapSettings,
} from "./TaskmapSettings";

type SettingKey = keyof TaskmapSettings;

/** Control types display() can render on Obsidian versions older than 1.13. */
type TaskmapControl = Extract<
	SettingControl<SettingKey>,
	{ type: "dropdown" | "text" | "folder" }
>;

type TaskmapSettingDefinition = SettingDefinitionControl<SettingKey> & {
	control: TaskmapControl;
};

export class TaskmapSettingTab extends PluginSettingTab {
	plugin: TaskmapPlugin;

	constructor(app: App, plugin: TaskmapPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Obsidian 1.13+ uses this for the settings tab and for settings search.
	 * Older versions ignore it and call display() instead.
	 */
	getSettingDefinitions(): TaskmapSettingDefinition[] {
		return [
			{
				name: "Theme",
				desc: "Obsidian follows the active theme. Light and dark use the plugin's own colors.",
				control: {
					type: "dropdown",
					key: "theme",
					options: {
						obsidian: "Obsidian",
						light: "Light",
						dark: "Dark",
					},
				},
			},
			{
				name: "Zoom sensitivity (touchpad)",
				desc: "As a percentage",
				control: {
					type: "text",
					key: "zoomSensitivityTouchpad",
					placeholder: "100",
				},
			},
			{
				name: "Zoom sensitivity (mouse)",
				desc: "As a percentage",
				control: {
					type: "text",
					key: "zoomSensitivityMouse",
					placeholder: "100",
				},
			},
			{
				name: "Note folder",
				desc: "Notes created from tasks will be placed in this folder. If blank, they will be placed in the default location for this vault.",
				control: {
					type: "folder",
					key: "newNoteFolder",
					validate: (value: string) => {
						if (
							value === "" ||
							this.app.vault.getAbstractFileByPath(value) instanceof
								TFolder
						) {
							return;
						}
						return "Choose an existing folder.";
					},
				},
			},
		];
	}

	/** Saves through the plugin so a theme change updates open taskmaps. */
	async setControlValue(key: string, value: unknown): Promise<void> {
		if (
			!isSettingKey(key) ||
			typeof value !== typeof DEFAULT_SETTINGS[key]
		) {
			return;
		}
		if (key === "theme" && !isThemeChoice(value)) {
			return;
		}
		Object.assign(this.plugin.settings, { [key]: value });
		await this.plugin.saveSettings();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		for (const item of this.getSettingDefinitions()) {
			const setting = new Setting(containerEl).setName(item.name);
			if (item.desc) {
				setting.setDesc(item.desc);
			}
			this.renderControl(setting, item.control);
		}
	}

	/**
	 * Renders a control for Obsidian versions older than 1.13. Values are read
	 * from plugin.settings directly because getControlValue() does not exist there.
	 */
	private renderControl(setting: Setting, control: TaskmapControl) {
		const value = this.plugin.settings[control.key];
		const commit = async (next: string) => {
			if (await control.validate?.(next)) {
				return;
			}
			await this.setControlValue(control.key, next);
		};

		switch (control.type) {
			case "dropdown":
				setting.addDropdown((dropdown) =>
					dropdown
						.addOptions(control.options)
						.setValue(value)
						.onChange(commit),
				);
				break;
			case "text":
				setting.addText((text) =>
					text
						.setPlaceholder(control.placeholder ?? "")
						.setValue(value)
						.onChange(commit),
				);
				break;
			case "folder":
				setting.addText((text) => {
					new FolderSuggest(this.app, text.inputEl);
					text.setPlaceholder(control.placeholder ?? "")
						.setValue(value)
						.onChange(commit);
				});
				break;
		}
	}
}
