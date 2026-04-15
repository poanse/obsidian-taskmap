import {
	addIcon,
	Plugin,
} from "obsidian";
import { TASKMAP_VIEW_TYPE, TaskmapView } from "./TaskmapView";
import {
	DEFAULT_SETTINGS,
	type TaskmapPluginSettings,
} from "./TaskmapPluginSettings";
import { TaskmapSettingTab } from "./TaskmapSettingTab";
import { DEFAULT_DATA} from "./data/ProjectData.svelte";
import { LOGO_CONTENT, LOGO_NAME } from "./IconService";
import { getOnDelete, getOnRename} from "./FileWatcher";

export const FILE_EXTENSION = "taskmap";

export default class TaskmapPlugin extends Plugin {
	settings: TaskmapPluginSettings;

	async onload() {
		await this.loadSettings();
		this.registerView(
			TASKMAP_VIEW_TYPE,
			(leaf) => new TaskmapView(leaf, this),
		);
		this.registerExtensions([FILE_EXTENSION], TASKMAP_VIEW_TYPE);

		addIcon(LOGO_NAME, LOGO_CONTENT);
		this.addRibbonIcon(LOGO_NAME, "New taskmap", (_evt: MouseEvent) => {
			void this.createAndOpenDrawing();
		});

		this.addSettingTab(new TaskmapSettingTab(this.app, this));

		this.registerEvent(
			this.app.vault.on("rename",	getOnRename(this.app)),
		);
		this.registerEvent(
			this.app.vault.on("delete", getOnDelete(this.app)),
		);
	}

	public async createAndOpenDrawing(): Promise<string> {
		const file = await this.app.vault.create(
			`Example ${window.moment().format("YY-MM-DD hh.mm.ss")}.${FILE_EXTENSION}`,
			DEFAULT_DATA,
		);

		const leaf = this.app.workspace.getLeaf("tab");

		await leaf.openFile(file, { active: true });

		await leaf.setViewState({
			type: TASKMAP_VIEW_TYPE,
			state: leaf.view.getState(),
		});

		await this.app.workspace.revealLeaf(leaf);

		return file.path;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		) as TaskmapPluginSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
