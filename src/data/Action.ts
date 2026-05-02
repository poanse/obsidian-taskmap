import { type BlockerPair, StatusCode, type TaskId } from "../types";
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
		const parentTask = data.getTask(task.parentId);
		task.deleted = true;
		this.children = data.getChildren(this.taskId);
		data.getChildren(task.parentId).forEach((taskId) => {
			const t = data.getTask(taskId);
			if (t.priority > task.priority) {
				t.priority += this.children!.length;
			}
		});
		this.children.forEach((taskId) => {
			const t = data.getTask(taskId);
			t.priority += task.priority;
			t.parentId = parentTask.taskId;
			t.depth = parentTask.depth + 1;
		});
		data.recalcPriorities(task.parentId);
		data.recalcStatusRecursive(task.parentId);
		data.markTasksUpdated();
	}

	undo(data: ProjectData) {
		if (this.children === undefined) {
			throw new Error();
		}
		const task = data.getTask(this.taskId);
		task.deleted = false;
		this.children.forEach((taskId) => {
			const t = data.getTask(taskId);
			t.parentId = task.taskId;
			t.depth = task.depth + 1;
		});
		data.recalcPriorities(task.parentId);
		data.recalcPriorities(task.taskId);
		data.recalcStatusRecursive(task.taskId);
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

	constructor(taskId: TaskId, newName: string, path?: string) {
		this.taskId = taskId;
		this.newName = newName;
		this.newPath = path;
	}

	do(data: ProjectData): void {
		this.oldName = data.getTask(this.taskId).name;
		this.oldPath = data.getTask(this.taskId).path;
		const task = data.getTask(this.taskId);
		task.name = this.newName;
		task.path = this.newPath;
	}

	undo(data: ProjectData): void {
		if (this.oldName === undefined) {
			throw new Error();
		}
		const task = data.getTask(this.taskId);
		task.name = this.oldName;
		task.path = this.oldPath;
		this.oldName = undefined;
		this.oldPath = undefined;
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

	constructor(taskId: TaskId, newParentId: number) {
		this.taskId = taskId;
		this.newParentId = newParentId;
	}

	do(data: ProjectData) {
		this.oldParentId = data.getTask(this.taskId).parentId;
		data.changeParent(this.taskId, this.newParentId);
	}

	undo(data: ProjectData) {
		if (this.oldParentId === undefined) {
			throw new Error();
		}
		data.changeParent(this.taskId, this.oldParentId);
		this.oldParentId = undefined;
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
