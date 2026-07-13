import * as assert from "node:assert/strict";
import { test } from "node:test";
import { NoTaskId } from "../src/NodePositionsCalculator";
import { RemoveTaskSingleAction } from "../src/data/Action";
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

// Tree:
//   root (0)
//     A (1)
//       B (2)   prio 0
//         C (4) prio 0
//         D (5) prio 1
//       E (3)   prio 1
//       F (6)   prio 2
function createProjectData(): ProjectData {
	return new ProjectData({
		schemaVersion: TASKMAP_FILE_SCHEMA_VERSION,
		tasks: [
			task(0, NoTaskId, 0, 0, "root"),
			task(1, 0, 1, 0, "A"),
			task(2, 1, 2, 0, "B"),
			task(3, 1, 2, 1, "E"),
			task(4, 2, 3, 0, "C"),
			task(5, 2, 3, 1, "D"),
			task(6, 1, 2, 2, "F"),
		],
		blockerPairs: [],
		folderPath: undefined,
		curTaskId: 7,
		taskSizeOverrides: [],
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

void test("removing a task promotes its children into its slot with contiguous priorities", () => {
	const data = createProjectData();

	// Delete B (id 2). Its children C (4) and D (5) should be promoted into A,
	// taking B's slot, giving order C, D, E, F with priorities 0, 1, 2, 3.
	new RemoveTaskSingleAction(2).do(data);

	assert.equal(data.isTaskDeleted(2), true);
	assert.equal(data.getTask(4).parentId, 1);
	assert.equal(data.getTask(5).parentId, 1);
	assert.equal(data.getTask(4).depth, 2);
	assert.equal(data.getTask(5).depth, 2);
	assertChildrenByPriority(data, 1, [4, 5, 3, 6]);
});

void test("undoing a task removal restores the original tree structure and priorities", () => {
	const data = createProjectData();
	const action = new RemoveTaskSingleAction(2);

	action.do(data);
	action.undo(data);

	assert.equal(data.isTaskDeleted(2), false);
	assert.equal(data.getTask(4).parentId, 2);
	assert.equal(data.getTask(5).parentId, 2);
	assertChildrenByPriority(data, 1, [2, 3, 6]);
	assertChildrenByPriority(data, 2, [4, 5]);
});
