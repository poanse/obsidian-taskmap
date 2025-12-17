import {
	type Application,
	Color,
	Container,
	Graphics,
	SCALE_MODES,
	type Size,
	Sprite,
	Texture,
} from "pixi.js";
import { match, P } from "ts-pattern";

export enum ButtonState {
	INACTIVE = "INACTIVE",
	INACTIVE_HOVERED = "INACTIVE_HOVERED",
	ACTIVE = "ACTIVE",
	ACTIVE_HOVERED = "ACTIVE_HOVERED",
	// TODO: pressed
}

export type ColorStateMap = {
	[key in ButtonState]: Color;
};

class ButtonOptions {
	size: Size;
	backgroundColors: ColorStateMap;
	iconColors: ColorStateMap;
}

export class Button extends Container {
	private app: Application;
	private state: ButtonState;
	private opts: ButtonOptions;
	private iconSource: Promise<Graphics | Texture>;

	private background: Sprite;
	private icon: Sprite;

	constructor(
		app: Application,
		initialState: ButtonState,
		iconSource: Promise<Graphics | Texture>,
		opts: ButtonOptions,
	) {
		super();
		this.app = app;
		this.state = initialState;
		this.iconSource = iconSource;
		this.opts = opts;
	}

	setup() {
		this.eventMode = "static";
		this.cursor = "pointer";

		this.on("pointerover", this.hoverOn);
		this.on("pointerout", this.hoverOff);
		this.on("pointerdown", () => {
			console.log("Clicked icon");
		});
		// background

		// tooltip
		// ...
		this.update();
		// callbacks
		// ...
	}

	async update() {
		// TODO: я идиот и менял не тот бэкграунд
		// this.background.destroy();

		const bgTexture = this.app.renderer.generateTexture({
			target: new Graphics()
				.roundRect(0, 0, this.opts.size.width, this.opts.size.height, 2)
				.fill({ color: this.opts.backgroundColors[this.state] }),
			// resolution: 4,
			// antialias: true,
		});
		bgTexture.source.scaleMode = "linear";
		this.background = new Sprite(bgTexture);
		this.addChild(this.background);

		const icon = await this.iconSource;
		const iconTexture = match(icon)
			.returnType<Texture>()
			.with(P.instanceOf(Graphics), () =>
				this.app.renderer.generateTexture({
					target: icon as Graphics,
					// 	.fill({
					// 	color: this.opts.iconColors[this.state],
					// })
					// antialias: true,
					resolution: 4,
				}),
			)
			.with(P.instanceOf(Texture), () => icon as Texture)
			.exhaustive();
		iconTexture.source.scaleMode = "linear";
		this.icon = new Sprite({
			texture: iconTexture,
			anchor: 0.5,
			// roundPixels: true,
		});
		this.icon.scale = 0.6;
		this.icon.position.set(
			this.opts.size.width / 2,
			this.opts.size.height / 2,
		);
		this.addChild(this.icon);
	}

	changeState(state: ButtonState) {
		this.state = state;
		this.icon.destroy();
		this.update();
	}

	hoverOn() {
		if (this.state == ButtonState.ACTIVE) {
			this.changeState(ButtonState.ACTIVE_HOVERED);
		} else if (this.state == ButtonState.INACTIVE) {
			this.changeState(ButtonState.INACTIVE_HOVERED);
		}
	}
	hoverOff() {
		if (this.state == ButtonState.ACTIVE_HOVERED) {
			this.changeState(ButtonState.ACTIVE);
		} else if (this.state == ButtonState.INACTIVE_HOVERED) {
			this.changeState(ButtonState.INACTIVE);
		}
	}
}
