import { debounce, TextFileView, TFile, WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import { DEFAULT_DATA, ProjectData } from "./data/ProjectData.svelte";
import { Context } from "./Context.svelte.js";
import { NodePositionsCalculator } from "./NodePositionsCalculator";
import TaskmapContainer from "./components/TaskmapContainer.svelte";
import { deserializeProjectData, updateFile } from "./SaveManager";
import type TaskmapPlugin from "./main";
import { VersionedData } from "./data/VersionedData";
import { HistoryManager } from "./data/HistoryManager.svelte";

export const TASKMAP_VIEW_TYPE = "taskmap-view";

export class TaskmapView extends TextFileView {
	taskmapContainer: ReturnType<typeof TaskmapContainer> | undefined;
	plugin: TaskmapPlugin;
	data: string = DEFAULT_DATA;
	projectData: ProjectData;
	context: Context;

	constructor(leaf: WorkspaceLeaf, plugin: TaskmapPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	debouncedSave = debounce(() => this.save(), 1000, true);

	getViewType() {
		return TASKMAP_VIEW_TYPE;
	}

	async refreshUi() {
		const projectFile = this.file!;
		await this.debouncedSave.run();
		if (this.taskmapContainer === undefined) {
			await this.onLoadFile(projectFile);
		} else {
			const data = await this.app.vault.read(projectFile);
			this.setViewData(data);
			this.projectData = deserializeProjectData(data);
			this.context.reloadFromDisk(this.projectData);
		}
	}

	async onLoadFile(file: TFile): Promise<void> {
		this.file = file;
		const data = await this.app.vault.read(file);
		this.setViewData(data, true);
		this.projectData = deserializeProjectData(data);
		this.context = new Context(
			this.app,
			this.plugin,
			new VersionedData(this.projectData, new HistoryManager()),
			new NodePositionsCalculator(),
		);
		this.contentEl.addClass("taskmap-view-container");
		this.taskmapContainer = mount(TaskmapContainer, {
			target: this.contentEl,
			props: {
				context: this.context,
			},
		});
	}

	getViewData(): string {
		return this.data;
	}

	setViewData(data: string = DEFAULT_DATA, clear = false): void {
		if (clear) {
			this.clear();
		}
		this.data = data;
	}

	async save() {
		try {
			await updateFile(this.app, this.file!, this.projectData);
		} catch (err) {
			console.error("Save failed: ", err);
			throw new Error(`Save failed: ${String(err)}`);
		}
	}

	clear(): void {
		this.debouncedSave.cancel();
		this.setViewData(DEFAULT_DATA);
		this.contentEl.empty();
	}

	onunload() {
		this.clear();
		if (this.taskmapContainer) {
			void unmount(this.taskmapContainer);
			this.taskmapContainer = undefined;
		}
	}
}
