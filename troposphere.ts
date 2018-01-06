import { IActionArgument, IActionResult } from "action/IAction";
import { AiType, ICreature, SpawnableTiles, SpawnGroup } from "creature/ICreature";
import { ActionType, CreatureType, DamageType, Defense, Delay, FacingDirection, HairColor, HairStyle, IPoint, IPointZ, ItemType, ItemTypeGroup, LootGroupType, MoveType, RecipeLevel, RenderFlag, Resistances, SfxType, SkillType, SkinColor, StatusType, TerrainType, Vulnerabilities, WorldZ } from "Enums";
import { IItem } from "item/IItem";
import { RecipeComponent } from "item/Items";
import { messages, MessageType } from "language/Messages";
import Mod from "mod/Mod";
import { IPlayer } from "player/IPlayer";
import IWorld from "renderer/IWorld";
import { ITile } from "tile/ITerrain";
import Terrains from "tile/Terrains";
import * as Utilities from "Utilities";

interface ITroposphereData {
	seed: number;
}

export default class Troposphere extends Mod {
	private static readonly troposphereZ: number = WorldZ.Max + 1;

	private moving: boolean;
	private falling: boolean;

	private itemNimbus: number;
	private itemRainbow: number;
	private itemRainbowClayJug: number;
	private itemRainbowGlassBottle: number;
	private itemSnowflakes: number;
	private itemCloudstone: number;

	private doodadCloudBoulder: number;
	private doodadStormBoulder: number;
	private doodadRainbow: number;

	private terrainCloudWater: number;
	private terrainCloud: number;
	private terrainRainbow: number;
	private terrainCloudBoulder: number;
	private terrainCloudstone: number;
	private terrainStorm: number;
	private terrainStormBoulder: number;
	private terrainStormstone: number;
	private terrainHole: number;

	private creatureBear: number;
	private creatureRabbit: number;
	private creatureCloudling: number;
	private creatureLightningElemental: number;
	private creatureSprite: number;
	private creaturePool: number[];

	private skillFlying: number;

	private hairstyleCloud: number;

	private messageFlewToTroposphere: number;
	private messageFlewToTroposphereFailure: number;
	private messageFlewToLand: number;
	private messageFlewToLandFailure: number;
	private messageFellToLand: number;
	private messageDeathByFalling: number;
	private messageGatheredRainbow: number;
	private messageNoRainbow: number;

	private data: ITroposphereData;
	private firstLoad: boolean;

	public onInitialize(saveDataGlobal: any): any { }

