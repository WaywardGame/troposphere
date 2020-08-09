var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "audio/IAudio", "entity/action/Action", "entity/action/IAction", "entity/creature/Creature", "entity/creature/ICreature", "entity/Human", "entity/IEntity", "entity/IHuman", "entity/player/IMessageManager", "entity/player/IPlayer", "event/EventBuses", "event/EventManager", "game/IBiome", "game/IGame", "game/WorldZ", "item/IItem", "item/Items", "item/LootGroups", "mod/IHookHost", "mod/Mod", "mod/ModRegistry", "newui/screen/screens/game/util/movement/WalkToTileHandler", "renderer/IWorldRenderer", "renderer/WorldRenderer", "tile/ITerrain", "tile/Terrains", "utilities/enum/Enums", "utilities/Inject", "utilities/math/Vector2", "utilities/math/Vector3", "utilities/Random", "utilities/TileHelpers"], function (require, exports, IAudio_1, Action_1, IAction_1, Creature_1, ICreature_1, Human_1, IEntity_1, IHuman_1, IMessageManager_1, IPlayer_1, EventBuses_1, EventManager_1, IBiome_1, IGame_1, WorldZ_1, IItem_1, Items_1, LootGroups_1, IHookHost_1, Mod_1, ModRegistry_1, WalkToTileHandler_1, IWorldRenderer_1, WorldRenderer_1, ITerrain_1, Terrains_1, Enums_1, Inject_1, Vector2_1, Vector3_1, Random_1, TileHelpers_1) {
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
            const z = !flying ? WorldZ_1.WorldZ.Overworld : this.z;
            const openTile = TileHelpers_1.default.findMatchingTile(player, this.isFlyableTile.bind(this));
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
            player.vehicleItemId = undefined;
            player.skillGain(this.skillFlying);
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
        isFlyableTile(point, tile) {
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
        onCreateWorld(world) {
            world.addLayer(this.z);
        }
        preLoadWorldDifferences(generateNewWorld) {
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
            Random_1.default.generator.setSeed(this.data.seed);
            for (let x = 0; x < game.mapSize; x++) {
                for (let y = 0; y < game.mapSize; y++) {
                    tile = game.setTile(x, y, this.z, game.getTile(x, y, this.z) || {});
                    let tileGfx = 0;
                    const overworldTile = game.getTile(x, y, WorldZ_1.WorldZ.Overworld);
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
                            if (Random_1.default.float() <= stormChance) {
                                terrainType = this.terrainStormBoulder;
                            }
                            else {
                                terrainType = this.terrainStorm;
                            }
                            break;
                        case ITerrain_1.TerrainType.ShallowFreshWater:
                            if (Random_1.default.float() <= rainbowChance) {
                                terrainType = this.terrainCloud;
                                doodadManager.create(this.doodadRainbow, x, y, this.z);
                            }
                            else {
                                terrainType = this.terrainCloudWater;
                            }
                            break;
                        default:
                            const doodad = overworldTile.doodad;
                            if (doodad && doodad.canGrow()) {
                                if (Random_1.default.float() <= boulderChance) {
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
                        if (Random_1.default.float() <= terrainHoleChance) {
                            terrainType = this.terrainHole;
                        }
                    }
                    if (terrainType === this.terrainCloudBoulder || terrainType === this.terrainStormBoulder) {
                        tileGfx = Random_1.default.int(3);
                    }
                    tile.data = TileHelpers_1.default.setTypeRaw(tile.data, terrainType);
                    tile.data = TileHelpers_1.default.setGfxRaw(tile.data, tileGfx);
                }
            }
            for (let x = 0; x < game.mapSize; x++) {
                for (let y = 0; y < game.mapSize; y++) {
                    terrainType = TileHelpers_1.default.getType(game.getTile(x, y, this.z));
                    if (generateNewWorld) {
                        switch (terrainType) {
                            case this.terrainCloud:
                            case this.terrainStorm:
                                const chance = Random_1.default.float();
                                const aberrantChance = terrainType === this.terrainCloud ? creatureAberrantChance : creatureAberrantStormChance;
                                if (chance <= creatureSpriteChance) {
                                    creatureManager.spawn(this.creatureSprite, x, y, this.z, true, Random_1.default.float() <= aberrantChance);
                                }
                                else if (chance <= creatureChance) {
                                    const creatureType = this.creaturePool[Random_1.default.int(this.creaturePool.length)];
                                    creatureManager.spawn(creatureType, x, y, this.z, true, Random_1.default.float() <= aberrantChance);
                                }
                                break;
                        }
                    }
                }
            }
        }
        preRenderWorld(tileScale, viewWidth, viewHeight) {
            if (localPlayer.z !== this.z) {
                return;
            }
            if (this.falling) {
                const turnProgress = 1 - Math.min(1, Math.max(0, (localPlayer.movementFinishTime - game.absoluteTime) / (IHuman_1.Delay.Movement * game.interval)));
                tileScale = this.easeInCubic(turnProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
                game.updateRender(IGame_1.RenderSource.Mod, IGame_1.UpdateRenderFlag.World);
            }
            else {
                tileScale *= 0.25;
            }
            let position = new Vector2_1.default(localPlayer.fromX, localPlayer.fromY)
                .lerp(localPlayer, localPlayer.movementProgress);
            const scale = 16 * renderer.getZoom() * 0.25;
            position = new Vector2_1.default(position)
                .multiply(scale)
                .floor()
                .divide(scale);
            renderer.layers[WorldZ_1.WorldZ.Overworld].renderFullbright(position.x, position.y, tileScale, viewWidth, viewHeight, false);
        }
        shouldRender() {
            if (this.falling) {
                return IWorldRenderer_1.RenderFlag.Player;
            }
        }
        onGameStart(isLoadingSave) {
            if ((!isLoadingSave || this.firstLoad) && !multiplayer.isConnected()) {
                localPlayer.createItemInInventory(this.itemNimbus);
            }
        }
        onPlayerJoin(player) {
            if (itemManager.getItemInContainer(player.inventory, this.itemNimbus) === undefined) {
                player.createItemInInventory(this.itemNimbus);
            }
        }
        onMove(player, nextX, nextY, tile, direction) {
            if (player.z !== this.z) {
                return;
            }
            const terrainType = TileHelpers_1.default.getType(tile);
            if (terrainType === this.terrainHole) {
                this.falling = true;
                fieldOfView.compute(game.absoluteTime);
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
                    damage *= 1 - player.getSkill(this.skillFlying) / 100;
                    const tile = game.getTile(player.x, player.y, player.z);
                    const terrainType = TileHelpers_1.default.getType(tile);
                    if (terrainType === ITerrain_1.TerrainType.DeepFreshWater || terrainType === ITerrain_1.TerrainType.DeepSeawater) {
                        damage *= .5;
                    }
                    else if (terrainType === ITerrain_1.TerrainType.FreshWater || terrainType === ITerrain_1.TerrainType.Seawater) {
                        damage *= .75;
                    }
                    damage = player.damage(damage, this.messageDeathByFalling);
                    player.messages.source(IMessageManager_1.Source.Wellbeing)
                        .type(IMessageManager_1.MessageType.Bad)
                        .send(this.messageFellToLand, damage);
                    if (damage > 25 || damage > 15 && Random_1.default.chance(.5)) {
                        tileEventManager.createBlood(player.x, player.y, player.z);
                    }
                }
                player.addDelay(IHuman_1.Delay.Collision, true);
                game.passTurn(player);
            }
        }
        onSpawnCreatureFromGroup(creatureGroup, creaturePool, x, y, z) {
            if (z !== this.z) {
                return;
            }
            creaturePool.push.apply(creaturePool, this.creaturePool);
        }
        canConsumeItem(player, itemType, actionType) {
            if (itemType === this.itemRainbowGlassBottle && actionType === IAction_1.ActionType.DrinkItem) {
                player.customization = {
                    hairStyle: IHuman_1.HairStyle[Enums_1.default.getRandom(IHuman_1.HairStyle)],
                    hairColor: IHuman_1.HairColor[Enums_1.default.getRandom(IHuman_1.HairColor)],
                    skinColor: IHuman_1.SkinColor[Enums_1.default.getRandom(IHuman_1.SkinColor)],
                };
                return true;
            }
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
                creatureObj.nextVisibleCount = Random_1.default.intInRange(1, 6);
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
            if (localPlayer.z !== this.z) {
                return;
            }
            api.cancelled = true;
            const ambientLightLevel = game.getAmbientLightLevel(localPlayer.z);
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
            learnMore: ModRegistry_1.Registry().get("flyingHelpArticle"),
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
            game.particle.create(player.x + player.direction.x, player.y + player.direction.y, player.z, { r: 12, g: 128, b: 247 });
            item.changeInto(Troposphere.INSTANCE.itemRainbowGlassBottle);
            doodadManager.remove(tileDoodad);
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
            use: [ModRegistry_1.Registry().get("actionFly")],
            recipe: {
                components: [
                    Items_1.RecipeComponent(IItem_1.ItemType.Feather, 2, 2, 2),
                    Items_1.RecipeComponent(ModRegistry_1.Registry().get("itemCloudstone"), 1, 1, 1),
                    Items_1.RecipeComponent(ModRegistry_1.Registry().get("itemSnowflakes"), 1, 1, 1),
                ],
                skill: ModRegistry_1.Registry().get("skillFlying"),
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
                [IAction_1.ActionType.Build]: ModRegistry_1.Registry().get("doodadRainbow"),
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
                ModRegistry_1.Registry().get("itemNimbus"),
                ModRegistry_1.Registry().get("itemRainbow"),
                ModRegistry_1.Registry().get("itemRainbowGlassBottle"),
                ModRegistry_1.Registry().get("itemSnowflakes"),
                ModRegistry_1.Registry().get("itemCloudstone"),
            ],
            default: ModRegistry_1.Registry().get("itemNimbus"),
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
            tileOnConsume: ModRegistry_1.Registry().get("terrainHole"),
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
            leftOvers: [{ terrainType: ModRegistry_1.Registry().get("terrainCloudWater") }],
            noGfxSwitch: true,
            noBackground: true,
            doodad: ModRegistry_1.Registry().get("doodadCloudBoulder"),
            resources: [
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
            ],
            terrainType: ModRegistry_1.Registry().get("terrainCloud"),
        })
    ], Troposphere.prototype, "terrainCloudBoulder", void 0);
    __decorate([
        ModRegistry_1.default.terrain("Cloudstone", {
            particles: { r: 201, g: 224, b: 228 },
            gatherSkillUse: IHuman_1.SkillType.Mining,
            gather: true,
            noLos: true,
            sound: IAudio_1.SfxType.RockHit,
            leftOvers: [{ terrainType: ModRegistry_1.Registry().get("terrainCloud") }],
            noGfxSwitch: true,
            isMountain: true,
            noBackground: true,
            resources: [
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone"), chance: 45 },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
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
            leftOvers: [{ terrainType: ModRegistry_1.Registry().get("terrainCloudWater") }],
            noGfxSwitch: true,
            noBackground: true,
            doodad: ModRegistry_1.Registry().get("doodadStormBoulder"),
            resources: [
                { type: ModRegistry_1.Registry().get("itemSnowflakes"), chance: 5 },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone"), chance: 45 },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
            ],
            terrainType: ModRegistry_1.Registry().get("terrainStorm"),
        })
    ], Troposphere.prototype, "terrainStormBoulder", void 0);
    __decorate([
        ModRegistry_1.default.terrain("Stormstone", {
            particles: { r: 141, g: 155, b: 158 },
            gatherSkillUse: IHuman_1.SkillType.Mining,
            gather: true,
            noLos: true,
            sound: IAudio_1.SfxType.RockHit,
            leftOvers: [{ terrainType: ModRegistry_1.Registry().get("terrainStorm") }],
            noGfxSwitch: true,
            isMountain: true,
            noBackground: true,
            resources: [
                { type: ModRegistry_1.Registry().get("itemSnowflakes"), chance: 5 },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemSnowflakes"), chance: 5 },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemSnowflakes"), chance: 5 },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemSnowflakes"), chance: 5 },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone"), chance: 45 },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
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
            defense: new IEntity_1.Defense(3, new IEntity_1.Resistances(IEntity_1.DamageType.Piercing, 3, IEntity_1.DamageType.Blunt, 1), new IEntity_1.Vulnerabilities()),
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
                    item: ModRegistry_1.Registry().get("itemRainbow"),
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
            defense: new IEntity_1.Defense(0, new IEntity_1.Resistances(), new IEntity_1.Vulnerabilities()),
            damageType: IEntity_1.DamageType.Slashing,
            ai: IEntity_1.AiType.Scared,
            moveType: IEntity_1.MoveType.Land | IEntity_1.MoveType.ShallowWater,
            spawnTiles: ICreature_1.TileGroup.None,
            reputation: -200,
            makeNoise: true,
            jumpOver: true,
            loot: [{ item: ModRegistry_1.Registry().get("itemSnowflakes") }],
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
            defense: new IEntity_1.Defense(0, new IEntity_1.Resistances(IEntity_1.DamageType.Piercing, 1), new IEntity_1.Vulnerabilities(IEntity_1.DamageType.Blunt, 1)),
            damageType: IEntity_1.DamageType.Piercing,
            ai: IEntity_1.AiType.Neutral,
            moveType: IEntity_1.MoveType.Flying,
            reputation: 100,
            spawnTiles: ICreature_1.TileGroup.None,
            loot: [
                {
                    item: ModRegistry_1.Registry().get("itemSnowflakes"),
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
            defense: new IEntity_1.Defense(5, new IEntity_1.Resistances(IEntity_1.DamageType.Fire, 100), new IEntity_1.Vulnerabilities()),
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
            defense: new IEntity_1.Defense(5, new IEntity_1.Resistances(IEntity_1.DamageType.Fire, 100), new IEntity_1.Vulnerabilities()),
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
        Override
    ], Troposphere.prototype, "initializeSaveData", null);
    __decorate([
        Override
    ], Troposphere.prototype, "onLoad", null);
    __decorate([
        Override
    ], Troposphere.prototype, "onUnload", null);
    __decorate([
        Override,
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "onCreateWorld", null);
    __decorate([
        Override,
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "preLoadWorldDifferences", null);
    __decorate([
        Override,
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "preRenderWorld", null);
    __decorate([
        Override,
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "shouldRender", null);
    __decorate([
        Override,
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "onGameStart", null);
    __decorate([
        Override,
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "onPlayerJoin", null);
    __decorate([
        Override,
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "onMove", null);
    __decorate([
        EventManager_1.EventHandler(EventBuses_1.EventBus.Players, "moveComplete")
    ], Troposphere.prototype, "onMoveComplete", null);
    __decorate([
        Override,
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "onSpawnCreatureFromGroup", null);
    __decorate([
        EventManager_1.EventHandler(Human_1.default, "canConsumeItem")
    ], Troposphere.prototype, "canConsumeItem", null);
    __decorate([
        EventManager_1.EventHandler(Creature_1.default, "canMove")
    ], Troposphere.prototype, "canCreatureMove", null);
    __decorate([
        EventManager_1.EventHandler(Creature_1.default, "canAttack")
    ], Troposphere.prototype, "canCreatureAttack", null);
    __decorate([
        EventManager_1.EventHandler(WorldRenderer_1.default, "canSeeCreature")
    ], Troposphere.prototype, "canSeeCreature", null);
    __decorate([
        EventManager_1.EventHandler(WalkToTileHandler_1.default, "getTilePenalty")
    ], Troposphere.prototype, "getTilePenalty", null);
    __decorate([
        Inject_1.Inject(WorldRenderer_1.default, "getFogColor", Inject_1.InjectionPosition.Pre)
    ], Troposphere.prototype, "getFogColor", null);
    __decorate([
        Mod_1.default.instance("Troposphere")
    ], Troposphere, "INSTANCE", void 0);
    exports.default = Troposphere;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJvcG9zcGhlcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9Ucm9wb3NwaGVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7SUE2Q0EsTUFBcUIsV0FBWSxTQUFRLGFBQUc7UUFBNUM7O1lBc2dCUSxjQUFTLEdBQUcsSUFBSSxDQUFDO1FBeWF6QixDQUFDO1FBdmFBLElBQVksWUFBWTtZQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUMxRyxDQUFDO1FBSU0sa0JBQWtCLENBQUMsSUFBdUI7WUFDaEQsSUFBSSxJQUFJLEVBQUU7Z0JBQ1QsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLE9BQU8sSUFBSSxDQUFDO2FBQ1o7WUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztZQUN0QixPQUFPO2dCQUNOLElBQUksRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRTthQUMxQixDQUFDO1FBQ0gsQ0FBQztRQUdNLE1BQU07WUFDWixNQUFNLFdBQVcsR0FBRyx3QkFBZ0IsQ0FBQyxnQkFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzNELElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ25DLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2FBQy9DO1FBQ0YsQ0FBQztRQUdNLFFBQVE7WUFDZCxNQUFNLFdBQVcsR0FBRyx3QkFBZ0IsQ0FBQyxnQkFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzNELElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ25DLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDdEI7UUFDRixDQUFDO1FB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