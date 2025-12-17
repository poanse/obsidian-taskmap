import { debounce, TextFileView, TFile, WorkspaceLeaf } from "obsidian";
import { mount } from "svelte";
import { DEFAULT_DATA, ProjectData } from "./ProjectData.svelte";
import pixi from "./components/pixi.svelte";
import { UIState } from "./pixi/GlobalState.svelte";

export const VIEW_TYPE_EXAMPLE = "example";

export class TaskmapView extends TextFileView {
	// raw svelte/html
	// taskMapViewComponent: ReturnType<typeof TaskmapViewComponent> | undefined;
	// pixi
	pixiComponent: ReturnType<typeof pixi> | undefined;
	// canvas
	// canvasComponent: ReturnType<typeof DemoApp> | undefined;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	debouncedSave = debounce(() => this.save(), 1000, true);

	data: string = DEFAULT_DATA;
	projectData: ProjectData;

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	async onLoadFile(file: TFile): Promise<void> {
		this.file = file;
		this.setViewData(await this.app.vault.read(file));
		let projectData = new ProjectData(JSON.parse(this.data));
		this.projectData = projectData;
		// this.taskMapViewComponent = mount(TaskmapViewComponent, {
		// 	target: this.contentEl,
		// 	props: {
		// 		taskmapView: this,
		// 	},
		// });
		// this.canvasComponent = mount(DemoApp, {
		// 	target: this.contentEl,
		// 	props: {
		// 		taskmapView: this,
		// },
		// });
		this.pixiComponent = mount(pixi, {
			target: this.contentEl,
			props: {
				uiState: new UIState(this.projectData, this.app),
				projectData: this.projectData,
			},
		});
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
			await this.app.vault.modify(
				this.file!,
				this.projectData.serialize(),
			);
		} catch (err) {
			console.error("Save failed:", err);
			throw new Error(`Save failed. ${err.message}`);
		}
	}

	clear(): void {
		this.debouncedSave.cancel();
		this.setViewData(DEFAULT_DATA);
	}

	async onUnloadFile(file: TFile): Promise<void> {
		this.clear();
	}

	onunload() {
		this.clear();
	}

	async onClose() {
		this.debouncedSave.cancel();
	}

	// onChange(value: string) {
	//     this.setViewData(value);
	// 	this.debouncedSave();
	// }
}
