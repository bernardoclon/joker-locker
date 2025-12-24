import { MODULE_ID, getContentLink, unlock } from "../main.js";

import { LOCKS } from "../main.js";

export const defaultConfig = {
    unlocked: false,
    attempts: -1,
    unlockMacro: "",
    lockType: "none",
    primaryColor: "",
    secondaryColor: "",
    primaryFont: "inherit",
    secondaryFont: "inherit",
    glow: true,
    permission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    userPermissions: 0,
};

export class GeneralLockConfig extends FormApplication {
    constructor(document, openSubMenu = false) {
        super();
        this.document = document;
        this.openSubMenu = openSubMenu;
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
            title: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.title`),
            closeOnSubmit: true,
            width: 500,
        });
    }

    async getData() {
        const data = foundry.utils.deepClone(this.document.getFlag(MODULE_ID, "general") ?? {});
        const defaultData = foundry.utils.deepClone(defaultConfig);
        const mergedData = foundry.utils.mergeObject(defaultData, data);
        const lockTypeOptions = Object.keys(LOCKS).reduce((acc, key) => {
            acc[key] = game.i18n.localize(`${MODULE_ID}.${key}.name`);
            return acc;
        }, {});

        const noContextLocks = {};
        const contextLocks = {};

        for (const [key, value] of Object.entries(lockTypeOptions)) {
            if (LOCKS[key].REQUIRES_CONTEXT) {
                contextLocks[key] = value;
            } else {
                noContextLocks[key] = value;
            }
        }

        const permissionOptions = {
            [CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE]: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.permission.noChange`),
            [CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER]: game.i18n.localize("OWNERSHIP.OBSERVER"),
            [CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER]: game.i18n.localize("OWNERSHIP.OWNER"),
        };
        const userPermissionsOptions = {
            0: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.permission.all`),
            1: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.permission.unlocking`),
        };

        //check default permission for this document
        const showPermissionWarning = Number.isFinite(this.document.ownership?.default) && this.document.ownership?.default !== CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

        return { ...mergedData, lockTypeOptions, noContextLocks, contextLocks, fontChoices: this.getFontChoices(), permissionOptions, userPermissionsOptions, showPermissionWarning };
    }

    getFontChoices() {
        return {
            inherit: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.font.inherit`),
            ...foundry.applications.settings.menus.FontConfig.getAvailableFontChoices(),
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        const lockTypeSelect = html.querySelector("select[name='lockType']");
        const configureButton = html.querySelector("#configure-lock");
        const updateButton = () => {
            const lockType = lockTypeSelect.value;
            configureButton.disabled = !LOCKS[lockType];
        };
        updateButton();
        lockTypeSelect.addEventListener("change", () => {
            updateButton();
            CONFIG.PuzzleLocks.activeLock?.close();
        });
        html.querySelector("#configure-lock").addEventListener("click", async () => {
            const lockType = html.querySelector("select[name='lockType']").value;
            const lockClass = LOCKS[lockType];
            if (!lockClass) return ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.noLockSelected`));
            //get window top right
            const top = this.position.top;
            const left = this.position.left + this.position.width;
            this.subMenu = lockClass.openConfigurationForm(this.document, { top, left });
        });
        if (this.openSubMenu) {
            setTimeout(() => html.querySelector("#configure-lock").click(), 100);
        }
        const fixOwnership = html.querySelector("#fix-ownership");
        if (fixOwnership) {
            fixOwnership.addEventListener("click", async () => {
                await this.document.update({ "ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE });
                ui.notifications.info(game.i18n.localize(`${MODULE_ID}.notifications.ownershipFixed`));
                this.render(true, { height: "auto" });
            });
        }
    }

    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();
        buttons.unshift(
            {
                label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.header-buttons.copyContentLink`),
                class: "copy-content-link",
                icon: "fas fa-link",
                onclick: () => {
                    const contentLink = getContentLink(this.document);
                    game.clipboard.copyPlainText(contentLink);
                    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.notifications.contentLinkCopied`));
                },
            },
            {
                label: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.header-buttons.unlock`),
                class: "unlock",
                icon: "fas fa-puzzle",
                onclick: () => unlock(this.document.uuid),
            },
        );
        return buttons;
    }

    async _updateObject(event, formData) {
        formData = foundry.utils.expandObject(formData);
        return this.document.setFlag(MODULE_ID, "general", formData);
    }

    async close(...args) {
        if (this.subMenu) this.subMenu.close();
        return super.close(...args);
    }
}
