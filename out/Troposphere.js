var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "action/Action", "action/IAction", "creature/ICreature", "entity/IEntity", "Enums", "game/IGame", "item/Items", "mod/IHookHost", "mod/Mod", "mod/ModRegistry", "player/IMessageManager", "player/MessageManager", "tile/Terrains", "utilities/enum/Enums", "utilities/math/Vector2", "utilities/math/Vector3", "utilities/Random", "utilities/TileHelpers"], function (require, exports, Action_1, IAction_1, ICreature_1, IEntity_1, Enums_1, IGame_1, Items_1, IHookHost_1, Mod_1, ModRegistry_1, IMessageManager_1, MessageManager_1, Terrains_1, Enums_2, Vector2_1, Vector3_1, Random_1, TileHelpers_1) {
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
                seed: new Date().getTime()
            };
        }
        onUnload() {
            const glassBottle = Items_1.itemDescriptions[Enums_1.ItemType.GlassBottle];
            if (glassBottle && glassBottle.use) {
                glassBottle.use.pop();
            }
        }
        setFlying(player, flying, passTurn) {
            const z = !flying ? Enums_1.WorldZ.Overworld : Troposphere.troposphereZ;
            const openTile = TileHelpers_1.default.findMatchingTile(player, this.isFlyableTile.bind(this));
            if (openTile === undefined || player.z === Enums_1.WorldZ.Cave) {
                if (passTurn) {
                    player.messages.source(IMessageManager_1.Source.Action)
                        .type(MessageManager_1.MessageType.Bad)
                        .send(flying ? this.messageFlewToTroposphereFailure : this.messageFlewToLandFailure);
                }
                return false;
            }
            player.x = openTile.x;
            player.y = openTile.y;
            player.z = z;
            player.raft = undefined;
            player.skillGain(this.skillFlying);
            player.notes.write(this.flyingNote, {
                hasHair: player.customization.hairStyle !== "None"
            });
            if (passTurn) {
                player.messages.source(IMessageManager_1.Source.Action, IMessageManager_1.Source.Item)
                    .type(MessageManager_1.MessageType.Good)
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
            world.addLayer(Troposphere.troposphereZ);
        }
        preLoadWorldDifferences(generateNewWorld) {
            const doodadChance = 0.6;
            const doodadChanceStorm = 0.2;
            const doodadChanceRainbow = 0.1;
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
                    tile = game.setTile(x, y, Troposphere.troposphereZ, game.getTile(x, y, Troposphere.troposphereZ) || {});
                    let tileGfx = 0;
                    const overworldTile = game.getTile(x, y, Enums_1.WorldZ.Overworld);
                    const terrainDescription = Terrains_1.default[TileHelpers_1.default.getType(overworldTile)];
                    const normalTerrainType = terrainDescription ? terrainDescription.terrainType : Enums_1.TerrainType.Grass;
                    switch (normalTerrainType) {
                        case Enums_1.TerrainType.Rocks:
                        case Enums_1.TerrainType.Sandstone:
                            terrainType = this.terrainCloudstone;
                            break;
                        case Enums_1.TerrainType.DeepSeawater:
                        case Enums_1.TerrainType.DeepFreshWater:
                            terrainType = this.terrainStormstone;
                            break;
                        case Enums_1.TerrainType.Seawater:
                        case Enums_1.TerrainType.FreshWater:
                        case Enums_1.TerrainType.ShallowSeawater:
                            if (Random_1.default.float() <= doodadChanceStorm) {
                                terrainType = this.terrainStormBoulder;
                            }
                            else {
                                terrainType = this.terrainStorm;
                            }
                            break;
                        case Enums_1.TerrainType.ShallowFreshWater:
                            if (Random_1.default.float() <= doodadChanceRainbow) {
                                terrainType = this.terrainCloud;
                                doodadManager.create(this.doodadRainbow, x, y, Troposphere.troposphereZ);
                            }
                            else {
                                terrainType = this.terrainCloudWater;
                            }
                            break;
                        default:
                            const doodad = overworldTile.doodad;
                            if (doodad && doodad.canGrow()) {
                                if (Random_1.default.float() <= doodadChance) {
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
                    terrainType = TileHelpers_1.default.getType(game.getTile(x, y, Troposphere.troposphereZ));
                    if (generateNewWorld) {
                        switch (terrainType) {
                            case this.terrainCloud:
                            case this.terrainStorm:
                                const chance = Random_1.default.float();
                                const aberrantChance = terrainType === this.terrainCloud ? creatureAberrantChance : creatureAberrantStormChance;
                                if (chance <= creatureSpriteChance) {
                                    creatureManager.spawn(this.creatureSprite, x, y, Troposphere.troposphereZ, true, Random_1.default.float() <= aberrantChance);
                                }
                                else if (chance <= creatureChance) {
                                    const creatureType = this.creaturePool[Random_1.default.int(this.creaturePool.length)];
                                    creatureManager.spawn(creatureType, x, y, Troposphere.troposphereZ, true, Random_1.default.float() <= aberrantChance);
                                }
                                break;
                        }
                    }
                }
            }
        }
        preRenderWorld(tileScale, viewWidth, viewHeight) {
            if (localPlayer.z !== Troposphere.troposphereZ) {
                return;
            }
            if (this.falling) {
                const turnProgress = 1 - Math.min(1, Math.max(0, (localPlayer.movementFinishTime - game.absoluteTime) / (Enums_1.Delay.Movement * game.interval)));
                tileScale = this.easeInCubic(turnProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
                game.updateRender(IGame_1.RenderSource.Mod);
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
            renderer.layers[Enums_1.WorldZ.Overworld].renderFullbright(position.x, position.y, tileScale, viewWidth, viewHeight, false);
        }
        shouldRender() {
            if (this.falling) {
                return Enums_1.RenderFlag.Player;
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
            if (player.z !== Troposphere.troposphereZ) {
                return;
            }
            const terrainType = TileHelpers_1.default.getType(tile);
            if (terrainType === this.terrainHole) {
                this.falling = true;
                fieldOfView.compute(false);
            }
        }
        onMoveComplete(player) {
            if (player.z !== Troposphere.troposphereZ) {
                return;
            }
            if (this.falling) {
                this.falling = false;
                this.setFlying(player, false, false);
                if (player.state !== Enums_1.PlayerState.Ghost) {
                    let damage = -40;
                    damage *= 1 - player.getSkill(this.skillFlying) / 100;
                    const tile = game.getTile(player.x, player.y, player.z);
                    const terrainType = TileHelpers_1.default.getType(tile);
                    if (terrainType === Enums_1.TerrainType.DeepFreshWater || terrainType === Enums_1.TerrainType.DeepSeawater) {
                        damage *= .5;
                    }
                    else if (terrainType === Enums_1.TerrainType.FreshWater || terrainType === Enums_1.TerrainType.Seawater) {
                        damage *= .75;
                    }
                    damage = player.damage(damage, this.messageDeathByFalling);
                    player.messages.source(IMessageManager_1.Source.Wellbeing)
                        .type(MessageManager_1.MessageType.Bad)
                        .send(this.messageFellToLand, damage);
                    if (damage > 25 || damage > 15 && Random_1.default.chance(.5)) {
                        corpseManager.create(tileAtlas.isWater(terrainType) ? Enums_1.CreatureType.WaterBlood : Enums_1.CreatureType.Blood, player.x, player.y, player.z);
                    }
                }
                player.addDelay(Enums_1.Delay.Collision, true);
                game.passTurn(player);
            }
        }
        canConsumeItem(player, itemType, actionType) {
            if (itemType === this.itemRainbowGlassBottle && actionType === IAction_1.ActionType.DrinkItem) {
                player.customization = {
                    hairStyle: Enums_1.HairStyle[Enums_2.default.getRandom(Enums_1.HairStyle)],
                    hairColor: Enums_1.HairColor[Enums_2.default.getRandom(Enums_1.HairColor)],
                    skinColor: Enums_1.SkinColor[Enums_2.default.getRandom(Enums_1.SkinColor)]
                };
                return true;
            }
        }
        onSpawnCreatureFromGroup(creatureGroup, creaturePool, x, y, z) {
            if (z !== Troposphere.troposphereZ) {
                return;
            }
            creaturePool.push.apply(creaturePool, this.creaturePool);
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
        canSeeCreature(creature, tile) {
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
        getFogColor() {
            if (localPlayer.z === Troposphere.troposphereZ) {
                const ambientLightLevel = game.getAmbientLightLevel(localPlayer.z);
                const ambientLightColor = new Vector3_1.default(renderer.getAmbientColor());
                if (ambientLightLevel > 0.5) {
                    return Vector3_1.default.mix(ambientLightColor, Vector3_1.default.ONE, ambientLightLevel * 2 - 1).xyz;
                }
                else {
                    return Vector3_1.default.mix(Vector3_1.default.ZERO, ambientLightColor, ambientLightLevel * 2).xyz;
                }
            }
            return undefined;
        }
        getTilePenalty(penalty, tile) {
            if (TileHelpers_1.default.getType(tile) === this.terrainHole) {
                penalty += 1000;
            }
            return penalty;
        }
    }
    Troposphere.troposphereZ = Enums_1.WorldZ.Max + 1;
    __decorate([
        ModRegistry_1.default.skill("flying")
    ], Troposphere.prototype, "skillFlying", void 0);
    __decorate([
        ModRegistry_1.default.helpArticle("Flying", {
            image: true,
            section: "Troposphere"
        })
    ], Troposphere.prototype, "flyingHelpArticle", void 0);
    __decorate([
        ModRegistry_1.default.note("Flying", {
            learnMore: ModRegistry_1.Registry().get("flyingHelpArticle")
        })
    ], Troposphere.prototype, "flyingNote", void 0);
    __decorate([
        ModRegistry_1.default.action("Fly", new Action_1.Action(IAction_1.ActionArgument.ItemInventory)
            .setUsableBy(IEntity_1.EntityType.Player)
            .setHandler((action, item) => {
            Troposphere.INSTANCE.setFlying(action.executor, action.executor.z !== Troposphere.troposphereZ, true);
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
                    Items_1.RecipeComponent(Enums_1.ItemType.Feather, 2, 2, 2),
                    Items_1.RecipeComponent(ModRegistry_1.Registry().get("itemCloudstone"), 1, 1, 1),
                    Items_1.RecipeComponent(ModRegistry_1.Registry().get("itemSnowflakes"), 1, 1, 1)
                ],
                skill: ModRegistry_1.Registry().get("skillFlying"),
                level: Enums_1.RecipeLevel.Simple,
                reputation: 50
            },
            disassemble: true,
            durability: 15
        })
    ], Troposphere.prototype, "itemNimbus", void 0);
    __decorate([
        ModRegistry_1.default.item("Rainbow", {
            weight: 0.1,
            use: [IAction_1.ActionType.DrinkItem, IAction_1.ActionType.Build],
            onUse: {
                [IAction_1.ActionType.Build]: ModRegistry_1.Registry().get("doodadRainbow")
            }
        })
    ], Troposphere.prototype, "itemRainbow", void 0);
    __decorate([
        ModRegistry_1.default.item("RainbowGlassBottle", {
            weight: 1.0,
            use: [IAction_1.ActionType.DrinkItem],
            returnOnUse: [Enums_1.ItemType.GlassBottle, false]
        })
    ], Troposphere.prototype, "itemRainbowGlassBottle", void 0);
    __decorate([
        ModRegistry_1.default.item("Snowflakes", {
            weight: 0.1
        })
    ], Troposphere.prototype, "itemSnowflakes", void 0);
    __decorate([
        ModRegistry_1.default.item("Cloudstone", {
            weight: 1
        })
    ], Troposphere.prototype, "itemCloudstone", void 0);
    __decorate([
        ModRegistry_1.default.doodad("CloudBoulder", {
            particles: { r: 176, g: 153, b: 134 }
        })
    ], Troposphere.prototype, "doodadCloudBoulder", void 0);
    __decorate([
        ModRegistry_1.default.doodad("StormBoulder", {
            particles: { r: 176, g: 153, b: 134 }
        })
    ], Troposphere.prototype, "doodadStormBoulder", void 0);
    __decorate([
        ModRegistry_1.default.doodad("Rainbow", {
            particles: { r: 176, g: 153, b: 134 },
            blockMove: true
        })
    ], Troposphere.prototype, "doodadRainbow", void 0);
    __decorate([
        ModRegistry_1.default.terrain("CloudWater", {
            passable: true,
            shallowWater: true,
            particles: { r: 47, g: 128, b: 157 },
            freshWater: true,
            noBackground: true,
            tileOnConsume: ModRegistry_1.Registry().get("terrainHole")
        })
    ], Troposphere.prototype, "terrainCloudWater", void 0);
    __decorate([
        ModRegistry_1.default.terrain("Clouds", {
            passable: true,
            particles: { r: 250, g: 250, b: 250 },
            noBackground: true
        })
    ], Troposphere.prototype, "terrainCloud", void 0);
    __decorate([
        ModRegistry_1.default.terrain("CloudBoulder", {
            particles: { r: 250, g: 250, b: 250 },
            gatherSkillUse: Enums_1.SkillType.Lumberjacking,
            gather: true,
            noLos: true,
            sound: Enums_1.SfxType.TreeHit,
            leftOver: ModRegistry_1.Registry().get("terrainCloudWater"),
            noGfxSwitch: true,
            noBackground: true,
            doodad: ModRegistry_1.Registry().get("doodadCloudBoulder"),
            resources: [
                { type: ModRegistry_1.Registry().get("itemCloudstone") }
            ],
            terrainType: ModRegistry_1.Registry().get("terrainCloud")
        })
    ], Troposphere.prototype, "terrainCloudBoulder", void 0);
    __decorate([
        ModRegistry_1.default.terrain("Cloudstone", {
            particles: { r: 250, g: 250, b: 250 },
            gatherSkillUse: Enums_1.SkillType.Mining,
            gather: true,
            noLos: true,
            sound: Enums_1.SfxType.RockHit,
            leftOver: ModRegistry_1.Registry().get("terrainCloud"),
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
                { type: ModRegistry_1.Registry().get("itemCloudstone") }
            ]
        })
    ], Troposphere.prototype, "terrainCloudstone", void 0);
    __decorate([
        ModRegistry_1.default.terrain("Storm", {
            passable: true,
            particles: { r: 20, g: 20, b: 20 },
            noBackground: true
        })
    ], Troposphere.prototype, "terrainStorm", void 0);
    __decorate([
        ModRegistry_1.default.terrain("StormBoulder", {
            particles: { r: 20, g: 20, b: 20 },
            gatherSkillUse: Enums_1.SkillType.Lumberjacking,
            gather: true,
            noLos: true,
            sound: Enums_1.SfxType.TreeHit,
            leftOver: ModRegistry_1.Registry().get("terrainCloudWater"),
            noGfxSwitch: true,
            noBackground: true,
            doodad: ModRegistry_1.Registry().get("doodadStormBoulder"),
            resources: [
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone"), chance: 45 },
                { type: ModRegistry_1.Registry().get("itemCloudstone") }
            ],
            terrainType: ModRegistry_1.Registry().get("terrainStorm")
        })
    ], Troposphere.prototype, "terrainStormBoulder", void 0);
    __decorate([
        ModRegistry_1.default.terrain("Stormstone", {
            particles: { r: 20, g: 20, b: 20 },
            gatherSkillUse: Enums_1.SkillType.Mining,
            gather: true,
            noLos: true,
            sound: Enums_1.SfxType.RockHit,
            leftOver: ModRegistry_1.Registry().get("terrainStorm"),
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
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone") },
                { type: ModRegistry_1.Registry().get("itemCloudstone"), chance: 45 },
                { type: ModRegistry_1.Registry().get("itemCloudstone") }
            ]
        })
    ], Troposphere.prototype, "terrainStormstone", void 0);
    __decorate([
        ModRegistry_1.default.terrain("Hole", {
            passable: true,
            particles: { r: 250, g: 250, b: 250 },
            noBackground: true
        })
    ], Troposphere.prototype, "terrainHole", void 0);
    __decorate([
        ModRegistry_1.default.creature("CloudBear", {
            minhp: 18,
            maxhp: 21,
            minatk: 5,
            maxatk: 13,
            defense: new Enums_1.Defense(3, new Enums_1.Resistances(Enums_1.DamageType.Piercing, 3, Enums_1.DamageType.Blunt, 1), new Enums_1.Vulnerabilities()),
            damageType: Enums_1.DamageType.Slashing | Enums_1.DamageType.Blunt,
            ai: IEntity_1.AiType.Hostile,
            moveType: Enums_1.MoveType.Land | Enums_1.MoveType.ShallowWater | Enums_1.MoveType.Water | Enums_1.MoveType.BreakDoodads,
            canCauseStatus: [Enums_1.StatusType.Bleeding],
            spawnTiles: ICreature_1.TileGroup.None,
            spawnReputation: 16000,
            reputation: 300,
            makeNoise: true,
            loot: [{
                    item: ModRegistry_1.Registry().get("itemRainbow"),
                    chance: 50
                }]
        }, {
            resource: [
                { item: Enums_1.ItemType.Cotton },
                { item: Enums_1.ItemType.AnimalClaw },
                { item: Enums_1.ItemType.AnimalFat },
                { item: Enums_1.ItemType.RawMeat },
                { item: Enums_1.ItemType.RawMeat },
                { item: Enums_1.ItemType.AnimalSkull },
                { item: Enums_1.ItemType.Offal },
                { item: Enums_1.ItemType.Bone },
                { item: Enums_1.ItemType.BoneFragments }
            ],
            decay: 2800,
            skill: Enums_1.SkillType.Anatomy
        })
    ], Troposphere.prototype, "creatureBear", void 0);
    __decorate([
        ModRegistry_1.default.creature("CloudRabbit", {
            minhp: 3,
            maxhp: 6,
            minatk: 1,
            maxatk: 2,
            defense: new Enums_1.Defense(0, new Enums_1.Resistances(), new Enums_1.Vulnerabilities()),
            damageType: Enums_1.DamageType.Slashing,
            ai: IEntity_1.AiType.Scared,
            moveType: Enums_1.MoveType.Land | Enums_1.MoveType.ShallowWater,
            spawnTiles: ICreature_1.TileGroup.None,
            reputation: -200,
            makeNoise: true,
            jumpOver: true,
            loot: [{ item: ModRegistry_1.Registry().get("itemSnowflakes") }]
        }, {
            resource: [
                { item: Enums_1.ItemType.Cotton },
                { item: Enums_1.ItemType.RawMeat },
                { item: Enums_1.ItemType.Offal },
                { item: Enums_1.ItemType.BoneFragments }
            ],
            decay: 2400,
            skill: Enums_1.SkillType.Anatomy
        })
    ], Troposphere.prototype, "creatureRabbit", void 0);
    __decorate([
        ModRegistry_1.default.creature("Cloudling", {
            minhp: 4,
            maxhp: 9,
            minatk: 2,
            maxatk: 3,
            defense: new Enums_1.Defense(0, new Enums_1.Resistances(Enums_1.DamageType.Piercing, 1), new Enums_1.Vulnerabilities(Enums_1.DamageType.Blunt, 1)),
            damageType: Enums_1.DamageType.Piercing,
            ai: IEntity_1.AiType.Neutral,
            moveType: Enums_1.MoveType.Flying,
            reputation: 100,
            spawnTiles: ICreature_1.TileGroup.None,
            loot: [
                {
                    item: ModRegistry_1.Registry().get("itemSnowflakes"),
                    chance: 75
                },
                { item: Enums_1.ItemType.Feather }
            ],
            lootGroup: Enums_1.LootGroupType.Low
        }, {
            resource: [
                { item: Enums_1.ItemType.Feather },
                { item: Enums_1.ItemType.Feather },
                { item: Enums_1.ItemType.TailFeathers, chance: 1 },
                { item: Enums_1.ItemType.RawChicken },
                { item: Enums_1.ItemType.BoneFragments }
            ],
            decay: 2400,
            skill: Enums_1.SkillType.Anatomy
        })
    ], Troposphere.prototype, "creatureCloudling", void 0);
    __decorate([
        ModRegistry_1.default.creature("LightningElemental", {
            minhp: 30,
            maxhp: 38,
            minatk: 11,
            maxatk: 19,
            defense: new Enums_1.Defense(5, new Enums_1.Resistances(Enums_1.DamageType.Fire, 100), new Enums_1.Vulnerabilities()),
            damageType: Enums_1.DamageType.Fire | Enums_1.DamageType.Blunt,
            ai: IEntity_1.AiType.Hostile,
            moveType: Enums_1.MoveType.Flying,
            spawnTiles: ICreature_1.TileGroup.None,
            lootGroup: Enums_1.LootGroupType.High,
            loot: [{ item: Enums_1.ItemType.PileOfAsh }],
            blood: { r: 141, g: 155, b: 158 },
            aberrantBlood: { r: 95, g: 107, b: 122 },
            canCauseStatus: [Enums_1.StatusType.Bleeding],
            spawnReputation: 32000,
            reputation: 300,
            makeNoise: true
        }, {
            resource: [{ item: Enums_1.ItemType.PileOfAsh }],
            decay: 400,
            skill: Enums_1.SkillType.Mining
        })
    ], Troposphere.prototype, "creatureLightningElemental", void 0);
    __decorate([
        ModRegistry_1.default.creature("Sprite", {
            minhp: 30,
            maxhp: 38,
            minatk: 11,
            maxatk: 19,
            defense: new Enums_1.Defense(5, new Enums_1.Resistances(Enums_1.DamageType.Fire, 100), new Enums_1.Vulnerabilities()),
            damageType: Enums_1.DamageType.Fire | Enums_1.DamageType.Blunt,
            ai: IEntity_1.AiType.Hostile,
            moveType: Enums_1.MoveType.Flying,
            spawnTiles: ICreature_1.TileGroup.None,
            lootGroup: Enums_1.LootGroupType.High,
            blood: { r: 238, g: 130, b: 134 },
            canCauseStatus: [Enums_1.StatusType.Bleeding],
            spawnReputation: 32000,
            reputation: 500,
            makeNoise: true
        }, {
            resource: [{ item: Enums_1.ItemType.Ectoplasm }],
            decay: 100,
            blood: false
        })
    ], Troposphere.prototype, "creatureSprite", void 0);
    __decorate([
        Mod_1.default.saveData("Troposphere")
    ], Troposphere.prototype, "data", void 0);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "onCreateWorld", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "preLoadWorldDifferences", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "preRenderWorld", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "shouldRender", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "onGameStart", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "onPlayerJoin", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "onMove", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "onMoveComplete", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "canConsumeItem", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "onSpawnCreatureFromGroup", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "canCreatureMove", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "canCreatureAttack", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "canSeeCreature", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "getFogColor", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "getTilePenalty", null);
    __decorate([
        Mod_1.default.instance("Troposphere")
    ], Troposphere, "INSTANCE", void 0);
    exports.default = Troposphere;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJvcG9zcGhlcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9Ucm9wb3NwaGVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7SUE4QkEsTUFBcUIsV0FBWSxTQUFRLGFBQUc7UUFBNUM7O1lBd2NRLGNBQVMsR0FBRyxJQUFJLENBQUM7UUFxWnpCLENBQUM7UUFuWkEsSUFBWSxZQUFZO1lBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzFHLENBQUM7UUFHTSxrQkFBa0IsQ0FBQyxJQUF1QjtZQUNoRCxJQUFJLElBQUksRUFBRTtnQkFDVCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztnQkFDdkIsT0FBTyxJQUFJLENBQUM7YUFDWjtZQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLE9BQU87Z0JBQ04sSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFO2FBQzFCLENBQUM7UUFDSCxDQUFDO1FBRU0sUUFBUTtZQUNkLE1BQU0sV0FBVyxHQUFHLHdCQUFnQixDQUFDLGdCQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0QsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLEdBQUcsRUFBRTtnQkFDbkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQzthQUN0QjtRQUNGLENBQUM7UUFFTSxTQUFTLENBQUMsTUFBZSxFQUFFLE1BQWUsRUFBRSxRQUFpQjtZQUNuRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsY0FBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQztZQUVoRSxNQUFNLFFBQVEsR0FBRyxxQkFBVyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJ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