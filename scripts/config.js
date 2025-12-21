import { GeneralLockConfig } from "./app/GeneralLockConfig.js";
import { MODULE_ID, hasLock, isDocumentLocked, unlock } from "./main.js";

export function initConfig() {
    const placeableTypes = ["Tile", "Wall", "Token", "Drawing", "MeasuredTemplate"];
    const exclude = ["ChatMessage", "Combat", "Macro", "Folder", "Playlist", "Scene", "User"];
    CONST.WORLD_DOCUMENT_TYPES.filter((type) => !exclude.includes(type)).forEach((type) => {
        Hooks.on(`get${type}SheetHeaderButtons`, injectHeaderButtons);
    });
    placeableTypes.forEach((type) => {
        Hooks.on(`get${type}ConfigHeaderButtons`, injectHeaderButtons);
    });
    Hooks.on("getJournalPageSheetHeaderButtons", injectHeaderButtons);
    Hooks.on("getJournalSheetHeaderButtons", injectHeaderButtons);
    Hooks.on("getVaultAppHeaderButtons", injectHeaderButtons);
    Hooks.on("getItemPileInventoryAppHeaderButtons", injectHeaderButtons);
    Hooks.on("getMerchantAppHeaderButtons", injectHeaderButtons);

    Hooks.on("getHeaderControlsDocumentSheetV2", injectHeaderButtons);


    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.containers.DoorControl.prototype._onMouseDown",
        function (wrapped, ...args) {
            const result = wrapped(...args);
            const { ds } = this.wall.document;
            const states = CONST.WALL_DOOR_STATES;
            if (args[0]?.button === 0 && ds === states.LOCKED && hasLock(this.wall.document.uuid)) {
                unlock(this.wall.document.uuid);
            }
            return result;
        },
        "WRAPPER",
    );

    libWrapper.register(
        MODULE_ID,
        "Application.prototype.render",
        function (wrapped, ...args) {
            const object = this.object ?? this.actor;
            const isPage = args[1]?.pageId ? object?.pages?.get(args[1]?.pageId) : null;
            if (args[0] && object?.uuid && isDocumentLocked(object)) {
                if (game.user.isGM) {
                    return wrapped(...args);
                }
                unlock(object.uuid);
                return false;
            } else if (args[0] && isPage && isDocumentLocked(isPage)) {
                if (game.user.isGM) {
                    return wrapped(...args);
                }
                unlock(isPage.uuid);
                return false;
            }
            return wrapped(...args);
        },
        "MIXED",
    );


    Hooks.once("canvasReady", () => {
        if (TileDocument.prototype.trigger) {
            libWrapper.register(
                MODULE_ID,
                "TileDocument.prototype.trigger",
                async function (wrapped, ...args) {
                    if (isDocumentLocked(this)) {
                        unlock(this.uuid);
                        return false;
                    }
                    return wrapped(...args);
                },
                "MIXED",
            );
        }
        if (game.user.isGM) {
            Hooks.on("preUpdateWall", (document, updates) => {
                if ("ds" in updates && hasLock(document.uuid)) {
                    updates[`flags.${MODULE_ID}.general.unlocked`] = updates.ds === CONST.WALL_DOOR_STATES.LOCKED ? false : true;
                }
            });
        }
    });

}

function injectHeaderButtons(app, headerButtons) {
    if (game.user.isGM && !headerButtons.some((button) => button.class === "joker-locker")) {
        const document = app.document ?? app.actor;
        const isLocked = document && isDocumentLocked(document);

        const button = {
            label: game.i18n.localize(`${MODULE_ID}.headerConfig`),
            class: isLocked ? "joker-locker-locked" : "joker-locker",
            icon: "fas fa-puzzle",
            onclick: () => {
                new GeneralLockConfig(document).render(true);
            },
            onClick: () => {
                new GeneralLockConfig(document).render(true);
            },
        }
        app instanceof foundry.applications.api.ApplicationV2 ? headerButtons.push(button) : headerButtons.unshift(button);
    }
}
