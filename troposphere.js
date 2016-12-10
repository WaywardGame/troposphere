define(["require", "exports"], function (require, exports) {
    "use strict";
    ;
    class Mod extends Mods.Mod {
        onInitialize(saveDataGlobal) {
        }
        onLoad(data) {
            this.data = data;
            this.firstLoad = !this.data;
            if (this.firstLoad) {
                this.data = {
                    seed: new Date().getTime(),
                    flying: false,
                };
            }
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
            this.getItemByType(ItemType.GlassBottle).use.pop();
        }
        onSave() {
            return this.data;
        }
        onCreateWorld(world) {
            world.addLayer(Mod.troposphereZ);
        }
        postGenerateWorld(generateNewWorld) {
            let doodadChance = 0.6;
            let doodadChanceStorm = 0.2;
            let terrainHoleChance = 0.02;
            let creatureChance = 0.0025;
            let creatureSpriteChance = 0.0001;
            let creatureAberrantChance = 0.05;
            let creatureAberrantStormChance = 0.50;
            let tile;
            let terrainType;
            Utilities.Random.setSeed(this.data.seed);
            for (let x = 0; x < game.mapSize; x++) {
                for (let y = 0; y < game.mapSize; y++) {
                    tile = game.setTile(x, y, Mod.troposphereZ, game.getTile(x, y, Mod.troposphereZ) || {});
                    let tileGfx = 0;
                    let normalTerrainType = Terrain.defines[Utilities.TileHelpers.getType(game.getTile(x, y, Z_NORMAL))].terrainType;
                    switch (normalTerrainType) {
                        case TerrainType.Rocks:
                        case TerrainType.Sandstone:
                            terrainType = this.terrainCloudstone;
                            break;
                        case TerrainType.DeepSeawater:
                        case TerrainType.DeepFreshWater:
                            terrainType = this.terrainStormstone;
                            break;
                        case TerrainType.Seawater:
                        case TerrainType.FreshWater:
                        case TerrainType.ShallowSeawater:
                        case TerrainType.ShallowFreshWater:
                            if (Utilities.Random.nextFloat() <= doodadChanceStorm) {
                                terrainType = this.terrainStormBoulder;
                            }
                            else {
                                terrainType = this.terrainStorm;
                            }
                            break;
                        case TerrainType.Tree:
                        case TerrainType.BareTree:
                        case TerrainType.BarePalmTree:
                        case TerrainType.TreeWithVines:
                        case TerrainType.TreeWithBerries:
                        case TerrainType.TreeWithFungus:
                        case TerrainType.PalmTree:
                        case TerrainType.PalmTreeWithCoconuts:
                            if (Utilities.Random.nextFloat() <= doodadChance) {
                                terrainType = this.terrainCloudBoulder;
                            }
                            else {
                                terrainType = this.terrainCloud;
                            }
                            break;
                        default:
                            terrainType = this.terrainCloud;
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
                    terrainType = Utilities.TileHelpers.getType(game.getTile(x, y, Mod.troposphereZ));
                    if (generateNewWorld) {
                        switch (terrainType) {
                            case this.terrainCloud:
                            case this.terrainStorm:
                                let chance = Utilities.Random.nextFloat();
                                let aberrantChance = terrainType === this.terrainCloud ? creatureAberrantChance : creatureAberrantStormChance;
                                if (chance <= creatureSpriteChance) {
                                    Creature.spawn(this.creatureSprite, x, y, Mod.troposphereZ, true, Utilities.Random.nextFloat() <= aberrantChance);
                                }
                                else if (chance <= creatureChance) {
                                    let creatureType = this.creaturePool[Utilities.Random.nextInt(this.creaturePool.length)];
                                    Creature.spawn(creatureType, x, y, Mod.troposphereZ, true, Utilities.Random.nextFloat() <= aberrantChance);
                                }
                                break;
                        }
                    }
                }
            }
        }
        preRenderWorld(tileScale, viewWidth, viewHeight) {
            if (!this.data.flying) {
                return;
            }
            if (this.falling) {
                let turnProgress = 1 - Math.min(1, Math.max(0, (game.nextProcessInput - game.time) / (Delay.Collision * game.interval)));
                tileScale = Utilities.Math2.easeInCubic(turnProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
                game.updateRender = true;
            }
            else {
                tileScale *= 0.25;
            }
            let scrollX = Utilities.Math2.lerp(player.fromX, player.x, game.turnProgress);
            let scrollY = Utilities.Math2.lerp(player.fromY, player.y, game.turnProgress);
            renderer.layers[Z_NORMAL].renderFullbright(scrollX, scrollY, tileScale, viewWidth, viewHeight);
            renderer.layers[Z_NORMAL].postRenderFullbright(scrollX, scrollY, tileScale, viewWidth, viewHeight);
        }
        shouldRender() {
            if (!this.falling) {
                return undefined;
            }
            return RenderFlag.Player;
        }
        onGameStart(isLoadingSave) {
            if (!isLoadingSave || this.firstLoad) {
                Item.create(this.itemNimbus);
            }
        }
        onTurnStart() {
            if (!this.data.flying) {
                return;
            }
            this.moving = true;
        }
        onTurnComplete() {
            if (!this.data.flying) {
                return;
            }
            this.moving = false;
            if (this.falling) {
                this.falling = false;
                this.setFlying(false, false);
                ui.displayMessage(this.messageFellToLand, MessageType.Bad);
                let tile = game.getTile(player.x, player.y, player.z);
                let terrainType = Utilities.TileHelpers.getType(tile);
                if (TileAtlas.isWater(terrainType)) {
                    player.damage(-30, messages[this.messageDeathByFalling]);
                }
                else {
                    player.damage(-40, messages[this.messageDeathByFalling]);
                    Corpse.create({ type: CreatureType.Blood, x: player.x, y: player.y, z: player.z });
                }
                game.passTurn();
            }
            else {
                let tile = game.getTile(player.x, player.y, player.z);
                let terrainType = Utilities.TileHelpers.getType(tile);
                if (terrainType === this.terrainHole) {
                    this.falling = true;
                    game.addDelay(Delay.Collision, true);
                    game.passTurn();
                    game.fov.compute(false);
                }
            }
        }
        initializeItems() {
            let actionTypeFly = this.addActionType("Fly", "Fly to/from the Troposphere.", (item) => this.onNimbus(item));
            let actionTypeGatherRainbow = this.addActionType("Gather Rainbow", "Gather a Rainbow.", (item) => this.onGatherRainbow(item));
            this.itemNimbus = this.addItem({
                description: "A Flying Nimbus.",
                name: "Nimbus",
                weight: 0.1,
                use: [actionTypeFly]
            });
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
                use: [ActionType.Drink],
                returnOnUse: [ItemType.GlassBottle, false]
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
            this.getItemByType(ItemType.GlassBottle).use.push(actionTypeGatherRainbow);
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
                skill: SkillType.Lumberjacking,
                gather: true,
                noLos: true,
                sound: SfxType.TreeHit,
                leftOver: this.terrainCloudWater,
                noGfxSwitch: true,
                noBackground: true,
                doodad: this.doodadCloudBoulder
            }, this.terrainCloud);
            this.terrainCloudstone = this.addTerrain({
                name: "Cloudstone",
                particles: { r: 250, g: 250, b: 250 },
                strength: 8,
                skill: SkillType.Mining,
                gather: true,
                noLos: true,
                sound: SfxType.RockHit,
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
                skill: SkillType.Lumberjacking,
                gather: true,
                noLos: true,
                sound: SfxType.TreeHit,
                leftOver: this.terrainCloudWater,
                noGfxSwitch: true,
                noBackground: true,
                doodad: this.doodadStormBoulder
            }, this.terrainStorm);
            this.terrainStormstone = this.addTerrain({
                name: "Stormstone",
                particles: { r: 20, g: 20, b: 20 },
                strength: 12,
                skill: SkillType.Mining,
                gather: true,
                noLos: true,
                sound: SfxType.RockHit,
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
                defense: new Defense(3, new Resistances(DamageType.Piercing, 3, DamageType.Blunt, 1), new Vulnerabilities()),
                damageType: DamageType.Slashing | DamageType.Blunt,
                ai: Creature.AiType.Hostile,
                moveType: MoveType.Land | MoveType.ShallowWater | MoveType.Water | MoveType.BreakWalls,
                canCauseStatus: [StatusType.Bleeding],
                spawnTiles: Creature.SpawnableTiles.None,
                spawnMalignity: 16000,
                malignity: -300,
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
                defense: new Defense(0, new Resistances(), new Vulnerabilities()),
                damageType: DamageType.Slashing,
                ai: Creature.AiType.Scared,
                moveType: MoveType.Land | MoveType.ShallowWater,
                spawnTiles: Creature.SpawnableTiles.None,
                malignity: 200,
                makeNoise: true,
                jumpOver: true
            });
            this.creatureCloudling = this.addCreature({
                name: "Cloudling",
                minhp: 4,
                maxhp: 9,
                minatk: 2,
                maxatk: 3,
                defense: new Defense(0, new Resistances(DamageType.Piercing, 1), new Vulnerabilities(DamageType.Blunt, 1)),
                damageType: DamageType.Piercing,
                ai: Creature.AiType.Neutral,
                moveType: MoveType.Flying,
                malignity: -100,
                spawnTiles: Creature.SpawnableTiles.None,
                loot: [{ item: ItemType.Feather }, { item: ItemType.Feather }],
                lootGroup: LootGroupType.Low
            });
            this.creatureLightningElemental = this.addCreature({
                name: "Lightning Elemental",
                minhp: 30,
                maxhp: 38,
                minatk: 11,
                maxatk: 19,
                defense: new Defense(5, new Resistances(DamageType.Fire, 100), new Vulnerabilities()),
                damageType: DamageType.Fire | DamageType.Blunt,
                ai: Creature.AiType.Hostile,
                moveType: MoveType.Flying,
                spawnTiles: Creature.SpawnableTiles.None,
                lootGroup: LootGroupType.High,
                loot: [{ item: ItemType.PileOfAsh }],
                blood: { r: 210, g: 125, b: 20 },
                canCauseStatus: [StatusType.Bleeding],
                spawnMalignity: 32000,
                malignity: -300,
                makeNoise: true
            });
            this.creatureSprite = this.addCreature({
                name: "Sprite",
                minhp: 30,
                maxhp: 38,
                minatk: 11,
                maxatk: 19,
                defense: new Defense(5, new Resistances(DamageType.Fire, 100), new Vulnerabilities()),
                damageType: DamageType.Fire | DamageType.Blunt,
                ai: Creature.AiType.Hostile,
                moveType: MoveType.Flying,
                spawnTiles: Creature.SpawnableTiles.None,
                lootGroup: LootGroupType.High,
                loot: [{ item: ItemType.PileOfAsh }],
                blood: { r: 210, g: 125, b: 20 },
                canCauseStatus: [StatusType.Bleeding],
                spawnMalignity: 32000,
                malignity: -500,
                makeNoise: true
            });
            this.creaturePool = [this.creatureBear, this.creatureRabbit, this.creatureCloudling, this.creatureLightningElemental];
        }
        onNimbus(item) {
            this.setFlying(!this.data.flying, true);
        }
        onGatherRainbow(item) {
            let tile = game.getTileInFrontOfPlayer();
            let tileType = Utilities.TileHelpers.getType(tile);
            if (tileType === this.terrainRainbow) {
                ui.displayMessage(this.messageGatheredRainbow);
                game.particle.create(player.x + player.direction.x, player.y + player.direction.y, { r: 12, g: 128, b: 247 });
                let newItem = Item.create(this.itemRainbowGlassBottle, item.quality);
                newItem.decay = item.decay;
                newItem.minDur = item.minDur;
                newItem.maxDur = item.maxDur;
                Item.remove(item);
                game.changeTile({ type: this.terrainCloud }, player.x + player.direction.x, player.y + player.direction.y, player.z, false);
                game.passTurn();
            }
            else {
                ui.displayMessage(this.messageNoRainbow);
            }
        }
        canConsumeItem(itemType, actionType) {
            if (itemType === this.itemRainbowGlassBottle && actionType === ActionType.Drink) {
                player.gender = player.gender === Gender.Male ? Gender.Female : Gender.Male;
                return true;
            }
            return undefined;
        }
        onSpawnCreatureFromGroup(creatureGroup, creaturePool, x, y, z) {
            if (z !== Mod.troposphereZ) {
                return undefined;
            }
            creaturePool.push.apply(creaturePool, this.creaturePool);
        }
        canCreatureMove(creatureId, creature, tile) {
            if (tile && Utilities.TileHelpers.getType(tile) === this.terrainHole) {
                return creature.type !== this.creatureBear && creature.type !== this.creatureRabbit;
            }
        }
        canCreatureAttack(creatureId, creature) {
            if (creature.type !== this.creatureSprite) {
                return;
            }
            let creatureObj = creature;
            creatureObj.justAttacked = true;
        }
        canSeeCreature(creatureId, creature, tile) {
            if (creature.type !== this.creatureSprite) {
                return;
            }
            let creatureObj = creature;
            if (creatureObj.justAttacked) {
                creatureObj.justAttacked = undefined;
                return;
            }
            if (creatureObj.nextVisibleCount === undefined || creatureObj.nextVisibleCount === 0) {
                creatureObj.nextVisibleCount = Utilities.Random.randomFromInterval(1, 6);
                return;
            }
            creatureObj.nextVisibleCount--;
            return false;
        }
        setFlying(flying, passTurn) {
            let z = !flying ? Z_NORMAL : Mod.troposphereZ;
            let openTile = this.findOpenTile(z);
            if (openTile === null || player.z === Z_CAVE) {
                if (passTurn) {
                    ui.displayMessage(flying ? this.messageFlewToTroposphereFailure : this.messageFlewToLandFailure, MessageType.Bad);
                }
                return false;
            }
            this.data.flying = flying;
            player.x = openTile.x;
            player.y = openTile.y;
            game.raft = null;
            game.setPlayerZ(z);
            if (passTurn) {
                ui.displayMessage(flying ? this.messageFlewToTroposphere : this.messageFlewToLand, MessageType.Good);
                game.passTurn();
            }
            return true;
        }
        findOpenTile(z) {
            let q = [{ x: player.x, y: player.y }];
            let visited = [];
            let tilesChecked = 0;
            let indexPoint = (point) => {
                return `${point.x},${point.y}`;
            };
            while (q.length > 0) {
                let point = q.pop();
                let tile = game.getTile(point.x, point.y, z);
                if (!tile) {
                    continue;
                }
                if (this.isFlyableTile(tile)) {
                    return point;
                }
                for (let i = 0; i < 4; i++) {
                    let neighbor = { x: point.x, y: point.y };
                    switch (i) {
                        case 0:
                            neighbor.x++;
                            break;
                        case 1:
                            neighbor.x--;
                            break;
                        case 2:
                            neighbor.y++;
                            break;
                        case 3:
                            neighbor.y--;
                            break;
                    }
                    if (visited.indexOf(indexPoint(neighbor)) > -1) {
                        continue;
                    }
                    visited.push(indexPoint(neighbor));
                    q.push(neighbor);
                }
                tilesChecked++;
            }
            return null;
        }
        isFlyableTile(tile) {
            if (tile.creatureId !== undefined && tile.creatureId !== null) {
                return false;
            }
            if (tile.doodadId !== undefined && tile.doodadId !== null) {
                return false;
            }
            let terrainType = Utilities.TileHelpers.getType(tile);
            if (terrainType === this.terrainHole) {
                return false;
            }
            let terrainInfo = Terrain.defines[terrainType];
            return !terrainInfo || (terrainInfo.water || terrainInfo.passable);
        }
    }
    Mod.troposphereZ = Z_MAX + 1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = Mod;
});
//# sourceMappingURL=troposphere.js.map