import { IActionArgument } from "action/IAction";
import { ICreature, SpawnableTiles, SpawnGroup } from "creature/ICreature";
import { AiType } from "entity/IEntity";
import { ActionType, CreatureType, DamageType, Defense, Delay, Direction, HairColor, HairStyle, ItemType, LootGroupType, MoveType, RecipeLevel, RenderFlag, Resistances, SfxType, SkillType, SkinColor, StatusType, TerrainType, Vulnerabilities, WorldZ } from "Enums";
import { RecipeComponent } from "item/Items";
import { Message, MessageType } from "language/IMessages";
import { messages } from "language/Messages";
import { HookMethod } from "mod/IHookHost";
import Mod from "mod/Mod";
import Register, { Registry } from "mod/ModRegistry";
import { HelpArticle } from "newui/screen/screens/menu/menus/help/HelpArticleDescriptions";
import { Source } from "player/IMessageManager";
import { IPlayer } from "player/IPlayer";
import { Note } from "player/NoteManager";
import IWorld from "renderer/IWorld";
import { ITile } from "tile/ITerrain";
import Terrains from "tile/Terrains";
import Enums from "utilities/enum/Enums";
import { IVector2 } from "utilities/math/IVector";
import Vector2 from "utilities/math/Vector2";
import Vector3 from "utilities/math/Vector3";
import Random from "utilities/Random";
import TileHelpers from "utilities/TileHelpers";

interface ITroposphereData {
	seed: number;
}

export default class Troposphere extends Mod {
	private static readonly troposphereZ: number = WorldZ.Max + 1;

	@Register.helpArticle("Flying", {
		image: true,
		section: "Troposphere"
	})
	public readonly flyingHelpArticle: HelpArticle;

	@Register.note("Flying", {
		learnMore: Registry<Troposphere, HelpArticle>().get("flyingHelpArticle")
	})
	public readonly flyingNote: Note;

	@Register.message("FlewToTroposphere")
	public readonly messageFlewToTroposphere: Message;
	@Register.message("FlewToTroposphereFailure")
	public readonly messageFlewToTroposphereFailure: Message;
	@Register.message("FlewToLand")
	public readonly messageFlewToLand: Message;
	@Register.message("FlewToLandFailure")
	public readonly messageFlewToLandFailure: Message;
	@Register.message("FellToLand")
	public readonly messageFellToLand: Message;
	@Register.message("DeathByFalling")
	public readonly messageDeathByFalling: Message;
	@Register.message("GatheredRainbow")
	public readonly messageGatheredRainbow: Message;
	@Register.message("NoRainbow")
	public readonly messageNoRainbow: Message;

	private falling: boolean;

	private itemNimbus: number;
	private itemRainbow: number;
	private itemRainbowGlassBottle: number;
	private itemSnowflakes: number;
	private itemCloudstone: number;

	private doodadCloudBoulder: number;
	private doodadStormBoulder: number;
	private doodadRainbow: number;

	private terrainCloudWater: number;
	private terrainCloud: number;
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

	private data: ITroposphereData;
	private firstLoad: boolean;

