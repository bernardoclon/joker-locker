import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class PasswordLock extends BasePuzzleLock {
    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "password",
                    type: "text",
                    placeholder: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.password.placeholder`),
                    value: "",
                },
            ],
        };
    }

    static get defaultState() {
        return {
            password: "",
        };
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    static get REQUIRES_CONTEXT() {
        return true;
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        const passwordInput = html.querySelector("input[name='currentPassword']");
        passwordInput.focus();
        const length = passwordInput.value.length;
        passwordInput.setSelectionRange(length, length);
        passwordInput.addEventListener("input", async (event) => {
            this.playInteractionSound();
            this.updateState();
        });
    }

    async isUnlocked() {
        const { config, current } = await this.getAllData();
        return current.currentPassword === config.password;
    }
}