	public onLoad(data: any): void {
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

	public onUnload(): void {
		const glassBottle = this.getItemByType(ItemType.GlassBottle);
		if (glassBottle && glassBottle.use) {
			glassBottle.use.pop();
		}
	}

	public onSave(): any {
		return this.data;
	}

	public onCreateWorld(world: IWorld) {
		world.addLayer(Troposphere.troposphereZ);
	}

	public postGenerateWorld(generateNewWorld: boolean) {
		// percentage
		const doodadChance = 0.6;
		const doodadChanceStorm = 0.2;

		const terrainHoleChance = 0.02;

		const creatureChance = 0.0025;
		const creatureSpriteChance = 0.0001;
		const creatureAberrantChance = 0.05;
		const creatureAberrantStormChance = 0.50;

		let tile: ITile;
		let terrainType: number;

		Utilities.Random.setSeed(this.data.seed);

		for (let x = 0; x < game.mapSize; x++) {
			for (let y = 0; y < game.mapSize; y++) {
				tile = game.setTile(x, y, Troposphere.troposphereZ, game.getTile(x, y, Troposphere.troposphereZ) || {} as ITile);

				let tileGfx = 0;
				const overworldTile = game.getTile(x, y, WorldZ.Overworld);
				const terrainDescription = Terrains[Utilities.TileHelpers.getType(overworldTile)];
				const normalTerrainType = terrainDescription ? terrainDescription.terrainType : TerrainType.Grass;

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

						} else {
							terrainType = this.terrainStorm;
						}

						break;

					default:
						const doodad = overworldTile.doodad;
						if (doodad && doodad.canGrow()) {
							if (Utilities.Random.nextFloat() <= doodadChance) {
								terrainType = this.terrainCloudBoulder;

							} else {
								terrainType = this.terrainCloud;
							}

						} else {
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

							} else if (chance <= creatureChance) {
								const creatureType = this.creaturePool[Utilities.Random.nextInt(this.creaturePool.length)];
								creatureManager.spawn(creatureType, x, y, Troposphere.troposphereZ, true, Utilities.Random.nextFloat() <= aberrantChance);
							}

							break;
					}
				}
			}
		}
	}

	public preRenderWorld(tileScale: number, viewWidth: number, viewHeight: number) {
		if (localPlayer.z !== Troposphere.troposphereZ) {
			return;
		}

		if (this.falling) {
			const turnProgress = 1 - Math.min(1, Math.max(0, (localPlayer.movementFinishTime - game.absoluteTime) / (Delay.Movement * game.interval)));
			tileScale = Utilities.Math2.easeInCubic(turnProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
			game.updateRender = true;

		} else {
			tileScale *= 0.25;
		}

		const scrollX = Utilities.Math2.lerp(localPlayer.fromX, localPlayer.x, localPlayer.movementProgress);
		const scrollY = Utilities.Math2.lerp(localPlayer.fromY, localPlayer.y, localPlayer.movementProgress);

		renderer.layers[WorldZ.Overworld].renderFullbright(scrollX, scrollY, tileScale, viewWidth, viewHeight);
	}

	public shouldRender() {
		if (this.falling) {
			return RenderFlag.Player;
		}
	}

	public onGameStart(isLoadingSave: boolean): void {
		if (!isLoadingSave || this.firstLoad) {
			// give nimbus
			localPlayer.createItemInInventory(this.itemNimbus);
		}
	}

	public onMove(player: IPlayer, nextX: number, nextY: number, tile: ITile, direction: FacingDirection): boolean | undefined {
		if (player.z !== Troposphere.troposphereZ) {
			return;
		}

		this.moving = true;

		const terrainType = Utilities.TileHelpers.getType(tile);
		if (terrainType === this.terrainHole) {
			this.falling = true;

			// localPlayer.addDelay(Delay.Collision, true);
			// game.passTurn(localPlayer);

			// no light blocking
			fieldOfView.compute(false);
		}
	}

	public onMoveComplete(player: IPlayer) {
		if (player.z !== Troposphere.troposphereZ) {
			return;
		}

		this.moving = false;

		if (this.falling) {
			this.falling = false;
			this.setFlying(player, false, false);

			// fall damage
			ui.displayMessage(player, this.messageFellToLand, MessageType.Bad);

			const flyingSkill = player.skills[this.skillFlying];
			const damagePercentage = flyingSkill ? 1 - (flyingSkill.percent / 100) : 1;

			const tile = game.getTile(player.x, player.y, player.z);
			const terrainType = Utilities.TileHelpers.getType(tile);
			if (tileAtlas.isWater(terrainType)) {
				player.damage(-30 * damagePercentage, messages[this.messageDeathByFalling]);
				
			} else {
				player.damage(-40 * damagePercentage, messages[this.messageDeathByFalling]);
				corpseManager.create(CreatureType.Blood, player.x, player.y, player.z);
			}

			player.addDelay(Delay.Collision, true);
			game.passTurn(player);
		}
	}

	public initializeItems() {
		const actionTypeFly = this.addActionType({
			name: "Fly",
			description: "Fly to/from the Troposphere."
		}, (player: IPlayer, argument: IActionArgument, result: IActionResult) => this.onNimbus(player, argument.item));

		const actionTypeGatherRainbow = this.addActionType({
			name: "Gather Rainbow",
			description: "Gather a Rainbow."
		}, (player: IPlayer, argument: IActionArgument, result: IActionResult) => this.onGatherRainbow(player, argument.item));

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
			use: [ActionType.DrinkItem],
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

		this.itemNimbus = this.addItem({
			description: "A Flying Nimbus.",
			name: "Nimbus",
			use: [actionTypeFly],
			recipe: {
				components: [
					RecipeComponent(ItemType.Feather, 2, 2, 2),
					RecipeComponent(this.itemCloudstone, 1, 1, 1)
				],
				skill: this.skillFlying,
				level: RecipeLevel.Simple,
				reputation: 50
			},
			disassemble: true
		});

		const glassBottle = this.getItemByType(ItemType.GlassBottle);
		if (glassBottle && glassBottle.use) {
			glassBottle.use.push(actionTypeGatherRainbow);
		}
	}

	public initializeDoodads() {
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

	public initializeTerrain() {
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
			gatherSkillUse: SkillType.Lumberjacking,
			gather: true,
			noLos: true,
			sound: SfxType.TreeHit,
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
			gatherSkillUse: SkillType.Mining,
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
			gatherSkillUse: SkillType.Lumberjacking,
			gather: true,
			noLos: true,
			sound: SfxType.TreeHit,
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
			gatherSkillUse: SkillType.Mining,
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

	public initializeCreatures() {
		this.creatureBear = this.addCreature({
			name: "Cloud Bear",
			minhp: 18,
			maxhp: 21,
			minatk: 5,
			maxatk: 13,
			defense: new Defense(3,
				new Resistances(
					DamageType.Piercing, 3,
					DamageType.Blunt, 1
				),
				new Vulnerabilities()
			),
			damageType: DamageType.Slashing | DamageType.Blunt,
			ai: AiType.Hostile,
			moveType: MoveType.Land | MoveType.ShallowWater | MoveType.Water | MoveType.BreakDoodads,
			canCauseStatus: [StatusType.Bleeding],
			spawnTiles: SpawnableTiles.None,
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
			defense: new Defense(0,
				new Resistances(),
				new Vulnerabilities()
			),
			damageType: DamageType.Slashing,
			ai: AiType.Scared,
			moveType: MoveType.Land | MoveType.ShallowWater,
			spawnTiles: SpawnableTiles.None,
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
			defense: new Defense(0,
				new Resistances(
					DamageType.Piercing, 1
				),
				new Vulnerabilities(
					DamageType.Blunt, 1
				)
			),
			damageType: DamageType.Piercing,
			ai: AiType.Neutral,
			moveType: MoveType.Flying,
			reputation: 100,
			spawnTiles: SpawnableTiles.None,
			loot: [{ item: ItemType.Feather }, { item: ItemType.Feather }],
			lootGroup: LootGroupType.Low
		});

		this.creatureLightningElemental = this.addCreature({
			name: "Lightning Elemental",
			minhp: 30,
			maxhp: 38,
			minatk: 11,
			maxatk: 19,
			defense: new Defense(5,
				new Resistances(
					DamageType.Fire, 100
				),
				new Vulnerabilities()
			),
			damageType: DamageType.Fire | DamageType.Blunt,
			ai: AiType.Hostile,
			moveType: MoveType.Flying,
			spawnTiles: SpawnableTiles.None,
			lootGroup: LootGroupType.High,
			loot: [{ item: ItemType.PileOfAsh }],
			blood: { r: 210, g: 125, b: 20 },
			canCauseStatus: [StatusType.Bleeding],
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
			defense: new Defense(5,
				new Resistances(
					DamageType.Fire, 100
				),
				new Vulnerabilities()
			),
			damageType: DamageType.Fire | DamageType.Blunt,
			ai: AiType.Hostile,
			moveType: MoveType.Flying,
			spawnTiles: SpawnableTiles.None,
			lootGroup: LootGroupType.High,
			loot: [{ item: ItemType.PileOfAsh }],
			blood: { r: 210, g: 125, b: 20 },
			canCauseStatus: [StatusType.Bleeding],
			spawnReputation: 32000,
			reputation: 500,
			makeNoise: true
		});

		this.creaturePool = [this.creatureBear, this.creatureRabbit, this.creatureCloudling, this.creatureLightningElemental];
	}

	public initializeSkills() {
		this.skillFlying = this.addSkillType({
			name: "Flying",
			description: "Increases your damage resistance when falling from the Troposphere."
		});
	}

	public onNimbus(player: IPlayer, item: IItem | undefined) {
		this.setFlying(player, player.z !== Troposphere.troposphereZ, true);
	}

	public onGatherRainbow(player: IPlayer, item: IItem | undefined) {
		const tile = game.getTileInFrontOfPlayer(player);
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

	public canConsumeItem(player: IPlayer, itemType: ItemType, actionType: ActionType): boolean | undefined {
		if (itemType === this.itemRainbowGlassBottle && actionType === ActionType.DrinkItem) {
			player.customization = {
				hairStyle: HairStyle[Utilities.Enums.getRandomIndex(HairStyle)] as keyof typeof HairStyle,
				hairColor: HairColor[Utilities.Enums.getRandomIndex(HairColor)] as keyof typeof HairColor,
				skinColor: SkinColor[Utilities.Enums.getRandomIndex(SkinColor)] as keyof typeof SkinColor
			};
			return true;
		}
	}

	public onSpawnCreatureFromGroup(creatureGroup: SpawnGroup, creaturePool: CreatureType[], x: number, y: number, z: number): boolean | undefined {
		if (z !== Troposphere.troposphereZ) {
			return;
		}

		creaturePool.push.apply(creaturePool, this.creaturePool);
	}

	public canCreatureMove(creature: ICreature, tile?: ITile): boolean | undefined {
		if (tile && Utilities.TileHelpers.getType(tile) === this.terrainHole) {
			return creature.type !== this.creatureBear && creature.type !== this.creatureRabbit;
		}
	}

	public canCreatureAttack(creature: ICreature, enemy: IPlayer | ICreature): boolean | undefined {
		if (creature.type !== this.creatureSprite) {
			return;
		}

		const creatureObj = creature as any;
		creatureObj.justAttacked = true;
	}

	public canSeeCreature(creature: ICreature, tile: ITile): boolean | undefined {
		if (creature.type !== this.creatureSprite) {
			return;
		}

		const creatureObj = creature as any;

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

	public setFlying(player: IPlayer, flying: boolean, passTurn: boolean): boolean {
		const z = !flying ? WorldZ.Overworld : Troposphere.troposphereZ;

		const openTile = Utilities.TileHelpers.findMatchingTile(player, this.isFlyableTile.bind(this));
		if (openTile === undefined || player.z === WorldZ.Cave) {
			if (passTurn) {
				ui.displayMessage(player, flying ? this.messageFlewToTroposphereFailure : this.messageFlewToLandFailure, MessageType.Bad);
			}

			return false;
		}

		player.x = openTile.x;
		player.y = openTile.y;
		player.z = z;

		player.raft = undefined;

		player.skillGain(this.skillFlying);

		if (passTurn) {
			ui.displayMessage(player, flying ? this.messageFlewToTroposphere : this.messageFlewToLand, MessageType.Good);

			game.passTurn(player);
		}

		return true;
	}

	public isFlyableTile(point: IPointZ, tile: ITile): boolean {
		if (tile.creature || tile.doodad) {
			return false;
		}

		const terrainType = Utilities.TileHelpers.getType(tile);
		if (terrainType === this.terrainHole) {
			return false;
		}

		const terrainInfo = Terrains[terrainType];

		return (!terrainInfo || (terrainInfo.water || terrainInfo.passable)) ? true : false;
	}
}
