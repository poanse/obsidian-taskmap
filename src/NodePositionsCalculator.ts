// Assumed types and constants based on usage
import {
	LayoutChoice,
	type TaskData,
	type TaskId,
	type Vector2,
} from "./types";
import { TASK_SIZE } from "./Constants";
import {
	arrangeGrid,
	doubleRowOfPriority,
	GRID_PLACEMENTS,
	type GridArrangement,
	type GridCell,
	type Profile,
} from "./layoutGrid";

export const NoTaskId = -1 as TaskId;
export const RootTaskId = 0 as TaskId;

// Helper for Vector2 operations since TS doesn't support operator overloading
export const V2 = {
	Zero: { x: 0, y: 0 },
	One: { x: 1, y: 1 },
	add: (v1: Vector2, v2: Vector2): Vector2 => ({
		x: v1.x + v2.x,
		y: v1.y + v2.y,
	}),
	sub: (v1: Vector2, v2: Vector2): Vector2 => ({
		x: v1.x - v2.x,
		y: v1.y - v2.y,
	}),
	mult: (v: Vector2, s: number | Vector2): Vector2 => {
		if (typeof s === "number") return { x: v.x * s, y: v.y * s };
		return { x: v.x * s.x, y: v.y * s.y };
	},
};

// Horizontal shift between parent and child: width + gap
export const ParentToChildHorizontalGap = 120;
// Horizontal gap between neighbouring columns of a children grid
export const GridColumnGap = 120;

type Node = {
	id: TaskId;
	size: Vector2;
	subtreeSize: Vector2 | undefined;
	profile: Profile | undefined;
	siblingShift: Vector2 | undefined;
	parentAlignmentShift: Vector2 | undefined;
	finalShiftInParentFrame: Vector2 | undefined;
};

export class NodePositionsCalculator {
	/**
	 * Vertical shift between siblings: height + gap
	 */
	public readonly SiblingVerticalGap = 10;
	/**
	 * Additional gap between subtrees to distinguish between subtrees in a long vertical list of tasks
	 */
	public readonly SiblingParentsVerticalGap = 5;
	/**
	 * Position of the parent node relative to the height of the subtree. 0 - top, 0.5 - center, 1 - bottom
	 */
	public readonly AlignmentRatio = 0.5;

	private readonly DefaultNodeSize = {
		x: TASK_SIZE.width,
		y: TASK_SIZE.height,
	};
	public Layout: LayoutChoice = LayoutChoice.Tree;
	/**
	 * Siblings in a column are packed by the outline of their subtrees, so a
	 * task without subtasks sits next to a sibling's card, not its whole subtree.
	 */
	public Compact = false;
	/**
	 * When this is a task other than the root, that task and its ancestors share
	 * the root's Y. Root means the full map.
	 */
	public FocusedTaskId: TaskId = RootTaskId;
	private priorityById = new Map<TaskId, number>();

	public RootFramePositions: Map<TaskId, Vector2> = new Map<
		TaskId,
		Vector2
	>();

	public CalculatePositionsInGlobalFrame(
		tasks: TaskData[],
		rootPosition: Vector2,
		sizes: Map<TaskId, Vector2> | undefined = undefined,
	): Map<TaskId, Vector2> {
		const rootFrame = this.CalculatePositionsInRootFrame(tasks, sizes);
		const result: Map<TaskId, Vector2> = new Map<TaskId, Vector2>();

		for (const [key, value] of rootFrame) {
			result.set(key, V2.add(value, rootPosition));
		}
		return result;
	}

	/**
	 * Positions relative to the root
	 */
	private CalculatePositionsInRootFrame(
		tasks: TaskData[],
		sizes: Map<TaskId, Vector2> | undefined = undefined,
	): Map<TaskId, Vector2> {
		this.priorityById = new Map(tasks.map((t) => [t.taskId, t.priority]));
		const parentFramePositions = this.CalculatePositionsInParentFrame(
			tasks,
			sizes,
		);
		const positions: Map<TaskId, Vector2> = new Map<TaskId, Vector2>();
		positions.set(NoTaskId, V2.Zero);

		const sortedTasksDepthAsc = [...tasks].sort((a, b) => {
			if (b.depth !== a.depth) {
				return a.depth - b.depth;
			} else if (a.parentId !== b.parentId) {
				return a.parentId - b.parentId;
			} else {
				return a.priority - b.priority;
			}
		});
		sortedTasksDepthAsc.forEach((t) => {
			const parentPos = positions.get(t.parentId);
			const relativePos = parentFramePositions.get(t.taskId);
			if (parentPos == undefined) {
				throw new Error(
					`No parent position for task ${t.taskId} with parent ${t.parentId}`,
				);
			}
			if (relativePos == undefined) {
				throw new Error(
					`No relative position for task ${t.taskId} with parent ${t.parentId}`,
				);
			}
			positions.set(t.taskId, V2.add(parentPos, relativePos));
		});
		// Make root unmovable
		const rootShift = positions.get(RootTaskId);
		if (rootShift) {
			tasks.forEach((t) => {
				positions.set(
					t.taskId,
					V2.sub(positions.get(t.taskId)!, rootShift),
				);
			});
		}
		if (
			this.FocusedTaskId === RootTaskId ||
			this.FocusedTaskId === NoTaskId
		) {
			this.separateDoubleRowBranches(tasks, positions, sizes);
		} else {
			this.alignFocusedChain(tasks, positions);
		}

		this.RootFramePositions = positions;
		return positions;
	}

