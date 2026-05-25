import * as assert from "node:assert/strict";
import { test } from "node:test";
import { NoTaskId } from "../src/NodePositionsCalculator";
import { ChangeParentAction } from "../src/data/Action";
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
	name: string,
): TaskData {
	return {
		taskId,
		parentId,
		depth,
		priority,
		deleted: false,
		hidden: false,
		status: StatusCode.READY,
		name,
	};
}

function createProjectData(): ProjectData {
	return new ProjectData({
		schemaVersion: TASKMAP_FILE_SCHEMA_VERSION,
		tasks: [
			task(0, NoTaskId, 0, 0, "root"),
			task(1, 0, 1, 0, "old parent"),
			task(2, 0, 1, 1, "new parent"),
			task(3, 1, 2, 0, "old child before moved"),
			task(4, 1, 2, 1, "moved child"),
			task(5, 1, 2, 2, "old child after moved"),
			task(6, 2, 2, 0, "new child first"),
			task(7, 2, 2, 1, "new child second"),
		],
		blockerPairs: [],
		folderPath: undefined,
		curTaskId: 8,
	});
}

function assertChildrenByPriority(
	data: ProjectData,
	parentId: TaskId,
	expectedTaskIds: TaskId[],
) {
	const children = data
		.getChildren(parentId)
		.map((id) => data.getTask(id))
		.sort((a, b) => a.priority - b.priority);

	assert.deepEqual(
		children.map((t) => t.taskId),
		expectedTaskIds,
	);
	const priorities = children.map((t) => t.priority);
	assert.ok(priorities.every(Number.isInteger));
	assert.deepEqual(
		priorities,
		Array.from({ length: children.length }, (_, idx) => idx),
	);
}

void test("reparenting normalizes sibling priorities for both parents", () => {
	const data = createProjectData();

	assert.equal(data.getTask(4).parentId, 1);
	new ChangeParentAction(4, 2).do(data);

	assert.equal(data.getTask(4).parentId, 2);
	assertChildrenByPriority(data, 1, [3, 5]);
	assertChildrenByPriority(data, 2, [6, 7, 4]);
});

void test("undoing a reparent restores the original sibling priority", () => {
	const data = createProjectData();
	const action = new ChangeParentAction(4, 2);

	action.do(data);
	action.undo(data);

	assert.equal(data.getTask(4).parentId, 1);
	assertChildrenByPriority(data, 1, [3, 4, 5]);
	assertChildrenByPriority(data, 2, [6, 7]);
});
