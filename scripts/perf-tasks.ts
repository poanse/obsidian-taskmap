import { performance } from "node:perf_hooks";
import {
	NodePositionsCalculator,
	NoTaskId,
	RootTaskId,
} from "../src/NodePositionsCalculator";
import { ProjectData } from "../src/data/ProjectData.svelte";
import type { TaskData, TaskId } from "../src/types";

/**
 * Usage:
 *   npm run perf:tasks
 *   npm run perf:tasks -- --sizes=200,500,1000,2000 --iters=200
 */

const DEFAULT_SIZES = [200, 500, 1000, 2000, 5000];
const DEFAULT_ITERS = 200;

function parseArgs(argv: string[]) {
	const sizesArg = argv.find((arg) => arg.startsWith("--sizes="));
	const itersArg = argv.find((arg) => arg.startsWith("--iters="));

	const sizes = sizesArg
		? sizesArg
				.slice("--sizes=".length)
				.split(",")
				.map((v) => Number(v.trim()))
				.filter((v) => Number.isFinite(v) && v > 1)
		: DEFAULT_SIZES;

	const iterations = itersArg
		? Math.max(1, Number(itersArg.slice("--iters=".length)))
		: DEFAULT_ITERS;

	return { sizes, iterations };
}

function makeTasks(count: number): TaskData[] {
	const tasks: TaskData[] = [];
	tasks.push({
		taskId: 0,
		parentId: NoTaskId,
		depth: 0,
		priority: 0,
		deleted: false,
		hidden: false,
		status: 2,
		name: "root",
	});

	for (let id = 1; id < count; id += 1) {
		const parentId = Math.floor((id - 1) / 3);
		const parentDepth = tasks[parentId].depth;
		tasks.push({
			taskId: id,
			parentId,
			depth: parentDepth + 1,
			priority: id % 8,
			deleted: false,
			hidden: id % 23 === 0,
			status: id % 4,
			name: `task-${id}`,
		});
	}

	const hasChildren = new Set<TaskId>();
	for (const task of tasks) {
		hasChildren.add(task.parentId);
	}
	for (const task of tasks) {
		const isLeaf = !hasChildren.has(task.taskId);
		if (isLeaf && task.taskId !== RootTaskId && task.taskId % 17 === 0) {
			task.deleted = true;
		}
	}

	return tasks;
}

function randomTaskIds(count: number, picks: number): TaskId[] {
	const out: TaskId[] = new Array<TaskId>(picks);
	for (let i = 0; i < picks; i += 1) {
		out[i] = Math.floor(Math.random() * (count - 1)) + 1;
	}
	return out;
}

function createProjectData(tasks: TaskData[]): ProjectData {
	return new ProjectData({
		tasks: tasks.map((t) => ({ ...t })),
		blockerPairs: [],
		folderPath: undefined,
		curTaskId: tasks.length,
	});
}

function measureMs(fn: () => void): number {
	const t0 = performance.now();
	fn();
	return performance.now() - t0;
}

function isTaskHidden(
	projectData: ProjectData,
	taskId: TaskId,
	focusedTaskId: TaskId,
): boolean {
	const task = projectData.getTask(taskId);
	const ancestorIds = projectData.getAncestorIds(taskId);
	const focusedAncestorIds = new Set(
		projectData.getAncestorIds(focusedTaskId),
	);
	const focusedDescendantIds = new Set(
		projectData.getDescendantIds(focusedTaskId),
	);

	return (
		task.deleted ||
		ancestorIds.some((id) => projectData.getTask(id).hidden) ||
		!(
			task.taskId === focusedTaskId ||
			focusedAncestorIds.has(task.taskId) ||
			focusedDescendantIds.has(task.taskId)
		)
	);
}

function benchmarkBackend(tasks: TaskData[], iterations: number) {
	let projectData!: ProjectData;
	const constructMs = measureMs(() => {
		projectData = createProjectData(tasks);
	});
	const probes = randomTaskIds(tasks.length, iterations);
	const calc = new NodePositionsCalculator();

	const lookupMs = measureMs(() => {
		for (const id of probes) projectData.getTask(id);
	});

	const ancestorsMs = measureMs(() => {
		for (const id of probes) projectData.getAncestorIds(id);
	});

	const descendantsMs = measureMs(() => {
		for (const id of probes) projectData.getDescendantIds(id);
	});

	const isTaskHiddenMs = measureMs(() => {
		const focusedTaskId = RootTaskId;
		for (const task of projectData.tasks.values()) {
			void isTaskHidden(projectData, task.taskId, focusedTaskId);
		}
	});

	const layoutMs = measureMs(() => {
		const focusedTaskId = RootTaskId;
		const visibleTasks = [...projectData.tasks.values()].filter(
			(t) => !isTaskHidden(projectData, t.taskId, focusedTaskId),
		);
		calc.CalculatePositionsInGlobalFrame(visibleTasks, { x: 0, y: 0 });
	});

	return {
		constructMs,
		lookupMs,
		ancestorsMs,
		descendantsMs,
		isTaskHiddenMs,
		layoutMs,
		totalMs:
			constructMs +
			lookupMs +
			ancestorsMs +
			descendantsMs +
			isTaskHiddenMs +
			layoutMs,
	};
}

function fmt(ms: number): string {
	return `${ms.toFixed(2)}ms`;
}

function run() {
	(globalThis as unknown as { $state?: <T>(value: T) => T }).$state = <T>(
		value: T,
	) => value;

	const { sizes, iterations } = parseArgs(process.argv.slice(2));

	console.debug(
		`Task benchmark | iterations per operation set: ${iterations}\n`,
	);

	for (const size of sizes) {
		const tasks = makeTasks(size);
		const result = benchmarkBackend(tasks, iterations);

		console.debug(`N=${size}`);
		console.debug(
			`  projectData total=${fmt(result.totalMs)} construct=${fmt(result.constructMs)} lookup=${fmt(result.lookupMs)} ancestors=${fmt(result.ancestorsMs)} descendants=${fmt(result.descendantsMs)} isTaskHidden(all N)=${fmt(result.isTaskHiddenMs)} layout=${fmt(result.layoutMs)}`,
		);
		console.debug("");
	}
}

run();
