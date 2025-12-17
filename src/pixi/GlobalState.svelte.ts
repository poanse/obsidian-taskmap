import TaskmapPlugin from "../main";
import type { ProjectData } from "../ProjectData.svelte";
import { StatusCode } from "../types";
import { Spring } from "svelte/motion";
import type { App } from "obsidian";
import type { TaskmapView } from "../TaskmapView";

export class UIState {
	app: App;
	pressedButtonIndex = $state(-1);
	selectedTaskId = $state(-1);
	toolbarStatus = $state(StatusCode.DRAFT);
	projectData: ProjectData;
	taskPositions: Array<{
		taskId: number;
		tween: Spring<{ x: number; y: number }>;
	}>;
	// svg elements are pixelated zooming from scale < 1 to scale > 1, so we force a redraw manually
	updateOnZoomCounter = $state(0);

	// parameters for animating task movement
	private tweenOptions = { duration: 300 };
	private springOptions = { stiffness: 0.07, damping: 0.7 };

	constructor(projectData: ProjectData, app: App) {
		this.app = app;
		this.projectData = projectData;
		const posArray = projectData.tasks
			.filter((t) => !t.deleted)
			.map((task) => {
				const t = new Spring(
					this.calcTaskPosition(task.taskId),
					this.springOptions,
				);
				return { taskId: task.taskId, tween: t };
			});
		this.taskPositions = posArray;
	}

	public incrementUpdateOnZoomCounter(): void {
		this.updateOnZoomCounter += 1;
	}

	public updateTaskPositions() {
		this.taskPositions.forEach((taskPos) => {
			taskPos.tween.target = this.calcTaskPosition(taskPos.taskId);
		});
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

	// can be called from any component
	public save() {
		const x = TaskmapPlugin.getActiveView();
		if (x != null) {
			x.debouncedSave();
			console.log("saved");
		}
	}

	public getActiveView(): TaskmapView {
		const x = TaskmapPlugin.getActiveView();
		if (x) {
			return x;
		} else {
			throw new Error("Unable to get active view");
		}
	}

	public addTask() {
		const id = this.projectData.addTask();
		this.taskPositions.push({
			taskId: id,
			tween: new Spring(this.calcTaskPosition(id), this.springOptions),
		});
		this.save();
	}

	public removeTask(id: number) {
		this.setSelectedTaskId(-1);
		this.projectData.removeTask(id);
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

	private calcTaskPosition(taskId: number) {
		const base_position = { x: 200, y: 500 };
		const idx = this.projectData.tasks
			.filter((t) => !t.deleted)
			.findIndex((t) => t.taskId == taskId);
		return {
			x: base_position.x + 200 * idx,
			y: base_position.y + 200 * idx,
		};
	}

	public getCurrentTaskPosition(taskId: number) {
		const pos = this.taskPositions.find((t) => t.taskId === taskId)!.tween
			.current;
		if (taskId == 5) {
			console.log(JSON.stringify(pos));
		}
		return pos;
	}

	public serializeForDebugging() {
		return JSON.stringify({
			pressedButtonIndex: this.pressedButtonIndex,
			selectedTaskId: this.selectedTaskId,
			toolbarStatus: this.toolbarStatus,
			projectData: this.projectData,
		});
	}
}
