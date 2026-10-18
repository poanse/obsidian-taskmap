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

export type Span = { top: number; bottom: number };

/**
 * Vertical extent of a subtree at each depth below its root, relative to the
 * subtree's top. Index 0 is the root itself. Tasks share one width, so the
 * same depth of siblings in a column covers the same horizontal band.
 */
export type Profile = Span[];

export type GridItem = {
	cell: GridCell;
	/** Size of the item's whole subtree. */
	size: Vector2;
	profile: Profile;
	hasChildren: boolean;
};

export type GridGaps = {
	row: number;
	/**
	 * Added to the row gap where a column has subtrees with children on both
	 * sides of it. In a compact column, added between subtasks of different siblings.
	 */
	parentsRow: number;
	column: number;
};

export type GridArrangement = {
	/** Top-left of each item relative to the grid's top-left, in input order. */
	offsets: Vector2[];
	size: Vector2;
	/** Profile of all items together, relative to the grid's top. */
	profile: Profile;
};

/**
 * Each row is as tall as its tallest item and each column as wide as its widest.
 * An item sits at the left of its column, centred vertically in its row.
 * With compact on, a single column is packed by item profiles instead of rows.
 */
export function arrangeGrid(
	items: GridItem[],
	gaps: GridGaps,
	compact = false,
): GridArrangement {
	if (compact && items.every((item) => item.cell.column === 0)) {
		return stackColumn(items, gaps);
	}
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

	const offsets = items.map(({ cell, size }) => ({
		x: columnLefts[cell.column],
		y: rowTops[cell.row] + (rowHeights[cell.row] - size.y) / 2,
	}));
	return {
		offsets,
		size: { x, y },
		profile: mergeProfiles(items, offsets),
	};
}

/**
 * Every depth of an item stays a row gap from the items next to it. Below the
 * cards, that depth holds subtasks of different siblings, so the parents gap
 * is added there to tell the subtrees apart. Each item
 * sits halfway between the highest and lowest place it could take, so a task
 * between two larger siblings is centred in the room between them. An item
 * may reach above the items before it, so offsets are shifted to start at zero.
 */
function stackColumn(items: GridItem[], gaps: GridGaps): GridArrangement {
	const order = items
		.map((_, idx) => idx)
		.sort((a, b) => items[a].cell.row - items[b].cell.row);
	const highest = packColumn(items, order, gaps, 0, 1);
	const lowest = packColumn(
		items,
		[...order].reverse(),
		gaps,
		highest[order[order.length - 1]] ?? 0,
		-1,
	);
	const ys = highest.map((y, idx) => (y + lowest[idx]) / 2);

	const raw = mergeProfiles(
		items,
		ys.map((y) => ({ x: 0, y })),
	);
	const top = Math.min(0, ...raw.map((span) => span.top));
	const bottom = Math.max(0, ...raw.map((span) => span.bottom));
	return {
		offsets: ys.map((y) => ({ x: 0, y: y - top })),
		size: {
			x: Math.max(0, ...items.map((item) => item.size.x)),
			y: bottom - top,
		},
		profile: raw.map((span) => ({
			top: span.top - top,
			bottom: span.bottom - top,
		})),
	};
}

/**
 * Places items in the given order, each as close to the ones already placed
 * as the gaps allow. Direction 1 packs downwards from the first item's top,
 * -1 packs upwards.
 */
function packColumn(
	items: GridItem[],
	order: number[],
	gaps: GridGaps,
	start: number,
	direction: 1 | -1,
): number[] {
	const furthest = (values: number[]) =>
		direction === 1 ? Math.max(...values) : Math.min(...values);
	const ys = new Array<number>(items.length).fill(0);
	const edges: number[] = [];
	for (const idx of order) {
		const item = items[idx];
		let y = start;
		if (edges.length > 0) {
			const shared = item.profile.slice(0, edges.length);
			y = furthest(
				shared.map((span, depth) => {
					const gap = gaps.row + (depth > 0 ? gaps.parentsRow : 0);
					return direction === 1
						? edges[depth] + gap - span.top
						: edges[depth] - gap - span.bottom;
				}),
			);
		}
		ys[idx] = y;
		item.profile.forEach((span, depth) => {
			const edge = y + (direction === 1 ? span.bottom : span.top);
			edges[depth] =
				edges[depth] === undefined
					? edge
					: furthest([edges[depth], edge]);
		});
	}
	return ys;
}

function mergeProfiles(items: GridItem[], offsets: Vector2[]): Profile {
	const merged: Profile = [];
	items.forEach((item, idx) => {
		const dy = offsets[idx].y;
		item.profile.forEach((span, depth) => {
			const current = merged[depth];
			merged[depth] = {
				top: Math.min(current?.top ?? Infinity, span.top + dy),
				bottom: Math.max(
					current?.bottom ?? -Infinity,
					span.bottom + dy,
				),
			};
		});
	});
	return merged;
}
