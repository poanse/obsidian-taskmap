import type { ProjectData } from "./ProjectData.svelte";
import { UIState } from "./pixi/GlobalState.svelte";
import type { EasingFunction } from "svelte/transition";

export enum IconCode {
	TRASH,
	KEY,
	LOCK,
	FOCUS,
	STATUS,
	TRASH_SINGLE,
	TRASH_MULTIPLE,
	STATUS_DRAFT,
	STATUS_READY,
	STATUS_IN_PROGRESS,
	STATUS_DONE,
}

export enum StatusCode {
	DRAFT,
	READY,
	IN_PROGRESS,
	DONE,
}

export type TaskData = {
	name: string;
	taskId: number;
	status: StatusCode;
	deleted: boolean;
};

export type Context = {
	uiState: UIState;
	projectData: ProjectData;
};

export interface SlideParamsCustom {
	delay?: number;
	duration?: number;
	easing?: EasingFunction;
	axis?: "x" | "y" | "-x" | "-y";
}
