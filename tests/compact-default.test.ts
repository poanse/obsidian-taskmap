import * as assert from "node:assert/strict";
import { test } from "node:test";
import { ProjectData } from "../src/data/ProjectData.svelte";
import { parseProjectFileJson } from "../src/data/ProjectDataSchema";
import { StatusCode } from "../src/types";

if (!("$state" in globalThis)) {
	Object.defineProperty(globalThis, "$state", {
		value: <T>(value: T) => value,
	});
}

const load = (file: object) => new ProjectData(parseProjectFileJson(file));

const oldFile = {
	schemaVersion: 3,
	tasks: [
		{
			name: "root",
			taskId: 0,
			status: StatusCode.READY,
			deleted: false,
			parentId: -1,
			depth: 0,
			priority: 0,
			hidden: false,
		},
	],
	blockerPairs: [],
	curTaskId: 1,
	layout: "tree",
};

void test("a new project uses the compact layout", () => {
	assert.equal(ProjectData.getDefault().getCompact(), true);
});

void test("a file saved before the compact setting uses the compact layout", () => {
	assert.equal(load(oldFile).getCompact(), true);
});

void test("a file with compact layout turned off keeps it off", () => {
	assert.equal(load({ ...oldFile, compact: false }).getCompact(), false);
});
