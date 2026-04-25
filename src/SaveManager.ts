import { ProjectData } from "./data/ProjectData.svelte";
import { type App, Notice, type TFile } from "obsidian";
import {
	parseProjectFileJson,
	TaskmapDataError,
	TASKMAP_FILE_SCHEMA_VERSION,
} from "./data/ProjectDataSchema";

export { TaskmapDataError };

export function serializeProjectData(projectData: ProjectData) {
	return JSON.stringify(
		{
			schemaVersion: TASKMAP_FILE_SCHEMA_VERSION,
			tasks: projectData.tasks,
			blockerPairs: projectData.blockerPairs,
			folderPath: projectData.folderPath,
			curTaskId: projectData.curTaskId,
		},
		null,
		2,
	);
}

export async function updateFile(
	app: App,
	file: TFile,
	projectData: ProjectData,
) {
	await app.vault.modify(file, serializeProjectData(projectData));
}

export async function loadProjectData(app: App, taskmapFile: TFile) {
	let projectData: ProjectData | undefined = undefined;
	try {
		const projectDataRaw = await app.vault.read(taskmapFile);
		projectData = deserializeProjectData(projectDataRaw);
	} catch (e) {
		console.error(
			`Taskmap rename hook: skipped invalid file ${taskmapFile.path} ${e}`,
		);
	}
	return projectData;
}

export function deserializeProjectData(data: string) {
	let parsed: unknown;
	try {
		parsed = JSON.parse(data);
	} catch (err) {
		new Notice(`Taskmap file could not be read: ${String(err)}`);
		throw new TaskmapDataError(
			`Taskmap file is not valid JSON. ${String(err)}`,
		);
	}
	const input = parseProjectFileJson(parsed);
	return new ProjectData(input);
}
