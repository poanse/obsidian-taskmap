import {
	addIcon,
	type App,
	Plugin,
	TAbstractFile,
	TFile,
	TFolder,
} from "obsidian";
import { TASKMAP_VIEW_TYPE, TaskmapView } from "./TaskmapView";
import { DEFAULT_SETTINGS, type PluginSettings } from "./PluginSettings";
import { TaskmapSettingTab } from "./TaskmapSettingTab";
import { DEFAULT_DATA } from "./ProjectData.svelte";
import { LOGO_CONTENT, LOGO_NAME } from "./IconService";
import type { TaskData } from "./types";
import { deserializeProjectData, updateFile } from "./SaveManager";
import { generateMarkdownLink } from "./LinkManager";

export const FILE_EXTENSION = "taskmap";

export default class TaskmapPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();
		this.registerView(
			TASKMAP_VIEW_TYPE,
			(leaf) => new TaskmapView(leaf, this),
		);
		this.registerExtensions([FILE_EXTENSION], TASKMAP_VIEW_TYPE);

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

		this.registerEvent(
			this.app.vault.on(
				"rename",
				async (file: TAbstractFile, oldPath: string) => {
					console.log(`${file.path} renamed`);
					if (file instanceof TFile) {
						await this.handleRenameFiles(
							this.app,
							[file],
							oldPath,
							file.path,
						);
					} else if (file instanceof TFolder) {
						const files = this.app.vault
							.getMarkdownFiles()
							.filter((file) =>
								file.path.startsWith(file.path + "/"),
							);
						await this.handleRenameFiles(
							this.app,
							files,
							oldPath,
							file.path,
						);
					}
				},
			),
		);
	}

	async handleRenameFiles(
		app: App,
		changedMdFiles: TFile[],
		oldPath: string,
		newPath: string,
	) {
		const taskmapFiles = this.app.vault
			.getFiles()
			.filter((file) => file.path.endsWith(".taskmap"));

		let updatedTaskMapFilePaths: Set<string> = new Set<string>();

		// update paths in taskmap files
		for (const taskmapFile of taskmapFiles) {
			console.log(`handling ${taskmapFile.path}`);
			const projectDataRaw = await this.app.vault.read(taskmapFile);
			const projectData = deserializeProjectData(
				this.app,
				projectDataRaw,
			);
			const mapping = new Map<string, TaskData>();
			projectData.tasks.forEach((t) => {
				if (t.path) {
					if (t.path.startsWith(oldPath)) {
						t.path = t.path.replace(oldPath, newPath);
					}
					mapping.set(t.path, t);
				}
			});
			console.log("mapping " + JSON.stringify(mapping.keys()));
			let changed = false;
			changedMdFiles.forEach((mdFile) => {
				if (mdFile.path.contains("testNote")) {
					console.log(`testNode filepath ${mdFile.path}`);
				}
				if (mapping.has(mdFile.path)) {
					const t = mapping.get(mdFile.path)!;
					t.name = generateMarkdownLink(this.app, mdFile);
					changed = true;
				}
			});
			if (changed) {
				console.log(`${taskmapFile.path} changed`);
				// resave file on the file system
				await updateFile(app, taskmapFile, projectData);
				updatedTaskMapFilePaths.add(taskmapFile.path);
			} else {
				console.log(`${taskmapFile.path} not changed`);
			}
		}

		// refresh active views
		for (const view of app.workspace
			.getLeavesOfType(TASKMAP_VIEW_TYPE)
			.map((l) => l.view)
			.filter((view) => view instanceof TaskmapView)
			.filter(
				(view) =>
					view.file && updatedTaskMapFilePaths.has(view.file.path),
			)) {
			await view.refreshUi();
		}
	}

	public async createAndOpenDrawing(): Promise<string> {
		this.app.workspace.detachLeavesOfType(TASKMAP_VIEW_TYPE);

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

		await this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(TASKMAP_VIEW_TYPE)[0],
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
