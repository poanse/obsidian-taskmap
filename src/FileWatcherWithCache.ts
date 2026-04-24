import { type Plugin, TAbstractFile, type App, TFile, TFolder } from "obsidian";
import type { TaskData } from "./types";
import { TASKMAP_VIEW_TYPE, TaskmapView } from "./TaskmapView";
import { loadProjectData, updateFile } from "./SaveManager";
import { delink, generateMarkdownLink, pathIsUnderFolder } from "./LinkManager";

function taskPathAffectedByRename(taskPath: string, oldPath: string): boolean {
	return taskPath === oldPath || pathIsUnderFolder(taskPath, oldPath);
}

function remapTaskPathAfterRename(
	taskPath: string,
	oldPath: string,
	newPath: string,
): string {
	if (taskPath === oldPath) {
		return newPath;
	}
	return newPath + taskPath.slice(oldPath.length);
}

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
	 * Still handle extension changes (e.g. `.taskmap` → `.md`).
	 */
	onRenameCacheUpdate(file: TAbstractFile): void {
		if (!(file instanceof TFile)) {
			return;
		}
		this.cachedTaskmapFiles.delete(file);
		if (file.extension === "taskmap") {
			this.cachedTaskmapFiles.add(file);
		}
	}

	async onDeleteLinkUpdate(file: TAbstractFile, app: App) {
		console.debug(`${file.path} deleted`);
		let files: TFile[];
		if (file instanceof TFile) {
			files = [file];
		} else if (file instanceof TFolder) {
			files = [...this.cachedTaskmapFiles].filter((f) =>
				pathIsUnderFolder(f.path, file.path),
			);
			await this.handleNoteFolderDelete(app, file);
		} else {
			return;
		}
		await this.handleDeleteFiles(app, files);

		// refresh all active views
		for (const view of app.workspace
			.getLeavesOfType(TASKMAP_VIEW_TYPE)
			.map((l) => l.view)
			.filter((view) => view instanceof TaskmapView)) {
			await view.refreshUi();
		}
	}

	async handleDeleteFiles(app: App, files: TFile[]) {
		const deletedPaths = new Set<string>(files.map((f) => f.path));
		for (const taskmapFile of [...this.cachedTaskmapFiles]) {
			if (deletedPaths.has(taskmapFile.path)) {
				// Entire .taskmap was removed; link handler runs before cache — skip read/write.
				continue;
			}
			const projectData = await loadProjectData(app, taskmapFile);
			if (!projectData) {
				continue;
			}
			let taskmapFileChanged = false;
			projectData.tasks
				.filter((t) => t.path && deletedPaths.has(t.path))
				.forEach((t) => {
					t.name = delink(t.name);
					t.path = undefined;
					taskmapFileChanged = true;
				});
			if (taskmapFileChanged) {
				console.debug(`${taskmapFile.path} changed`);
				// resave file on the file system
				await updateFile(app, taskmapFile, projectData);
			}
		}
	}

	async onRenameLinkUpdate(app: App, file: TAbstractFile, oldPath: string) {
		console.debug(`${file.path} renamed`);
		let files: TFile[];
		if (file instanceof TFile) {
			files = [file];
		} else if (file instanceof TFolder) {
			files = [...this.cachedTaskmapFiles].filter((f) =>
				pathIsUnderFolder(f.path, file.path),
			);
			await this.handleNoteFolderRename(app, file, oldPath);
		} else {
			return;
		}
		await this.handleRenameFiles(app, files, oldPath, file.path);

		// refresh all active views
		for (const view of app.workspace
			.getLeavesOfType(TASKMAP_VIEW_TYPE)
			.map((l) => l.view)
			.filter((view) => view instanceof TaskmapView)) {
			await view.refreshUi();
		}
	}

	async handleNoteFolderRename(app: App, folder: TFolder, oldPath: string) {
		for (const taskmapFile of this.cachedTaskmapFiles) {
			const projectData = await loadProjectData(app, taskmapFile);
			if (projectData && projectData.folderPath == oldPath) {
				console.debug(
					`Changed folderPath for ${taskmapFile.name} from ${oldPath} to ${projectData.folderPath}`,
				);
				projectData.setFolderPath(folder.path);
				await updateFile(app, taskmapFile, projectData);
			}
		}
	}
	async handleNoteFolderDelete(app: App, folder: TFolder) {
		for (const taskmapFile of this.cachedTaskmapFiles) {
			const projectData = await loadProjectData(app, taskmapFile);
			if (projectData && projectData.folderPath == folder.path) {
				console.debug(`Removed folderPath for ${taskmapFile.name}`);
				projectData.setFolderPath("");
				await updateFile(app, taskmapFile, projectData);
			}
		}
	}

	async handleRenameFiles(
		app: App,
		changedMdFiles: TFile[],
		oldPath: string,
		newPath: string,
	) {
		// update paths in taskmap files
		for (const taskmapFile of [...this.cachedTaskmapFiles]) {
			const projectData = await loadProjectData(app, taskmapFile);
			if (!projectData) {
				continue;
			}
			const mapping = new Map<string, TaskData>();
			projectData.tasks.forEach((t) => {
				if (t.path) {
					if (taskPathAffectedByRename(t.path, oldPath)) {
						t.path = remapTaskPathAfterRename(
							t.path,
							oldPath,
							newPath,
						);
					}
					mapping.set(t.path, t);
				}
			});
			let changed = false;
			changedMdFiles
				.filter((mdFile) => mapping.has(mdFile.path))
				.forEach((mdFile) => {
					const t = mapping.get(mdFile.path)!;
					t.name = generateMarkdownLink(app, mdFile);
					changed = true;
				});
			if (changed) {
				console.debug(`${taskmapFile.path} changed`);
				// resave file on the file system
				await updateFile(app, taskmapFile, projectData);
			}
		}
	}
}
