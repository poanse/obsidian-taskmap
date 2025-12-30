import type { EasingFunction } from "svelte/transition";

export enum IconCode {
	REMOVE,
	KEY,
	LOCK,
	FOCUS,
	CREATE_LINKED_NOTE,
	STATUS,
	REMOVE_SINGLE,
	REMOVE_MULTIPLE,
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

export const toIconCode = (s: StatusCode) => {
	return (s + IconCode.STATUS_DRAFT) as number as IconCode;
};

export interface Vector2 {
	x: number;
	y: number;
}
export type TaskId = number;

export type TaskData = {
	name: string;
	taskId: TaskId;
	status: StatusCode;
	deleted: boolean;
	parentId: TaskId;
	depth: number;
	priority: number;
	hidden: boolean;
};

export interface SlideParamsCustom {
	delay?: number;
	duration?: number;
	easing?: EasingFunction;
	axis?: "x" | "y" | "-x" | "-y";
}
export enum MouseDown {
	NONE = -1,
	LEFT = 0,
	MIDDLE = 1,
	RIGHT = 2,
}
