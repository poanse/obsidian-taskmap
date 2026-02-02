import {
	type BlockerPair,
	StatusCode,
	type TaskData,
	type TaskId,
} from "./types";
import { NoTaskId, RootTaskId } from "./NodePositionsCalculator";
import { serializeProjectData } from "./SaveManager";

export class ProjectData {
	tasks = $state(new Array<TaskData>());
	blockerPairs = $state(new Array<BlockerPair>());
	curTaskId = RootTaskId;

	public static getDefault(): ProjectData {
		return new ProjectData({
			tasks: new Array<TaskData>(),
			blockerPairs: new Array<BlockerPair>(),
			curTaskId: 0,
		});
	}

	constructor(obj: {
		tasks: TaskData[];
		blockerPairs?: BlockerPair[];
		curTaskId: number;
	}) {
		this.tasks = obj.tasks;
		this.blockerPairs = obj.blockerPairs ?? [];
		this.curTaskId = obj.curTaskId;
		if (this.tasks.length == 0) {
			this.addRootTask();
		}
	}

	public addRootTask() {
		this.tasks.push({
			taskId: this.curTaskId,
			parentId: NoTaskId,
			status: StatusCode.IN_PROGRESS,
			name: "root",
			priority: 0,
			depth: 0,
			deleted: false,
			hidden: false,
		});
		this.curTaskId++;
	}

	public addTask(parentId: TaskId) {
		const childrenCount = this.getChildren(parentId).length;
		const id = this.curTaskId;
		this.tasks.push({
			taskId: id,
			parentId: parentId,
			status: StatusCode.READY,
			name: "default",
			deleted: false,
			hidden: false,
			priority: childrenCount,
			depth: this.getTask(parentId).depth + 1,
		});
		this.curTaskId++;
		this.recalculateStatusRecursive(parentId);
		return id;
	}

	public removeTaskSingle(id: number) {
		const task = this.getTask(id);
		const parentTask = this.getTask(task.parentId);
		task.deleted = true;
		this.getChildren(id).forEach((taskId) => {
			const t = this.getTask(taskId);
			t.parentId = parentTask.taskId;
			t.depth = parentTask.depth + 1;
		});
		this.recalcPriorities(task.parentId);
		this.recalculateStatusRecursive(task.parentId);
	}

	public removeTaskBranch(id: number) {
		this.getDescendantIds(id).forEach(
			(taskId) => (this.getTask(taskId).deleted = true),
		);
		const parentId = this.getTask(id).parentId;
		this.recalcPriorities(parentId);
		this.recalculateStatusRecursive(parentId);
	}

	public getDescendantIds(taskId: number, includeDeleted: boolean = false) {
		const tasks = [taskId];
		const result: TaskId[] = [];
		while (tasks.length > 0) {
			let task = tasks.pop();
			if (task === undefined) {
				break;
			}
			result.push(task);
			tasks.push(...this.getChildren(task, includeDeleted));
		}
		return result;
	}

	public getAncestors(taskId: number) {
		const res: TaskData[] = [];
		let task = this.getTask(taskId);
		while (task.depth != 0) {
			task = this.getTask(task.parentId);
			res.push(task);
		}
		return res;
	}

	public isAncestorOf(taskId: TaskId, candidate: TaskId) {
		return this.getAncestors(taskId)
			.map((t) => t.taskId)
			.contains(candidate);
	}

	public isDescendentOf(taskId: TaskId, candidate: TaskId) {
		return this.getDescendantIds(taskId).contains(candidate);
	}

	public getChildren(taskId: number, includeDeleted: boolean = false) {
		let res = this.tasks.filter((t) => t.parentId === taskId);
		if (!includeDeleted) {
			res = res.filter((t) => !t.deleted);
		}
		return res.map((t) => t.taskId);
	}

	public getTask(taskId: number) {
		const res = this.tasks.find((t) => t.taskId == taskId);
		if (res) {
			return res!;
		} else {
			throw new Error(`No task found with id ${taskId}`);
		}
	}

	public isTaskDeleted(taskId: number) {
		return this.getTask(taskId).deleted;
	}

