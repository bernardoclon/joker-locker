import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class FifteenLock extends BasePuzzleLock {
    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "image",
                    type: "filepicker",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.image.notes`),
                },
                {
                    name: "size",
                    type: "range",
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.size.notes`),
                    min: 3,
                    max: 10,
                    step: 1,
                    value: 4,
                }
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
        html.querySelectorAll(".tile-container:not(.empty)").forEach((tile) => {
            tile.addEventListener("click", async (event) => {
                this.playInteractionSound();
                const grid = this.getGrid();
                const empty = grid.flat().find((tile) => tile.tile.classList.contains("empty"));
                const clicked = grid.flat().find((t) => t.tile === tile);
                const emptyRow = Math.floor(empty.order / grid.length);
                const clickedRow = Math.floor(clicked.order / grid.length);
                const sameRow = emptyRow === clickedRow;
                const isNextToEmpty = (Math.abs(empty.order - clicked.order) === 1 && sameRow) || Math.abs(empty.order - clicked.order) === grid.length;
                if (!isNextToEmpty) return;
                const temp = empty.order;
                empty.tile.dataset.order = clicked.tile.dataset.order;
                clicked.tile.dataset.order = temp;
                this.updateState();
            });
        });
    }

    getGrid() {
        const tiles = this.element[0].querySelectorAll(".tile-container");
        const dualIndexArray = Array.from(tiles).map((tile, index) => {
            return {
                tile,
                order: parseInt(tile.dataset.order),
                index,
            }
        });
        const sorted = dualIndexArray.sort((a, b) => { return a.tile.dataset.order - b.tile.dataset.order });
        const grid = [];
        const size = Math.sqrt(sorted.length);
        for (let i = 0; i < size; i++) {
            grid.push(sorted.slice(i * size, i * size + size));
        }
        return grid;
    }

    async _getState() {
        const state = await super._getState();
        const html = this.element[0];
        state.solutionState = Array.from(html.querySelectorAll(".tile-container")).map((tile) => parseInt(tile.dataset.order));
        return foundry.utils.expandObject(state);
    }

    async _loadState() {
        const state = await super._loadState();
        const tiles = [];
        const solutionState = state.solutionState;
        let currentIndex = 0;
        for (let i = 0; i < state.size; i++) {
            for (let j = 0; j < state.size; j++) {
                tiles.push({
                    x: i,
                    y: j,
                    xPercent: (j / state.size) * 100,
                    yPercent: (i / state.size) * 100,
                    url: state.image,
                    order: solutionState[currentIndex] ?? currentIndex,
                });
                currentIndex++;
            }
        }
        const last = tiles[tiles.length - 1];
        last.url = "";
        state.tiles = tiles;
        return state;
    }

    async shuffle(count = 100) {
        for(let i = 0; i < count; i++) {
            const grid = this.getGrid();
            const empty = grid.flat().find((tile) => tile.tile.classList.contains("empty"));
            const neighbors = grid.flat().filter((tile) => {
                const emptyRow = Math.floor(empty.order / grid.length);
                const tileRow = Math.floor(tile.order / grid.length);
                const sameRow = emptyRow === tileRow;
                return (Math.abs(empty.order - tile.order) === 1 && sameRow) || Math.abs(empty.order - tile.order) === grid.length;
            });
            const random = neighbors[Math.floor(Math.random() * neighbors.length)];
            const temp = empty.order;
            empty.tile.dataset.order = random.tile.dataset.order;
            random.tile.dataset.order = temp;
            empty.tile.style.order = empty.tile.dataset.order;
            random.tile.style.order = random.tile.dataset.order;
            empty.order = parseInt(empty.tile.dataset.order);
            random.order = parseInt(random.tile.dataset.order);
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        this.updateState();
    }

    getSidebarButtons() {
        const buttons = super.getSidebarButtons();
        buttons.unshift({
            label: game.i18n.localize(`${MODULE_ID}.sidebar-buttons.shuffle`),
            class: "shuffle",
            icon: "<i class='fas fa-random' style='color: var(--color-shadow-highlight)'></i>",
            visible: game.user.isGM,
            onClick: async () => {
                Dialog.confirm({
                    title: game.i18n.localize(`${MODULE_ID}.sidebar-buttons.shuffle`),
                    content: `<div style="padding: 0.5rem 0;align-items: center;" class="flexrow"><label>${game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.shuffleDialog`)}</label><input type="number" id="shuffle-count" value="100" min="1" max="1000"></div>`,
                    yes: async (html) => {
                        const count = parseInt(html.find("#shuffle-count")[0].value);
                        await this.shuffle(count || 100);
                    },
                });
            },
        });
        return buttons;
    }

    async isUnlocked() {
        const {config, current} = await this.getAllData();
        const solutionState = current.solutionState;
        const sorted = [...solutionState].sort((a, b) => a - b);
        //compare the two arrays
        console.log(solutionState, sorted);
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i] !== solutionState[i]) return false;
        }
        return true;
    }
}
