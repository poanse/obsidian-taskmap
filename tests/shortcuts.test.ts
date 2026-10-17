import * as assert from "node:assert/strict";
import { test } from "node:test";
import { shortcutDescriptions } from "../src/shortcuts";

function combos(isMac: boolean, action: string): string[][] {
	const match = shortcutDescriptions(isMac).find(
		(shortcut) => shortcut.action === action,
	);
	assert.ok(match, action);
	return match.combos;
}

void test("shortcuts use Cmd on macOS and Ctrl elsewhere", () => {
	assert.deepEqual(combos(true, "Zoom in"), [["Cmd", "Up arrow"]]);
	assert.deepEqual(combos(false, "Zoom out"), [["Ctrl", "Down arrow"]]);
	assert.deepEqual(combos(false, "Undo"), [["Ctrl", "Z"]]);
	assert.deepEqual(combos(true, "Redo"), [
		["Cmd", "R"],
		["Cmd", "Shift", "Z"],
	]);
});

void test("removing a task is Delete, or Fn+Delete on macOS", () => {
	assert.deepEqual(combos(false, "Remove selected task"), [["Delete"]]);
	assert.deepEqual(combos(true, "Remove selected task"), [["Fn", "Delete"]]);
});
