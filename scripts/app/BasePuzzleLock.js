import { MODULE_ID, getContentLink, registerLock } from "../main.js";
import { Socket } from "../lib/socket.js";
import { LockConfiguration } from "./LockConfiguration.js";
import { GeneralLockConfig, defaultConfig } from "./GeneralLockConfig.js";
import { getRGBfromCSSColor } from "../lib/utils.js";
import { getSetting, setSetting } from "../settings.js";

export class BasePuzzleLock extends Application {
    constructor(document, options = {}) {
        super();
        if (options.configOnly) {
            this.document = document;
            this.options = options;
            return;
        }
        CONFIG.PuzzleLocks.activeLock?.close();
        CONFIG.PuzzleLocks.activeLock = this;
        this.document = document;
        this.options = options;
        this.setHooks();
    }

    static get REQUIRES_CONTEXT() {
        return false;
    }

    static get APP_ID() {
        return this.name
            .split(/(?=[A-Z])/)
            .join("-")
            .toLowerCase();
    }

    static get APP_NAME() {
        return game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.title`);
    }

    get APP_ID() {
        return this.constructor.APP_ID;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            popOut: false,
            minimizable: false,
            classes: [],
        });
    }

    get classes() {
        return [];
    }

    get popOut() {
        return false;
    }

    get title() {
        return "";
    }

    get template() {
        return `modules/${MODULE_ID}/templates/${this.APP_ID}.hbs`;
    }

    get id() {
        return this.constructor.APP_ID;
    }

    static get defaultState() {
        return {};
    }

    static get formConfiguration() {
        return {};
    }

    get formConfiguration() {
        return this.constructor.formConfiguration;
    }

    get defaultPrimaryColor() {
        return "white";
    }

    get defaultSecondaryColor() {
        return "black";
    }

    get UPDATE_AUTHORITY() {
        if (this.document.isOwner) return [game.user.id];
        return Socket.USERS.FIRSTGM;
    }

    async getData() {
        const state = await this._loadState();
        const general = this.getGeneralConfig();
        return { ...state, general };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        if (this.container) this.container.querySelector(".puzzle-lock-inner")?.remove();
        const container = this.container ?? document.createElement("div");
        if (!this.container) {
            container.appendChild(this.getAttemptsSpan());
            container.appendChild(this.createBasicInteractionsContainer());
        } else {
            this.container.querySelector(".attempts-label")?.replaceWith(this.getAttemptsSpan());
        }
        this.container = container;
        container.classList.add("puzzle-lock");
        html.classList.add("puzzle-lock-inner");
        container.appendChild(html);
        document.querySelector("#interface").appendChild(container);

        const generalConfig = this.getGeneralConfig();
        if (generalConfig.primaryColor) {
            const rgb = getRGBfromCSSColor(generalConfig.primaryColor);
            container.style.setProperty("--lock-primary-color-r", rgb.r);
            container.style.setProperty("--lock-primary-color-g", rgb.g);
            container.style.setProperty("--lock-primary-color-b", rgb.b);
        }
        if (generalConfig.secondaryColor) {
            const rgb = getRGBfromCSSColor(generalConfig.secondaryColor);
            container.style.setProperty("--lock-secondary-color-r", rgb.r);
            container.style.setProperty("--lock-secondary-color-g", rgb.g);
            container.style.setProperty("--lock-secondary-color-b", rgb.b);
        }
        container.style.setProperty("--lock-primary-font", `'${generalConfig.primaryFont}'`);
        container.style.setProperty("--lock-secondary-font", `'${generalConfig.secondaryFont}'`);
        container.style.setProperty("--lock-text-color", generalConfig.textColor ?? "white");
        container.style.setProperty("--glow-size-regular", generalConfig.glow ? "5px" : "0px");
        const zoomLevel = getSetting("zoomLevel") ?? 1;
        container.style.setProperty("--zoom-level", zoomLevel);
        html.style.backgroundImage = `url('${generalConfig.backgroundImage}')`;
    }

    getGeneralConfig() {
        const flag = this.document.getFlag(MODULE_ID, "general");
        const config = foundry.utils.mergeObject(foundry.utils.deepClone(defaultConfig), foundry.utils.deepClone(flag));
        config.primaryColor = config.primaryColor || this.defaultPrimaryColor;
        config.secondaryColor = config.secondaryColor || this.defaultSecondaryColor;
        return config;
    }

    async _getState() {
        const html = this.element[0];
        const state = {};
        for (const input of html.querySelectorAll("input, select, textarea")) {
            const name = input.name;
            if (!name) continue;
            const value = input.type === "checkbox" ? input.checked : input.value;
            state[name] = value;
        }
        return foundry.utils.expandObject(state);
    }

    async _loadState() {
        const state = this.document.getFlag(MODULE_ID, this.APP_ID) ?? this.constructor.defaultState;
        const cloned = foundry.utils.deepClone(state);
        const data = foundry.utils.mergeObject(this.constructor.defaultState, cloned);
        return foundry.utils.expandObject(data);
    }

    async updateState() {
        if (!game.users.find((u) => u.isGM && u.active) && !this.document.isOwner) {
            ui.notifications.error("No GM connected");
            return this.close();
        }
        const state = await this._getState();
        const data = {
            flags: {
                [MODULE_ID]: {
                    [this.APP_ID]: state,
                },
            },
        };
        Socket.routeUpdate({ uuid: this.document.uuid, data }, { users: this.UPDATE_AUTHORITY });
    }

    async getAllData() {
        const config = await this._loadState();
        const current = await this._getState();
        return { config, current };
    }

    async isUnlocked() {
        throw new Error("isUnlocked not implemented");
    }

    async onUnlock() {
        this.playUnlockSound();
        if (this.document instanceof WallDocument && this.document.ds === CONST.WALL_DOOR_STATES.LOCKED) {
            const data = { ds: CONST.WALL_DOOR_STATES.CLOSED };
            await Socket.routeUpdate({ uuid: this.document.uuid, data }, { users: Socket.USERS.FIRSTGM });
        } else {
            const targetOwnership = parseInt(this.document.getFlag(MODULE_ID, "general.permission") ?? CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
            const allPlayers = (this.document.getFlag(MODULE_ID, "general.userPermissions") ?? 0) == 0;
            let data = {};
            if (allPlayers) {
                data = { ownership: { default: targetOwnership } };
            } else {
                const uId = game.user.id;
                data = { ownership: { [uId]: targetOwnership } };
            }
            if (targetOwnership !== 0) await Socket.routeUpdate({ uuid: this.document.uuid, data }, { users: this.UPDATE_AUTHORITY });
        }
        const flagData = { flags: { [MODULE_ID]: { general: { unlocked: true } } } };
        if (this.document instanceof TileDocument) flagData.flags["levels-3d-preview"] = { doorState: CONST.WALL_DOOR_STATES.CLOSED };
        await Socket.routeUpdate({ uuid: this.document.uuid, data: flagData }, { users: this.UPDATE_AUTHORITY });
        const unlockMacro = this.document.getFlag(MODULE_ID, "general.unlockMacro");
        if (unlockMacro) await Socket.runUnlockMacro({ uuid: this.document.uuid, user: game.user.id }, { users: this.UPDATE_AUTHORITY });
        this.toChatUnlock();
    }

    async toChatUnlock() {
        const config = this.getGeneralConfig();
        const objectName = config.label || this.document.name || this.document.constructor.name;
        const chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker(),
            content: `<h2><i class="fa-solid fa-lock-keyhole-open"></i> ${game.i18n.localize(`${MODULE_ID}.unlocked`)}</h2>
            <p>${game.user.character?.name || game.user.name} ${game.i18n.localize(`${MODULE_ID}.unlocked`)} @UUID[${this.document.uuid}]{${objectName}}</p>`,
        };
        ChatMessage.create(chatData);
    }

    playUnlockSound() {
        const sound = this.document.getFlag(MODULE_ID, "general.unlockSound");
        if (!sound) return;
        Socket.playSound({ sound, uuid: this.document.uuid });
    }

    playInteractionSound() {
        const sound = this.document.getFlag(MODULE_ID, "general.interactionSound");
        if (!sound) return;
        Socket.playSound({ sound, uuid: this.document.uuid });
    }

    static openConfigurationForm(document, options) {
        const instance = new this(document, { configOnly: true });
        const form = new LockConfiguration(document, instance.formConfiguration, this);
        form.render(true, options);
        return form;
    }

    setHooks() {
        const documentName = this.document.documentName;
        this.updateHook = Hooks.on(`update${documentName}`, async (document, updates) => {
            if (updates?.flags?.[MODULE_ID]?.general?.unlocked === true) this.close();
            else this.render(true);
        });
    }

    unsetHooks() {
        Hooks.off(`update${this.document.documentName}`, this.updateHook);
    }

    async close(args) {
        this.unsetHooks();
        CONFIG.PuzzleLocks.activeLock = null;
        if (this.container) {
            this.container.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }).onfinish = () => {
                this.container.remove();
            };
        }
        return super.close(args);
    }

    createBasicInteractionsContainer() {
        const container = document.createElement("div");
        container.classList.add("puzzle-lock-interactions");
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("puzzle-lock-buttons");
        this.getSidebarButtons().forEach((button) => {
            if (!button.visible) return;
            const buttonElement = document.createElement("button");
            buttonElement.innerHTML = button.icon;
            buttonElement.dataset.tooltip = button.label;
            buttonElement.dataset.tooltipDirection = foundry.helpers.interaction.TooltipManager.implementation.TOOLTIP_DIRECTIONS.LEFT;
            buttonElement.addEventListener("click", (e) => {
                e.preventDefault();
                button.onClick(e);
            });
            buttonContainer.appendChild(buttonElement);
        });
        container.appendChild(buttonContainer);
        return container;
    }

    getSidebarButtons() {
        return [
            {
                id: "unlock",
                icon: `<i class="fa-duotone fa-unlock-keyhole"></i>`,
                label: `${MODULE_ID}.sidebar-buttons.unlock`,
                onClick: this._onUnlockAttempt.bind(this),
                visible: true,
            },
            {
                id: "configure",
                icon: `<i class="fa-duotone fa-cog"></i>`,
                label: `${MODULE_ID}.sidebar-buttons.configure`,
                onClick: () => {
                    this.constructor.openConfigurationForm(this.document);
                },
                visible: game.user.isGM && !!this.constructor.formConfiguration.inputs?.length,
            },
            {
                id: "shareToChat",
                icon: `<i class="fa-duotone fa-comment-alt-lines"></i>`,
                label: `${MODULE_ID}.sidebar-buttons.shareToChat`,
                visible: true,
                onClick: () => {
                    this.toChat();
                },
            },
            {
                id: "zoomPlus",
                icon: `<i class="fa-duotone fa-search-plus"></i>`,
                label: `${MODULE_ID}.sidebar-buttons.zoomPlus`,
                visible: true,
                onClick: () => {
                    setSetting("zoomLevel", Math.min(2, getSetting("zoomLevel") + 0.1));
                    this.render(true);
                },
            },
            {
                id: "zoomMinus",
                icon: `<i class="fa-duotone fa-search-minus"></i>`,
                label: `${MODULE_ID}.sidebar-buttons.zoomMinus`,
                visible: true,
                onClick: () => {
                    setSetting("zoomLevel", Math.max(0.5, getSetting("zoomLevel") - 0.1));
                    this.render(true);
                },
            },
            {
                id: "close",
                icon: `<i class="fa-duotone fa-window-close"></i>`,
                label: `${MODULE_ID}.sidebar-buttons.close`,
                onClick: () => {
                    this.close();
                },
                visible: true,
            },
        ];
    }

    async _onUnlockAttempt() {
        let attempts = this.document.getFlag(MODULE_ID, `${this.APP_ID}.attempts`);
        let isGeneral = false;
        if (attempts === undefined || attempts === null) {
            attempts = this.document.getFlag(MODULE_ID, "general.attempts");
            isGeneral = true;
        }
        attempts = attempts ?? -1;

        if (attempts === 0) {
            ui.notifications.error(`${MODULE_ID}.notifications.noAttempts`, { localize: true });
            return false;
        }

        if (attempts !== -1) {
            const newAttempts = Math.max(0, attempts - 1);
            let updateData;
            if (isGeneral) {
                updateData = { flags: { [MODULE_ID]: { general: { attempts: newAttempts } } } };
            } else {
                updateData = { flags: { [MODULE_ID]: { [this.APP_ID]: { attempts: newAttempts } } } };
            }
            await Socket.routeUpdate({ uuid: this.document.uuid, data: updateData }, { users: this.UPDATE_AUTHORITY });
        }

        if (await this.isUnlocked()) {
            await this.onUnlock();
            ui.notifications.info(`${MODULE_ID}.notifications.unlocked`, { localize: true });
            this.close();
        } else {
            ui.notifications.error(`${MODULE_ID}.notifications.failedAttempt`, { localize: true });
        }
    }

    toChat() {
        const contentLink = getContentLink(this.document);
        const speaker = ChatMessage.getSpeaker();
        const messageText = `${speaker.alias} ${game.i18n.localize(`${MODULE_ID}.chatMessage`)}:<hr>${contentLink}`;
        ChatMessage.create({ content: messageText, speaker });
    }

    getAttemptsSpan() {
        const attemptsLabel = document.createElement("span");
        attemptsLabel.classList.add("attempts-label");
        
        let attempts = this.document.getFlag(MODULE_ID, `${this.APP_ID}.attempts`);
        if (attempts === undefined || attempts === null) {
            attempts = this.document.getFlag(MODULE_ID, "general.attempts");
        }
        attempts = attempts ?? -1;

        if (attempts !== -1) attemptsLabel.innerHTML = `${game.i18n.localize(`${MODULE_ID}.attempts`)}: ${attempts}`;
        return attemptsLabel;
    }

    static register() {
        registerLock(this.APP_ID, this);
    }
}
