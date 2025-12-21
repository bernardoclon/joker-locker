import {Socket} from "../lib/socket.js";
import { MODULE_ID } from "../main.js";
import { BasePuzzleLock } from "./BasePuzzleLock.js";

export class ItemLock extends BasePuzzleLock {
    static get formConfiguration() {
        const itemSlots = [];

        for (let i = 0; i < 10; i++) {
            itemSlots.push({
                name: `item-${i}-name`,
                label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.item.label`) + ` ${i}`,
                value: "",
                type: "text",
            });
            itemSlots.push({
                name: `item-${i}-image`,
                label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.itemImage.label`) + ` ${i}`,
                value: "",
                type: "filepicker",
            });
        }

        return {
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            type: this.APP_ID,
            inputs: [
                {
                    name: "deleteItems",
                    label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.deleteItems.label`),
                    value: false,
                    type: "checkbox",
                },
                ...itemSlots,
            ],
        };
    }

    static get REQUIRES_CONTEXT() {
        return true;
    }

    static get defaultState() {
        const storedItemSlots = {};
        for (let i = 0; i < 10; i++) {
            const key = `item-${i}`;
            storedItemSlots[key] = null;
        }
        return {
            storedItemSlots: storedItemSlots,
        };
    }

    get defaultPrimaryColor() {
        return "magenta";
    }

    async getData() {
        const data = await super.getData();
        const itemSlots = [];
        const config = await this._loadState();
        for (let i = 0; i < 10; i++) {
            const key = `item-${i}`;
            itemSlots.push({
                item: config.storedItemSlots[key] ? await fromUuid(config.storedItemSlots[key]) : null,
                uuid: config.storedItemSlots[key] ? config.storedItemSlots[key] : null,
                slotIndex: i,
                itemName: config[`item-${i}-name`],
                image: config[`item-${i}-image`],
                key: "storedItemSlots." + key,
            });
        }
        data.itemSlots = itemSlots;
        return data;
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        html.querySelectorAll(".item-lock-item").forEach((item) => {
            //drop even
            item.addEventListener("drop", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.playInteractionSound();
                const data = JSON.parse(event.dataTransfer.getData("text/plain"));
                if (!data.type === "Item") return;
                const input = item.querySelector("input");
                input.value = data.uuid;
                await this.updateState();
            });
            //on rigth click, clear the input
            item.addEventListener("mouseup", async (event) => {
                event.preventDefault();
                this.playInteractionSound();
                const input = item.querySelector("input");
                input.value = "";
                await this.updateState();
            });
        });
    }

    async isUnlocked() {
        const {config, current} = await this.getAllData();
        const storedItemsUUIDs = Object.values(current.storedItemSlots).filter((uuid) => uuid);
        const slotItemNames = [];
        for (const uuid of storedItemsUUIDs) {
            const item = await fromUuid(uuid);
            if(!item) return false;
            slotItemNames.push(item.name.toLowerCase());
        }
        for(let i = 0; i < 10; i++) {
            const itemName = config[`item-${i}-name`];
            if (!itemName) continue;
            if(slotItemNames[i] !== itemName.toLowerCase()) return false;
        }

        if (config.deleteItems) {
            Socket.deleteItems({uuids: storedItemsUUIDs});
        }

        return true;
    }
}
