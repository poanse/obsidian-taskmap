import TaskmapPlugin from "./main";
import type { ProjectData } from "./ProjectData.svelte.js";
import { StatusCode, type TaskData, type TaskId } from "./types";
import { Spring } from "svelte/motion";
import {
	type App,
	MarkdownView,
	Notice,
	TFile,
	type WorkspaceLeaf,
} from "obsidian";
import type { TaskmapView } from "./TaskmapView";
import {
	type NodePositionsCalculator,
	RootTaskId,
} from "./NodePositionsCalculator";

export class Context {
	app: App;
	view: TaskmapView;
	nodePositionsCalculator: NodePositionsCalculator;
	pressedButtonCode = $state(-1);
	selectedTaskId = $state(-1);
	focusedTaskId = $state(RootTaskId);
	toolbarStatus = $state(StatusCode.DRAFT);
	projectData: ProjectData;
	taskPositions: Array<{
		taskId: TaskId;
		tween: Spring<{ x: number; y: number }> | null;
	}>;
	// svg elements are pixelated zooming from scale < 1 to scale > 1, so we force a redraw manually
	updateOnZoomCounter = $state(0);

	// parameters for animating task movement
	private tweenOptions = { duration: 300 };
	private springOptions = { stiffness: 0.07, damping: 0.7 };

	constructor(
		view: TaskmapView,
		projectData: ProjectData,
		app: App,
		nodePositionsCalculator: NodePositionsCalculator,
	) {
		this.view = view;
		this.nodePositionsCalculator = nodePositionsCalculator;
		this.app = app;
		this.projectData = projectData;

		this.taskPositions = projectData.tasks
			.filter((t) => !t.deleted)
			.map((task) => {
				return {
					taskId: task.taskId,
					tween: null,
				};
			});
		this.updateTaskPositions();
	}

	public incrementUpdateOnZoomCounter(): void {
		this.updateOnZoomCounter += 1;
	}

	public isTaskHidden(taskId: TaskId): boolean {
		const task = this.projectData.getTask(taskId);
		const ancestors = this.projectData
			.getAncestors(this.focusedTaskId)
			.map((t) => t.taskId);
		const descendants = this.projectData.getDescendants(this.focusedTaskId);
		return (
			task.deleted ||
			!(
				task.taskId == this.focusedTaskId ||
				ancestors.contains(task.taskId) ||
				descendants.contains(task.taskId)
			)
		);
	}

	public changeFocusedTask(taskId: TaskId): void {
		this.focusedTaskId = taskId;
		this.updateTaskPositions();
	}

	public isAncestorOfHidden(taskId: TaskId): boolean {
		return this.projectData
			.getAncestors(this.focusedTaskId)
			.map((t) => t.taskId)
			.contains(taskId);
	}

	public updateTaskPositions() {
		const positions =
			this.nodePositionsCalculator.CalculatePositionsInGlobalFrame(
				this.projectData.tasks.filter(
					(t) => !this.isTaskHidden(t.taskId),
				),
				{ x: 0, y: 0 },
			);
		this.taskPositions = this.taskPositions.filter(
			(t) => !this.projectData.getTask(t.taskId).deleted,
		);
		this.taskPositions.forEach((taskPos) => {
			const newPos = positions.get(taskPos.taskId);
			if (newPos === undefined) {
				return;
			}
			if (taskPos.tween === null) {
				taskPos.tween = new Spring(newPos, this.springOptions);
			}
			taskPos.tween.target = newPos;
		});
	}

	public isSelected(taskId: number) {
		return this.selectedTaskId == taskId;
	}

	public setSelectedTaskId(taskId: number) {
		this.selectedTaskId = taskId;
		if (taskId != -1) {
			this.toolbarStatus = this.projectData.getTaskStatus(taskId);
		}
	}

	// can be called from any component
	public save() {
		const x = TaskmapPlugin.getActiveView();
		if (x != null) {
			x.debouncedSave();
			console.log("saved");
		}
	}

	public addTask(parentId: TaskId): void {
		const id = this.projectData.addTask(parentId);
		this.save();
		this.taskPositions.push({
			taskId: id,
			tween: null,
		});
		this.updateTaskPositions();
	}

	public removeTaskSingle(id: number) {
		this.setSelectedTaskId(-1);
		this.projectData.removeTaskSingle(id);
		// this.taskPositions = this.taskPositions.filter((t) => t.taskId !== id);
		this.updateTaskPositions();
		this.save();
	}

	public removeTaskBranch(id: number) {
		this.setSelectedTaskId(-1);
		this.projectData.removeTaskBranch(id);
		// this.taskPositions = this.taskPositions.filter((t) => t.taskId !== id);
		this.updateTaskPositions();
		this.save();
	}

