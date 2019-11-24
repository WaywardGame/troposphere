import { SfxType } from "audio/IAudio";
import { DoodadType } from "doodad/IDoodad";
import { Action } from "entity/action/Action";
import { ActionArgument, ActionType } from "entity/action/IAction";
import Creature from "entity/creature/Creature";
import { CreatureType, SpawnGroup, TileGroup } from "entity/creature/ICreature";
import Human from "entity/Human";
import { AiType, DamageType, Defense, EntityType, MoveType, Resistances, StatusType, Vulnerabilities } from "entity/IEntity";
import { Delay, HairColor, HairStyle, SkillType, SkinColor } from "entity/IHuman";
import { Source } from "entity/player/IMessageManager";
import { PlayerState } from "entity/player/IPlayer";
import { MessageType } from "entity/player/MessageManager";
import Player from "entity/player/Player";
import { EventHandler } from "event/EventManager";
import { RenderSource } from "game/IGame";
import { WorldZ } from "game/WorldZ";
import { ItemType, RecipeLevel } from "item/IItem";
import { itemDescriptions, RecipeComponent } from "item/Items";
import { LootGroupType } from "item/LootGroups";
import Message from "language/dictionary/Message";
import Note from "language/dictionary/Note";
import { HookMethod } from "mod/IHookHost";
import Mod from "mod/Mod";
import Register, { Registry } from "mod/ModRegistry";
import WalkToTileHandler from "newui/screen/screens/game/util/movement/WalkToTileHandler";
import { HelpArticle } from "newui/screen/screens/menu/menus/help/HelpArticleDescriptions";
import IWorld from "renderer/IWorld";
import { RenderFlag } from "renderer/IWorldRenderer";
import WorldRenderer from "renderer/WorldRenderer";
import { ITile, TerrainType } from "tile/ITerrain";
import Terrains from "tile/Terrains";
import Enums from "utilities/enum/Enums";
import { IInjectionApi, Inject, InjectionPosition } from "utilities/Inject";
import { Direction } from "utilities/math/Direction";
import { IVector2 } from "utilities/math/IVector";
import Vector2 from "utilities/math/Vector2";
import Vector3 from "utilities/math/Vector3";
import Random from "utilities/Random";
import TileHelpers from "utilities/TileHelpers";

interface ITroposphereData {
	seed: number;
}

export default class Troposphere extends Mod {

	@Mod.instance<Troposphere>("Troposphere")
	public static readonly INSTANCE: Troposphere;

	private static readonly troposphereZ: number = WorldZ.Max + 1;

	////////////////////////////////////
	// Misc Registrations
	//

	@Register.skill("flying")
	public skillFlying: SkillType;

	@Register.helpArticle("Flying", {
		image: true,
		section: "Troposphere",
	})
	public readonly flyingHelpArticle: HelpArticle;

	@Register.note("Flying", {
		learnMore: Registry<Troposphere>().get("flyingHelpArticle"),
	})
	public readonly flyingNote: Note;

	////////////////////////////////////
	// Action Registrations
	//

	@Register.action("Fly", new Action(ActionArgument.ItemInventory)
		.setUsableBy(EntityType.Player)
		.setHandler((action, item) => {
			Troposphere.INSTANCE.setFlying(action.executor, action.executor.z !== Troposphere.troposphereZ, true);
			item.damage(ActionType[action.type]);
		}))
	public readonly actionFly: ActionType;

	@Register.action("GatherRainbow", new Action(ActionArgument.ItemNearby)
		.setUsableBy(EntityType.Player)
		.setHandler((action, item) => {
			const player = action.executor;

			const tile = player.getFacingTile();
			const tileDoodad = tile.doodad;
			if (!tileDoodad || tileDoodad.type !== Troposphere.INSTANCE.doodadRainbow) {
				player.messages.source(Source.Action)
					.send(Troposphere.INSTANCE.messageNoRainbow);
				return;
			}

			player.messages.source(Source.Action, Source.Resource)
				.send(Troposphere.INSTANCE.messageGatheredRainbow);

			game.particle.create(player.x + player.direction.x, player.y + player.direction.y, player.z, { r: 12, g: 128, b: 247 });

			item.changeInto(Troposphere.INSTANCE.itemRainbowGlassBottle);

			doodadManager.remove(tileDoodad);

			game.passTurn(player);
		}))
	public readonly actionGatherRainbow: ActionType;

	////////////////////////////////////
	// Messages
	//

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

