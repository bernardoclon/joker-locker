import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class ImageWheel extends BasePuzzleLock {
    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "image",
                    type: "filepicker",
                },
                {
                    name: "wheelCount",
                    type: "range",
                    min: 2,
                    max: 12,
                    step: 1,
                    value: 4,
                },
                {
                    name: "angleStep",
                    type: "select",
                    options: {
                        15: "15°",
                        30: "30°",
                        45: "45°",
                        60: "60°",
                        90: "90°",
                    },
                    value: 30,
                },
                {
                    name: "fixed",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.fixed.notes`),
                    type: "number",
                    min: 1,
                    max: 12,
                    value: 1,
                    step: 1,
                }
            ],
        };
    }

    static get defaultState() {
        return {
            rotations: [],
        };
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        const angleStep = parseInt((await this._loadState()).angleStep);
        html.querySelectorAll(".wheel").forEach((wheel) => {
            wheel.addEventListener("click", (e) => {
                this.playInteractionSound();
                const currentRotation = parseInt(wheel.dataset.rotation);
                const newRotation = (currentRotation + angleStep) % 360;
                wheel.dataset.rotation = newRotation;
                this.updateState();
            });
        });
    }

    async _getState() {
        const state = await super._getState();
        const html = this.element[0];
        const wheelElements = html.querySelectorAll(".wheel");
        const rotations = Array.from(wheelElements).map((wheel) => parseInt(wheel.dataset.rotation));
        state.rotations = rotations;
        return foundry.utils.expandObject(state);
    }

    async _loadState() {
        const state = await super._loadState();
        const angleStep = parseInt(state.angleStep);
        const fixed = parseInt(state.fixed || 1) - 1;
        const wheels = [];
        for (let i = 0; i < state.wheelCount; i++) {
            const rotation = Number.isFinite(state.rotations[i]) ? state.rotations[i] : Math.floor((Math.random() * 360) / angleStep) * angleStep;
            wheels.push({
                rotation: fixed === i ? 0 : rotation,
                isFixed: fixed === i,
                image: state.image,
                sizePercent: (1 - i / state.wheelCount) * 100,
            });
        }
        state.wheels = wheels;
        return state;
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        return current.rotations.every((rotation) => rotation % 360 === 0);
    }
}
