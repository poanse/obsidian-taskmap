import TaskmapPlugin from "../main";
import type { ProjectData } from "../ProjectData.svelte";
import { StatusCode, type TaskId } from "../types";
import { Spring } from "svelte/motion";
import type { App } from "obsidian";
import type { TaskmapView } from "../TaskmapView";
import type { NodePositionsCalculator } from "../NodePositionsCalculator";

export class UIState {
	app: App;
	view: TaskmapView;
	nodePositionsCalculator: NodePositionsCalculator;
	pressedButtonIndex = $state(-1);
	selectedTaskId = $state(-1);
	toolbarStatus = $state(StatusCode.DRAFT);
	projectData: ProjectData;
	taskPositions: Array<{
		taskId: TaskId;
		tween: Spring<{ x: number; y: number }> | null;
	}>;
	// svg elements are pixelated zooming from scale < 1 to scale > 1, so we force a redraw manually
	updateOnZoomCounter = $state(0);

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

	public incrementUpdateOnZoomCounter(): void {
		this.updateOnZoomCounter += 1;
	}

	public updateTaskPositions() {
		const positions =
			this.nodePositionsCalculator.CalculatePositionsInGlobalFrame(
				this.projectData.tasks.filter((t) => !t.deleted),
				{ x: 0, y: 0 },
			);
		this.taskPositions.forEach((taskPos) => {
			const newPos = positions.get(taskPos.taskId);
			if (newPos === undefined) {
				throw new Error();
			}
			if (taskPos.tween === null) {
				taskPos.tween = new Spring(newPos, this.springOptions);
			}
			taskPos.tween.target = newPos;
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
		return this.view;
		// const x = TaskmapPlugin.getActiveView();
		// if (x) {
		// 	return x;
		// } else {
		// 	throw new Error("Unable to get active view");
		// }
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

	public removeTask(id: number) {
		this.setSelectedTaskId(-1);
		this.projectData.removeTask(id);
		this.taskPositions = this.taskPositions.filter((t) => t.taskId !== id);
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

	public getCurrentTaskPosition(taskId: number) {
		const pos = this.taskPositions.find((t) => t.taskId === taskId)!.tween!
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
