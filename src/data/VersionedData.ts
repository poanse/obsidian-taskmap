import { HistoryManager } from "./HistoryManager";
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
		this.history.execute(
			new SetTaskNameAction(taskId, value, path),
			this.data,
		);
	};

	public changeParent = (taskId: TaskId, newParentId: TaskId) => {
		this.history.execute(
			new ChangeParentAction(taskId, newParentId),
			this.data,
		);
	};

	public getTasks = (includeDeleted = false) => {
		return this.data.tasks.filter((t) => includeDeleted || !t.deleted);
	};

	public getTask = (taskId: TaskId) => {
		return this.data.getTask(taskId);
	};

	public getTaskOption = (taskId: TaskId) => {
		return this.data.tasks.find((t) => t.taskId == taskId) ?? null;
	};

	public getChildren = (taskId: TaskId, includeDeleted?: boolean) => {
		return this.data.getChildren(taskId, includeDeleted);
	};

	public getAncestors = (taskId: TaskId) => {
		return this.data.getAncestors(taskId);
	};

	public getDescendantIds = (taskId: TaskId, includeDeleted?: boolean) => {
		return this.data.getDescendantIds(taskId, includeDeleted);
	};

	public isAncestorOf = (taskId: TaskId, candidate: TaskId) => {
		return this.data.isAncestorOf(taskId, candidate);
	};

	public isDescendentOf = (taskId: TaskId, candidate: TaskId) => {
		return this.data.isDescendentOf(taskId, candidate);
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
			.some((p) => this.getTask(p.blocker).status !== StatusCode.DONE);
	};

	public isTaskBlocking = (taskId: TaskId) => {
		if (this.getTask(taskId).status === StatusCode.DONE) {
			return false;
		}
		return this.data.blockerPairs
			.filter((p) => p.blocker === taskId)
			.some((p) => this.getTask(p.blocked).status !== StatusCode.DONE);
	};

	public isBranchHidden(id: number) {
		return this.getAncestors(id).some((t) => t.hidden);
	}

	public calculateStatus = (taskId: TaskId) => {
		return this.data.calculateStatus(taskId);
	};
}
