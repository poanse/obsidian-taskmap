import { IconCode, StatusCode } from "./types";

export const LOGO_NAME = "TaskmapLogo";
export const LOGO_CONTENT = `
<path d="M88.9366 24.8308V33.8571H55.7464V24.8308H88.9366ZM91.1514 22.5714V11.2857C91.1514 10.0391 90.1586 9.02637 88.9366 9.02637H55.7464C54.5244 9.02637 53.5316 10.0391 53.5316 11.2857V22.5714C53.5316 23.818 54.5244 24.8308 55.7464 24.8308V33.8571L54.612 33.802C49.4075 33.2615 45.267 29.0378 44.7371 23.7287L44.683 22.5714V11.2857C44.683 5.05279 49.6363 9.0886e-08 55.7464 0H88.9366C95.0467 0 100 5.05279 100 11.2857V22.5714C100 28.4138 95.6484 33.2227 90.071 33.802L88.9366 33.8571V24.8308C90.1586 24.8308 91.1514 23.818 91.1514 22.5714Z" fill="currentColor"/>
<path d="M88.9366 69.9736V79H55.7464V69.9736H88.9366ZM91.1514 67.7143V56.4286C91.1514 55.182 90.1586 54.1692 88.9366 54.1692H55.7464C54.5244 54.1692 53.5316 55.182 53.5316 56.4286V67.7143C53.5316 68.9609 54.5244 69.9736 55.7464 69.9736V79L54.612 78.9449C49.4075 78.4043 45.267 74.1806 44.7371 68.8715L44.683 67.7143V56.4286C44.683 50.1956 49.6363 45.1429 55.7464 45.1429H88.9366C95.0467 45.1429 100 50.1956 100 56.4286V67.7143C100 73.5566 95.6484 78.3656 90.071 78.9449L88.9366 79V69.9736C90.1586 69.9736 91.1514 68.9609 91.1514 67.7143Z" fill="currentColor"/>
<path d="M22.8099 52.5212V26.4781C22.8099 17.752 29.7487 10.6737 38.3029 10.6737H47.6701V19.7111H38.3029C34.6368 19.7111 31.6692 22.7384 31.6692 26.4781V52.5212C31.6692 56.261 34.6368 59.2993 38.3029 59.2993H47.6701V68.3256H38.3029C29.7487 68.3256 22.8099 61.2473 22.8099 52.5212Z" fill="currentColor"/>
<path d="M27.2371 34.9806V44.018H0V34.9806H27.2371Z" fill="currentColor"/>
`;

export default class IconService {
	static getIcon = getIcon;
	static getStatusIcon = getStatusIcon;
}

export function getIcon(code: IconCode) {
	switch (code) {
		case IconCode.TRASH:
			return LUCIDE_TRASH_SVG;
		case IconCode.TRASH_SINGLE:
			return LUCIDE_TRASH_SVG;
		case IconCode.TRASH_MULTIPLE:
			return LUCIDE_TRASH_SVG;
		case IconCode.KEY:
			return LUCIDE_KEY_SVG;
		case IconCode.LOCK:
			return LUCIDE_LOCK_SVG;
		case IconCode.FOCUS:
			return LUCIDE_FOCUS_SVG;
		case IconCode.STATUS:
			return getStatusIcon(StatusCode.DRAFT);
		case IconCode.STATUS_DRAFT:
			return getStatusIcon(StatusCode.DRAFT);
		case IconCode.STATUS_READY:
			return getStatusIcon(StatusCode.READY);
		case IconCode.STATUS_IN_PROGRESS:
			return getStatusIcon(StatusCode.IN_PROGRESS);
		case IconCode.STATUS_DONE:
			return getStatusIcon(StatusCode.DONE);
	}
}

export function getStatusClassString(code: StatusCode) {
	return ["class=draft", "class=ready", "class=in-progress", "class=done"][
		code
	];
}

export function getStatusIcon(code: StatusCode) {
	return `
		<svg 
			class:is-pressed-up={isPressed}
			class:is-pressed-down={isPressedDown}
			${getStatusClassString(code)}
			class="circle" viewBox="0 0 24 24"
		>
			<circle cx="12" cy="12" r="10"/>
		</svg>
	`;
}

const LUCIDE_TRASH_SVG = `
		<svg
			class="lucide lucide-trash2-icon lucide-trash-2"
			class:is-pressed-up={isPressed}
			class:is-pressed-down={isPressedDown}
			xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
		>
			<path d="M10 11v6"/>
			<path d="M14 11v6"/>
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
			<path d="M3 6h18"/>
			<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
		</svg>
`;
const LUCIDE_KEY_SVG = `
	<svg
		class="lucide lucide-key-round-icon lucide-key-round"
			class:is-pressed-up={isPressed}
			class:is-pressed-down={isPressedDown}
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
	>
		<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/>
		<circle cx="16.5" cy="7.5" r=".5"/>
	</svg>
`;
const LUCIDE_LOCK_SVG = `
	<svg 
			class:is-pressed-up={isPressed}
			class:is-pressed-down={isPressedDown}
	viewBox="0 0 24 24">
		<rect x="5" y="10" width="14" height="11" rx="2"/>
		<path d="M8 10V7a4 4 0 1 1 8 0v3"/>
	</svg>
`;
const LUCIDE_FOCUS_SVG = `
	<svg 
	
			class:is-pressed-up={isPressed}
			class:is-pressed-down={isPressedDown}
	
	viewBox="0 0 24 24">
		<circle cx="12" cy="12" r="8"/>
		<circle cx="12" cy="12" r="3"/>
		<path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
	</svg>
`;
const LUCIDE_CIRCLE_SVG = `
	<svg 
	
			class:is-pressed-up={isPressed}
			class:is-pressed-down={isPressedDown}
	class="circle" viewBox="0 0 24 24">
		<circle cx="12" cy="12" r="9"/>
	</svg>
`;