	/**
	 * The focused task and each ancestor share the root's top edge. Descendants
	 * of the focused task keep their offset from it.
	 */
	private alignFocusedChain(
		tasks: TaskData[],
		positions: Map<TaskId, Vector2>,
	): void {
		const rootPos = positions.get(RootTaskId);
		const focusedPos = positions.get(this.FocusedTaskId);
		if (rootPos === undefined || focusedPos === undefined) {
			return;
		}
		const parentById = new Map(tasks.map((t) => [t.taskId, t.parentId]));
		const chain = new Set<TaskId>();
		let current: TaskId | undefined = this.FocusedTaskId;
		while (current !== undefined && current !== NoTaskId) {
			chain.add(current);
			if (current === RootTaskId) {
				break;
			}
			current = parentById.get(current);
		}

		const focusedDelta = rootPos.y - focusedPos.y;
		for (const task of tasks) {
			if (task.taskId === RootTaskId || chain.has(task.taskId)) {
				continue;
			}
			let cursor: TaskId | undefined = task.parentId;
			let underFocused = false;
			while (cursor !== undefined && cursor !== NoTaskId) {
				if (cursor === this.FocusedTaskId) {
					underFocused = true;
					break;
				}
				cursor = parentById.get(cursor);
			}
			if (!underFocused) {
				continue;
			}
			const pos = positions.get(task.taskId);
			if (pos !== undefined) {
				pos.y += focusedDelta;
			}
		}
		for (const id of chain) {
			if (id === RootTaskId) {
				continue;
			}
			const pos = positions.get(id);
			if (pos !== undefined) {
				pos.y = rootPos.y;
			}
		}
	}

	/**
	 * First-row branches sit fully above the root and second-row branches fully
	 * below it. Each branch keeps its shape; only its vertical position changes.
	 */
	private separateDoubleRowBranches(
		tasks: TaskData[],
		positions: Map<TaskId, Vector2>,
		sizes: Map<TaskId, Vector2> | undefined,
	): void {
		if (this.Layout !== LayoutChoice.DoubleRow) {
			return;
		}
		const rootPos = positions.get(RootTaskId);
		if (rootPos === undefined) {
			return;
		}
		const rootSize = sizes?.get(RootTaskId) ?? this.DefaultNodeSize;
		const rootTop = rootPos.y;
		const rootBottom = rootTop + rootSize.y;

		const children = tasks
			.filter((t) => t.parentId === RootTaskId)
			.sort((a, b) => a.priority - b.priority);
		const rowByBranch = new Map<TaskId, number>();
		children.forEach((child) => {
			rowByBranch.set(child.taskId, doubleRowOfPriority(child.priority));
		});

		const parentById = new Map(tasks.map((t) => [t.taskId, t.parentId]));
		const rowOf = (taskId: TaskId): number | undefined => {
			let current = taskId;
			while (current !== RootTaskId && current !== NoTaskId) {
				const row = rowByBranch.get(current);
				if (row !== undefined) {
					return row;
				}
				const parent = parentById.get(current);
				if (parent === undefined) {
					return undefined;
				}
				current = parent;
			}
			return undefined;
		};

		const boundsByRow = new Map<number, { top: number; bottom: number }>();
		const membersByRow = new Map<number, TaskId[]>();
		for (const task of tasks) {
			if (task.taskId === RootTaskId) {
				continue;
			}
			const row = rowOf(task.taskId);
			if (row === undefined) {
				continue;
			}
			const pos = positions.get(task.taskId);
			if (pos === undefined) {
				continue;
			}
			const size = sizes?.get(task.taskId) ?? this.DefaultNodeSize;
			const bounds = boundsByRow.get(row) ?? {
				top: Infinity,
				bottom: -Infinity,
			};
			bounds.top = Math.min(bounds.top, pos.y);
			bounds.bottom = Math.max(bounds.bottom, pos.y + size.y);
			boundsByRow.set(row, bounds);
			const members = membersByRow.get(row) ?? [];
			members.push(task.taskId);
			membersByRow.set(row, members);
		}

		for (const [row, bounds] of boundsByRow) {
			const delta =
				row === 0
					? rootTop - this.SiblingVerticalGap - bounds.bottom
					: rootBottom + this.SiblingVerticalGap - bounds.top;
			for (const id of membersByRow.get(row) ?? []) {
				positions.get(id)!.y += delta;
			}
		}
	}

