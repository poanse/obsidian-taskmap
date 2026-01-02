import { MouseDown } from "./types";
import { NoTaskId } from "./NodePositionsCalculator";

export class DraggingManager {
	mouseCodes: MouseDown[];
	mouseDown = $state(MouseDown.NONE);
	isDragging = $state(false);
	startX = 0;
	startY = 0;
	deltaX = $state(0);
	deltaY = $state(0);
	draggedTaskId = $state(NoTaskId);

	constructor(mouseCodes: MouseDown[]) {
		this.mouseCodes = [];
		this.mouseCodes.push(...mouseCodes);
	}

	public setDraggedTaskId = (id: number) => {
		this.draggedTaskId = id;
	};

	public onPointerDown = (e: PointerEvent) => {
		console.log("DraggingManager pointerDown");
		this.mouseDown = e.button as MouseDown;
		if (this.mouseCodes.contains(this.mouseDown)) {
			this.startX = e.clientX;
			this.startY = e.clientY;
			const target = e.target as HTMLElement;
			target.dispatchEvent(
				new MouseEvent("mouseleave", { bubbles: true }),
			);
		}
	};

	public onPointerUp = (e: PointerEvent) => {
		console.log(`DraggingManager pointerUp: ${this.deltaX}`);
		this.setDraggedTaskId(NoTaskId);
		this.mouseDown = MouseDown.NONE;
		this.isDragging = false;
		this.deltaX = 0;
		this.deltaY = 0;
	};

	public onPointerMove = (e: PointerEvent) => {
		if (this.mouseCodes.contains(this.mouseDown)) {
			const deltaX = e.clientX - this.startX;
			const deltaY = e.clientY - this.startY;
			// Calculate distance moved
			const dist = Math.pow(deltaX, 2) + Math.pow(deltaY, 2);
			// If moved more than 5 pixels, it's a drag, not a click
			const thrDist = 5;
			if (dist > Math.pow(thrDist, 2)) {
				this.isDragging = true;
			}
			this.deltaX = deltaX;
			this.deltaY = deltaY;
		}
	};
}
