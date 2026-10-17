import * as assert from "node:assert/strict";
import { test } from "node:test";
import { TASK_SIZE } from "../src/Constants";
import {
	NodePositionsCalculator,
	NoTaskId,
	ParentToChildHorizontalGap,
	RootTaskId,
} from "../src/NodePositionsCalculator";
import {
	LayoutChoice,
	StatusCode,
	type TaskData,
	type TaskId,
	type Vector2,
} from "../src/types";
import { GRID_PLACEMENTS, type GridCell } from "../src/layoutGrid";
import {
	layoutRootPosition,
	layoutSizes,
	layoutTasks,
} from "./layoutFixture";

function calculate(
	layout: LayoutChoice,
	tasks: TaskData[] = layoutTasks,
	sizes: Map<TaskId, Vector2> = layoutSizes,
	focusedTaskId: TaskId = RootTaskId,
) {
	const calculator = new NodePositionsCalculator();
	calculator.Layout = layout;
	calculator.FocusedTaskId = focusedTaskId;
	return calculator.CalculatePositionsInGlobalFrame(
		tasks,
		layoutRootPosition,
		sizes,
	);
}

function sizeOf(id: TaskId, sizes: Map<TaskId, Vector2> = layoutSizes) {
	return sizes.get(id) ?? { x: TASK_SIZE.width, y: TASK_SIZE.height };
}

/** The root's child whose branch contains the task. */
function branchOf(tasks: TaskData[], id: TaskId): TaskId {
	const byId = new Map(tasks.map((t) => [t.taskId, t]));
	let task = byId.get(id)!;
	while (task.parentId !== RootTaskId) {
		task = byId.get(task.parentId)!;
	}
	return task.taskId;
}

function rootChildren(tasks: TaskData[]): TaskId[] {
	return tasks
		.filter((t) => t.parentId === RootTaskId)
		.sort((a, b) => a.priority - b.priority)
		.map((t) => t.taskId);
}

function assertNoOverlaps(
	tasks: TaskData[],
	positions: Map<TaskId, Vector2>,
	sizes: Map<TaskId, Vector2> = layoutSizes,
) {
	for (const a of tasks) {
		for (const b of tasks) {
			if (a.taskId >= b.taskId) {
				continue;
			}
			const pa = positions.get(a.taskId)!;
			const pb = positions.get(b.taskId)!;
			const sa = sizeOf(a.taskId, sizes);
			const sb = sizeOf(b.taskId, sizes);
			const overlap =
				pa.x < pb.x + sb.x &&
				pb.x < pa.x + sa.x &&
				pa.y < pb.y + sb.y &&
				pb.y < pa.y + sa.y;
			assert.ok(!overlap, `tasks ${a.taskId} and ${b.taskId} overlap`);
		}
	}
}

/** Grid cell of each root child in the double-row layout. */
function doubleRowCells(tasks: TaskData[]): Map<TaskId, GridCell> {
	const place = GRID_PLACEMENTS[LayoutChoice.DoubleRow];
	return new Map(rootChildren(tasks).map((id, idx) => [id, place(idx + 1)]));
}

type Box = { left: number; right: number; top: number; bottom: number };

/** Bounding box of each branch: a root child and all its descendants. */
function branchBoxes(
	tasks: TaskData[],
	positions: Map<TaskId, Vector2>,
	sizes: Map<TaskId, Vector2>,
): Map<TaskId, Box> {
	const boxes = new Map<TaskId, Box>();
	tasks
		.filter((t) => t.taskId !== RootTaskId)
		.forEach((t) => {
			const branch = branchOf(tasks, t.taskId);
			const pos = positions.get(t.taskId)!;
			const size = sizeOf(t.taskId, sizes);
			const box = boxes.get(branch);
			boxes.set(branch, {
				left: Math.min(box?.left ?? Infinity, pos.x),
				right: Math.max(box?.right ?? -Infinity, pos.x + size.x),
				top: Math.min(box?.top ?? Infinity, pos.y),
				bottom: Math.max(box?.bottom ?? -Infinity, pos.y + size.y),
			});
		});
	return boxes;
}

/** Checks branches in an earlier row or column end before those in a later one start. */
function assertBranchesKeepToTheirCells(
	tasks: TaskData[],
	positions: Map<TaskId, Vector2>,
	sizes: Map<TaskId, Vector2> = layoutSizes,
) {
	const cells = doubleRowCells(tasks);
	const boxes = branchBoxes(tasks, positions, sizes);
	cells.forEach((a, idA) => {
		cells.forEach((b, idB) => {
			const boxA = boxes.get(idA)!;
			const boxB = boxes.get(idB)!;
			if (a.row < b.row) {
				assert.ok(
					boxA.bottom < boxB.top,
					`branch ${idA} should be above branch ${idB}`,
				);
			}
			if (a.column < b.column) {
				assert.ok(
					boxA.right < boxB.left,
					`branch ${idA} should be left of branch ${idB}`,
				);
			}
		});
	});
}

