import { SfxType } from "@wayward/game/audio/IAudio";
import { EventBus } from "@wayward/game/event/EventBuses";
import { EventHandler } from "@wayward/game/event/EventManager";
import { BiomeType } from "@wayward/game/game/biome/IBiome";
import Deity from "@wayward/game/game/deity/Deity";
import type Doodad from "@wayward/game/game/doodad/Doodad";
import type { DoodadType } from "@wayward/game/game/doodad/IDoodad";
import { Action } from "@wayward/game/game/entity/action/Action";
import type { IActionUsable } from "@wayward/game/game/entity/action/IAction";
import { ActionArgument, ActionType } from "@wayward/game/game/entity/action/IAction";
import { AiType } from "@wayward/game/game/entity/ai/AI";
import Creature from "@wayward/game/game/entity/creature/Creature";
import creatureZoneDescriptions from "@wayward/game/game/entity/creature/zone/CreatureZoneDescriptions";
import type { IBiomeCreatureZones, IBiomeCreatureZoneSpawnGroup } from "@wayward/game/game/entity/creature/zone/ICreatureZone";
import Human from "@wayward/game/game/entity/Human";
import { DamageType, Defense, EntityType, MoveType } from "@wayward/game/game/entity/IEntity";
import { Delay, HairColor, HairStyle, SkinColor } from "@wayward/game/game/entity/IHuman";
import { MessageType, Source } from "@wayward/game/game/entity/player/IMessageManager";
import { PlayerState } from "@wayward/game/game/entity/player/IPlayer";
import Player from "@wayward/game/game/entity/player/Player";
import { BleedLevel } from "@wayward/game/game/entity/status/handler/IBleeding";
import { StatusType } from "@wayward/game/game/entity/status/IStatus";
import type { IslandId } from "@wayward/game/game/island/IIsland";
import type Island from "@wayward/game/game/island/Island";
import { ItemType, ItemTypeGroup, RecipeLevel, VehicleRenderType, VehicleType } from "@wayward/game/game/item/IItem";
import { RecipeComponent, itemDescriptions } from "@wayward/game/game/item/ItemDescriptions";
import { LootGroupType } from "@wayward/game/game/item/LootGroups";
import { TerrainType } from "@wayward/game/game/tile/ITerrain";
import { TileEventType } from "@wayward/game/game/tile/ITileEvent";
import type Tile from "@wayward/game/game/tile/Tile";
import TileBits from "@wayward/game/game/tile/TileBits";
import { PartOfDay } from "@wayward/game/game/time/ITimeManager";
import Message from "@wayward/game/language/dictionary/Message";
import { ModRegistrationTime } from "@wayward/game/mod/BaseMod";
import Mod from "@wayward/game/mod/Mod";
import type { IOverrideDescription } from "@wayward/game/mod/ModRegistry";
import { RenderSource, UpdateRenderFlag } from "@wayward/game/renderer/IRenderer";
import { RenderFlag } from "@wayward/game/renderer/world/IWorldRenderer";
import type World from "@wayward/game/renderer/world/World";
import { WorldRenderer } from "@wayward/game/renderer/world/WorldRenderer";
import Enums from "@wayward/game/utilities/enum/Enums";
import Vector2 from "@wayward/game/utilities/math/Vector2";
import Vector3 from "@wayward/game/utilities/math/Vector3";
import Merge from "@wayward/game/utilities/object/Merge";
import type { IInjectionApi } from "@wayward/game/utilities/Inject";
import { Inject, InjectionPosition } from "@wayward/game/utilities/Inject";
import WorldZ from "@wayward/utilities/game/WorldZ";
import Objects from "@wayward/utilities/object/Objects";
import { generalRandom } from "@wayward/utilities/random/RandomUtilities";
import { SkillType } from "@wayward/game/game/entity/skill/ISkills";
import type { IBound3 } from "@wayward/game/utilities/math/Bound3";

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
//#region Registrations

const skillFlying = Mod.register.skill("flying");

const flyingHelpArticle = Mod.register.helpArticle("Flying", {
	image: true,
	section: "Troposphere",
});

const flyingNote = Mod.register.note("Flying", {
	learnMore: flyingHelpArticle.value,
});

