import { SfxType } from "audio/IAudio";
import { EventBus } from "event/EventBuses";
import { EventHandler } from "event/EventManager";
import { BiomeType } from "game/biome/IBiome";
import { DoodadType } from "game/doodad/IDoodad";
import { Action } from "game/entity/action/Action";
import { ActionArgument, ActionType } from "game/entity/action/IAction";
import Creature from "game/entity/creature/Creature";
import CreatureManager from "game/entity/creature/CreatureManager";
import { CreatureType, SpawnGroup, TileGroup } from "game/entity/creature/ICreature";
import Human from "game/entity/Human";
import { AiType, DamageType, Defense, EntityType, MoveType, StatusType } from "game/entity/IEntity";
import { Delay, HairColor, HairStyle, SkillType, SkinColor } from "game/entity/IHuman";
import { MessageType, Source } from "game/entity/player/IMessageManager";
import { PlayerState } from "game/entity/player/IPlayer";
import Player from "game/entity/player/Player";
import PlayerManager from "game/entity/player/PlayerManager";
import { BleedLevel } from "game/entity/status/handler/IBleeding";
import { Game } from "game/Game";
import Island from "game/island/Island";
import { ItemType, ItemTypeGroup, RecipeLevel, VehicleRenderType, VehicleType } from "game/item/IItem";
import { itemDescriptions, RecipeComponent } from "game/item/ItemDescriptions";
import { LootGroupType } from "game/item/LootGroups";
import { TerrainType } from "game/tile/ITerrain";
import Tile from "game/tile/Tile";
import { WorldZ } from "game/WorldZ";
import Message from "language/dictionary/Message";
import Note from "language/dictionary/Note";
import Mod from "mod/Mod";
import Register, { Registry } from "mod/ModRegistry";
import { RenderSource, UpdateRenderFlag } from "renderer/IRenderer";
import { RenderFlag } from "renderer/world/IWorldRenderer";
import World from "renderer/world/World";
import WorldRenderer from "renderer/world/WorldRenderer";
import WalkToTileHandler from "ui/screen/screens/game/util/movement/WalkToTileHandler";
import { HelpArticle } from "ui/screen/screens/menu/menus/help/HelpArticleDescriptions";
import { IInjectionApi, Inject, InjectionPosition } from "utilities/class/Inject";
import Enums from "utilities/enum/Enums";
import Vector2 from "utilities/math/Vector2";
import Vector3 from "utilities/math/Vector3";
import TileBits from "game/tile/TileBits";
import { createSeededRandom, generalRandom } from "utilities/random/RandomUtilities";

interface ITroposphereData {
	seed: number;
}

export default class Troposphere extends Mod {

	@Mod.instance<Troposphere>("Troposphere")
	public static readonly INSTANCE: Troposphere;

	@Register.worldLayer("troposphere")
	public readonly z: WorldZ;

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

	@Register.action("FlyToTroposphere", new Action(ActionArgument.ItemInventory)
		.setUsableBy(EntityType.Player)
		.setHandler((action, item) => {
			Troposphere.INSTANCE.setFlying(action.executor, action.executor.z !== Troposphere.INSTANCE.z, true);
			item.damage(ActionType[action.type]);
		}))
	public readonly actionFlyToTroposphere: ActionType;

