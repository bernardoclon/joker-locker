import { BasePuzzleLock } from "./BasePuzzleLock.js";
import { MODULE_ID } from "../main.js";

export class ChemicalBalanceLock extends BasePuzzleLock {
    static get APP_ID() {
        return "chemical-balance-lock";
    }

    static get APP_NAME() {
        return game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.name`);
    }

    static get REQUIRES_CONTEXT() {
        return true;
    }

    static get formConfiguration() {
        return {
            title: `${MODULE_ID}.${this.APP_ID}.name`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "colorCount",
                    type: "number",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.colorCount.label`),
                    notes: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.colorCount.notes`),
                    value: 3,
                    min: 2,
                    max: 5,
                    step: 1
                },
                {
                    name: "color1",
                    type: "color",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.color1`),
                    value: "#FF0000"
                },
                {
                    name: "amount1",
                    type: "number",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.amount1`),
                    value: 5,
                    min: 0,
                    max: 10,
                    step: 1
                },
                {
                    name: "color2",
                    type: "color",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.color2`),
                    value: "#00FF00"
                },
                {
                    name: "amount2",
                    type: "number",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.amount2`),
                    value: 5,
                    min: 0,
                    max: 10,
                    step: 1
                },
                {
                    name: "color3",
                    type: "color",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.color3`),
                    value: "#0000FF"
                },
                {
                    name: "amount3",
                    type: "number",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.amount3`),
                    value: 5,
                    min: 0,
                    max: 10,
                    step: 1
                },
                 {
                    name: "color4",
                    type: "color",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.color4`),
                    value: "#FFFF00"
                },
                {
                    name: "amount4",
                    type: "number",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.amount4`),
                    value: 0,
                    min: 0,
                    max: 10,
                    step: 1
                },
                {
                    name: "color5",
                    type: "color",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.color5`),
                    value: "#FF00FF"
                },
                {
                    name: "amount5",
                    type: "number",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.amount5`),
                    value: 0,
                    min: 0,
                    max: 10,
                    step: 1
                },
                {
                    name: "step",
                    type: "number",
                }
            ]
        };
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: this.APP_ID,
            title: this.APP_NAME,
            template: `modules/${MODULE_ID}/templates/${this.APP_ID}.hbs`,
            width: 500,
            height: "auto",
        });
    }

    static get defaultConfig() {
        return {
            colorCount: 3,
            color1: "#FF0000",
            amount1: 5,
            color2: "#00FF00",
            amount2: 5,
            color3: "#0000FF",
            amount3: 5,
            color4: "#FFFF00",
            amount4: 5,
            color5: "#FF00FF",
            amount5: 5,
            step: 1
        };
    }

    constructor(document) {
        super(document);
        const config = this.config;
        const colorCount = Math.max(2, Math.min(5, config.colorCount || 3));
        this.state = {
            mixedColor: { r: 0, g: 0, b: 0 },
            amounts: Array(colorCount).fill(0)
        };
    }

    get config() {
        const config = foundry.utils.mergeObject(this.constructor.defaultConfig, this.document.getFlag(MODULE_ID, this.constructor.APP_ID));
        config.colorCount = Math.max(2, Math.min(5, config.colorCount || 3));
        return config;
    }

    async getData(options) {
        const data = await super.getData(options);
        const config = this.config;

        // Sync state array size with config, as config might not be fully available in constructor.
        if (!this.state.amounts || this.state.amounts.length !== config.colorCount) {
            this.state.amounts = Array(config.colorCount).fill(0);
        }

        const maxDrops = 10; // Visual max for tube fill

        const baseColors = [];
        for (let i = 0; i < config.colorCount; i++) {
            baseColors.push({
                color: config[`color${i + 1}`],
                amount: this.state.amounts[i],
                height: Math.min((this.state.amounts[i] / maxDrops) * 100, 100)
            });
        }

        return {
            ...data,
            lockId: this.APP_ID,
            mixedColor: this._rgbToHex(this.state.mixedColor.r, this.state.mixedColor.g, this.state.mixedColor.b),
            baseColors: baseColors
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('.add-color').on('click', (event) => this._onModifyAmount(event, 1));
        html.find('.subtract-color').on('click', (event) => this._onModifyAmount(event, -1));
        this._updateMixedColor();
    }

    _onModifyAmount(event, direction) {
        const index = $(event.currentTarget).data('index');
        const step = this.config.step ?? 1;
        const currentAmount = this.state.amounts[index] || 0;
        const newAmount = Math.max(0, Math.min(10, currentAmount + (step * direction)));
        this.state.amounts[index] = newAmount;
        
        const $button = $(event.currentTarget);
        $button.parent().find('.amount-display').text(newAmount);

        // Update visual height
        const maxDrops = 10;
        const height = Math.min((newAmount / maxDrops) * 100, 100);
        $button.closest('.tube-station').find('.liquid').css('height', `${height}%`);

        this._updateMixedColor();
    }

    _updateMixedColor() {
        const totalAmount = this.state.amounts.reduce((acc, val) => acc + val, 0);
        if (totalAmount === 0) {
            this.state.mixedColor = { r: 0, g: 0, b: 0 };
        } else {
            let r = 0, g = 0, b = 0;
            const config = this.config;
            const colors = [];
            for (let i = 0; i < config.colorCount; i++) {
                colors.push(config[`color${i + 1}`]);
            }
            colors.forEach((hex, i) => { 
                const color = this._hexToRgb(hex);
                if (!color) return;
                const amount = this.state.amounts[i];
                r += color.r * amount;
                g += color.g * amount;
                b += color.b * amount;
            });
            this.state.mixedColor = {
                r: Math.round(r / totalAmount),
                g: Math.round(g / totalAmount),
                b: Math.round(b / totalAmount)
            };
        }

        const mixedColorHex = this._rgbToHex(this.state.mixedColor.r, this.state.mixedColor.g, this.state.mixedColor.b);
        this.element.find('.mixed-liquid').css('background-color', mixedColorHex);
    }

    async isUnlocked() {
        const config = this.config;
        const targetAmounts = [];
        for (let i = 0; i < config.colorCount; i++) {
            targetAmounts.push(config[`amount${i + 1}`]);
        }
        const currentAmounts = this.state.amounts;

        return currentAmounts.every((amount, index) => {
            return amount === targetAmounts[index];
        });
    }

    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
    }

    _rgbToHex(r, g, b) {
        if (isNaN(r) || isNaN(g) || isNaN(b)) return "#000000";
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }
}