	public changeStatus(status: StatusCode) {
		console.log(
			`changeStatus from ${this.toolbarStatus} to ${status} for task ${this.selectedTaskId}`,
		);
		this.projectData.setTaskStatus(this.selectedTaskId, status);
		this.toolbarStatus = status;
		const x = TaskmapPlugin.getActiveView();
		if (x) {
			x.debouncedSave();
		}
		// get taskdata
		// change its status
	}

	public hideTaskBranch(id: number) {
		this.projectData.getTask(id).hidden = true;
	}

	public unhideTaskBranch(id: number) {
		this.projectData.getTask(id).hidden = false;
	}

	public getCurrentTaskPosition(taskId: number) {
		return this.taskPositions.find((t) => t.taskId === taskId)!.tween!
			.current;
	}

	public isRemoveButtonEnabled() {
		return this.selectedTaskId != RootTaskId;
	}

	/**
	 * Creates note named after task name if not exists already.
	 * Changes task name to a link to the node.
	 * Opens the note on the right side.
	 * @param taskId
	 */
	public async createLinkedNote(taskId: TaskId) {
		const filepath = this.filePathFromTask(taskId);

		try {
			let abstractFile = this.app.vault.getAbstractFileByPath(filepath);
			let tfile: TFile =
				abstractFile instanceof TFile
					? abstractFile
					: await this.app.vault.create(
							filepath,
							`Created by Taskmap.`,
						);
			const task = this.projectData.getTask(taskId);
			task.name = this.tasknameFromFilePath(filepath);
			this.save();
			await this.openOrFocusNote(tfile);
		} catch (error) {
			new Notice(
				"Error creating note. It might already exist or the name is invalid.",
			);
			console.error(error);
		}
	}

	public filePathFromTask(taskId: TaskId) {
		const task = this.projectData.getTask(taskId);
		const taskName = task.name;
		// Sanitize the name for Obsidian filenames
		let sanitizedName = taskName.replace(/[\\/:*?"<>|]/g, "-");
		sanitizedName = this.delink(sanitizedName);
		return `${sanitizedName}.md`;
	}

	public tasknameFromFilePath(path: string) {
		if (path.endsWith(".md")) {
			path = path.slice(0, path.length - 3);
		}
		return `[[${path}]]`;
	}

	/**
	 * Opens a file with "Smart Focus":
	 * 1. If file is already open anywhere -> Focus it.
	 * 2. If an unpinned tab exists in another pane -> Open it there.
	 * 3. If everything else is pinned or only one pane exists -> Create a new split.
	 */
	public async openOrFocusNote(file: TFile) {
		const { workspace } = this.app;

		// 1. Check if the file is already open in any leaf (pinned or not)
		let existingLeaf: WorkspaceLeaf | null = null;
		workspace.iterateAllLeaves((leaf) => {
			if (
				leaf.view instanceof MarkdownView &&
				leaf.view.file?.path === file.path
			) {
				existingLeaf = leaf;
			}
		});

		if (existingLeaf) {
			workspace.setActiveLeaf(existingLeaf, { focus: true });
			return;
		}

		// 2. Look for a reusable (unpinned) leaf in the root split
		const activeLeaf = workspace.getMostRecentLeaf();
		const rootLeaves: WorkspaceLeaf[] = [];
		workspace.iterateRootLeaves((leaf) => {
			rootLeaves.push(leaf);
		});

		const anotherLeaf = rootLeaves.reverse().find((leaf) => {
			return leaf !== activeLeaf;
		});
		const anotherUnpinnedLeaf = rootLeaves.reverse().find((leaf) => {
			return leaf !== activeLeaf && !leaf.getViewState().pinned;
		});

		if (anotherUnpinnedLeaf) {
			// Reuse the unpinned secondary pane
			await anotherUnpinnedLeaf.openFile(file);
			workspace.setActiveLeaf(anotherUnpinnedLeaf, { focus: true });
		} else if (anotherLeaf) {
			workspace.setActiveLeaf(anotherLeaf, { focus: true });
			const newLeaf = workspace.getLeaf("tab");
			await newLeaf.openFile(file);
			if (activeLeaf !== null) {
				workspace.setActiveLeaf(activeLeaf);
			}
		} else {
			// 3. If no reusable leaf exists (all are pinned or only one exists), create a split
			// This will create a new vertical pane that is unpinned by default
			const newLeaf = workspace.getLeaf("split", "vertical");
			await newLeaf.openFile(file);
		}
	}

	public isLink(s: string): boolean {
		return s.startsWith("[[") && s.endsWith("]]");
	}

	public delink(s: string) {
		return this.isLink(s) ? s.slice(2, s.length - 2) : s;
	}

	public serializeForDebugging() {
		return JSON.stringify({
			pressedButtonIndex: this.pressedButtonCode,
			selectedTaskId: this.selectedTaskId,
			toolbarStatus: this.toolbarStatus,
			projectData: this.projectData,
		});
	}
}
