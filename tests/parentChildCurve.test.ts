import * as assert from "node:assert/strict";
import { test } from "node:test";
import { ParentToChildHorizontalGap } from "../src/NodePositionsCalculator";
import {
	ParentChildSigmoidWidth,
	parentChildCurvePath,
} from "../src/parentChildCurve";

void test("a normal parent-child gap is one sigmoid centred on the gap", () => {
	const start = { x: 280, y: 40 };
	const end = { x: start.x + ParentToChildHorizontalGap, y: 80 };
	const midX = (start.x + end.x) / 2;

	assert.equal(
		parentChildCurvePath(start, end),
		`M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`,
	);
});

void test("a longer span is a horizontal line plus a sigmoid the width of the first-child gap", () => {
	const start = { x: 280, y: 40 };
	const end = { x: 800, y: 100 };
	const sigmoidStartX = end.x - ParentChildSigmoidWidth;
	const midX = (sigmoidStartX + end.x) / 2;

	assert.equal(ParentChildSigmoidWidth, ParentToChildHorizontalGap);
	assert.equal(
		parentChildCurvePath(start, end),
		`M ${start.x} ${start.y} L ${sigmoidStartX} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`,
	);
	assert.equal(end.x - sigmoidStartX, ParentToChildHorizontalGap);
	assert.equal(midX, sigmoidStartX + ParentToChildHorizontalGap / 2);
});

void test("a long span toward the left keeps the sigmoid beside the child", () => {
	const start = { x: 800, y: 40 };
	const end = { x: 280, y: 100 };
	const sigmoidStartX = end.x + ParentChildSigmoidWidth;
	const midX = (sigmoidStartX + end.x) / 2;

	assert.equal(
		parentChildCurvePath(start, end),
		`M ${start.x} ${start.y} L ${sigmoidStartX} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`,
	);
});

void test("a span shorter than the first-child gap is one centred sigmoid", () => {
	const start = { x: 0, y: 10 };
	const end = { x: 40, y: 20 };
	const midX = (start.x + end.x) / 2;

	assert.equal(
		parentChildCurvePath(start, end),
		`M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`,
	);
});