const messageFlewToTroposphere = Mod.register.message("FlewToTroposphere");
const messageFlewToTroposphereFailure = Mod.register.message("FlewToTroposphereFailure");
const messageFlewToLand = Mod.register.message("FlewToLand");
const messageFlewToLandFailure = Mod.register.message("FlewToLandFailure");
const messageFellToLand = Mod.register.message("FellToLand");
const messageDeathByFalling = Mod.register.message("DeathByFalling");
const messageGatheredRainbow = Mod.register.message("GatheredRainbow");
const messageNoRainbow = Mod.register.message("NoRainbow");

const troposphereZ = Mod.register.worldLayer("troposphere");

const creatureCloudBear = Mod.register.creature("CloudBear");
const creatureCloudRabbit = Mod.register.creature("CloudRabbit");
const creatureCloudling = Mod.register.creature("Cloudling");
const creatureLightningElemental = Mod.register.creature("LightningElemental");
const creatureSprite = Mod.register.creature("Sprite");

const itemNimbus = Mod.register.item("Nimbus");
const itemRainbow = Mod.register.item("Rainbow");
const itemRainbowGlassBottle = Mod.register.item("RainbowGlassBottle");
const itemSnowflakes = Mod.register.item("Snowflakes");
const itemCloudstone = Mod.register.item("Cloudstone");

const doodadNimbus = Mod.register.doodad("Nimbus");
const doodadRainbow = Mod.register.doodad("Rainbow");

const tileGroupCloudCover = Mod.register.tileGroup("CloudCover");
const tileGroupStormClouds = Mod.register.tileGroup("StormClouds");
const tileGroupAllTroposphere = Mod.register.tileGroup("AllTroposphere");

////////////////////////////////////
//#region Creatures

creatureCloudBear.define({
	minhp: 18,
	maxhp: 21,
	minatk: 5,
	maxatk: 13,
	defense: new Defense(3)
		.setResistance(DamageType.Piercing, 3)
		.setResistance(DamageType.Blunt, 1),
	damageType: DamageType.Slashing | DamageType.Blunt,
	ai: AiType.Hostile,
	moveType: MoveType.Land | MoveType.ShallowWater | MoveType.Water | MoveType.DamageFacingDoodads,
	causesStatus: [[StatusType.Bleeding, BleedLevel.Major]],
	runeChance: [Deity.Good, 0.3],
	makeNoise: true,
	loot: [{
		item: itemRainbow.value,
		chance: 50,
	}],
	weight: 23.4,
	aberrantWeight: 23.4,
	spawnTiles: tileGroupCloudCover.value,
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
});

creatureCloudRabbit.define({
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
	loot: [{ item: itemSnowflakes.value }],
	weight: 4.5,
	aberrantWeight: 4.6,
	spawnTiles: tileGroupCloudCover.value,
}, {
	resource: [
		{ item: ItemType.Cotton },
		{ item: ItemType.RawMeat },
		{ item: ItemType.Offal },
		{ item: ItemType.BoneFragments },
	],
	decay: 2400,
	skill: SkillType.Anatomy,
});

creatureCloudling.define({
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
			item: itemSnowflakes.value,
			chance: 75,
		},
		{ item: ItemType.Feather },
	],
	lootGroup: LootGroupType.Low,
	weight: 3.2,
	aberrantWeight: 3.2,
	spawnTiles: tileGroupAllTroposphere.value,
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
});

creatureLightningElemental.define({
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
	spawnTiles: tileGroupStormClouds.value,
}, {
	resource: [{ item: ItemType.PileOfAsh }],
	decay: 400,
	skill: SkillType.Mining,
});

creatureSprite.define({
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
	spawnTiles: tileGroupStormClouds.value,
}, {
	resource: [{ item: ItemType.Ectoplasm }],
	decay: 100,
});

//#endregion
////////////////////////////////////

////////////////////////////////////
//#region Creature Zones
//

