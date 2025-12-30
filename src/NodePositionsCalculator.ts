// Assumed types and constants based on usage
import type { TaskData, TaskId, Vector2 } from "./types";

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

export enum AlgorithmEnum {
	DefaultTree,
	SingleRow,
	DoubleRow,
}

export const ParentToChildHorizontalShift = 400;

export class NodePositionsCalculator {
	public readonly SiblingDelta = 90;
	public Algorithm: AlgorithmEnum = AlgorithmEnum.DefaultTree;
	public subtreeWidthByHalfPriority: Map<number, number> = new Map<
		number,
		number
	>();
	public xshift = 0.25;

	public RootFramePositions: Map<TaskId, Vector2> = new Map<
		TaskId,
		Vector2
	>();

	public CalculatePositionsInGlobalFrame(
		tasks: TaskData[],
		rootPosition: Vector2,
	): Map<TaskId, Vector2> {
		const rootFrame = this.CalculatePositionsInRootFrame(tasks);
		const result: Map<TaskId, Vector2> = new Map<TaskId, Vector2>();

		for (const [key, value] of rootFrame) {
			result.set(key, V2.add(value, rootPosition));
		}
		return result;
	}

	/**
	 * Позиции относительно рута
	 */
	private CalculatePositionsInRootFrame(
		tasks: TaskData[],
	): Map<TaskId, Vector2> {
		const parentFramePositions =
			this.CalculatePositionsInParentFrame(tasks);
		const positions: Map<TaskId, Vector2> = new Map<TaskId, Vector2>();
		positions.set(NoTaskId, V2.Zero);

		tasks.forEach((t) => {
			const parentPos = positions.get(t.parentId)!;
			const relativePos = parentFramePositions.get(t.taskId)!;
			positions.set(t.taskId, V2.add(parentPos, relativePos));
		});

		this.RootFramePositions = positions;
		return positions;
	}

