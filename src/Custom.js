import { match } from "ts-pattern";

/**
 * Slides an element in and out.
 *
 * @param {Element} node
 * @param {SlideParamsCustom} [params]
 * @returns {TransitionConfig}
 */
export function slideCustom(
	node,
	{ delay = 0, duration = 400, easing = "cubic_out", axis = "y" } = {},
) {
	const style = getComputedStyle(node);
	const opacity = +style.opacity;
	const primary_property = axis === "y" || axis === "-y" ? "height" : "width";
	const primary_property_value = parseFloat(style[primary_property]);
	const secondary_properties = match(axis)
		.with("y", () => ["top", "bottom"])
		.with("-y", () => ["top", "bottom"])
		.with("x", () => ["left", "right"])
		.with("-x", () => ["left", "right"])
		.otherwise((x) => {
			throw new Error();
		});

	const capitalized_secondary_properties = secondary_properties.map(
		(e) =>
			/** @type {'Left' | 'Right' | 'Top' | 'Bottom'} */ `${e[0].toUpperCase()}${e.slice(1)}`,
	);
	const padding_start_value = parseFloat(
		style[`padding${capitalized_secondary_properties[0]}`],
	);
	const padding_end_value = parseFloat(
		style[`padding${capitalized_secondary_properties[1]}`],
	);
	const margin_start_value = parseFloat(
		style[`margin${capitalized_secondary_properties[0]}`],
	);
	const margin_end_value = parseFloat(
		style[`margin${capitalized_secondary_properties[1]}`],
	);
	const border_width_start_value = parseFloat(
		style[`border${capitalized_secondary_properties[0]}Width`],
	);
	const border_width_end_value = parseFloat(
		style[`border${capitalized_secondary_properties[1]}Width`],
	);

	let additionalString = "";
	if (axis === "-y") {
	}

	return {
		delay,
		duration,
		easing,
		css: (t) =>
			"overflow: hidden;" +
			`opacity: ${Math.min(t * 20, 1) * opacity};` +
			`${primary_property}: ${t * primary_property_value}px;` +
			`padding-${secondary_properties[0]}: ${t * padding_start_value}px;` +
			`padding-${secondary_properties[1]}: ${t * padding_end_value}px;` +
			`margin-${secondary_properties[0]}: ${t * margin_start_value}px;` +
			`margin-${secondary_properties[1]}: ${t * margin_end_value}px;` +
			// `border-${secondary_properties[0]}-width: ${t * border_width_start_value}px;` +
			// `border-${secondary_properties[1]}-width: ${t * border_width_end_value}px;` +
			`min-${primary_property}: 0` +
			(axis === "-y"
				? `; top: ${parseFloat(style["top"]) + primary_property_value * (1 - t)}px`
				: "") +
			(axis === "-x"
				? `; left: ${parseFloat(style["left"]) + primary_property_value * (1 - t)}px`
				: ""),
	};
}
