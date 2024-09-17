import { SfxType } from "@wayward/game/audio/IAudio";
import { EventBus } from "@wayward/game/event/EventBuses";
import { EventHandler } from "@wayward/game/event/EventManager";
import { BiomeType } from "@wayward/game/game/biome/IBiome";
import Deity from "@wayward/game/game/deity/Deity";
import Doodad from "@wayward/game/game/doodad/Doodad";
import { DoodadType } from "@wayward/game/game/doodad/IDoodad";
import { Action } from "@wayward/game/game/entity/action/Action";
import { ActionArgument, ActionType, IActionUsable } from "@wayward/game/game/entity/action/IAction";
import { AiType } from "@wayward/game/game/entity/ai/AI";
import Creature from "@wayward/game/game/entity/creature/Creature";
import { CreatureType, TileGroup } from "@wayward/game/game/entity/creature/ICreature";
import creatureZoneDescriptions from "@wayward/game/game/entity/creature/zone/CreatureZoneDescriptions";
import { IBiomeCreatureZones, IBiomeCreatureZoneSpawnGroup } from "@wayward/game/game/entity/creature/zone/ICreatureZone";
import Human from "@wayward/game/game/entity/Human";
import { DamageType, Defense, EntityType, MoveType } from "@wayward/game/game/entity/IEntity";
import { Delay, HairColor, HairStyle, SkillType, SkinColor } from "@wayward/game/game/entity/IHuman";
import { MessageType, Source } from "@wayward/game/game/entity/player/IMessageManager";
import { PlayerState } from "@wayward/game/game/entity/player/IPlayer";
import Player from "@wayward/game/game/entity/player/Player";
import { BleedLevel } from "@wayward/game/game/entity/status/handler/IBleeding";
import { StatusType } from "@wayward/game/game/entity/status/IStatus";
import { IslandId } from "@wayward/game/game/island/IIsland";
import Island from "@wayward/game/game/island/Island";
import { ItemType, ItemTypeGroup, RecipeLevel, VehicleRenderType, VehicleType } from "@wayward/game/game/item/IItem";
import { RecipeComponent, itemDescriptions } from "@wayward/game/game/item/ItemDescriptions";
import { LootGroupType } from "@wayward/game/game/item/LootGroups";
import { TerrainType } from "@wayward/game/game/tile/ITerrain";
import { TileEventType } from "@wayward/game/game/tile/ITileEvent";
import Tile from "@wayward/game/game/tile/Tile";
import TileBits from "@wayward/game/game/tile/TileBits";
import { PartOfDay } from "@wayward/game/game/time/ITimeManager";
import Message from "@wayward/game/language/dictionary/Message";
import Note from "@wayward/game/language/dictionary/Note";
import { ModRegistrationTime } from "@wayward/game/mod/BaseMod";
import Mod from "@wayward/game/mod/Mod";
import Register, { IOverrideDescription, OverrideDecorator, Registry } from "@wayward/game/mod/ModRegistry";
import { RenderSource, UpdateRenderFlag } from "@wayward/game/renderer/IRenderer";
import { RenderFlag } from "@wayward/game/renderer/world/IWorldRenderer";
import World from "@wayward/game/renderer/world/World";
import { WorldRenderer } from "@wayward/game/renderer/world/WorldRenderer";
import { HelpArticle } from "@wayward/game/ui/screen/screens/menu/menus/help/HelpArticleDescriptions";
import Enums from "@wayward/game/utilities/enum/Enums";
import Vector2 from "@wayward/game/utilities/math/Vector2";
import Vector3 from "@wayward/game/utilities/math/Vector3";
import Merge from "@wayward/game/utilities/object/Merge";
import { IInjectionApi, Inject, InjectionPosition } from "@wayward/utilities/class/Inject";
import { Tuple } from "@wayward/utilities/collection/Tuple";
import WorldZ from "@wayward/utilities/game/WorldZ";
import Objects from "@wayward/utilities/object/Objects";
import { generalRandom } from "@wayward/utilities/random/RandomUtilities";

