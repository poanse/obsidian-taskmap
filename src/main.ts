import { addIcon, Plugin } from "obsidian";
import { TASKMAP_VIEW_TYPE, TaskmapView } from "./TaskmapView";
import { DEFAULT_SETTINGS, type TaskmapSettings } from "./TaskmapSettings";
import { TaskmapSettingTab } from "./TaskmapSettingTab";
import { FileWatcherWithCache } from "./FileWatcherWithCache";
import { LOGO_CONTENT, LOGO_NAME } from "./Constants";
import { DEFAULT_DATA } from "./SaveManager";

export const FILE_EXTENSION = "taskmap";

export default class TaskmapPlugin extends Plugin {
	settings: TaskmapSettings;
	private readonly filewatcher = new FileWatcherWithCache();

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

		this.filewatcher.initFromVault(this.app);
		this.filewatcher.registerTaskmapVaultHooks(this);
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
		) as TaskmapSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
