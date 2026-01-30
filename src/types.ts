import type { EasingFunction } from "svelte/transition";

export enum IconCode {
	REMOVE,
	KEY,
	LOCK,
	FOCUS,
	REPARENT,
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

export const isStatusCode = (s: IconCode) => {
	return [
		IconCode.STATUS_READY,
		IconCode.STATUS_DRAFT,
		IconCode.STATUS_DONE,
		IconCode.STATUS_IN_PROGRESS,
	].contains(s);
};

export const classStringFromStatusCode = (code: StatusCode) => {
	switch (code) {
		case StatusCode.READY:
			return "ready";
		case StatusCode.IN_PROGRESS:
			return "in-progress";
		case StatusCode.DRAFT:
			return "draft";
		case StatusCode.DONE:
			return "done";
		default:
			return "";
	}
};

export const toIconCode = (s: StatusCode) => {
	return (s + IconCode.STATUS_DRAFT) as number as IconCode;
};

export const toStatusCode = (s: IconCode) => {
	if (s == IconCode.STATUS_DRAFT) {
		return StatusCode.DRAFT;
	} else if (s == IconCode.STATUS_READY) {
		return StatusCode.READY;
	} else if (s == IconCode.STATUS_IN_PROGRESS) {
		return StatusCode.IN_PROGRESS;
	} else if (s == IconCode.STATUS_DONE) {
		return StatusCode.DONE;
	} else {
		throw new Error(`Incorrect icon code - not a status: ${s}`);
	}
};

export interface Vector2 {
	x: number;
	y: number;
}
export type TaskId = number;

export type TaskData = {
	name: string;
	path?: string | undefined | null;
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

export type BlockerPair = {
	blocker: TaskId;
	blocked: TaskId;
};
