export interface TaskmapSettings {
	zoomSensitivityTouchpad: string;
	zoomSensitivityMouse: string;
	newNoteFolder: string;
}

export const DEFAULT_SETTINGS: TaskmapSettings = {
	zoomSensitivityTouchpad: "100",
	zoomSensitivityMouse: "100",
	newNoteFolder: "",
};
