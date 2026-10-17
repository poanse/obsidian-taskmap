import * as assert from "node:assert/strict";
import { test } from "node:test";
import { NoTaskId, RootTaskId } from "../src/NodePositionsCalculator";
import {
	AddTaskAction,
	ChangeParentAction,
	RemoveTaskBranchAction,
	RemoveTaskSingleAction,
	SetTaskPriorityAction,
} from "../src/data/Action";
import { ProjectData } from "../src/data/ProjectData.svelte";
import { TASKMAP_FILE_SCHEMA_VERSION } from "../src/data/ProjectDataSchema";
import { doubleRowOfPriority } from "../src/layoutGrid";
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
	return doubleRowOfPriority(priority);
}

function assertSequential(data: ProjectData, parentId: TaskId = RootTaskId) {
	const priorities = data
		.getChildren(parentId)
		.map((id) => data.getTask(id).priority)
		.sort((a, b) => a - b);
	assert.deepEqual(
		priorities,
		priorities.map((_, idx) => idx),
	);
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

void test("double-row: removing a root child keeps every other task on its row", () => {
	const data = create(LayoutChoice.DoubleRow);
	const rowsBefore = new Map(
		[2, 3, 4, 5].map((id) => [id, row(data.getTask(id).priority)]),
	);

	new RemoveTaskBranchAction(1).do(data);

	assert.equal(data.isTaskDeleted(1), true);
	for (const [id, previous] of rowsBefore) {
		assert.equal(row(data.getTask(id).priority), previous);
	}
	assert.deepEqual(order(data), [3, 2, 5, 4]);
	assertSequential(data);
});

void test("double-row: a removal that unbalances the rows moves only the last task of the longer row", () => {
	// Top row 1, 3, 5; bottom row 2, 4. Removing 2 leaves the top row too long.
	const data = create(LayoutChoice.DoubleRow);

	new RemoveTaskBranchAction(2).do(data);

	assert.deepEqual(order(data), [1, 4, 3, 5]);
	assert.equal(row(data.getTask(1).priority), 0);
	assert.equal(row(data.getTask(3).priority), 0);
	assert.equal(row(data.getTask(4).priority), 1);
	assert.equal(row(data.getTask(5).priority), 1);
	assertSequential(data);
});

void test("double-row: undoing an unbalancing removal puts the moved task back", () => {
	const data = create(LayoutChoice.DoubleRow);
	const action = new RemoveTaskSingleAction(2);

	action.do(data);
	action.undo(data);

	assert.deepEqual(order(data), [1, 2, 3, 4, 5]);
	assertSequential(data);
});

void test("tree: reordering works after removals in double row", () => {
	const data = create(LayoutChoice.DoubleRow);
	new RemoveTaskBranchAction(2).do(data);
	new RemoveTaskBranchAction(3).do(data);
	data.setLayout(LayoutChoice.Tree);
	assertSequential(data);
	const before = order(data);

	data.setPriority(before[0], 1);

	assert.deepEqual(order(data), [before[1], before[0], before[2]]);
});

void test("loading a file with gaps packs the priorities", () => {
	const data = new ProjectData({
		schemaVersion: TASKMAP_FILE_SCHEMA_VERSION,
		tasks: [
			task(0, NoTaskId, 0, 0),
			task(1, RootTaskId, 1, 0),
			task(2, RootTaskId, 1, 3),
			task(3, RootTaskId, 1, 7),
		],
		blockerPairs: [],
		folderPath: undefined,
		curTaskId: 4,
		taskSizeOverrides: [],
		layout: LayoutChoice.Tree,
	});

	assert.deepEqual(order(data), [1, 2, 3]);
	assertSequential(data);
});

void test("double-row: undoing a root-child removal restores priorities", () => {
	const data = create(LayoutChoice.DoubleRow);
	const action = new RemoveTaskBranchAction(1);

	action.do(data);
	action.undo(data);

	assert.equal(data.isTaskDeleted(1), false);
	assert.deepEqual(order(data), [1, 2, 3, 4, 5]);
	assertSequential(data);
});

void test("double-row: promoted children take the removed task's row", () => {
	const data = new ProjectData({
		schemaVersion: TASKMAP_FILE_SCHEMA_VERSION,
		tasks: [
			task(0, NoTaskId, 0, 0),
			task(1, RootTaskId, 1, 0),
			task(2, RootTaskId, 1, 1),
			task(3, RootTaskId, 1, 2),
			task(6, 1, 2, 0),
			task(7, 1, 2, 1),
		],
		blockerPairs: [],
		folderPath: undefined,
		curTaskId: 8,
		taskSizeOverrides: [],
		layout: LayoutChoice.DoubleRow,
	});

	const action = new RemoveTaskSingleAction(1);
	action.do(data);

	assert.equal(data.getTask(6).parentId, RootTaskId);
	assert.equal(data.getTask(7).parentId, RootTaskId);
	assert.equal(row(data.getTask(6).priority), 0);
	assert.equal(row(data.getTask(7).priority), 0);
	assert.equal(row(data.getTask(2).priority), 1);
	assert.ok(data.getTask(6).priority < data.getTask(7).priority);
	// The top row is now 6, 7, 3, too long for four tasks, so 3 moves to the
	// end of the bottom row.
	assert.equal(row(data.getTask(3).priority), 1);
	assert.ok(data.getTask(2).priority < data.getTask(3).priority);
	assertSequential(data);

	action.undo(data);

	assert.equal(data.isTaskDeleted(1), false);
	assert.deepEqual(order(data), [1, 2, 3]);
	assert.deepEqual(order(data, 1), [6, 7]);
});

void test("double-row: undoing a reparent puts the root child back on its row", () => {
	const data = new ProjectData({
		schemaVersion: TASKMAP_FILE_SCHEMA_VERSION,
		tasks: [
			task(0, NoTaskId, 0, 0),
			task(1, RootTaskId, 1, 0),
			task(2, RootTaskId, 1, 1),
			task(3, RootTaskId, 1, 2),
		],
		blockerPairs: [],
		folderPath: undefined,
		curTaskId: 4,
		taskSizeOverrides: [],
		layout: LayoutChoice.DoubleRow,
	});
	const action = new ChangeParentAction(1, 2);

	action.do(data);
	assert.equal(row(data.getTask(3).priority), 0);
	assert.equal(row(data.getTask(2).priority), 1);
	assertSequential(data);

	action.undo(data);

	assert.equal(data.getTask(1).parentId, RootTaskId);
	assert.deepEqual(order(data), [1, 2, 3]);
	assertSequential(data);
});

void test("double-row: a new root child after a removal takes the next priority", () => {
	const data = create(LayoutChoice.DoubleRow);
	new RemoveTaskBranchAction(1).do(data);

	const added = new AddTaskAction(RootTaskId);
	added.do(data);

	assert.equal(data.getTask(6).priority, 4);
	assertSequential(data);
});
