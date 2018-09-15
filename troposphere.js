var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "creature/ICreature", "entity/IEntity", "Enums", "item/Items", "language/IMessages", "language/Messages", "mod/IHookHost", "mod/Mod", "mod/ModRegistry", "player/IMessageManager", "tile/Terrains", "utilities/enum/Enums", "utilities/math/Vector2", "utilities/math/Vector3", "utilities/Random", "utilities/TileHelpers"], function (require, exports, ICreature_1, IEntity_1, Enums_1, Items_1, IMessages_1, Messages_1, IHookHost_1, Mod_1, ModRegistry_1, IMessageManager_1, Terrains_1, Enums_2, Vector2_1, Vector3_1, Random_1, TileHelpers_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Troposphere extends Mod_1.default {
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
                disassemble: true,
                durability: 15
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
            this.terrainCloudWater = this.addTerrain({
                name: "cloud water",
                passable: true,
                shallowWater: true,
                particles: { r: 47, g: 128, b: 157 },
                freshWater: true,
                noBackground: true,
                tileOnConsume: this.terrainHole
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
                        .type(IMessages_1.MessageType.Bad)
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
                    .type(IMessages_1.MessageType.Good)
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
    exports.default = Troposphere;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJvcG9zcGhlcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUcm9wb3NwaGVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7SUE0QkEsTUFBcUIsV0FBWSxTQUFRLGFBQUc7UUFnRXBDLE1BQU0sQ0FBQyxJQUFTO1lBQ3RCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBRWpCLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQzVCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDbkIsSUFBSSxDQUFDLElBQUksR0FBRztvQkFDWCxJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUU7aUJBQzFCLENBQUM7YUFDRjtZQUVELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUM1QixDQUFDO1FBRU0sUUFBUTtZQUNkLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM3RCxJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsR0FBRyxFQUFFO2dCQUNuQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO2FBQ3RCO1FBQ0YsQ0FBQztRQUVNLE1BQU07WUFDWixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDbEIsQ0FBQztRQUtNLGVBQWU7WUFDckIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUMvQixXQUFXLEVBQUUsb0JBQW9CO2dCQUNqQyxJQUFJLEVBQUUsU0FBUztnQkFDZixNQUFNLEVBQUUsSUFBSTtnQkFDWixN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