const NAME = "Troposphere";

interface ITroposphereData {
	islands: Map<IslandId, ITroposphereIslandData>;
	players: Map<string, ITropospherePlayerData>;
}

interface ITroposphereIslandData {
	createdLayer: boolean;
	doodadsToCreate?: Array<{ tile: Tile; doodadType: DoodadType }>;
}

interface ITropospherePlayerData {
	createdItems: boolean;
	falling: boolean;
}

interface ITroposphereGatherRanbowCanUse extends IActionUsable {
	tile: Tile;
	tileDoodad: Doodad;
}

////////////////////////////////////
// Creature Zone Descriptions
//

const CREATURE_ZONES: IBiomeCreatureZones = {
	tiers: {
		tier0: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[Registry<Troposphere>(NAME).get("z"), [
				{
					[PartOfDay.Always]: [
						[Registry<Troposphere>(NAME).get("creatureCloudRabbit")],
					],
				},
			]],
		]),
		tier1: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[Registry<Troposphere>("Troposphere").get("z"), [
				{
					[PartOfDay.AllDaytime]: [
						[Registry<Troposphere>(NAME).get("creatureCloudRabbit")],
					],
					[PartOfDay.AllNighttime]: [
						[Registry<Troposphere>(NAME).get("creatureCloudling")],
					],
				},
			]],
		]),
		tier2: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[Registry<Troposphere>(NAME).get("z"), [
				{
					[PartOfDay.AllDaytime]: [
						[Registry<Troposphere>(NAME).get("creatureCloudRabbit")],
						[Registry<Troposphere>(NAME).get("creatureCloudling")],
					],
					[PartOfDay.AllNighttime]: [
						[Registry<Troposphere>(NAME).get("creatureCloudBear")],
					],
				},
			]],
		]),
		tier3: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[Registry<Troposphere>(NAME).get("z"), [
				{
					[PartOfDay.Always]: [
						[Registry<Troposphere>(NAME).get("creatureCloudRabbit"), Registry<Troposphere>(NAME).get("creatureCloudBear")],
						[Registry<Troposphere>(NAME).get("creatureCloudling"), Registry<Troposphere>(NAME).get("creatureCloudBear")],
					],
				},
			]],
		]),
		tier4: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[Registry<Troposphere>(NAME).get("z"), [
				{
					[PartOfDay.AllDaytime]: [
						[Registry<Troposphere>(NAME).get("creatureCloudBear")],
						[Registry<Troposphere>(NAME).get("creatureCloudling"), Registry<Troposphere>(NAME).get("creatureCloudling"), Registry<Troposphere>(NAME).get("creatureCloudRabbit")],
					],
					[PartOfDay.AllNighttime]: [
						[Registry<Troposphere>(NAME).get("creatureLightningElemental")],
					],
				},
			]],
		]),
		tier5: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[Registry<Troposphere>(NAME).get("z"), [
				{
					[PartOfDay.Always]: [
						[Registry<Troposphere>(NAME).get("creatureCloudBear"), Registry<Troposphere>(NAME).get("creatureLightningElemental")],
						[Registry<Troposphere>(NAME).get("creatureLightningElemental"), Registry<Troposphere>(NAME).get("creatureCloudling"), Registry<Troposphere>(NAME).get("creatureCloudRabbit")],
						[Registry<Troposphere>(NAME).get("creatureCloudBear")],
					],
				},
			]],
		]),
		tier6: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[Registry<Troposphere>(NAME).get("z"), [
				{
					[PartOfDay.Always]: [
						[Registry<Troposphere>(NAME).get("creatureCloudBear"), Registry<Troposphere>(NAME).get("creatureLightningElemental")],
						[Registry<Troposphere>(NAME).get("creatureLightningElemental")],
					],
					[PartOfDay.AllNighttime]: [
						[Registry<Troposphere>(NAME).get("creatureSprite"), Registry<Troposphere>(NAME).get("creatureLightningElemental")],
					],
				},
			]],
		]),
		tier7: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[Registry<Troposphere>(NAME).get("z"), [
				{
					[PartOfDay.Always]: [
						[Registry<Troposphere>(NAME).get("creatureSprite")],
						[Registry<Troposphere>(NAME).get("creatureLightningElemental"), Registry<Troposphere>(NAME).get("creatureSprite"), Registry<Troposphere>(NAME).get("creatureCloudBear")],
					],
					[PartOfDay.AllNighttime]: [
						[Registry<Troposphere>(NAME).get("creatureSprite")],
					],
				},
			]],
		]),
	},
};

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
		.setUsableBy(EntityType.Human)
		.setPreExecutionHandler((action, weapon) => action.addItems(weapon))
		.setCanUse((action, item) => {
			if (!item.description?.use?.includes(Troposphere.INSTANCE.actionFlyToTroposphere)) {
				return {
					usable: false,
				};
			}

			return {
				usable: true,
			};
		})
		.setHandler((action, item) => {
			Troposphere.INSTANCE.setFlying(action.executor, action.executor.z !== Troposphere.INSTANCE.z, true);
			item.damage(ActionType[action.type]);
		}))
	public readonly actionFlyToTroposphere: ActionType;

	@Register.action("GatherRainbow", new Action(ActionArgument.ItemNearby)
		.setUsableBy(EntityType.Human)
		.setCanUse<ITroposphereGatherRanbowCanUse>((action, item) => {
			const player = action.executor;

			const tile = player.facingTile;
			const tileDoodad = tile.doodad;
			if (!tileDoodad || tileDoodad.type !== Troposphere.INSTANCE.doodadRainbow) {
				return {
					usable: false,
					message: Troposphere.INSTANCE.messageNoRainbow,
				};
			}

			return {
				usable: true,
				tile,
				tileDoodad,
			};
		})
		.setHandler((action, item) => {
			const player = action.executor;

			const tile = player.facingTile;
			const tileDoodad = tile.doodad!;

			player.messages.source(Source.Action, Source.Resource)
				.send(Troposphere.INSTANCE.messageGatheredRainbow);

			tile.createParticles({ r: 12, g: 128, b: 247 });

			item.changeInto(Troposphere.INSTANCE.itemRainbowGlassBottle);

			player.island.doodads.remove(tileDoodad);

			player.passTurn();
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
				RecipeComponent(ItemType.Feather, 4, 4, 4),
				RecipeComponent(Registry<Troposphere>().get("itemCloudstone"), 4, 4, 4),
			],
			skill: Registry<Troposphere>().get("skillFlying"),
			level: RecipeLevel.Simple,
			runeChance: [Deity.Good, 0.05],
		},
		storeDisassemblyItems: true,
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
		weight: 0.2,
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
		asItem: Registry<Troposphere>().get("itemNimbus"),
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
		asItem: Registry<Troposphere>().get("itemRainbow"),
	})
	public doodadRainbow: DoodadType;

	////////////////////////////////////
	// Tile Groups
	//
	@Register.tileGroup("CloudCover", new Set([
		Registry<Troposphere>().get("terrainCloud"),
		Registry<Troposphere>().get("terrainStorm"),
	]))
	public tileGroupCloudCover: TileGroup;

	@Register.tileGroup("StormClouds", new Set([
		Registry<Troposphere>().get("terrainCloudBoulder"),
		Registry<Troposphere>().get("terrainCloudstone"),
		Registry<Troposphere>().get("terrainStormBoulder"),
		Registry<Troposphere>().get("terrainStormstone"),
	]))
	public tileGroupStormClouds: TileGroup;

	@Register.tileGroup("AllTroposphere", new Set([
		Registry<Troposphere>().get("terrainCloud"),
		Registry<Troposphere>().get("terrainStorm"),
		Registry<Troposphere>().get("terrainCloudBoulder"),
		Registry<Troposphere>().get("terrainCloudstone"),
		Registry<Troposphere>().get("terrainStormBoulder"),
		Registry<Troposphere>().get("terrainStormstone"),
	]))
	public tileGroupAllTroposphere: TileGroup;

	////////////////////////////////////
	// Terrain
	//

	@Register.terrain("CloudWater", {
		passable: true,
		shallowWater: true,
		particles: { r: 55, g: 192, b: 255 },
		freshWater: true,
		reduceRest: true,
		tileOnConsume: {
			[BiomeType.Coastal]: Registry<Troposphere>().get("terrainHole"),
			[BiomeType.IceCap]: Registry<Troposphere>().get("terrainHole"),
			[BiomeType.Arid]: Registry<Troposphere>().get("terrainHole"),
			[BiomeType.Volcanic]: Registry<Troposphere>().get("terrainHole"),
			[BiomeType.Wetlands]: Registry<Troposphere>().get("terrainHole"),
		},
		terrainType: Registry<Troposphere>().get("terrainCloudWater"),
		waterBaseType: TerrainType.ShallowSeawater,
		puddleType: TileEventType.PuddleOfFreshWater,
	})
	public terrainCloudWater: TerrainType;

	@Register.terrain("Clouds", {
		passable: true,
		particles: { r: 201, g: 224, b: 228 },
		terrainType: Registry<Troposphere>().get("terrainCloud"),
	})
	public terrainCloud: TerrainType;

	@Register.terrain("CloudBoulder", {
		particles: { r: 201, g: 224, b: 228 },
		gatherSkillUse: SkillType.Lumberjacking,
		gather: true,
		noLos: true,
		sound: SfxType.TreeHit,
		leftOvers: [{ terrainType: Registry<Troposphere>().get("terrainCloudWater") }],
		resources: [
			{ type: Registry<Troposphere>().get("itemCloudstone") },
		],
		useDoodadLikeAdaptor: true,
		background: Registry<Troposphere>().get("terrainCloud"),
		terrainType: Registry<Troposphere>().get("terrainCloudBoulder"),
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
		terrainType: Registry<Troposphere>().get("terrainCloudstone"),
	})
	public terrainCloudstone: TerrainType;

	@Register.terrain("Storm", {
		passable: true,
		particles: { r: 141, g: 155, b: 158 },
		terrainType: Registry<Troposphere>().get("terrainStorm"),
	})
	public terrainStorm: TerrainType;

	@Register.terrain("StormBoulder", {
		particles: { r: 141, g: 155, b: 158 },
		gatherSkillUse: SkillType.Lumberjacking,
		gather: true,
		noLos: true,
		sound: SfxType.TreeHit,
		leftOvers: [{ terrainType: Registry<Troposphere>().get("terrainCloudWater") }],
		resources: [
			{ type: Registry<Troposphere>().get("itemSnowflakes"), chance: 5 },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
			{ type: Registry<Troposphere>().get("itemCloudstone"), chance: 45 },
			{ type: Registry<Troposphere>().get("itemCloudstone") },
		],
		useDoodadLikeAdaptor: true,
		background: Registry<Troposphere>().get("terrainStorm"),
		terrainType: Registry<Troposphere>().get("terrainStormBoulder"),
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
		terrainType: Registry<Troposphere>().get("terrainStormstone"),
	})
	public terrainStormstone: TerrainType;

	@Register.terrain("Hole", {
		passable: true,
		particles: { r: 255, g: 255, b: 255 },
		noBackground: true,
		terrainType: Registry<Troposphere>().get("terrainHole"),
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
		runeChance: [Deity.Good, 0.3],
		makeNoise: true,
		loot: [{
			item: Registry<Troposphere>().get("itemRainbow"),
			chance: 50,
		}],
		weight: 23.4,
		aberrantWeight: 23.4,
		spawnTiles: Registry<Troposphere>().get("tileGroupCloudCover"),
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
	public creatureCloudBear: CreatureType;

	@Register.creature("CloudRabbit", {
		minhp: 3,
		maxhp: 6,
		minatk: 1,
		maxatk: 2,
		defense: new Defense(0),
		damageType: DamageType.Slashing,
		ai: AiType.Scared,
		moveType: MoveType.Land | MoveType.ShallowWater,
		runeChance: [Deity.Evil, 0.2],
		makeNoise: true,
		jumpOver: true,
		loot: [{ item: Registry<Troposphere>().get("itemSnowflakes") }],
		weight: 4.5,
		aberrantWeight: 4.6,
		spawnTiles: Registry<Troposphere>().get("tileGroupCloudCover"),
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
	public creatureCloudRabbit: CreatureType;

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
		runeChance: [Deity.Good, 0.1],
		loot: [
			{
				item: Registry<Troposphere>().get("itemSnowflakes"),
				chance: 75,
			},
			{ item: ItemType.Feather },
		],
		lootGroup: LootGroupType.Low,
		weight: 3.2,
		aberrantWeight: 3.2,
		spawnTiles: Registry<Troposphere>().get("tileGroupAllTroposphere"),
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
		lootGroup: LootGroupType.High,
		loot: [{ item: ItemType.PileOfAsh }],
		blood: { r: 141, g: 155, b: 158 },
		aberrantBlood: { r: 95, g: 107, b: 122 },
		causesStatus: [[StatusType.Bleeding, BleedLevel.Major]],
		runeChance: [Deity.Good, 0.3],
		makeNoise: true,
		weight: 23.4,
		aberrantWeight: 25.5,
		spawnTiles: Registry<Troposphere>().get("tileGroupStormClouds"),
	}, {
		resource: [{ item: ItemType.PileOfAsh }],
		decay: 400,
		skill: SkillType.Mining,
	})
	public creatureLightningElemental: CreatureType;

	@Register.creature("Sprite", {
		minhp: 39,
		maxhp: 42,
		minatk: 18,
		maxatk: 24,
		defense: new Defense(6)
			.setResistance(DamageType.Cold, 100),
		damageType: DamageType.Cold | DamageType.Blunt,
		ai: AiType.Hostile,
		moveType: MoveType.Flying,
		lootGroup: LootGroupType.High,
		blood: { r: 238, g: 130, b: 134 },
		causesStatus: [[StatusType.Bleeding, BleedLevel.Major]],
		runeChance: [Deity.Good, 0.5],
		makeNoise: true,
		weight: 0.1,
		aberrantWeight: 0.2,
		spawnTiles: Registry<Troposphere>().get("tileGroupStormClouds"),
	}, {
		resource: [{ item: ItemType.Ectoplasm }],
		decay: 100,
	})
	public creatureSprite: CreatureType;

	////////////////////////////////////
	// Creature Zone Overrides
	//

	@Register.bulk<"override", OverrideDecorator<typeof creatureZoneDescriptions, BiomeType>>("override", ...Enums.values(BiomeType)
		.map(biome => Tuple(ModRegistrationTime.Load, (): IOverrideDescription<typeof creatureZoneDescriptions, BiomeType> => ({
			object: creatureZoneDescriptions,
			property: biome,
			value: Merge(Objects.deepClone(creatureZoneDescriptions[biome]), Objects.deepClone(CREATURE_ZONES)),
		}))))
	public creatureZoneOverrides: (typeof creatureZoneDescriptions)[];

	////////////////////////////////////
	// Fields
	//

	@Mod.saveData<Troposphere>("Troposphere")
	public data: ITroposphereData;

	public override initializeSaveData(data?: ITroposphereData): ITroposphereData {
		if (!data) {
			data = {
				islands: new Map(),
				players: new Map(),
			};
		}

		// for backwards compat
		if (!data.islands) {
			data.islands = new Map();
		}

		// for backwards compat
		if (!data.players) {
			data.players = new Map();
		}

		return data;
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

	public setFlying(human: Human, flying: boolean, passTurn: boolean): boolean {
		const z = !flying ? WorldZ.Surface : this.z;

		const openTile = human.island.getTile(human.x, human.y, z).findMatchingTile(this.isFlyableTile.bind(this));
		if (openTile === undefined || human.z === WorldZ.Cave) {
			if (passTurn) {
				human.messages.source(Source.Action)
					.type(MessageType.Bad)
					.send(flying ? this.messageFlewToTroposphereFailure : this.messageFlewToLandFailure);
			}

			return false;
		}

		human.x = openTile.x;
		human.y = openTile.y;
		human.setZ(z, false);

		human.setVehicle(undefined);

		human.skill.gain(this.skillFlying);

		human.notes.write(this.flyingNote, {
			hasHair: human.customization.hairStyle !== "None",
		});

		if (passTurn) {
			human.messages.source(Source.Action, Source.Item)
				.type(MessageType.Good)
				.send(flying ? this.messageFlewToTroposphere : this.messageFlewToLand);

			human.passTurn();
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

	@EventHandler(EventBus.Island, "preLoadWorld")
	public onPreLoadWorld(island: Island, world: World): void {
		const islandData = this.data.islands.get(island.id);
		if (!islandData) {
			this.data.islands.set(island.id, {
				createdLayer: false,
			});
		}

		island.world.addLayer(this.z);

		this.log.info(`Added troposphere world layer ${this.z} for island ${island.id}`);
	}

	@EventHandler(EventBus.Island, "preLoadWorldDifferences")
	public preLoadWorldDifferences(island: Island, generateNewWorld: boolean): void {
		const islandData = this.data.islands.get(island.id);
		if (!islandData) {
			return;
		}

		this.log.info(`Running troposphere mapgen. Has existing troposphere: ${islandData.createdLayer}`);

		if (!islandData.createdLayer) {
			islandData.doodadsToCreate = [];
		}

		islandData.createdLayer = true;

		// percentage
		const boulderChance = 0.02;
		const stormChance = 0.2;
		const rainbowChance = 0.15;

		const terrainHoleChance = 0.02;

		const seededRandom = island.seededRandom.clone(undefined, island.seeds.base).advance();

		for (let x = 0; x < island.mapSize; x++) {
			for (let y = 0; y < island.mapSize; y++) {
				const overworldTile = island.getTile(x, y, WorldZ.Surface);
				const terrainDescription = overworldTile.description;
				const normalTerrainType = terrainDescription?.terrainType ?? TerrainType.Grass;

				let createDoodad: DoodadType | undefined;

				let terrainType: TerrainType;

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
							createDoodad = this.doodadRainbow;

						} else {
							terrainType = this.terrainCloudWater;
						}

						break;

					default:
						if (seededRandom.float() <= boulderChance) {
							terrainType = this.terrainCloudBoulder;

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

				const rendererData = TileBits.setTypeRaw(0, terrainType);
				const tile = island.createTile(x, y, this.z, (this.z * island.mapSizeSq) + (y * island.mapSize) + x, rendererData, overworldTile.quality);
				if (createDoodad !== undefined && islandData.doodadsToCreate) {
					islandData.doodadsToCreate.push({ tile, doodadType: createDoodad });
				}
			}
		}
	}

	@EventHandler(EventBus.Island, "postGenerateWorld")
	public postGenerateWorld(island: Island) {
		const islandData = this.data.islands.get(island.id);
		if (!islandData || !islandData.doodadsToCreate) {
			return;
		}

		this.log.info("Creating troposphere doodads");

		for (const doodadToCreate of islandData.doodadsToCreate) {
			island.doodads.create(doodadToCreate.doodadType, doodadToCreate.tile);
		}

		delete islandData.doodadsToCreate;
	}

	@EventHandler(EventBus.WorldRenderer, "preRenderWorld")
	public preRenderWorld(worldRenderer: WorldRenderer, tileScale: number, viewWidth: number, viewHeight: number, timestamp: number): void {
		if (localPlayer.z !== this.z) {
			return;
		}

		const movementProgress = localPlayer.getMovementProgress(timestamp);

		if (this.isPlayerFalling(localPlayer)) {
			tileScale = this.easeInCubic(movementProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
			renderer?.updateRender(RenderSource.Mod, UpdateRenderFlag.World);

		} else {
			tileScale *= 0.25;
		}

		let position = new Vector2(localPlayer.fromX, localPlayer.fromY)
			.lerp(localPlayer, movementProgress);

		const scale = 16 * worldRenderer.getZoom() * 0.5;
		position = new Vector2(position)
			.multiply(scale)
			.floor()
			.divide(scale);

		const overworldLayer = worldRenderer.layers[WorldZ.Surface];

		const { viewportBounds } = worldRenderer.getBounds(timestamp);
		overworldLayer.ensureRendered(viewportBounds, true);

		worldRenderer.renderWorldLayer(overworldLayer, position.x, position.y, tileScale, viewWidth, viewHeight, RenderFlag.Terrain, false);
	}

	@EventHandler(EventBus.WorldRenderer, "shouldRender")
	public shouldRender(_: any): RenderFlag | undefined {
		if (this.isPlayerFalling(localPlayer)) {
			return RenderFlag.Player;
		}

		return undefined;
	}

	@EventHandler(Player, "loadedOnIsland")
	protected onPlayerSpawn(player: Player): void {
		// give nimbus
		let playerData = this.data.players.get(player.identifier);
		if (playerData) {
			playerData.falling = false;
			return;
		}

		playerData = {
			createdItems: true,
			falling: false,
		};
		this.data.players.set(player.identifier, playerData);

		player.createItemInInventory(this.itemNimbus);
	}

	@EventHandler(EventBus.Players, "preMove")
	public preMove(player: Player, fromTile: Tile, tile: Tile): boolean | void | undefined {
		if (player.z !== this.z) {
			return;
		}

		const terrainType = tile.type;
		if (terrainType === this.terrainHole) {
			this.setPlayerFalling(player, true);

			// no light blocking
			renderer?.fieldOfView.compute(game.absoluteTime);
		}
	}

	@EventHandler(EventBus.Players, "moveComplete")
	public onMoveComplete(player: Player): void {
		if (player.z !== this.z) {
			return;
		}

		if (this.isPlayerFalling(player)) {
			this.setPlayerFalling(player, false);

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

				const actualDamage = player.damage({
					amount: damage,
					damageMessage: this.messageDeathByFalling,
					type: DamageType.True,
					noCalculation: true,
				});

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
			player.passTurn();
		}
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
			return creature.type !== this.creatureCloudBear && creature.type !== this.creatureCloudRabbit;
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

	@EventHandler(Human, "getTilePenalty")
	protected getTilePenalty(_: any, penalty: number, tile: Tile): number {
		if (tile.type === this.terrainHole) {
			penalty += 1000;
		}

		return penalty;
	}

	////////////////////////////////////
	// Injections
	//

	@Inject(WorldRenderer, "getFogColor", InjectionPosition.Pre)
	protected getFogColor(api: IInjectionApi<WorldRenderer, "getFogColor">): void {
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

	private isPlayerFalling(player: Human): boolean {
		return this.data.players.get(player.identifier)?.falling ? true : false;
	}

	private setPlayerFalling(player: Human, falling: boolean): void {
		const playerData = this.data.players.get(player.identifier);
		if (playerData) {
			playerData.falling = falling;
		}
	}
}
