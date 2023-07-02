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
                    const overworldTile = island.getTile(x, y, WorldZ_1.WorldZ.Overworld);
                    const terrainDescription = overworldTile.description;
                    const normalTerrainType = terrainDescription?.terrainType ?? ITerrain_1.TerrainType.Grass;
                    let createDoodad;
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
                                createDoodad = this.doodadRainbow;
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
                    const rendererData = TileBits_1.default.setTypeRaw(0, terrainType);
                    const tile = island.createTile(x, y, this.z, (this.z * island.mapSizeSq) + (y * island.mapSize) + x, rendererData, overworldTile.quality);
                    if (createDoodad !== undefined) {
                        doodadsToCreate.push({ tile, doodadType: createDoodad });
                    }
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