const CREATURE_ZONES: IBiomeCreatureZones = {
	creatures: {
		tier0: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[troposphereZ.value, [
				{
					[PartOfDay.Always]: [
						[creatureCloudRabbit.value],
					],
				},
			]],
		]),
		tier1: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[troposphereZ.value, [
				{
					[PartOfDay.AllDaytime]: [
						[creatureCloudRabbit.value],
					],
					[PartOfDay.AllNighttime]: [
						[creatureCloudling.value],
					],
				},
			]],
		]),
		tier2: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[troposphereZ.value, [
				{
					[PartOfDay.AllDaytime]: [
						[creatureCloudRabbit.value],
						[creatureCloudling.value],
					],
					[PartOfDay.AllNighttime]: [
						[creatureCloudBear.value],
					],
				},
			]],
		]),
		tier3: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[troposphereZ.value, [
				{
					[PartOfDay.Always]: [
						[creatureCloudRabbit.value, creatureCloudBear.value],
						[creatureCloudling.value, creatureCloudBear.value],
					],
				},
			]],
		]),
		tier4: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[troposphereZ.value, [
				{
					[PartOfDay.AllDaytime]: [
						[creatureCloudBear.value],
						[creatureCloudling.value, creatureCloudling.value, creatureCloudRabbit.value],
					],
					[PartOfDay.AllNighttime]: [
						[creatureLightningElemental.value],
					],
				},
			]],
		]),
		tier5: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[troposphereZ.value, [
				{
					[PartOfDay.Always]: [
						[creatureCloudBear.value, creatureLightningElemental.value],
						[creatureLightningElemental.value, creatureCloudling.value, creatureCloudRabbit.value],
						[creatureCloudBear.value],
					],
				},
			]],
		]),
		tier6: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[troposphereZ.value, [
				{
					[PartOfDay.Always]: [
						[creatureCloudBear.value, creatureLightningElemental.value],
						[creatureLightningElemental.value],
					],
					[PartOfDay.AllNighttime]: [
						[creatureSprite.value, creatureLightningElemental.value],
					],
				},
			]],
		]),
		tier7: new Map<WorldZ, IBiomeCreatureZoneSpawnGroup[]>([
			[troposphereZ.value, [
				{
					[PartOfDay.Always]: [
						[creatureSprite.value],
						[creatureLightningElemental.value, creatureSprite.value, creatureCloudBear.value],
					],
					[PartOfDay.AllNighttime]: [
						[creatureSprite.value],
					],
				},
			]],
		]),
	},
};

for (const biome of Enums.values(BiomeType)) {
	Mod.register.override(ModRegistrationTime.Load, (): IOverrideDescription<typeof creatureZoneDescriptions, BiomeType> => ({
		object: creatureZoneDescriptions,
		property: biome,
		value: Merge(Objects.deepClone(creatureZoneDescriptions[biome]), Objects.deepClone(CREATURE_ZONES)),
	}));
}

//#endregion
////////////////////////////////////

////////////////////////////////////
//#region Actions

const actionFlyToTroposphere = new Action(ActionArgument.ItemInventory)
	.setUsableBy(EntityType.Human)
	.setPreExecutionHandler((action, weapon) => action.addItems(weapon))
	.setCanUse((action, item) => {
		if (!item.description?.use?.includes(actionFlyToTroposphere.type)) {
			return {
				usable: false,
			};
		}

		return {
			usable: true,
		};
	})
	.setHandler((action, item) => {
		Troposphere.INSTANCE.setFlying(action.executor, action.executor.z !== troposphereZ.value, true);
		item.damage(ActionType[action.type]);
	})
	.modRegistration("FlyToTroposphere");

