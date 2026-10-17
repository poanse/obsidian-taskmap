import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
	canZoomInDirection,
	clampZoomScale,
	historyKeyAction,
	isDefaultZoomScale,
	MAX_ZOOM_SCALE,
	MIN_ZOOM_SCALE,
	panDeltaFromWheel,
	scaleAfterKeyboardZoom,
	scaleAfterPinch,
	usesCommandModifier,
	wheelAction,
	zoomKeyDirection,
} from "../src/viewportInput";

const PIXEL = 0;
const LINE = 1;

void test("trackpad scrolls pan and mouse wheels zoom", () => {
	assert.equal(
		wheelAction({
			ctrlKey: true,
			deltaMode: PIXEL,
			deltaX: 0,
			deltaY: -8,
			wheelDeltaY: 24,
		}),
		"zoom-touchpad",
	);
	assert.equal(
		wheelAction({
			ctrlKey: false,
			deltaMode: PIXEL,
			deltaX: 0,
			deltaY: 12,
			wheelDeltaY: -36,
		}),
		"pan",
	);
	assert.equal(
		wheelAction({
			ctrlKey: false,
			deltaMode: PIXEL,
			deltaX: 4,
			deltaY: 80,
			wheelDeltaY: -240,
		}),
		"pan",
	);
	assert.equal(
		wheelAction({
			ctrlKey: false,
			deltaMode: PIXEL,
			deltaX: 0,
			deltaY: 100,
			wheelDeltaY: -120,
		}),
		"zoom-mouse",
	);
	assert.equal(
		wheelAction({
			ctrlKey: false,
			deltaMode: PIXEL,
			deltaX: 0,
			deltaY: 4.000244140625,
			wheelDeltaY: -120,
		}),
		"zoom-mouse",
	);
	assert.equal(
		wheelAction({
			ctrlKey: false,
			deltaMode: PIXEL,
			deltaX: 0,
			deltaY: -37.6,
			wheelDeltaY: 360,
		}),
		"zoom-mouse",
	);
	assert.equal(
		wheelAction({
			ctrlKey: false,
			deltaMode: PIXEL,
			deltaX: 0,
			deltaY: 40,
			wheelDeltaY: -120,
		}),
		"pan",
	);
	assert.equal(
		wheelAction({
			ctrlKey: false,
			deltaMode: LINE,
			deltaX: 0,
			deltaY: 1,
		}),
		"zoom-mouse",
	);
	assert.equal(
		wheelAction({
			ctrlKey: false,
			deltaMode: PIXEL,
			deltaX: -6,
			deltaY: 0,
		}),
		"pan",
	);
});

void test("a pinch is touchpad zoom even though it reports a whole wheel tick", () => {
	assert.equal(
		wheelAction({
			ctrlKey: true,
			deltaMode: PIXEL,
			deltaX: 0,
			deltaY: -2.7,
			wheelDeltaY: 120,
		}),
		"zoom-touchpad",
	);
	assert.equal(
		wheelAction({
			ctrlKey: true,
			deltaMode: PIXEL,
			deltaX: 0,
			deltaY: 100,
			wheelDeltaY: -120,
		}),
		"zoom-mouse",
	);
});

void test("pinch zoom is proportional to the pinch and scaled by sensitivity", () => {
	const full = scaleAfterPinch(1, -10, 100);
	assert.ok(Math.abs(full - Math.exp(0.1)) < 1e-9);
	assert.ok(Math.abs(scaleAfterPinch(1, -10, 50) - Math.exp(0.05)) < 1e-9);
	assert.ok(scaleAfterPinch(1, 10, 100) < 1);
	assert.ok(
		Math.abs(scaleAfterPinch(1, -2, 100) - 1) <
			Math.abs(scaleAfterPinch(1, -20, 100) - 1),
	);
});

void test("wheel pan follows the fingers in pre-scale units", () => {
	assert.deepEqual(panDeltaFromWheel(-10, -4, 2, false), { x: 5, y: 2 });
});

