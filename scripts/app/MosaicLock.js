import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class MosaicLock extends BasePuzzleLock {
    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "mosaicImage",
                    type: "filepicker",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.mosaicImage.notes`),
                },
                {
                    name: "mosaicSize",
                    type: "range",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.mosaicSize.notes`),
                    min: 1,
                    max: 20,
                    step: 1,
                    value: 5,
                },
            ],
        };
    }

    static get defaultState() {
        return {
            solutionState: [],
        };
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        const tiles = html.querySelectorAll(".tile-container");
        tiles.forEach((tile) => {
            tile.addEventListener("click", async (event) => {
                this.playInteractionSound();
                const rotation = parseInt(tile.dataset.rotation);
                tile.dataset.rotation = (rotation + 90) % 360;
                this.updateState();
            });
        });
    }

    async _getState() {
        const state = await super._getState();
        const html = this.element[0];
        const tiles = Array.from(html.querySelectorAll(".tile-container"));
        state.solutionState = tiles.map((tile) => parseInt(tile.dataset.rotation));
        return foundry.utils.expandObject(state);
    }

    async _loadState() {
        const state = await super._loadState();
        const tiles = [];
        const solutionState = state.solutionState;
        let currentIndex = 0;
        for (let i = 0; i < state.mosaicSize; i++) {
            for (let j = 0; j < state.mosaicSize; j++) {
                tiles.push({
                    x: i,
                    y: j,
                    xPercent: (j / state.mosaicSize) * 100,
                    yPercent: (i / state.mosaicSize) * 100,
                    url: state.mosaicImage,
                    rotation: solutionState[currentIndex] ?? Math.floor(Math.random() * 4) * 90,
                });
                currentIndex++;
            }
        }
        state.tiles = tiles;
        return state;
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        return current.solutionState.every((rotation) => rotation == 0);
    }
}
