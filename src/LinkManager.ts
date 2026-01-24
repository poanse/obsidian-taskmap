import type { App, TFile } from "obsidian";

export function tasknameFromFilePath(path: string) {
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

// relativePath to TFile
export function getFromRelativePath(app: App, path: string) {
	return app.vault.getFileByPath(path);
}
// TFile to wikilink
export function generateMarkdownLink(app: App, file: TFile) {
	return app.fileManager.generateMarkdownLink(file, "");
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
