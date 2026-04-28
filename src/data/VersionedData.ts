import { HistoryManager } from "./HistoryManager.svelte";
import { type BlockerPair, StatusCode, type TaskId } from "../types";
import { ProjectData } from "./ProjectData.svelte";
import {
	AddTaskAction,
	SetTaskHiddenAction,
	RemoveTaskBranchAction,
	RemoveTaskSingleAction,
	SetTaskPriorityAction,
	SetTaskStatusAction,
	AddBlockerPairAction,
	RemoveBlockerPairAction,
	ChangeParentAction,
	SetTaskNameAction,
} from "./Action";

export class VersionedData {
	private data: ProjectData;
	private history: HistoryManager;

	constructor(data: ProjectData, history: HistoryManager) {
		this.data = data;
		this.history = history;
	}

	public undo = () => {
		if (this.history.canUndo()) {
			this.history.undo(this.data);
		}
	};

	public redo = () => {
		if (this.history.canRedo()) {
			this.history.redo(this.data);
		}
	};

	public canUndo = () => {
		return this.history.canUndo();
	};

	public canRedo = () => {
		return this.history.canRedo();
	};

	public addBlockerPair = (blockerPair: BlockerPair) => {
		this.history.execute(new AddBlockerPairAction(blockerPair), this.data);
	};

	public removeBlockerPair = (blockerPair: BlockerPair) => {
		this.history.execute(
			new RemoveBlockerPairAction(blockerPair),
			this.data,
		);
	};

	public getBlockerPairs = () => {
		return this.data.blockerPairs;
	};

	public addTask = (parentId: TaskId) => {
		this.history.execute(new AddTaskAction(parentId), this.data);
	};

	public removeTaskSingle = (taskId: TaskId) => {
		this.history.execute(new RemoveTaskSingleAction(taskId), this.data);
	};

	public removeTaskBranch = (taskId: TaskId) => {
		this.history.execute(new RemoveTaskBranchAction(taskId), this.data);
	};

	public setStatus = (taskId: TaskId, status: StatusCode) => {
		this.history.execute(
			new SetTaskStatusAction(taskId, status),
			this.data,
		);
	};

	public setPriority = (taskId: TaskId, priority: number) => {
		this.history.execute(
			new SetTaskPriorityAction(taskId, priority),
			this.data,
		);
	};

	public setHidden = (taskId: TaskId, value: boolean) => {
		this.history.execute(new SetTaskHiddenAction(taskId, value), this.data);
	};

	public toggleHidden = (taskId: TaskId) => {
		const task = this.getTask(taskId);
		this.history.execute(
			new SetTaskHiddenAction(taskId, !task.hidden),
			this.data,
		);
	};

	public setName = (
		taskId: TaskId,
		value: string,
		path: string | undefined,
	) => {
		const lastAction = this.history.lastAction();
		const newAction = new SetTaskNameAction(taskId, value, path);
		if (
			lastAction instanceof SetTaskNameAction &&
			lastAction.shouldCombine(newAction)
		) {
			this.history.undo(this.data);
			this.history.execute(
				new SetTaskNameAction(taskId, value, path),
				this.data,
			);
		} else {
			this.history.execute(newAction, this.data);
		}
	};

	public changeParent = (taskId: TaskId, newParentId: TaskId) => {
		this.history.execute(
			new ChangeParentAction(taskId, newParentId),
			this.data,
		);
	};

	public getFolderPath = (): string | undefined => {
		return this.data.getFolderPath();
	};

	public setFolderPath = (path: string | undefined) => {
		this.data.setFolderPath(path);
	};

	public getTasks = (includeDeleted = false) => {
		return this.data.getTasks(includeDeleted);
	};

	public getTasksVersion = () => {
		return this.data.tasksVersion;
	};

	public getTask = (taskId: TaskId) => {
		return this.data.getTask(taskId);
	};

	public getTaskOption = (taskId: TaskId) => {
		return this.data.tasks.get(taskId);
	};

	public getChildren = (taskId: TaskId, includeDeleted?: boolean) => {
		return this.data.getChildren(taskId, includeDeleted);
	};

	public getAncestors = (taskId: TaskId) => {
		return this.data.getAncestors(taskId);
	};

	public getAncestorIds = (taskId: TaskId) => {
		return this.data.getAncestorIds(taskId);
	};

	public getDescendantIds = (taskId: TaskId) => {
		return this.data.getDescendantIds(taskId);
	};

	public isAncestorOf = (taskId: TaskId, candidate: TaskId) => {
		return this.data.isAncestorOf(taskId, candidate);
	};

	public isDescendantOf = (taskId: TaskId, candidate: TaskId) => {
		return this.data.isDescendantOf(taskId, candidate);
	};

	public containsBlockerPair = (blockerPair: BlockerPair) => {
		return this.data.containsBlockerPair(blockerPair);
	};

	public isTaskBlocked = (taskId: TaskId) => {
		if (this.getTask(taskId).status === StatusCode.DONE) {
			return false;
		}
		return this.data.blockerPairs
			.filter((p) => p.blocked === taskId)
			.map((p) => this.getTask(p.blocker))
			.filter((blockerTask) => !blockerTask.deleted)
			.some((blockerTask) => blockerTask.status !== StatusCode.DONE);
	};

	public isTaskBlocking = (taskId: TaskId) => {
		if (this.getTask(taskId).status === StatusCode.DONE) {
			return false;
		}
		return this.data.blockerPairs
			.filter((p) => p.blocker === taskId)
			.map((p) => this.getTask(p.blocked))
			.filter((blockedTask) => !blockedTask.deleted)
			.some((blockedTask) => blockedTask.status !== StatusCode.DONE);
	};

	public isBranchHidden(id: number) {
		return this.getAncestors(id).some((t) => t.hidden);
	}

	public calculateStatus = (taskId: TaskId) => {
		return this.data.calculateStatus(taskId);
	};
}
