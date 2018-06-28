var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "creature/ICreature", "entity/IEntity", "Enums", "item/Items", "language/IMessages", "language/Messages", "mod/IHookHost", "mod/Mod", "player/IMessageManager", "tile/Terrains", "utilities/enum/Enums", "utilities/math/Math2", "utilities/Random", "utilities/TileHelpers"], function (require, exports, ICreature_1, IEntity_1, Enums_1, Items_1, IMessages_1, Messages_1, IHookHost_1, Mod_1, IMessageManager_1, Terrains_1, Enums_2, Math2_1, Random_1, TileHelpers_1) {
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
            this.initializeDoodads();
            this.initializeItems();
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
        initializeItems() {
            const actionTypeFly = this.addActionType({
                name: "Fly",
                description: "Fly to and from the Troposphere."
            }, (player, argument, result) => this.onNimbus(player, argument.item));
            const actionTypeGatherRainbow = this.addActionType({
                name: "Gather Rainbow",
                description: "Gather a rainbow with a container."
            }, (player, argument, result) => this.onGatherRainbow(player, argument.item));
            this.itemRainbow = this.addItem({
                description: "A magical rainbow.",
                name: "rainbow",
                prefix: "a ",
                weight: 0.1,
                use: [Enums_1.ActionType.DrinkItem, Enums_1.ActionType.Build],
                onUse: {
                    [Enums_1.ActionType.Build]: this.doodadRainbow
                }
            });
            this.itemRainbowGlassBottle = this.addItem({
                description: "A magical rainbow in a glass bottle.",
                name: "glass bottle filled with a rainbow",
                prefix: "a ",
                weight: 1.0,
                use: [Enums_1.ActionType.DrinkItem],
                returnOnUse: [Enums_1.ItemType.GlassBottle, false]
            });
            this.itemSnowflakes = this.addItem({
                description: "A couple of snowflakes.",
                name: "snowflakes",
                weight: 0.1
            });
            this.itemCloudstone = this.addItem({
                description: "A cloudstone.",
                name: "cloudstone",
                prefix: "a ",
                weight: 1
            });
            this.itemNimbus = this.addItem({
                description: "The flying nimbus.",
                name: "nimbus",
                prefix: "a ",
                use: [actionTypeFly],
                recipe: {
                    components: [
                        Items_1.RecipeComponent(Enums_1.ItemType.Feather, 2, 2, 2),
                        Items_1.RecipeComponent(this.itemCloudstone, 1, 1, 1),
                        Items_1.RecipeComponent(this.itemSnowflakes, 1, 1, 1)
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
                name: "cloud boulder",
                prefix: "a ",
                particles: { r: 176, g: 153, b: 134 }
            });
            this.doodadStormBoulder = this.addDoodad({
                name: "storm boulder",
                prefix: "a ",
                particles: { r: 176, g: 153, b: 134 }
            });
            this.doodadRainbow = this.addDoodad({
                name: "rainbow",
                prefix: "a ",
                particles: { r: 176, g: 153, b: 134 },
                blockMove: true
            });
        }
        initializeTerrain() {
            this.terrainCloudWater = this.addTerrain({
                name: "cloud water",
                passable: true,
                shallowWater: true,
                particles: { r: 47, g: 128, b: 157 },
                freshWater: true,
                noBackground: true
            });
            this.terrainCloud = this.addTerrain({
                name: "clouds",
                passable: true,
                particles: { r: 250, g: 250, b: 250 },
                noBackground: true
            });
            this.terrainCloudBoulder = this.addTerrain({
                name: "cloud boulder",
                prefix: "a ",
                particles: { r: 250, g: 250, b: 250 },
                gatherSkillUse: Enums_1.SkillType.Lumberjacking,
                gather: true,
                noLos: true,
                sound: Enums_1.SfxType.TreeHit,
                leftOver: this.terrainCloudWater,
                noGfxSwitch: true,
                noBackground: true,
                doodad: this.doodadCloudBoulder
            }, this.terrainCloud);
            this.addTerrainResource(this.terrainCloudBoulder, [
                { type: this.itemCloudstone }
            ]);
            this.terrainCloudstone = this.addTerrain({
                name: "cloudstone",
                particles: { r: 250, g: 250, b: 250 },
                gatherSkillUse: Enums_1.SkillType.Mining,
                gather: true,
                noLos: true,
                sound: Enums_1.SfxType.RockHit,
                leftOver: this.terrainCloud,
                noGfxSwitch: true,
                isMountain: true,
                noBackground: true
            });
            this.addTerrainResource(this.terrainCloudstone, [
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone, chance: 45 },
                { type: this.itemCloudstone }
            ]);
            this.terrainStorm = this.addTerrain({
                name: "storm",
                prefix: "a ",
                passable: true,
                particles: { r: 20, g: 20, b: 20 },
                noBackground: true
            });
            this.terrainStormBoulder = this.addTerrain({
                name: "storm boulder",
                prefix: "a ",
                particles: { r: 20, g: 20, b: 20 },
                gatherSkillUse: Enums_1.SkillType.Lumberjacking,
                gather: true,
                noLos: true,
                sound: Enums_1.SfxType.TreeHit,
                leftOver: this.terrainCloudWater,
                noGfxSwitch: true,
                noBackground: true,
                doodad: this.doodadStormBoulder
            }, this.terrainStorm);
            this.addTerrainResource(this.terrainStormBoulder, [
                { type: this.itemCloudstone },
                { type: this.itemCloudstone, chance: 45 },
                { type: this.itemCloudstone }
            ]);
            this.terrainStormstone = this.addTerrain({
                name: "stormstone",
                particles: { r: 20, g: 20, b: 20 },
                gatherSkillUse: Enums_1.SkillType.Mining,
                gather: true,
                noLos: true,
                sound: Enums_1.SfxType.RockHit,
                leftOver: this.terrainStorm,
                noGfxSwitch: true,
                isMountain: true,
                noBackground: true
            });
            this.addTerrainResource(this.terrainStormstone, [
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone },
                { type: this.itemCloudstone, chance: 45 },
                { type: this.itemCloudstone }
            ]);
            this.terrainHole = this.addTerrain({
                name: "hole",
                prefix: "a ",
                passable: true,
                particles: { r: 250, g: 250, b: 250 },
                noBackground: true
            });
        }
        initializeCreatures() {
            this.creatureBear = this.addCreature({
                name: "cloud bear",
                prefix: "a ",
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
                        item: this.itemRainbow,
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
            });
            this.creatureRabbit = this.addCreature({
                name: "cloud rabbit",
                prefix: "a ",
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
                loot: [{ item: this.itemSnowflakes }]
            }, {
                resource: [
                    { item: Enums_1.ItemType.Cotton },
                    { item: Enums_1.ItemType.RawMeat },
                    { item: Enums_1.ItemType.Offal },
                    { item: Enums_1.ItemType.BoneFragments }
                ],
                decay: 2400,
                skill: Enums_1.SkillType.Anatomy
            });
            this.creatureCloudling = this.addCreature({
                name: "cloudling",
                prefix: "a ",
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
                        item: this.itemSnowflakes,
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
            });
            this.creatureLightningElemental = this.addCreature({
                name: "lightning elemental",
                prefix: "a ",
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
                skill: Enums_1.SkillType.Mining,
                name: "fulgurite",
                prefix: "a "
            });
            this.creatureSprite = this.addCreature({
                name: "sprite",
                prefix: "a ",
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
                blood: false,
                name: "ethereal mist",
                prefix: ""
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
            const tileDoodad = tile.doodad;
            if (!tileDoodad || tileDoodad.type !== this.doodadRainbow) {
                player.messages.source(IMessageManager_1.Source.Action)
                    .send(this.messageNoRainbow);
                return;
            }
            player.messages.source(IMessageManager_1.Source.Action, IMessageManager_1.Source.Resource)
                .send(this.messageGatheredRainbow);
            game.particle.create(player.x + player.direction.x, player.y + player.direction.y, player.z, { r: 12, g: 128, b: 247 });
            if (item) {
                item.changeInto(this.itemRainbowGlassBottle);
            }
            doodadManager.remove(tileDoodad);
            game.passTurn(player);
        }
        setFlying(player, flying, passTurn) {
            const z = !flying ? Enums_1.WorldZ.Overworld : Troposphere.troposphereZ;
            const openTile = TileHelpers_1.default.findMatchingTile(player, this.isFlyableTile.bind(this));
            if (openTile === undefined || player.z === Enums_1.WorldZ.Cave) {
                if (passTurn) {
                    player.messages.source(IMessageManager_1.Source.Action)
                        .send(flying ? this.messageFlewToTroposphereFailure : this.messageFlewToLandFailure, IMessages_1.MessageType.Bad);
                }
                return false;
            }
            player.x = openTile.x;
            player.y = openTile.y;
            player.z = z;
            player.raft = undefined;
            player.skillGain(this.skillFlying);
            if (passTurn) {
                player.messages.source(IMessageManager_1.Source.Action, IMessageManager_1.Source.Item)
                    .send(flying ? this.messageFlewToTroposphere : this.messageFlewToLand, IMessages_1.MessageType.Good);
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
            const scrollX = Math2_1.default.lerp(localPlayer.fromX, localPlayer.x, localPlayer.movementProgress);
            const scrollY = Math2_1.default.lerp(localPlayer.fromY, localPlayer.y, localPlayer.movementProgress);
            renderer.layers[Enums_1.WorldZ.Overworld].renderFullbright(scrollX, scrollY, tileScale, viewWidth, viewHeight, false);
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
                player.messages.source(IMessageManager_1.Source.Wellbeing)
                    .type(IMessages_1.MessageType.Bad)
                    .send(this.messageFellToLand);
                const flyingSkill = player.skills[this.skillFlying];
                const damagePercentage = flyingSkill ? 1 - (flyingSkill.percent / 100) : 1;
                const tile = game.getTile(player.x, player.y, player.z);
                const terrainType = TileHelpers_1.default.getType(tile);
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
        canConsumeItem(player, itemType, actionType) {
            if (itemType === this.itemRainbowGlassBottle && actionType === Enums_1.ActionType.DrinkItem) {
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
    }
    Troposphere.troposphereZ = Enums_1.WorldZ.Max + 1;
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
    exports.default = Troposphere;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJvcG9zcGhlcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUcm9wb3NwaGVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7SUF5QkEsaUJBQWlDLFNBQVEsYUFBRztRQTZDcEMsWUFBWSxDQUFDLGNBQW1CLElBQVMsQ0FBQztRQUUxQyxNQUFNLENBQUMsSUFBUztZQUN0QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUVqQixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUM1QixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUc7b0JBQ1gsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFO2lCQUMxQixDQUFDO2FBQ0Y7WUFFRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFFM0IsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsOEJBQThCLENBQUMsQ0FBQztZQUNyRyxJQUFJLENBQUMsK0JBQStCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQywwQkFBMEIsRUFBRSx5RUFBeUUsQ0FBQyxDQUFDO1lBQzlKLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1lBQ2pGLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixFQUFFLG1FQUFtRSxDQUFDLENBQUM7WUFDMUksSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUks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