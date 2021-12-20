var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "audio/IAudio", "event/EventBuses", "event/EventManager", "game/biome/IBiome", "game/entity/action/Action", "game/entity/action/IAction", "game/entity/creature/Creature", "game/entity/creature/ICreature", "game/entity/Human", "game/entity/IEntity", "game/entity/IHuman", "game/entity/player/IMessageManager", "game/entity/player/IPlayer", "game/item/IItem", "game/item/Items", "game/item/LootGroups", "game/tile/ITerrain", "game/tile/Terrains", "game/WorldZ", "mod/Mod", "mod/ModRegistry", "renderer/world/IWorldRenderer", "renderer/world/WorldRenderer", "ui/screen/screens/game/util/movement/WalkToTileHandler", "utilities/class/Inject", "utilities/enum/Enums", "utilities/game/TileHelpers", "utilities/math/Vector2", "utilities/math/Vector3", "utilities/random/Random", "renderer/IRenderer"], function (require, exports, IAudio_1, EventBuses_1, EventManager_1, IBiome_1, Action_1, IAction_1, Creature_1, ICreature_1, Human_1, IEntity_1, IHuman_1, IMessageManager_1, IPlayer_1, IItem_1, Items_1, LootGroups_1, ITerrain_1, Terrains_1, WorldZ_1, Mod_1, ModRegistry_1, IWorldRenderer_1, WorldRenderer_1, WalkToTileHandler_1, Inject_1, Enums_1, TileHelpers_1, Vector2_1, Vector3_1, Random_1, IRenderer_1) {
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
            const glassBottle = Items_1.itemDescriptions[IItem_1.ItemType.GlassBottle];
            if (glassBottle && glassBottle.use) {
                glassBottle.use.push(this.actionGatherRainbow);
            }
        }
        onUnload() {
            const glassBottle = Items_1.itemDescriptions[IItem_1.ItemType.GlassBottle];
            if (glassBottle && glassBottle.use) {
                glassBottle.use.pop();
            }
        }
        setFlying(player, flying, passTurn) {
            var _a;
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
            (_a = player.vehicleItemReference) === null || _a === void 0 ? void 0 : _a.clear();
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
                        case ITerrain_1.TerrainType.Rocks:
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
            if (this.falling) {
                const turnProgress = 1 - Math.min(1, Math.max(0, (localPlayer.movementFinishTime - game.absoluteTime) / (IHuman_1.Delay.Movement * game.interval)));
                tileScale = this.easeInCubic(turnProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
                renderer === null || renderer === void 0 ? void 0 : renderer.updateRender(IRenderer_1.RenderSource.Mod, IRenderer_1.UpdateRenderFlag.World);
            }
            else {
                tileScale *= 0.25;
            }
            let position = new Vector2_1.default(localPlayer.fromX, localPlayer.fromY)
                .lerp(localPlayer, localPlayer.movementProgress);
            const scale = 16 * worldRenderer.getZoom() * 0.25;
            position = new Vector2_1.default(position)
                .multiply(scale)
                .floor()
                .divide(scale);
            worldRenderer.renderWorldLayer(worldRenderer.layers[WorldZ_1.WorldZ.Overworld], position.x, position.y, tileScale, viewWidth, viewHeight, IWorldRenderer_1.RenderFlag.Terrain, false);
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
                renderer === null || renderer === void 0 ? void 0 : renderer.fieldOfView.compute(game.absoluteTime);
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
        ModRegistry_1.default.action("Fly", new Action_1.Action(IAction_1.ActionArgument.ItemInventory)
            .setUsableBy(IEntity_1.EntityType.Player)
            .setHandler((action, item) => {
            Troposphere.INSTANCE.setFlying(action.executor, action.executor.z !== Troposphere.INSTANCE.z, true);
            item.damage(IAction_1.ActionType[action.type]);
        }))
    ], Troposphere.prototype, "actionFly", void 0);
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
            renderer === null || renderer === void 0 ? void 0 : renderer.particle.create(player.island, player.x + player.direction.x, player.y + player.direction.y, player.z, { r: 12, g: 128, b: 247 });
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
            use: [(0, ModRegistry_1.Registry)().get("actionFly")],
            recipe: {
                components: [
                    (0, Items_1.RecipeComponent)(IItem_1.ItemType.Feather, 2, 2, 2),
                    (0, Items_1.RecipeComponent)((0, ModRegistry_1.Registry)().get("itemCloudstone"), 1, 1, 1),
                    (0, Items_1.RecipeComponent)((0, ModRegistry_1.Registry)().get("itemSnowflakes"), 1, 1, 1),
                ],
                skill: (0, ModRegistry_1.Registry)().get("skillFlying"),
                level: IItem_1.RecipeLevel.Simple,
                reputation: 50,
            },
            disassemble: true,
            durability: 15,
        })
    ], Troposphere.prototype, "itemNimbus", void 0);
    __decorate([
        ModRegistry_1.default.item("Rainbow", {
            weight: 0.1,
            use: [IAction_1.ActionType.DrinkItem, IAction_1.ActionType.Build],
            onUse: {
                [IAction_1.ActionType.Build]: (0, ModRegistry_1.Registry)().get("doodadRainbow"),
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
        ModRegistry_1.default.doodad("CloudBoulder", {
            particles: { r: 201, g: 224, b: 228 },
        })
    ], Troposphere.prototype, "doodadCloudBoulder", void 0);
    __decorate([
        ModRegistry_1.default.doodad("StormBoulder", {
            particles: { r: 141, g: 155, b: 158 },
        })
    ], Troposphere.prototype, "doodadStormBoulder", void 0);
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
            tileOnConsume: (0, ModRegistry_1.Registry)().get("terrainHole"),
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
            doodad: (0, ModRegistry_1.Registry)().get("doodadCloudBoulder"),
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
            sound: IAudio_1.SfxType.RockHit,
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
            doodad: (0, ModRegistry_1.Registry)().get("doodadStormBoulder"),
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
            sound: IAudio_1.SfxType.RockHit,
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
            canCauseStatus: [IEntity_1.StatusType.Bleeding],
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
            canCauseStatus: [IEntity_1.StatusType.Bleeding],
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
            canCauseStatus: [IEntity_1.StatusType.Bleeding],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJvcG9zcGhlcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvVHJvcG9zcGhlcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0lBK0NBLE1BQXFCLFdBQVksU0FBUSxhQUFHO1FBQTVDOztZQWtmUSxjQUFTLEdBQUcsSUFBSSxDQUFDO1FBMmF6QixDQUFDO1FBemFBLElBQVksWUFBWTtZQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUMxRyxDQUFDO1FBR2Usa0JBQWtCLENBQUMsSUFBdUI7WUFDekQsSUFBSSxJQUFJLEVBQUU7Z0JBQ1QsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLE9BQU8sSUFBSSxDQUFDO2FBQ1o7WUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztZQUN0QixPQUFPO2dCQUNOLElBQUksRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRTthQUMxQixDQUFDO1FBQ0gsQ0FBQztRQUVlLE1BQU07WUFDckIsTUFBTSxXQUFXLEdBQUcsd0JBQWdCLENBQUMsZ0JBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMzRCxJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsR0FBRyxFQUFFO2dCQUNuQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQzthQUMvQztRQUNGLENBQUM7UUFFZSxRQUFRO1lBQ3ZCLE1BQU0sV0FBVyxHQUFHLHdCQUFnQixDQUFDLGdCQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0QsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLEdBQUcsRUFBRTtnQkFDbkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQzthQUN0QjtRQUNGLENB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