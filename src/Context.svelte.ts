import TaskmapPlugin from "./main";
import {
	type BlockerPair,
	MouseDown,
	StatusCode,
	type TaskId,
	type Vector2,
} from "./types";
import { Spring } from "svelte/motion";
import {
	type App,
	MarkdownView,
	Notice,
	TFile,
	type WorkspaceLeaf,
} from "obsidian";
import { TaskmapView } from "./TaskmapView";
import {
	type NodePositionsCalculator,
	NoTaskId,
	RootTaskId,
	V2,
} from "./NodePositionsCalculator";
import { DraggingManager } from "./DraggingManager.svelte";
import { delink, LinkManager, tasknameFromFilePath } from "./LinkManager";
import { HistoryManager } from "./data/HistoryManager.svelte";
import type { ProjectData } from "./data/ProjectData.svelte.js";
import { VersionedData } from "./data/VersionedData";
import { innerHeight } from "svelte/reactivity/window";
import { TASK_SIZE } from "./Constants";

const DEFAULT_TOOLBAR_STATUS = StatusCode.DRAFT;

export class Context {
	app: App;
	plugin: TaskmapPlugin;
	nodePositionsCalculator: NodePositionsCalculator;
	linkManager: LinkManager;
	pressedButtonCode = $state(-1);
	editingTaskId = $state(NoTaskId);
	draggedTaskId = $state(NoTaskId);
	selectedTaskId = $state(NoTaskId);
	focusedTaskId = $state(RootTaskId);
	chosenBlockerId = $state(NoTaskId);
	chosenBlockedId = $state(NoTaskId);
	hoveredBlockerId = $state(NoTaskId);
	hoveredBlockedId = $state(NoTaskId);
	toolbarStatus = $state(DEFAULT_TOOLBAR_STATUS);
	reparentingTaskId = $state(NoTaskId);
	versionedData = $state(null! as VersionedData);
	positions: Map<TaskId, Vector2>;
	taskPositions: Array<{
		taskId: TaskId;
		tween: Spring<{ x: number; y: number }> | null;
	}>;
	taskDraggingManager = new DraggingManager([MouseDown.LEFT]);
	// svg elements are pixelated zooming from scale < 1 to scale > 1, so we force a redraw manually
	updateOnZoomCounter = $state(0);
	scale = $state(1);

	// parameters for animating task movement
	private tweenOptions = { duration: 300 };
	private springOptions = { stiffness: 0.07, damping: 0.7 };

	constructor(
		app: App,
		plugin: TaskmapPlugin,
		projectData: VersionedData,
		nodePositionsCalculator: NodePositionsCalculator,
	) {
		this.plugin = plugin;
		this.nodePositionsCalculator = nodePositionsCalculator;
		this.app = app;
		this.versionedData = projectData;
		this.linkManager = new LinkManager(app);

		this.taskPositions = projectData.getTasks().map((task) => {
			return {
				taskId: task.taskId,
				tween: null,
			};
		});
		this.updateTaskPositions();
	}

	/**
	 * Replaces project data from disk (e.g. after an external update) without remounting the view,
	 * so pan/zoom and the scene stay intact.
	 */
	public reloadFromDisk(projectData: ProjectData): void {
		this.versionedData = new VersionedData(projectData, new HistoryManager());
		this.taskDraggingManager.reset();
		this.draggedTaskId = NoTaskId;
		this.reparentingTaskId = NoTaskId;
		this.chosenBlockerId = NoTaskId;
		this.chosenBlockedId = NoTaskId;
		this.hoveredBlockerId = NoTaskId;
		this.hoveredBlockedId = NoTaskId;
		this.pressedButtonCode = -1;

		const sel = this.versionedData.getTaskOption(this.selectedTaskId);
		if (sel == null || sel.deleted) {
			this.selectedTaskId = NoTaskId;
			this.toolbarStatus = DEFAULT_TOOLBAR_STATUS;
		} else {
			this.toolbarStatus = sel.status;
		}

		const focused = this.versionedData.getTaskOption(this.focusedTaskId);
		if (focused == null || focused.deleted) {
			this.focusedTaskId = RootTaskId;
		}

		const editing = this.versionedData.getTaskOption(this.editingTaskId);
		if (editing == null || editing.deleted) {
			this.editingTaskId = NoTaskId;
		}

		this.taskPositions = this.versionedData.getTasks().map((task) => ({
			taskId: task.taskId,
			tween: null,
		}));
		this.updateTaskPositions();
		this.incrementUpdateOnZoomCounter();
	}

