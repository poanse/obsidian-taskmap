import {
	type BlockerPair,
	StatusCode,
	type TaskData,
	type TaskId,
} from "../types";
import { SvelteMap } from "svelte/reactivity";
import { NoTaskId, RootTaskId } from "../NodePositionsCalculator";
import type { ProjectFileParsed } from "./ProjectDataSchema";

export class ProjectData {
	tasks = new SvelteMap<TaskId, TaskData>();
	childrenCache = new SvelteMap<TaskId, TaskId[]>();
	ancestorsCache = new SvelteMap<TaskId, TaskId[]>();
	descendantsCache = new SvelteMap<TaskId, TaskId[]>();
	tasksVersion = $state(0);
	blockerPairs = $state(new Array<BlockerPair>());
	folderPath: string | undefined;
	curTaskId = RootTaskId;

	public static getDefault(): ProjectData {
		return new ProjectData({
			tasks: new Array<TaskData>(),
			blockerPairs: new Array<BlockerPair>(),
			folderPath: undefined,
			curTaskId: 0,
		});
	}

	constructor(obj: ProjectFileParsed) {
		this.tasks = new SvelteMap(
			obj.tasks.map((task) => [task.taskId, task]),
		);
		if (this.tasks.size == 0) {
			this.addRootTask();
		}
		this.rebuildCaches();
		this.blockerPairs = obj.blockerPairs ?? [];
		this.folderPath = obj.folderPath;
		this.curTaskId = obj.curTaskId;
	}

	public markTasksUpdated() {
		this.tasksVersion += 1;
	}

	private rebuildCaches() {
		// Order matters: descendants rely on ancestors, and ancestors rely on children.
		this.rebuildChildrenCache();
		this.rebuildAncestorsCache();
		this.rebuildDescendantsCache();
	}

	private rebuildChildrenCache() {
		this.childrenCache = new SvelteMap<TaskId, TaskId[]>();
		for (const task of this.getTasks()) {
			const children = this.childrenCache.get(task.parentId) ?? [];
			children.push(task.taskId);
			this.childrenCache.set(task.parentId, children);
		}
	}

	// Rebuild ancestors by traversing childrenCache top-down from root.
	private rebuildAncestorsCache() {
		this.ancestorsCache = new SvelteMap<TaskId, TaskId[]>();
		const queue: TaskId[] = [RootTaskId];

		while (queue.length > 0) {
			const taskId = queue.shift();
			if (taskId === undefined) {
				continue;
			}
			const task = this.getTask(taskId);
			if (task.depth === 0) {
				this.ancestorsCache.set(taskId, []);
			} else {
				const parentAncestors =
					this.ancestorsCache.get(task.parentId) ?? [];
				this.ancestorsCache.set(taskId, [
					task.parentId,
					...parentAncestors,
				]);
			}
			queue.push(...(this.childrenCache.get(taskId) ?? []));
		}
	}

	private rebuildDescendantsCache() {
		this.descendantsCache = new SvelteMap<TaskId, TaskId[]>();

		for (const task of this.getTasks()) {
			this.descendantsCache.set(task.taskId, [task.taskId]);
		}

		for (const taskId of this.tasks.keys()) {
			for (const ancestorId of this.getAncestorIds(taskId)) {
				const descendants = this.descendantsCache.get(ancestorId);
				if (descendants !== undefined) {
					descendants.push(taskId);
				}
			}
		}
	}

	public addTask(task: TaskData) {
		this.tasks.set(task.taskId, task);
		this.rebuildCaches();
		this.markTasksUpdated();
		this.curTaskId++;
	}

	public removeTask(taskId: TaskId) {
		this.tasks.delete(taskId);
		this.rebuildCaches();
		this.markTasksUpdated();
		this.curTaskId--;
	}

	public addRootTask() {
		const task = {
			taskId: this.curTaskId,
			parentId: NoTaskId,
			status: StatusCode.IN_PROGRESS,
			name: "root",
			priority: 0,
			depth: 0,
			deleted: false,
			hidden: false,
		};
		this.addTask(task);
	}

	public getDescendantIds(taskId: number) {
		return this.descendantsCache.get(taskId) ?? [taskId];
	}

	public getAncestors(taskId: number) {
		return this.getAncestorIds(taskId).map((id) => this.getTask(id));
	}

	public getAncestorIds(taskId: number) {
		return [...(this.ancestorsCache.get(taskId) ?? [])];
	}

	public isAncestorOf(taskId: TaskId, candidate: TaskId) {
		return this.getAncestorIds(taskId).includes(candidate);
	}

	public isDescendantOf(taskId: TaskId, candidate: TaskId) {
		return this.getDescendantIds(taskId).includes(candidate);
	}

	public getChildren(taskId: number, includeDeleted: boolean = false) {
		const childIds = this.childrenCache.get(taskId) ?? [];
		if (includeDeleted) {
			return [...childIds];
		}
		return childIds.filter((id) => !this.getTask(id).deleted);
	}

	public getTask(taskId: number) {
		const res = this.tasks.get(taskId);
		if (res) {
			return res;
		} else {
			throw new Error(`No task found with id ${taskId}`);
		}
	}

	public getTasks(includeDeleted: boolean = false) {
		return [...this.tasks.values()].filter(
			(t) => includeDeleted || !t.deleted,
		);
	}

	public isTaskDeleted(taskId: number) {
		return this.getTask(taskId).deleted;
	}

	public changeParent(taskId: TaskId, newParentId: TaskId) {
		const taskData = this.getTask(taskId);
		const oldParentId = taskData.parentId;
		taskData.parentId = newParentId;
		this.rebuildCaches();
		this.recalcStatusRecursive(oldParentId);
		this.recalcStatusRecursive(newParentId);
		this.getDescendantIds(taskId).forEach((taskId) => {
			const task = this.getTask(taskId);
			task.depth = this.getTask(task.parentId).depth + 1;
		});
	}

	public recalcStatusRecursive(taskId: TaskId) {
		if (taskId == RootTaskId) {
			return;
		}
		const task = this.getTask(taskId);
		if (task.status == StatusCode.DRAFT) {
			return;
		}
		task.status = this.calculateStatus(taskId);
		this.recalcStatusRecursive(task.parentId);
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

	public getFolderPath = (): string | undefined => {
		return this.folderPath;
	};

	public setFolderPath = (path: string | undefined) => {
		this.folderPath = path === "" ? undefined : path;
	};
}