const actionGatherRainbow = new Action(ActionArgument.ItemNearby)
	.setUsableBy(EntityType.Human)
	.setCanUse<ITroposphereGatherRanbowCanUse>((action, item) => {
		const player = action.executor;

		const tile = player.facingTile;
		const tileDoodad = tile.doodad;
		if (!tileDoodad || tileDoodad.type !== doodadRainbow.value) {
			return {
				usable: false,
				message: messageNoRainbow.value,
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
			.send(messageGatheredRainbow.value);

		tile.createParticles({ r: 12, g: 128, b: 247 });

		item.changeInto(itemRainbowGlassBottle.value);

		player.island.doodads.remove(tileDoodad);

		player.passTurn();
	})
	.modRegistration("GatherRainbow");

//#endregion
////////////////////////////////////

////////////////////////////////////
//#region Items

itemNimbus.define({
	use: [ActionType.Ride, actionFlyToTroposphere.type, ActionType.Build],
	recipe: {
		components: [
			RecipeComponent(ItemType.Feather, 4, 4, 4),
			RecipeComponent(itemCloudstone.value, 4, 4, 4),
		],
		skill: skillFlying.value,
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
			type: doodadNimbus.value,
		},
	},
});

itemRainbow.define({
	weight: 0.1,
	use: [ActionType.DrinkItem, ActionType.Build],
	onUse: {
		[ActionType.Build]: {
			type: doodadRainbow.value,
		},
	},
});

itemRainbowGlassBottle.define({
	weight: 1.0,
	use: [ActionType.DrinkItem],
	returnOnUseAndDecay: {
		type: ItemType.GlassBottle,
		damaged: true,
	},
});

itemSnowflakes.define({
	weight: 0.1,
	decayMax: 500,
	use: [ActionType.DrinkItem],
	onBurn: [ItemType.None],
	onUse: {
		[ActionType.DrinkItem]: [0, 2, 0, 1, SkillType.None],
	},
	tier: {
		[ItemTypeGroup.Liquid]: 1,
		[ItemTypeGroup.FrozenWater]: 1,
	},
	groups: [
		ItemTypeGroup.Liquid,
		ItemTypeGroup.FrozenWater,
	],
});

itemCloudstone.define({
	weight: 0.2,
});

Mod.register.itemGroup("Troposphere", {
	types: [
		itemNimbus.value,
		itemRainbow.value,
		itemRainbowGlassBottle.value,
		itemSnowflakes.value,
		itemCloudstone.value,
	],
	default: itemNimbus.value,
});

//#endregion
////////////////////////////////////

////////////////////////////////////
//#region Doodads

doodadNimbus.define({
	pickUp: [itemNimbus.value],
	asItem: itemNimbus.value,
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
});

doodadRainbow.define({
	particles: { r: 90, g: 48, b: 141 },
	blockMove: true,
	asItem: itemRainbow.value,
});

//#endregion
////////////////////////////////////

////////////////////////////////////
//#region Terrain
//

const terrainHole = Mod.register.terrain("Hole", {
	passable: true,
	particles: { r: 255, g: 255, b: 255 },
	noBackground: true,
});

const terrainCloudWater = Mod.register.terrain("CloudWater", {
	passable: true,
	shallowWater: true,
	particles: { r: 55, g: 192, b: 255 },
	freshWater: true,
	reduceRest: true,
	tileOnConsume: {
		[BiomeType.Coastal]: terrainHole.value,
		[BiomeType.IceCap]: terrainHole.value,
		[BiomeType.Arid]: terrainHole.value,
		[BiomeType.Volcanic]: terrainHole.value,
		[BiomeType.Wetlands]: terrainHole.value,
	},
	waterBaseType: TerrainType.ShallowSeawater,
	puddleType: TileEventType.PuddleOfFreshWater,
});

const terrainCloud = Mod.register.terrain("Clouds", {
	passable: true,
	particles: { r: 201, g: 224, b: 228 },
});

const terrainCloudBoulder = Mod.register.terrain("CloudBoulder", {
	particles: { r: 201, g: 224, b: 228 },
	gatherSkillUse: SkillType.Lumberjacking,
	gather: true,
	noLos: true,
	sound: SfxType.TreeHit,
	leftOvers: [{ terrainType: terrainCloudWater.value }],
	resources: [
		{ itemType: itemCloudstone.value },
	],
	useDoodadLikeAdaptor: true,
	background: terrainCloud.value,
});

const terrainCloudstone = Mod.register.terrain("Cloudstone", {
	particles: { r: 201, g: 224, b: 228 },
	gatherSkillUse: SkillType.Mining,
	gather: true,
	noLos: true,
	sound: SfxType.GraniteHit,
	leftOvers: [{ terrainType: terrainCloud.value }],
	isMountain: true,
	resources: [
		{ itemType: itemCloudstone.value },
		{ itemType: itemCloudstone.value },
		{ itemType: itemCloudstone.value },
		{ itemType: itemCloudstone.value },
		{ itemType: itemCloudstone.value },
		{ itemType: itemCloudstone.value },
		{ itemType: itemCloudstone.value, chance: 45 },
		{ itemType: itemCloudstone.value },
	],
});

const terrainStorm = Mod.register.terrain("Storm", {
	passable: true,
	particles: { r: 141, g: 155, b: 158 },
});

const terrainStormBoulder = Mod.register.terrain("StormBoulder", {
	particles: { r: 141, g: 155, b: 158 },
	gatherSkillUse: SkillType.Lumberjacking,
	gather: true,
	noLos: true,
	sound: SfxType.TreeHit,
	leftOvers: [{ terrainType: terrainCloudWater.value }],
	resources: [
		{ itemType: itemSnowflakes.value, chance: 5 },
		{ itemType: itemCloudstone.value },
		{ itemType: itemCloudstone.value, chance: 45 },
		{ itemType: itemCloudstone.value },
	],
	useDoodadLikeAdaptor: true,
	background: terrainStorm.value,
});

const terrainStormstone = Mod.register.terrain("Stormstone", {
	particles: { r: 141, g: 155, b: 158 },
	gatherSkillUse: SkillType.Mining,
	gather: true,
	noLos: true,
	sound: SfxType.GraniteHit,
	leftOvers: [{ terrainType: terrainStorm.value }],
	isMountain: true,
	resources: [
		{ itemType: itemSnowflakes.value, chance: 5 },
		{ itemType: itemCloudstone.value },
		{ itemType: itemSnowflakes.value, chance: 5 },
		{ itemType: itemCloudstone.value },
		{ itemType: itemSnowflakes.value, chance: 5 },
		{ itemType: itemCloudstone.value },
		{ itemType: itemSnowflakes.value, chance: 5 },
		{ itemType: itemCloudstone.value },
		{ itemType: itemCloudstone.value, chance: 45 },
		{ itemType: itemCloudstone.value },
	],
});

tileGroupCloudCover.define(new Set([
	terrainCloud.value,
	terrainStorm.value,
]));

tileGroupStormClouds.define(new Set([
	terrainCloudBoulder.value,
	terrainCloudstone.value,
	terrainStormBoulder.value,
	terrainStormstone.value,
]));

tileGroupAllTroposphere.define(new Set([
	terrainCloud.value,
	terrainStorm.value,
	terrainCloudBoulder.value,
	terrainCloudstone.value,
	terrainStormBoulder.value,
	terrainStormstone.value,
]));

//#endregion
////////////////////////////////////

//#endregion
////////////////////////////////////

export default class Troposphere extends Mod {

	@Mod.instance<Troposphere>("Troposphere")
	public static readonly INSTANCE: Troposphere;

	@Mod.saveData<Troposphere>("Troposphere")
	public data: ITroposphereData;

	private flushedOverworld = false;

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
		if (glassBottle?.use) {
			glassBottle.use.push(actionGatherRainbow.type);
		}
	}

	public override onUnload(): void {
		const glassBottle = itemDescriptions[ItemType.GlassBottle];
		if (glassBottle?.use) {
			glassBottle.use.pop();
		}
	}

	public setFlying(human: Human, flying: boolean, passTurn: boolean): boolean {
		const z = !flying ? WorldZ.Surface : troposphereZ.value;

		const openTile = human.island.getTile(human.x, human.y, z).findMatchingTile(this.isFlyableTile.bind(this));
		if (openTile === undefined || human.z === WorldZ.Cave) {
			if (passTurn) {
				human.messages.source(Source.Action)
					.type(MessageType.Bad)
					.send(flying ? messageFlewToTroposphereFailure.value : messageFlewToLandFailure.value);
			}

			return false;
		}

		human.x = openTile.x;
		human.y = openTile.y;
		human.setZ(z, false);

		human.setVehicle(undefined);

		human.skill.gain(skillFlying.value);

		human.notes.write(flyingNote.value, {
			hasHair: human.customization.hairStyle !== "None",
		});

		if (passTurn) {
			human.messages.source(Source.Action, Source.Item)
				.type(MessageType.Good)
				.send(flying ? messageFlewToTroposphere.value : messageFlewToLand.value);

			human.passTurn();
		}

		return true;
	}

	public isFlyableTile(tile: Tile): boolean {
		if (tile.creature || tile.doodad) {
			return false;
		}

		const terrainType = tile.type;
		if (terrainType === terrainHole.value) {
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
		this.flushedOverworld = false;

		const islandData = this.data.islands.get(island.id);
		if (!islandData) {
			this.data.islands.set(island.id, {
				createdLayer: false,
			});
		}

		island.world.addLayer(troposphereZ.value);

		this.log.info(`Added troposphere world layer ${troposphereZ.value} for island ${island.id}`);
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
						terrainType = terrainCloudstone.value;
						break;

					case TerrainType.DeepSeawater:
					case TerrainType.DeepFreshWater:
						terrainType = terrainStormstone.value;
						break;

					case TerrainType.Seawater:
					case TerrainType.FreshWater:
					case TerrainType.ShallowSeawater:
						if (seededRandom.float() <= stormChance) {
							terrainType = terrainStormBoulder.value;

						} else {
							terrainType = terrainStorm.value;
						}

						break;

					case TerrainType.ShallowFreshWater:
						if (seededRandom.float() <= rainbowChance) {
							terrainType = terrainCloud.value;
							createDoodad = doodadRainbow.value;

						} else {
							terrainType = terrainCloudWater.value;
						}

						break;

					default:
						if (seededRandom.float() <= boulderChance) {
							terrainType = terrainCloudBoulder.value;

						} else {
							terrainType = terrainCloud.value;
						}

						break;
				}

				if (terrainType === terrainCloud.value || terrainType === terrainStorm.value) {
					if (seededRandom.float() <= terrainHoleChance) {
						terrainType = terrainHole.value;
					}
				}

				const rendererData = TileBits.setTypeRaw(0, terrainType);
				const tile = island.createTile(x, y, troposphereZ.value, (troposphereZ.value * island.mapSizeSq) + (y * island.mapSize) + x, rendererData, overworldTile.quality);
				if (createDoodad !== undefined && islandData.doodadsToCreate) {
					islandData.doodadsToCreate.push({ tile, doodadType: createDoodad });
				}
			}
		}
	}

	@EventHandler(EventBus.Island, "postGenerateWorld")
	public postGenerateWorld(island: Island): void {
		const islandData = this.data.islands.get(island.id);
		if (!islandData?.doodadsToCreate) {
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
		if (localPlayer.z !== troposphereZ.value) {
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

		if (!this.flushedOverworld) {
			this.flushedOverworld = true;
			overworldLayer.updateAll();
		}

		const { viewportBounds } = worldRenderer.getBounds(timestamp);

		const viewportBoundsAdjusted: IBound3 = {
			min: viewportBounds.min.copy().divide(4).round(),
			max: viewportBounds.max.copy().multiply(4).round(),
			z: viewportBounds.z,
		};

		while (overworldLayer.ensureRendered(viewportBoundsAdjusted, true)) {
			// keep ensuring the overworld is flushed
		}

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

		player.createItemInInventory(itemNimbus.value);
	}

	@EventHandler(EventBus.Players, "preMove")
	public preMove(player: Player, fromTile: Tile, tile: Tile): boolean | void | undefined {
		if (player.z !== troposphereZ.value) {
			return;
		}

		const terrainType = tile.type;
		if (terrainType === terrainHole.value) {
			this.setPlayerFalling(player, true);

			// no light blocking
			renderer?.fieldOfView.compute(game.absoluteTime);
		}
	}

	@EventHandler(EventBus.Players, "moveComplete")
	public onMoveComplete(player: Player): void {
		if (player.z !== troposphereZ.value) {
			return;
		}

		if (this.isPlayerFalling(player)) {
			this.setPlayerFalling(player, false);

			this.setFlying(player, false, false);

			if (player.state !== PlayerState.Ghost) {
				let damage = -40;

				damage *= 1 - player.skill.get(skillFlying.value) / 100;

				const tile = player.island.getTile(player.x, player.y, player.z);
				const terrainType = tile.type;

				if (terrainType === TerrainType.DeepFreshWater || terrainType === TerrainType.DeepSeawater) {
					damage *= .5;

				} else if (terrainType === TerrainType.FreshWater || terrainType === TerrainType.Seawater) {
					damage *= .75;
				}

				const actualDamage = player.damage({
					amount: damage,
					damageMessage: messageDeathByFalling.value,
					type: DamageType.True,
					noCalculation: true,
				});

				if (actualDamage !== undefined) {
					// fall damage
					player.messages.source(Source.Wellbeing)
						.type(MessageType.Bad)
						.send(messageFellToLand.value, actualDamage);

					if ((actualDamage > 25 || actualDamage > 15) && player.island.seededRandom.chance(.5)) {
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
		if (itemType === itemRainbowGlassBottle.value && actionType === ActionType.DrinkItem) {
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
		if (tile && tile.type === terrainHole.value) {
			return creature.type !== creatureCloudBear.value && creature.type !== creatureCloudRabbit.value;
		}
	}

	@EventHandler(Creature, "canAttack")
	protected canCreatureAttack(creature: Creature, enemy: Human | Creature): boolean | undefined {
		if (creature.type !== creatureSprite.value) {
			return;
		}

		const creatureObj = creature as any;
		creatureObj.justAttacked = true;
	}

	@EventHandler(WorldRenderer, "canSeeCreature")
	protected canSeeCreature(_: any, creature: Creature, tile: Tile): boolean | undefined {
		if (creature.type !== creatureSprite.value) {
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
		if (tile.type === terrainHole.value) {
			penalty += 1000;
		}

		return penalty;
	}

	////////////////////////////////////
	// Injections
	//

	@Inject(WorldRenderer, "getFogColor", InjectionPosition.Pre)
	protected getFogColor(api: IInjectionApi<WorldRenderer, "getFogColor">): void {
		if (localPlayer.z !== troposphereZ.value || !renderer) {
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