	/**
	 * Calculate positions based on the weight of subtrees and the alignmentRatio constant
	 */
	private CalculatePositionsInParentFrame(
		tasks: TaskData[],
		sizes: Map<TaskId, Vector2> | undefined = undefined,
	): Map<TaskId, Vector2> {
		// Helper data structures
		// Sort tasks to simplify the implementation of DP: depth DESC, parentId ASC/DESC, priority ASC
		const sortedTasks = [...tasks].sort((a, b) => {
			if (b.depth !== a.depth) {
				return b.depth - a.depth;
			} else if (a.parentId !== b.parentId) {
				return a.parentId - b.parentId;
			} else {
				return a.priority - b.priority;
			}
		});

		const taskById = new Map<TaskId, TaskData>();
		sortedTasks.forEach((t) => taskById.set(t.taskId, t));

		const childrenIdsByParentId: Map<TaskId, TaskId[]> = new Map<
			TaskId,
			TaskId[]
		>();
		sortedTasks.forEach((t) => {
			const pId = t.parentId;
			if (!childrenIdsByParentId.has(pId)) {
				childrenIdsByParentId.set(pId, []);
			}
			childrenIdsByParentId.get(pId)!.push(t.taskId);
		});

		const parentIds = [...childrenIdsByParentId.keys()];

		//// Calculations
		// key - root id of the subtree
		const nodes: Map<TaskId, Node> = new Map<TaskId, Node>();
		tasks.forEach((t) =>
			nodes.set(t.taskId, {
				id: t.taskId,
				size: sizes?.get(t.taskId) ?? this.DefaultNodeSize,
				subtreeSize: undefined,
				profile: undefined,
				finalShiftInParentFrame: undefined,
				parentAlignmentShift: undefined,
				siblingShift: undefined,
			}),
		);

		const grids = new Map<TaskId, GridArrangement>();
		this.CalculateSubtreeSizes(
			nodes,
			sortedTasks,
			childrenIdsByParentId,
			grids,
		);

		// Shift of children nodes relative to the top-left point of the subtree rectangle
		this.CalculateSiblingShift(
			nodes,
			parentIds,
			childrenIdsByParentId,
			grids,
		);

		// Shift of the parent relative to the top-left point of the subtree rectangle.
		// Subtract parentDelta, so that the parent is aligned with the children
		this.CalculateParentAlignmentShift(nodes, parentIds);

		// Shift of children nodes relative to the parent
		// in pixels - not in relative coordinates
		this.CalculateFinalShiftInParentFrame(nodes, sortedTasks);

		const res = new Map<TaskId, Vector2>();
		nodes.forEach((node) => {
			res.set(node.id, node.finalShiftInParentFrame!);
		});
		return res;
	}
	/**
	 * Size of subtree in integer amounts of tasks
	 */
	private CalculateSubtreeSizes(
		nodes: Map<TaskId, Node>,
		sortedTasks: TaskData[],
		childrenIdsByParentId: Map<TaskId, TaskId[]>,
		grids: Map<TaskId, GridArrangement>,
	): void {
		const allIdsToProcess = sortedTasks.map((t) => t.taskId);
		allIdsToProcess.forEach((id) => {
			const childrenIds = childrenIdsByParentId.get(id) ?? [];
			const node = nodes.get(id);
			if (node === undefined) {
				throw new Error(`${id} not found in nodes`);
			}
			if (childrenIds.length == 0) {
				node.subtreeSize = node.size;
				node.profile = [{ top: 0, bottom: node.size.y }];
			} else {
				const grid = this.ArrangeChildren(
					id,
					nodes,
					childrenIds,
					childrenIdsByParentId,
				);
				grids.set(id, grid);
				node.subtreeSize = {
					x: node.size.x + ParentToChildHorizontalGap + grid.size.x,
					y: Math.max(grid.size.y, node.size.y),
				};
				const nodeTop = (node.subtreeSize.y - node.size.y) / 2;
				const gridTop = this.GridTop(node.size, grid);
				node.profile = [
					{ top: nodeTop, bottom: nodeTop + node.size.y },
					...grid.profile.map((span) => ({
						top: span.top + gridTop,
						bottom: span.bottom + gridTop,
					})),
				];
			}
		});
	}

