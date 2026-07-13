import {
	type BlockerPair,
	StatusCode,
	type TaskData,
	type TaskId,
	type Vector2,
} from "../types";
import { SvelteMap } from "svelte/reactivity";
import { NoTaskId, RootTaskId } from "../NodePositionsCalculator";
import {
	TASKMAP_FILE_SCHEMA_VERSION,
	type ProjectFileParsed,
} from "./ProjectDataSchema";

export class ProjectData {
	// cannot use just SvelteMap<TaskId, Task> because it breaks reactivity
	tasks: Array<TaskData>;
	taskIndexCache = new SvelteMap<TaskId, number>();
	childrenCache = new SvelteMap<TaskId, TaskId[]>();
	ancestorsCache = new SvelteMap<TaskId, TaskId[]>();
	descendantsCache = new SvelteMap<TaskId, TaskId[]>();
	tasksViewUpdateCounter: number;
	connectionsViewUpdateCounter: number;
	blockerPairs: Array<BlockerPair>;
	folderPath: string | undefined;
	curTaskId = RootTaskId;
	taskSizeOverrides: SvelteMap<TaskId, Vector2>;

	public static getDefault(): ProjectData {
		return new ProjectData({
			schemaVersion: TASKMAP_FILE_SCHEMA_VERSION,
			tasks: new Array<TaskData>(),
			blockerPairs: new Array<BlockerPair>(),
			folderPath: undefined,
			curTaskId: 0,
			taskSizeOverrides: [],
		});
	}

	constructor(obj: ProjectFileParsed) {
		// persistent data from disk
		this.tasks = $state(obj.tasks);
		this.blockerPairs = $state(obj.blockerPairs ?? []);
		this.folderPath = obj.folderPath;
		this.curTaskId = obj.curTaskId;
		this.taskSizeOverrides = new SvelteMap(
			(obj.taskSizeOverrides ?? []).map(({ taskId, x, y }) => [
				taskId,
				{ x, y },
			]),
		);
		// temporary in-memory properties
		this.tasksViewUpdateCounter = $state(0);
		this.connectionsViewUpdateCounter = $state(0);
		// root task must always be present
		if (this.tasks.length == 0) {
			this.addRootTask();
		}
		// initialize auxiliary data structures
		this.rebuildCaches();
		// fix broken priorities in old project versions
		if ((obj.schemaVersion ?? 0) < TASKMAP_FILE_SCHEMA_VERSION) {
			this.tasks.forEach((t) => this.recalcPriorities(t.taskId));
		}
	}

	public updateTasksView() {
		this.tasksViewUpdateCounter += 1;
		this.updateConnectionsView();
	}

	public updateConnectionsView() {
		this.connectionsViewUpdateCounter += 1;
	}

	private rebuildCaches() {
		this.taskIndexCache.clear();
		this.tasks.forEach((value, index) => {
			this.taskIndexCache.set(value.taskId, index);
		});
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
		this.tasks.push(task);
		this.rebuildCaches();
		this.updateTasksView();
		this.curTaskId++;
	}

	public removeTask() {
		const task = this.tasks.pop();
		if (task) {
			this.rebuildCaches();
			this.updateTasksView();
			this.curTaskId--;
		}
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
		const res = this.tasks[this.taskIndexCache.get(taskId)!];
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

	// Normalize a parent's child priorities and refresh its status upward.
	public recalcParent(parentId: TaskId) {
		this.recalcPriorities(parentId);
		this.recalcStatusRecursive(parentId);
	}

	public reparentChild(
		taskId: TaskId,
		newParentId: TaskId,
		insertPriority?: number,
	) {
		this.reparentChildren([taskId], newParentId, insertPriority);
	}

	/**
	 * Reparent tasks under newParentId with a single cache rebuild. Updates
	 * subtree depths and inserts the batch into the new parent's priority
	 * ordering, preserving the batch's own relative order while existing
	 * siblings shift to make room. When insertPriority is omitted the batch is
	 * appended after the current siblings.
	 *
	 * When taskIds is empty, recalcParent runs for newParentId and its parent.
	 */
	public reparentChildren(
		taskIds: TaskId[],
		newParentId: TaskId,
		insertPriority?: number,
	) {
		const oldParentIds: TaskId[] = [];
		for (const taskId of taskIds) {
			const parentId = this.getTask(taskId).parentId;
			if (!oldParentIds.includes(parentId)) {
				oldParentIds.push(parentId);
			}
		}
		if (taskIds.length > 0) {
			// Capture the batch's relative order before assigning new priorities.
			const ordered = [...taskIds].sort(
				(a, b) => this.getTask(a).priority - this.getTask(b).priority,
			);
			for (const taskId of taskIds) {
				this.getTask(taskId).parentId = newParentId;
			}
			this.rebuildCaches();
			for (const taskId of taskIds) {
				this.getDescendantIds(taskId).forEach((descendantId) => {
					const descendant = this.getTask(descendantId);
					descendant.depth =
						this.getTask(descendant.parentId).depth + 1;
				});
			}
			const siblings = this.getChildren(newParentId).filter(
				(id) => !taskIds.includes(id),
			);
			const insertAt =
				insertPriority ??
				siblings.reduce(
					(max, id) => Math.max(max, this.getTask(id).priority + 1),
					0,
				);
			siblings.forEach((id) => {
				const sibling = this.getTask(id);
				if (sibling.priority >= insertAt) {
					sibling.priority += taskIds.length;
				}
			});
			ordered.forEach((id, idx) => {
				this.getTask(id).priority = insertAt + idx;
			});
		}
		const parentsToRecalc: TaskId[] = [];
		const addParent = (parentId: TaskId) => {
			if (!parentsToRecalc.includes(parentId)) {
				parentsToRecalc.push(parentId);
			}
		};
		addParent(newParentId);
		oldParentIds.forEach(addParent);
		if (taskIds.length === 0) {
			const parentId = this.getTask(newParentId).parentId;
			if (parentId !== NoTaskId) {
				addParent(parentId);
			}
		}
		for (const parentId of parentsToRecalc) {
			this.recalcParent(parentId);
		}
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

	public setTaskSizeOverride(taskId: TaskId, size: Vector2) {
		this.taskSizeOverrides.set(taskId, size);
	}

	public deleteTaskSizeOverride(taskId: TaskId) {
		this.taskSizeOverrides.delete(taskId);
	}

	public getTaskSizeOverride(taskId: TaskId): Vector2 | undefined {
		return this.taskSizeOverrides.get(taskId);
	}

	public hasTaskSizeOverride(taskId: TaskId): boolean {
		return this.taskSizeOverrides.has(taskId);
	}

	public getFolderPath = (): string | undefined => {
		return this.folderPath;
	};

	public setFolderPath = (path: string | undefined) => {
		this.folderPath = path === "" ? undefined : path;
	};
}
