/** Log-scale zoom step for one Ctrl/Cmd + Up or Down arrow press at 100% sensitivity. */
export const KEYBOARD_ZOOM_STEP = 0.2;

export type WheelAction = "pan" | "zoom-mouse" | "zoom-touchpad";

export interface WheelSample {
	ctrlKey: boolean;
	deltaMode: number;
	deltaX: number;
	deltaY: number;
	wheelDeltaY?: number;
}

const DOM_DELTA_PIXEL = 0;

/**
 * Two-finger trackpad scrolling pans. Mouse-wheel ticks and pinch gestures zoom.
 * Chromium reports a trackpad scroll as a pixel delta whose legacy wheelDeltaY
 * is exactly -3 times deltaY. A mouse wheel tick has a wheelDeltaY that is a
 * multiple of 120; on macOS its deltaY is accelerated and fractional (about 4
 * for a slow tick), so deltaY alone can't tell it from a trackpad.
 * Pinch-to-zoom arrives as a wheel event with ctrlKey set.
 */
export function wheelAction(event: WheelSample): WheelAction {
	if (!isMouseWheel(event)) {
		return event.ctrlKey ? "zoom-touchpad" : "pan";
	}
	return "zoom-mouse";
}

function isMouseWheel(event: WheelSample): boolean {
	if (event.deltaMode !== DOM_DELTA_PIXEL) {
		return true;
	}
	if (event.wheelDeltaY !== undefined && event.wheelDeltaY !== 0) {
		if (event.wheelDeltaY === -3 * event.deltaY) {
			return false;
		}
		if (event.wheelDeltaY % 120 === 0 && event.deltaX === 0) {
			return true;
		}
	}
	if (event.deltaX !== 0) {
		return false;
	}
	return Number.isInteger(event.deltaY) && Math.abs(event.deltaY) >= 50;
}

export function wheelDeltaYOf(event: WheelEvent): number | undefined {
	const value = (event as WheelEvent & { wheelDeltaY?: unknown }).wheelDeltaY;
	return typeof value === "number" ? value : undefined;
}

/**
 * Wheel deltas point opposite the fingers, so by default the map follows them;
 * reverse moves it the other way. Panzoom applies translation before scale,
 * so screen pixels are divided by the current scale.
 */
export function panDeltaFromWheel(
	deltaX: number,
	deltaY: number,
	scale: number,
	reverse: boolean,
): { x: number; y: number } {
	const divisor = scale === 0 ? 1 : scale;
	const sign = reverse ? 1 : -1;
	return { x: (sign * deltaX) / divisor, y: (sign * deltaY) / divisor };
}

/** Cmd on macOS, Ctrl elsewhere. Ctrl still works on macOS. */
export function usesCommandModifier(
	event: { ctrlKey: boolean; metaKey: boolean },
	isMac: boolean,
): boolean {
	if (isMac) {
		return event.metaKey || event.ctrlKey;
	}
	return event.ctrlKey && !event.metaKey;
}

/** 1 zooms in, -1 zooms out, null is not a zoom key. */
export function zoomKeyDirection(event: { key: string }): 1 | -1 | null {
	if (event.key === "ArrowUp") {
		return 1;
	}
	if (event.key === "ArrowDown") {
		return -1;
	}
	return null;
}

/** sensitivity is a percentage of KEYBOARD_ZOOM_STEP. */
export function scaleAfterKeyboardZoom(
	scale: number,
	direction: 1 | -1,
	sensitivity: number,
): number {
	return scale * Math.exp((direction * KEYBOARD_ZOOM_STEP * sensitivity) / 100);
}