void test("tree layout positions are unchanged", () => {
	const positions = calculate(LayoutChoice.Tree);

	assert.deepEqual([...positions.entries()].sort((a, b) => a[0] - b[0]), [
		[NoTaskId, { x: 0, y: 300 }],
		[0, { x: 0, y: 300 }],
		[1, { x: 400, y: 30 }],
		[2, { x: 400, y: 210 }],
		[3, { x: 800, y: -60 }],
		[4, { x: 800, y: 35 }],
		[5, { x: 400, y: 300 }],
		[6, { x: 800, y: 300 }],
		[7, { x: 1200, y: 30 }],
		[8, { x: 1200, y: 120 }],
		[9, { x: 400, y: 390 }],
		[10, { x: 400, y: 570 }],
		[11, { x: 800, y: 480 }],
		[12, { x: 800, y: 570 }],
		[13, { x: 800, y: 660 }],
	]);
});

void test("double-row: the root stays in place and no tasks overlap", () => {
	const positions = calculate(LayoutChoice.DoubleRow);

	assert.deepEqual(positions.get(RootTaskId), layoutRootPosition);
	assertNoOverlaps(layoutTasks, positions);
});

void test("double-row: root children share a left edge per column and a centre per row", () => {
	const positions = calculate(LayoutChoice.DoubleRow);
	const centreY = (id: TaskId) => positions.get(id)!.y + sizeOf(id).y / 2;
	const cells = [...doubleRowCells(layoutTasks).entries()];
	const firstColumnX =
		layoutRootPosition.x + TASK_SIZE.width + ParentToChildHorizontalGap;

	for (const [idA, a] of cells) {
		if (a.column === 0) {
			assert.equal(positions.get(idA)!.x, firstColumnX);
		}
		for (const [idB, b] of cells) {
			if (a.column === b.column) {
				assert.equal(positions.get(idA)!.x, positions.get(idB)!.x);
			} else if (a.column < b.column) {
				assert.ok(positions.get(idA)!.x < positions.get(idB)!.x);
			}
			if (a.row === b.row) {
				assert.equal(centreY(idA), centreY(idB));
			} else if (a.row < b.row) {
				assert.ok(centreY(idA) < centreY(idB));
			}
		}
	}
});

void test("double-row: branches keep to their own rows and columns", () => {
	assertBranchesKeepToTheirCells(
		layoutTasks,
		calculate(LayoutChoice.DoubleRow),
	);
});

void test("double-row: tasks in a row share a centre when their heights differ", () => {
	const sizes = new Map(layoutSizes);
	const [first, second, third] = rootChildren(layoutTasks);
	sizes.set(first, { x: TASK_SIZE.width, y: 200 });
	sizes.set(second, { x: TASK_SIZE.width, y: 140 });
	const positions = calculate(LayoutChoice.DoubleRow, layoutTasks, sizes);
	const centreY = (id: TaskId) =>
		positions.get(id)!.y + sizeOf(id, sizes).y / 2;

	assert.equal(centreY(first), centreY(third));
	assertNoOverlaps(layoutTasks, positions, sizes);
	assertBranchesKeepToTheirCells(layoutTasks, positions, sizes);
});

const task = (taskId: TaskId, parentId: TaskId, depth: number, priority: number): TaskData => ({
	taskId,
	parentId,
	depth,
	priority,
	deleted: false,
	hidden: false,
	status: StatusCode.READY,
	name: `task ${taskId}`,
});

void test("double-row: a single root child sits above the root", () => {
	// root -> A -> B, C
	const tasks = [
		task(0, NoTaskId, 0, 0),
		task(1, 0, 1, 0),
		task(2, 1, 2, 0),
		task(3, 1, 2, 1),
	];
	const sizes = new Map<TaskId, Vector2>();
	const calculator = new NodePositionsCalculator();
	calculator.Layout = LayoutChoice.DoubleRow;
	const positions = calculator.CalculatePositionsInGlobalFrame(
		tasks,
		layoutRootPosition,
		sizes,
	);
	const branchBottom = Math.max(
		...[1, 2, 3].map((id) => positions.get(id)!.y + TASK_SIZE.height),
	);

	assert.equal(
		positions.get(1)!.x,
		layoutRootPosition.x + TASK_SIZE.width + ParentToChildHorizontalGap,
	);
	assert.equal(
		branchBottom,
		layoutRootPosition.y - calculator.SiblingVerticalGap,
	);
	assertNoOverlaps(tasks, positions, sizes);
});

