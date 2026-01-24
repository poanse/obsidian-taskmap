import { debounce, TextFileView, TFile, WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import { DEFAULT_DATA, ProjectData } from "./ProjectData.svelte";
import { Context } from "./Context.svelte.js";
import { NodePositionsCalculator } from "./NodePositionsCalculator";
import TaskmapContainer from "./components/TaskmapContainer.svelte";
import { deserializeProjectData, updateFile } from "./SaveManager";

export const TASKMAP_VIEW_TYPE = "taskmap-view";

export class TaskmapView extends TextFileView {
	taskmapContainer: ReturnType<typeof TaskmapContainer> | undefined;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	debouncedSave = debounce(() => this.save(), 1000, true);

	data: string = DEFAULT_DATA;
	projectData: ProjectData;
	context: Context;

	getViewType() {
		return TASKMAP_VIEW_TYPE;
	}

	async refreshUi() {
		const projectFile = this.file!;
		this.clear();
		await this.onLoadFile(projectFile);
	}

	async onLoadFile(file: TFile): Promise<void> {
		this.file = file;
		const data = await this.app.vault.read(file);
		this.setViewData(data);
		this.projectData = deserializeProjectData(this.app, this.data);
		this.context = new Context(
			this,
			this.projectData,
			this.app,
			new NodePositionsCalculator(),
		);
		this.taskmapContainer = mount(TaskmapContainer, {
			target: this.contentEl,
			props: {
				context: this.context,
			},
		});
	}

	getFile() {
		if (this.file) {
			return this.file;
		} else {
			throw new Error();
		}
	}

	getFilePath(): string {
		if (this.file) {
			return this.file.path;
		} else {
			throw new Error();
		}
	}

	getViewData(): string {
		return this.data;
	}

	setViewData(data: string = DEFAULT_DATA, clear = false): void {
		this.data = data;

		if (clear) {
			this.clear();
		}
	}

	async save() {
		try {
			await updateFile(this.app, this.file!, this.projectData);
		} catch (err) {
			console.error("Save failed:", err);
			throw new Error(`Save failed. ${err.message}`);
		}
	}

	clear(): void {
		this.debouncedSave.cancel();
		this.setViewData(DEFAULT_DATA);
		// 3. Proper unmounting in the clear cycle
		if (this.taskmapContainer) {
			unmount(this.taskmapContainer);
			this.taskmapContainer = undefined;
		}
		this.contentEl.empty();
	}

	async onUnloadFile(file: TFile): Promise<void> {
		this.clear();
	}

	onunload() {
		this.clear();
	}

	async onClose() {
		this.clear();
	}
}
