import { LayoutChoice, type Vector2 } from "./types";

/** Zero-based grid cell. Rows grow downwards, columns grow to the right. */
export type GridCell = { row: number; column: number };

/** Maps a child's 1-based place among its siblings, in priority order, to its grid cell. */
export type GridPlacement = (i: number) => GridCell;

export const GRID_PLACEMENTS: Record<LayoutChoice, GridPlacement> = {
	[LayoutChoice.Tree]: (i) => ({ row: i - 1, column: 0 }),
	// Dense priorities 0..n-1. A gap keeps its row: even priorities stay on top.
	[LayoutChoice.DoubleRow]: (i) => ({
		row: (i - 1) % 2,
		column: Math.floor((i - 1) / 2),
	}),
};

/** Top row is even priorities, bottom row is odd priorities. */
export function doubleRowOfPriority(priority: number): number {
	return ((priority % 2) + 2) % 2;
}

export type GridItem = {
	cell: GridCell;
	/** Size of the item's whole subtree. */
	size: Vector2;
	hasChildren: boolean;
};

export type GridGaps = {
	row: number;
	/** Added to the row gap where a column has subtrees with children on both sides of it. */
	parentsRow: number;
	column: number;
};

export type GridArrangement = {
	/** Top-left of each item relative to the grid's top-left, in input order. */
	offsets: Vector2[];
	size: Vector2;
};

/**
 * Each row is as tall as its tallest item and each column as wide as its widest.
 * An item sits at the left of its column, centred vertically in its row.
 */
export function arrangeGrid(
	items: GridItem[],
	gaps: GridGaps,
): GridArrangement {
	const rowCount = Math.max(0, ...items.map((item) => item.cell.row + 1));
	const columnCount = Math.max(
		0,
		...items.map((item) => item.cell.column + 1),
	);
	const rowHeights = new Array<number>(rowCount).fill(0);
	const columnWidths = new Array<number>(columnCount).fill(0);
	const parentCells = new Set<string>();
	const cellKey = (row: number, column: number) => `${row},${column}`;
	items.forEach(({ cell, size, hasChildren }) => {
		rowHeights[cell.row] = Math.max(rowHeights[cell.row], size.y);
		columnWidths[cell.column] = Math.max(columnWidths[cell.column], size.x);
		if (hasChildren) {
			parentCells.add(cellKey(cell.row, cell.column));
		}
	});

	const rowTops: number[] = [];
	let y = 0;
	for (let row = 0; row < rowCount; row++) {
		if (row > 0) {
			y += gaps.row;
			for (let column = 0; column < columnCount; column++) {
				if (
					parentCells.has(cellKey(row - 1, column)) &&
					parentCells.has(cellKey(row, column))
				) {
					y += gaps.parentsRow;
					break;
				}
			}
		}
		rowTops.push(y);
		y += rowHeights[row];
	}

	const columnLefts: number[] = [];
	let x = 0;
	for (let column = 0; column < columnCount; column++) {
		if (column > 0) {
			x += gaps.column;
		}
		columnLefts.push(x);
		x += columnWidths[column];
	}

	return {
		offsets: items.map(({ cell, size }) => ({
			x: columnLefts[cell.column],
			y: rowTops[cell.row] + (rowHeights[cell.row] - size.y) / 2,
		})),
		size: { x, y },
	};
}
