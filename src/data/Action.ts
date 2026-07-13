import {
	type BlockerPair,
	StatusCode,
	type TaskId,
	type Vector2,
} from "../types";
import { ProjectData } from "./ProjectData.svelte";

export interface Action {
	do(data: ProjectData): void;
	undo(data: ProjectData): void;
}

export class AddTaskAction implements Action {
	private parentId: TaskId;
	private addedTaskId?: TaskId;

	constructor(parentId: TaskId) {
		this.parentId = parentId;
	}

	do(data: ProjectData): void {
		const childrenCount = data.getChildren(this.parentId).length;
		this.addedTaskId = data.curTaskId;
		const task = {
			taskId: this.addedTaskId,
			parentId: this.parentId,
			status: StatusCode.READY,
			name: "task",
			deleted: false,
			hidden: false,
			priority: childrenCount,
			depth: data.getTask(this.parentId).depth + 1,
		};
		data.addTask(task);
		data.recalcStatusRecursive(this.parentId);
	}

	undo(data: ProjectData): void {
		if (this.addedTaskId === undefined) {
			throw new Error();
		}
		if (data.curTaskId != this.addedTaskId + 1) {
			throw new Error();
		}
		data.removeTask();
		this.addedTaskId = undefined;
	}
}

export class RemoveTaskSingleAction implements Action {
	private taskId: TaskId;
	private children?: TaskId[] = undefined;

	constructor(taskId: TaskId) {
		this.taskId = taskId;
	}

	do(data: ProjectData): void {
		const task = data.getTask(this.taskId);
		const parentId = task.parentId;
		task.deleted = true;
		this.children = data.getChildren(this.taskId);
		// Promote the children into the deleted task's slot, or recalc the parent.
		data.reparentChildren(
			this.children,
			parentId,
			task.priority,
		);
		data.updateTasksView();
	}

	undo(data: ProjectData) {
		if (this.children === undefined) {
			throw new Error();
		}
		const task = data.getTask(this.taskId);
		task.deleted = false;
		data.reparentChildren(this.children, task.taskId);
		this.children = undefined;
	}
}

export class RemoveTaskBranchAction implements Action {
	private taskId: TaskId;
	private descendants?: TaskId[] = undefined;

	constructor(taskId: TaskId) {
		this.taskId = taskId;
	}

	do(data: ProjectData): void {
		// Memorize descendents that are being removed on this call, because other descendants that were removed earlier can exist
		this.descendants = data.getDescendantIds(this.taskId);
		this.toggleDeleted(this.descendants, true, data);
	}

	undo(data: ProjectData) {
		if (this.descendants === undefined) {
			throw new Error();
		}
		this.toggleDeleted(this.descendants, false, data);
		this.descendants = undefined;
	}

	private toggleDeleted(
		descendants: TaskId[],
		value: boolean,
		data: ProjectData,
	) {
		descendants.forEach((taskId) => (data.getTask(taskId).deleted = value));
		const parentId = data.getTask(this.taskId).parentId;
		data.recalcPriorities(parentId);
		data.recalcStatusRecursive(parentId);
	}
}

export class SetTaskStatusAction implements Action {
	private taskId: TaskId;
	private newStatus: StatusCode;
	private oldStatus?: StatusCode;

	constructor(taskId: TaskId, newStatus: StatusCode) {
		this.taskId = taskId;
		this.newStatus = newStatus;
	}

	do(data: ProjectData) {
		this.oldStatus = data.getTask(this.taskId).status;
		const task = data.getTask(this.taskId);
		task.status = this.newStatus;
		data.recalcStatusRecursive(task.parentId);
	}

	undo(data: ProjectData) {
		if (this.oldStatus === undefined) {
			throw new Error();
		}
		const task = data.getTask(this.taskId);
		task.status = this.oldStatus;
		data.recalcStatusRecursive(task.parentId);
		this.oldStatus = undefined;
	}
}

export class SetTaskNameAction implements Action {
	private taskId: TaskId;
	private newName: string;
	private newPath?: string;
	private oldName?: string;
	private oldPath?: string;
	// undefined = not yet recorded; null = no override existed; Vector2 = override existed
	private oldSizeOverride: Vector2 | null | undefined = undefined;