	////////////////////////////////////
	// Items
	//

	@Register.item("Nimbus", {
		use: [Registry<Troposphere>().get("actionFly")],
		recipe: {
			components: [
				RecipeComponent(ItemType.Feather, 2, 2, 2),
				RecipeComponent(Registry<Troposphere>().get("itemCloudstone"), 1, 1, 1),
				RecipeComponent(Registry<Troposphere>().get("itemSnowflakes"), 1, 1, 1),
			],
			skill: Registry<Troposphere>().get("skillFlying"),
			level: RecipeLevel.Simple,
			reputation: 50,
		},
		disassemble: true,
		durability: 15,
	})
	public itemNimbus: ItemType;

	@Register.item("Rainbow", {
		weight: 0.1,
		use: [ActionType.DrinkItem, ActionType.Build],
		onUse: {
			[ActionType.Build]: Registry<Troposphere>().get("doodadRainbow"),
		},
	})
	public itemRainbow: ItemType;

	@Register.item("RainbowGlassBottle", {
		weight: 1.0,
		use: [ActionType.DrinkItem],
		returnOnUseAndDecay: {
			type: ItemType.GlassBottle,
			damaged: true,
		},
	})
	public itemRainbowGlassBottle: ItemType;

	@Register.item("Snowflakes", {
		weight: 0.1,
		decayMax: 500,
	})
	public itemSnowflakes: ItemType;

	@Register.item("Cloudstone", {
		weight: 1,
	})
	public itemCloudstone: ItemType;

	////////////////////////////////////
	// Doodads
	//

	@Register.doodad("CloudBoulder", {
		particles: { r: 201, g: 224, b: 228 },
	})
	public doodadCloudBoulder: DoodadType;

	@Register.doodad("StormBoulder", {
		particles: { r: 141, g: 155, b: 158 },
	})
	public doodadStormBoulder: DoodadType;

	@Register.doodad("Rainbow", {
		particles: { r: 90, g: 48, b: 141 },
		blockMove: true,
	})
	public doodadRainbow: DoodadType;

	////////////////////////////////////
	// Terrain
	//

	@Register.terrain("CloudWater", {
		passable: true,
		shallowWater: true,
		particles: { r: 55, g: 192, b: 255 },
		freshWater: true,
		noBackground: true,
		tileOnConsume: Registry<Troposphere>().get("terrainHole"),
	})
	public terrainCloudWater: TerrainType;

	@Register.terrain("Clouds", {
		passable: true,
		particles: { r: 201, g: 224, b: 228 },
		noBackground: true,
	})
	public terrainCloud: TerrainType;

	@Register.terrain("CloudBoulder", {
		particles: { r: 201, g: 224, b: 228 },
		gatherSkillUse: SkillType.Lumberjacking,
		gather: true,
		noLos: true,
		sound: SfxType.TreeHit,
		leftOver: Registry<Troposphere>().get("terrainCloudWater"),
		noGfxSwitch: true,
		noBackground: true,
		doodad: Registry<Troposphere>().get("doodadCloudBoulder"),
		resources: [
			{ type: Registry<Troposphere>().get("itemCloudstone") },
		],
		terrainType: Registry<Troposphere>().get("terrainCloud"),
	})
	public terrainCloudBoulder: TerrainType;

	@Register.terrain("Cloudstone", {
		particles: { r: 201, g: 224, b: 228 },
		gatherSkillUse: SkillType.Mining,
		gather: true,
		noLos: true,
		sound: SfxType.RockHit,
		leftOver: Registry<Troposphere>().get("terrainCloud"),
		noGfxSwitch: true,
		isMountain: true,
		noBackground: true,
		resources: [
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone"), chance: 45 },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
		],
	})
	public terrainCloudstone: TerrainType;

	@Register.terrain("Storm", {
		passable: true,
		particles: { r: 141, g: 155, b: 158 },
		noBackground: true,
	})
	public terrainStorm: TerrainType;

	@Register.terrain("StormBoulder", {
		particles: { r: 141, g: 155, b: 158 },
		gatherSkillUse: SkillType.Lumberjacking,
		gather: true,
		noLos: true,
		sound: SfxType.TreeHit,
		leftOver: Registry<Troposphere>().get("terrainCloudWater"),
		noGfxSwitch: true,
		noBackground: true,
		doodad: Registry<Troposphere>().get("doodadStormBoulder"),
		resources: [
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone"), chance: 45 },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
		],
		terrainType: Registry<Troposphere>().get("terrainStorm"),
	})
	public terrainStormBoulder: TerrainType;