	public isBlockerHighlighted = (taskId: TaskId) => {
		if (this.versionedData.getTask(taskId).status === StatusCode.DONE) {
			return false;
		}
		if (this.chosenBlockedId !== NoTaskId) {
			return (
				this.chosenBlockedId === taskId ||
				this.versionedData.containsBlockerPair({
					blocked: this.chosenBlockedId,
					blocker: taskId,
				})
			);
		} else if (this.chosenBlockerId !== NoTaskId) {
			return (
				this.chosenBlockerId === taskId ||
				this.versionedData.containsBlockerPair({
					blocked: taskId,
					blocker: this.chosenBlockerId,
				})
			);
		} else if (this.hoveredBlockedId !== NoTaskId) {
			return (
				this.hoveredBlockedId === taskId ||
				this.versionedData.containsBlockerPair({
					blocked: this.hoveredBlockedId,
					blocker: taskId,
				})
			);
		} else if (this.hoveredBlockerId !== NoTaskId) {
			return (
				this.hoveredBlockerId === taskId ||
				this.versionedData.containsBlockerPair({
					blocked: taskId,
					blocker: this.hoveredBlockerId,
				})
			);
		} else {
			return false;
		}
	};

	public startTaskDragging = (e: PointerEvent, taskId: TaskId) => {
		this.draggedTaskId = taskId;
		this.taskDraggingManager.onPointerDown(e);
	};

	public finishTaskDragging = (e: PointerEvent, updatePositions = false) => {
		this.draggedTaskId = NoTaskId;
		this.taskDraggingManager.onPointerUp(e);
		if (updatePositions) {
			this.updateTaskPositions();
		}
	};

	public setScale(scale: number) {
		this.scale = scale;
	}

	public incrementUpdateOnZoomCounter(): void {
		this.updateOnZoomCounter += 1;
	}

	public isValidBlockerTarget(taskId: TaskId) {
		if (taskId === NoTaskId || this.chosenBlockedId === NoTaskId) {
			return false;
		}
		if (this.versionedData.getTask(taskId).status == StatusCode.DONE) {
			return false;
		}
		return this.isValidBlockerPairTarget({
			blocker: taskId,
			blocked: this.chosenBlockedId,
		});
	}

	public isValidBlockedTarget(taskId: TaskId) {
		if (taskId === NoTaskId || this.chosenBlockerId === NoTaskId) {
			return false;
		}
		if (this.versionedData.getTask(taskId).status == StatusCode.DONE) {
			return false;
		}
		return this.isValidBlockerPairTarget({
			blocker: this.chosenBlockerId,
			blocked: taskId,
		});
	}

	private isValidBlockerPairTarget(blockerPair: BlockerPair) {
		return !(
			blockerPair.blocked === blockerPair.blocker ||
			this.versionedData.isAncestorOf(
				blockerPair.blocked,
				blockerPair.blocker,
			) ||
			this.versionedData.isDescendantOf(
				blockerPair.blocked,
				blockerPair.blocker,
			)
		);
	}

	public isReparentingOn() {
		return this.reparentingTaskId != NoTaskId;
	}

	public startReparenting(taskId: TaskId) {
		this.reparentingTaskId = taskId;
	}

	public cancelReparenting() {
		this.reparentingTaskId = NoTaskId;
	}

	public isValidReparentingTarget(candidate: TaskId) {
		if (this.reparentingTaskId == NoTaskId) {
			throw new Error("Incorrect state: reparentingTaskId expected");
		}
		const task = this.versionedData.getTask(this.reparentingTaskId);
		return (
			candidate != this.reparentingTaskId &&
			candidate != task.parentId &&
			!this.versionedData
				.getDescendantIds(this.reparentingTaskId)
				.includes(candidate)
		);
	}

