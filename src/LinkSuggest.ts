import { App, TFile, AbstractInputSuggest, prepareFuzzySearch } from "obsidian";

export class LinkSuggest extends AbstractInputSuggest<TFile> {
	textInputEl: HTMLTextAreaElement;

	constructor(app: App, textInputEl: HTMLTextAreaElement) {
		// Cast the textarea to HTMLInputElement to satisfy TypeScript.
		// This is a dirty hack, but runtime behavior is compatible
		super(app, textInputEl as unknown as HTMLInputElement);
		this.textInputEl = textInputEl;
	}

	getSuggestions(query: string): TFile[] {
		const cursor = this.textInputEl.selectionStart;
		const text = this.textInputEl.value;

		// Find the start of the current line
		const lineStart = text.lastIndexOf("\n", cursor - 1) + 1;
		const textBeforeCursor = text.substring(lineStart, cursor);

		// Regex to match "[[query" at the very end of the text before cursor
		const match = textBeforeCursor.match(/\[\[([^\]]*)$/);

		// If we are NOT inside a [[link]], return empty array to close/hide suggestions
		if (!match) {
			return [];
		}

		// We are inside a link! Extract the actual query string
		const linkQuery = match[1];

		// Perform the search
		const search = prepareFuzzySearch(linkQuery);
		const files = this.app.vault.getFiles();

		return files
			.filter((file) => search(file.path) || search(file.basename))
			.sort((a, b) => {
				const resA = search(a.path);
				const resB = search(b.path);
				return (resB?.score || 0) - (resA?.score || 0);
			})
			.slice(0, 10);
	}

	renderSuggestion(file: TFile, el: HTMLElement) {
		el.createEl("div", { text: file.basename });
		el.createEl("small", { text: file.path, cls: "text-muted" });
	}

	selectSuggestion(file: TFile) {
		const cursor = this.textInputEl.selectionStart;
		const text = this.textInputEl.value;

		const lineStart = text.lastIndexOf("\n", cursor - 1) + 1;
		const textBeforeCursor = text.substring(lineStart, cursor);
		const match = textBeforeCursor.match(/\[\[([^\]]*)$/);

		if (!match) return;

		const linkStart = lineStart + match.index!;
		const beforeLink = text.substring(0, linkStart);
		const afterCursor = text.substring(cursor);

		const newLinkText = `[[${file.basename}]]`;

		this.textInputEl.value = beforeLink + newLinkText + afterCursor;

		// Trigger Svelte update
		this.textInputEl.dispatchEvent(new Event("input"));

		// Reset cursor
		const newCursor = beforeLink.length + newLinkText.length;
		this.textInputEl.setSelectionRange(newCursor, newCursor);

		this.textInputEl.focus();
		this.textInputEl.blur();
		this.close();
	}
}
