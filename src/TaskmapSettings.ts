export type ThemeChoice = "obsidian" | "light" | "dark";

/** Classes set on the view by the Theme setting. See theme.css. */
export const THEME_CLASS: Record<ThemeChoice, string> = {
	obsidian: "tm-theme-obsidian",
	light: "tm-theme-light",
	dark: "tm-theme-dark",
};

export interface TaskmapSettings {
	zoomSensitivityTouchpad: string;
	zoomSensitivityMouse: string;
	newNoteFolder: string;
	theme: ThemeChoice;
}

export const DEFAULT_SETTINGS: TaskmapSettings = {
	zoomSensitivityTouchpad: "100",
	zoomSensitivityMouse: "100",
	newNoteFolder: "",
	theme: "obsidian",
};

export function isThemeChoice(value: unknown): value is ThemeChoice {
	return value === "obsidian" || value === "light" || value === "dark";
}
