import { ProjectData } from "./ProjectData.svelte";
import type { App, TFile } from "obsidian";

export function serializeProjectData(projectData: ProjectData) {
	return JSON.stringify(
		{
			tasks: projectData.tasks,
			curTaskId: projectData.curTaskId,
		},
		null,
		2,
	);
}

export function deserializeProjectData(app: App, data: string) {
	return new ProjectData(JSON.parse(data));
}

export async function updateFile(
	app: App,
	file: TFile,
	projectData: ProjectData,
) {
	await app.vault.modify(file!, serializeProjectData(projectData));
}
