import { addIcon, normalizePath, Plugin, TFolder } from "obsidian";
import { TASKMAP_VIEW_TYPE, TaskmapView } from "./TaskmapView";
import {
	DEFAULT_SETTINGS,
	isThemeChoice,
	type TaskmapSettings,
} from "./TaskmapSettings";
import { TaskmapSettingTab } from "./TaskmapSettingTab";
import { FileWatcherWithCache } from "./FileWatcherWithCache";
import { LOGO_CONTENT, LOGO_NAME } from "./Constants";
import { DEFAULT_DATA } from "./SaveManager";
import "./theme.css";

export const FILE_EXTENSION = "taskmap";

export default class TaskmapPlugin extends Plugin {
	declare settings: TaskmapSettings;
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
		this.addCommand({
			id: "create-map",
			name: "Create new map",
			callback: () => void this.createAndOpenDrawing(),
		});
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!(file instanceof TFolder)) {
					return;
				}
				menu.addItem((item) =>
					item
						.setSection("action-primary")
						.setTitle("New taskmap")
						.setIcon(LOGO_NAME)
						.onClick(() => void this.createAndOpenDrawing(file.path)),
				);
			}),
		);

		this.addSettingTab(new TaskmapSettingTab(this.app, this));

		this.filewatcher.initFromVault(this.app);
		this.filewatcher.registerTaskmapVaultHooks(this);
	}

	public async createAndOpenDrawing(folderPath = ""): Promise<string> {
		const fileName = `Example ${window.moment().format("YY-MM-DD hh.mm.ss")}.${FILE_EXTENSION}`;
		const file = await this.app.vault.create(
			normalizePath(`${folderPath}/${fileName}`),
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
		if (!isThemeChoice(this.settings.theme)) {
			this.settings.theme = DEFAULT_SETTINGS.theme;
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.applyThemeToOpenViews();
	}

	applyThemeToOpenViews() {
		this.app.workspace
			.getLeavesOfType(TASKMAP_VIEW_TYPE)
			.forEach((leaf) => {
				if (leaf.view instanceof TaskmapView) {
					leaf.view.applyTheme();
				}
			});
	}
}
