/*!
 * Copyright 2011-2023 Unlok
 * https://www.unlok.ca
 *
 * Credits & Thanks:
 * https://www.unlok.ca/credits-thanks/
 *
 * Wayward is a copyrighted and licensed work. Modification and/or distribution of any source files is prohibited. If you wish to modify the game in any way, please refer to the modding guide:
 * https://github.com/WaywardGame/types/wiki
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "audio/IAudio", "event/EventBuses", "event/EventManager", "game/WorldZ", "game/biome/IBiome", "game/entity/Human", "game/entity/IEntity", "game/entity/IHuman", "game/entity/action/Action", "game/entity/action/IAction", "game/entity/creature/Creature", "game/entity/creature/ICreature", "game/entity/player/IMessageManager", "game/entity/player/IPlayer", "game/entity/player/Player", "game/entity/status/handler/IBleeding", "game/item/IItem", "game/item/ItemDescriptions", "game/item/LootGroups", "game/tile/ITerrain", "game/tile/TileBits", "language/dictionary/Message", "mod/Mod", "mod/ModRegistry", "renderer/IRenderer", "renderer/world/IWorldRenderer", "renderer/world/WorldRenderer", "ui/screen/screens/game/util/movement/WalkToTileHandler", "utilities/class/Inject", "utilities/enum/Enums", "utilities/math/Vector2", "utilities/math/Vector3", "utilities/random/RandomUtilities"], function (require, exports, IAudio_1, EventBuses_1, EventManager_1, WorldZ_1, IBiome_1, Human_1, IEntity_1, IHuman_1, Action_1, IAction_1, Creature_1, ICreature_1, IMessageManager_1, IPlayer_1, Player_1, IBleeding_1, IItem_1, ItemDescriptions_1, LootGroups_1, ITerrain_1, TileBits_1, Message_1, Mod_1, ModRegistry_1, IRenderer_1, IWorldRenderer_1, WorldRenderer_1, WalkToTileHandler_1, Inject_1, Enums_1, Vector2_1, Vector3_1, RandomUtilities_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Troposphere extends Mod_1.default {
        get creaturePool() {
            return [this.creatureBear, this.creatureRabbit, this.creatureCloudling, this.creatureLightningElemental];
        }
        initializeSaveData(data) {
            if (!data) {
                data = {
                    islands: new Map(),
                    players: new Map(),
                };
            }
            if (!data.islands) {
                data.islands = new Map();
            }
            if (!data.players) {
                data.players = new Map();
            }
            return data;
        }
        onLoad() {
            const glassBottle = ItemDescriptions_1.itemDescriptions[IItem_1.ItemType.GlassBottle];
            if (glassBottle && glassBottle.use) {
                glassBottle.use.push(this.actionGatherRainbow);
            }
        }
        onUnload() {
            const glassBottle = ItemDescriptions_1.itemDescriptions[IItem_1.ItemType.GlassBottle];
            if (glassBottle && glassBottle.use) {
                glassBottle.use.pop();
            }
        }
        setFlying(human, flying, passTurn) {
            const z = !flying ? WorldZ_1.WorldZ.Overworld : this.z;
            const openTile = human.island.getTile(human.x, human.y, z).findMatchingTile(this.isFlyableTile.bind(this));
            if (openTile === undefined || human.z === WorldZ_1.WorldZ.Cave) {
                if (passTurn) {
                    human.messages.source(IMessageManager_1.Source.Action)
                        .type(IMessageManager_1.MessageType.Bad)
                        .send(flying ? this.messageFlewToTroposphereFailure : this.messageFlewToLandFailure);
                }
                return false;
            }
            human.x = openTile.x;
            human.y = openTile.y;
            human.setZ(z, false);
            human.setVehicle(undefined);
            human.skill.gain(this.skillFlying);
            human.notes.write(this.flyingNote, {
                hasHair: human.customization.hairStyle !== "None",
            });
            if (passTurn) {
                human.messages.source(IMessageManager_1.Source.Action, IMessageManager_1.Source.Item)
                    .type(IMessageManager_1.MessageType.Good)
                    .send(flying ? this.messageFlewToTroposphere : this.messageFlewToLand);
                game.passTurn(human);
            }
            return true;
        }
        isFlyableTile(tile) {
            if (tile.creature || tile.doodad) {
                return false;
            }
            const terrainType = tile.type;
            if (terrainType === this.terrainHole) {
                return false;
            }
            const terrainDescription = tile.description;
            return (!terrainDescription || (terrainDescription.water || terrainDescription.passable)) ? true : false;
        }
        easeInCubic(time, start, change, duration) {
            time /= duration;
            return change * time * time * time + start;
        }
        onPreLoadWorld(island, world) {
            const islandData = this.data.islands.get(island.id);
            if (!islandData) {
                this.data.islands.set(island.id, {
                    createdLayer: false,
                });
            }
            island.world.addLayer(this.z);
            this.log.info(`Added troposphere world layer ${this.z} for island ${island.id}`);
        }
        preLoadWorldDifferences(island, generateNewWorld) {
            const islandData = this.data.islands.get(island.id);
            if (!islandData) {
                return;
            }
            this.log.info(`Running troposphere mapgen. Has existing troposphere: ${islandData.createdLayer}`);
            const boulderChance = 0.02;
            const stormChance = 0.2;
            const rainbowChance = 0.15;
            const terrainHoleChance = 0.02;
            const creatureChance = 0.0025;
            const creatureSpriteChance = 0.0001;
            const creatureAberrantChance = 0.05;
            const creatureAberrantStormChance = 0.50;
            const seededRandom = island.seededRandom.clone(false, island.seeds.base).advance();
            const doodadsToCreate = [];
            for (let x = 0; x < island.mapSize; x++) {
                for (let y = 0; y < island.mapSize; y++) {
                    const tile = island.createTile(x, y, this.z, (this.z * island.mapSizeSq) + (y * island.mapSize) + x);
                    const overworldTile = island.getTile(x, y, WorldZ_1.WorldZ.Overworld);
                    const terrainDescription = overworldTile.description;
                    const normalTerrainType = terrainDescription?.terrainType ?? ITerrain_1.TerrainType.Grass;
                    let terrainType;
                    switch (normalTerrainType) {
                        case ITerrain_1.TerrainType.Granite:
                        case ITerrain_1.TerrainType.Sandstone:
                            terrainType = this.terrainCloudstone;
                            break;
                        case ITerrain_1.TerrainType.DeepSeawater:
                        case ITerrain_1.TerrainType.DeepFreshWater:
                            terrainType = this.terrainStormstone;
                            break;
                        case ITerrain_1.TerrainType.Seawater:
                        case ITerrain_1.TerrainType.FreshWater:
                        case ITerrain_1.TerrainType.ShallowSeawater:
                            if (seededRandom.float() <= stormChance) {
                                terrainType = this.terrainStormBoulder;
                            }
                            else {
                                terrainType = this.terrainStorm;
                            }
                            break;
                        case ITerrain_1.TerrainType.ShallowFreshWater:
                            if (seededRandom.float() <= rainbowChance) {
                                terrainType = this.terrainCloud;
                                doodadsToCreate.push({ tile, doodadType: this.doodadRainbow });
                            }
                            else {
                                terrainType = this.terrainCloudWater;
                            }
                            break;
                        default:
                            if (seededRandom.float() <= boulderChance) {
                                terrainType = this.terrainCloudBoulder;
                            }
                            else {
                                terrainType = this.terrainCloud;
                            }
                            break;
                    }
                    if (terrainType === this.terrainCloud || terrainType === this.terrainStorm) {
                        if (seededRandom.float() <= terrainHoleChance) {
                            terrainType = this.terrainHole;
                        }
                    }
                    tile.rendererData = TileBits_1.default.setTypeRaw(tile.rendererData, terrainType);
                }
            }
            if (!islandData.createdLayer) {
                for (const doodadToCreate of doodadsToCreate) {
                    island.doodads.create(doodadToCreate.doodadType, doodadToCreate.tile);
                }
                for (let x = 0; x < island.mapSize; x++) {
                    for (let y = 0; y < island.mapSize; y++) {
                        const tile = island.getTile(x, y, this.z);
                        const terrainType = tile.type;
                        switch (terrainType) {
                            case this.terrainCloud:
                            case this.terrainStorm:
                                const chance = seededRandom.float();
                                const aberrantChance = terrainType === this.terrainCloud ? creatureAberrantChance : creatureAberrantStormChance;
                                if (chance <= creatureSpriteChance) {
                                    island.creatures.spawn(this.creatureSprite, tile, true, seededRandom.float() <= aberrantChance);
                                }
                                else if (chance <= creatureChance) {
                                    const creatureType = this.creaturePool[seededRandom.int(this.creaturePool.length)];
                                    island.creatures.spawn(creatureType, tile, true, seededRandom.float() <= aberrantChance);
                                }
                                break;
                        }
                    }
                }
                islandData.createdLayer = true;
            }
        }
        preRenderWorld(worldRenderer, tileScale, viewWidth, viewHeight, timestamp) {
            if (localPlayer.z !== this.z) {
                return;
            }
            const movementProgress = localPlayer.getMovementProgress(timestamp);
            if (this.isPlayerFalling(localPlayer)) {
                tileScale = this.easeInCubic(movementProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
                renderer?.updateRender(IRenderer_1.RenderSource.Mod, IRenderer_1.UpdateRenderFlag.World);
            }
            else {
                tileScale *= 0.25;
            }
            let position = new Vector2_1.default(localPlayer.fromX, localPlayer.fromY)
                .lerp(localPlayer, movementProgress);
            const scale = 16 * worldRenderer.getZoom() * 0.5;
            position = new Vector2_1.default(position)
                .multiply(scale)
                .floor()
                .divide(scale);
            const overworldLayer = worldRenderer.layers[WorldZ_1.WorldZ.Overworld];
            const { viewportBounds } = worldRenderer.getBounds(timestamp);
            overworldLayer.ensureRendered(viewportBounds, true);
            worldRenderer.renderWorldLayer(overworldLayer, position.x, position.y, tileScale, viewWidth, viewHeight, IWorldRenderer_1.RenderFlag.Terrain, false);
        }
        shouldRender(_) {
            if (this.isPlayerFalling(localPlayer)) {
                return IWorldRenderer_1.RenderFlag.Player;
            }
            return undefined;
        }
        onPlayerSpawn(player) {
            let playerData = this.data.players.get(player.identifier);
            if (playerData) {
                playerData.falling = false;
                return;
            }
            playerData = {
                createdItems: true,
                falling: false,
            };
            this.data.players.set(player.identifier, playerData);
            player.createItemInInventory(this.itemNimbus);
        }
        preMove(player, fromTile, tile) {
            if (player.z !== this.z) {
                return;
            }
            const terrainType = tile.type;
            if (terrainType === this.terrainHole) {
                this.setPlayerFalling(player, true);
                renderer?.fieldOfView.compute(game.absoluteTime);
            }
        }
        onMoveComplete(player) {
            if (player.z !== this.z) {
                return;
            }
            if (this.isPlayerFalling(player)) {
                this.setPlayerFalling(player, false);
                this.setFlying(player, false, false);
                if (player.state !== IPlayer_1.PlayerState.Ghost) {
                    let damage = -40;
                    damage *= 1 - player.skill.get(this.skillFlying) / 100;
                    const tile = player.island.getTile(player.x, player.y, player.z);
                    const terrainType = tile.type;
                    if (terrainType === ITerrain_1.TerrainType.DeepFreshWater || terrainType === ITerrain_1.TerrainType.DeepSeawater) {
                        damage *= .5;
                    }
                    else if (terrainType === ITerrain_1.TerrainType.FreshWater || terrainType === ITerrain_1.TerrainType.Seawater) {
                        damage *= .75;
                    }
                    const actualDamage = player.damage(damage, this.messageDeathByFalling);
                    if (actualDamage !== undefined) {
                        player.messages.source(IMessageManager_1.Source.Wellbeing)
                            .type(IMessageManager_1.MessageType.Bad)
                            .send(this.messageFellToLand, actualDamage);
                        if (actualDamage > 25 || actualDamage > 15 && player.island.seededRandom.chance(.5)) {
                            player.island.tileEvents.createBlood(player);
                        }
                    }
                }
                player.addDelay(IHuman_1.Delay.Collision, true);
                game.passTurn(player);
            }
        }
        shouldSpawnCreatureFromGroup(manager, creatureGroup, creaturePool, tile) {
            if (tile.z !== this.z) {
                return;
            }
            creaturePool.push.apply(creaturePool, this.creaturePool);
        }
        canConsumeItem(human, itemType, actionType) {
            if (itemType === this.itemRainbowGlassBottle && actionType === IAction_1.ActionType.DrinkItem) {
                human.customization = {
                    hairStyle: IHuman_1.HairStyle[Enums_1.default.getRandom(IHuman_1.HairStyle, human.island.seededRandom)],
                    hairColor: IHuman_1.HairColor[Enums_1.default.getRandom(IHuman_1.HairColor, human.island.seededRandom)],
                    skinColor: IHuman_1.SkinColor[Enums_1.default.getRandom(IHuman_1.SkinColor, human.island.seededRandom)],
                };
                return true;
            }
            return undefined;
        }
        canCreatureMove(creature, tile) {
            if (tile && tile.type === this.terrainHole) {
                return creature.type !== this.creatureBear && creature.type !== this.creatureRabbit;
            }
        }
        canCreatureAttack(creature, enemy) {
            if (creature.type !== this.creatureSprite) {
                return;
            }
            const creatureObj = creature;
            creatureObj.justAttacked = true;
        }
        canSeeCreature(_, creature, tile) {
            if (creature.type !== this.creatureSprite) {
                return;
            }
            const creatureObj = creature;
            if (creatureObj.justAttacked) {
                creatureObj.justAttacked = undefined;
                return;
            }
            if (creatureObj.nextVisibleCount === undefined || creatureObj.nextVisibleCount === 0) {
                creatureObj.nextVisibleCount = RandomUtilities_1.generalRandom.intInRange(1, 6);
                return;
            }
            creatureObj.nextVisibleCount--;
            return false;
        }
        getTilePenalty(_, penalty, tile) {
            if (tile.type === this.terrainHole) {
                penalty += 1000;
            }
            return penalty;
        }
        getFogColor(api) {
            if (localPlayer.z !== this.z || !renderer) {
                return;
            }
            api.cancelled = true;
            const ambientLightLevel = renderer.getAmbientLightLevel(localPlayer.z);
            const ambientLightColor = new Vector3_1.default(api.executingInstance.calculateAmbientColor());
            if (ambientLightLevel > 0.5) {
                api.returnValue = Vector3_1.default.mix(ambientLightColor, Vector3_1.default.ONE, ambientLightLevel * 2 - 1).xyz;
            }
            else {
                api.returnValue = Vector3_1.default.mix(Vector3_1.default.ZERO, ambientLightColor, ambientLightLevel * 2).xyz;
            }
        }
        isPlayerFalling(player) {
            return this.data.players.get(player.identifier)?.falling ? true : false;
        }
        setPlayerFalling(player, falling) {
            const playerData = this.data.players.get(player.identifier);
            if (playerData) {
                playerData.falling = falling;
            }
        }
    }
    exports.default = Troposphere;
    __decorate([
        ModRegistry_1.default.worldLayer("troposphere")
    ], Troposphere.prototype, "z", void 0);
    __decorate([
        ModRegistry_1.default.skill("flying")
    ], Troposphere.prototype, "skillFlying", void 0);
    __decorate([
        ModRegistry_1.default.helpArticle("Flying", {
            image: true,
            section: "Troposphere",
        })
    ], Troposphere.prototype, "flyingHelpArticle", void 0);
    __decorate([
        ModRegistry_1.default.note("Flying", {
            learnMore: (0, ModRegistry_1.Registry)().get("flyingHelpArticle"),
        })
    ], Troposphere.prototype, "flyingNote", void 0);
    __decorate([
        ModRegistry_1.default.action("FlyToTroposphere", new Action_1.Action(IAction_1.ActionArgument.ItemInventory)
            .setUsableBy(IEntity_1.EntityType.Human)
            .setPreExecutionHandler((action, weapon) => action.addItems(weapon))
            .setCanUse((action, item) => {
            if (!item.description?.use?.includes(Troposphere.INSTANCE.actionFlyToTroposphere)) {
                return {
                    usable: false,
                };
            }
            return {
                usable: true,
            };
        })
            .setHandler((action, item) => {
            Troposphere.INSTANCE.setFlying(action.executor, action.executor.z !== Troposphere.INSTANCE.z, true);
            item.damage(IAction_1.ActionType[action.type]);
        }))
    ], Troposphere.prototype, "actionFlyToTroposphere", void 0);
    __decorate([
        ModRegistry_1.default.action("GatherRainbow", new Action_1.Action(IAction_1.ActionArgument.ItemNearby)
            .setUsableBy(IEntity_1.EntityType.Human)
            .setCanUse((action, item) => {
            const player = action.executor;
            const tile = player.facingTile;
            const tileDoodad = tile.doodad;
            if (!tileDoodad || tileDoodad.type !== Troposphere.INSTANCE.doodadRainbow) {
                return {
                    usable: false,
                    message: Troposphere.INSTANCE.messageNoRainbow,
                };
            }
            return {
                usable: true,
                tile,
                tileDoodad,
            };
        })
            .setHandler((action, item) => {
            const player = action.executor;
            const tile = player.facingTile;
            const tileDoodad = tile.doodad;
            player.messages.source(IMessageManager_1.Source.Action, IMessageManager_1.Source.Resource)
                .send(Troposphere.INSTANCE.messageGatheredRainbow);
            tile.createParticles({ r: 12, g: 128, b: 247 });
            item.changeInto(Troposphere.INSTANCE.itemRainbowGlassBottle);
            player.island.doodads.remove(tileDoodad);
            game.passTurn(player);
        }))
    ], Troposphere.prototype, "actionGatherRainbow", void 0);
    __decorate([
        ModRegistry_1.default.message("FlewToTroposphere")
    ], Troposphere.prototype, "messageFlewToTroposphere", void 0);
    __decorate([
        ModRegistry_1.default.message("FlewToTroposphereFailure")
    ], Troposphere.prototype, "messageFlewToTroposphereFailure", void 0);
    __decorate([
        ModRegistry_1.default.message("FlewToLand")
    ], Troposphere.prototype, "messageFlewToLand", void 0);
    __decorate([
        ModRegistry_1.default.message("FlewToLandFailure")
    ], Troposphere.prototype, "messageFlewToLandFailure", void 0);
    __decorate([
        ModRegistry_1.default.message("FellToLand")
    ], Troposphere.prototype, "messageFellToLand", void 0);
    __decorate([
        ModRegistry_1.default.message("DeathByFalling")
    ], Troposphere.prototype, "messageDeathByFalling", void 0);
    __decorate([
        ModRegistry_1.default.message("GatheredRainbow")
    ], Troposphere.prototype, "messageGatheredRainbow", void 0);
    __decorate([
        ModRegistry_1.default.message("NoRainbow")
    ], Troposphere.prototype, "messageNoRainbow", void 0);
    __decorate([
        ModRegistry_1.default.item("Nimbus", {
            use: [IAction_1.ActionType.Ride, (0, ModRegistry_1.Registry)().get("actionFlyToTroposphere"), IAction_1.ActionType.Build],
            recipe: {
                components: [
                    (0, ItemDescriptions_1.RecipeComponent)(IItem_1.ItemType.Feather, 2, 2, 2),
                    (0, ItemDescriptions_1.RecipeComponent)((0, ModRegistry_1.Registry)().get("itemCloudstone"), 1, 1, 1),
                    (0, ItemDescriptions_1.RecipeComponent)((0, ModRegistry_1.Registry)().get("itemSnowflakes"), 1, 1, 1),
                ],
                skill: (0, ModRegistry_1.Registry)().get("skillFlying"),
                level: IItem_1.RecipeLevel.Simple,
                reputation: 50,
            },
            disassemble: true,
            durability: 5000,
            vehicle: {
                type: IItem_1.VehicleType.Other,
                renderType: IItem_1.VehicleRenderType.Stand,
                movementSpeed: 4,
                movementType: IEntity_1.MoveType.Flying,
                disallowedTileMessage: Message_1.default.None,
            },
            onUse: {
                [IAction_1.ActionType.Build]: {
                    type: (0, ModRegistry_1.Registry)().get("doodadNimbus"),
                },
            },
        })
    ], Troposphere.prototype, "itemNimbus", void 0);
    __decorate([
        ModRegistry_1.default.item("Rainbow", {
            weight: 0.1,
            use: [IAction_1.ActionType.DrinkItem, IAction_1.ActionType.Build],
            onUse: {
                [IAction_1.ActionType.Build]: {
                    type: (0, ModRegistry_1.Registry)().get("doodadRainbow"),
                }
            },
        })
    ], Troposphere.prototype, "itemRainbow", void 0);
    __decorate([
        ModRegistry_1.default.item("RainbowGlassBottle", {
            weight: 1.0,
            use: [IAction_1.ActionType.DrinkItem],
            returnOnUseAndDecay: {
                type: IItem_1.ItemType.GlassBottle,
                damaged: true,
            },
        })
    ], Troposphere.prototype, "itemRainbowGlassBottle", void 0);
    __decorate([
        ModRegistry_1.default.item("Snowflakes", {
            weight: 0.1,
            decayMax: 500,
            use: [IAction_1.ActionType.DrinkItem],
            onBurn: [IItem_1.ItemType.None],
            onUse: {
                [IAction_1.ActionType.DrinkItem]: [0, 2, 0, 1],
            },
            tier: {
                [IItem_1.ItemTypeGroup.Liquid]: 1,
                [IItem_1.ItemTypeGroup.FrozenWater]: 1,
            },
            groups: [
                IItem_1.ItemTypeGroup.Liquid,
                IItem_1.ItemTypeGroup.FrozenWater,
            ],
        })
    ], Troposphere.prototype, "itemSnowflakes", void 0);
    __decorate([
        ModRegistry_1.default.item("Cloudstone", {
            weight: 1,
        })
    ], Troposphere.prototype, "itemCloudstone", void 0);
    __decorate([
        ModRegistry_1.default.itemGroup("Troposphere", {
            types: [
                (0, ModRegistry_1.Registry)().get("itemNimbus"),
                (0, ModRegistry_1.Registry)().get("itemRainbow"),
                (0, ModRegistry_1.Registry)().get("itemRainbowGlassBottle"),
                (0, ModRegistry_1.Registry)().get("itemSnowflakes"),
                (0, ModRegistry_1.Registry)().get("itemCloudstone"),
            ],
            default: (0, ModRegistry_1.Registry)().get("itemNimbus"),
        })
    ], Troposphere.prototype, "groupTroposphere", void 0);
    __decorate([
        ModRegistry_1.default.doodad("Nimbus", {
            pickUp: [(0, ModRegistry_1.Registry)().get("itemNimbus")],
            repairItem: (0, ModRegistry_1.Registry)().get("itemNimbus"),
            actionTypes: [IAction_1.ActionType.Ride],
            blockMove: true,
            canBreak: true,
            isFlammable: true,
            particles: { r: 201, g: 224, b: 228 },
            reduceDurabilityOnGather: true,
            renderAsSprite: true,
            isVehicle: true,
            isAnimated: {
                frameOffsetY: {
                    [0]: 0,
                    [1]: -0.0625,
                },
            },
        })
    ], Troposphere.prototype, "doodadNimbus", void 0);
    __decorate([
        ModRegistry_1.default.doodad("Rainbow", {
            particles: { r: 90, g: 48, b: 141 },
            blockMove: true,
            repairItem: (0, ModRegistry_1.Registry)().get("itemRainbow"),
        })
    ], Troposphere.prototype, "doodadRainbow", void 0);
    __decorate([
        ModRegistry_1.default.terrain("CloudWater", {
            passable: true,
            shallowWater: true,
            particles: { r: 55, g: 192, b: 255 },
            freshWater: true,
            noBackground: true,
            tileOnConsume: {
                [IBiome_1.BiomeType.Coastal]: (0, ModRegistry_1.Registry)().get("terrainHole"),
                [IBiome_1.BiomeType.IceCap]: (0, ModRegistry_1.Registry)().get("terrainHole"),
                [IBiome_1.BiomeType.Arid]: (0, ModRegistry_1.Registry)().get("terrainHole"),
                [IBiome_1.BiomeType.Volcanic]: (0, ModRegistry_1.Registry)().get("terrainHole"),
                [IBiome_1.BiomeType.Wetlands]: (0, ModRegistry_1.Registry)().get("terrainHole"),
            },
        })
    ], Troposphere.prototype, "terrainCloudWater", void 0);
    __decorate([
        ModRegistry_1.default.terrain("Clouds", {
            passable: true,
            particles: { r: 201, g: 224, b: 228 },
            noBackground: true,
        })
    ], Troposphere.prototype, "terrainCloud", void 0);
    __decorate([
        ModRegistry_1.default.terrain("CloudBoulder", {
            particles: { r: 201, g: 224, b: 228 },
            gatherSkillUse: IHuman_1.SkillType.Lumberjacking,
            gather: true,
            noLos: true,
            sound: IAudio_1.SfxType.TreeHit,
            leftOvers: [{ terrainType: (0, ModRegistry_1.Registry)().get("terrainCloudWater") }],
            resources: [
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
            ],
            useDoodadLikeAdaptor: true,
            background: (0, ModRegistry_1.Registry)().get("terrainCloud"),
            terrainType: (0, ModRegistry_1.Registry)().get("terrainCloudBoulder"),
        })
    ], Troposphere.prototype, "terrainCloudBoulder", void 0);
    __decorate([
        ModRegistry_1.default.terrain("Cloudstone", {
            particles: { r: 201, g: 224, b: 228 },
            gatherSkillUse: IHuman_1.SkillType.Mining,
            gather: true,
            noLos: true,
            sound: IAudio_1.SfxType.GraniteHit,
            leftOvers: [{ terrainType: (0, ModRegistry_1.Registry)().get("terrainCloud") }],
            isMountain: true,
            noBackground: true,
            resources: [
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone"), chance: 45 },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
            ],
        })
    ], Troposphere.prototype, "terrainCloudstone", void 0);
    __decorate([
        ModRegistry_1.default.terrain("Storm", {
            passable: true,
            particles: { r: 141, g: 155, b: 158 },
            noBackground: true,
        })
    ], Troposphere.prototype, "terrainStorm", void 0);
    __decorate([
        ModRegistry_1.default.terrain("StormBoulder", {
            particles: { r: 141, g: 155, b: 158 },
            gatherSkillUse: IHuman_1.SkillType.Lumberjacking,
            gather: true,
            noLos: true,
            sound: IAudio_1.SfxType.TreeHit,
            leftOvers: [{ terrainType: (0, ModRegistry_1.Registry)().get("terrainCloudWater") }],
            noBackground: true,
            resources: [
                { type: (0, ModRegistry_1.Registry)().get("itemSnowflakes"), chance: 5 },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone"), chance: 45 },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
            ],
            useDoodadLikeAdaptor: true,
            background: (0, ModRegistry_1.Registry)().get("terrainStorm"),
            terrainType: (0, ModRegistry_1.Registry)().get("terrainStormBoulder"),
        })
    ], Troposphere.prototype, "terrainStormBoulder", void 0);
    __decorate([
        ModRegistry_1.default.terrain("Stormstone", {
            particles: { r: 141, g: 155, b: 158 },
            gatherSkillUse: IHuman_1.SkillType.Mining,
            gather: true,
            noLos: true,
            sound: IAudio_1.SfxType.GraniteHit,
            leftOvers: [{ terrainType: (0, ModRegistry_1.Registry)().get("terrainStorm") }],
            isMountain: true,
            noBackground: true,
            resources: [
                { type: (0, ModRegistry_1.Registry)().get("itemSnowflakes"), chance: 5 },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
                { type: (0, ModRegistry_1.Registry)().get("itemSnowflakes"), chance: 5 },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
                { type: (0, ModRegistry_1.Registry)().get("itemSnowflakes"), chance: 5 },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
                { type: (0, ModRegistry_1.Registry)().get("itemSnowflakes"), chance: 5 },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone"), chance: 45 },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
            ],
        })
    ], Troposphere.prototype, "terrainStormstone", void 0);
    __decorate([
        ModRegistry_1.default.terrain("Hole", {
            passable: true,
            particles: { r: 255, g: 255, b: 255 },
            noBackground: true,
        })
    ], Troposphere.prototype, "terrainHole", void 0);
    __decorate([
        ModRegistry_1.default.creature("CloudBear", {
            minhp: 18,
            maxhp: 21,
            minatk: 5,
            maxatk: 13,
            defense: new IEntity_1.Defense(3)
                .setResistance(IEntity_1.DamageType.Piercing, 3)
                .setResistance(IEntity_1.DamageType.Blunt, 1),
            damageType: IEntity_1.DamageType.Slashing | IEntity_1.DamageType.Blunt,
            ai: IEntity_1.AiType.Hostile,
            moveType: IEntity_1.MoveType.Land | IEntity_1.MoveType.ShallowWater | IEntity_1.MoveType.Water | IEntity_1.MoveType.BreakDoodads,
            causesStatus: [[IEntity_1.StatusType.Bleeding, IBleeding_1.BleedLevel.Major]],
            spawnTiles: ICreature_1.TileGroup.None,
            spawn: {
                [IBiome_1.BiomeType.Coastal]: {
                    spawnsOnReputation: -16000,
                },
                [IBiome_1.BiomeType.IceCap]: {
                    spawnsOnReputation: -16000,
                },
                [IBiome_1.BiomeType.Arid]: {
                    spawnsOnReputation: -16000,
                },
            },
            reputation: 300,
            makeNoise: true,
            loot: [{
                    item: (0, ModRegistry_1.Registry)().get("itemRainbow"),
                    chance: 50,
                }],
            weight: 23.4,
            aberrantWeight: 23.4,
        }, {
            resource: [
                { item: IItem_1.ItemType.Cotton },
                { item: IItem_1.ItemType.AnimalClaw },
                { item: IItem_1.ItemType.AnimalFat },
                { item: IItem_1.ItemType.RawMeat },
                { item: IItem_1.ItemType.RawMeat },
                { item: IItem_1.ItemType.AnimalSkull },
                { item: IItem_1.ItemType.Offal },
                { item: IItem_1.ItemType.Bone },
                { item: IItem_1.ItemType.BoneFragments },
            ],
            decay: 2800,
            skill: IHuman_1.SkillType.Anatomy,
        })
    ], Troposphere.prototype, "creatureBear", void 0);
    __decorate([
        ModRegistry_1.default.creature("CloudRabbit", {
            minhp: 3,
            maxhp: 6,
            minatk: 1,
            maxatk: 2,
            defense: new IEntity_1.Defense(0),
            damageType: IEntity_1.DamageType.Slashing,
            ai: IEntity_1.AiType.Scared,
            moveType: IEntity_1.MoveType.Land | IEntity_1.MoveType.ShallowWater,
            spawnTiles: ICreature_1.TileGroup.None,
            reputation: -200,
            makeNoise: true,
            jumpOver: true,
            loot: [{ item: (0, ModRegistry_1.Registry)().get("itemSnowflakes") }],
            weight: 4.5,
            aberrantWeight: 4.6,
        }, {
            resource: [
                { item: IItem_1.ItemType.Cotton },
                { item: IItem_1.ItemType.RawMeat },
                { item: IItem_1.ItemType.Offal },
                { item: IItem_1.ItemType.BoneFragments },
            ],
            decay: 2400,
            skill: IHuman_1.SkillType.Anatomy,
        })
    ], Troposphere.prototype, "creatureRabbit", void 0);
    __decorate([
        ModRegistry_1.default.creature("Cloudling", {
            minhp: 4,
            maxhp: 9,
            minatk: 2,
            maxatk: 3,
            defense: new IEntity_1.Defense(0)
                .setResistance(IEntity_1.DamageType.Piercing, 1)
                .setVulnerability(IEntity_1.DamageType.Blunt, 1),
            damageType: IEntity_1.DamageType.Piercing,
            ai: IEntity_1.AiType.Neutral,
            moveType: IEntity_1.MoveType.Flying,
            reputation: 100,
            spawnTiles: ICreature_1.TileGroup.None,
            loot: [
                {
                    item: (0, ModRegistry_1.Registry)().get("itemSnowflakes"),
                    chance: 75,
                },
                { item: IItem_1.ItemType.Feather },
            ],
            lootGroup: LootGroups_1.LootGroupType.Low,
            weight: 3.2,
            aberrantWeight: 3.2,
        }, {
            resource: [
                { item: IItem_1.ItemType.Feather },
                { item: IItem_1.ItemType.Feather },
                { item: IItem_1.ItemType.TailFeathers, chance: 1 },
                { item: IItem_1.ItemType.RawChicken },
                { item: IItem_1.ItemType.BoneFragments },
            ],
            decay: 2400,
            skill: IHuman_1.SkillType.Anatomy,
        })
    ], Troposphere.prototype, "creatureCloudling", void 0);
    __decorate([
        ModRegistry_1.default.creature("LightningElemental", {
            minhp: 30,
            maxhp: 38,
            minatk: 11,
            maxatk: 19,
            defense: new IEntity_1.Defense(5)
                .setResistance(IEntity_1.DamageType.Fire, 100),
            damageType: IEntity_1.DamageType.Fire | IEntity_1.DamageType.Blunt,
            ai: IEntity_1.AiType.Hostile,
            moveType: IEntity_1.MoveType.Flying,
            spawnTiles: ICreature_1.TileGroup.None,
            lootGroup: LootGroups_1.LootGroupType.High,
            loot: [{ item: IItem_1.ItemType.PileOfAsh }],
            blood: { r: 141, g: 155, b: 158 },
            aberrantBlood: { r: 95, g: 107, b: 122 },
            causesStatus: [[IEntity_1.StatusType.Bleeding, IBleeding_1.BleedLevel.Major]],
            spawn: {
                [IBiome_1.BiomeType.Coastal]: {
                    spawnsOnReputation: -24000,
                },
                [IBiome_1.BiomeType.IceCap]: {
                    spawnsOnReputation: -24000,
                },
                [IBiome_1.BiomeType.Arid]: {
                    spawnsOnReputation: -24000,
                },
            },
            reputation: 300,
            makeNoise: true,
            weight: 23.4,
            aberrantWeight: 25.5,
        }, {
            resource: [{ item: IItem_1.ItemType.PileOfAsh }],
            decay: 400,
            skill: IHuman_1.SkillType.Mining,
        })
    ], Troposphere.prototype, "creatureLightningElemental", void 0);
    __decorate([
        ModRegistry_1.default.creature("Sprite", {
            minhp: 30,
            maxhp: 38,
            minatk: 11,
            maxatk: 19,
            defense: new IEntity_1.Defense(5)
                .setResistance(IEntity_1.DamageType.Fire, 100),
            damageType: IEntity_1.DamageType.Fire | IEntity_1.DamageType.Blunt,
            ai: IEntity_1.AiType.Hostile,
            moveType: IEntity_1.MoveType.Flying,
            spawnTiles: ICreature_1.TileGroup.None,
            lootGroup: LootGroups_1.LootGroupType.High,
            blood: { r: 238, g: 130, b: 134 },
            causesStatus: [[IEntity_1.StatusType.Bleeding, IBleeding_1.BleedLevel.Major]],
            spawn: {
                [IBiome_1.BiomeType.Coastal]: {
                    spawnsOnReputation: -32000,
                },
                [IBiome_1.BiomeType.IceCap]: {
                    spawnsOnReputation: -32000,
                },
                [IBiome_1.BiomeType.Arid]: {
                    spawnsOnReputation: -32000,
                },
            },
            reputation: 500,
            makeNoise: true,
            weight: 0.1,
            aberrantWeight: 0.2,
        }, {
            resource: [{ item: IItem_1.ItemType.Ectoplasm }],
            decay: 100,
        })
    ], Troposphere.prototype, "creatureSprite", void 0);
    __decorate([
        Mod_1.default.saveData("Troposphere")
    ], Troposphere.prototype, "data", void 0);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.Island, "preLoadWorld")
    ], Troposphere.prototype, "onPreLoadWorld", null);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.Island, "preLoadWorldDifferences")
    ], Troposphere.prototype, "preLoadWorldDifferences", null);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.WorldRenderer, "preRenderWorld")
    ], Troposphere.prototype, "preRenderWorld", null);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.WorldRenderer, "shouldRender")
    ], Troposphere.prototype, "shouldRender", null);
    __decorate([
        (0, EventManager_1.EventHandler)(Player_1.default, "loadedOnIsland")
    ], Troposphere.prototype, "onPlayerSpawn", null);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.Players, "preMove")
    ], Troposphere.prototype, "preMove", null);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.Players, "moveComplete")
    ], Troposphere.prototype, "onMoveComplete", null);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.CreatureManager, "shouldSpawnCreatureFromGroup")
    ], Troposphere.prototype, "shouldSpawnCreatureFromGroup", null);
    __decorate([
        (0, EventManager_1.EventHandler)(Human_1.default, "canConsumeItem")
    ], Troposphere.prototype, "canConsumeItem", null);
    __decorate([
        (0, EventManager_1.EventHandler)(Creature_1.default, "canMove")
    ], Troposphere.prototype, "canCreatureMove", null);
    __decorate([
        (0, EventManager_1.EventHandler)(Creature_1.default, "canAttack")
    ], Troposphere.prototype, "canCreatureAttack", null);
    __decorate([
        (0, EventManager_1.EventHandler)(WorldRenderer_1.default, "canSeeCreature")
    ], Troposphere.prototype, "canSeeCreature", null);
    __decorate([
        (0, EventManager_1.EventHandler)(WalkToTileHandler_1.default, "getTilePenalty")
    ], Troposphere.prototype, "getTilePenalty", null);
    __decorate([
        (0, Inject_1.Inject)(WorldRenderer_1.default, "getFogColor", Inject_1.InjectionPosition.Pre)
    ], Troposphere.prototype, "getFogColor", null);
    __decorate([
        Mod_1.default.instance("Troposphere")
    ], Troposphere, "INSTANCE", void 0);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJvcG9zcGhlcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvVHJvcG9zcGhlcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7OztHQVNHOzs7Ozs7Ozs7O0lBZ0VILE1BQXFCLFdBQVksU0FBUSxhQUFHO1FBa2pCM0MsSUFBWSxZQUFZO1lBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzFHLENBQUM7UUFFZSxrQkFBa0IsQ0FBQyxJQUF1QjtZQUN6RCxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUNWLElBQUksR0FBRztvQkFDTixPQUFPLEVBQUUsSUFBSSxHQUFHLEVBQUU7b0JBQ2xCLE9BQU8sRUFBRSxJQUFJLEdBQUcsRUFBRTtpQkFDbEIsQ0FBQzthQUNGO1lBR0QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7Z0JBQ2xCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQzthQUN6QjtZQUdELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUNsQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7YUFDekI7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFZSxNQUFNO1lBQ3JCLE1BQU0sV0FBVyxHQUFHLG1DQUFnQixDQUFDLGdCQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0QsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLEdBQUcsRUFBRTtnQkFDbkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7YUFDL0M7UUFDRixDQUFDO1FBRWUsUUFBUTtZQUN2QixNQUFNLFdBQVcsR0FBRyxtQ0FBZ0IsQ0FBQyxnQkFBUSxDQUFDLFdBQVcs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