	@Register.action("GatherRainbow", new Action(ActionArgument.ItemNearby)
		.setUsableBy(EntityType.Player)
		.setHandler((action, item) => {
			const player = action.executor;

			const tile = player.facingTile;
			const tileDoodad = tile.doodad;
			if (!tileDoodad || tileDoodad.type !== Troposphere.INSTANCE.doodadRainbow) {
				player.messages.source(Source.Action)
					.send(Troposphere.INSTANCE.messageNoRainbow);
				return;
			}

			player.messages.source(Source.Action, Source.Resource)
				.send(Troposphere.INSTANCE.messageGatheredRainbow);

			tile.createParticles({ r: 12, g: 128, b: 247 });

			item.changeInto(Troposphere.INSTANCE.itemRainbowGlassBottle);

			player.island.doodads.remove(tileDoodad);

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
		use: [ActionType.Ride, Registry<Troposphere>().get("actionFlyToTroposphere"), ActionType.Build],
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
		durability: 5000,
		vehicle: {
			type: VehicleType.Other,
			renderType: VehicleRenderType.Stand,
			movementSpeed: 4,
			movementType: MoveType.Flying,
			disallowedTileMessage: Message.None,
		},
		onUse: {
			[ActionType.Build]: {
				type: Registry<Troposphere>().get("doodadNimbus"),
			},
		},
	})
	public itemNimbus: ItemType;

	@Register.item("Rainbow", {
		weight: 0.1,
		use: [ActionType.DrinkItem, ActionType.Build],
		onUse: {
			[ActionType.Build]: {
				type: Registry<Troposphere>().get("doodadRainbow"),
			}
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
		use: [ActionType.DrinkItem],
		onBurn: [ItemType.None],
		onUse: {
			[ActionType.DrinkItem]: [0, 2, 0, 1],
		},
		tier: {
			[ItemTypeGroup.Liquid]: 1,
			[ItemTypeGroup.FrozenWater]: 1,
		},
		groups: [
			ItemTypeGroup.Liquid,
			ItemTypeGroup.FrozenWater,
		],
	})
	public itemSnowflakes: ItemType;

	@Register.item("Cloudstone", {
		weight: 1,
	})
	public itemCloudstone: ItemType;

	////////////////////////////////////
	// Group
	//

	@Register.itemGroup("Troposphere", {
		types: [
			Registry<Troposphere>().get("itemNimbus"),
			Registry<Troposphere>().get("itemRainbow"),
			Registry<Troposphere>().get("itemRainbowGlassBottle"),
			Registry<Troposphere>().get("itemSnowflakes"),
			Registry<Troposphere>().get("itemCloudstone"),
		],
		default: Registry<Troposphere>().get("itemNimbus"),
	})
	public groupTroposphere: ItemTypeGroup;

	////////////////////////////////////
	// Doodads
	//

	@Register.doodad("Nimbus", {
		pickUp: [Registry<Troposphere>().get("itemNimbus")],
		repairItem: Registry<Troposphere>().get("itemNimbus"),
		actionTypes: [ActionType.Ride],
		blockMove: true,
		canBreak: true,
		isFlammable: true,
		particles: { r: 201, g: 224, b: 228 },
		reduceDurabilityOnGather: true,
		renderAsSprite: true,
		isVehicle: true,
		isAnimated: {
			frameOffsetY: {
				[0]: 0,
				[1]: -0.0625,
			},
		},
	})
	public doodadNimbus: DoodadType;

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
		tileOnConsume: {
			[BiomeType.Coastal]: Registry<Troposphere>().get("terrainHole"),
			[BiomeType.IceCap]: Registry<Troposphere>().get("terrainHole"),
			[BiomeType.Arid]: Registry<Troposphere>().get("terrainHole"),
			[BiomeType.Volcanic]: Registry<Troposphere>().get("terrainHole"),
			[BiomeType.Wetlands]: Registry<Troposphere>().get("terrainHole"),
		},
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
		leftOvers: [{ terrainType: Registry<Troposphere>().get("terrainCloudWater") }],
		noBackground: true,
		useDoodadLikeAdaptor: true,
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
		sound: SfxType.GraniteHit,
		leftOvers: [{ terrainType: Registry<Troposphere>().get("terrainCloud") }],
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
		leftOvers: [{ terrainType: Registry<Troposphere>().get("terrainCloudWater") }],
		noBackground: true,
		useDoodadLikeAdaptor: true,
		resources: [
			{ type: Registry<Troposphere>().get("itemSnowflakes"), chance: 5 },
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
		sound: SfxType.GraniteHit,
		leftOvers: [{ terrainType: Registry<Troposphere>().get("terrainStorm") }],
		isMountain: true,
		noBackground: true,
		resources: [
			{ type: Registry<Troposphere>().get("itemSnowflakes"), chance: 5 },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemSnowflakes"), chance: 5 },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemSnowflakes"), chance: 5 },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemSnowflakes"), chance: 5 },
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
		defense: new Defense(3)
			.setResistance(DamageType.Piercing, 3)
			.setResistance(DamageType.Blunt, 1),
		damageType: DamageType.Slashing | DamageType.Blunt,
		ai: AiType.Hostile,
		moveType: MoveType.Land | MoveType.ShallowWater | MoveType.Water | MoveType.BreakDoodads,
		causesStatus: [[StatusType.Bleeding, BleedLevel.Major]],
		spawnTiles: TileGroup.None,
		spawn: {
			[BiomeType.Coastal]: {
				spawnsOnReputation: -16000,
			},
			[BiomeType.IceCap]: {
				spawnsOnReputation: -16000,
			},
			[BiomeType.Arid]: {
				spawnsOnReputation: -16000,
			},
		},
		reputation: 300,
		makeNoise: true,
		loot: [{
			item: Registry<Troposphere>().get("itemRainbow"),
			chance: 50,
		}],
		weight: 23.4,
		aberrantWeight: 23.4,
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
		defense: new Defense(0),
		damageType: DamageType.Slashing,
		ai: AiType.Scared,
		moveType: MoveType.Land | MoveType.ShallowWater,
		spawnTiles: TileGroup.None,
		reputation: -200,
		makeNoise: true,
		jumpOver: true,
		loot: [{ item: Registry<Troposphere>().get("itemSnowflakes") }],
		weight: 4.5,
		aberrantWeight: 4.6,
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
		defense: new Defense(0)
			.setResistance(DamageType.Piercing, 1)
			.setVulnerability(DamageType.Blunt, 1),
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
		weight: 0.1,
		aberrantWeight: 0.2,
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
		defense: new Defense(5)
			.setResistance(DamageType.Fire, 100),
		damageType: DamageType.Fire | DamageType.Blunt,
		ai: AiType.Hostile,
		moveType: MoveType.Flying,
		spawnTiles: TileGroup.None,
		lootGroup: LootGroupType.High,
		loot: [{ item: ItemType.PileOfAsh }],
		blood: { r: 141, g: 155, b: 158 },
		aberrantBlood: { r: 95, g: 107, b: 122 },
		causesStatus: [[StatusType.Bleeding, BleedLevel.Major]],
		spawn: {
			[BiomeType.Coastal]: {
				spawnsOnReputation: -24000,
			},
			[BiomeType.IceCap]: {
				spawnsOnReputation: -24000,
			},
			[BiomeType.Arid]: {
				spawnsOnReputation: -24000,
			},
		},
		reputation: 300,
		makeNoise: true,
		weight: 23.4,
		aberrantWeight: 25.5,
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
		defense: new Defense(5)
			.setResistance(DamageType.Fire, 100),
		damageType: DamageType.Fire | DamageType.Blunt,
		ai: AiType.Hostile,
		moveType: MoveType.Flying,
		spawnTiles: TileGroup.None,
		lootGroup: LootGroupType.High,
		blood: { r: 238, g: 130, b: 134 },
		causesStatus: [[StatusType.Bleeding, BleedLevel.Major]],
		spawn: {
			[BiomeType.Coastal]: {
				spawnsOnReputation: -32000,
			},
			[BiomeType.IceCap]: {
				spawnsOnReputation: -32000,
			},
			[BiomeType.Arid]: {
				spawnsOnReputation: -32000,
			},
		},
		reputation: 500,
		makeNoise: true,
		weight: 0.1,
		aberrantWeight: 0.2,
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

	public override initializeSaveData(data?: ITroposphereData) {
		if (data) {
			this.firstLoad = false;
			return data;
		}

		this.firstLoad = true;
		return {
			seed: new Date().getTime(),
		};
	}

	public override onLoad(): void {
		const glassBottle = itemDescriptions[ItemType.GlassBottle];
		if (glassBottle && glassBottle.use) {
			glassBottle.use.push(this.actionGatherRainbow);
		}
	}

	public override onUnload(): void {
		const glassBottle = itemDescriptions[ItemType.GlassBottle];
		if (glassBottle && glassBottle.use) {
			glassBottle.use.pop();
		}
	}

	public setFlying(player: Player, flying: boolean, passTurn: boolean): boolean {
		const z = !flying ? WorldZ.Overworld : this.z;

		const openTile = player.island.getTile(player.x, player.y, z).findMatchingTile(this.isFlyableTile.bind(this));
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
		player.setZ(z, false);

		player.setVehicle(undefined);

		player.skill.gain(this.skillFlying);

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

	public isFlyableTile(tile: Tile): boolean {
		if (tile.creature || tile.doodad) {
			return false;
		}

		const terrainType = tile.type;
		if (terrainType === this.terrainHole) {
			return false;
		}

		const terrainDescription = tile.description;
		return (!terrainDescription || (terrainDescription.water || terrainDescription.passable)) ? true : false;
	}

	public easeInCubic(time: number, start: number, change: number, duration: number): number {
		time /= duration;
		return change * time * time * time + start;
	}

	////////////////////////////////////////
	// Hooks

	@EventHandler(EventBus.Island, "createWorld")
	public onCreateWorld(island: Island, world: World): void {
		this.getLog().info(`Adding troposphere world layer ${this.z}`);
		world.addLayer(this.z);
	}

	@EventHandler(EventBus.Island, "preLoadWorldDifferences")
	public preLoadWorldDifferences(island: Island, generateNewWorld: boolean) {
		this.getLog().info("Running troposphere mapgen");

		// percentage
		const boulderChance = 0.6;
		const stormChance = 0.2;
		const rainbowChance = 0.15;

		const terrainHoleChance = 0.02;

		const creatureChance = 0.0025;
		const creatureSpriteChance = 0.0001;
		const creatureAberrantChance = 0.05;
		const creatureAberrantStormChance = 0.50;

		let tile: Tile;
		let terrainType: number;

		const seededRandom = createSeededRandom(island.seeds.type, false, this.data.seed);

		for (let x = 0; x < island.mapSize; x++) {
			for (let y = 0; y < island.mapSize; y++) {
				tile = island.setTile(x, y, this.z,
					island.getTileSafe(x, y, this.z) ?? new Tile(island, x, y, this.z, (this.z * island.mapSizeSq) + (y * island.mapSize) + x));

				const overworldTile = island.getTile(x, y, WorldZ.Overworld);
				const terrainDescription = overworldTile.description;
				const normalTerrainType = terrainDescription?.terrainType ?? TerrainType.Grass;

				switch (normalTerrainType) {
					case TerrainType.Granite:
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
						if (seededRandom.float() <= stormChance) {
							terrainType = this.terrainStormBoulder;

						} else {
							terrainType = this.terrainStorm;
						}

						break;

					case TerrainType.ShallowFreshWater:
						if (seededRandom.float() <= rainbowChance) {
							terrainType = this.terrainCloud;
							island.doodads.create(this.doodadRainbow, tile);

						} else {
							terrainType = this.terrainCloudWater;
						}

						break;

					default:
						const doodad = overworldTile.doodad;
						if (doodad && doodad.canGrow()) {
							if (seededRandom.float() <= boulderChance) {
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
					if (seededRandom.float() <= terrainHoleChance) {
						terrainType = this.terrainHole;
					}
				}

				tile.rendererData = TileBits.setTypeRaw(tile.rendererData, terrainType);
			}
		}

		for (let x = 0; x < island.mapSize; x++) {
			for (let y = 0; y < island.mapSize; y++) {
				const tile = island.getTile(x, y, this.z);

				terrainType = tile.type;

				if (generateNewWorld) {
					switch (terrainType) {
						case this.terrainCloud:
						case this.terrainStorm:
							const chance = seededRandom.float();
							const aberrantChance = terrainType === this.terrainCloud ? creatureAberrantChance : creatureAberrantStormChance;
							if (chance <= creatureSpriteChance) {
								island.creatures.spawn(this.creatureSprite, tile, true, seededRandom.float() <= aberrantChance);

							} else if (chance <= creatureChance) {
								const creatureType = this.creaturePool[seededRandom.int(this.creaturePool.length)];
								island.creatures.spawn(creatureType, tile, true, seededRandom.float() <= aberrantChance);
							}

							break;
					}
				}
			}
		}
	}

	@EventHandler(EventBus.WorldRenderer, "preRenderWorld")
	public preRenderWorld(worldRenderer: WorldRenderer, tileScale: number, viewWidth: number, viewHeight: number) {
		if (localPlayer.z !== this.z) {
			return;
		}

		const movementProgress = localPlayer.getMovementProgress(game.absoluteTime);

		if (this.falling) {
			tileScale = this.easeInCubic(movementProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
			renderer?.updateRender(RenderSource.Mod, UpdateRenderFlag.World);

		} else {
			tileScale *= 0.25;
		}

		let position = new Vector2(localPlayer.fromX, localPlayer.fromY)
			.lerp(localPlayer, movementProgress);

		const scale = 16 * worldRenderer.getZoom() * 0.25;
		position = new Vector2(position)
			.multiply(scale)
			.floor()
			.divide(scale);

		const overworldLayer = worldRenderer.layers[WorldZ.Overworld];

		const { viewportBounds } = worldRenderer.getBounds(game.absoluteTime);
		overworldLayer.ensureRendered(viewportBounds);

		worldRenderer.renderWorldLayer(overworldLayer, position.x, position.y, tileScale, viewWidth, viewHeight, RenderFlag.Terrain, false);
	}

	@EventHandler(EventBus.WorldRenderer, "shouldRender")
	public shouldRender(_: any): RenderFlag | undefined {
		if (this.falling) {
			return RenderFlag.Player;
		}

		return undefined;
	}

	@EventHandler(EventBus.Game, "play")
	public onGameStart(game: Game, isLoadingSave: boolean, playedCount: number): void {
		if ((!isLoadingSave || this.firstLoad) && !multiplayer.isConnected()) {
			// give nimbus
			localPlayer.createItemInInventory(this.itemNimbus);
		}
	}

	@EventHandler(EventBus.PlayerManager, "join")
	public onPlayerJoin(manager: PlayerManager, player: Player): void {
		if (player.island.items.getItemInContainer(player.inventory, this.itemNimbus) === undefined) {
			// give nimbus if they don't have one
			player.createItemInInventory(this.itemNimbus);
		}
	}

	@EventHandler(EventBus.Players, "preMove")
	public preMove(player: Player, fromTile: Tile, tile: Tile): boolean | void | undefined {
		if (player.z !== this.z) {
			return;
		}

		const terrainType = tile.type;
		if (terrainType === this.terrainHole) {
			this.falling = true;

			// localPlayer.addDelay(Delay.Collision, true);
			// game.passTurn(localPlayer);

			// no light blocking
			renderer?.fieldOfView.compute(game.absoluteTime);
		}
	}

	@EventHandler(EventBus.Players, "moveComplete")
	public onMoveComplete(player: Player) {
		if (player.z !== this.z) {
			return;
		}

		if (this.falling) {
			this.falling = false;
			this.setFlying(player, false, false);

			if (player.state !== PlayerState.Ghost) {
				let damage = -40;

				damage *= 1 - player.skill.get(this.skillFlying) / 100;

				const tile = player.island.getTile(player.x, player.y, player.z);
				const terrainType = tile.type;

				if (terrainType === TerrainType.DeepFreshWater || terrainType === TerrainType.DeepSeawater) {
					damage *= .5;

				} else if (terrainType === TerrainType.FreshWater || terrainType === TerrainType.Seawater) {
					damage *= .75;
				}

				const actualDamage = player.damage(damage, this.messageDeathByFalling);
				if (actualDamage !== undefined) {
					// fall damage
					player.messages.source(Source.Wellbeing)
						.type(MessageType.Bad)
						.send(this.messageFellToLand, actualDamage);

					if (actualDamage > 25 || actualDamage > 15 && player.island.seededRandom.chance(.5)) {
						player.island.tileEvents.createBlood(player);
					}
				}
			}

			player.addDelay(Delay.Collision, true);
			game.passTurn(player);
		}
	}

	@EventHandler(EventBus.CreatureManager, "shouldSpawnCreatureFromGroup")
	public shouldSpawnCreatureFromGroup(manager: CreatureManager, creatureGroup: SpawnGroup, creaturePool: CreatureType[], tile: Tile): boolean | undefined {
		if (tile.z !== this.z) {
			return;
		}

		creaturePool.push.apply(creaturePool, this.creaturePool);
	}

	////////////////////////////////////
	// Event Handlers
	//

	@EventHandler(Human, "canConsumeItem")
	protected canConsumeItem(human: Human, itemType: ItemType, actionType: ActionType): boolean | undefined {
		if (itemType === this.itemRainbowGlassBottle && actionType === ActionType.DrinkItem) {
			human.customization = {
				hairStyle: HairStyle[Enums.getRandom(HairStyle, human.island.seededRandom)] as keyof typeof HairStyle,
				hairColor: HairColor[Enums.getRandom(HairColor, human.island.seededRandom)] as keyof typeof HairColor,
				skinColor: SkinColor[Enums.getRandom(SkinColor, human.island.seededRandom)] as keyof typeof SkinColor,
			};
			return true;
		}

		return undefined;
	}

	@EventHandler(Creature, "canMove")
	protected canCreatureMove(creature: Creature, tile?: Tile): boolean | undefined {
		if (tile && tile.type === this.terrainHole) {
			return creature.type !== this.creatureBear && creature.type !== this.creatureRabbit;
		}
	}

	@EventHandler(Creature, "canAttack")
	protected canCreatureAttack(creature: Creature, enemy: Human | Creature): boolean | undefined {
		if (creature.type !== this.creatureSprite) {
			return;
		}

		const creatureObj = creature as any;
		creatureObj.justAttacked = true;
	}

	@EventHandler(WorldRenderer, "canSeeCreature")
	protected canSeeCreature(_: any, creature: Creature, tile: Tile): boolean | undefined {
		if (creature.type !== this.creatureSprite) {
			return;
		}

		const creatureObj = creature as any;

		if (creatureObj.justAttacked) {
			creatureObj.justAttacked = undefined;
			return;
		}

		if (creatureObj.nextVisibleCount === undefined || creatureObj.nextVisibleCount === 0) {
			creatureObj.nextVisibleCount = generalRandom.intInRange(1, 6);
			return;
		}

		creatureObj.nextVisibleCount--;

		return false;
	}

	@EventHandler(WalkToTileHandler, "getTilePenalty")
	protected getTilePenalty(_: any, penalty: number, tile: Tile) {
		if (tile.type === this.terrainHole) {
			penalty += 1000;
		}

		return penalty;
	}

	////////////////////////////////////
	// Injections
	//

	@Inject(WorldRenderer, "getFogColor", InjectionPosition.Pre)
	protected getFogColor(api: IInjectionApi<WorldRenderer, "getFogColor">) {
		if (localPlayer.z !== this.z || !renderer) {
			return;
		}

		api.cancelled = true;

		const ambientLightLevel = renderer.getAmbientLightLevel(localPlayer.z);
		const ambientLightColor = new Vector3(api.executingInstance.calculateAmbientColor());
		if (ambientLightLevel > 0.5) {
			api.returnValue = Vector3.mix(ambientLightColor, Vector3.ONE, ambientLightLevel * 2 - 1).xyz;

		} else {
			api.returnValue = Vector3.mix(Vector3.ZERO, ambientLightColor, ambientLightLevel * 2).xyz;
		}
	}
}
