import { type App, type Plugin, TAbstractFile, TFile, TFolder } from "obsidian";
import { TASKMAP_VIEW_TYPE, TaskmapView } from "./TaskmapView";
import { loadProjectData, updateFile } from "./SaveManager";
import {
	delink,
	pathIsUnderFolder,
	taskNameFromFile,
	taskPathFromFile,
} from "./LinkManager";
import type { ProjectData } from "./data/ProjectData.svelte";

/** In-memory index of `.taskmap` files; `TFile.path` stays in sync with vault renames. */
export class FileWatcherWithCache {
	readonly cachedTaskmapFiles = new Set<TFile>();

	initFromVault(app: App): void {
		this.cachedTaskmapFiles.clear();
		for (const f of app.vault.getFiles()) {
			if (f.extension === "taskmap") {
				this.cachedTaskmapFiles.add(f);
			}
		}
	}

	/**
	 * Registers vault hooks: taskmap index maintenance and path/link updates.
	 * Order: link handlers before cache on delete (cache still lists children under a deleted folder);
	 * cache before link on rename so `TFile.path` matches vault before we scan.
	 */
	registerTaskmapVaultHooks(plugin: Plugin): void {
		const { app } = plugin;
		plugin.registerEvent(
			app.vault.on("delete", (file) => {
				void this.onDeleteLinkUpdate(file, app);
			}),
		);
		plugin.registerEvent(
			app.vault.on("delete", (file) => {
				this.onDeleteCacheUpdate(file);
			}),
		);

		plugin.registerEvent(
			app.vault.on("rename", (file) => {
				this.onRenameCacheUpdate(file);
			}),
		);
		plugin.registerEvent(
			app.vault.on("rename", (file, oldPath) => {
				void this.onRenameLinkUpdate(app, file, oldPath);
			}),
		);

		plugin.registerEvent(
			app.vault.on("create", (file) => {
				this.onCreateCacheUpdate(file);
			}),
		);
	}

	onCreateCacheUpdate(file: TAbstractFile): void {
		if (file instanceof TFile && file.extension === "taskmap") {
			this.cachedTaskmapFiles.add(file);
		}
		// TFolder: each nested .taskmap emits its own "create"
	}

	onDeleteCacheUpdate(file: TAbstractFile): void {
		if (file instanceof TFile && file.extension === "taskmap") {
			this.cachedTaskmapFiles.delete(file);
		} else if (file instanceof TFolder) {
			for (const f of [...this.cachedTaskmapFiles]) {
				if (pathIsUnderFolder(f.path, file.path)) {
					this.cachedTaskmapFiles.delete(f);
				}
			}
		}
	}

	/**
	 * Path-only renames update `TFile.path` on the same instance — no Set mutation.
	 * Still handle extension changes (e.g. `.md` -> `.taskmap`).
	 */
	onRenameCacheUpdate(file: TAbstractFile): void {
		if (file instanceof TFile) {
			this.cachedTaskmapFiles.delete(file);
			if (file.extension === "taskmap") {
				this.cachedTaskmapFiles.add(file);
			}
		}
	}

	async onDeleteLinkUpdate(file: TAbstractFile, app: App) {
		if (file instanceof TFile) {
			await this.handleDeleteFile(app, file);
		} else if (file instanceof TFolder) {
			// files in folder emit separate events per file
			await this.handleNoteFolderDelete(app, file);
		}
	}

	async onRenameLinkUpdate(app: App, file: TAbstractFile, oldPath: string) {
		if (file instanceof TFile) {
			await this.handleRenameFiles(app, file, oldPath);
		} else if (file instanceof TFolder) {
			// files in folder emit separate events per file
			await this.handleNoteFolderRename(app, file, oldPath);
		}
	}

	async handleDeleteFile(app: App, deletedFile: TFile) {
		for (const taskmapFile of [...this.cachedTaskmapFiles]) {
			if (deletedFile.path === taskmapFile.path) {
				// Entire .taskmap was removed; link handler runs before cache — skip read/write.
				continue;
			}
			const projectData = await this.getProjectData(app, taskmapFile);
			if (!projectData) {
				continue;
			}
			const affectedTasks = projectData
				.getTasks()
				.filter((t) => t.path && deletedFile.path === t.path);
			for (const t of affectedTasks) {
				t.name = delink(t.name);
				t.path = undefined;
			}
			if (affectedTasks) {
				console.debug(`${taskmapFile.path} changed`);
				await this.updateFileAndRefreshActiveView(
					app,
					taskmapFile,
					projectData,
				);
			}
		}
	}

	async handleNoteFolderDelete(app: App, folder: TFolder) {
		for (const taskmapFile of [...this.cachedTaskmapFiles]) {
			const projectData = await this.getProjectData(app, taskmapFile);
			if (projectData && projectData.folderPath == folder.path) {
				console.debug(`Removed folderPath for ${taskmapFile.name}`);
				projectData.setFolderPath("");
				await this.updateFileAndRefreshActiveView(
					app,
					taskmapFile,
					projectData,
				);
			}
		}
	}

	async handleRenameFiles(app: App, changedMdFile: TFile, oldPath: string) {
		// update paths in taskmap files
		for (const taskmapFile of [...this.cachedTaskmapFiles]) {
			const projectData = await this.getProjectData(app, taskmapFile);
			if (!projectData) {
				continue;
			}
			const affectedTasks = projectData
				.getTasks()
				.filter((t) => t.path && t.path === oldPath);
			for (const t of affectedTasks) {
				t.path = taskPathFromFile(changedMdFile);
				t.name = taskNameFromFile(changedMdFile);
			}
			if (affectedTasks) {
				console.debug(`${taskmapFile.path} changed`);
				// resave file on the file system
				await this.updateFileAndRefreshActiveView(
					app,
					taskmapFile,
					projectData,
				);
			}
		}
	}

	async handleNoteFolderRename(app: App, folder: TFolder, oldPath: string) {
		for (const taskmapFile of [...this.cachedTaskmapFiles]) {
			const projectData = await this.getProjectData(app, taskmapFile);
			if (projectData && projectData.folderPath == oldPath) {
				projectData.setFolderPath(folder.path);
				console.debug(
					`Changed folderPath for ${taskmapFile.name} from ${oldPath} to ${folder.path}`,
				);
				await this.updateFileAndRefreshActiveView(
					app,
					taskmapFile,
					projectData,
				);
			}
		}
	}

	async getProjectData(app: App, taskmapFile: TFile) {
		const viewByName = new Map<string, TaskmapView>();
		app.workspace
			.getLeavesOfType(TASKMAP_VIEW_TYPE)
			.map((l) => l.view)
			.forEach((v) => {
				if (v instanceof TaskmapView && v.file) {
					viewByName.set(v.file.name, v);
				}
			});
		const view = viewByName.get(taskmapFile.name);
		if (view) {
			// ensure that view data is consistent with disk data
			await view.debouncedSave.run();
			return view.projectData;
		}
		const loadedProjectData = await loadProjectData(app, taskmapFile);
		if (loadedProjectData) {
			return loadedProjectData;
		}
	}

	async updateFileAndRefreshActiveView(
		app: App,
		taskmapFile: TFile,
		projectData: ProjectData,
	) {
		await updateFile(app, taskmapFile, projectData);
		for (const view of app.workspace
			.getLeavesOfType(TASKMAP_VIEW_TYPE)
			.map((l) => l.view)) {
			if (
				view instanceof TaskmapView &&
				view.file?.name === taskmapFile.name
			) {
				await view.refreshUi();
			}
		}
	}
}