void test("double-row: rows sit on opposite sides of the root", () => {
	const tasks = [
		task(0, NoTaskId, 0, 0),
		task(1, 0, 1, 0),
		task(2, 0, 1, 1),
	];
	const sizes = new Map<TaskId, Vector2>();
	const calculator = new NodePositionsCalculator();
	calculator.Layout = LayoutChoice.DoubleRow;
	const positions = calculator.CalculatePositionsInGlobalFrame(
		tasks,
		layoutRootPosition,
		sizes,
	);
	const gap = calculator.SiblingVerticalGap;
	const rootTop = layoutRootPosition.y;
	const rootBottom = rootTop + TASK_SIZE.height;

	assert.equal(positions.get(1)!.y + TASK_SIZE.height, rootTop - gap);
	assert.equal(positions.get(2)!.y, rootBottom + gap);
	assertNoOverlaps(tasks, positions, sizes);
});

void test("double-row: a branch does not cross the root", () => {
	const calculator = new NodePositionsCalculator();
	const gap = calculator.SiblingVerticalGap;
	const positions = calculate(LayoutChoice.DoubleRow);
	const cells = doubleRowCells(layoutTasks);
	const rootTop = layoutRootPosition.y;
	const rootBottom = rootTop + sizeOf(RootTaskId).y;

	for (const task of layoutTasks) {
		if (task.taskId === RootTaskId) {
			continue;
		}
		const row = cells.get(branchOf(layoutTasks, task.taskId))!.row;
		const pos = positions.get(task.taskId)!;
		const bottom = pos.y + sizeOf(task.taskId).y;
		if (row === 0) {
			assert.ok(
				bottom <= rootTop - gap,
				`task ${task.taskId} should stay above the root`,
			);
		} else {
			assert.ok(
				pos.y >= rootBottom + gap,
				`task ${task.taskId} should stay below the root`,
			);
		}
	}
});

void test("double-row: a branch with many sibling parents keeps to its row", () => {
	// root -> A -> P1..P10, each Pn with one child; root -> B
	const tasks: TaskData[] = [
		task(0, NoTaskId, 0, 0),
		task(1, 0, 1, 0),
		task(40, 0, 1, 1),
	];
	for (let i = 0; i < 10; i++) {
		tasks.push(task(2 + i, 1, 2, i));
		tasks.push(task(20 + i, 2 + i, 3, 0));
	}
	const sizes = new Map<TaskId, Vector2>();

	const positions = calculate(LayoutChoice.DoubleRow, tasks, sizes);
	assertBranchesKeepToTheirCells(tasks, positions, sizes);
	assertNoOverlaps(tasks, positions, sizes);
});

void test("double-row: a missing priority leaves later tasks on their rows", () => {
	// Priorities 1 and 2: the even task stays above the root, the odd one below.
	const tasks = [
		task(0, NoTaskId, 0, 0),
		task(2, 0, 1, 1),
		task(3, 0, 1, 2),
	];
	const sizes = new Map<TaskId, Vector2>();
	const calculator = new NodePositionsCalculator();
	const positions = calculate(LayoutChoice.DoubleRow, tasks, sizes);
	const rootTop = layoutRootPosition.y;
	const rootBottom = rootTop + TASK_SIZE.height;
	const gap = calculator.SiblingVerticalGap;

	assert.ok(positions.get(3)!.y + TASK_SIZE.height <= rootTop - gap);
	assert.ok(positions.get(2)!.y >= rootBottom + gap);
	assertNoOverlaps(tasks, positions, sizes);
});

void test("focus lines the task up with its ancestors", () => {
	// Bottom-row child B, then G (taller), then C.
	const tasks = [
		task(0, NoTaskId, 0, 0),
		task(1, 0, 1, 1),
		task(2, 1, 2, 0),
		task(3, 2, 3, 0),
	];
	const sizes = new Map<TaskId, Vector2>([
		[2, { x: TASK_SIZE.width, y: 160 }],
	]);
	const natural = calculate(LayoutChoice.DoubleRow, tasks, sizes);
	const focused = calculate(LayoutChoice.DoubleRow, tasks, sizes, 2);
	const rootY = focused.get(RootTaskId)!.y;

	assert.equal(focused.get(1)!.y, rootY);
	assert.equal(focused.get(2)!.y, rootY);
	assert.equal(
		focused.get(3)!.y - focused.get(2)!.y,
		natural.get(3)!.y - natural.get(2)!.y,
	);
	assert.ok(
		natural.get(1)!.y > natural.get(RootTaskId)!.y + TASK_SIZE.height,
	);
});
