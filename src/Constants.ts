export const TOOLBAR_BUTTON_SIZE = 18 * 2;
export const SUBTOOLBAR_BUTTON_SIZE = 18 * 2;
export const TOOLBAR_GAP = 2;
export const SUBTOOLBAR_GAP = 2;
export const TOOLBAR_PADDING = { x: 4, y: 4 };
export const SUBTOOLBAR_PADDING = { x: 4, y: 4 };
export const TOOLBAR_SHIFT = 6;
export const SUBTOOLBAR_SHIFT = 8;

export const TOOLBAR_SIZE = {
	width: 98 * 2,
	height: 22 * 2,
};

export const TASK_SIZE = {
	width: 280,
	height: 80,
	width_hovered: 284,
	height_hovered: 84,
};

export function parseNumber(value: string | null | undefined): number | null {
	if (value === null || value === undefined) {
		return null;
	}
	const num = Number(value);
	return isNaN(num) || value.trim() === "" ? null : num;
}

export const LOGO_NAME = "TaskmapLogo";

export const LOGO_CONTENT = `
<g transform="translate(50,50) scale(0.9) translate(-50,-50)">
  <path d="M66.66667 12.5L66.66667 29.16667C66.66667 31.46783 68.53217 33.33333 70.83333 33.33333L87.5 33.33333C89.80083 33.33333 91.66667 31.46783 91.66667 29.16667L91.66667 12.5C91.66667 10.19883 89.80083 8.33333 87.5 8.33333L70.83333 8.33333C68.53217 8.33333 66.66667 10.19883 66.66667 12.5Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="8"/>
  <path d="M66.66667 70.83333L66.66667 87.5C66.66667 89.80083 68.53217 91.66667 70.83333 91.66667L87.5 91.66667C89.80083 91.66667 91.66667 89.80083 91.66667 87.5L91.66667 70.83333C91.66667 68.53217 89.80083 66.66667 87.5 66.66667L70.83333 66.66667C68.53217 66.66667 66.66667 68.53217 66.66667 70.83333Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="8"/>
  <path d="M8.33333 41.66667L8.33333 58.33333C8.33333 60.6345 10.19883 62.5 12.5 62.5L29.16667 62.5C31.46783 62.5 33.33333 60.6345 33.33333 58.33333L33.33333 41.66667C33.33333 39.3655 31.46783 37.5 29.16667 37.5L12.5 37.5C10.19883 37.5 8.33333 39.3655 8.33333 41.66667Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="8"/>
  <path d="M66.66667 79.16667L54.16667 79.16667C53.06158 79.16667 52.00175 78.72767 51.22042 77.94625C50.439 77.16492 50 76.10508 50 75L50 25C50 23.89492 50.439 22.83508 51.22042 22.05375C52.00175 21.27233 53.06158 20.83333 54.16667 20.83333L66.66667 20.83333" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="8"/>
  <path d="M50 50L33.33333 50" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="8"/>
</g>
`;
