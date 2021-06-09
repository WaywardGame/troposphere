var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "audio/IAudio", "event/EventBuses", "event/EventManager", "game/biome/IBiome", "game/entity/action/Action", "game/entity/action/IAction", "game/entity/creature/Creature", "game/entity/creature/ICreature", "game/entity/Human", "game/entity/IEntity", "game/entity/IHuman", "game/entity/player/IMessageManager", "game/entity/player/IPlayer", "game/IGame", "game/item/IItem", "game/item/Items", "game/item/LootGroups", "game/tile/ITerrain", "game/tile/Terrains", "game/WorldZ", "mod/IHookHost", "mod/Mod", "mod/ModRegistry", "renderer/IWorldRenderer", "renderer/WorldRenderer", "ui/screen/screens/game/util/movement/WalkToTileHandler", "utilities/class/Inject", "utilities/enum/Enums", "utilities/game/TileHelpers", "utilities/math/Vector2", "utilities/math/Vector3", "utilities/random/Random"], function (require, exports, IAudio_1, EventBuses_1, EventManager_1, IBiome_1, Action_1, IAction_1, Creature_1, ICreature_1, Human_1, IEntity_1, IHuman_1, IMessageManager_1, IPlayer_1, IGame_1, IItem_1, Items_1, LootGroups_1, ITerrain_1, Terrains_1, WorldZ_1, IHookHost_1, Mod_1, ModRegistry_1, IWorldRenderer_1, WorldRenderer_1, WalkToTileHandler_1, Inject_1, Enums_1, TileHelpers_1, Vector2_1, Vector3_1, Random_1) {
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
            renderer.renderWorldLayer(renderer.layers[WorldZ_1.WorldZ.Overworld], position.x, position.y, tileScale, viewWidth, viewHeight, IWorldRenderer_1.RenderFlag.Terrain, false);
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
                    damage *= 1 - player.skill.get(this.skillFlying) / 100;
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
            defense: new IEntity_1.Defense(0),
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
        Override
    ], Troposphere.prototype, "initializeSaveData", null);
    __decorate([
        Override
    ], Troposphere.prototype, "onLoad", null);
    __decorate([
        Override
    ], Troposphere.prototype, "onUnload", null);
    __decorate([
        Override, IHookHost_1.HookMethod
    ], Troposphere.prototype, "onCreateWorld", null);
    __decorate([
        Override, IHookHost_1.HookMethod
    ], Troposphere.prototype, "preLoadWorldDifferences", null);
    __decorate([
        Override, IHookHost_1.HookMethod
    ], Troposphere.prototype, "preRenderWorld", null);
    __decorate([
        Override, IHookHost_1.HookMethod
    ], Troposphere.prototype, "shouldRender", null);
    __decorate([
        Override, IHookHost_1.HookMethod
    ], Troposphere.prototype, "onGameStart", null);
    __decorate([
        Override, IHookHost_1.HookMethod
    ], Troposphere.prototype, "onPlayerJoin", null);
    __decorate([
        Override, IHookHost_1.HookMethod
    ], Troposphere.prototype, "onMove", null);
    __decorate([
        EventManager_1.EventHandler(EventBuses_1.EventBus.Players, "moveComplete")
    ], Troposphere.prototype, "onMoveComplete", null);
    __decorate([
        Override, IHookHost_1.HookMethod
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJvcG9zcGhlcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9Ucm9wb3NwaGVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7SUE2Q0EsTUFBcUIsV0FBWSxTQUFRLGFBQUc7UUFBNUM7O1lBa2ZRLGNBQVMsR0FBRyxJQUFJLENBQUM7UUF5YXpCLENBQUM7UUF2YUEsSUFBWSxZQUFZO1lBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzFHLENBQUM7UUFJTSxrQkFBa0IsQ0FBQyxJQUF1QjtZQUNoRCxJQUFJLElBQUksRUFBRTtnQkFDVCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztnQkFDdkIsT0FBTyxJQUFJLENBQUM7YUFDWjtZQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLE9BQU87Z0JBQ04sSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFO2FBQzFCLENBQUM7UUFDSCxDQUFDO1FBR00sTUFBTTtZQUNaLE1BQU0sV0FBVyxHQUFHLHdCQUFnQixDQUFDLGdCQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0QsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLEdBQUcsRUFBRTtnQkFDbkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7YUFDL0M7UUFDRixDQUFDO1FBR00sUUFBUTtZQUNkLE1BQU0sV0FBVyxHQUFHLHdCQUFnQixDQUFDLGdCQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0QsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLEdBQUcsRUFBRTtnQkFDbkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQzthQUN0QjtRQUNGLENBQUM7UUFFTSxTQUFTLENBQUMsTUFBYyxFQUFFLE1BQWUsRUFBRSxRQUFpQjtZQUNsRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsZUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUU5QyxNQUFNLFFBQVEsR0FBRyxxQkFBVyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3JGLElBQUksUUFBUSxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxLQUFLLGVBQU0sQ0FBQyxJQUFJLEVBQUU7Z0JBQ3ZELElBQUksUUFBUSxFQUFFO29CQUNiLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLHdCQUFNLENBQUMsTUFBTSxDQUFDO3lCQUNuQyxJQUFJLENBQUMsNkJBQVcsQ0FBQyxHQUFHLENBQUM7eUJBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7aUJBQ3RGO2dCQUVELE9BQU8sS0FBSyxDQUFDO2FBQ2I7WUFFRCxNQUFNLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdEIsTUFBTSxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRXRCLE1BQU0sQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFDO1lBRWpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUVwQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNuQyxPQUFPLEVBQUUsTUFBTSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEtBQUssTUFBTTthQUNsRCxDQUFDLENBQUM7WUFFSCxJQUFJLFFBQVEsRUFBRTtnQkFDYixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyx3QkFBTSxDQUFDLE1BQU0sRUFBRSx3QkFBTSxDQUFDLElBQUksQ0FBQztxQkFDaEQsSUFBSSxDQUFDLDZCQUFXLENBQUMsSUFBSSxDQUFDO3FCQUN0QixJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUV4RSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3RCO1lBRUQsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRU0sYUFBYSxDQUFDLEtBQWUsRUFBRSxJQUFXO1lBQ2hELElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNqQyxPQUFPLEtBQUssQ0FBQzthQUNiO1lBRUQsTUFBTSxXQUFXLEdBQUcscUJBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUMsSUFBSSxXQUFXLEtBQUssSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDckMsT0FBTyxLQUFLLENBQUM7YUFDYjtZQUVELE1BQU0sV0FBVyxHQUFHLGtCQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFMUMsT0FBTyxDQUFDLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDckYsQ0FBQztRQUVNLFdBQVcsQ0FBQyxJQUFZLEVBQUUsS0FBYSxFQUFFLE1BQWMsRUFBRSxRQUFnQjtZQUMvRSxJQUFJLElBQUksUUFBUSxDQUFDO1lBQ2pCLE9BQU8sTUFBTSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQztRQUM1QyxDQUFDO1FBTU0sYUFBYSxDQUFDLEtBQWE7WUFDakMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsQ0FBQztRQUdNLHVCQUF1QixDQUFDLGdCQUF5QjtZQUV2RCxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUM7WUFDMUIsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDO1lBQ3hCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQztZQUUzQixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUUvQixNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUM7WUFDOUIsTUFBTSxvQkFBb0IsR0FBRyxNQUFNLENBQUM7WUFDcEMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUM7WUFDcEMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUM7WUFFekMsSUFBSSxJQUFXLENBQUM7WUFDaEIsSUFBSSxXQUFtQixDQUFDO1lBRXhCLGdCQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXpDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUN0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDdEMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBVyxDQUFDLENBQUM7b0JBRTdFLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztvQkFDaEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLGVBQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDM0QsTUFBTSxrQkFBa0IsR0FBRyxrQkFBUSxDQUFDLHFCQUFXLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7b0JBQ3hFLE1BQU0saUJBQWlCLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsc0JBQVcsQ0FBQyxLQUFLLENBQUM7b0JBRWxHLFFBQVEsaUJBQWlCLEVBQUU7d0JBQzFCLEtBQUssc0JBQVcsQ0FBQyxLQUFLLENBQUM7d0JBQ3ZCLEtBQUssc0JBQVcsQ0FBQyxTQUFTOzRCQUN6QixXQUFXLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDOzRCQUNyQyxNQUFNO3dCQUVQLEtBQUssc0JBQVcsQ0FBQyxZQUFZLENBQUM7d0JBQzlCLEtBQUssc0JBQVcsQ0FBQyxjQUFjOzRCQUM5QixXQUFXLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDOzRCQUNyQyxNQUFNO3dCQUVQLEtBQUssc0JBQVcsQ0FBQyxRQUFRLENBQUM7d0JBQzFCLEtBQUssc0JBQVcsQ0FBQyxVQUFVLENBQUM7d0JBQzVCLEtBQUssc0JBQVcsQ0FBQyxlQUFlOzRCQUMvQixJQUFJLGdCQUFNLENBQUMsS0FBSyxFQUFFLElBQUksV0FBVyxFQUFFO2dDQUNsQyxXQUFXLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDOzZCQUV2QztpQ0FBTTtnQ0FDTixXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQzs2QkFDaEM7NEJBRUQsTUFBTTt3QkFFUCxLQUFLLHNCQUFXLENBQUMsaUJBQWlCOzRCQUNqQyxJQUFJLGdCQUFNLENBQUMsS0FBSyxFQUFFLElBQUksYUFBYSxFQUFFO2dDQUNwQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztnQ0FDaEMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOzZCQUV2RDtpQ0FBTTtnQ0FDTixXQUFXLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDOzZCQUNyQzs0QkFFRCxNQUFNO3dCQUVQOzRCQUNDLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUM7NEJBQ3BDLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQ0FDL0IsSUFBSSxnQkFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLGFBQWEsRUFBRTtvQ0FDcEMsV0FBVyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztpQ0FFdkM7cUNBQU07b0NBQ04sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7aUNBQ2hDOzZCQUVEO2lDQUFNO2dDQUNOLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDOzZCQUNoQzs0QkFFRCxNQUFNO3FCQUNQO29CQUVELElBQUksV0FBVyxLQUFLLElBQUksQ0FBQyxZQUFZLElBQUksV0FBVyxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUU7d0JBQzNFLElBQUksZ0JBQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxpQkFBaUIsRUFBRTs0QkFDeEMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7eUJBQy9CO3FCQUNEO29CQUVELElBQUksV0FBVyxLQUFLLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxXQUFXLEtBQUssSUFBSSxDQUFDLG1CQUFtQixFQUFFO3dCQUN6RixPQUFPLEdBQUcsZ0JBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQ3hCO29CQUVELElBQUksQ0FBQyxJQUFJLEdBQUcscUJBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztvQkFDM0QsSUFBSSxDQUFDLElBQUksR0FBRyxxQkFBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUN0RDthQUNEO1lBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUN0QyxXQUFXLEdBQUcscUJBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUU5RCxJQUFJLGdCQUFnQixFQUFFO3dCQUNyQixRQUFRLFdBQVcsRUFBRTs0QkFDcEIsS0FBSyxJQUFJLENBQUMsWUFBWSxDQUFDOzRCQUN2QixLQUFLLElBQUksQ0FBQyxZQUFZO2dDQUNyQixNQUFNLE1BQU0sR0FBRyxnQkFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO2dDQUM5QixNQUFNLGNBQWMsR0FBRyxXQUFXLEtBQUssSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDO2dDQUNoSCxJQUFJLE1BQU0sSUFBSSxvQkFBb0IsRUFBRTtvQ0FDbkMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxjQUFjLENBQUMsQ0FBQztpQ0FFakc7cUNBQU0sSUFBSSxNQUFNLElBQUksY0FBYyxFQUFFO29DQUNwQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztvQ0FDN0UsZUFBZSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxnQkFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLGNBQWMsQ0FBQyxDQUFDO2lDQUMxRjtnQ0FFRCxNQUFNO3lCQUNQO3FCQUNEO2lCQUNEO2FBQ0Q7UUFDRixDQUFDO1FBR00sY0FBYyxDQUFDLFNBQWlCLEVBQUUsU0FBaUIsRUFBRSxVQUFrQjtZQUM3RSxJQUFJLFdBQVcsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsRUFBRTtnQkFDN0IsT0FBTzthQUNQO1lBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUNqQixNQUFNLFlBQVksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsY0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzSSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsU0FBUyxHQUFHLElBQUksRUFBRSxTQUFTLEdBQUcsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNwRixJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFZLENBQUMsR0FBRyxFQUFFLHdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO2FBRTVEO2lCQUFNO2dCQUNOLFNBQVMsSUFBSSxJQUFJLENBQUM7YUFDbEI7WUFFRCxJQUFJLFFBQVEsR0FBRyxJQUFJLGlCQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDO2lCQUM5RCxJQUFJLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBRWxELE1BQU0sS0FBSyxHQUFHLEVBQUUsR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBQzdDLFFBQVEsR0FBRyxJQUFJLGlCQUFPLENBQUMsUUFBUSxDQUFDO2lCQUM5QixRQUFRLENBQUMsS0FBSyxDQUFDO2lCQUNmLEtBQUssRUFBRTtpQkFDUCxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFaEIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsZUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSwyQkFBVSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuSixDQUFDO1FBR00sWUFBWTtZQUNsQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7Z0JBQ2pCLE9BQU8sMkJBQVUsQ0FBQyxNQUFNLENBQUM7YUFDekI7UUFDRixDQUFDO1FBR00sV0FBVyxDQUFDLGFBQXNCO1lBQ3hDLElBQUksQ0FBQyxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBRXJFLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDbkQ7UUFDRixDQUFDO1FBR00sWUFBWSxDQUFDLE1BQWM7WUFDakMsSUFBSSxXQUFXLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssU0FBUyxFQUFFO2dCQUVwRixNQUFNLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQzlDO1FBQ0YsQ0FBQztRQUdNLE1BQU0sQ0FBQyxNQUFjLEVBQUUsS0FBYSxFQUFFLEtBQWEsRUFBRSxJQUFXLEVBQUUsU0FBb0I7WUFDNUYsSUFBSSxNQUFNLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEVBQUU7Z0JBQ3hCLE9BQU87YUFDUDtZQUVELE1BQU0sV0FBVyxHQUFHLHFCQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLElBQUksV0FBVyxLQUFLLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQU1wQixXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUN2QztRQUNGLENBQUM7UUFHTSxjQUFjLENBQUMsTUFBYztZQUNuQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsRUFBRTtnQkFDeEIsT0FBTzthQUNQO1lBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztnQkFDckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUVyQyxJQUFJLE1BQU0sQ0FBQyxLQUFLLEtBQUsscUJBQVcsQ0FBQyxLQUFLLEVBQUU7b0JBQ3ZDLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUVqQixNQUFNLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUM7b0JBRXZELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDeEQsTUFBTSxXQUFXLEdBQUcscUJBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBRTlDLElBQUksV0FBVyxLQUFLLHNCQUFXLENBQUMsY0FBYyxJQUFJLFdBQVcsS0FBSyxzQkFBVyxDQUFDLFlBQVksRUFBRTt3QkFDM0YsTUFBTSxJQUFJLEVBQUUsQ0FBQztxQkFFYjt5QkFBTSxJQUFJLFdBQVcsS0FBSyxzQkFBVyxDQUFDLFVBQVUsSUFBSSxXQUFXLEtBQUssc0JBQVcsQ0FBQyxRQUFRLEVBQUU7d0JBQzFGLE1BQU0sSUFBSSxHQUFHLENBQUM7cUJBQ2Q7b0JBRUQsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO29CQUczRCxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyx3QkFBTSxDQUFDLFNBQVMsQ0FBQzt5QkFDdEMsSUFBSSxDQUFDLDZCQUFXLENBQUMsR0FBRyxDQUFDO3lCQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUV2QyxJQUFJLE1BQU0sR0FBRyxFQUFFLElBQUksTUFBTSxHQUFHLEVBQUUsSUFBSSxnQkFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRTt3QkFDcEQsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQzNEO2lCQUNEO2dCQUVELE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUN0QjtRQUNGLENBQUM7UUFHTSx3QkFBd0IsQ0FBQyxhQUF5QixFQUFFLFlBQTRCLEVBQUUsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTO1lBQ3ZILElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEVBQUU7Z0JBQ2pCLE9BQU87YUFDUDtZQUVELFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDMUQsQ0FBQztRQU9TLGNBQWMsQ0FBQyxNQUFjLEVBQUUsUUFBa0IsRUFBRSxVQUFzQjtZQUNsRixJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsc0JBQXNCLElBQUksVUFBVSxLQUFLLG9CQUFVLENBQUMsU0FBUyxFQUFFO2dCQUNwRixNQUFNLENBQUMsYUFBYSxHQUFHO29CQUN0QixTQUFTLEVBQUUsa0JBQVMsQ0FBQyxlQUFLLENBQUMsU0FBUyxDQUFDLGtCQUFTLENBQUMsQ0FBMkI7b0JBQzFFLFNBQVMsRUFBRSxrQkFBUyxDQUFDLGVBQUssQ0FBQyxTQUFTLENBQUMsa0JBQVMsQ0FBQyxDQUEyQjtvQkFDMUUsU0FBUyxFQUFFLGtCQUFTLENBQUMsZUFBSyxDQUFDLFNBQVMsQ0FBQyxrQkFBUyxDQUFDLENBQTJCO2lCQUMxRSxDQUFDO2dCQUNGLE9BQU8sSUFBSSxDQUFDO2FBQ1o7UUFDRixDQUFDO1FBR1MsZUFBZSxDQUFDLFFBQWtCLEVBQUUsSUFBWTtZQUN6RCxJQUFJLElBQUksSUFBSSxxQkFBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUMzRCxPQUFPLFFBQVEsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFlBQVksSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUM7YUFDcEY7UUFDRixDQUFDO1FBR1MsaUJBQWlCLENBQUMsUUFBa0IsRUFBRSxLQUF3QjtZQUN2RSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDMUMsT0FBTzthQUNQO1lBRUQsTUFBTSxXQUFXLEdBQUcsUUFBZSxDQUFDO1lBQ3BDLFdBQVcsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ2pDLENBQUM7UUFHUyxjQUFjLENBQUMsQ0FBTSxFQUFFLFFBQWtCLEVBQUUsSUFBVztZQUMvRCxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDMUMsT0FBTzthQUNQO1lBRUQsTUFBTSxXQUFXLEdBQUcsUUFBZSxDQUFDO1lBRXBDLElBQUksV0FBVyxDQUFDLFlBQVksRUFBRTtnQkFDN0IsV0FBVyxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUM7Z0JBQ3JDLE9BQU87YUFDUDtZQUVELElBQUksV0FBVyxDQUFDLGdCQUFnQixLQUFLLFNBQVMsSUFBSSxXQUFXLENBQUMsZ0JBQWdCLEtBQUssQ0FBQyxFQUFFO2dCQUNyRixXQUFXLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN2RCxPQUFPO2FBQ1A7WUFFRCxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUUvQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFHUyxjQUFjLENBQUMsQ0FBTSxFQUFFLE9BQWUsRUFBRSxJQUFXO1lBQzVELElBQUkscUJBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDbkQsT0FBTyxJQUFJLElBQUksQ0FBQzthQUNoQjtZQUVELE9BQU8sT0FBTyxDQUFDO1FBQ2hCLENBQUM7UUFPUyxXQUFXLENBQUMsR0FBZ0Q7WUFDckUsSUFBSSxXQUFXLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEVBQUU7Z0JBQzdCLE9BQU87YUFDUDtZQUVELEdBQUcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBRXJCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRSxNQUFNLGlCQUFpQixHQUFHLElBQUksaUJBQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1lBQ3JGLElBQUksaUJBQWlCLEdBQUcsR0FBRyxFQUFFO2dCQUM1QixHQUFHLENBQUMsV0FBVyxHQUFHLGlCQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLGlCQUFPLENBQUMsR0FBRyxFQUFFLGlCQUFpQixHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7YUFFN0Y7aUJBQU07Z0JBQ04sR0FBRyxDQUFDLFdBQVcsR0FBRyxpQkFBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBTyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7YUFDMUY7UUFDRixDQUFDO0tBQ0Q7SUFyNUJBO1FBREMscUJBQVEsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDOzBDQUNUO0lBTzFCO1FBREMscUJBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO29EQUNLO0lBTTlCO1FBSkMscUJBQVEsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFO1lBQy9CLEtBQUssRUFBRSxJQUFJO1lBQ1gsT0FBTyxFQUFFLGFBQWE7U0FDdEIsQ0FBQzswREFDNkM7SUFLL0M7UUFIQyxxQkFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDeEIsU0FBUyxFQUFFLHNCQUFRLEVBQWUsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUM7U0FDM0QsQ0FBQzttREFDK0I7SUFZakM7UUFOQyxxQkFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxlQUFNLENBQUMsd0JBQWMsQ0FBQyxhQUFhLENBQUM7YUFDOUQsV0FBVyxDQUFDLG9CQUFVLENBQUMsTUFBTSxDQUFDO2FBQzlCLFVBQVUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUM1QixXQUFXLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3BHLElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN0QyxDQUFDLENBQUMsQ0FBQztrREFDa0M7SUEwQnRDO1FBeEJDLHFCQUFRLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxJQUFJLGVBQU0sQ0FBQyx3QkFBYyxDQUFDLFVBQVUsQ0FBQzthQUNyRSxXQUFXLENBQUMsb0JBQVUsQ0FBQyxNQUFNLENBQUM7YUFDOUIsVUFBVSxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQzVCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7WUFFL0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDL0IsSUFBSSxDQUFDLFVBQVUsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFO2dCQUMxRSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyx3QkFBTSxDQUFDLE1BQU0sQ0FBQztxQkFDbkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDOUMsT0FBTzthQUNQO1lBRUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsd0JBQU0sQ0FBQyxNQUFNLEVBQUUsd0JBQU0sQ0FBQyxRQUFRLENBQUM7aUJBQ3BELElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFFcEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFeEgsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFFN0QsYUFBYSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUVqQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDOzREQUM0QztJQU9oRDtRQURDLHFCQUFRLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDO2lFQUNZO0lBR2xEO1FBREMscUJBQVEsQ0FBQyxPQUFPLENBQUMsMEJBQTBCLENBQUM7d0VBQ1k7SUFHekQ7UUFEQyxxQkFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7MERBQ1k7SUFHM0M7UUFEQyxxQkFBUSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztpRUFDWTtJQUdsRDtRQURDLHFCQUFRLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQzswREFDWTtJQUczQztRQURDLHFCQUFRLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDOzhEQUNZO0lBRy9DO1FBREMscUJBQVEsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUM7K0RBQ1k7SUFHaEQ7UUFEQyxxQkFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7eURBQ1k7SUFxQjFDO1FBZkMscUJBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ3hCLEdBQUcsRUFBRSxDQUFDLHNCQUFRLEVBQWUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDL0MsTUFBTSxFQUFFO2dCQUNQLFVBQVUsRUFBRTtvQkFDWCx1QkFBZSxDQUFDLGdCQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUMxQyx1QkFBZSxDQUFDLHNCQUFRLEVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDdkUsdUJBQWUsQ0FBQyxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQ3ZFO2dCQUNELEtBQUssRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQztnQkFDakQsS0FBSyxFQUFFLG1CQUFXLENBQUMsTUFBTTtnQkFDekIsVUFBVSxFQUFFLEVBQUU7YUFDZDtZQUNELFdBQVcsRUFBRSxJQUFJO1lBQ2pCLFVBQVUsRUFBRSxFQUFFO1NBQ2QsQ0FBQzttREFDMEI7SUFTNUI7UUFQQyxxQkFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDekIsTUFBTSxFQUFFLEdBQUc7WUFDWCxHQUFHLEVBQUUsQ0FBQyxvQkFBVSxDQUFDLFNBQVMsRUFBRSxvQkFBVSxDQUFDLEtBQUssQ0FBQztZQUM3QyxLQUFLLEVBQUU7Z0JBQ04sQ0FBQyxvQkFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLHNCQUFRLEVBQWUsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDO2FBQ2hFO1NBQ0QsQ0FBQztvREFDMkI7SUFVN0I7UUFSQyxxQkFBUSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtZQUNwQyxNQUFNLEVBQUUsR0FBRztZQUNYLEdBQUcsRUFBRSxDQUFDLG9CQUFVLENBQUMsU0FBUyxDQUFDO1lBQzNCLG1CQUFtQixFQUFFO2dCQUNwQixJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxXQUFXO2dCQUMxQixPQUFPLEVBQUUsSUFBSTthQUNiO1NBQ0QsQ0FBQzsrREFDc0M7SUFtQnhDO1FBakJDLHFCQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUM1QixNQUFNLEVBQUUsR0FBRztZQUNYLFFBQVEsRUFBRSxHQUFHO1lBQ2IsR0FBRyxFQUFFLENBQUMsb0JBQVUsQ0FBQyxTQUFTLENBQUM7WUFDM0IsTUFBTSxFQUFFLENBQUMsZ0JBQVEsQ0FBQyxJQUFJLENBQUM7WUFDdkIsS0FBSyxFQUFFO2dCQUNOLENBQUMsb0JBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUNwQztZQUNELElBQUksRUFBRTtnQkFDTCxDQUFDLHFCQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDekIsQ0FBQyxxQkFBYSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7YUFDOUI7WUFDRCxNQUFNLEVBQUU7Z0JBQ1AscUJBQWEsQ0FBQyxNQUFNO2dCQUNwQixxQkFBYSxDQUFDLFdBQVc7YUFDekI7U0FDRCxDQUFDO3VEQUM4QjtJQUtoQztRQUhDLHFCQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUM1QixNQUFNLEVBQUUsQ0FBQztTQUNULENBQUM7dURBQzhCO0lBZ0JoQztRQVZDLHFCQUFRLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRTtZQUNsQyxLQUFLLEVBQUU7Z0JBQ04sc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7Z0JBQ3pDLHNCQUFRLEVBQWUsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDO2dCQUMxQyxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDO2dCQUNyRCxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDO2dCQUM3QyxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDO2FBQzdDO1lBQ0QsT0FBTyxFQUFFLHNCQUFRLEVBQWUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO1NBQ2xELENBQUM7eURBQ3FDO0lBU3ZDO1FBSEMscUJBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO1lBQ2hDLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO1NBQ3JDLENBQUM7MkRBQ29DO0lBS3RDO1FBSEMscUJBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO1lBQ2hDLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO1NBQ3JDLENBQUM7MkRBQ29DO0lBTXRDO1FBSkMscUJBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFO1lBQzNCLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO1lBQ25DLFNBQVMsRUFBRSxJQUFJO1NBQ2YsQ0FBQztzREFDK0I7SUFjakM7UUFSQyxxQkFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUU7WUFDL0IsUUFBUSxFQUFFLElBQUk7WUFDZCxZQUFZLEVBQUUsSUFBSTtZQUNsQixTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtZQUNwQyxVQUFVLEVBQUUsSUFBSTtZQUNoQixZQUFZLEVBQUUsSUFBSTtZQUNsQixhQUFhLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUM7U0FDekQsQ0FBQzswREFDb0M7SUFPdEM7UUFMQyxxQkFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUU7WUFDM0IsUUFBUSxFQUFFLElBQUk7WUFDZCxTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtZQUNyQyxZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUFDO3FEQUMrQjtJQWlCakM7UUFmQyxxQkFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUU7WUFDakMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7WUFDckMsY0FBYyxFQUFFLGtCQUFTLENBQUMsYUFBYTtZQUN2QyxNQUFNLEVBQUUsSUFBSTtZQUNaLEtBQUssRUFBRSxJQUFJO1lBQ1gsS0FBSyxFQUFFLGdCQUFPLENBQUMsT0FBTztZQUN0QixTQUFTLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUM5RSxXQUFXLEVBQUUsSUFBSTtZQUNqQixZQUFZLEVBQUUsSUFBSTtZQUNsQixNQUFNLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQztZQUN6RCxTQUFTLEVBQUU7Z0JBQ1YsRUFBRSxJQUFJLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO2FBQ3ZEO1lBQ0QsV0FBVyxFQUFFLHNCQUFRLEVBQWUsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDO1NBQ3hELENBQUM7NERBQ3NDO0lBdUJ4QztRQXJCQyxxQkFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUU7WUFDL0IsU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7WUFDckMsY0FBYyxFQUFFLGtCQUFTLENBQUMsTUFBTTtZQUNoQyxNQUFNLEVBQUUsSUFBSTtZQUNaLEtBQUssRUFBRSxJQUFJO1lBQ1gsS0FBSyxFQUFFLGdCQUFPLENBQUMsT0FBTztZQUN0QixTQUFTLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDekUsV0FBVyxFQUFFLElBQUk7WUFDakIsVUFBVSxFQUFFLElBQUk7WUFDaEIsWUFBWSxFQUFFLElBQUk7WUFDbEIsU0FBUyxFQUFFO2dCQUNWLEVBQUUsSUFBSSxFQUFFLHNCQUFRLEVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtnQkFDdkQsRUFBRSxJQUFJLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO2dCQUN2RCxFQUFFLElBQUksRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUU7Z0JBQ3ZELEVBQUUsSUFBSSxFQUFFLHNCQUFRLEVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtnQkFDdkQsRUFBRSxJQUFJLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO2dCQUN2RCxFQUFFLElBQUksRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUU7Z0JBQ3ZELEVBQUUsSUFBSSxFQUFFLHNCQUFRLEVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUNuRSxFQUFFLElBQUksRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUU7YUFDdkQ7U0FDRCxDQUFDOzBEQUNvQztJQU90QztRQUxDLHFCQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUMxQixRQUFRLEVBQUUsSUFBSTtZQUNkLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO1lBQ3JDLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQUM7cURBQytCO0lBb0JqQztRQWxCQyxxQkFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUU7WUFDakMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7WUFDckMsY0FBYyxFQUFFLGtCQUFTLENBQUMsYUFBYTtZQUN2QyxNQUFNLEVBQUUsSUFBSTtZQUNaLEtBQUssRUFBRSxJQUFJO1lBQ1gsS0FBSyxFQUFFLGdCQUFPLENBQUMsT0FBTztZQUN0QixTQUFTLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUM5RSxXQUFXLEVBQUUsSUFBSTtZQUNqQixZQUFZLEVBQUUsSUFBSTtZQUNsQixNQUFNLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQztZQUN6RCxTQUFTLEVBQUU7Z0JBQ1YsRUFBRSxJQUFJLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7Z0JBQ2xFLEVBQUUsSUFBSSxFQUFFLHNCQUFRLEVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtnQkFDdkQsRUFBRSxJQUFJLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7Z0JBQ25FLEVBQUUsSUFBSSxFQUFFLHNCQUFRLEVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRTthQUN2RDtZQUNELFdBQVcsRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQztTQUN4RCxDQUFDOzREQUNzQztJQXlCeEM7UUF2QkMscUJBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFO1lBQy9CLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO1lBQ3JDLGNBQWMsRUFBRSxrQkFBUyxDQUFDLE1BQU07WUFDaEMsTUFBTSxFQUFFLElBQUk7WUFDWixLQUFLLEVBQUUsSUFBSTtZQUNYLEtBQUssRUFBRSxnQkFBTyxDQUFDLE9BQU87WUFDdEIsU0FBUyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ3pFLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLFlBQVksRUFBRSxJQUFJO1lBQ2xCLFNBQVMsRUFBRTtnQkFDVixFQUFFLElBQUksRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtnQkFDbEUsRUFBRSxJQUFJLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO2dCQUN2RCxFQUFFLElBQUksRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtnQkFDbEUsRUFBRSxJQUFJLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO2dCQUN2RCxFQUFFLElBQUksRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtnQkFDbEUsRUFBRSxJQUFJLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO2dCQUN2RCxFQUFFLElBQUksRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtnQkFDbEUsRUFBRSxJQUFJLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO2dCQUN2RCxFQUFFLElBQUksRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtnQkFDbkUsRUFBRSxJQUFJLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO2FBQ3ZEO1NBQ0QsQ0FBQzswREFDb0M7SUFPdEM7UUFMQyxxQkFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDekIsUUFBUSxFQUFFLElBQUk7WUFDZCxTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtZQUNyQyxZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUFDO29EQUM4QjtJQW1EaEM7UUE3Q0MscUJBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFO1lBQy9CLEtBQUssRUFBRSxFQUFFO1lBQ1QsS0FBSyxFQUFFLEVBQUU7WUFDVCxNQUFNLEVBQUUsQ0FBQztZQUNULE1BQU0sRUFBRSxFQUFFO1lBQ1YsT0FBTyxFQUFFLElBQUksaUJBQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ3JCLGFBQWEsQ0FBQyxvQkFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7aUJBQ3JDLGFBQWEsQ0FBQyxvQkFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDcEMsVUFBVSxFQUFFLG9CQUFVLENBQUMsUUFBUSxHQUFHLG9CQUFVLENBQUMsS0FBSztZQUNsRCxFQUFFLEVBQUUsZ0JBQU0sQ0FBQyxPQUFPO1lBQ2xCLFFBQVEsRUFBRSxrQkFBUSxDQUFDLElBQUksR0FBRyxrQkFBUSxDQUFDLFlBQVksR0FBRyxrQkFBUSxDQUFDLEtBQUssR0FBRyxrQkFBUSxDQUFDLFlBQVk7WUFDeEYsY0FBYyxFQUFFLENBQUMsb0JBQVUsQ0FBQyxRQUFRLENBQUM7WUFDckMsVUFBVSxFQUFFLHFCQUFTLENBQUMsSUFBSTtZQUMxQixLQUFLLEVBQUU7Z0JBQ04sQ0FBQyxrQkFBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNwQixrQkFBa0IsRUFBRSxDQUFDLEtBQUs7aUJBQzFCO2dCQUNELENBQUMsa0JBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDbkIsa0JBQWtCLEVBQUUsQ0FBQyxLQUFLO2lCQUMxQjtnQkFDRCxDQUFDLGtCQUFTLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2pCLGtCQUFrQixFQUFFLENBQUMsS0FBSztpQkFDMUI7YUFDRDtZQUNELFVBQVUsRUFBRSxHQUFHO1lBQ2YsU0FBUyxFQUFFLElBQUk7WUFDZixJQUFJLEVBQUUsQ0FBQztvQkFDTixJQUFJLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUM7b0JBQ2hELE1BQU0sRUFBRSxFQUFFO2lCQUNWLENBQUM7U0FDRixFQUFFO1lBQ0YsUUFBUSxFQUFFO2dCQUNULEVBQUUsSUFBSSxFQUFFLGdCQUFRLENBQUMsTUFBTSxFQUFFO2dCQUN6QixFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLFVBQVUsRUFBRTtnQkFDN0IsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxTQUFTLEVBQUU7Z0JBQzVCLEVBQUUsSUFBSSxFQUFFLGdCQUFRLENBQUMsT0FBTyxFQUFFO2dCQUMxQixFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLE9BQU8sRUFBRTtnQkFDMUIsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxXQUFXLEVBQUU7Z0JBQzlCLEVBQUUsSUFBSSxFQUFFLGdCQUFRLENBQUMsS0FBSyxFQUFFO2dCQUN4QixFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLElBQUksRUFBRTtnQkFDdkIsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxhQUFhLEVBQUU7YUFDaEM7WUFDRCxLQUFLLEVBQUUsSUFBSTtZQUNYLEtBQUssRUFBRSxrQkFBUyxDQUFDLE9BQU87U0FDeEIsQ0FBQztxREFDZ0M7SUEwQmxDO1FBeEJDLHFCQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRTtZQUNqQyxLQUFLLEVBQUUsQ0FBQztZQUNSLEtBQUssRUFBRSxDQUFDO1lBQ1IsTUFBTSxFQUFFLENBQUM7WUFDVCxNQUFNLEVBQUUsQ0FBQztZQUNULE9BQU8sRUFBRSxJQUFJLGlCQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLFVBQVUsRUFBRSxvQkFBVSxDQUFDLFFBQVE7WUFDL0IsRUFBRSxFQUFFLGdCQUFNLENBQUMsTUFBTTtZQUNqQixRQUFRLEVBQUUsa0JBQVEsQ0FBQyxJQUFJLEdBQUcsa0JBQVEsQ0FBQyxZQUFZO1lBQy9DLFVBQVUsRUFBRSxxQkFBUyxDQUFDLElBQUk7WUFDMUIsVUFBVSxFQUFFLENBQUMsR0FBRztZQUNoQixTQUFTLEVBQUUsSUFBSTtZQUNmLFFBQVEsRUFBRSxJQUFJO1lBQ2QsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsc0JBQVEsRUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7U0FDL0QsRUFBRTtZQUNGLFFBQVEsRUFBRTtnQkFDVCxFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDekIsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxPQUFPLEVBQUU7Z0JBQzFCLEVBQUUsSUFBSSxFQUFFLGdCQUFRLENBQUMsS0FBSyxFQUFFO2dCQUN4QixFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLGFBQWEsRUFBRTthQUNoQztZQUNELEtBQUssRUFBRSxJQUFJO1lBQ1gsS0FBSyxFQUFFLGtCQUFTLENBQUMsT0FBTztTQUN4QixDQUFDO3VEQUNrQztJQWtDcEM7UUFoQ0MscUJBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFO1lBQy9CLEtBQUssRUFBRSxDQUFDO1lBQ1IsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLEVBQUUsQ0FBQztZQUNULE1BQU0sRUFBRSxDQUFDO1lBQ1QsT0FBTyxFQUFFLElBQUksaUJBQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ3JCLGFBQWEsQ0FBQyxvQkFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7aUJBQ3JDLGdCQUFnQixDQUFDLG9CQUFVLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUN2QyxVQUFVLEVBQUUsb0JBQVUsQ0FBQyxRQUFRO1lBQy9CLEVBQUUsRUFBRSxnQkFBTSxDQUFDLE9BQU87WUFDbEIsUUFBUSxFQUFFLGtCQUFRLENBQUMsTUFBTTtZQUN6QixVQUFVLEVBQUUsR0FBRztZQUNmLFVBQVUsRUFBRSxxQkFBUyxDQUFDLElBQUk7WUFDMUIsSUFBSSxFQUFFO2dCQUNMO29CQUNDLElBQUksRUFBRSxzQkFBUSxFQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDO29CQUNuRCxNQUFNLEVBQUUsRUFBRTtpQkFDVjtnQkFDRCxFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLE9BQU8sRUFBRTthQUMxQjtZQUNELFNBQVMsRUFBRSwwQkFBYSxDQUFDLEdBQUc7U0FDNUIsRUFBRTtZQUNGLFFBQVEsRUFBRTtnQkFDVCxFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLE9BQU8sRUFBRTtnQkFDMUIsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxPQUFPLEVBQUU7Z0JBQzFCLEVBQUUsSUFBSSxFQUFFLGdCQUFRLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7Z0JBQzFDLEVBQUUsSUFBSSxFQUFFLGdCQUFRLENBQUMsVUFBVSxFQUFFO2dCQUM3QixFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLGFBQWEsRUFBRTthQUNoQztZQUNELEtBQUssRUFBRSxJQUFJO1lBQ1gsS0FBSyxFQUFFLGtCQUFTLENBQUMsT0FBTztTQUN4QixDQUFDOzBEQUNxQztJQW9DdkM7UUFsQ0MscUJBQVEsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUU7WUFDeEMsS0FBSyxFQUFFLEVBQUU7WUFDVCxLQUFLLEVBQUUsRUFBRTtZQUNULE1BQU0sRUFBRSxFQUFFO1lBQ1YsTUFBTSxFQUFFLEVBQUU7WUFDVixPQUFPLEVBQUUsSUFBSSxpQkFBTyxDQUFDLENBQUMsQ0FBQztpQkFDckIsYUFBYSxDQUFDLG9CQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQztZQUNyQyxVQUFVLEVBQUUsb0JBQVUsQ0FBQyxJQUFJLEdBQUcsb0JBQVUsQ0FBQyxLQUFLO1lBQzlDLEVBQUUsRUFBRSxnQkFBTSxDQUFDLE9BQU87WUFDbEIsUUFBUSxFQUFFLGtCQUFRLENBQUMsTUFBTTtZQUN6QixVQUFVLEVBQUUscUJBQVMsQ0FBQyxJQUFJO1lBQzFCLFNBQVMsRUFBRSwwQkFBYSxDQUFDLElBQUk7WUFDN0IsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtZQUNqQyxhQUFhLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtZQUN4QyxjQUFjLEVBQUUsQ0FBQyxvQkFBVSxDQUFDLFFBQVEsQ0FBQztZQUNyQyxLQUFLLEVBQUU7Z0JBQ04sQ0FBQyxrQkFBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNwQixrQkFBa0IsRUFBRSxDQUFDLEtBQUs7aUJBQzFCO2dCQUNELENBQUMsa0JBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDbkIsa0JBQWtCLEVBQUUsQ0FBQyxLQUFLO2lCQUMxQjtnQkFDRCxDQUFDLGtCQUFTLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2pCLGtCQUFrQixFQUFFLENBQUMsS0FBSztpQkFDMUI7YUFDRDtZQUNELFVBQVUsRUFBRSxHQUFHO1lBQ2YsU0FBUyxFQUFFLElBQUk7U0FDZixFQUFFO1lBQ0YsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4QyxLQUFLLEVBQUUsR0FBRztZQUNWLEtBQUssRUFBRSxrQkFBUyxDQUFDLE1BQU07U0FDdkIsQ0FBQzttRUFDOEM7SUFpQ2hEO1FBL0JDLHFCQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtZQUM1QixLQUFLLEVBQUUsRUFBRTtZQUNULEtBQUssRUFBRSxFQUFFO1lBQ1QsTUFBTSxFQUFFLEVBQUU7WUFDVixNQUFNLEVBQUUsRUFBRTtZQUNWLE9BQU8sRUFBRSxJQUFJLGlCQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNyQixhQUFhLENBQUMsb0JBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDO1lBQ3JDLFVBQVUsRUFBRSxvQkFBVSxDQUFDLElBQUksR0FBRyxvQkFBVSxDQUFDLEtBQUs7WUFDOUMsRUFBRSxFQUFFLGdCQUFNLENBQUMsT0FBTztZQUNsQixRQUFRLEVBQUUsa0JBQVEsQ0FBQyxNQUFNO1lBQ3pCLFVBQVUsRUFBRSxxQkFBUyxDQUFDLElBQUk7WUFDMUIsU0FBUyxFQUFFLDBCQUFhLENBQUMsSUFBSTtZQUM3QixLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtZQUNqQyxjQUFjLEVBQUUsQ0FBQyxvQkFBVSxDQUFDLFFBQVEsQ0FBQztZQUNyQyxLQUFLLEVBQUU7Z0JBQ04sQ0FBQyxrQkFBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNwQixrQkFBa0IsRUFBRSxDQUFDLEtBQUs7aUJBQzFCO2dCQUNELENBQUMsa0JBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDbkIsa0JBQWtCLEVBQUUsQ0FBQyxLQUFLO2lCQUMxQjtnQkFDRCxDQUFDLGtCQUFTLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2pCLGtCQUFrQixFQUFFLENBQUMsS0FBSztpQkFDMUI7YUFDRDtZQUNELFVBQVUsRUFBRSxHQUFHO1lBQ2YsU0FBUyxFQUFFLElBQUk7U0FDZixFQUFFO1lBQ0YsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4QyxLQUFLLEVBQUUsR0FBRztTQUNWLENBQUM7dURBQ2tDO0lBT3BDO1FBREMsYUFBRyxDQUFDLFFBQVEsQ0FBYyxhQUFhLENBQUM7NkNBQ1g7SUFTOUI7UUFEQyxRQUFRO3lEQVdSO0lBR0Q7UUFEQyxRQUFROzZDQU1SO0lBR0Q7UUFEQyxRQUFROytDQU1SO0lBK0REO1FBREMsUUFBUSxFQUFFLHNCQUFVO29EQUdwQjtJQUdEO1FBREMsUUFBUSxFQUFFLHNCQUFVOzhEQXFIcEI7SUFHRDtRQURDLFFBQVEsRUFBRSxzQkFBVTtxREF5QnBCO0lBR0Q7UUFEQyxRQUFRLEVBQUUsc0JBQVU7bURBS3BCO0lBR0Q7UUFEQyxRQUFRLEVBQUUsc0JBQVU7a0RBTXBCO0lBR0Q7UUFEQyxRQUFRLEVBQUUsc0JBQVU7bURBTXBCO0lBR0Q7UUFEQyxRQUFRLEVBQUUsc0JBQVU7NkNBZ0JwQjtJQUdEO1FBREMsMkJBQVksQ0FBQyxxQkFBUSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUM7cURBd0M5QztJQUdEO1FBREMsUUFBUSxFQUFFLHNCQUFVOytEQU9wQjtJQU9EO1FBREMsMkJBQVksQ0FBQyxlQUFLLEVBQUUsZ0JBQWdCLENBQUM7cURBVXJDO0lBR0Q7UUFEQywyQkFBWSxDQUFDLGtCQUFRLEVBQUUsU0FBUyxDQUFDO3NEQUtqQztJQUdEO1FBREMsMkJBQVksQ0FBQyxrQkFBUSxFQUFFLFdBQVcsQ0FBQzt3REFRbkM7SUFHRDtRQURDLDJCQUFZLENBQUMsdUJBQWEsRUFBRSxnQkFBZ0IsQ0FBQztxREFxQjdDO0lBR0Q7UUFEQywyQkFBWSxDQUFDLDJCQUFpQixFQUFFLGdCQUFnQixDQUFDO3FEQU9qRDtJQU9EO1FBREMsZUFBTSxDQUFDLHVCQUFhLEVBQUUsYUFBYSxFQUFFLDBCQUFpQixDQUFDLEdBQUcsQ0FBQztrREFnQjNEO0lBdjVCRDtRQURDLGFBQUcsQ0FBQyxRQUFRLENBQWMsYUFBYSxDQUFDO3VDQUNJO0lBSDlDLDhCQTI1QkMifQ==