	public finishReparenting(newParentId: TaskId) {
		this.pressedButtonCode = -1;
		if (this.reparentingTaskId == NoTaskId) {
			throw new Error("Incorrect state: reparentingTaskId expected");
		}
		this.versionedData.changeParent(this.reparentingTaskId, newParentId);
		this.updateTaskPositions();
	}

	public changeFocusedTask(taskId: TaskId): void {
		if (this.focusedTaskId == taskId) {
			this.focusedTaskId = RootTaskId;
		} else {
			this.focusedTaskId = taskId;
		}
		this.updateTaskPositions();
	}

	public isAncestorOfHidden(taskId: TaskId): boolean {
		return this.versionedData
			.getAncestors(this.focusedTaskId)
			.map((t) => t.taskId)
			.includes(taskId);
	}

	public updateTaskPositions(draggingOnly = false) {
		if (!draggingOnly) {
			const newPositions =
				this.nodePositionsCalculator.CalculatePositionsInGlobalFrame(
					this.versionedData
						.getTasks()
						.filter((t) => !this.isTaskHidden(t.taskId)),
					{
						x: 0,
						y: (innerHeight.current ?? 0) / 2 - TASK_SIZE.height,
					},
				);

			if (this.taskDraggingManager.isDragging) {
				[
					this.draggedTaskId,
					...this.versionedData.getDescendantIds(this.draggedTaskId),
				].forEach((t) => {
					const v = this.positions.get(t);
					if (v !== undefined) {
						newPositions.set(t, v);
					}
				});
			}
			this.positions = newPositions;
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const taskIdSet = new Set<TaskId>(
				this.taskPositions.map((t) => t.taskId),
			);
			this.positions.forEach((v, k) => {
				if (k != NoTaskId && !taskIdSet.has(k)) {
					this.taskPositions.push({
						taskId: k,
						tween: null,
					});
				}
			});
			this.taskPositions = this.taskPositions.filter(
				(t) => !this.versionedData.getTaskOption(t.taskId)?.deleted,
			);
			this.taskPositions.forEach((taskPos) => {
				const newPos = this.positions.get(taskPos.taskId);
				if (newPos === undefined) {
					return;
				}
				if (taskPos.tween === null) {
					taskPos.tween = new Spring(newPos, this.springOptions);
				}

				taskPos.tween.stiffness = this.springOptions.stiffness;
				taskPos.tween.damping = this.springOptions.damping;
				taskPos.tween.target = newPos;
			});
		}

		// dragging
		if (this.draggedTaskId !== NoTaskId) {
			const draggingDelta = V2.mult(
				{
					x: this.taskDraggingManager.deltaX,
					y: this.taskDraggingManager.deltaY,
				},
				1 / this.scale,
			);
			const draggedTaskIds = this.versionedData.getDescendantIds(
				this.draggedTaskId,
			);
			this.taskPositions
				.filter((t) => draggedTaskIds.includes(t.taskId))
				.forEach((t) => {
					if (
						t.tween !== null &&
						t.tween !== undefined &&
						this.positions.has(t.taskId)
					) {
						t.tween.stiffness = 1;
						t.tween.damping = 1;
						t.tween.set(
							V2.add(
								this.positions.get(t.taskId)!,
								draggingDelta,
							),
						);
					}
				});
			const updated = this.updateDraggedTaskPriority();
			if (updated) {
				this.updateTaskPositions();
				this.save();
			}
		}
	}

	private updateDraggedTaskPriority() {
		// Если порядок тасок по оси Y отличается от приоритетов, то меняем приоритеты и пересчитываем порядок
		const draggedParentId = this.versionedData.getTask(
			this.draggedTaskId,
		).parentId;
		const orderedSiblings = this.taskPositions
			.filter((t) =>
				this.versionedData
					.getChildren(draggedParentId)
					.includes(t.taskId),
			)
			.sort((a, b) => a.tween?.target.y! - b.tween?.target.y!)
			.map((t) => t.taskId);
		const newPriority = orderedSiblings.findIndex(
			(t) => t == this.draggedTaskId,
		);
		const oldPriority = this.versionedData.getTask(
			this.draggedTaskId,
		).priority;
		if (newPriority != oldPriority) {
			this.versionedData.setPriority(this.draggedTaskId, newPriority);
			return true;
		}
		return false;
	}

