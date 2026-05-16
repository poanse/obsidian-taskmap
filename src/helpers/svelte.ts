import { match } from "ts-pattern";
import type { TransitionConfig } from "svelte/transition";

type Axis = "x" | "-x" | "y" | "-y";

type SecondaryProperty = "top" | "bottom" | "left" | "right";
type CapitalizedSecondaryProperty = "Top" | "Bottom" | "Left" | "Right";

export interface SlideParamsCustom {
	delay?: number;
	duration?: number;
	easing?: TransitionConfig["easing"];
	axis?: Axis;
}

/**
 * Slides an element in and out.
 */
export function slideCustom(
	node: Element,
	{ delay = 0, duration = 400, easing, axis = "y" }: SlideParamsCustom = {},
): TransitionConfig {
	const style = getComputedStyle(node);
	const opacity = Number(style.opacity);

	const primaryProperty: "height" | "width" =
		axis === "y" || axis === "-y" ? "height" : "width";

	const primaryPropertyValue = parseFloat(style[primaryProperty]);

	const secondaryProperties = match<
		Axis,
		[SecondaryProperty, SecondaryProperty]
	>(axis)
		.with("y", () => ["top", "bottom"])
		.with("-y", () => ["top", "bottom"])
		.with("x", () => ["left", "right"])
		.with("-x", () => ["left", "right"])
		.exhaustive();

	const capitalizedSecondaryProperties = secondaryProperties.map(
		(property): CapitalizedSecondaryProperty =>
			`${property[0].toUpperCase()}${property.slice(1)}` as CapitalizedSecondaryProperty,
	);

	const paddingStartValue = parseFloat(
		style[`padding${capitalizedSecondaryProperties[0]}`],
	);
	const paddingEndValue = parseFloat(
		style[`padding${capitalizedSecondaryProperties[1]}`],
	);
	const marginStartValue = parseFloat(
		style[`margin${capitalizedSecondaryProperties[0]}`],
	);
	const marginEndValue = parseFloat(
		style[`margin${capitalizedSecondaryProperties[1]}`],
	);

	return {
		delay,
		duration,
		easing,
		css: (t: number) =>
			"overflow: hidden;" +
			`opacity: ${Math.min(t * 20, 1) * opacity};` +
			`${primaryProperty}: ${t * primaryPropertyValue}px;` +
			`padding-${secondaryProperties[0]}: ${t * paddingStartValue}px;` +
			`padding-${secondaryProperties[1]}: ${t * paddingEndValue}px;` +
			`margin-${secondaryProperties[0]}: ${t * marginStartValue}px;` +
			`margin-${secondaryProperties[1]}: ${t * marginEndValue}px;` +
			`min-${primaryProperty}: 0` +
			(axis === "-y"
				? `; top: ${parseFloat(style.top) + primaryPropertyValue * (1 - t)}px`
				: "") +
			(axis === "-x"
				? `; left: ${parseFloat(style.left) + primaryPropertyValue * (1 - t)}px`
				: ""),
	};
}
