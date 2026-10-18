import * as assert from "node:assert/strict";
import { test } from "node:test";
import { arrangeGrid, GRID_PLACEMENTS, type Profile } from "../src/layoutGrid";
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

const box = (
	row: number,
	column: number,
	x: number,
	y: number,
	hasChildren = false,
) => ({
	cell: { row, column },
	size: { x, y },
	profile: [{ top: 0, bottom: y }],
	hasChildren,
});

void test("rows take their tallest item and columns their widest", () => {
	const grid = arrangeGrid(
		[box(0, 0, 100, 50), box(0, 1, 60, 80), box(1, 0, 120, 30)],
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
	const item = (row: number, column: number) => box(row, column, 10, 10, true);

	const apart = arrangeGrid([item(0, 0), item(1, 1)], gaps);
	assert.equal(apart.offsets[1].y, 20);

	const stacked = arrangeGrid([item(0, 0), item(1, 0)], gaps);
	assert.equal(stacked.offsets[1].y, 25);
});

void test("an empty grid has no size", () => {
	assert.deepEqual(arrangeGrid([], gaps), {
		offsets: [],
		size: { x: 0, y: 0 },
		profile: [],
	});
	assert.deepEqual(arrangeGrid([], gaps, true), {
		offsets: [],
		size: { x: 0, y: 0 },
		profile: [],
	});
});

/** A parent card of height 80 centred on a 260 tall column of children. */
const parentProfile: Profile = [
	{ top: 90, bottom: 170 },
	{ top: 0, bottom: 260 },
];
const parent = (row: number) => ({
	cell: { row, column: 0 },
	size: { x: 680, y: 260 },
	profile: parentProfile,
	hasChildren: true,
});
const leaf = (row: number) => box(row, 0, 280, 80);

void test("compact: a leaf after a parent sits a row gap below the parent's card", () => {
	const items = [parent(0), leaf(1)];

	assert.equal(arrangeGrid(items, gaps).offsets[1].y, 260 + 10);
	const grid = arrangeGrid(items, gaps, true);
	assert.deepEqual(grid.offsets, [
		{ x: 0, y: 0 },
		{ x: 0, y: 170 + 10 },
	]);
	assert.deepEqual(grid.size, { x: 680, y: 260 });
	assert.deepEqual(grid.profile, [
		{ top: 90, bottom: 260 },
		{ top: 0, bottom: 260 },
	]);
});

void test("compact: a parent after a leaf may reach above it", () => {
	const grid = arrangeGrid([box(0, 0, 280, 40), parent(1)], gaps, true);

	// The parent's card is a row gap below the leaf, its children start above the leaf.
	assert.deepEqual(grid.offsets, [
		{ x: 0, y: 40 },
		{ x: 0, y: 0 },
	]);
	const parentCardTop = grid.offsets[1].y + parentProfile[0].top;
	assert.equal(parentCardTop, grid.offsets[0].y + 40 + 10);
	assert.deepEqual(grid.size, { x: 680, y: 260 });
});

void test("compact: parents around a leaf keep their children a parents gap apart", () => {
	const grid = arrangeGrid([parent(0), leaf(1), parent(2)], gaps, true);
	const childrenBottom = grid.offsets[0].y + parentProfile[1].bottom;
	const childrenTop = grid.offsets[2].y + parentProfile[1].top;

	assert.equal(childrenTop - childrenBottom, 10 + 5);
	const firstCardBottom = grid.offsets[0].y + parentProfile[0].bottom;
	const leafTop = grid.offsets[1].y;
	const leafBottom = leafTop + 80;
	const lastCardTop = grid.offsets[2].y + parentProfile[0].top;
	assert.equal(leafTop - firstCardBottom, lastCardTop - leafBottom);
	assert.ok(leafTop - firstCardBottom > 10);
});

void test("compact: leaves between parents share the room evenly", () => {
	const grid = arrangeGrid(
		[parent(0), box(1, 0, 280, 20), box(2, 0, 280, 20), parent(3)],
		gaps,
		true,
	);
	const firstCardBottom = grid.offsets[0].y + parentProfile[0].bottom;
	const lastCardTop = grid.offsets[3].y + parentProfile[0].top;
	const gapsAround = [
		grid.offsets[1].y - firstCardBottom,
		grid.offsets[2].y - (grid.offsets[1].y + 20),
		lastCardTop - (grid.offsets[2].y + 20),
	];

	assert.equal(gapsAround[0], gapsAround[2]);
	assert.ok(gapsAround.every((gap) => gap >= 10));
});

void test("compact: adjacent parents keep the extra parents gap", () => {
	const grid = arrangeGrid([parent(0), parent(1)], gaps, true);

	assert.equal(grid.offsets[1].y, 260 + 10 + 5);
});

void test("compact leaves a double-row grid unchanged", () => {
	const items = [parent(0), leaf(1), box(0, 1, 280, 80)];

	assert.deepEqual(arrangeGrid(items, gaps, true), arrangeGrid(items, gaps));
});
