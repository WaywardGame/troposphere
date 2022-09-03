import { DoodadType } from "game/doodad/IDoodad";
import { ActionType } from "game/entity/action/IAction";
import Creature from "game/entity/creature/Creature";
import CreatureManager from "game/entity/creature/CreatureManager";
import { CreatureType, SpawnGroup } from "game/entity/creature/ICreature";
import Human from "game/entity/Human";
import { SkillType } from "game/entity/IHuman";
import Player from "game/entity/player/Player";
import PlayerManager from "game/entity/player/PlayerManager";
import { Game } from "game/Game";
import Island from "game/island/Island";
import { ItemType, ItemTypeGroup } from "game/item/IItem";
import { ITile, TerrainType } from "game/tile/ITerrain";
import { WorldZ } from "game/WorldZ";
import Message from "language/dictionary/Message";
import Note from "language/dictionary/Note";
import Mod from "mod/Mod";
import { RenderFlag } from "renderer/world/IWorldRenderer";
import World from "renderer/world/World";
import WorldRenderer from "renderer/world/WorldRenderer";
import { HelpArticle } from "ui/screen/screens/menu/menus/help/HelpArticleDescriptions";
import { IInjectionApi } from "utilities/class/Inject";
import { IVector2 } from "utilities/math/IVector";
interface ITroposphereData {
    seed: number;
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
    firstLoad: boolean;
    private get creaturePool();
    private falling;
    initializeSaveData(data?: ITroposphereData): ITroposphereData;
    onLoad(): void;
    onUnload(): void;
    setFlying(player: Player, flying: boolean, passTurn: boolean): boolean;
    isFlyableTile(island: Island, point: IVector2, tile: ITile): boolean;
    easeInCubic(time: number, start: number, change: number, duration: number): number;
    onCreateWorld(island: Island, world: World): void;
    preLoadWorldDifferences(island: Island, generateNewWorld: boolean): void;
    preRenderWorld(worldRenderer: WorldRenderer, tileScale: number, viewWidth: number, viewHeight: number): void;
    shouldRender(_: any): RenderFlag | undefined;
    onGameStart(game: Game, isLoadingSave: boolean, playedCount: number): void;
    onPlayerJoin(manager: PlayerManager, player: Player): void;
    preMove(player: Player, fromX: number, fromY: number, fromZ: number, fromTile: ITile, nextX: number, nextY: number, nextZ: number, tile: ITile): boolean | void | undefined;
    onMoveComplete(player: Player): void;
    shouldSpawnCreatureFromGroup(manager: CreatureManager, creatureGroup: SpawnGroup, creaturePool: CreatureType[], x: number, y: number, z: number): boolean | undefined;
    protected canConsumeItem(human: Human, itemType: ItemType, actionType: ActionType): boolean | undefined;
    protected canCreatureMove(creature: Creature, tile?: ITile): boolean | undefined;
    protected canCreatureAttack(creature: Creature, enemy: Human | Creature): boolean | undefined;
    protected canSeeCreature(_: any, creature: Creature, tile: ITile): boolean | undefined;
    protected getTilePenalty(_: any, penalty: number, tile: ITile): number;
    protected getFogColor(api: IInjectionApi<WorldRenderer, "getFogColor">): void;
}
export {};