	/**
	 * Считаем позиции на основе веса поддеревьев и константы alignmentRatio
	 */
	private CalculatePositionsInParentFrame(
		tasks: TaskData[],
	): Map<TaskId, Vector2> {
		// Расположение ноды родителя относительно высоты поддерева. 0 - top, 0.5 - center, 1 - bottom
		const alignmentRatio: Vector2 = { x: 0, y: 0.5 };
		// Дополнительный сдвиг в виде доли от siblingDelta, чтобы дети сиблингов не сливались в один список
		const parentDelta: Vector2 = { x: 0, y: 0.15 };

		//// Вспомогательные структуры данных
		// Сортируем таски, чтобы упросить реализацию DP: depth DESC, parentId ASC/DESC, priority ASC
		// TODO: мб поддерживать порядок сортировки в DataModel?
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
		tasks.forEach((t) => taskById.set(t.taskId, t));

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

		//// Расчеты
		// ключ - айди рута поддерева
		const subtreeSizeByNodeId: Map<TaskId, Vector2> = new Map<
			TaskId,
			Vector2
		>();

		const allIdsToProcess = [...sortedTasks.map((t) => t.taskId), NoTaskId];

		allIdsToProcess.forEach((id) => {
			if (childrenIdsByParentId.has(id)) {
				const childrenIds = childrenIdsByParentId.get(id)!;
				const xAgg =
					Math.max(
						...childrenIds.map(
							(x) => subtreeSizeByNodeId.get(x)!.x,
						),
					) + 1;
				const yAgg = childrenIds
					.map((x) => subtreeSizeByNodeId.get(x)!.y)
					.reduce((a, b) => a + b, 0);
				subtreeSizeByNodeId.set(
					id,
					V2.add({ x: xAgg, y: yAgg }, parentDelta),
				);
			} else {
				subtreeSizeByNodeId.set(id, V2.One);
			}
		});

		// Шифт дочерних нод относительно левой-верхней точки прямоугольника
		const siblingShiftsRel: Map<TaskId, Vector2> = new Map<
			TaskId,
			Vector2
		>();
		parentIds.forEach((parentId) => {
			const children = childrenIdsByParentId.get(parentId)!;
			children.forEach((childId, idx) => {
				let s = V2.mult(
					subtreeSizeByNodeId.get(childId)!,
					alignmentRatio,
				);
				if (idx > 0) {
					const previousSibling = children[idx - 1];
					const prevSize = V2.mult(
						subtreeSizeByNodeId.get(previousSibling)!,
						V2.sub(V2.One, alignmentRatio),
					);
					s = V2.add(s, prevSize);
					s = V2.add(s, siblingShiftsRel.get(previousSibling)!);
				}
				// Дополнительный сдвиг для отрисовки блокеров
				// var blockerCount = BlockerDataManager.GetConnections()
				//      .Count(x => x.Item1 == childId);
				// s += blockerCount;
				siblingShiftsRel.set(childId, s);
			});
		});

		// TODO: походу в проекте что-то не так с данными.
		// Нужно перейти на мета уровень и сделать удобный способ смотреть данные. Какой?
		// - Логировать десятки тасок в виде json может быть полезно, но не удобно.
		// - Можно добавить этап валидации данных, где будут проверяться предположения.
		// - Можно добавить дебажную инфу с данными выбранной таски. Не поможет, если проблема в удаленных.

		// Шифт родителя относительно левой-верхней точки прямоугольника.
		// Вычитаем parentDelta, чтобы родитель был выровнен по детям
		const parentAlignmentShift: Map<TaskId, Vector2> = new Map<
			TaskId,
			Vector2
		>();
		parentIds.forEach((parentId) => {
			parentAlignmentShift.set(
				parentId,
				V2.mult(
					V2.sub(subtreeSizeByNodeId.get(parentId)!, parentDelta),
					alignmentRatio,
				),
			);
		});

		// Шифт дочерних нод относительно родителя и уже в нормальных координатах
		const finalChildShifts: Map<TaskId, Vector2> = new Map<
			TaskId,
			Vector2
		>();
		sortedTasks.forEach((t) => {
			const parentShift = parentAlignmentShift.get(t.parentId);
			const siblingShift = siblingShiftsRel.get(t.taskId);
			if (parentShift === undefined) {
				throw new Error();
			}
			if (siblingShift === undefined) {
				throw new Error();
			}

			const verticalComponent = V2.mult(
				{ x: 0, y: this.SiblingDelta },
				V2.sub(siblingShift, parentShift),
			);

			finalChildShifts.set(
				t.taskId,
				V2.add(
					{ x: ParentToChildHorizontalShift, y: 0 },
					verticalComponent,
				),
			);
		});

		const rootTaskHasMultipleVisibleChildren =
			(childrenIdsByParentId.get(RootTaskId)! || []).length > 1;

		if (
			rootTaskHasMultipleVisibleChildren &&
			[AlgorithmEnum.SingleRow, AlgorithmEnum.DoubleRow].includes(
				this.Algorithm,
			)
		) {
			const rowMinYShift = 0.3;
			const depthOneTasks = sortedTasks.filter((x) => x.depth === 1);

			// Group by RowIndex
			const depthOneTasksByRow: Map<number, TaskData[]> = new Map<
				number,
				TaskData[]
			>();
			depthOneTasks.forEach((t) => {
				const idx = this.RowIndex(t);
				if (!depthOneTasksByRow.has(idx)) {
					depthOneTasksByRow.set(idx, []);
				}
				depthOneTasksByRow.get(idx)!.push(t);
			});

			const yShiftByRowId: Map<number, number> = {} as Map<
				number,
				number
			>;
			Object.keys(depthOneTasksByRow).forEach((key) => {
				const rowIdx = Number(key);
				const elements = depthOneTasksByRow.get(rowIdx)!;

				const shifts = elements.map((n) =>
					parentAlignmentShift.has(n.taskId)
						? parentAlignmentShift.get(n.taskId)!.y
						: V2.mult(alignmentRatio, V2.One).y,
				);

				const maxYShift = shifts.length > 0 ? Math.max(...shifts) : 0; // MaxOrDefault(0) equivalent
				yShiftByRowId.set(
					rowIdx,
					(maxYShift + rowMinYShift) * this.SiblingDelta,
				);
			});

			if (this.Algorithm === AlgorithmEnum.SingleRow) {
				let subtreeRelWidthAccumulator = this.xshift;
				depthOneTasks.forEach((x) => {
					finalChildShifts.set(x.taskId, {
						x:
							finalChildShifts.get(x.taskId)!.x +
							subtreeRelWidthAccumulator *
								ParentToChildHorizontalShift,
						y: yShiftByRowId.get(this.RowIndex(x))!,
					});
					subtreeRelWidthAccumulator +=
						subtreeSizeByNodeId.get(x.taskId)!.x + this.xshift;
				});
			} else if (this.Algorithm === AlgorithmEnum.DoubleRow) {
				// Размеры поддеревьев по иксу. Если 2 таски друг над другом, то используется большее.
				this.subtreeWidthByHalfPriority = {} as Map<number, number>;

				const rootChildrenByPriority: Map<number, TaskId> = {} as Map<
					number,
					TaskId
				>;
				const rootChildren =
					childrenIdsByParentId.get(RootTaskId) ?? [];
				rootChildren.forEach((id, idx) => {
					// reenumerate priorities based on index
					rootChildrenByPriority.set(idx, id);
				});

				rootChildrenByPriority.forEach((priority, chId) => {
					const x = taskById.get(chId)!;
					if (this.RowIndex(x) === 0) {
						const neighbourId =
							rootChildrenByPriority.get(x.priority + 1) ??
							x.taskId;

						this.subtreeWidthByHalfPriority.set(
							Math.floor(x.priority / 2),
							Math.max(
								subtreeSizeByNodeId.get(x.taskId)!.x,
								subtreeSizeByNodeId.get(neighbourId)!.x,
							),
						);
					}
				});

				depthOneTasks.forEach((x) => {
					const t = [...this.subtreeWidthByHalfPriority]
						.filter(([k, _]) => k < Math.floor(x.priority / 2))
						.map(([_, v]) => v);

					const tSum = t.reduce((a, b) => a + b, 0);

					finalChildShifts.set(x.taskId, {
						x:
							finalChildShifts.get(x.taskId)!.x +
							(this.xshift + this.xshift * t.length + tSum) *
								ParentToChildHorizontalShift,
						y:
							this.RowIndex(x) === 0
								? yShiftByRowId.get(this.RowIndex(x))!
								: -yShiftByRowId.get(this.RowIndex(x))!,
					});
				});
			}
		}
		return finalChildShifts;
	}

	public RowIndex(node: TaskData): number {
		switch (this.Algorithm) {
			case AlgorithmEnum.SingleRow:
				return 0;
			case AlgorithmEnum.DoubleRow:
				return node.priority % 2;
			default:
				throw new Error("AssumptionViolation");
		}
	}
}
