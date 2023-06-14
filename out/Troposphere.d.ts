/*!
 * Copyright 2011-2023 Unlok
 * https://www.unlok.ca
 *
 * Credits & Thanks:
 * https://www.unlok.ca/credits-thanks/
 *
 * Wayward is a copyrighted and licensed work. Modification and/or distribution of any source files is prohibited. If you wish to modify the game in any way, please refer to the modding guide:
 * https://github.com/WaywardGame/types/wiki
 */
import { WorldZ } from "game/WorldZ";
import { DoodadType } from "game/doodad/IDoodad";
import Human from "game/entity/Human";
import { SkillType } from "game/entity/IHuman";
import { ActionType } from "game/entity/action/IAction";
import Creature from "game/entity/creature/Creature";
import CreatureManager from "game/entity/creature/CreatureManager";
import { CreatureType, SpawnGroup } from "game/entity/creature/ICreature";
import Player from "game/entity/player/Player";
import { IslandId } from "game/island/IIsland";
import Island from "game/island/Island";
import { ItemType, ItemTypeGroup } from "game/item/IItem";
import { TerrainType } from "game/tile/ITerrain";
import Tile from "game/tile/Tile";
import Message from "language/dictionary/Message";
import Note from "language/dictionary/Note";
import Mod from "mod/Mod";
import { RenderFlag } from "renderer/world/IWorldRenderer";
import World from "renderer/world/World";
import WorldRenderer from "renderer/world/WorldRenderer";
import { HelpArticle } from "ui/screen/screens/menu/menus/help/HelpArticleDescriptions";
import { IInjectionApi } from "utilities/class/Inject";
interface ITroposphereData {
    islands: Map<IslandId, ITroposphereIslandData>;
    players: Map<string, ITropospherePlayerData>;
}
interface ITroposphereIslandData {
    createdLayer: boolean;
}
interface ITropospherePlayerData {
    createdItems: boolean;
    falling: boolean;
}
export default class Troposphere extends Mod {
    static readonly INSTANCE: Troposphere;
    readonly z: WorldZ;
    skillFlying: SkillType;
    readonly flyingHelpArticle: HelpArticle;
    readonly flyingNote: Note;
    readonly actionFlyToTroposphere: ActionType;
    readonly actionGatherRainbow: ActionType;
    readonly messageFlewToTroposphere: Message;
    readonly messageFlewToTroposphereFailure: Message;
    readonly messageFlewToLand: Message;
    readonly messageFlewToLandFailure: Message;
    readonly messageFellToLand: Message;
    readonly messageDeathByFalling: Message;
    readonly messageGatheredRainbow: Message;
    readonly messageNoRainbow: Message;
    itemNimbus: ItemType;
    itemRainbow: ItemType;
    itemRainbowGlassBottle: ItemType;
    itemSnowflakes: ItemType;
    itemCloudstone: ItemType;
    groupTroposphere: ItemTypeGroup;
    doodadNimbus: DoodadType;
    doodadRainbow: DoodadType;
    terrainCloudWater: TerrainType;
    terrainCloud: TerrainType;
    terrainCloudBoulder: TerrainType;
    terrainCloudstone: TerrainType;
    terrainStorm: TerrainType;
    terrainStormBoulder: TerrainType;
    terrainStormstone: TerrainType;
    terrainHole: TerrainType;
    creatureBear: CreatureType;
    creatureRabbit: CreatureType;
    creatureCloudling: CreatureType;
    creatureLightningElemental: CreatureType;
    creatureSprite: CreatureType;
    data: ITroposphereData;
    private get creaturePool();
    initializeSaveData(data?: ITroposphereData): ITroposphereData;
    onLoad(): void;
    onUnload(): void;
    setFlying(human: Human, flying: boolean, passTurn: boolean): boolean;
    isFlyableTile(tile: Tile): boolean;
    easeInCubic(time: number, start: number, change: number, duration: number): number;
    onPreLoadWorld(island: Island, world: World): void;
    preLoadWorldDifferences(island: Island, generateNewWorld: boolean): void;
    preRenderWorld(worldRenderer: WorldRenderer, tileScale: number, viewWidth: number, viewHeight: number, timestamp: number): void;
    shouldRender(_: any): RenderFlag | undefined;
    protected onPlayerSpawn(player: Player): void;
    preMove(player: Player, fromTile: Tile, tile: Tile): boolean | void | undefined;
    onMoveComplete(player: Player): void;
    shouldSpawnCreatureFromGroup(manager: CreatureManager, creatureGroup: SpawnGroup, creaturePool: CreatureType[], tile: Tile): boolean | undefined;
    protected canConsumeItem(human: Human, itemType: ItemType, actionType: ActionType): boolean | undefined;
    protected canCreatureMove(creature: Creature, tile?: Tile): boolean | undefined;
    protected canCreatureAttack(creature: Creature, enemy: Human | Creature): boolean | undefined;
    protected canSeeCreature(_: any, creature: Creature, tile: Tile): boolean | undefined;
    protected getTilePenalty(_: any, penalty: number, tile: Tile): number;
    protected getFogColor(api: IInjectionApi<WorldRenderer, "getFogColor">): void;
    private isPlayerFalling;
    private setPlayerFalling;
}
export {};