	@Register.terrain("Stormstone", {
		particles: { r: 141, g: 155, b: 158 },
		gatherSkillUse: SkillType.Mining,
		gather: true,
		noLos: true,
		sound: SfxType.RockHit,
		leftOver: Registry<Troposphere>().get("terrainStorm"),
		noGfxSwitch: true,
		isMountain: true,
		noBackground: true,
		resources: [
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone"), chance: 45 },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
		],
	})
	public terrainStormstone: TerrainType;

	@Register.terrain("Hole", {
		passable: true,
		particles: { r: 255, g: 255, b: 255 },
		noBackground: true,
	})
	public terrainHole: TerrainType;

	////////////////////////////////////
	// Creatures
	//

	@Register.creature("CloudBear", {
		minhp: 18,
		maxhp: 21,
		minatk: 5,
		maxatk: 13,
		defense: new Defense(3,
			new Resistances(
				DamageType.Piercing, 3,
				DamageType.Blunt, 1,
			),
			new Vulnerabilities(),
		),
		damageType: DamageType.Slashing | DamageType.Blunt,
		ai: AiType.Hostile,
		moveType: MoveType.Land | MoveType.ShallowWater | MoveType.Water | MoveType.BreakDoodads,
		canCauseStatus: [StatusType.Bleeding],
		spawnTiles: TileGroup.None,
		spawnReputation: 16000,
		reputation: 300,
		makeNoise: true,
		loot: [{
			item: Registry<Troposphere>().get("itemRainbow"),
			chance: 50,
		}],
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
			{ item: ItemType.BoneFragments },
		],
		decay: 2800,
		skill: SkillType.Anatomy,
	})
	public creatureBear: CreatureType;

	@Register.creature("CloudRabbit", {
		minhp: 3,
		maxhp: 6,
		minatk: 1,
		maxatk: 2,
		defense: new Defense(0,
			new Resistances(),
			new Vulnerabilities(),
		),
		damageType: DamageType.Slashing,
		ai: AiType.Scared,
		moveType: MoveType.Land | MoveType.ShallowWater,
		spawnTiles: TileGroup.None,
		reputation: -200,
		makeNoise: true,
		jumpOver: true,
		loot: [{ item: Registry<Troposphere>().get("itemSnowflakes") }],
	}, {
		resource: [
			{ item: ItemType.Cotton },
			{ item: ItemType.RawMeat },
			{ item: ItemType.Offal },
			{ item: ItemType.BoneFragments },
		],
		decay: 2400,
		skill: SkillType.Anatomy,
	})
	public creatureRabbit: CreatureType;

	@Register.creature("Cloudling", {
		minhp: 4,
		maxhp: 9,
		minatk: 2,
		maxatk: 3,
		defense: new Defense(0,
			new Resistances(
				DamageType.Piercing, 1,
			),
			new Vulnerabilities(
				DamageType.Blunt, 1,
			),
		),
		damageType: DamageType.Piercing,
		ai: AiType.Neutral,
		moveType: MoveType.Flying,
		reputation: 100,
		spawnTiles: TileGroup.None,
		loot: [
			{
				item: Registry<Troposphere>().get("itemSnowflakes"),
				chance: 75,
			},
			{ item: ItemType.Feather },
		],
		lootGroup: LootGroupType.Low,
	}, {
		resource: [
			{ item: ItemType.Feather },
			{ item: ItemType.Feather },
			{ item: ItemType.TailFeathers, chance: 1 },
			{ item: ItemType.RawChicken },
			{ item: ItemType.BoneFragments },
		],
		decay: 2400,
		skill: SkillType.Anatomy,
	})
	public creatureCloudling: CreatureType;

	@Register.creature("LightningElemental", {
		minhp: 30,
		maxhp: 38,
		minatk: 11,
		maxatk: 19,
		defense: new Defense(5,
			new Resistances(
				DamageType.Fire, 100,
			),
			new Vulnerabilities(),
		),
		damageType: DamageType.Fire | DamageType.Blunt,
		ai: AiType.Hostile,
		moveType: MoveType.Flying,
		spawnTiles: TileGroup.None,
		lootGroup: LootGroupType.High,
		loot: [{ item: ItemType.PileOfAsh }],
		blood: { r: 141, g: 155, b: 158 },
		aberrantBlood: { r: 95, g: 107, b: 122 },
		canCauseStatus: [StatusType.Bleeding],
		spawnReputation: 32000,
		reputation: 300,
		makeNoise: true,
	}, {
		resource: [{ item: ItemType.PileOfAsh }],
		decay: 400,
		skill: SkillType.Mining,
	})
	public creatureLightningElemental: CreatureType;

	@Register.creature("Sprite", {
		minhp: 30,
		maxhp: 38,
		minatk: 11,
		maxatk: 19,
		defense: new Defense(5,
			new Resistances(
				DamageType.Fire, 100,
			),
			new Vulnerabilities(),
		),
		damageType: DamageType.Fire | DamageType.Blunt,
		ai: AiType.Hostile,
		moveType: MoveType.Flying,
		spawnTiles: TileGroup.None,
		lootGroup: LootGroupType.High,
		blood: { r: 238, g: 130, b: 134 },
		canCauseStatus: [StatusType.Bleeding],
		spawnReputation: 32000,
		reputation: 500,
		makeNoise: true,
	}, {
		resource: [{ item: ItemType.Ectoplasm }],
		decay: 100,
	})
	public creatureSprite: CreatureType;

	////////////////////////////////////
	// Fields
	//

	@Mod.saveData<Troposphere>("Troposphere")
	public data: ITroposphereData;
	public firstLoad = true;

	private get creaturePool() {
		return [this.creatureBear, this.creatureRabbit, this.creatureCloudling, this.creatureLightningElemental];
	}
	private falling: boolean;

	@Override
	public initializeSaveData(data?: ITroposphereData) {
		if (data) {
			this.firstLoad = false;
			return data;
		}

		this.firstLoad = true;
		return {
			seed: new Date().getTime(),
		};
	}

	@Override
	public onLoad(): void {
		const glassBottle = itemDescriptions[ItemType.GlassBottle];
		if (glassBottle && glassBottle.use) {
			glassBottle.use.push(this.actionGatherRainbow);
		}
	}

	@Override
	public onUnload(): void {
		const glassBottle = itemDescriptions[ItemType.GlassBottle];
		if (glassBottle && glassBottle.use) {
			glassBottle.use.pop();
		}
	}

	public setFlying(player: Player, flying: boolean, passTurn: boolean): boolean {
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
			hasHair: player.customization.hairStyle !== "None",
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

	@Override @HookMethod
	public onCreateWorld(world: IWorld): void {
		world.addLayer(Troposphere.troposphereZ);
	}

	@Override @HookMethod
	public preLoadWorldDifferences(generateNewWorld: boolean) {
		// percentage
		const boulderChance = 0.6;
		const stormChance = 0.2;
		const rainbowChance = 0.15;

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
						if (Random.float() <= stormChance) {
							terrainType = this.terrainStormBoulder;

						} else {
							terrainType = this.terrainStorm;
						}

						break;

					case TerrainType.ShallowFreshWater:
						if (Random.float() <= rainbowChance) {
							terrainType = this.terrainCloud;
							doodadManager.create(this.doodadRainbow, x, y, Troposphere.troposphereZ);

						} else {
							terrainType = this.terrainCloudWater;
						}

						break;

					default:
						const doodad = overworldTile.doodad;
						if (doodad && doodad.canGrow()) {
							if (Random.float() <= boulderChance) {
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

	@Override @HookMethod
	public preRenderWorld(tileScale: number, viewWidth: number, viewHeight: number) {
		if (localPlayer.z !== Troposphere.troposphereZ) {
			return;
		}

		if (this.falling) {
			const turnProgress = 1 - Math.min(1, Math.max(0, (localPlayer.movementFinishTime - game.absoluteTime) / (Delay.Movement * game.interval)));
			tileScale = this.easeInCubic(turnProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
			game.updateRender(RenderSource.Mod);

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

	@Override @HookMethod
	public shouldRender() {
		if (this.falling) {
			return RenderFlag.Player;
		}
	}

	@Override @HookMethod
	public onGameStart(isLoadingSave: boolean): void {
		if ((!isLoadingSave || this.firstLoad) && !multiplayer.isConnected()) {
			// give nimbus
			localPlayer.createItemInInventory(this.itemNimbus);
		}
	}

	@Override @HookMethod
	public onPlayerJoin(player: Player): void {
		if (itemManager.getItemInContainer(player.inventory, this.itemNimbus) === undefined) {
			// give nimbus if they don't have one
			player.createItemInInventory(this.itemNimbus);
		}
	}

	@Override @HookMethod
	public onMove(player: Player, nextX: number, nextY: number, tile: ITile, direction: Direction): boolean | undefined {
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

	@Override @HookMethod
	public onMoveComplete(player: Player) {
		if (player.z !== Troposphere.troposphereZ) {
			return;
		}

		if (this.falling) {
			this.falling = false;
			this.setFlying(player, false, false);

			if (player.state !== PlayerState.Ghost) {
				let damage = -40;

				damage *= 1 - player.getSkill(this.skillFlying) / 100;

				const tile = game.getTile(player.x, player.y, player.z);
				const terrainType = TileHelpers.getType(tile);

				if (terrainType === TerrainType.DeepFreshWater || terrainType === TerrainType.DeepSeawater) {
					damage *= .5;

				} else if (terrainType === TerrainType.FreshWater || terrainType === TerrainType.Seawater) {
					damage *= .75;
				}

				damage = player.damage(damage, this.messageDeathByFalling);

				// fall damage
				player.messages.source(Source.Wellbeing)
					.type(MessageType.Bad)
					.send(this.messageFellToLand, damage);

				if (damage > 25 || damage > 15 && Random.chance(.5)) {
					tileEventManager.createBlood(player.x, player.y, player.z);
				}
			}

			player.addDelay(Delay.Collision, true);
			game.passTurn(player);
		}
	}

	@Override @HookMethod
	public onSpawnCreatureFromGroup(creatureGroup: SpawnGroup, creaturePool: CreatureType[], x: number, y: number, z: number): boolean | undefined {
		if (z !== Troposphere.troposphereZ) {
			return;
		}

		creaturePool.push.apply(creaturePool, this.creaturePool);
	}

	////////////////////////////////////
	// Event Handlers
	//

	@EventHandler(Human, "canConsumeItem")
	protected canConsumeItem(player: Player, itemType: ItemType, actionType: ActionType): boolean | undefined {
		if (itemType === this.itemRainbowGlassBottle && actionType === ActionType.DrinkItem) {
			player.customization = {
				hairStyle: HairStyle[Enums.getRandom(HairStyle)] as keyof typeof HairStyle,
				hairColor: HairColor[Enums.getRandom(HairColor)] as keyof typeof HairColor,
				skinColor: SkinColor[Enums.getRandom(SkinColor)] as keyof typeof SkinColor,
			};
			return true;
		}
	}

	@EventHandler(Creature, "canMove")
	protected canCreatureMove(creature: Creature, tile?: ITile): boolean | undefined {
		if (tile && TileHelpers.getType(tile) === this.terrainHole) {
			return creature.type !== this.creatureBear && creature.type !== this.creatureRabbit;
		}
	}

	@EventHandler(Creature, "canAttack")
	protected canCreatureAttack(creature: Creature, enemy: Player | Creature): boolean | undefined {
		if (creature.type !== this.creatureSprite) {
			return;
		}

		const creatureObj = creature as any;
		creatureObj.justAttacked = true;
	}

	@EventHandler(WorldRenderer, "canSeeCreature")
	protected canSeeCreature(_: any, creature: Creature, tile: ITile): boolean | undefined {
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

	@EventHandler(WalkToTileHandler, "getTilePenalty")
	protected getTilePenalty(_: any, penalty: number, tile: ITile) {
		if (TileHelpers.getType(tile) === this.terrainHole) {
			penalty += 1000;
		}

		return penalty;
	}

	////////////////////////////////////
	// Injections
	//

	@Inject(WorldRenderer, "getFogColor", InjectionPosition.Pre)
	protected getFogColor(api: IInjectionApi<WorldRenderer, "getFogColor">) {
		if (localPlayer.z !== Troposphere.troposphereZ) {
			return;
		}

		api.cancelled = true;

		const ambientLightLevel = game.getAmbientLightLevel(localPlayer.z);
		const ambientLightColor = new Vector3(api.executingInstance.calculateAmbientColor());
		if (ambientLightLevel > 0.5) {
			api.returnValue = Vector3.mix(ambientLightColor, Vector3.ONE, ambientLightLevel * 2 - 1).xyz;

		} else {
			api.returnValue = Vector3.mix(Vector3.ZERO, ambientLightColor, ambientLightLevel * 2).xyz;
		}
	}
}
