import { NoTaskId } from "../src/NodePositionsCalculator";
import { StatusCode, type TaskData, type TaskId, type Vector2 } from "../src/types";

function task(taskId: TaskId, parentId: TaskId, depth: number, priority: number): TaskData {
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

// Tree:
//   root (0)
//     A (1)            prio 0
//       A1 (3)
//       A2 (4)         larger box
//         A2a (7)
//         A2b (8)
//     B (2)            prio 1, leaf
//     C (5)            prio 2
//       C1 (6)
//     D (9)            prio 3, leaf
//     E (10)           prio 4
//       E1 (11)
//       E2 (12)
//       E3 (13)
export const layoutTasks: TaskData[] = [
	task(0, NoTaskId, 0, 0),
	task(1, 0, 1, 0),
	task(2, 0, 1, 1),
	task(3, 1, 2, 0),
	task(4, 1, 2, 1),
	task(5, 0, 1, 2),
	task(6, 5, 2, 0),
	task(7, 4, 3, 0),
	task(8, 4, 3, 1),
	task(9, 0, 1, 3),
	task(10, 0, 1, 4),
	task(11, 10, 2, 0),
	task(12, 10, 2, 1),
	task(13, 10, 2, 2),
];

export const layoutSizes = new Map<TaskId, Vector2>([[4, { x: 280, y: 160 }]]);

export const layoutRootPosition: Vector2 = { x: 0, y: 300 };