	public isSelected(taskId: number) {
		return this.selectedTaskId == taskId;
	}

	public setSelectedTaskId(taskId: number) {
		this.selectedTaskId = taskId;
		if (taskId != -1) {
			this.toolbarStatus = this.versionedData.getTask(taskId).status;
		}
	}

	public save() {
		this.app.workspace.getActiveViewOfType(TaskmapView)?.debouncedSave();
	}

	public addTask(parentId: TaskId): void {
		this.versionedData.addTask(parentId);
		this.save();
		this.updateTaskPositions();
	}

	public removeTaskSingle(id: number) {
		this.setSelectedTaskId(-1);
		this.versionedData.removeTaskSingle(id);
		this.updateTaskPositions();
		this.save();
	}

	public removeTaskBranch(id: number) {
		this.setSelectedTaskId(-1);
		this.versionedData.removeTaskBranch(id);
		// this.taskPositions = this.taskPositions.filter((t) => t.taskId !== id);
		this.updateTaskPositions();
		this.save();
	}

	public changeStatus(status: StatusCode) {
		console.debug(
			`changeStatus from ${this.toolbarStatus} to ${status} for task ${this.selectedTaskId}`,
		);
		this.versionedData.setStatus(this.selectedTaskId, status);
		this.toolbarStatus = status;
		this.save();
	}

	public hideTaskBranch(id: number) {
		this.versionedData.setHidden(id, true);
	}

	public unhideTaskBranch(id: number) {
		this.versionedData.setHidden(id, false);
	}

	public getCurrentTaskPosition(taskId: number) {
		return this.taskPositions.find((t) => t.taskId === taskId)!.tween!
			.current;
	}

	public isTaskHidden(taskId: TaskId): boolean {
		const task = this.versionedData.getTask(taskId);
		const ancestorTasks = this.versionedData.getAncestors(taskId);

		const focusedAncestorIds = this.versionedData
			.getAncestors(this.focusedTaskId)
			.map((t) => t.taskId);
		const focusedDescendantIds = this.versionedData.getDescendantIds(
			this.focusedTaskId,
		);
		return (
			task.deleted ||
			ancestorTasks.some((t) => t.hidden) ||
			!(
				task.taskId == this.focusedTaskId ||
				focusedAncestorIds.includes(task.taskId) ||
				focusedDescendantIds.includes(task.taskId)
			)
		);
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
			const abstractFile = this.app.vault.getAbstractFileByPath(filepath);
			const tfile: TFile =
				abstractFile instanceof TFile
					? abstractFile
					: await this.app.vault.create(
							filepath,
							`Created by Taskmap.`,
						);
			this.versionedData.setName(
				taskId,
				tasknameFromFilePath(filepath),
				filepath,
			);
			this.save();
			await this.app.workspace
				.getActiveViewOfType(TaskmapView)
				?.refreshUi();
			await this.openOrFocusNote(tfile);
		} catch (error) {
			new Notice(
				"Error creating note. It might already exist or the name is invalid.",
			);
			console.error(error);
		}
	}

	public filePathFromTask(taskId: TaskId) {
		const task = this.versionedData.getTask(taskId);
		const taskName = task.name;
		// Sanitize the name for Obsidian filenames
		let sanitizedName = taskName.replace(/[\\/:*?"<>|]/g, "-");
		sanitizedName = delink(sanitizedName);
		return `${sanitizedName}.md`;
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

		const anotherUnpinnedLeaf = rootLeaves.reverse().find((leaf) => {
			return leaf !== activeLeaf && !leaf.getViewState().pinned;
		});

		if (anotherUnpinnedLeaf) {
			await anotherUnpinnedLeaf.openFile(file);
			workspace.setActiveLeaf(anotherUnpinnedLeaf, { focus: true });
		} else {
			const newLeaf = workspace.getLeaf("tab");
			await newLeaf.openFile(file);
		}
	}

	public serializeForDebugging() {
		return JSON.stringify({
			pressedButtonIndex: this.pressedButtonCode,
			selectedTaskId: this.selectedTaskId,
			toolbarStatus: this.toolbarStatus,
			projectData: this.versionedData,
		});
	}
}
