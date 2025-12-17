import { Application, Color, Container, Graphics, TextStyle } from "pixi.js";
import TextInput from "./text-input";
import { Button, ButtonState } from "./Button";
import { alphaBlend } from "@napolab/alpha-blend";
import { IconService } from "../pixi/IconService";

export interface TaskCardOptions {
	label: string;
	width: number;
	height: number;
}

const COLOR_WHITE = "#ffffff"; // Double-click detection
const DOUBLE_CLICK_DELAY = 300; // milliseconds
let lastClickTime = 0;

export const TASK_BACKGROUND_DEFAULT_COLOR: Color = new Color("0x1E1E1E");
const TASK_BORDER_DEFAULT_COLOR = new Color("0x343434");
// const TASK_BACKGROUND_DEFAULT_COLOR: Color = new Color(COLOR_WHITE);
const ICON_BACKGROUND_COLOR = new Color("0x1E1E1E");
const HOVERED_ICON_BACKGROUND_COLOR = new Color("0x343434");
const TOOLBAR_BACKGROUND_DEFAULT_COLOR: string = alphaBlend(
	ICON_BACKGROUND_COLOR.toRgbaString(),
	new Color("#000000").setAlpha(0.5).toRgbaString(),
);
console.log("TASK BACKGROUND COLOR: ", TOOLBAR_BACKGROUND_DEFAULT_COLOR);
export const TASK_DEFAULT_BORDER = {
	color: 0x7e7e7e,
	width: 1,
};
export const TASK_FOCUSED_BORDER = {
	color: 0x7e7e7e,
	width: 2,
};
export const TEXT_COLOR = COLOR_WHITE;
export const TEXT_STYLE = new TextStyle({
	fill: TEXT_COLOR,
	fontSize: 10,
	fontFamily: "Segoe UI",
	lineHeight: 1.5,
});

export class TaskView extends Container {
	private toolbar!: Container;
	private card!: Graphics;
	// private text!: Text;
	private app!: Application;
	private readonly opts: TaskCardOptions;

	private inputEl: TextInput | null = null;
	private mountEl: HTMLDivElement;

	constructor(
		app: Application,
		mountEl: HTMLDivElement,
		opts: TaskCardOptions,
	) {
		super();
		this.app = app;
		this.mountEl = mountEl;
		this.opts = opts;
	}

