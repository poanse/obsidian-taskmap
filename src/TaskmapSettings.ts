export enum ThemeChoice {
	Obsidian = "obsidian",
	Light = "light",
	Dark = "dark",
}

/** Classes set on the view by the Theme setting. See theme.css. */
export const THEME_CLASS: Record<ThemeChoice, string> = {
	[ThemeChoice.Obsidian]: "tm-theme-obsidian",
	[ThemeChoice.Light]: "tm-theme-light",
	[ThemeChoice.Dark]: "tm-theme-dark",
};

export interface TaskmapSettings {
	zoomSensitivityTouchpad: string;
	zoomSensitivityMouse: string;
	zoomSensitivityKeyboard: string;
	reversePan: boolean;
	newNoteFolder: string;
	theme: ThemeChoice;
}

export const DEFAULT_SETTINGS: TaskmapSettings = {
	zoomSensitivityTouchpad: "100",
	zoomSensitivityMouse: "100",
	zoomSensitivityKeyboard: "100",
	reversePan: true,
	newNoteFolder: "",
	theme: ThemeChoice.Obsidian,
};

export function isSettingKey(key: string): key is keyof TaskmapSettings {
	return Object.keys(DEFAULT_SETTINGS).includes(key);
}

export function isThemeChoice(value: unknown): value is ThemeChoice {
	return Object.values<unknown>(ThemeChoice).includes(value);
}
