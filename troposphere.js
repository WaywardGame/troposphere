var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "action/Action", "action/IAction", "creature/ICreature", "entity/IEntity", "Enums", "item/Items", "mod/IHookHost", "mod/Mod", "mod/ModRegistry", "player/IMessageManager", "player/MessageManager", "tile/Terrains", "utilities/enum/Enums", "utilities/math/Vector2", "utilities/math/Vector3", "utilities/Random", "utilities/TileHelpers"], function (require, exports, Action_1, IAction_1, ICreature_1, IEntity_1, Enums_1, Items_1, IHookHost_1, Mod_1, ModRegistry_1, IMessageManager_1, MessageManager_1, Terrains_1, Enums_2, Vector2_1, Vector3_1, Random_1, TileHelpers_1) {
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
                game.updateRender = true;
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
            durability: 15,
            weight: 1.0
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
            spawnTiles: ICreature_1.SpawnableTiles.None,
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
            spawnTiles: ICreature_1.SpawnableTiles.None,
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
            spawnTiles: ICreature_1.SpawnableTiles.None,
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
            spawnTiles: ICreature_1.SpawnableTiles.None,
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
            spawnTiles: ICreature_1.SpawnableTiles.None,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJvcG9zcGhlcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUcm9wb3NwaGVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7SUE2QkEsTUFBcUIsV0FBWSxTQUFRLGFBQUc7UUFBNUM7O1lBeWNRLGNBQVMsR0FBRyxJQUFJLENBQUM7UUFxWnpCLENBQUM7UUFuWkEsSUFBWSxZQUFZO1lBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzFHLENBQUM7UUFHTSxrQkFBa0IsQ0FBQyxJQUF1QjtZQUNoRCxJQUFJLElBQUksRUFBRTtnQkFDVCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztnQkFDdkIsT0FBTyxJQUFJLENBQUM7YUFDWjtZQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLE9BQU87Z0JBQ04sSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFO2FBQzFCLENBQUM7UUFDSCxDQUFDO1FBRU0sUUFBUTtZQUNkLE1BQU0sV0FBVyxHQUFHLHdCQUFnQixDQUFDLGdCQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0QsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLEdBQUcsRUFBRTtnQkFDbkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQzthQUN0QjtRQUNGLENBQUM7UUFFTSxTQUFTLENBQUMsTUFBZSxFQUFFLE1BQWUsRUFBRSxRQUFpQjtZQUNuRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsY0FBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQztZQUVoRSxNQUFNLFFBQVEsR0FBRyxxQkFBVyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJ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