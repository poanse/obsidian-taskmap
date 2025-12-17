import { StatusCode, type TaskData } from "./types";
import TaskmapPlugin from "./main";

export class ProjectData {
	tasks = $state(new Array<TaskData>());
	curTaskId = 0;

	public static getDefault(): ProjectData {
		return new ProjectData({
			tasks: new Array<TaskData>(),
			curTaskId: 0,
		});
	}

	public serialize() {
		return JSON.stringify(
			{ tasks: this.tasks, curTaskId: this.curTaskId },
			null,
			2,
		);
	}

	constructor(obj: { tasks: TaskData[]; curTaskId: number }) {
		this.tasks = obj.tasks;
		this.curTaskId = obj.curTaskId;
		if (this.tasks.length == 0) {
			this.addTask();
		}
	}

	public addTask() {
		const id = this.curTaskId;
		this.tasks.push({
			taskId: id,
			status: StatusCode.DRAFT,
			name: "default",
			deleted: false,
		});
		this.curTaskId += 1;
		return id;
	}

	public removeTask(id: number) {
		const t = this.getTask(id);
		t.deleted = true;
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

	public getTaskStatus(taskId: number) {
		return this.getTask(taskId)!.status;
	}
	public getTaskName(taskId: number) {
		return this.getTask(taskId)!.name;
	}
	public setTaskStatus(taskId: number, status: StatusCode) {
		const task = this.getTask(taskId);
		if (task) {
			task.status = status;
		}
	}
	public setTaskName(taskId: number, name: string) {
		const task = this.getTask(taskId);
		if (task) {
			task.name = name;
		}
	}
}

export const DEFAULT_DATA = ProjectData.getDefault().serialize();
