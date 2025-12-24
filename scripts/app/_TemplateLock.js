import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class TemplateLock extends BasePuzzleLock {
    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
            ],
        };
    }

    static get defaultState() {
        return {
        };
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
    }

    async _getState() {
        const state = await super._getState();
        const html = this.element[0];
        return foundry.utils.expandObject(state);
    }

    async _loadState() {
        const state = await super._loadState();
        return state;
    }

    async isUnlocked() {
        const {config, current} = await this.getAllData();
        return false;
    }
}