	public onLoad(data: any): void {
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

	public onUnload(): void {
		const glassBottle = this.getItemByType(ItemType.GlassBottle);
		if (glassBottle && glassBottle.use) {
			glassBottle.use.pop();
		}
	}

	public onSave(): any {
		return this.data;
	}

	////////////////////////////////////////
	// Utility Methods

	public initializeItems() {
		this.itemRainbow = this.addItem({
			description: "A magical rainbow.",
			name: "rainbow",
			prefix: "a ",
			weight: 0.1,
			use: [ActionType.DrinkItem, ActionType.Build],
			onUse: {
				[ActionType.Build]: this.doodadRainbow
			}
		});

		this.itemRainbowGlassBottle = this.addItem({
			description: "A magical rainbow in a glass bottle.",
			name: "glass bottle filled with a rainbow",
			prefix: "a ",
			weight: 1.0,
			use: [ActionType.DrinkItem],
			returnOnUse: [ItemType.GlassBottle, false]
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
			use: [Registry.id(this.onNimbus)],
			recipe: {
				components: [
					RecipeComponent(ItemType.Feather, 2, 2, 2),
					RecipeComponent(this.itemCloudstone, 1, 1, 1),
					RecipeComponent(this.itemSnowflakes, 1, 1, 1)
				],
				skill: this.skillFlying,
				level: RecipeLevel.Simple,
				reputation: 50
			},
			disassemble: true,
			durability: 15
		});

		const glassBottle = this.getItemByType(ItemType.GlassBottle);
		if (glassBottle && glassBottle.use) {
			glassBottle.use.push(Registry.id(this.onGatherRainbow));
		}
	}

	public initializeDoodads() {
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

	public initializeTerrain() {
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
			gatherSkillUse: SkillType.Lumberjacking,
			gather: true,
			noLos: true,
			sound: SfxType.TreeHit,
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
			gatherSkillUse: SkillType.Mining,
			gather: true,
			noLos: true,
			sound: SfxType.RockHit,
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
			gatherSkillUse: SkillType.Lumberjacking,
			gather: true,
			noLos: true,
			sound: SfxType.TreeHit,
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
			gatherSkillUse: SkillType.Mining,
			gather: true,
			noLos: true,
			sound: SfxType.RockHit,
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

	public initializeCreatures() {
		this.creatureBear = this.addCreature({
			name: "cloud bear",
			prefix: "a ",
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
			}]
		}, {
				resource: [
					{ item: ItemType.Cotton },
					{ item: ItemType.AnimalClaw },
					{ item: ItemType.AnimalFat },
					{ item: ItemType.RawMeat },
					{ item: ItemType.RawMeat },
					{ item: ItemType.AnimalSkull },
					{ item: ItemType.Offal },
					{ item: ItemType.Bone },
					{ item: ItemType.BoneFragments }
				],
				decay: 2800,
				skill: SkillType.Anatomy
			});

		this.creatureRabbit = this.addCreature({
			name: "cloud rabbit",
			prefix: "a ",
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
			jumpOver: true,
			loot: [{ item: this.itemSnowflakes }]
		}, {
				resource: [
					{ item: ItemType.Cotton },
					{ item: ItemType.RawMeat },
					{ item: ItemType.Offal },
					{ item: ItemType.BoneFragments }
				],
				decay: 2400,
				skill: SkillType.Anatomy
			});

		this.creatureCloudling = this.addCreature({
			name: "cloudling",
			prefix: "a ",
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
			loot: [
				{
					item: this.itemSnowflakes,
					chance: 75
				},
				{ item: ItemType.Feather }
			],
			lootGroup: LootGroupType.Low
		}, {
				resource: [
					{ item: ItemType.Feather },
					{ item: ItemType.Feather },
					{ item: ItemType.TailFeathers, chance: 1 },
					{ item: ItemType.RawChicken },
					{ item: ItemType.BoneFragments }
				],
				decay: 2400,
				skill: SkillType.Anatomy
			});

		this.creatureLightningElemental = this.addCreature({
			name: "lightning elemental",
			prefix: "a ",
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
			blood: { r: 141, g: 155, b: 158 },
			aberrantBlood: { r: 95, g: 107, b: 122 },
			canCauseStatus: [StatusType.Bleeding],
			spawnReputation: 32000,
			reputation: 300,
			makeNoise: true
		}, {
				resource: [{ item: ItemType.PileOfAsh }],
				decay: 400,
				skill: SkillType.Mining,
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
			blood: { r: 238, g: 130, b: 134 },
			canCauseStatus: [StatusType.Bleeding],
			spawnReputation: 32000,
			reputation: 500,
			makeNoise: true
		}, {
				resource: [{ item: ItemType.Ectoplasm }],
				decay: 100,
				blood: false,
				name: "ethereal mist",
				prefix: ""
			});

		this.creaturePool = [this.creatureBear, this.creatureRabbit, this.creatureCloudling, this.creatureLightningElemental];
	}

	public initializeSkills() {
		this.skillFlying = this.addSkillType({
			name: "Flying",
			description: "Increases your damage resistance when falling from the Troposphere."
		});
	}

	@Register.action({
		name: "Fly",
		description: "Fly to and from the Troposphere."
	})
	public onNimbus(player: IPlayer, argument: IActionArgument) {
		this.setFlying(player, player.z !== Troposphere.troposphereZ, true);
		if (argument.item) {
			argument.item.damage(argument.type!.toString());
		}
	}

	@Register.action({
		name: "Gather Rainbow",
		description: "Gather a rainbow with a container."
	})
	public onGatherRainbow(player: IPlayer, argument: IActionArgument) {
		const tile = player.getFacingTile();
		const tileDoodad = tile.doodad;
		if (!tileDoodad || tileDoodad.type !== this.doodadRainbow) {
			player.messages.source(Source.Action)
				.send(this.messageNoRainbow);
			return;
		}

		player.messages.source(Source.Action, Source.Resource)
			.send(this.messageGatheredRainbow);

		game.particle.create(player.x + player.direction.x, player.y + player.direction.y, player.z, { r: 12, g: 128, b: 247 });

		if (argument.item) {
			argument.item.changeInto(this.itemRainbowGlassBottle);
		}

		doodadManager.remove(tileDoodad);

		game.passTurn(player);
	}

	public setFlying(player: IPlayer, flying: boolean, passTurn: boolean): boolean {
		const z = !flying ? WorldZ.Overworld : Troposphere.troposphereZ;

		const openTile = TileHelpers.findMatchingTile(player, this.isFlyableTile.bind(this));
		if (openTile === undefined || player.z === WorldZ.Cave) {
			if (passTurn) {
				player.messages.source(Source.Action)
					.type(MessageType.Bad)
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
			player.messages.source(Source.Action, Source.Item)
				.type(MessageType.Good)
				.send(flying ? this.messageFlewToTroposphere : this.messageFlewToLand);

			game.passTurn(player);
		}

		return true;
	}

	public isFlyableTile(point: IVector2, tile: ITile): boolean {
		if (tile.creature || tile.doodad) {
			return false;
		}

		const terrainType = TileHelpers.getType(tile);
		if (terrainType === this.terrainHole) {
			return false;
		}

		const terrainInfo = Terrains[terrainType];

		return (!terrainInfo || (terrainInfo.water || terrainInfo.passable)) ? true : false;
	}

	public easeInCubic(time: number, start: number, change: number, duration: number): number {
		time /= duration;
		return change * time * time * time + start;
	}

	////////////////////////////////////////
	// Hooks

	@HookMethod
	public onCreateWorld(world: IWorld): void {
		world.addLayer(Troposphere.troposphereZ);
	}

	@HookMethod
	public preLoadWorldDifferences(generateNewWorld: boolean) {
		// percentage
		const doodadChance = 0.6;
		const doodadChanceStorm = 0.2;
		const doodadChanceRainbow = 0.1;

		const terrainHoleChance = 0.02;

		const creatureChance = 0.0025;
		const creatureSpriteChance = 0.0001;
		const creatureAberrantChance = 0.05;
		const creatureAberrantStormChance = 0.50;

		let tile: ITile;
		let terrainType: number;

		Random.generator.setSeed(this.data.seed);

		for (let x = 0; x < game.mapSize; x++) {
			for (let y = 0; y < game.mapSize; y++) {
				tile = game.setTile(x, y, Troposphere.troposphereZ, game.getTile(x, y, Troposphere.troposphereZ) || {} as ITile);

				let tileGfx = 0;
				const overworldTile = game.getTile(x, y, WorldZ.Overworld);
				const terrainDescription = Terrains[TileHelpers.getType(overworldTile)];
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
						if (Random.float() <= doodadChanceStorm) {
							terrainType = this.terrainStormBoulder;

						} else {
							terrainType = this.terrainStorm;
						}

						break;

					case TerrainType.ShallowFreshWater:
						if (Random.float() <= doodadChanceRainbow) {
							terrainType = this.terrainCloud;
							doodadManager.create(this.doodadRainbow, x, y, Troposphere.troposphereZ);

						} else {
							terrainType = this.terrainCloudWater;
						}

						break;

					default:
						const doodad = overworldTile.doodad;
						if (doodad && doodad.canGrow()) {
							if (Random.float() <= doodadChance) {
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
					if (Random.float() <= terrainHoleChance) {
						terrainType = this.terrainHole;
					}
				}

				if (terrainType === this.terrainCloudBoulder || terrainType === this.terrainStormBoulder) {
					tileGfx = Random.int(3);
				}

				tile.data = TileHelpers.setTypeRaw(tile.data, terrainType);
				tile.data = TileHelpers.setGfxRaw(tile.data, tileGfx);
			}
		}

		for (let x = 0; x < game.mapSize; x++) {
			for (let y = 0; y < game.mapSize; y++) {
				terrainType = TileHelpers.getType(game.getTile(x, y, Troposphere.troposphereZ));

				if (generateNewWorld) {
					switch (terrainType) {
						case this.terrainCloud:
						case this.terrainStorm:
							const chance = Random.float();
							const aberrantChance = terrainType === this.terrainCloud ? creatureAberrantChance : creatureAberrantStormChance;
							if (chance <= creatureSpriteChance) {
								creatureManager.spawn(this.creatureSprite, x, y, Troposphere.troposphereZ, true, Random.float() <= aberrantChance);

							} else if (chance <= creatureChance) {
								const creatureType = this.creaturePool[Random.int(this.creaturePool.length)];
								creatureManager.spawn(creatureType, x, y, Troposphere.troposphereZ, true, Random.float() <= aberrantChance);
							}

							break;
					}
				}
			}
		}
	}

	@HookMethod
	public preRenderWorld(tileScale: number, viewWidth: number, viewHeight: number) {
		if (localPlayer.z !== Troposphere.troposphereZ) {
			return;
		}

		if (this.falling) {
			const turnProgress = 1 - Math.min(1, Math.max(0, (localPlayer.movementFinishTime - game.absoluteTime) / (Delay.Movement * game.interval)));
			tileScale = this.easeInCubic(turnProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
			game.updateRender = true;

		} else {
			tileScale *= 0.25;
		}

		let position = new Vector2(localPlayer.fromX, localPlayer.fromY)
			.lerp(localPlayer, localPlayer.movementProgress);

		const scale = 16 * renderer.getZoom() * 0.25;
		position = new Vector2(position)
			.multiply(scale)
			.floor()
			.divide(scale);

		renderer.layers[WorldZ.Overworld].renderFullbright(position.x, position.y, tileScale, viewWidth, viewHeight, false);
	}

	@HookMethod
	public shouldRender() {
		if (this.falling) {
			return RenderFlag.Player;
		}
	}

	@HookMethod
	public onGameStart(isLoadingSave: boolean): void {
		if ((!isLoadingSave || this.firstLoad) && !multiplayer.isConnected()) {
			// give nimbus
			localPlayer.createItemInInventory(this.itemNimbus);
		}
	}

	@HookMethod
	public onPlayerJoin(player: IPlayer): void {
		if (itemManager.getItemInContainer(player.inventory, this.itemNimbus) === undefined) {
			// give nimbus if they don't have one
			player.createItemInInventory(this.itemNimbus);
		}
	}

	@HookMethod
	public onMove(player: IPlayer, nextX: number, nextY: number, tile: ITile, direction: Direction): boolean | undefined {
		if (player.z !== Troposphere.troposphereZ) {
			return;
		}

		const terrainType = TileHelpers.getType(tile);
		if (terrainType === this.terrainHole) {
			this.falling = true;

			// localPlayer.addDelay(Delay.Collision, true);
			// game.passTurn(localPlayer);

			// no light blocking
			fieldOfView.compute(false);
		}
	}

	@HookMethod
	public onMoveComplete(player: IPlayer) {
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
			const terrainType = TileHelpers.getType(tile);

			if (terrainType === TerrainType.DeepFreshWater || terrainType === TerrainType.DeepSeawater) {
				damage *= .5;

			} else if (terrainType === TerrainType.FreshWater || terrainType === TerrainType.Seawater) {
				damage *= .75;
			}

			damage = player.damage(damage, messages[this.messageDeathByFalling]);

			// fall damage
			player.messages.source(Source.Wellbeing)
				.type(MessageType.Bad)
				.send(this.messageFellToLand, damage);

			if (damage > 25 || damage > 15 && Random.chance(.5)) {
				corpseManager.create(tileAtlas.isWater(terrainType) ? CreatureType.WaterBlood : CreatureType.Blood, player.x, player.y, player.z);
			}

			player.addDelay(Delay.Collision, true);
			game.passTurn(player);
		}
	}

	@HookMethod
	public canConsumeItem(player: IPlayer, itemType: ItemType, actionType: ActionType): boolean | undefined {
		if (itemType === this.itemRainbowGlassBottle && actionType === ActionType.DrinkItem) {
			player.customization = {
				hairStyle: HairStyle[Enums.getRandom(HairStyle)] as keyof typeof HairStyle,
				hairColor: HairColor[Enums.getRandom(HairColor)] as keyof typeof HairColor,
				skinColor: SkinColor[Enums.getRandom(SkinColor)] as keyof typeof SkinColor
			};
			return true;
		}
	}

	@HookMethod
	public onSpawnCreatureFromGroup(creatureGroup: SpawnGroup, creaturePool: CreatureType[], x: number, y: number, z: number): boolean | undefined {
		if (z !== Troposphere.troposphereZ) {
			return;
		}

		creaturePool.push.apply(creaturePool, this.creaturePool);
	}

	@HookMethod
	public canCreatureMove(creature: ICreature, tile?: ITile): boolean | undefined {
		if (tile && TileHelpers.getType(tile) === this.terrainHole) {
			return creature.type !== this.creatureBear && creature.type !== this.creatureRabbit;
		}
	}

	@HookMethod
	public canCreatureAttack(creature: ICreature, enemy: IPlayer | ICreature): boolean | undefined {
		if (creature.type !== this.creatureSprite) {
			return;
		}

		const creatureObj = creature as any;
		creatureObj.justAttacked = true;
	}

	@HookMethod
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
			creatureObj.nextVisibleCount = Random.intInRange(1, 6);
			return;
		}

		creatureObj.nextVisibleCount--;

		return false;
	}

	@HookMethod
	public getFogColor() {
		if (localPlayer.z === Troposphere.troposphereZ) {
			const ambientLightLevel = game.getAmbientLightLevel(localPlayer.z);
			const ambientLightColor = new Vector3(renderer.getAmbientColor());
			if (ambientLightLevel > 0.5) {
				return Vector3.mix(ambientLightColor, Vector3.ONE, ambientLightLevel * 2 - 1).xyz;

			} else {
				return Vector3.mix(Vector3.ZERO, ambientLightColor, ambientLightLevel * 2).xyz;
			}
		}

		return undefined;
	}

	@HookMethod
	public getTilePenalty(penalty: number, tile: ITile) {
		if (TileHelpers.getType(tile) === this.terrainHole) {
			penalty += 1000;
		}

		return penalty;
	}
}
