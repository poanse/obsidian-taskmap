import * as v from "valibot";
import type { FlatErrors } from "valibot";
import { StatusCode, type BlockerPair, type TaskData } from "../types";

/** Bump when the on-disk JSON shape changes (migrations can branch on this). */
export const TASKMAP_FILE_SCHEMA_VERSION = 1 as const;

const statusCodeSchema = v.picklist([
	StatusCode.DRAFT,
	StatusCode.READY,
	StatusCode.IN_PROGRESS,
	StatusCode.DONE,
] as const);

const taskDataSchema = v.object({
	name: v.string(),
	path: v.optional(v.string()),
	taskId: v.pipe(v.number(), v.integer()),
	status: statusCodeSchema,
	deleted: v.boolean(),
	parentId: v.pipe(v.number(), v.integer()),
	depth: v.pipe(v.number(), v.integer()),
	priority: v.pipe(v.number(), v.integer()),
	hidden: v.boolean(),
});

const blockerPairSchema = v.object({
	blocker: v.pipe(v.number(), v.integer()),
	blocked: v.pipe(v.number(), v.integer()),
});

export const projectFileSchema = v.object({
	schemaVersion: v.optional(
		v.pipe(
			v.number(),
			v.integer(),
			v.minValue(1),
			v.maxValue(TASKMAP_FILE_SCHEMA_VERSION),
		),
	),
	tasks: v.array(taskDataSchema),
	blockerPairs: v.optional(v.array(blockerPairSchema)),
	folderPath: v.optional(v.string()),
	curTaskId: v.pipe(v.number(), v.integer()),
});

export type ProjectFileParsed = {
	tasks: TaskData[];
	blockerPairs: BlockerPair[];
	folderPath: string | undefined;
	curTaskId: number;
};

export class TaskmapDataError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TaskmapDataError";
	}
}

function formatFlattenedIssues(
	flat: FlatErrors<typeof projectFileSchema>,
): string {
	const parts: string[] = [];
	if (flat.root?.length) {
		parts.push(...flat.root);
	}
	if (flat.nested) {
		for (const [path, msgs] of Object.entries(flat.nested)) {
			if (msgs?.length) {
				parts.push(`${path}: ${msgs.join(", ")}`);
			}
		}
	}
	if (flat.other?.length) {
		parts.push(...flat.other);
	}
	return parts.join("; ");
}

export function parseProjectFileJson(parsed: unknown): ProjectFileParsed {
	const result = v.safeParse(projectFileSchema, parsed);
	if (!result.success) {
		const flat = v.flatten(result.issues);
		const detail = formatFlattenedIssues(flat);
		throw new TaskmapDataError(
			detail || "Taskmap file does not match the expected structure.",
		);
	}
	const o = result.output;
	return {
		tasks: o.tasks,
		blockerPairs: o.blockerPairs ?? [],
		folderPath: o.folderPath,
		curTaskId: o.curTaskId,
	};
}
