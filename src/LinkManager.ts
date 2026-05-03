import type { App, TFile } from "obsidian";
import type { TaskData } from "./types";

export function linkFromFilePath(path: string) {
	if (path.endsWith(".md")) {
		path = path.slice(0, path.length - 3);
	}
	return `[[${path}]]`;
}

export function isLink(s: string): boolean {
	return s.startsWith("[[") && s.endsWith("]]");
}

export function delink(s: string) {
	return isLink(s) ? s.slice(2, s.length - 2) : s;
}

export function nameFromLink(app: App, s: string) {
	if (!isLink(s)) {
		return s;
	}
	const delinked = delink(s);
	const file = app.vault.getFileByPath(delinked);
	if (!file) {
		return delinked;
	}
	return file.basename;
}

export function generateTextContentFromTask(app: App, task: TaskData) {
	if (task.path) {
		const file = app.vault.getFileByPath(task.path);
		if (file) {
			return app.fileManager.generateMarkdownLink(
				file,
				"",
				undefined,
				taskNameFromFile(file),
			);
		}
	}
	return task.name;
}

/** True if `path` is a file inside `folderPath` (not a false `startsWith` on the folder segment). */
export function pathIsUnderFolder(path: string, folderPath: string): boolean {
	return path.startsWith(folderPath + "/");
}

export function taskPathFromFile(tfile: TFile) {
	return tfile.path;
}
export function taskNameFromFile(tfile: TFile) {
	return tfile.basename;
}

export class LinkManager {
	private app: App;

	public constructor(app: App) {
		this.app = app;
	}

	// wikilink to TFile
	public getFromLink = (linkText: string) => {
		return this.app.metadataCache.getFirstLinkpathDest(
			delink(linkText),
			"",
		);
	};

	public extractTextLink = (text: string) => {
		if (!isLink(text)) {
			throw new Error("Text is not a link");
		}
		return delink(text);
	};
}
