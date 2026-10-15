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
 * Pinch-to-zoom arrives as a wheel event with ctrlKey set and a wheelDeltaY of
 * ±120, so wheelDeltaY can't tell it from a mouse wheel either.
 */
export function wheelAction(event: WheelSample): WheelAction {
	if (event.ctrlKey) {
		return isWholeWheelTick(event) ? "zoom-mouse" : "zoom-touchpad";
	}
	return isMouseWheel(event) ? "zoom-mouse" : "pan";
}

/** Line or page deltas, or the 100-pixel ticks of a Windows mouse wheel. */
function isWholeWheelTick(event: WheelSample): boolean {
	return (
		event.deltaMode !== DOM_DELTA_PIXEL ||
		(Number.isInteger(event.deltaY) && Math.abs(event.deltaY) >= 50)
	);
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
	return isWholeWheelTick(event);
}

/** Chromium reports a pinch as deltaY = -100 * ln(change in scale). */
const PINCH_DELTA_PER_LOG_SCALE = 100;

/**
 * At 100% sensitivity the map follows the fingers. Each pinch event is scaled
 * by its delta, because a pinch sends many small events rather than ticks.
 */
export function scaleAfterPinch(
	scale: number,
	deltaY: number,
	sensitivity: number,
): number {
	return (
		scale *
		Math.exp((-deltaY * sensitivity) / 100 / PINCH_DELTA_PER_LOG_SCALE)
	);
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

/**
 * Cmd/Ctrl+Z undoes; Cmd/Ctrl+R and Cmd/Ctrl+Shift+Z redo. The key is
 * lowercased because Shift makes it "Z" on most platforms but not with Cmd on macOS.
 */
export function historyKeyAction(
	event: { key: string; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
	isMac: boolean,
): "undo" | "redo" | null {
	if (!usesCommandModifier(event, isMac)) {
		return null;
	}
	const key = event.key.toLowerCase();
	if (key === "z") {
		return event.shiftKey ? "redo" : "undo";
	}
	if (key === "r" && !event.shiftKey) {
		return "redo";
	}
	return null;
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
