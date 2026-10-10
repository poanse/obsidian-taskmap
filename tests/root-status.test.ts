import * as assert from "node:assert/strict";
import { test } from "node:test";
import { NoTaskId, RootTaskId } from "../src/NodePositionsCalculator";
import { AddTaskAction, SetTaskStatusAction } from "../src/data/Action";
import { ProjectData } from "../src/data/ProjectData.svelte";
import { TASKMAP_FILE_SCHEMA_VERSION } from "../src/data/ProjectDataSchema";
import { StatusCode, type TaskData, type TaskId } from "../src/types";

if (!("$state" in globalThis)) {
	Object.defineProperty(globalThis, "$state", {
		value: <T>(value: T) => value,
	});
}

function task(
	taskId: TaskId,
	parentId: TaskId,
	depth: number,
	priority: number,
	status: StatusCode,
): TaskData {
	return {
		taskId,
		parentId,
		depth,
		priority,
		deleted: false,
		hidden: false,
		status,
		name: `task ${taskId}`,
	};
}

// Tree:
//   root (0)
//     A (1)
//     B (2)
function createProjectData(rootStatus: StatusCode): ProjectData {
	return new ProjectData({
		schemaVersion: TASKMAP_FILE_SCHEMA_VERSION,
		tasks: [
			task(0, NoTaskId, 0, 0, rootStatus),
			task(1, 0, 1, 0, StatusCode.READY),
			task(2, 0, 1, 1, StatusCode.READY),
		],
		blockerPairs: [],
		folderPath: undefined,
		curTaskId: 3,
		taskSizeOverrides: [],
	});
}

void test("a new map's root starts as a draft", () => {
	const data = ProjectData.getDefault();

	assert.equal(data.getTask(RootTaskId).status, StatusCode.DRAFT);
});

void test("loading a map recalculates a stale root status", () => {
	const data = createProjectData(StatusCode.IN_PROGRESS);

	assert.equal(data.getTask(RootTaskId).status, StatusCode.READY);
});

void test("the root status follows its children", () => {
	const data = createProjectData(StatusCode.READY);

	new SetTaskStatusAction(1, StatusCode.DONE).do(data);
	assert.equal(data.getTask(RootTaskId).status, StatusCode.IN_PROGRESS);

	new SetTaskStatusAction(2, StatusCode.DONE).do(data);
	assert.equal(data.getTask(RootTaskId).status, StatusCode.DONE);

	new AddTaskAction(RootTaskId).do(data);
	assert.equal(data.getTask(RootTaskId).status, StatusCode.IN_PROGRESS);
});

void test("undoing a status change restores the root status", () => {
	const data = createProjectData(StatusCode.READY);
	const action = new SetTaskStatusAction(1, StatusCode.IN_PROGRESS);

	action.do(data);
	assert.equal(data.getTask(RootTaskId).status, StatusCode.IN_PROGRESS);

	action.undo(data);
	assert.equal(data.getTask(RootTaskId).status, StatusCode.READY);
});
