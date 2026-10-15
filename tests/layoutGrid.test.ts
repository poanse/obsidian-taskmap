import * as assert from "node:assert/strict";
import { test } from "node:test";
import { arrangeGrid, GRID_PLACEMENTS } from "../src/layoutGrid";
import { LayoutChoice } from "../src/types";

const cellsFor = (layout: LayoutChoice, count: number) =>
	Array.from({ length: count }, (_, idx) => GRID_PLACEMENTS[layout](idx + 1));

void test("tree places children in one column", () => {
	assert.deepEqual(cellsFor(LayoutChoice.Tree, 3), [
		{ row: 0, column: 0 },
		{ row: 1, column: 0 },
		{ row: 2, column: 0 },
	]);
});

void test("double row fills each column top then bottom", () => {
	assert.deepEqual(cellsFor(LayoutChoice.DoubleRow, 5), [
		{ row: 0, column: 0 },
		{ row: 1, column: 0 },
		{ row: 0, column: 1 },
		{ row: 1, column: 1 },
		{ row: 0, column: 2 },
	]);
});

const gaps = { row: 10, parentsRow: 5, column: 20 };

void test("rows take their tallest item and columns their widest", () => {
	const grid = arrangeGrid(
		[
			{ cell: { row: 0, column: 0 }, size: { x: 100, y: 50 }, hasChildren: false },
			{ cell: { row: 0, column: 1 }, size: { x: 60, y: 80 }, hasChildren: false },
			{ cell: { row: 1, column: 0 }, size: { x: 120, y: 30 }, hasChildren: false },
		],
		gaps,
	);

	assert.deepEqual(grid.size, { x: 120 + 20 + 60, y: 80 + 10 + 30 });
	assert.deepEqual(grid.offsets, [
		{ x: 0, y: (80 - 50) / 2 },
		{ x: 140, y: 0 },
		{ x: 0, y: 90 },
	]);
});

void test("parents on both sides of a row gap widen it", () => {
	const item = (row: number, column: number, hasChildren: boolean) => ({
		cell: { row, column },
		size: { x: 10, y: 10 },
		hasChildren,
	});

	const apart = arrangeGrid([item(0, 0, true), item(1, 1, true)], gaps);
	assert.equal(apart.offsets[1].y, 20);

	const stacked = arrangeGrid([item(0, 0, true), item(1, 0, true)], gaps);
	assert.equal(stacked.offsets[1].y, 25);
});

void test("an empty grid has no size", () => {
	assert.deepEqual(arrangeGrid([], gaps), { offsets: [], size: { x: 0, y: 0 } });
});
