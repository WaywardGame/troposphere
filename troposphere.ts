import { IActionArgument, IActionResult } from "action/IAction";
import { AiType, ICreature, SpawnableTiles, SpawnGroup } from "creature/ICreature";
import { ActionType, CreatureType, DamageType, Defense, Delay, HairColor, Hairstyle, IPoint, ItemType, LootGroupType, MoveType, RenderFlag, Resistances, SfxType, SkillType, SkinColor, StatusType, TerrainType, Vulnerabilities, WorldZ } from "Enums";
import { IItem } from "item/IItem";
import { messages, MessageType } from "language/Messages";
import Mod from "mod/Mod";
import { IPlayer } from "player/IPlayer";
import IWorld from "renderer/IWorld";
import { ITile } from "tile/ITerrain";
import Terrains from "tile/Terrains";
import * as Utilities from "Utilities";

interface ITroposphereData {
	seed: number;
	flying: boolean;
};

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
				seed: new Date().getTime(),
				flying: false
			};
		}

		this.initializeItems();
		this.initializeDoodads();
		this.initializeTerrain();
		this.initializeCreatures();
		this.initializeSkills();

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
				const terrainDescription = Terrains[Utilities.TileHelpers.getType(game.getTile(x, y, WorldZ.Overworld))];
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
						} else {
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
		if (!this.data.flying) {
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

	public onTurnStart() {
		if (!this.data.flying) {
			return;
		}

		this.moving = true;
	}

	public onTurnComplete() {
		if (!this.data.flying) {
			return;
		}

		this.moving = false;

		if (this.falling) {
			this.falling = false;
			this.setFlying(false, false);

			// fall damage
			ui.displayMessage(localPlayer, this.messageFellToLand, MessageType.Bad);

			const flyingSkill = localPlayer.skills[this.skillFlying];
			const damagePercentage = flyingSkill ? 1 - (flyingSkill.percent / 100) : 1;

			const tile = game.getTile(localPlayer.x, localPlayer.y, localPlayer.z);
			const terrainType = Utilities.TileHelpers.getType(tile);
			if (tileAtlas.isWater(terrainType)) {
				localPlayer.damage(-30 * damagePercentage, messages[this.messageDeathByFalling]);
			} else {
				localPlayer.damage(-40 * damagePercentage, messages[this.messageDeathByFalling]);
				corpseManager.create({ type: CreatureType.Blood, x: localPlayer.x, y: localPlayer.y, z: localPlayer.z });
			}

			game.passTurn(localPlayer);

		} else {
			const tile = game.getTile(localPlayer.x, localPlayer.y, localPlayer.z);
			const terrainType = Utilities.TileHelpers.getType(tile);

			if (terrainType === this.terrainHole) {
				this.falling = true;

				localPlayer.addDelay(Delay.Collision, true);
				game.passTurn(localPlayer);

				// no light blocking
				fieldOfView.compute(false);
			}
		}
	}

	public initializeItems() {
		const actionTypeFly = this.addActionType({
			name: "Fly",
			description: "Fly to/from the Troposphere."
		}, (player: IPlayer, argument: IActionArgument, result: IActionResult) => this.onNimbus(argument.item));

		const actionTypeGatherRainbow = this.addActionType({
			name: "Gather Rainbow",
			description: "Gather a Rainbow."
		}, (player: IPlayer, argument: IActionArgument, result: IActionResult) => this.onGatherRainbow(argument.item));

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
			moveType: MoveType.Land | MoveType.ShallowWater | MoveType.Water | MoveType.BreakWalls,
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

	public onNimbus(item: IItem | undefined) {
		this.setFlying(!this.data.flying, true);
	}

	public onGatherRainbow(item: IItem | undefined) {
		const tile = game.getTileInFrontOfPlayer(localPlayer);
		const tileType = Utilities.TileHelpers.getType(tile);
		if (!item || tileType !== this.terrainRainbow) {
			ui.displayMessage(localPlayer, this.messageNoRainbow);
			return;
		}

		ui.displayMessage(localPlayer, this.messageGatheredRainbow);

		game.particle.create(localPlayer.x + localPlayer.direction.x, localPlayer.y + localPlayer.direction.y, localPlayer.z, { r: 12, g: 128, b: 247 });

		const newItem = itemManager.create(this.itemRainbowGlassBottle, localPlayer.inventory, item.quality);
		newItem.decay = item.decay;
		newItem.minDur = item.minDur;
		newItem.maxDur = item.maxDur;

		itemManager.remove(item);

		game.changeTile({ type: this.terrainCloud }, localPlayer.x + localPlayer.direction.x, localPlayer.y + localPlayer.direction.y, localPlayer.z, false);
		game.passTurn(localPlayer);
	}

	public canConsumeItem(itemType: ItemType, actionType: ActionType): boolean | undefined {
		if (itemType === this.itemRainbowGlassBottle && actionType === ActionType.Drink) {
			localPlayer.customization = {
				hairStyle: Utilities.Enums.getRandomIndex(Hairstyle),
				hairColor: Utilities.Enums.getRandomIndex(HairColor),
				skinColor: Utilities.Enums.getRandomIndex(SkinColor)
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

	public canCreatureMove(creatureId: number, creature: ICreature, tile?: ITile): boolean | undefined {
		if (tile && Utilities.TileHelpers.getType(tile) === this.terrainHole) {
			return creature.type !== this.creatureBear && creature.type !== this.creatureRabbit;
		}
	}

	public canCreatureAttack(creatureId: number, creature: ICreature): boolean | undefined {
		if (creature.type !== this.creatureSprite) {
			return;
		}

		const creatureObj = creature as any;
		creatureObj.justAttacked = true;
	}

	public canSeeCreature(creatureId: number, creature: ICreature, tile: ITile): boolean | undefined {
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

	public setFlying(flying: boolean, passTurn: boolean): boolean {
		const z = !flying ? WorldZ.Overworld : Troposphere.troposphereZ;

		const openTile = this.findOpenTile(z);
		if (openTile === undefined || localPlayer.z === WorldZ.Cave) {
			if (passTurn) {
				ui.displayMessage(localPlayer, flying ? this.messageFlewToTroposphereFailure : this.messageFlewToLandFailure, MessageType.Bad);
			}
			return false;
		}

		this.data.flying = flying;

		localPlayer.x = openTile.x;
		localPlayer.y = openTile.y;
		localPlayer.z = z;

		localPlayer.raft = undefined;

		localPlayer.skillGain(this.skillFlying);

		if (passTurn) {
			ui.displayMessage(localPlayer, flying ? this.messageFlewToTroposphere : this.messageFlewToLand, MessageType.Good);

			game.passTurn(localPlayer);
		}

		return true;
	}

	public findOpenTile(z: number): IPoint | undefined {
		const q: IPoint[] = [{ x: localPlayer.x, y: localPlayer.y }];
		const visited: string[] = [];
		let tilesChecked = 0;

		const indexPoint = (point: IPoint) => {
			return `${point.x},${point.y}`;
		};

		while (q.length > 0) {
			const point = q.pop() as IPoint;

			const tile = game.getTile(point.x, point.y, z);
			if (!tile) {
				continue;
			}

			if (this.isFlyableTile(tile)) {
				return point;
			}

			for (let i = 0; i < 4; i++) {

				const neighbor: IPoint = { x: point.x, y: point.y };

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

			// if(tilesChecked > 100)
			// {
			//     break;
			// }
		}

		return undefined;
	}

	public isFlyableTile(tile: ITile): boolean {
		if (tile.creatureId !== undefined && tile.creatureId !== null) {
			return false;
		}

		if (tile.doodadId !== undefined && tile.doodadId !== null) {
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
