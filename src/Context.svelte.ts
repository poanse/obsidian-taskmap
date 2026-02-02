import TaskmapPlugin from "./main";
import type { ProjectData } from "./ProjectData.svelte.js";
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
import type { TaskmapView } from "./TaskmapView";
import {
	type NodePositionsCalculator,
	NoTaskId,
	RootTaskId,
	V2,
} from "./NodePositionsCalculator";
import { DraggingManager } from "./DraggingManager.svelte";
import { delink, LinkManager, tasknameFromFilePath } from "./LinkManager";

export class Context {
	app: App;
	view: TaskmapView;
	nodePositionsCalculator: NodePositionsCalculator;
	linkManager: LinkManager;
	pressedButtonCode = $state(-1);
	editingTaskId = $state(NoTaskId);
	draggedTaskId = $state(NoTaskId);
	selectedTaskId = $state(NoTaskId);
	focusedTaskId = $state(RootTaskId);
	chosenBlockerId = $state(NoTaskId);
	chosenBlockedId = $state(NoTaskId);
	toolbarStatus = $state(StatusCode.DRAFT);
	reparentingTaskId = $state(NoTaskId);
	projectData: ProjectData;
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
		view: TaskmapView,
		projectData: ProjectData,
		app: App,
		nodePositionsCalculator: NodePositionsCalculator,
	) {
		this.view = view;
		this.nodePositionsCalculator = nodePositionsCalculator;
		this.app = app;
		this.projectData = projectData;
		this.linkManager = new LinkManager(app);

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

	public isTaskBlocked(taskId: TaskId) {
		if (this.projectData.getTask(taskId).status === StatusCode.DONE) {
			return false;
		}
		return this.projectData.blockerPairs
			.filter((p) => p.blocked === taskId)
			.some(
				(p) =>
					this.projectData.getTask(p.blocker).status !==
					StatusCode.DONE,
			);
	}

	public isTaskBlocking(taskId: TaskId) {
		if (this.projectData.getTask(taskId).status === StatusCode.DONE) {
			return false;
		}
		return this.projectData.blockerPairs
			.filter((p) => p.blocker === taskId)
			.some(
				(p) =>
					this.projectData.getTask(p.blocked).status !==
					StatusCode.DONE,
			);
	}

	public isBlockerHighlighted = (taskId: TaskId) => {
		if (this.projectData.getTask(taskId).status === StatusCode.DONE) {
			return false;
		}
		if (this.chosenBlockedId !== NoTaskId) {
			return (
				this.chosenBlockedId === taskId ||
				this.projectData.containsBlockerPair({
					blocked: this.chosenBlockedId,
					blocker: taskId,
				})
			);
		} else if (this.chosenBlockerId !== NoTaskId) {
			return (
				this.chosenBlockerId === taskId ||
				this.projectData.containsBlockerPair({
					blocked: taskId,
					blocker: this.chosenBlockerId,
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

	public isTaskHidden(taskId: TaskId): boolean {
		const task = this.projectData.getTask(taskId);
		const ancestorTasks = this.projectData.getAncestors(taskId);

		const focusedAncestorIds = this.projectData
			.getAncestors(this.focusedTaskId)
			.map((t) => t.taskId);
		const focusedDescendantIds = this.projectData.getDescendantIds(
			this.focusedTaskId,
		);
		return (
			task.deleted ||
			ancestorTasks.some((t) => t.hidden) ||
			!(
				task.taskId == this.focusedTaskId ||
				focusedAncestorIds.contains(task.taskId) ||
				focusedDescendantIds.contains(task.taskId)
			)
		);
	}

	public isValidBlockerTarget(taskId: TaskId) {
		if (taskId === NoTaskId || this.chosenBlockedId === NoTaskId) {
			return false;
		}
		if (this.projectData.getTask(taskId).status == StatusCode.DONE) {
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
		if (this.projectData.getTask(taskId).status == StatusCode.DONE) {
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
			this.projectData.isAncestorOf(
				blockerPair.blocked,
				blockerPair.blocker,
			) ||
			this.projectData.isDescendentOf(
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

	public isValidReparentingTarget(taskId: TaskId) {
		if (this.reparentingTaskId == NoTaskId) {
			throw new Error("Incorrect state: reparentingTaskId expected");
		}
		return (
			taskId != this.reparentingTaskId &&
			!this.projectData
				.getDescendantIds(this.reparentingTaskId)
				.contains(taskId) &&
			this.projectData.getTask(this.reparentingTaskId).parentId != taskId
		);
	}

	public finishReparenting(newParentId: TaskId) {
		if (this.reparentingTaskId == NoTaskId) {
			throw new Error("Incorrect state: reparentingTaskId expected");
		}
		this.projectData.changeParent(this.reparentingTaskId, newParentId);
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
		return this.projectData
			.getAncestors(this.focusedTaskId)
			.map((t) => t.taskId)
			.contains(taskId);
	}

	public updateTaskPositions(draggingOnly = false) {
		if (!draggingOnly) {
			const newPositions =
				this.nodePositionsCalculator.CalculatePositionsInGlobalFrame(
					this.projectData.tasks.filter(
						(t) => !this.isTaskHidden(t.taskId),
					),
					{ x: 0, y: 0 },
				);
			if (this.taskDraggingManager.isDragging) {
				[
					this.draggedTaskId,
					...this.projectData.getDescendantIds(this.draggedTaskId),
				].forEach((t) => {
					const v = this.positions.get(t);
					if (v !== undefined) {
						newPositions.set(t, v);
					}
				});
			}
			this.positions = newPositions;
			this.taskPositions = this.taskPositions.filter(
				(t) => !this.projectData.getTask(t.taskId).deleted,
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
			const draggedTaskIds = this.projectData.getDescendantIds(
				this.draggedTaskId,
			);
			this.taskPositions
				.filter((t) => draggedTaskIds.contains(t.taskId))
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
		const draggedParentId = this.projectData.getTask(
			this.draggedTaskId,
		).parentId;
		const orderedSiblings = this.taskPositions
			.filter((t) =>
				this.projectData
					.getChildren(draggedParentId)
					.contains(t.taskId),
			)
			.sort((a, b) => a.tween?.target.y! - b.tween?.target.y!)
			.map((t) => t.taskId);
		const newPriority = orderedSiblings.findIndex(
			(t) => t == this.draggedTaskId,
		);
		const oldPriority = this.projectData.getTask(
			this.draggedTaskId,
		).priority;
		if (newPriority != oldPriority) {
			this.projectData.setPriority(this.draggedTaskId, newPriority);
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
			this.toolbarStatus = this.projectData.getTaskStatus(taskId);
		}
	}

	public save() {
		const x = this.view;
		x.debouncedSave();
		console.log("saved");
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
			task.name = tasknameFromFilePath(filepath);
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

	public serializeForDebugging() {
		return JSON.stringify({
			pressedButtonIndex: this.pressedButtonCode,
			selectedTaskId: this.selectedTaskId,
			toolbarStatus: this.toolbarStatus,
			projectData: this.projectData,
		});
	}
}
