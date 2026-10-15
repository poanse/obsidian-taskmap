import * as assert from "node:assert/strict";
import { test } from "node:test";
import { NoTaskId, RootTaskId } from "../src/NodePositionsCalculator";
import { SetTaskPriorityAction } from "../src/data/Action";
import { ProjectData } from "../src/data/ProjectData.svelte";
import { TASKMAP_FILE_SCHEMA_VERSION } from "../src/data/ProjectDataSchema";
import { GRID_PLACEMENTS } from "../src/layoutGrid";
import {
	LayoutChoice,
	StatusCode,
	type TaskData,
	type TaskId,
} from "../src/types";

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
): TaskData {
	return {
		taskId,
		parentId,
		depth,
		priority,
		deleted: false,
		hidden: false,
		status: StatusCode.READY,
		name: `task ${taskId}`,
	};
}

/** Five root children, priorities 0..4: two rows filled column by column. */
function create(layout: LayoutChoice) {
	return new ProjectData({
		schemaVersion: TASKMAP_FILE_SCHEMA_VERSION,
		tasks: [
			task(0, NoTaskId, 0, 0),
			task(1, RootTaskId, 1, 0),
			task(2, RootTaskId, 1, 1),
			task(3, RootTaskId, 1, 2),
			task(4, RootTaskId, 1, 3),
			task(5, RootTaskId, 1, 4),
		],
		blockerPairs: [],
		folderPath: undefined,
		curTaskId: 6,
		taskSizeOverrides: [],
		layout,
	});
}

function order(data: ProjectData, parentId: TaskId = RootTaskId): TaskId[] {
	return data
		.getChildren(parentId)
		.map((id) => data.getTask(id))
		.sort((a, b) => a.priority - b.priority)
		.map((t) => t.taskId);
}

function row(priority: number) {
	return GRID_PLACEMENTS[LayoutChoice.DoubleRow](priority + 1).row;
}

void test("double-row: swapping neighbours in a row leaves every other row unchanged", () => {
	const data = create(LayoutChoice.DoubleRow);
	const rowsBefore = new Map(
		[1, 2, 3, 4, 5].map((id) => [id, row(data.getTask(id).priority)]),
	);

	data.setPriority(1, 2);

	assert.deepEqual(order(data), [3, 2, 1, 4, 5]);
	for (const id of [2, 4, 5]) {
		assert.equal(row(data.getTask(id).priority), rowsBefore.get(id));
	}
});

void test("double-row: swapping neighbours in a column leaves the other tasks in place", () => {
	const data = create(LayoutChoice.DoubleRow);

	data.setPriority(1, 1);

	assert.deepEqual(order(data), [2, 1, 3, 4, 5]);
	assert.equal(row(data.getTask(2).priority), 0);
	assert.equal(row(data.getTask(1).priority), 1);
});

void test("double-row: a longer move along a row shifts only that row", () => {
	const data = create(LayoutChoice.DoubleRow);

	data.setPriority(1, 4);

	assert.deepEqual(order(data), [3, 2, 5, 4, 1]);
	assert.equal(row(data.getTask(2).priority), 1);
	assert.equal(row(data.getTask(4).priority), 1);
});

void test("double-row: undoing a row swap restores the previous order", () => {
	const data = create(LayoutChoice.DoubleRow);
	const action = new SetTaskPriorityAction(1, 2);

	action.do(data);
	action.undo(data);

	assert.deepEqual(order(data), [1, 2, 3, 4, 5]);
});

void test("tree layout still shifts every sibling between the old and new priority", () => {
	const data = create(LayoutChoice.Tree);

	data.setPriority(1, 2);

	assert.deepEqual(order(data), [2, 3, 1, 4, 5]);
});

void test("double-row: a nested column still shifts like a list", () => {
	const data = new ProjectData({
		schemaVersion: TASKMAP_FILE_SCHEMA_VERSION,
		tasks: [
			task(0, NoTaskId, 0, 0),
			task(1, RootTaskId, 1, 0),
			task(2, 1, 2, 0),
			task(3, 1, 2, 1),
			task(4, 1, 2, 2),
			task(5, 1, 2, 3),
			task(6, 1, 2, 4),
		],
		blockerPairs: [],
		folderPath: undefined,
		curTaskId: 7,
		taskSizeOverrides: [],
		layout: LayoutChoice.DoubleRow,
	});

	data.setPriority(2, 4);

	assert.deepEqual(order(data, 1), [3, 4, 5, 6, 2]);
});