void test("reversed wheel pan moves against the fingers", () => {
	assert.deepEqual(panDeltaFromWheel(-10, -4, 2, true), { x: -5, y: -2 });
});

void test("command shortcuts use Cmd on macOS and Ctrl elsewhere", () => {
	assert.equal(
		usesCommandModifier({ ctrlKey: true, metaKey: false }, false),
		true,
	);
	assert.equal(
		usesCommandModifier({ ctrlKey: false, metaKey: true }, false),
		false,
	);
	assert.equal(
		usesCommandModifier({ ctrlKey: true, metaKey: false }, true),
		true,
	);
	assert.equal(
		usesCommandModifier({ ctrlKey: false, metaKey: true }, true),
		true,
	);
	assert.equal(
		usesCommandModifier({ ctrlKey: false, metaKey: false }, true),
		false,
	);
});

void test("undo is Cmd/Ctrl+Z; redo is Cmd/Ctrl+R or Cmd/Ctrl+Shift+Z", () => {
	const keys = (key: string, mods: { shift?: boolean; ctrl?: boolean; meta?: boolean }) => ({
		key,
		shiftKey: mods.shift ?? false,
		ctrlKey: mods.ctrl ?? false,
		metaKey: mods.meta ?? false,
	});
	assert.equal(historyKeyAction(keys("z", { ctrl: true }), false), "undo");
	assert.equal(historyKeyAction(keys("r", { ctrl: true }), false), "redo");
	assert.equal(
		historyKeyAction(keys("Z", { ctrl: true, shift: true }), false),
		"redo",
	);
	assert.equal(historyKeyAction(keys("z", { meta: true }), true), "undo");
	assert.equal(
		historyKeyAction(keys("z", { meta: true, shift: true }), true),
		"redo",
	);
	assert.equal(historyKeyAction(keys("z", {}), false), null);
	assert.equal(
		historyKeyAction(keys("r", { ctrl: true, shift: true }), false),
		null,
	);
});

void test("up and down arrows are the zoom keys", () => {
	assert.equal(zoomKeyDirection({ key: "ArrowUp" }), 1);
	assert.equal(zoomKeyDirection({ key: "ArrowDown" }), -1);
	assert.equal(zoomKeyDirection({ key: "ArrowLeft" }), null);
	assert.equal(zoomKeyDirection({ key: "-" }), null);
	assert.ok(scaleAfterKeyboardZoom(1, 1, 100) > 1);
	assert.ok(scaleAfterKeyboardZoom(1, -1, 100) < 1);
});

void test("keyboard zoom sensitivity scales the zoom step", () => {
	assert.ok(
		scaleAfterKeyboardZoom(1, 1, 200) > scaleAfterKeyboardZoom(1, 1, 100),
	);
	assert.equal(scaleAfterKeyboardZoom(1.5, 1, 0), 1.5);
});

void test("on-screen zoom uses the keyboard zoom step and its limits", () => {
	for (const sensitivity of [50, 100, 200]) {
		for (const direction of [1, -1] as const) {
			const next = scaleAfterKeyboardZoom(1, direction, sensitivity);
			assert.equal(clampZoomScale(next), next);
		}
	}
	assert.equal(canZoomInDirection(1, 1), true);
	assert.equal(canZoomInDirection(1, -1), true);
	assert.equal(canZoomInDirection(MAX_ZOOM_SCALE, 1), false);
	assert.equal(canZoomInDirection(MAX_ZOOM_SCALE, -1), true);
	assert.equal(canZoomInDirection(MIN_ZOOM_SCALE, -1), false);
	assert.equal(canZoomInDirection(MIN_ZOOM_SCALE, 1), true);
	assert.equal(isDefaultZoomScale(1), true);
	assert.equal(isDefaultZoomScale(scaleAfterKeyboardZoom(1, 1, 100)), false);
});