	async draw() {
		// this.card = new Graphics()
		// 	.roundRect(0, yShift, CARD_W, CARD_H, 10)
		// 	.fill({ color: TASK_BACKGROUND_DEFAULT_COLOR });
		// .stroke(TASK_DEFAULT_BORDER)
		// this.addChild(this.card);

		// TODO: почему-то поле с редактированием текста рисуется на бэкграунде и его не видно
		// TODO: после редктирования показываются оба варианта текста...
		let input = new TextInput(this.mountEl, {
			text: this.opts.label,
			input: {
				// multiline: true,
				fontFamily: TEXT_STYLE.fontFamily,
				fontSize: `${TEXT_STYLE.fontSize}pt`,
				padding: `${TEXT_STYLE.padding}px`,
				width: `${this.opts.width}px`,
				height: `${this.opts.height}px`,
				color: TEXT_STYLE.fill,
				textAlign: "center",
				// dom params
				"border-radius": 0,
				// "background-color": COLOR_WHITE,
				// "font-size": `${TEXT_STYLE.fontSize}pt`,
				border: "0px solid #ccc",
				"box-shadow": "none",
				// outline: "none",
			},
			box: {
				default: {
					fill: TOOLBAR_BACKGROUND_DEFAULT_COLOR,
					rounded: 10,
					stroke: TASK_DEFAULT_BORDER,
				},
				focused: {
					fill: TOOLBAR_BACKGROUND_DEFAULT_COLOR,
					rounded: 10,
					stroke: TASK_FOCUSED_BORDER,
				},
				disabled: {
					fill: TOOLBAR_BACKGROUND_DEFAULT_COLOR,
					rounded: 0,
				},
			},
		});
		input.placeholder = this.opts.label;
		// Background
		// input.x = 100;
		// input.y = yShift;
		// input.eventMode = "static";
		// input.on("blur", () => this.finishEditing());
		// input.on("pointerdown", (e) => {
		// 	const now = Date.now();
		// 	if (now - lastClickTime < DOUBLE_CLICK_DELAY) {
		// 		this.startEditing();
		// 	}
		// 	lastClickTime = now;
		// });
		this.addChild(input);
		this.inputEl = input;
		this.inputEl.render(this.app.renderer);
		// this.text = new Text({
		// 	text: opts.label,
		// 	resolution: 4,
		// 	style: new TextStyle({
		// 		fill: COLOR_WHITE,
		// 		fontSize: 10,
		// 		fontFamily: "Segoe UI",
		// 		lineHeight: 1.5,
		// 	}),
		// });
		// this.text.anchor.set(0.5);
		// this.text.position = {
		// 	x: CARD_W / 2,
		// 	y: 50 + CARD_H / 2,
		// };
		// this.text.eventMode = "static";
		// this.text.on("pointerdown", (e) => {
		// 	const now = Date.now();
		// 	if (now - lastClickTime < DOUBLE_CLICK_DELAY) {
		// 		this.startEditing();
		// 	}
		// 	lastClickTime = now;
		// });
		// this.addChild(this.text);

		// const TB_W = 98;
		// const TB_H = 22;
		// const TB_PADDING = { x: 2, y: 2 };
		// const TB_GAP = 1;
		//
		// this.toolbar = new Container();
		// this.toolbar.position = { x: (CARD_W - TB_W) / 2, y: TB_H };
		// this.toolbar.addChild(
		// 	new Graphics()
		// 		.roundRect(0, 0, TB_W, TB_H, 4)
		// 		.fill({ color: TOOLBAR_BACKGROUND_DEFAULT_COLOR }),
		// );
		// this.addChild(this.toolbar);
		// // =========================
		// // 4) Create icons as vector shapes
		// // =========================
		//
		// const icons = [
		// 	IconService.makeTrashIcon(),
		// 	IconService.makeKeyIcon(),
		// 	IconService.makeLockIcon(),
		// 	IconService.makeFocusIcon(),
		// 	IconService.makeCircleIcon(),
		// ];
		//
		// icons.forEach((icon, i) => {
		// 	const button = new Button(this.app, ButtonState.ACTIVE, icon, {
		// 		size: { width: 18, height: 18 },
		// 		backgroundColors: {
		// 			[ButtonState.ACTIVE]: new Color(
		// 				TOOLBAR_BACKGROUND_DEFAULT_COLOR,
		// 			),
		// 			[ButtonState.ACTIVE_HOVERED]: HOVERED_ICON_BACKGROUND_COLOR,
		// 			[ButtonState.INACTIVE]: new Color(ICON_BACKGROUND_COLOR),
		// 			[ButtonState.INACTIVE_HOVERED]:
		// 				HOVERED_ICON_BACKGROUND_COLOR,
		// 		},
		// 		iconColors: {
		// 			[ButtonState.ACTIVE]: TASK_BACKGROUND_DEFAULT_COLOR,
		// 			[ButtonState.ACTIVE_HOVERED]: TASK_BACKGROUND_DEFAULT_COLOR,
		// 			[ButtonState.INACTIVE]: TASK_BACKGROUND_DEFAULT_COLOR,
		// 			[ButtonState.INACTIVE_HOVERED]:
		// 				TASK_BACKGROUND_DEFAULT_COLOR,
		// 		},
		// 	});
		// 	button.x = TB_PADDING.x + i * (18 + TB_GAP);
		// 	button.y = TB_PADDING.y;
		//
		// 	button.setup();
		// 	this.toolbar.addChild(button);
		// });
	}

	// ==================================================
	// LABEL EDIT MODE (HTML input overlay)
	// ==================================================

	// private startEditing() {
	// 	if (this.inputEl?.visible) return;
	// 	this.inputEl!.visible = true;
	// 	this.inputEl?.focus();
	// }
	//
	// private finishEditing() {
	// 	if (!this.inputEl?.visible) return;
	//
	// 	this.text.text = this.inputEl.text;
	// 	this.inputEl.visible = false;
	// }
}
