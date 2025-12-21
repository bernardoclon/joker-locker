import { MODULE_ID } from "../main.js";

export class LockConfiguration extends FormApplication {
    constructor(document, formConfiguration, LockCLS) {
        super();
        this.document = document;
        this.formConfiguration = formConfiguration;
        this.LockCLS = LockCLS;
        this.formConfigType = formConfiguration.type;
    }

    static get APP_ID() {
        return this.name
            .split(/(?=[A-Z])/)
            .join("-")
            .toLowerCase();
    }

    get APP_ID() {
        return this.constructor.APP_ID;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: this.APP_ID,
            template: `modules/${MODULE_ID}/templates/${this.APP_ID}.hbs`,
            popOut: true,
            minimizable: true,
            closeOnSubmit: true,
            width: 500,
        });
    }

    async getData() {
        let formConfig;
        if (this.LockCLS.prototype.hasOwnProperty('formConfiguration')) {
            // Instance getter
            const instance = new this.LockCLS(this.document, { configOnly: true });
            formConfig = foundry.utils.deepClone(instance.formConfiguration);
        } else if (this.LockCLS.hasOwnProperty('formConfiguration')) {
            // Static
            formConfig = foundry.utils.deepClone(this.LockCLS.formConfiguration);
        } else {
            // Fallback
            formConfig = this.formConfiguration;
        }
        const data = this.document.getFlag(MODULE_ID, formConfig.type) ?? {};
        if (!formConfig.inputs) formConfig.inputs = [];
        formConfig.inputs.forEach((input) => {
            input.value = data[input.name] ?? input.value;
        });
        formConfig.puzzleDescription = formConfig.description || game.i18n.localize(`${MODULE_ID}.${formConfig.type}.description`);
        formConfig.playerInfo = formConfig.playerInfo || game.i18n.localize(`${MODULE_ID}.${formConfig.type}.playerInfo`);
        return { ...formConfig };
    }

    get title() {
        return game.i18n.localize(`${MODULE_ID}.${this.formConfigType}.name`);
    }

    activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        if (this.formConfiguration.activateListeners) {
            this.formConfiguration.activateListeners(html, this);
        }
        const numPinsInput = html.querySelector('input[name="numPins"]');
        if (numPinsInput) {
            numPinsInput.addEventListener('change', async (e) => {
                let newNumPins = parseInt(e.target.value);
                newNumPins = Math.max(1, Math.min(10, newNumPins));
                e.target.value = newNumPins;
                const currentFlag = this.document.getFlag(MODULE_ID, this.formConfigType) || {};
                await this.document.setFlag(MODULE_ID, this.formConfigType, { ...currentFlag, numPins: newNumPins });
                // Re-render so dynamically generated pin inputs appear/disappear
                this.render(true, { height: 'auto' });
                setTimeout(() => this.setPosition({ height: 'auto' }), 50);
            });
        }
        const tensionMinInput = html.querySelector('input[name="tensionMin"]');
        if (tensionMinInput) {
            tensionMinInput.addEventListener('change', async (e) => {
                let newTensionMin = parseInt(e.target.value);
                if (this.formConfigType === "f-cerradura-2" || this.formConfigType === "pick-lock") {
                    if (isNaN(newTensionMin)) newTensionMin = 0;
                    const min = tensionMinInput.min !== "" ? parseInt(tensionMinInput.min) : -Infinity;
                    const max = tensionMinInput.max !== "" ? parseInt(tensionMinInput.max) : Infinity;
                    newTensionMin = Math.max(min, Math.min(max, newTensionMin));
                    e.target.value = newTensionMin;
                }
                const currentFlag = this.document.getFlag(MODULE_ID, this.formConfigType) || {};
                await this.document.setFlag(MODULE_ID, this.formConfigType, { ...currentFlag, tensionMin: newTensionMin });
            });
        }
        const tensionMaxInput = html.querySelector('input[name="tensionMax"]');
        if (tensionMaxInput) {
            tensionMaxInput.addEventListener('change', async (e) => {
                let newTensionMax = parseInt(e.target.value);
                if (this.formConfigType === "f-cerradura-2" || this.formConfigType === "pick-lock") {
                    if (isNaN(newTensionMax)) newTensionMax = 0;
                    const min = tensionMaxInput.min !== "" ? parseInt(tensionMaxInput.min) : -Infinity;
                    const max = tensionMaxInput.max !== "" ? parseInt(tensionMaxInput.max) : Infinity;
                    newTensionMax = Math.max(min, Math.min(max, newTensionMax));
                    e.target.value = newTensionMax;
                }
                const currentFlag = this.document.getFlag(MODULE_ID, this.formConfigType) || {};
                await this.document.setFlag(MODULE_ID, this.formConfigType, { ...currentFlag, tensionMax: newTensionMax });
            });
        }
        const feedbackRangeInput = html.querySelector('input[name="feedbackRange"]');
        if (feedbackRangeInput) {
            feedbackRangeInput.addEventListener('change', async (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) val = 20;
                val = Math.max(10, Math.min(20, val));
                val = Math.round(val / 5) * 5;
                e.target.value = val;
                const currentFlag = this.document.getFlag(MODULE_ID, this.formConfigType) || {};
                await this.document.setFlag(MODULE_ID, this.formConfigType, { ...currentFlag, feedbackRange: val });
            });
        }

        // Forzar múltiplos de 5 en la configuración de pines para OPicklock y PickLock
        if (this.formConfigType === "f-cerradura-2" || this.formConfigType === "pick-lock") {
            html.querySelectorAll('input[name^="pin"][type="number"]').forEach(input => {
                input.addEventListener('change', (e) => {
                    if (input.name.toLowerCase().includes("tension")) return;
                    let val = parseInt(e.target.value);
                    if (isNaN(val)) val = 0;
                    const min = input.min !== "" ? parseInt(input.min) : -Infinity;
                    const max = input.max !== "" ? parseInt(input.max) : Infinity;
                    val = Math.max(min, Math.min(max, val));
                    val = Math.round(val / 5) * 5;
                    if (val > max) val = Math.floor(max / 5) * 5;
                    if (val < min) val = Math.ceil(min / 5) * 5;
                    e.target.value = val;
                });
            });
        }

        html.querySelector("#reset").addEventListener("click", async (e) => {
            e.preventDefault();
            const defaultFlag = this.LockCLS.defaultState;
            await this.document.setFlag(MODULE_ID, `${this.formConfiguration.type}`, defaultFlag);
            ui.notifications.info(game.i18n.localize(`${MODULE_ID}.notifications.resetSuccess`));
        });

        // Redondear automáticamente valores decimales en inputs numéricos
        html.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    e.target.value = Math.round(value);
                }
            });
        });
    }

    async _updateObject(event, formData) {
        formData = foundry.utils.expandObject(formData);
        return this.document.setFlag(MODULE_ID, this.formConfigType, formData);
    }
}