	constructor(taskId: TaskId, newName: string, path?: string) {
		this.taskId = taskId;
		this.newName = newName;
		this.newPath = path;
	}

	do(data: ProjectData): void {
		this.oldName = data.getTask(this.taskId).name;
		this.oldPath = data.getTask(this.taskId).path;
		this.oldSizeOverride = data.getTaskSizeOverride(this.taskId) ?? null;
		const task = data.getTask(this.taskId);
		task.name = this.newName;
		task.path = this.newPath;
		data.updateConnectionsView();
	}

	undo(data: ProjectData): void {
		if (this.oldName === undefined || this.oldSizeOverride === undefined) {
			throw new Error();
		}
		const task = data.getTask(this.taskId);
		task.name = this.oldName;
		task.path = this.oldPath;
		if (this.oldSizeOverride !== null) {
			data.setTaskSizeOverride(this.taskId, this.oldSizeOverride);
		} else {
			data.deleteTaskSizeOverride(this.taskId);
		}
		data.updateConnectionsView();
		this.oldName = undefined;
		this.oldPath = undefined;
		this.oldSizeOverride = undefined;
	}

	shouldCombine(newAction: SetTaskNameAction) {
		if (this.newPath !== newAction.newPath) {
			return false;
		}
		// If both actions add one symbol or both remove 1 symbol then combine into one
		const deltaLeft = this.newName.length - this.oldName!.length;
		const deltaRight = newAction.newName.length - this.newName.length;
		return deltaLeft === deltaRight;
	}
}

export class SetTaskPriorityAction implements Action {
	private taskId: TaskId;
	private newPriority: number;
	private oldPriority?: number;

	constructor(taskId: TaskId, newPriority: number) {
		this.taskId = taskId;
		this.newPriority = newPriority;
	}

	do(data: ProjectData) {
		this.oldPriority = data.getTask(this.taskId).priority;
		data.setPriority(this.taskId, this.newPriority);
	}

	undo(data: ProjectData) {
		if (this.oldPriority === undefined) {
			throw new Error();
		}
		data.setPriority(this.taskId, this.oldPriority);
		this.oldPriority = undefined;
	}
}

export class ChangeParentAction implements Action {
	private taskId: TaskId;
	private newParentId: TaskId;
	private oldParentId?: TaskId;
	private oldPriority?: number;

	constructor(taskId: TaskId, newParentId: number) {
		this.taskId = taskId;
		this.newParentId = newParentId;
	}

	do(data: ProjectData) {
		this.oldParentId = data.getTask(this.taskId).parentId;
		this.oldPriority = data.getTask(this.taskId).priority;
		// Insert at the beginning of the new parent's children.
		data.reparentChild(this.taskId, this.newParentId, 0);
	}

	undo(data: ProjectData) {
		if (this.oldParentId === undefined || this.oldPriority === undefined) {
			throw new Error();
		}
		// Restore the task to its exact original slot among its old siblings.
		data.reparentChild(this.taskId, this.oldParentId, this.oldPriority);
		this.oldParentId = undefined;
		this.oldPriority = undefined;
	}
}

export class SetTaskHiddenAction implements Action {
	private taskId: TaskId;
	private value: boolean;

	constructor(taskId: TaskId, value: boolean) {
		this.taskId = taskId;
		this.value = value;
	}

	do(data: ProjectData): void {
		data.getTask(this.taskId).hidden = this.value;
	}

	undo(data: ProjectData): void {
		data.getTask(this.taskId).hidden = !this.value;
	}
}

export class AddBlockerPairAction implements Action {
	private blockerPair: BlockerPair;

	constructor(blockerPair: BlockerPair) {
		this.blockerPair = blockerPair;
	}

	do(data: ProjectData): void {
		data.addBlockerPair(this.blockerPair);
	}

	undo(data: ProjectData): void {
		data.removeBlockerPair(this.blockerPair);
	}
}

export class RemoveBlockerPairAction implements Action {
	private blockerPair: BlockerPair;

	constructor(blockerPair: BlockerPair) {
		this.blockerPair = blockerPair;
	}

	do(data: ProjectData): void {
		data.removeBlockerPair(this.blockerPair);
	}

	undo(data: ProjectData): void {
		data.addBlockerPair(this.blockerPair);
	}
}
