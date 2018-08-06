var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "creature/ICreature", "entity/IEntity", "Enums", "item/Items", "language/IMessages", "language/Messages", "mod/IHookHost", "mod/Mod", "mod/ModRegistry", "player/IMessageManager", "tile/Terrains", "utilities/enum/Enums", "utilities/math/Math2", "utilities/math/Vector3", "utilities/Random", "utilities/TileHelpers"], function (require, exports, ICreature_1, IEntity_1, Enums_1, Items_1, IMessages_1, Messages_1, IHookHost_1, Mod_1, ModRegistry_1, IMessageManager_1, Terrains_1, Enums_2, Math2_1, Vector3_1, Random_1, TileHelpers_1) {
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
                prefix: "the ",
                use: [ModRegistry_1.Registry.id(this.onNimbus)],
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
                glassBottle.use.push(ModRegistry_1.Registry.id(this.onGatherRainbow));
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
        onNimbus(player, argument) {
            this.setFlying(player, player.z !== Troposphere.troposphereZ, true);
            if (argument.item) {
                argument.item.damage(argument.type.toString());
            }
        }
        onGatherRainbow(player, argument) {
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
            if (argument.item) {
                argument.item.changeInto(this.itemRainbowGlassBottle);
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
            player.notes.write(this.flyingNote, {
                hasHair: localPlayer.customization.hairStyle !== "None"
            });
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
                let damage = -40;
                const flyingSkill = player.skills[this.skillFlying];
                damage *= flyingSkill ? 1 - (flyingSkill.percent / 100) : 1;
                const tile = game.getTile(player.x, player.y, player.z);
                const terrainType = TileHelpers_1.default.getType(tile);
                if (terrainType === Enums_1.TerrainType.DeepFreshWater || terrainType === Enums_1.TerrainType.DeepSeawater) {
                    damage *= .5;
                }
                else if (terrainType === Enums_1.TerrainType.FreshWater || terrainType === Enums_1.TerrainType.Seawater) {
                    damage *= .75;
                }
                damage = player.damage(damage, Messages_1.messages[this.messageDeathByFalling]);
                player.messages.source(IMessageManager_1.Source.Wellbeing)
                    .type(IMessages_1.MessageType.Bad)
                    .send(this.messageFellToLand, damage);
                if (damage > 25 || damage > 15 && Random_1.default.chance(.5)) {
                    corpseManager.create(tileAtlas.isWater(terrainType) ? Enums_1.CreatureType.WaterBlood : Enums_1.CreatureType.Blood, player.x, player.y, player.z);
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
        getFogColor(color) {
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
            return color;
        }
        isTileBlocked(tile) {
            return TileHelpers_1.default.getType(tile) === this.terrainHole;
        }
    }
    Troposphere.troposphereZ = Enums_1.WorldZ.Max + 1;
    __decorate([
        ModRegistry_1.default.helpArticle("Flying", {
            image: true,
            section: "Troposphere"
        })
    ], Troposphere.prototype, "flyingHelpArticle", void 0);
    __decorate([
        ModRegistry_1.default.note("Flying", {
            learnMore: ModRegistry_1.registry().get("flyingHelpArticle")
        })
    ], Troposphere.prototype, "flyingNote", void 0);
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
        ModRegistry_1.default.action({
            name: "Fly",
            description: "Fly to and from the Troposphere."
        })
    ], Troposphere.prototype, "onNimbus", null);
    __decorate([
        ModRegistry_1.default.action({
            name: "Gather Rainbow",
            description: "Gather a rainbow with a container."
        })
    ], Troposphere.prototype, "onGatherRainbow", null);
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
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "getFogColor", null);
    __decorate([
        IHookHost_1.HookMethod
    ], Troposphere.prototype, "isTileBlocked", null);
    exports.default = Troposphere;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJvcG9zcGhlcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUcm9wb3NwaGVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7SUE0QkEsTUFBcUIsV0FBWSxTQUFRLGFBQUc7UUF3RHBDLFlBQVksQ0FBQyxjQUFtQixJQUFTLENBQUM7UUFFMUMsTUFBTSxDQUFDLElBQVM7WUFDdEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7WUFFakIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDNUIsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO2dCQUNuQixJQUFJLENBQUMsSUFBSSxHQUFHO29CQUNYLElBQUksRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRTtpQkFDMUIsQ0FBQzthQUNGO1lBRUQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzVCLENBQUM7UUFFTSxRQUFRO1lBQ2QsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzdELElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ25DLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDdEI7UUFDRixDQUFDO1FBRU0sTUFBTTtZQUNaLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztRQUNsQixDQUFDO1FBS00sZUFBZTtZQUNyQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7Z0JBQy9CLFdBQVcsRUFBRSxvQkFBb0I7Z0JBQ2pDLElBQUksRUFBRSxTQUFTO2dCQUNmLE1BQU0sRUFBRSxJQUFJO2dCQUNaLE1BQU0sRUFBRSxHQUFHO2dCQUNYLEdBQUcsRUFBRSxDQUFDLGtCQUFVLENBQUMsU0FBUyxFQUFFLGtCQUFVLENBQUMsS0FBSyxDQUFDO2dCQUM3QyxLQUFLLEVBQUU7b0JBQ04sQ0FBQyxrQkFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhO2lCQUN0QzthQUNELENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUMxQyxXQUFXLEVBQUUsc0NBQXNDO2dCQUNuRCxJQUFJLEVBQUUsb0NBQW9DO2dCQUMxQyxNQUFNLEVBQUUsSUFBSTtnQkFDWixNQUFNLEVBQUUsR0FBRztnQkFDWCxHQUFHLEVBQUUsQ0FBQyxrQkFBVSxDQUFDLFNBQVMsQ0FBQztnQkFDM0IsV0FBVyxFQUFFLENBQUMsZ0JBQVEsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDO2FBQzFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDbEMsV0FBVyxFQUFFLHlCQUF5QjtnQkFDdEMsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLE1BQU0sRUFBRSxHQUFHO2FBQ1gsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUNsQyxXQUFXLEVBQUUsZUFBZTtnQkFDNUIsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLE1BQU0sRUFBRSxJQUFJO2dCQUNaLE1BQU0sRUFBRSxDQUFDO2FBQ1QsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUM5QixXQUFXLEVBQUUsb0JBQW9CO2dCQUNqQyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxNQUFNLEVBQUUsTUFBTTtnQkFDZCxHQUFHLEVBQUUsQ0FBQyxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2pDLE1BQU0sRUFBRTtvQkFDUCxVQUFVLEVBQUU7d0JBQ1gsdUJBQWUsQ0FBQyxnQkFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDMUMsdUJBQWUsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUM3Qyx1QkFBZSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQzdDO29CQUNELEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVztvQkFDdkIsS0FBSyxFQUFFLG1CQUFXLENBQUMsTUFBTTtvQkFDekIsVUFBVSxFQUFFLEVBQUU7aUJBQ2Q7Z0JBQ0QsV0FBVyxFQUFFLElBQUk7YUFDakIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzdELElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ25DLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO2FBQ3hEO1FBQ0YsQ0FBQztRQUVNLGlCQUFpQjtZQUN2QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDeEMsSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLE1BQU0sRUFBRSxJQUFJO2dCQUNaLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO2FBQ3JDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUN4QyxJQUFJLEVBQUUsZUFBZTtnQkFDckIsTUFBTSxFQUFFLElBQUk7Z0JBQ1osU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7YUFDckMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQyxJQUFJLEVBQUUsU0FBUztnQkFDZixNQUFNLEVBQUUsSUFBSTtnQkFDWixTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFDckMsU0FBUyxFQUFFLElBQUk7YUFDZixDQUFDLENBQUM7UUFDSixDQUFDO1FBRU0saUJBQWlCO1lBQ3ZCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUN4QyxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO2dCQUNwQyxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsWUFBWSxFQUFFLElBQUk7YUFDbEIsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUNuQyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxRQUFRLEVBQUUsSUFBSTtnQkFDZCxTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFDckMsWUFBWSxFQUFFLElBQUk7YUFDbEIsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQzFDLElBQUksRUFBRSxlQUFlO2dCQUNyQixNQUFNLEVBQUUsSUFBSTtnQkFDWixTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFDckMsY0FBYyxFQUFFLGlCQUFTLENBQUMsYUFBYTtnQkFDdkMsTUFBTSxFQUFFLElBQUk7Z0JBQ1osS0FBSyxFQUFFLElBQUk7Z0JBQ1gsS0FBSyxFQUFFLGVBQU8sQ0FBQyxPQUFPO2dCQUN0QixRQUFRLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtnQkFDaEMsV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLFlBQVksRUFBRSxJQUFJO2dCQUNsQixNQUFNLEVBQUUsSUFBSSxDQUFDLGtCQUFrQjthQUMvQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUV0QixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFO2dCQUNqRCxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFO2FBQzdCLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUN4QyxJQUFJLEVBQUUsWUFBWTtnQkFDbEIsU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7Z0JBQ3JDLGNBQWMsRUFBRSxpQkFBUyxDQUFDLE1BQU07Z0JBQ2hDLE1BQU0sRUFBRSxJQUFJO2dCQUNaLEtBQUssRUFBRSxJQUFJO2dCQUNYLEtBQUssRUFBRSxlQUFPLENBQUMsT0FBTztnQkFDdEIsUUFBUSxFQUFFLElBQUksQ0FBQyxZQUFZO2dCQUMzQixXQUFXLEVBQUUsSUFBSTtnQkFDakIsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLFlBQVksRUFBRSxJQUFJO2FBQ2xCLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUU7Z0JBQy9DLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQzdCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQzdCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQzdCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQzdCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQzdCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQzdCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtnQkFDekMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRTthQUM3QixDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQ25DLElBQUksRUFBRSxPQUFPO2dCQUNiLE1BQU0sRUFBRSxJQUFJO2dCQUNaLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUNsQyxZQUFZLEVBQUUsSUFBSTthQUNsQixDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDMUMsSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLE1BQU0sRUFBRSxJQUFJO2dCQUNaLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUNsQyxjQUFjLEVBQUUsaUJBQVMsQ0FBQyxhQUFhO2dCQUN2QyxNQUFNLEVBQUUsSUFBSTtnQkFDWixLQUFLLEVBQUUsSUFBSTtnQkFDWCxLQUFLLEVBQUUsZUFBTyxDQUFDLE9BQU87Z0JBQ3RCLFFBQVEsRUFBRSxJQUFJLENBQUMsaUJBQWlCO2dCQUNoQyxXQUFXLEVBQUUsSUFBSTtnQkFDakIsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLE1BQU0sRUFBRSxJQUFJLENBQUMsa0JBQWtCO2FBQy9CLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBRXRCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUU7Z0JBQ2pELEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQzdCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtnQkFDekMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRTthQUM3QixDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDeEMsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUNsQyxjQUFjLEVBQUUsaUJBQVMsQ0FBQyxNQUFNO2dCQUNoQyxNQUFNLEVBQUUsSUFBSTtnQkFDWixLQUFLLEVBQUUsSUFBSTtnQkFDWCxLQUFLLEVBQUUsZUFBTyxDQUFDLE9BQU87Z0JBQ3RCLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWTtnQkFDM0IsV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixZQUFZLEVBQUUsSUFBSTthQUNsQixDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFO2dCQUMvQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUM3QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUM3QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUM3QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUM3QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUM3QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUM3QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUM3QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUM3QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUM3QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUM3QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7Z0JBQ3pDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUU7YUFDN0IsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUNsQyxJQUFJLEVBQUUsTUFBTTtnQkFDWixNQUFNLEVBQUUsSUFBSTtnQkFDWixRQUFRLEVBQUUsSUFBSTtnQkFDZCxTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFDckMsWUFBWSxFQUFFLElBQUk7YUFDbEIsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVNLG1CQUFtQjtZQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7Z0JBQ3BDLElBQUksRUFBRSxZQUFZO2dCQUNsQixNQUFNLEVBQUUsSUFBSTtnQkFDWixLQUFLLEVBQUUsRUFBRTtnQkFDVCxLQUFLLEVBQUUsRUFBRTtnQkFDVCxNQUFNLEVBQUUsQ0FBQztnQkFDVCxNQUFNLEVBQUUsRUFBRTtnQkFDVixPQUFPLEVBQUUsSUFBSSxlQUFPLENBQUMsQ0FBQyxFQUNyQixJQUFJLG1CQUFXLENBQ2Qsa0JBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUN0QixrQkFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQ25CLEVBQ0QsSUFBSSx1QkFBZSxFQUFFLENBQ3JCO2dCQUNELFVBQVUsRUFBRSxrQkFBVSxDQUFDLFFBQVEsR0FBRyxrQkFBVSxDQUFDLEtBQUs7Z0JBQ2xELEVBQUUsRUFBRSxnQkFBTSxDQUFDLE9BQU87Z0JBQ2xCLFFBQVEsRUFBRSxnQkFBUSxDQUFDLElBQUksR0FBRyxnQkFBUSxDQUFDLFlBQVksR0FBRyxnQkFBUSxDQUFDLEtBQUssR0FBRyxnQkFBUSxDQUFDLFlBQVk7Z0JBQ3hGLGNBQWMsRUFBRSxDQUFDLGtCQUFVLENBQUMsUUFBUSxDQUFDO2dCQUNyQyxVQUFVLEVBQUUsMEJBQWMsQ0FBQyxJQUFJO2dCQUMvQixlQUFlLEVBQUUsS0FBSztnQkFDdEIsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsSUFBSSxFQUFFLENBQUM7d0JBQ04sSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXO3dCQUN0QixNQUFNLEVBQUUsRUFBRTtxQkFDVixDQUFDO2FBQ0YsRUFBRTtnQkFDRCxRQUFRLEVBQUU7b0JBQ1QsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxNQUFNLEVBQUU7b0JBQ3pCLEVBQUUsSUFBSSxFQUFFLGdCQUFRLENBQUMsVUFBVSxFQUFFO29CQUM3QixFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLFNBQVMsRUFBRTtvQkFDNUIsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxPQUFPLEVBQUU7b0JBQzFCLEVBQUUsSUFBSSxFQUFFLGdCQUFRLENBQUMsT0FBTyxFQUFFO29CQUMxQixFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLFdBQVcsRUFBRTtvQkFDOUIsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxLQUFLLEVBQUU7b0JBQ3hCLEVBQUUsSUFBSSxFQUFFLGdCQUFRLENBQUMsSUFBSSxFQUFFO29CQUN2QixFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLGFBQWEsRUFBRTtpQkFDaEM7Z0JBQ0QsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsS0FBSyxFQUFFLGlCQUFTLENBQUMsT0FBTzthQUN4QixDQUFDLENBQUM7WUFFSixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7Z0JBQ3RDLElBQUksRUFBRSxjQUFjO2dCQUNwQixNQUFNLEVBQUUsSUFBSTtnQkFDWixLQUFLLEVBQUUsQ0FBQztnQkFDUixLQUFLLEVBQUUsQ0FBQztnQkFDUixNQUFNLEVBQUUsQ0FBQztnQkFDVCxNQUFNLEVBQUUsQ0FBQztnQkFDVCxPQUFPLEVBQUUsSUFBSSxlQUFPLENBQUMsQ0FBQyxFQUNyQixJQUFJLG1CQUFXLEVBQUUsRUFDakIsSUFBSSx1QkFBZSxFQUFFLENBQ3JCO2dCQUNELFVBQVUsRUFBRSxrQkFBVSxDQUFDLFFBQVE7Z0JBQy9CLEVBQUUsRUFBRSxnQkFBTSxDQUFDLE1BQU07Z0JBQ2pCLFFBQVEsRUFBRSxnQkFBUSxDQUFDLElBQUksR0FBRyxnQkFBUSxDQUFDLFlBQVk7Z0JBQy9DLFVBQVUsRUFBRSwwQkFBYyxDQUFDLElBQUk7Z0JBQy9CLFVBQVUsRUFBRSxDQUFDLEdBQUc7Z0JBQ2hCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLFFBQVEsRUFBRSxJQUFJO2dCQUNkLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQzthQUNyQyxFQUFFO2dCQUNELFFBQVEsRUFBRTtvQkFDVCxFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLE1BQU0sRUFBRTtvQkFDekIsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxPQUFPLEVBQUU7b0JBQzFCLEVBQUUsSUFBSSxFQUFFLGdCQUFRLENBQUMsS0FBSyxFQUFFO29CQUN4QixFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLGFBQWEsRUFBRTtpQkFDaEM7Z0JBQ0QsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsS0FBSyxFQUFFLGlCQUFTLENBQUMsT0FBTzthQUN4QixDQUFDLENBQUM7WUFFSixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztnQkFDekMsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLE1BQU0sRUFBRSxJQUFJO2dCQUNaLEtBQUssRUFBRSxDQUFDO2dCQUNSLEtBQUssRUFBRSxDQUFDO2dCQUNSLE1BQU0sRUFBRSxDQUFDO2dCQUNULE1BQU0sRUFBRSxDQUFDO2dCQUNULE9BQU8sRUFBRSxJQUFJLGVBQU8sQ0FBQyxDQUFDLEVBQ3JCLElBQUksbUJBQVcsQ0FDZCxrQkFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQ3RCLEVBQ0QsSUFBSSx1QkFBZSxDQUNsQixrQkFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQ25CLENBQ0Q7Z0JBQ0QsVUFBVSxFQUFFLGtCQUFVLENBQUMsUUFBUTtnQkFDL0IsRUFBRSxFQUFFLGdCQUFNLENBQUMsT0FBTztnQkFDbEIsUUFBUSxFQUFFLGdCQUFRLENBQUMsTUFBTTtnQkFDekIsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsVUFBVSxFQUFFLDBCQUFjLENBQUMsSUFBSTtnQkFDL0IsSUFBSSxFQUFFO29CQUNMO3dCQUNDLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYzt3QkFDekIsTUFBTSxFQUFFLEVBQUU7cUJBQ1Y7b0JBQ0QsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxPQUFPLEVBQUU7aUJBQzFCO2dCQUNELFNBQVMsRUFBRSxxQkFBYSxDQUFDLEdBQUc7YUFDNUIsRUFBRTtnQkFDRCxRQUFRLEVBQUU7b0JBQ1QsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxPQUFPLEVBQUU7b0JBQzFCLEVBQUUsSUFBSSxFQUFFLGdCQUFRLENBQUMsT0FBTyxFQUFFO29CQUMxQixFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO29CQUMxQyxFQUFFLElBQUksRUFBRSxnQkFBUSxDQUFDLFVBQVUsRUFBRTtvQkFDN0IsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxhQUFhLEVBQUU7aUJBQ2hDO2dCQUNELEtBQUssRUFBRSxJQUFJO2dCQUNYLEtBQUssRUFBRSxpQkFBUyxDQUFDLE9BQU87YUFDeEIsQ0FBQyxDQUFDO1lBRUosSUFBSSxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7Z0JBQ2xELElBQUksRUFBRSxxQkFBcUI7Z0JBQzNCLE1BQU0sRUFBRSxJQUFJO2dCQUNaLEtBQUssRUFBRSxFQUFFO2dCQUNULEtBQUssRUFBRSxFQUFFO2dCQUNULE1BQU0sRUFBRSxFQUFFO2dCQUNWLE1BQU0sRUFBRSxFQUFFO2dCQUNWLE9BQU8sRUFBRSxJQUFJLGVBQU8sQ0FBQyxDQUFDLEVBQ3JCLElBQUksbUJBQVcsQ0FDZCxrQkFBVSxDQUFDLElBQUksRUFBRSxHQUFHLENBQ3BCLEVBQ0QsSUFBSSx1QkFBZSxFQUFFLENBQ3JCO2dCQUNELFVBQVUsRUFBRSxrQkFBVSxDQUFDLElBQUksR0FBRyxrQkFBVSxDQUFDLEtBQUs7Z0JBQzlDLEVBQUUsRUFBRSxnQkFBTSxDQUFDLE9BQU87Z0JBQ2xCLFFBQVEsRUFBRSxnQkFBUSxDQUFDLE1BQU07Z0JBQ3pCLFVBQVUsRUFBRSwwQkFBYyxDQUFDLElBQUk7Z0JBQy9CLFNBQVMsRUFBRSxxQkFBYSxDQUFDLElBQUk7Z0JBQzdCLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3BDLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO2dCQUNqQyxhQUFhLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFDeEMsY0FBYyxFQUFFLENBQUMsa0JBQVUsQ0FBQyxRQUFRLENBQUM7Z0JBQ3JDLGVBQWUsRUFBRSxLQUFLO2dCQUN0QixVQUFVLEVBQUUsR0FBRztnQkFDZixTQUFTLEVBQUUsSUFBSTthQUNmLEVBQUU7Z0JBQ0QsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDeEMsS0FBSyxFQUFFLEdBQUc7Z0JBQ1YsS0FBSyxFQUFFLGlCQUFTLENBQUMsTUFBTTtnQkFDdkIsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLE1BQU0sRUFBRSxJQUFJO2FBQ1osQ0FBQyxDQUFDO1lBRUosSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO2dCQUN0QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxNQUFNLEVBQUUsSUFBSTtnQkFDWixLQUFLLEVBQUUsRUFBRTtnQkFDVCxLQUFLLEVBQUUsRUFBRTtnQkFDVCxNQUFNLEVBQUUsRUFBRTtnQkFDVixNQUFNLEVBQUUsRUFBRTtnQkFDVixPQUFPLEVBQUUsSUFBSSxlQUFPLENBQUMsQ0FBQyxFQUNyQixJQUFJLG1CQUFXLENBQ2Qsa0JBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUNwQixFQUNELElBQUksdUJBQWUsRUFBRSxDQUNyQjtnQkFDRCxVQUFVLEVBQUUsa0JBQVUsQ0FBQyxJQUFJLEdBQUcsa0JBQVUsQ0FBQyxLQUFLO2dCQUM5QyxFQUFFLEVBQUUsZ0JBQU0sQ0FBQyxPQUFPO2dCQUNsQixRQUFRLEVBQUUsZ0JBQVEsQ0FBQyxNQUFNO2dCQUN6QixVQUFVLEVBQUUsMEJBQWMsQ0FBQyxJQUFJO2dCQUMvQixTQUFTLEVBQUUscUJBQWEsQ0FBQyxJQUFJO2dCQUM3QixLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFDakMsY0FBYyxFQUFFLENBQUMsa0JBQVUsQ0FBQyxRQUFRLENBQUM7Z0JBQ3JDLGVBQWUsRUFBRSxLQUFLO2dCQUN0QixVQUFVLEVBQUUsR0FBRztnQkFDZixTQUFTLEVBQUUsSUFBSTthQUNmLEVBQUU7Z0JBQ0QsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsZ0JBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDeEMsS0FBSyxFQUFFLEdBQUc7Z0JBQ1YsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLE1BQU0sRUFBRSxFQUFFO2FBQ1YsQ0FBQyxDQUFDO1lBRUosSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDdkgsQ0FBQztRQUVNLGdCQUFnQjtZQUN0QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ3BDLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxxRUFBcUU7YUFDbEYsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQU1NLFFBQVEsQ0FBQyxNQUFlLEVBQUUsUUFBeUI7WUFDekQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsS0FBSyxXQUFXLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3BFLElBQUksUUFBUSxDQUFDLElBQUksRUFBRTtnQkFDbEIsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2FBQ2hEO1FBQ0YsQ0FBQztRQU1NLGVBQWUsQ0FBQyxNQUFlLEVBQUUsUUFBeUI7WUFDaEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDL0IsSUFBSSxDQUFDLFVBQVUsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxhQUFhLEVBQUU7Z0JBQzFELE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLHdCQUFNLENBQUMsTUFBTSxDQUFDO3FCQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQzlCLE9BQU87YUFDUDtZQUVELE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLHdCQUFNLENBQUMsTUFBTSxFQUFFLHdCQUFNLENBQUMsUUFBUSxDQUFDO2lCQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFFcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFeEgsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFO2dCQUNsQixRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQzthQUN0RDtZQUVELGFBQWEsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2QixDQUFDO1FBRU0sU0FBUyxDQUFDLE1BQWUsRUFBRSxNQUFlLEVBQUUsUUFBaUI7WUFDbkUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGNBQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUM7WUFFaEUsTUFBTSxRQUFRLEdBQUcscUJBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNyRixJQUFJLFFBQVEsS0FBSyxTQUFTLElBQUksTUFBTSxDQUFDLENBQUMsS0FBSyxjQUFNLENBQUMsSUFBSSxFQUFFO2dCQUN2RCxJQUFJLFFBQVEsRUFBRTtvQkFDYixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyx3QkFBTSxDQUFDLE1BQU0sQ0FBQzt5QkFDbkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsdUJBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdkc7Z0JBRUQsT0FBTyxLQUFLLENBQUM7YUFDYjtZQUVELE1BQU0sQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUN0QixNQUFNLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdEIsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFYixNQUFNLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQztZQUV4QixNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUVuQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNuQyxPQUFPLEVBQUUsV0FBVyxDQUFDLGFBQWEsQ0FBQyxTQUFTLEtBQUssTUFBTTthQUN2RCxDQUFDLENBQUM7WUFFSCxJQUFJLFFBQVEsRUFBRTtnQkFDYixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyx3QkFBTSxDQUFDLE1BQU0sRUFBRSx3QkFBTSxDQUFDLElBQUksQ0FBQztxQkFDaEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsdUJBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFMUYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUN0QjtZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVNLGFBQWEsQ0FBQyxLQUFlLEVBQUUsSUFBVztZQUNoRCxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDakMsT0FBTyxLQUFLLENBQUM7YUFDYjtZQUVELE1BQU0sV0FBVyxHQUFHLHFCQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLElBQUksV0FBVyxLQUFLLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ3JDLE9BQU8sS0FBSyxDQUFDO2FBQ2I7WUFFRCxNQUFNLFdBQVcsR0FBRyxrQkFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRTFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3JGLENBQUM7UUFFTSxXQUFXLENBQUMsSUFBWSxFQUFFLEtBQWEsRUFBRSxNQUFjLEVBQUUsUUFBZ0I7WUFDL0UsSUFBSSxJQUFJLFFBQVEsQ0FBQztZQUNqQixPQUFPLE1BQU0sR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxLQUFLLENBQUM7UUFDNUMsQ0FBQztRQU1NLGFBQWEsQ0FBQyxLQUFhO1lBQ2pDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFHTSx1QkFBdUIsQ0FBQyxnQkFBeUI7WUFFdkQsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDO1lBQ3pCLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDO1lBQzlCLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDO1lBRWhDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBRS9CLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQztZQUM5QixNQUFNLG9CQUFvQixHQUFHLE1BQU0sQ0FBQztZQUNwQyxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQztZQUNwQyxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQztZQUV6QyxJQUFJLElBQVcsQ0FBQztZQUNoQixJQUFJLFdBQW1CLENBQUM7WUFFeEIsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFekMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUN0QyxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFXLENBQUMsQ0FBQztvQkFFakgsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO29CQUNoQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsY0FBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUMzRCxNQUFNLGtCQUFrQixHQUFHLGtCQUFRLENBQUMscUJBQVcsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztvQkFDeEUsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBVyxDQUFDLEtBQUssQ0FBQztvQkFFbEcsUUFBUSxpQkFBaUIsRUFBRTt3QkFDMUIsS0FBSyxtQkFBVyxDQUFDLEtBQUssQ0FBQzt3QkFDdkIsS0FBSyxtQkFBVyxDQUFDLFNBQVM7NEJBQ3pCLFdBQVcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7NEJBQ3JDLE1BQU07d0JBRVAsS0FBSyxtQkFBVyxDQUFDLFlBQVksQ0FBQzt3QkFDOUIsS0FBSyxtQkFBVyxDQUFDLGNBQWM7NEJBQzlCLFdBQVcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7NEJBQ3JDLE1BQU07d0JBRVAsS0FBSyxtQkFBVyxDQUFDLFFBQVEsQ0FBQzt3QkFDMUIsS0FBSyxtQkFBVyxDQUFDLFVBQVUsQ0FBQzt3QkFDNUIsS0FBSyxtQkFBVyxDQUFDLGVBQWU7NEJBQy9CLElBQUksZ0JBQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxpQkFBaUIsRUFBRTtnQ0FDeEMsV0FBVyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQzs2QkFFdkM7aUNBQU07Z0NBQ04sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7NkJBQ2hDOzRCQUVELE1BQU07d0JBRVAsS0FBSyxtQkFBVyxDQUFDLGlCQUFpQjs0QkFDakMsSUFBSSxnQkFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLG1CQUFtQixFQUFFO2dDQUMxQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztnQ0FDaEMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDOzZCQUV6RTtpQ0FBTTtnQ0FDTixXQUFXLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDOzZCQUNyQzs0QkFFRCxNQUFNO3dCQUVQOzRCQUNDLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUM7NEJBQ3BDLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQ0FDL0IsSUFBSSxnQkFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLFlBQVksRUFBRTtvQ0FDbkMsV0FBVyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztpQ0FFdkM7cUNBQU07b0NBQ04sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7aUNBQ2hDOzZCQUVEO2lDQUFNO2dDQUNOLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDOzZCQUNoQzs0QkFFRCxNQUFNO3FCQUNQO29CQUVELElBQUksV0FBVyxLQUFLLElBQUksQ0FBQyxZQUFZLElBQUksV0FBVyxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUU7d0JBQzNFLElBQUksZ0JBQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxpQkFBaUIsRUFBRTs0QkFDeEMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7eUJBQy9CO3FCQUNEO29CQUVELElBQUksV0FBVyxLQUFLLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxXQUFXLEtBQUssSUFBSSxDQUFDLG1CQUFtQixFQUFFO3dCQUN6RixPQUFPLEdBQUcsZ0JBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQ3hCO29CQUVELElBQUksQ0FBQyxJQUFJLEdBQUcscUJBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztvQkFDM0QsSUFBSSxDQUFDLElBQUksR0FBRyxxQkFBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUN0RDthQUNEO1lBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUN0QyxXQUFXLEdBQUcscUJBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO29CQUVoRixJQUFJLGdCQUFnQixFQUFFO3dCQUNyQixRQUFRLFdBQVcsRUFBRTs0QkFDcEIsS0FBSyxJQUFJLENBQUMsWUFBWSxDQUFDOzRCQUN2QixLQUFLLElBQUksQ0FBQyxZQUFZO2dDQUNyQixNQUFNLE1BQU0sR0FBRyxnQkFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO2dDQUM5QixNQUFNLGNBQWMsR0FBRyxXQUFXLEtBQUssSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDO2dDQUNoSCxJQUFJLE1BQU0sSUFBSSxvQkFBb0IsRUFBRTtvQ0FDbkMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxjQUFjLENBQUMsQ0FBQztpQ0FFbkg7cUNBQU0sSUFBSSxNQUFNLElBQUksY0FBYyxFQUFFO29DQUNwQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztvQ0FDN0UsZUFBZSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxnQkFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLGNBQWMsQ0FBQyxDQUFDO2lDQUM1RztnQ0FFRCxNQUFNO3lCQUNQO3FCQUNEO2lCQUNEO2FBQ0Q7UUFDRixDQUFDO1FBR00sY0FBYyxDQUFDLFNBQWlCLEVBQUUsU0FBaUIsRUFBRSxVQUFrQjtZQUM3RSxJQUFJLFdBQVcsQ0FBQyxDQUFDLEtBQUssV0FBVyxDQUFDLFlBQVksRUFBRTtnQkFDL0MsT0FBTzthQUNQO1lBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUNqQixNQUFNLFlBQVksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsYUFBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzSSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsU0FBUyxHQUFHLElBQUksRUFBRSxTQUFTLEdBQUcsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNwRixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQzthQUV6QjtpQkFBTTtnQkFDTixTQUFTLElBQUksSUFBSSxDQUFDO2FBQ2xCO1lBRUQsTUFBTSxPQUFPLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDM0YsTUFBTSxPQUFPLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFFM0YsUUFBUSxDQUFDLE1BQU0sQ0FBQyxjQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvRyxDQUFDO1FBR00sWUFBWTtZQUNsQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7Z0JBQ2pCLE9BQU8sa0JBQVUsQ0FBQyxNQUFNLENBQUM7YUFDekI7UUFDRixDQUFDO1FBR00sV0FBVyxDQUFDLGFBQXNCO1lBQ3hDLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFFckMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUNuRDtRQUNGLENBQUM7UUFHTSxNQUFNLENBQUMsTUFBZSxFQUFFLEtBQWEsRUFBRSxLQUFhLEVBQUUsSUFBVyxFQUFFLFNBQW9CO1lBQzdGLElBQUksTUFBTSxDQUFDLENBQUMsS0FBSyxXQUFXLENBQUMsWUFBWSxFQUFFO2dCQUMxQyxPQUFPO2FBQ1A7WUFFRCxNQUFNLFdBQVcsR0FBRyxxQkFBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QyxJQUFJLFdBQVcsS0FBSyxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNyQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztnQkFNcEIsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUMzQjtRQUNGLENBQUM7UUFHTSxjQUFjLENBQUMsTUFBZTtZQUNwQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEtBQUssV0FBVyxDQUFDLFlBQVksRUFBRTtnQkFDMUMsT0FBTzthQUNQO1lBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztnQkFDckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUVyQyxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFFakIsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFNUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4RCxNQUFNLFdBQVcsR0FBRyxxQkFBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFOUMsSUFBSSxXQUFXLEtBQUssbUJBQVcsQ0FBQyxjQUFjLElBQUksV0FBVyxLQUFLLG1CQUFXLENBQUMsWUFBWSxFQUFFO29CQUMzRixNQUFNLElBQUksRUFBRSxDQUFDO2lCQUViO3FCQUFNLElBQUksV0FBVyxLQUFLLG1CQUFXLENBQUMsVUFBVSxJQUFJLFdBQVcsS0FBSyxtQkFBVyxDQUFDLFFBQVEsRUFBRTtvQkFDMUYsTUFBTSxJQUFJLEdBQUcsQ0FBQztpQkFDZDtnQkFFRCxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsbUJBQVEsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO2dCQUdyRSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyx3QkFBTSxDQUFDLFNBQVMsQ0FBQztxQkFDdEMsSUFBSSxDQUFDLHVCQUFXLENBQUMsR0FBRyxDQUFDO3FCQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUV2QyxJQUFJLE1BQU0sR0FBRyxFQUFFLElBQUksTUFBTSxHQUFHLEVBQUUsSUFBSSxnQkFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDcEQsYUFBYSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsb0JBQVksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDbEk7Z0JBRUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFLLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN2QyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3RCO1FBQ0YsQ0FBQztRQUdNLGNBQWMsQ0FBQyxNQUFlLEVBQUUsUUFBa0IsRUFBRSxVQUFzQjtZQUNoRixJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsc0JBQXNCLElBQUksVUFBVSxLQUFLLGtCQUFVLENBQUMsU0FBUyxFQUFFO2dCQUNwRixNQUFNLENBQUMsYUFBYSxHQUFHO29CQUN0QixTQUFTLEVBQUUsaUJBQVMsQ0FBQyxlQUFLLENBQUMsU0FBUyxDQUFDLGlCQUFTLENBQUMsQ0FBMkI7b0JBQzFFLFNBQVMsRUFBRSxpQkFBUyxDQUFDLGVBQUssQ0FBQyxTQUFTLENBQUMsaUJBQVMsQ0FBQyxDQUEyQjtvQkFDMUUsU0FBUyxFQUFFLGlCQUFTLENBQUMsZUFBSyxDQUFDLFNBQVMsQ0FBQyxpQkFBUyxDQUFDLENBQTJCO2lCQUMxRSxDQUFDO2dCQUNGLE9BQU8sSUFBSSxDQUFDO2FBQ1o7UUFDRixDQUFDO1FBR00sd0JBQXdCLENBQUMsYUFBeUIsRUFBRSxZQUE0QixFQUFFLENBQVMsRUFBRSxDQUFTLEVBQUUsQ0FBUztZQUN2SCxJQUFJLENBQUMsS0FBSyxXQUFXLENBQUMsWUFBWSxFQUFFO2dCQUNuQyxPQUFPO2FBQ1A7WUFFRCxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFHTSxlQUFlLENBQUMsUUFBbUIsRUFBRSxJQUFZO1lBQ3ZELElBQUksSUFBSSxJQUFJLHFCQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQzNELE9BQU8sUUFBUSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsWUFBWSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLGNBQWMsQ0FBQzthQUNwRjtRQUNGLENBQUM7UUFHTSxpQkFBaUIsQ0FBQyxRQUFtQixFQUFFLEtBQTBCO1lBQ3ZFLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUMxQyxPQUFPO2FBQ1A7WUFFRCxNQUFNLFdBQVcsR0FBRyxRQUFlLENBQUM7WUFDcEMsV0FBVyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDakMsQ0FBQztRQUdNLGNBQWMsQ0FBQyxRQUFtQixFQUFFLElBQVc7WUFDckQsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQzFDLE9BQU87YUFDUDtZQUVELE1BQU0sV0FBVyxHQUFHLFFBQWUsQ0FBQztZQUVwQyxJQUFJLFdBQVcsQ0FBQyxZQUFZLEVBQUU7Z0JBQzdCLFdBQVcsQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFDO2dCQUNyQyxPQUFPO2FBQ1A7WUFFRCxJQUFJLFdBQVcsQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTLElBQUksV0FBVyxDQUFDLGdCQUFnQixLQUFLLENBQUMsRUFBRTtnQkFDckYsV0FBVyxDQUFDLGdCQUFnQixHQUFHLGdCQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDdkQsT0FBTzthQUNQO1lBRUQsV0FBVyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFFL0IsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBR00sV0FBVyxDQUFDLEtBQStCO1lBQ2pELElBQUksV0FBVyxDQUFDLENBQUMsS0FBSyxXQUFXLENBQUMsWUFBWSxFQUFFO2dCQUMvQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25FLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBTyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO2dCQUNsRSxJQUFJLGlCQUFpQixHQUFHLEdBQUcsRUFBRTtvQkFDNUIsT0FBTyxpQkFBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxpQkFBTyxDQUFDLEdBQUcsRUFBRSxpQkFBaUIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO2lCQUVsRjtxQkFBTTtvQkFDTixPQUFPLGlCQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFPLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztpQkFDL0U7YUFDRDtZQUVELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUdNLGFBQWEsQ0FBQyxJQUFXO1lBQy9CLE9BQU8scUJBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUN2RCxDQUFDOztJQXoyQnVCLHdCQUFZLEdBQVcsY0FBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFNOUQ7UUFKQyxxQkFBUSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUU7WUFDL0IsS0FBSyxFQUFFLElBQUk7WUFDWCxPQUFPLEVBQUUsYUFBYTtTQUN0QixDQUFDOzBEQUNvQztJQUt0QztRQUhDLHFCQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUN4QixTQUFTLEVBQUUsc0JBQVEsRUFBNEIsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUM7U0FDeEUsQ0FBQzttREFDc0I7SUFnQ2U7UUFBdEMscUJBQVEsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7aUVBQTJDO0lBQ25DO1FBQTdDLHFCQUFRLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDO3dFQUFrRDtJQUMvRDtRQUEvQixxQkFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7MERBQW9DO0lBQzVCO1FBQXRDLHFCQUFRLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDO2lFQUEyQztJQUNqRDtRQUEvQixxQkFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7MERBQW9DO0lBQy9CO1FBQW5DLHFCQUFRLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDOzhEQUF3QztJQUN0QztRQUFwQyxxQkFBUSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQzsrREFBeUM7SUFDOUM7UUFBOUIscUJBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO3lEQUFtQztJQWdiakU7UUFKQyxxQkFBUSxDQUFDLE1BQU0sQ0FBQztZQUNoQixJQUFJLEVBQUUsS0FBSztZQUNYLFdBQVcsRUFBRSxrQ0FBa0M7U0FDL0MsQ0FBQzsrQ0FNRDtJQU1EO1FBSkMscUJBQVEsQ0FBQyxNQUFNLENBQUM7WUFDaEIsSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixXQUFXLEVBQUUsb0NBQW9DO1NBQ2pELENBQUM7c0RBc0JEO0lBNkREO1FBREMsc0JBQVU7b0RBR1Y7SUFHRDtRQURDLHNCQUFVOzhEQXFIVjtJQUdEO1FBREMsc0JBQVU7cURBbUJWO0lBR0Q7UUFEQyxzQkFBVTttREFLVjtJQUdEO1FBREMsc0JBQVU7a0RBTVY7SUFHRDtRQURDLHNCQUFVOzZDQWdCVjtJQUdEO1FBREMsc0JBQVU7cURBdUNWO0lBR0Q7UUFEQyxzQkFBVTtxREFVVjtJQUdEO1FBREMsc0JBQVU7K0RBT1Y7SUFHRDtRQURDLHNCQUFVO3NEQUtWO0lBR0Q7UUFEQyxzQkFBVTt3REFRVjtJQUdEO1FBREMsc0JBQVU7cURBcUJWO0lBR0Q7UUFEQyxzQkFBVTtrREFjVjtJQUdEO1FBREMsc0JBQVU7b0RBR1Y7SUExMkJGLDhCQTIyQkMifQ==