import * as assert from "node:assert/strict";
import { test } from "node:test";
import { NoTaskId } from "../src/NodePositionsCalculator";
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
//     P (1)
//       A (2)
//       B (3)
const P = 1;
const A = 2;
const B = 3;

function createProjectData(): ProjectData {
	return new ProjectData({
		schemaVersion: TASKMAP_FILE_SCHEMA_VERSION,
		tasks: [
			task(0, NoTaskId, 0, 0, StatusCode.READY),
			task(P, 0, 1, 0, StatusCode.READY),
			task(A, P, 2, 0, StatusCode.READY),
			task(B, P, 2, 1, StatusCode.READY),
		],
		blockerPairs: [],
		folderPath: undefined,
		curTaskId: 4,
		taskSizeOverrides: [],
	});
}

void test("a parent whose children are all drafts is calculated as Ready", () => {
	const data = createProjectData();

	new SetTaskStatusAction(A, StatusCode.DRAFT).do(data);
	new SetTaskStatusAction(B, StatusCode.DRAFT).do(data);

	assert.equal(data.getTask(P).status, StatusCode.READY);
});

void test("a parent with all-draft children keeps updating", () => {
	const data = createProjectData();
	new SetTaskStatusAction(A, StatusCode.DRAFT).do(data);
	new SetTaskStatusAction(B, StatusCode.DRAFT).do(data);

	new SetTaskStatusAction(A, StatusCode.IN_PROGRESS).do(data);

	assert.equal(data.getTask(P).status, StatusCode.IN_PROGRESS);
});

void test("a parent the user set to Draft stays a draft", () => {
	const data = createProjectData();
	new SetTaskStatusAction(P, StatusCode.DRAFT).do(data);

	new SetTaskStatusAction(A, StatusCode.DONE).do(data);
	new AddTaskAction(P).do(data);

	assert.equal(data.getTask(P).status, StatusCode.DRAFT);
});

void test("choosing the calculated status resumes updates for a draft parent", () => {
	const data = createProjectData();
	new SetTaskStatusAction(P, StatusCode.DRAFT).do(data);
	new SetTaskStatusAction(A, StatusCode.DONE).do(data);

	new SetTaskStatusAction(P, data.calculateStatus(P)).do(data);
	assert.equal(data.getTask(P).status, StatusCode.IN_PROGRESS);

	new SetTaskStatusAction(B, StatusCode.DONE).do(data);
	assert.equal(data.getTask(P).status, StatusCode.DONE);
});
