import {
	AbstractInputSuggest,
	App,
	prepareFuzzySearch,
	TFolder,
} from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	textInputEl: HTMLInputElement;

	constructor(app: App, textInputEl: HTMLInputElement) {
		// Cast the textarea to HTMLInputElement to satisfy TypeScript.
		// This is a dirty hack, but runtime behavior is compatible
		super(app, textInputEl as unknown as HTMLInputElement);
		this.textInputEl = textInputEl;
	}

	getSuggestions(): TFolder[] {
		const query = this.textInputEl.value;

		// Perform the search
		const search = prepareFuzzySearch(query);

		return this.app.vault
			.getAllFolders()
			.filter((file) => search(file.path))
			.sort((a, b) => {
				const resA = search(a.path);
				const resB = search(b.path);
				return (resB?.score || 0) - (resA?.score || 0);
			})
			.slice(0, 10);
	}

	renderSuggestion(file: TFolder, el: HTMLElement) {
		el.createEl("div", { text: file.path });
		el.createEl("small", { text: file.path, cls: "text-muted" });
	}

	selectSuggestion(file: TFolder) {
		const newLinkText = file.path;

		this.textInputEl.value = newLinkText;

		// Trigger Svelte update
		this.textInputEl.dispatchEvent(new Event("input"));

		// Reset cursor
		const newCursor = newLinkText.length;
		this.textInputEl.setSelectionRange(newCursor, newCursor);

		this.textInputEl.focus();
		this.textInputEl.blur();
		this.close();
	}
}
