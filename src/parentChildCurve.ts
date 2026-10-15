import { ParentToChildHorizontalGap } from "./NodePositionsCalculator";
import type { Vector2 } from "./types";

/** Width of the S-curve. Matches the gap from a parent to its first child. */
export const ParentChildSigmoidWidth = ParentToChildHorizontalGap;

/**
 * A parent–child link is an S-curve of `ParentChildSigmoidWidth`.
 * Any extra horizontal distance is a straight line on the parent side.
 */
export function parentChildCurvePath(start: Vector2, end: Vector2): string {
	const span = Math.abs(end.x - start.x);
	const towardParent = Math.sign(end.x - start.x) || 1;
	const sigmoidWidth = Math.min(ParentChildSigmoidWidth, span);
	const sigmoidStartX = end.x - towardParent * sigmoidWidth;
	const midX = (sigmoidStartX + end.x) / 2;
	const curve = `C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
	if (span > ParentChildSigmoidWidth) {
		return `M ${start.x} ${start.y} L ${sigmoidStartX} ${start.y} ${curve}`;
	}
	return `M ${start.x} ${start.y} ${curve}`;
}