	/**
	 * Places a parent's children, in priority order, on a grid of their subtrees.
	 * The root's children follow the Layout choice; deeper tasks always use a single column.
	 */
	private ArrangeChildren(
		parentId: TaskId,
		nodes: Map<TaskId, Node>,
		childrenIds: TaskId[],
		childrenIdsByParentId: Map<TaskId, TaskId[]>,
	): GridArrangement {
		const layout =
			parentId === RootTaskId ? this.Layout : LayoutChoice.Tree;
		const columnInRow = [0, 0];
		return arrangeGrid(
			childrenIds.map((id, idx) => ({
				cell: this.childCell(layout, id, idx, columnInRow),
				size: nodes.get(id)!.subtreeSize!,
				profile: nodes.get(id)!.profile!,
				hasChildren: (childrenIdsByParentId.get(id)?.length ?? 0) > 0,
			})),
			{
				row: this.SiblingVerticalGap,
				parentsRow: this.SiblingParentsVerticalGap,
				column: GridColumnGap,
			},
			this.Compact,
		);
	}

	/** Top of the children's grid in the parent's subtree. */
	private GridTop(parentNodeSize: Vector2, grid: GridArrangement): number {
		return Math.max(0, (parentNodeSize.y - grid.size.y) / 2);
	}

	/**
	 * Double row keeps a task on the row of its priority, so a missing priority
	 * does not move the later tasks onto the other row. Tree still packs by index.
	 */
	private childCell(
		layout: LayoutChoice,
		childId: TaskId,
		index: number,
		columnInRow: number[],
	): GridCell {
		if (layout !== LayoutChoice.DoubleRow) {
			return GRID_PLACEMENTS[layout](index + 1);
		}
		const row = doubleRowOfPriority(
			this.priorityById.get(childId) ?? index,
		);
		const column = columnInRow[row] ?? 0;
		columnInRow[row] = column + 1;
		return { row, column };
	}

	/**
	 * The children's grid sits to the right of the parent, vertically centred on
	 * the parent when the parent is taller than the grid.
	 */
	private CalculateSiblingShift(
		nodes: Map<TaskId, Node>,
		parentIds: TaskId[],
		childrenIdsByParentId: Map<TaskId, TaskId[]>,
		grids: Map<TaskId, GridArrangement>,
	): void {
		parentIds.forEach((parentId) => {
			const children = childrenIdsByParentId.get(parentId)!;
			const grid =
				grids.get(parentId) ??
				this.ArrangeChildren(
					parentId,
					nodes,
					children,
					childrenIdsByParentId,
				);
			const parentNodeSize =
				nodes.get(parentId)?.size ?? this.DefaultNodeSize; // in case of -1
			const gridTop = this.GridTop(parentNodeSize, grid);
			children.forEach((childId, idx) => {
				nodes.get(childId)!.siblingShift = {
					x:
						parentNodeSize.x +
						ParentToChildHorizontalGap +
						grid.offsets[idx].x,
					y: gridTop + grid.offsets[idx].y,
				};
			});
		});
	}

	private CalculateParentAlignmentShift(
		nodes: Map<TaskId, Node>,
		parentIds: TaskId[],
	) {
		parentIds
			.filter((p) => p != NoTaskId)
			.forEach((taskId) => {
				const node = nodes.get(taskId);
				if (node === undefined) {
					throw new Error(`Task id ${taskId} is missing from nodes`);
				}
				if (!node?.subtreeSize) {
					throw new Error(
						`Failed to calculate layout: taskId [${taskId}] not in subtreeSizeByNodeId`,
					);
				}
				if (this.AlignmentRatio == 0.5) {
					const yShift = (node.subtreeSize.y - node.size.y) / 2;
					node.parentAlignmentShift = { x: 0, y: yShift };
				} else {
					throw new Error("Not implemented");
				}
			});
	}

	private CalculateFinalShiftInParentFrame(
		nodes: Map<TaskId, Node>,
		sortedTasks: TaskData[],
	) {
		sortedTasks
			.filter((t) => t.taskId != NoTaskId)
			.forEach((t) => {
				const parentNode = nodes.get(t.parentId);
				const parentShift = parentNode?.parentAlignmentShift ?? V2.Zero;
				const taskNode = nodes.get(t.taskId)!;

				taskNode.finalShiftInParentFrame = V2.sub(
					V2.add(
						taskNode.siblingShift!,
						taskNode.parentAlignmentShift ?? V2.Zero,
					),
					parentShift,
				);
			});
	}
}