	public isBranchHidden(id: number) {
		return this.getAncestors(id).some((t) => t.hidden);
	}

	public toggleHidden(id: number) {
		const task = this.getTask(id);
		task.hidden = !task.hidden;
	}

	public getTaskStatus(taskId: number) {
		return this.getTask(taskId)!.status;
	}

	public getTaskName(taskId: number) {
		return this.getTask(taskId)!.name;
	}

	public setTaskStatus(taskId: number, status: StatusCode) {
		const task = this.getTask(taskId);
		task.status = status;
		this.recalculateStatusRecursive(task.parentId);
	}

	public changeParent(taskId: TaskId, newParentId: TaskId) {
		const taskData = this.getTask(taskId);
		const oldParentId = taskData.parentId;
		taskData.parentId = newParentId;
		this.recalculateStatusRecursive(oldParentId);
		this.recalculateStatusRecursive(newParentId);
		[taskId, ...this.getDescendantIds(taskId)].forEach((taskId) => {
			const task = this.getTask(taskId);
			task.depth = this.getTask(task.parentId).depth + 1;
		});
	}

	public recalculateStatusRecursive(taskId: TaskId) {
		if (taskId == RootTaskId) {
			return;
		}
		const task = this.getTask(taskId);
		if (task.status == StatusCode.DRAFT) {
			return;
		}
		task.status = this.calculateStatus(taskId);
		this.recalculateStatusRecursive(task.parentId);
	}

	public calculateStatus(taskId: TaskId) {
		const children = this.getChildren(taskId).map((x) => this.getTask(x));
		if (children.length === 0) {
			return this.getTask(taskId).status;
		}
		const counts = [0, 0, 0, 0];
		children.forEach((t) => (counts[t.status] += 1));
		if (counts[StatusCode.DONE] == children.length) {
			return StatusCode.DONE;
		} else if (counts[StatusCode.DONE] > 0) {
			return StatusCode.IN_PROGRESS;
		} else if (counts[StatusCode.IN_PROGRESS] > 0) {
			return StatusCode.IN_PROGRESS;
		} else if (counts[StatusCode.DRAFT] == children.length) {
			return StatusCode.DRAFT;
		} else if (counts[StatusCode.READY] == children.length) {
			return StatusCode.READY;
		} else {
			return StatusCode.READY;
		}
	}

	public setTaskName(taskId: number, name: string) {
		const task = this.getTask(taskId);
		if (task) {
			task.name = name;
		}
	}

	public setPriority(taskId: TaskId, newPriority: number) {
		const task = this.getTask(taskId);
		const oldPriority = task.priority;
		task.priority = newPriority;
		this.getChildren(task.parentId)
			.filter((t) => t != taskId)
			.forEach((child) => {
				const childTask = this.getTask(child);
				const childPriority = childTask.priority;
				if (
					newPriority > oldPriority &&
					childPriority >= oldPriority &&
					childPriority <= newPriority
				) {
					childTask.priority -= 1;
				} else if (
					newPriority < oldPriority &&
					childPriority >= newPriority &&
					childPriority <= oldPriority
				) {
					childTask.priority += 1;
				}
			});
	}

	public recalcPriorities(parentId: TaskId) {
		this.getChildren(parentId)
			.map((tId) => this.getTask(tId))
			.sort((a, b) => a.priority - b.priority)
			.forEach((t, idx) => {
				t.priority = idx;
			});
	}

	public containsBlockerPair = (blockerPair: BlockerPair) => {
		return this.blockerPairs.some(
			(p) =>
				p.blocked === blockerPair.blocked &&
				p.blocker === blockerPair.blocker,
		);
	};

	public removeBlockerPair = (blockerPair: BlockerPair) => {
		this.blockerPairs = this.blockerPairs.filter(
			(p) =>
				!(
					p.blocker === blockerPair.blocker &&
					p.blocked === blockerPair.blocked
				),
		);
	};

	public addBlockerPair = (blockerPair: BlockerPair) => {
		this.blockerPairs.push(blockerPair);
	};
}

export const DEFAULT_DATA = serializeProjectData(ProjectData.getDefault());
