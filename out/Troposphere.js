var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "audio/IAudio", "event/EventBuses", "event/EventManager", "game/biome/IBiome", "game/entity/action/Action", "game/entity/action/actions/ToggleVehicle", "game/entity/action/IAction", "game/entity/creature/Creature", "game/entity/creature/ICreature", "game/entity/Human", "game/entity/IEntity", "game/entity/IHuman", "game/entity/player/IMessageManager", "game/entity/player/IPlayer", "game/entity/status/handler/IBleeding", "game/item/IItem", "game/item/ItemDescriptions", "game/item/LootGroups", "game/tile/ITerrain", "game/tile/Terrains", "game/WorldZ", "language/dictionary/Message", "mod/Mod", "mod/ModRegistry", "renderer/IRenderer", "renderer/world/IWorldRenderer", "renderer/world/WorldRenderer", "ui/screen/screens/game/util/movement/WalkToTileHandler", "utilities/class/Inject", "utilities/enum/Enums", "utilities/game/TileHelpers", "utilities/math/Vector2", "utilities/math/Vector3", "utilities/random/Random"], function (require, exports, IAudio_1, EventBuses_1, EventManager_1, IBiome_1, Action_1, ToggleVehicle_1, IAction_1, Creature_1, ICreature_1, Human_1, IEntity_1, IHuman_1, IMessageManager_1, IPlayer_1, IBleeding_1, IItem_1, ItemDescriptions_1, LootGroups_1, ITerrain_1, Terrains_1, WorldZ_1, Message_1, Mod_1, ModRegistry_1, IRenderer_1, IWorldRenderer_1, WorldRenderer_1, WalkToTileHandler_1, Inject_1, Enums_1, TileHelpers_1, Vector2_1, Vector3_1, Random_1) {
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
            const seededRandom = (0, Random_1.createSeededRandom)(this.data.seed);
            for (let x = 0; x < game.mapSize; x++) {
                for (let y = 0; y < game.mapSize; y++) {
                    tile = island.setTile(x, y, this.z, island.getTile(x, y, this.z) || {});
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
        ModRegistry_1.default.action("Fly", ToggleVehicle_1.default.clone())
    ], Troposphere.prototype, "actionFly", void 0);
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
            use: [(0, ModRegistry_1.Registry)().get("actionFly"), (0, ModRegistry_1.Registry)().get("actionFlyToTroposphere"), IAction_1.ActionType.Build],
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
                type: IItem_1.VehicleType.Stand,
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
            actionTypes: [(0, ModRegistry_1.Registry)().get("actionFly")],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJvcG9zcGhlcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvVHJvcG9zcGhlcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0lBaURBLE1BQXFCLFdBQVksU0FBUSxhQUFHO1FBQTVDOztZQWtoQlEsY0FBUyxHQUFHLElBQUksQ0FBQztRQWliekIsQ0FBQztRQS9hQSxJQUFZLFlBQVk7WUFDdkIsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDMUcsQ0FBQztRQUdlLGtCQUFrQixDQUFDLElBQXVCO1lBQ3pELElBQUksSUFBSSxFQUFFO2dCQUNULElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO2dCQUN2QixPQUFPLElBQUksQ0FBQzthQUNaO1lBRUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDdEIsT0FBTztnQkFDTixJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUU7YUFDMUIsQ0FBQztRQUNILENBQUM7UUFFZSxNQUFNO1lBQ3JCLE1BQU0sV0FBVyxHQUFHLG1DQUFnQixDQUFDLGdCQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0QsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLEdBQUcsRUFBRTtnQkFDbkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7YUFDL0M7UUFDRixDQUFDO1FBRWUsUUFBUTtZQUN2QixNQUFNLFdBQVcsR0FBRyxtQ0FBZ0IsQ0FBQyxnQkFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzNELElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ25DLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDdEI7UUFDRixD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