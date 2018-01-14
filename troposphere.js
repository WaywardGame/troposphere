define(["require", "exports", "creature/ICreature", "Enums", "item/Items", "language/Messages", "mod/Mod", "tile/Terrains", "Utilities"], function (require, exports, ICreature_1, Enums_1, Items_1, Messages_1, Mod_1, Terrains_1, Utilities) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Troposphere extends Mod_1.default {
        onInitialize(saveDataGlobal) { }
        onLoad(data) {
            this.data = data;
            this.firstLoad = !this.data;
            if (this.firstLoad) {
                this.data = {
                    seed: new Date().getTime()
                };
            }
            this.initializeSkills();
            this.initializeItems();
            this.initializeDoodads();
            this.initializeTerrain();
            this.initializeCreatures();
            this.messageFlewToTroposphere = this.addMessage("FlewToTroposphere", "You flew to the Troposphere.");
            this.messageFlewToTroposphereFailure = this.addMessage("FlewToTroposphereFailure", "You are unable to fly to the Troposphere. Try flying from another spot.");
            this.messageFlewToLand = this.addMessage("FlewToLand", "You flew back to land.");
            this.messageFlewToLandFailure = this.addMessage("FlewToLandFailure", "You are unable to fly back to land. Try flying from another spot.");
            this.messageFellToLand = this.addMessage("FellToLand", "You fell from the Troposphere. Ouch.");
            this.messageDeathByFalling = this.addMessage("DeathByFalling", "from falling out of the sky");
            this.messageGatheredRainbow = this.addMessage("GatheredRainbow", "You gathered the rainbow.");
            this.messageNoRainbow = this.addMessage("NoRainbow", "You can only gather rainbows by standing infront of them.");
        }
        onUnload() {
            const glassBottle = this.getItemByType(Enums_1.ItemType.GlassBottle);
            if (glassBottle && glassBottle.use) {
                glassBottle.use.pop();
            }
        }
        onSave() {
            return this.data;
        }
        onCreateWorld(world) {
            world.addLayer(Troposphere.troposphereZ);
        }
        postGenerateWorld(generateNewWorld) {
            const doodadChance = 0.6;
            const doodadChanceStorm = 0.2;
            const terrainHoleChance = 0.02;
            const creatureChance = 0.0025;
            const creatureSpriteChance = 0.0001;
            const creatureAberrantChance = 0.05;
            const creatureAberrantStormChance = 0.50;
            let tile;
            let terrainType;
            Utilities.Random.setSeed(this.data.seed);
            for (let x = 0; x < game.mapSize; x++) {
                for (let y = 0; y < game.mapSize; y++) {
                    tile = game.setTile(x, y, Troposphere.troposphereZ, game.getTile(x, y, Troposphere.troposphereZ) || {});
                    let tileGfx = 0;
                    const overworldTile = game.getTile(x, y, Enums_1.WorldZ.Overworld);
                    const terrainDescription = Terrains_1.default[Utilities.TileHelpers.getType(overworldTile)];
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
                        case Enums_1.TerrainType.ShallowFreshWater:
                            if (Utilities.Random.nextFloat() <= doodadChanceStorm) {
                                terrainType = this.terrainStormBoulder;
                            }
                            else {
                                terrainType = this.terrainStorm;
                            }
                            break;
                        default:
                            const doodad = overworldTile.doodad;
                            if (doodad && doodad.canGrow()) {
                                if (Utilities.Random.nextFloat() <= doodadChance) {
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
                        if (Utilities.Random.nextFloat() <= terrainHoleChance) {
                            terrainType = this.terrainHole;
                        }
                    }
                    if (terrainType === this.terrainCloudBoulder || terrainType === this.terrainStormBoulder) {
                        tileGfx = Utilities.Random.nextInt(3);
                    }
                    tile.data = Utilities.TileHelpers.setTypeRaw(tile.data, terrainType);
                    tile.data = Utilities.TileHelpers.setGfxRaw(tile.data, tileGfx);
                }
            }
            for (let x = 0; x < game.mapSize; x++) {
                for (let y = 0; y < game.mapSize; y++) {
                    terrainType = Utilities.TileHelpers.getType(game.getTile(x, y, Troposphere.troposphereZ));
                    if (generateNewWorld) {
                        switch (terrainType) {
                            case this.terrainCloud:
                            case this.terrainStorm:
                                const chance = Utilities.Random.nextFloat();
                                const aberrantChance = terrainType === this.terrainCloud ? creatureAberrantChance : creatureAberrantStormChance;
                                if (chance <= creatureSpriteChance) {
                                    creatureManager.spawn(this.creatureSprite, x, y, Troposphere.troposphereZ, true, Utilities.Random.nextFloat() <= aberrantChance);
                                }
                                else if (chance <= creatureChance) {
                                    const creatureType = this.creaturePool[Utilities.Random.nextInt(this.creaturePool.length)];
                                    creatureManager.spawn(creatureType, x, y, Troposphere.troposphereZ, true, Utilities.Random.nextFloat() <= aberrantChance);
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
                tileScale = Utilities.Math2.easeInCubic(turnProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
                game.updateRender = true;
            }
            else {
                tileScale *= 0.25;
            }
            const scrollX = Utilities.Math2.lerp(localPlayer.fromX, localPlayer.x, localPlayer.movementProgress);
            const scrollY = Utilities.Math2.lerp(localPlayer.fromY, localPlayer.y, localPlayer.movementProgress);
            renderer.layers[Enums_1.WorldZ.Overworld].renderFullbright(scrollX, scrollY, tileScale, viewWidth, viewHeight);
        }
        shouldRender() {
            if (this.falling) {
                return Enums_1.RenderFlag.Player;
            }
        }
        onGameStart(isLoadingSave) {
            if (!isLoadingSave || this.firstLoad) {
                localPlayer.createItemInInventory(this.itemNimbus);
            }
        }
        onMove(player, nextX, nextY, tile, direction) {
            if (player.z !== Troposphere.troposphereZ) {
                return;
            }
            this.moving = true;
            const terrainType = Utilities.TileHelpers.getType(tile);
            if (terrainType === this.terrainHole) {
                this.falling = true;
                fieldOfView.compute(false);
            }
        }
        onMoveComplete(player) {
            if (player.z !== Troposphere.troposphereZ) {
                return;
            }
            this.moving = false;
            if (this.falling) {
                this.falling = false;
                this.setFlying(player, false, false);
                ui.displayMessage(player, this.messageFellToLand, Messages_1.MessageType.Bad);
                const flyingSkill = player.skills[this.skillFlying];
                const damagePercentage = flyingSkill ? 1 - (flyingSkill.percent / 100) : 1;
                const tile = game.getTile(player.x, player.y, player.z);
                const terrainType = Utilities.TileHelpers.getType(tile);
                if (tileAtlas.isWater(terrainType)) {
                    player.damage(-30 * damagePercentage, Messages_1.messages[this.messageDeathByFalling]);
                }
                else {
                    player.damage(-40 * damagePercentage, Messages_1.messages[this.messageDeathByFalling]);
                    corpseManager.create(Enums_1.CreatureType.Blood, player.x, player.y, player.z);
                }
                player.addDelay(Enums_1.Delay.Collision, true);
                game.passTurn(player);
            }
        }
        initializeItems() {
            const actionTypeFly = this.addActionType({
                name: "Fly",
                description: "Fly to/from the Troposphere."
            }, (player, argument, result) => this.onNimbus(player, argument.item));
            const actionTypeGatherRainbow = this.addActionType({
                name: "Gather Rainbow",
                description: "Gather a Rainbow."
            }, (player, argument, result) => this.onGatherRainbow(player, argument.item));
            this.itemRainbow = this.addItem({
                description: "A Magical Rainbow.",
                name: "Rainbow",
                weight: 0.1
            });
            this.itemRainbowClayJug = this.addItem({
                description: "A Magical Rainbow in a Clay Jug.",
                name: "Rainbow Clay Jug",
                weight: 2.0
            });
            this.itemRainbowGlassBottle = this.addItem({
                description: "A Magical Rainbow in a Glass Bottle.",
                name: "Rainbow Glass Bottle",
                weight: 1.0,
                use: [Enums_1.ActionType.DrinkItem],
                returnOnUse: [Enums_1.ItemType.GlassBottle, false]
            });
            this.itemSnowflakes = this.addItem({
                description: "A couple Snowflakes.",
                name: "Snowflakes",
                weight: 0.1
            });
            this.itemCloudstone = this.addItem({
                description: "A Cloudstone.",
                name: "Cloudstone",
                weight: 1
            });
            this.itemNimbus = this.addItem({
                description: "A Flying Nimbus.",
                name: "Nimbus",
                use: [actionTypeFly],
                recipe: {
                    components: [
                        Items_1.RecipeComponent(Enums_1.ItemType.Feather, 2, 2, 2),
                        Items_1.RecipeComponent(this.itemCloudstone, 1, 1, 1)
                    ],
                    skill: this.skillFlying,
                    level: Enums_1.RecipeLevel.Simple,
                    reputation: 50
                },
                disassemble: true
            });
            const glassBottle = this.getItemByType(Enums_1.ItemType.GlassBottle);
            if (glassBottle && glassBottle.use) {
                glassBottle.use.push(actionTypeGatherRainbow);
            }
        }
        initializeDoodads() {
            this.doodadCloudBoulder = this.addDoodad({
                name: "Cloud Boulder",
                particles: { r: 176, g: 153, b: 134 }
            });
            this.doodadStormBoulder = this.addDoodad({
                name: "Storm Boulder",
                particles: { r: 176, g: 153, b: 134 }
            });
            this.doodadRainbow = this.addDoodad({
                name: "Rainbow",
                particles: { r: 176, g: 153, b: 134 },
                blockMove: true
            });
        }
        initializeTerrain() {
            this.terrainCloudWater = this.addTerrain({
                name: "Cloud Water",
                passable: true,
                shallowWater: true,
                particles: { r: 47, g: 128, b: 157 },
                freshWater: true,
                noBackground: true
            });
            this.terrainCloud = this.addTerrain({
                name: "Cloud",
                passable: true,
                particles: { r: 250, g: 250, b: 250 },
                noBackground: true
            });
            this.terrainRainbow = this.addTerrain({
                name: "Rainbow",
                passable: true,
                particles: { r: 20, g: 20, b: 20 },
                gather: true,
                noGfxSwitch: true,
                noBackground: true,
                doodad: this.doodadRainbow
            }, this.terrainCloud);
            this.terrainCloudBoulder = this.addTerrain({
                name: "Cloud Boulder",
                particles: { r: 250, g: 250, b: 250 },
                strength: 1,
                gatherSkillUse: Enums_1.SkillType.Lumberjacking,
                gather: true,
                noLos: true,
                sound: Enums_1.SfxType.TreeHit,
                leftOver: this.terrainCloudWater,
                noGfxSwitch: true,
                noBackground: true,
                doodad: this.doodadCloudBoulder
            }, this.terrainCloud);
            this.addTerrainResource(this.terrainCloudBoulder, [{
                    type: this.itemCloudstone,
                    chance: 45
                }]);
            this.terrainCloudstone = this.addTerrain({
                name: "Cloudstone",
                particles: { r: 250, g: 250, b: 250 },
                strength: 8,
                gatherSkillUse: Enums_1.SkillType.Mining,
                gather: true,
                noLos: true,
                sound: Enums_1.SfxType.RockHit,
                leftOver: this.terrainCloud,
                noGfxSwitch: true,
                isMountain: true,
                noBackground: true
            });
            this.addTerrainResource(this.terrainCloudstone, [{
                    type: this.itemCloudstone,
                    chance: 45
                }]);
            this.terrainStorm = this.addTerrain({
                name: "Storm",
                passable: true,
                particles: { r: 20, g: 20, b: 20 },
                noBackground: true
            });
            this.terrainStormBoulder = this.addTerrain({
                name: "Storm Boulder",
                particles: { r: 20, g: 20, b: 20 },
                strength: 2,
                gatherSkillUse: Enums_1.SkillType.Lumberjacking,
                gather: true,
                noLos: true,
                sound: Enums_1.SfxType.TreeHit,
                leftOver: this.terrainCloudWater,
                noGfxSwitch: true,
                noBackground: true,
                doodad: this.doodadStormBoulder
            }, this.terrainStorm);
            this.addTerrainResource(this.terrainStormBoulder, [{
                    type: this.itemCloudstone,
                    chance: 100
                }]);
            this.terrainStormstone = this.addTerrain({
                name: "Stormstone",
                particles: { r: 20, g: 20, b: 20 },
                strength: 12,
                gatherSkillUse: Enums_1.SkillType.Mining,
                gather: true,
                noLos: true,
                sound: Enums_1.SfxType.RockHit,
                leftOver: this.terrainStorm,
                noGfxSwitch: true,
                isMountain: true,
                noBackground: true
            });
            this.addTerrainResource(this.terrainStormstone, [{
                    type: this.itemCloudstone,
                    chance: 100
                }]);
            this.terrainHole = this.addTerrain({
                name: "Hole",
                passable: true,
                particles: { r: 250, g: 250, b: 250 },
                noBackground: true
            });
        }
        initializeCreatures() {
            this.creatureBear = this.addCreature({
                name: "Cloud Bear",
                minhp: 18,
                maxhp: 21,
                minatk: 5,
                maxatk: 13,
                defense: new Enums_1.Defense(3, new Enums_1.Resistances(Enums_1.DamageType.Piercing, 3, Enums_1.DamageType.Blunt, 1), new Enums_1.Vulnerabilities()),
                damageType: Enums_1.DamageType.Slashing | Enums_1.DamageType.Blunt,
                ai: ICreature_1.AiType.Hostile,
                moveType: Enums_1.MoveType.Land | Enums_1.MoveType.ShallowWater | Enums_1.MoveType.Water | Enums_1.MoveType.BreakDoodads,
                canCauseStatus: [Enums_1.StatusType.Bleeding],
                spawnTiles: ICreature_1.SpawnableTiles.None,
                spawnReputation: 16000,
                reputation: 300,
                makeNoise: true,
                loot: [{
                        item: this.itemRainbow,
                        chance: 50
                    }],
                noCorpse: true
            });
            this.creatureRabbit = this.addCreature({
                name: "Cloud Rabbit",
                minhp: 3,
                maxhp: 6,
                minatk: 1,
                maxatk: 2,
                defense: new Enums_1.Defense(0, new Enums_1.Resistances(), new Enums_1.Vulnerabilities()),
                damageType: Enums_1.DamageType.Slashing,
                ai: ICreature_1.AiType.Scared,
                moveType: Enums_1.MoveType.Land | Enums_1.MoveType.ShallowWater,
                spawnTiles: ICreature_1.SpawnableTiles.None,
                reputation: -200,
                makeNoise: true,
                jumpOver: true
            });
            this.creatureCloudling = this.addCreature({
                name: "Cloudling",
                minhp: 4,
                maxhp: 9,
                minatk: 2,
                maxatk: 3,
                defense: new Enums_1.Defense(0, new Enums_1.Resistances(Enums_1.DamageType.Piercing, 1), new Enums_1.Vulnerabilities(Enums_1.DamageType.Blunt, 1)),
                damageType: Enums_1.DamageType.Piercing,
                ai: ICreature_1.AiType.Neutral,
                moveType: Enums_1.MoveType.Flying,
                reputation: 100,
                spawnTiles: ICreature_1.SpawnableTiles.None,
                loot: [{ item: Enums_1.ItemType.Feather }, { item: Enums_1.ItemType.Feather }],
                lootGroup: Enums_1.LootGroupType.Low
            });
            this.creatureLightningElemental = this.addCreature({
                name: "Lightning Elemental",
                minhp: 30,
                maxhp: 38,
                minatk: 11,
                maxatk: 19,
                defense: new Enums_1.Defense(5, new Enums_1.Resistances(Enums_1.DamageType.Fire, 100), new Enums_1.Vulnerabilities()),
                damageType: Enums_1.DamageType.Fire | Enums_1.DamageType.Blunt,
                ai: ICreature_1.AiType.Hostile,
                moveType: Enums_1.MoveType.Flying,
                spawnTiles: ICreature_1.SpawnableTiles.None,
                lootGroup: Enums_1.LootGroupType.High,
                loot: [{ item: Enums_1.ItemType.PileOfAsh }],
                blood: { r: 210, g: 125, b: 20 },
                canCauseStatus: [Enums_1.StatusType.Bleeding],
                spawnReputation: 32000,
                reputation: 300,
                makeNoise: true
            });
            this.creatureSprite = this.addCreature({
                name: "Sprite",
                minhp: 30,
                maxhp: 38,
                minatk: 11,
                maxatk: 19,
                defense: new Enums_1.Defense(5, new Enums_1.Resistances(Enums_1.DamageType.Fire, 100), new Enums_1.Vulnerabilities()),
                damageType: Enums_1.DamageType.Fire | Enums_1.DamageType.Blunt,
                ai: ICreature_1.AiType.Hostile,
                moveType: Enums_1.MoveType.Flying,
                spawnTiles: ICreature_1.SpawnableTiles.None,
                lootGroup: Enums_1.LootGroupType.High,
                loot: [{ item: Enums_1.ItemType.PileOfAsh }],
                blood: { r: 210, g: 125, b: 20 },
                canCauseStatus: [Enums_1.StatusType.Bleeding],
                spawnReputation: 32000,
                reputation: 500,
                makeNoise: true
            });
            this.creaturePool = [this.creatureBear, this.creatureRabbit, this.creatureCloudling, this.creatureLightningElemental];
        }
        initializeSkills() {
            this.skillFlying = this.addSkillType({
                name: "Flying",
                description: "Increases your damage resistance when falling from the Troposphere."
            });
        }
        onNimbus(player, item) {
            this.setFlying(player, player.z !== Troposphere.troposphereZ, true);
        }
        onGatherRainbow(player, item) {
            const tile = player.getFacingTile();
            const tileType = Utilities.TileHelpers.getType(tile);
            if (!item || tileType !== this.terrainRainbow) {
                ui.displayMessage(player, this.messageNoRainbow);
                return;
            }
            ui.displayMessage(player, this.messageGatheredRainbow);
            game.particle.create(player.x + player.direction.x, player.y + player.direction.y, player.z, { r: 12, g: 128, b: 247 });
            const newItem = itemManager.create(this.itemRainbowGlassBottle, player.inventory, item.quality);
            newItem.decay = item.decay;
            newItem.minDur = item.minDur;
            newItem.maxDur = item.maxDur;
            itemManager.remove(item);
            game.changeTile({ type: this.terrainCloud }, player.x + player.direction.x, player.y + player.direction.y, player.z, false);
            game.passTurn(player);
        }
        canConsumeItem(player, itemType, actionType) {
            if (itemType === this.itemRainbowGlassBottle && actionType === Enums_1.ActionType.DrinkItem) {
                player.customization = {
                    hairStyle: Enums_1.HairStyle[Utilities.Enums.getRandomIndex(Enums_1.HairStyle)],
                    hairColor: Enums_1.HairColor[Utilities.Enums.getRandomIndex(Enums_1.HairColor)],
                    skinColor: Enums_1.SkinColor[Utilities.Enums.getRandomIndex(Enums_1.SkinColor)]
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
            if (tile && Utilities.TileHelpers.getType(tile) === this.terrainHole) {
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
                creatureObj.nextVisibleCount = Utilities.Random.nextIntInRange(1, 6);
                return;
            }
            creatureObj.nextVisibleCount--;
            return false;
        }
        setFlying(player, flying, passTurn) {
            const z = !flying ? Enums_1.WorldZ.Overworld : Troposphere.troposphereZ;
            const openTile = Utilities.TileHelpers.findMatchingTile(player, this.isFlyableTile.bind(this));
            if (openTile === undefined || player.z === Enums_1.WorldZ.Cave) {
                if (passTurn) {
                    ui.displayMessage(player, flying ? this.messageFlewToTroposphereFailure : this.messageFlewToLandFailure, Messages_1.MessageType.Bad);
                }
                return false;
            }
            player.x = openTile.x;
            player.y = openTile.y;
            player.z = z;
            player.raft = undefined;
            player.skillGain(this.skillFlying);
            if (passTurn) {
                ui.displayMessage(player, flying ? this.messageFlewToTroposphere : this.messageFlewToLand, Messages_1.MessageType.Good);
                game.passTurn(player);
            }
            return true;
        }
        isFlyableTile(point, tile) {
            if (tile.creature || tile.doodad) {
                return false;
            }
            const terrainType = Utilities.TileHelpers.getType(tile);
            if (terrainType === this.terrainHole) {
                return false;
            }
            const terrainInfo = Terrains_1.default[terrainType];
            return (!terrainInfo || (terrainInfo.water || terrainInfo.passable)) ? true : false;
        }
    }
    Troposphere.troposphereZ = Enums_1.WorldZ.Max + 1;
    exports.default = Troposphere;
});
//# sourceMappingURL=Troposphere.js.map