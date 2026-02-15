import { ProjectData } from "./ProjectData.svelte";
import type { Action } from "./Action";

export class HistoryManager {
	private undoStack: Action[] = [];
	private redoStack: Action[] = [];

	execute(action: Action, data: ProjectData): void {
		action.do(data);
		this.undoStack.push(action);
		this.redoStack = []; // Clear redo stack on new action
	}

	undo(data: ProjectData): boolean {
		const action = this.undoStack.pop();
		if (!action) return false;

		action.undo(data);
		this.redoStack.push(action);
		return true;
	}

	redo(data: ProjectData): boolean {
		const action = this.redoStack.pop();
		if (!action) return false;

		action.do(data);
		this.undoStack.push(action);
		return true;
	}

	canUndo(): boolean {
		return this.undoStack.length > 0;
	}

	canRedo(): boolean {
		return this.redoStack.length > 0;
	}
}
