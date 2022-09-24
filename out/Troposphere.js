var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "audio/IAudio", "event/EventBuses", "event/EventManager", "game/biome/IBiome", "game/entity/action/Action", "game/entity/action/IAction", "game/entity/creature/Creature", "game/entity/creature/ICreature", "game/entity/Human", "game/entity/IEntity", "game/entity/IHuman", "game/entity/player/IMessageManager", "game/entity/player/IPlayer", "game/entity/status/handler/IBleeding", "game/item/IItem", "game/item/ItemDescriptions", "game/item/LootGroups", "game/tile/ITerrain", "game/tile/Terrains", "game/WorldZ", "language/dictionary/Message", "mod/Mod", "mod/ModRegistry", "renderer/IRenderer", "renderer/world/IWorldRenderer", "renderer/world/WorldRenderer", "ui/screen/screens/game/util/movement/WalkToTileHandler", "utilities/class/Inject", "utilities/enum/Enums", "utilities/game/TileHelpers", "utilities/math/Vector2", "utilities/math/Vector3", "utilities/random/Random"], function (require, exports, IAudio_1, EventBuses_1, EventManager_1, IBiome_1, Action_1, IAction_1, Creature_1, ICreature_1, Human_1, IEntity_1, IHuman_1, IMessageManager_1, IPlayer_1, IBleeding_1, IItem_1, ItemDescriptions_1, LootGroups_1, ITerrain_1, Terrains_1, WorldZ_1, Message_1, Mod_1, ModRegistry_1, IRenderer_1, IWorldRenderer_1, WorldRenderer_1, WalkToTileHandler_1, Inject_1, Enums_1, TileHelpers_1, Vector2_1, Vector3_1, Random_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Troposphere extends Mod_1.default {
        constructor() {
            super(...arguments);
            this.firstLoad = true;
        }
        get creaturePool() {
            return [this.creatureBear, this.creatureRabbit, this.creatureCloudling, this.creatureLightningElemental];
        }
        initializeSaveData(data) {
            if (data) {
                this.firstLoad = false;
                return data;
            }
            this.firstLoad = true;
            return {
                seed: new Date().getTime(),
            };
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
        setFlying(player, flying, passTurn) {
            const z = !flying ? WorldZ_1.WorldZ.Overworld : this.z;
            const openTile = TileHelpers_1.default.findMatchingTile(player.island, player, this.isFlyableTile.bind(this));
            if (openTile === undefined || player.z === WorldZ_1.WorldZ.Cave) {
                if (passTurn) {
                    player.messages.source(IMessageManager_1.Source.Action)
                        .type(IMessageManager_1.MessageType.Bad)
                        .send(flying ? this.messageFlewToTroposphereFailure : this.messageFlewToLandFailure);
                }
                return false;
            }
            player.x = openTile.x;
            player.y = openTile.y;
            player.setZ(z, false);
            player.setVehicle(undefined);
            player.skill.gain(this.skillFlying);
            player.notes.write(this.flyingNote, {
                hasHair: player.customization.hairStyle !== "None",
            });
            if (passTurn) {
                player.messages.source(IMessageManager_1.Source.Action, IMessageManager_1.Source.Item)
                    .type(IMessageManager_1.MessageType.Good)
                    .send(flying ? this.messageFlewToTroposphere : this.messageFlewToLand);
                game.passTurn(player);
            }
            return true;
        }
        isFlyableTile(island, point, tile) {
            if (tile.creature || tile.doodad) {
                return false;
            }
            const terrainType = TileHelpers_1.default.getType(tile);
            if (terrainType === this.terrainHole) {
                return false;
            }
            const terrainInfo = Terrains_1.default[terrainType];
            return (!terrainInfo || (terrainInfo.water || terrainInfo.passable)) ? true : false;
        }
        easeInCubic(time, start, change, duration) {
            time /= duration;
            return change * time * time * time + start;
        }
        onCreateWorld(island, world) {
            world.addLayer(this.z);
        }
        preLoadWorldDifferences(island, generateNewWorld) {
            const boulderChance = 0.6;
            const stormChance = 0.2;
            const rainbowChance = 0.15;
            const terrainHoleChance = 0.02;
            const creatureChance = 0.0025;
            const creatureSpriteChance = 0.0001;
            const creatureAberrantChance = 0.05;
            const creatureAberrantStormChance = 0.50;
            let tile;
            let terrainType;
            const seededRandom = (0, Random_1.createSeededRandom)(false, this.data.seed);
            for (let x = 0; x < game.mapSize; x++) {
                for (let y = 0; y < game.mapSize; y++) {
                    tile = island.setTile(x, y, this.z, island.getTileSafe(x, y, this.z) ?? {});
                    let tileGfx = 0;
                    const overworldTile = island.getTile(x, y, WorldZ_1.WorldZ.Overworld);
                    const terrainDescription = Terrains_1.default[TileHelpers_1.default.getType(overworldTile)];
                    const normalTerrainType = terrainDescription ? terrainDescription.terrainType : ITerrain_1.TerrainType.Grass;
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
                                island.doodads.create(this.doodadRainbow, x, y, this.z);
                            }
                            else {
                                terrainType = this.terrainCloudWater;
                            }
                            break;
                        default:
                            const doodad = overworldTile.doodad;
                            if (doodad && doodad.canGrow()) {
                                if (seededRandom.float() <= boulderChance) {
                                    terrainType = this.terrainCloudBoulder;
                                }
                                else {
                                    terrainType = this.terrainCloud;
                                }
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
                    if (terrainType === this.terrainCloudBoulder || terrainType === this.terrainStormBoulder) {
                        tileGfx = seededRandom.int(3);
                    }
                    tile.data = TileHelpers_1.default.setTypeRaw(tile.data, terrainType);
                    tile.data = TileHelpers_1.default.setGfxRaw(tile.data, tileGfx);
                }
            }
            for (let x = 0; x < game.mapSize; x++) {
                for (let y = 0; y < game.mapSize; y++) {
                    terrainType = TileHelpers_1.default.getType(island.getTile(x, y, this.z));
                    if (generateNewWorld) {
                        switch (terrainType) {
                            case this.terrainCloud:
                            case this.terrainStorm:
                                const chance = seededRandom.float();
                                const aberrantChance = terrainType === this.terrainCloud ? creatureAberrantChance : creatureAberrantStormChance;
                                if (chance <= creatureSpriteChance) {
                                    island.creatures.spawn(this.creatureSprite, x, y, this.z, true, seededRandom.float() <= aberrantChance);
                                }
                                else if (chance <= creatureChance) {
                                    const creatureType = this.creaturePool[seededRandom.int(this.creaturePool.length)];
                                    island.creatures.spawn(creatureType, x, y, this.z, true, seededRandom.float() <= aberrantChance);
                                }
                                break;
                        }
                    }
                }
            }
        }
        preRenderWorld(worldRenderer, tileScale, viewWidth, viewHeight) {
            if (localPlayer.z !== this.z) {
                return;
            }
            const movementProgress = localPlayer.getMovementProgress(game.absoluteTime);
            if (this.falling) {
                tileScale = this.easeInCubic(movementProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
                renderer?.updateRender(IRenderer_1.RenderSource.Mod, IRenderer_1.UpdateRenderFlag.World);
            }
            else {
                tileScale *= 0.25;
            }
            let position = new Vector2_1.default(localPlayer.fromX, localPlayer.fromY)
                .lerp(localPlayer, movementProgress);
            const scale = 16 * worldRenderer.getZoom() * 0.25;
            position = new Vector2_1.default(position)
                .multiply(scale)
                .floor()
                .divide(scale);
            const overworldLayer = worldRenderer.layers[WorldZ_1.WorldZ.Overworld];
            const { viewportBounds } = worldRenderer.getBounds(game.absoluteTime);
            overworldLayer.ensureRendered(viewportBounds);
            worldRenderer.renderWorldLayer(overworldLayer, position.x, position.y, tileScale, viewWidth, viewHeight, IWorldRenderer_1.RenderFlag.Terrain, false);
        }
        shouldRender(_) {
            if (this.falling) {
                return IWorldRenderer_1.RenderFlag.Player;
            }
            return undefined;
        }
        onGameStart(game, isLoadingSave, playedCount) {
            if ((!isLoadingSave || this.firstLoad) && !multiplayer.isConnected()) {
                localPlayer.createItemInInventory(this.itemNimbus);
            }
        }
        onPlayerJoin(manager, player) {
            if (player.island.items.getItemInContainer(player.inventory, this.itemNimbus) === undefined) {
                player.createItemInInventory(this.itemNimbus);
            }
        }
        preMove(player, fromX, fromY, fromZ, fromTile, nextX, nextY, nextZ, tile) {
            if (player.z !== this.z) {
                return;
            }
            const terrainType = TileHelpers_1.default.getType(tile);
            if (terrainType === this.terrainHole) {
                this.falling = true;
                renderer?.fieldOfView.compute(game.absoluteTime);
            }
        }
        onMoveComplete(player) {
            if (player.z !== this.z) {
                return;
            }
            if (this.falling) {
                this.falling = false;
                this.setFlying(player, false, false);
                if (player.state !== IPlayer_1.PlayerState.Ghost) {
                    let damage = -40;
                    damage *= 1 - player.skill.get(this.skillFlying) / 100;
                    const tile = player.island.getTile(player.x, player.y, player.z);
                    const terrainType = TileHelpers_1.default.getType(tile);
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
                            player.island.tileEvents.createBlood(player.x, player.y, player.z);
                        }
                    }
                }
                player.addDelay(IHuman_1.Delay.Collision, true);
                game.passTurn(player);
            }
        }
        shouldSpawnCreatureFromGroup(manager, creatureGroup, creaturePool, x, y, z) {
            if (z !== this.z) {
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
            if (tile && TileHelpers_1.default.getType(tile) === this.terrainHole) {
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
                creatureObj.nextVisibleCount = Random_1.generalRandom.intInRange(1, 6);
                return;
            }
            creatureObj.nextVisibleCount--;
            return false;
        }
        getTilePenalty(_, penalty, tile) {
            if (TileHelpers_1.default.getType(tile) === this.terrainHole) {
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
    }
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
            .setUsableBy(IEntity_1.EntityType.Player)
            .setHandler((action, item) => {
            Troposphere.INSTANCE.setFlying(action.executor, action.executor.z !== Troposphere.INSTANCE.z, true);
            item.damage(IAction_1.ActionType[action.type]);
        }))
    ], Troposphere.prototype, "actionFlyToTroposphere", void 0);
    __decorate([
        ModRegistry_1.default.action("GatherRainbow", new Action_1.Action(IAction_1.ActionArgument.ItemNearby)
            .setUsableBy(IEntity_1.EntityType.Player)
            .setHandler((action, item) => {
            const player = action.executor;
            const tile = player.getFacingTile();
            const tileDoodad = tile.doodad;
            if (!tileDoodad || tileDoodad.type !== Troposphere.INSTANCE.doodadRainbow) {
                player.messages.source(IMessageManager_1.Source.Action)
                    .send(Troposphere.INSTANCE.messageNoRainbow);
                return;
            }
            player.messages.source(IMessageManager_1.Source.Action, IMessageManager_1.Source.Resource)
                .send(Troposphere.INSTANCE.messageGatheredRainbow);
            renderers.particle.create(player.island, player.x + player.direction.x, player.y + player.direction.y, player.z, { r: 12, g: 128, b: 247 });
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
            noGfxSwitch: true,
            noBackground: true,
            useDoodadLikeAdaptor: true,
            resources: [
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
            ],
            terrainType: (0, ModRegistry_1.Registry)().get("terrainCloud"),
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
            noGfxSwitch: true,
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
            noGfxSwitch: true,
            noBackground: true,
            useDoodadLikeAdaptor: true,
            resources: [
                { type: (0, ModRegistry_1.Registry)().get("itemSnowflakes"), chance: 5 },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone"), chance: 45 },
                { type: (0, ModRegistry_1.Registry)().get("itemCloudstone") },
            ],
            terrainType: (0, ModRegistry_1.Registry)().get("terrainStorm"),
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
            noGfxSwitch: true,
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
        }, {
            resource: [{ item: IItem_1.ItemType.Ectoplasm }],
            decay: 100,
        })
    ], Troposphere.prototype, "creatureSprite", void 0);
    __decorate([
        Mod_1.default.saveData("Troposphere")
    ], Troposphere.prototype, "data", void 0);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.Island, "createWorld")
    ], Troposphere.prototype, "onCreateWorld", null);
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
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.Game, "play")
    ], Troposphere.prototype, "onGameStart", null);
    __decorate([
        (0, EventManager_1.EventHandler)(EventBuses_1.EventBus.PlayerManager, "join")
    ], Troposphere.prototype, "onPlayerJoin", null);
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
    exports.default = Troposphere;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJvcG9zcGhlcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvVHJvcG9zcGhlcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0lBZ0RBLE1BQXFCLFdBQVksU0FBUSxhQUFHO1FBQTVDOztZQWdoQlEsY0FBUyxHQUFHLElBQUksQ0FBQztRQWliekIsQ0FBQztRQS9hQSxJQUFZLFlBQVk7WUFDdkIsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDMUcsQ0FBQztRQUdlLGtCQUFrQixDQUFDLElBQXVCO1lBQ3pELElBQUksSUFBSSxFQUFFO2dCQUNULElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO2dCQUN2QixPQUFPLElBQUksQ0FBQzthQUNaO1lBRUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDdEIsT0FBTztnQkFDTixJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUU7YUFDMUIsQ0FBQztRQUNILENBQUM7UUFFZSxNQUFNO1lBQ3JCLE1BQU0sV0FBVyxHQUFHLG1DQUFnQixDQUFDLGdCQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0QsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLEdBQUcsRUFBRTtnQkFDbkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7YUFDL0M7UUFDRixDQUFDO1FBRWUsUUFBUTtZQUN2QixNQUFNLFdBQVcsR0FBRyxtQ0FBZ0IsQ0FBQyxnQkFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzNELElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ25DLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDdEI7UUFDRixD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