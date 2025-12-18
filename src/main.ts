import { addIcon, Plugin } from "obsidian";
import { TaskmapView } from "./TaskmapView";
import { type PluginSettings, DEFAULT_SETTINGS } from "./PluginSettings";
import { TaskmapSettingTab } from "./TaskmapSettingTab";
import { DEFAULT_DATA } from "./ProjectData.svelte";
import { LOGO_CONTENT, LOGO_NAME } from "./IconService";

export const FILE_EXTENSION = "taskmap";
export const VIEW_TYPE = "taskmap-view";

export default class TaskmapPlugin extends Plugin {
	static instance: TaskmapPlugin;
	settings: PluginSettings;

	async onload() {
		TaskmapPlugin.instance = this;
		await this.loadSettings();
		this.registerView(VIEW_TYPE, (leaf) => new TaskmapView(leaf));
		this.registerExtensions([FILE_EXTENSION], VIEW_TYPE);

		// This creates an icon in the left ribbon.
		addIcon(LOGO_NAME, LOGO_CONTENT);
		this.addRibbonIcon(LOGO_NAME, "Taskmap Plugin", (_evt: MouseEvent) => {
			this.createAndOpenDrawing();
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TaskmapSettingTab(this.app, this));

		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	public static getActiveView() {
		return TaskmapPlugin.instance.app.workspace.getActiveViewOfType(
			TaskmapView,
		);
	}

	public async createAndOpenDrawing(): Promise<string> {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE);

		const file = await this.app.vault.create(
			`Example ${window.moment().format("YY-MM-DD hh.mm.ss")}.${FILE_EXTENSION}`,
			DEFAULT_DATA,
		);

		const leaf = this.app.workspace.getLeaf("tab");

		await leaf.openFile(file, { active: true });

		leaf.setViewState({
			type: VIEW_TYPE,
			state: leaf.view.getState(),
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE)[0],
		);

		return file.path;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
