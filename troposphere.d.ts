import { ICreature, SpawnGroup } from "creature/ICreature";
import { ActionType, CreatureType, IPoint, ItemType, RenderFlag } from "Enums";
import { IItem } from "item/IItem";
import Mod from "mod/Mod";
import IWorld from "renderer/IWorld";
import { ITile } from "tile/ITerrain";
export default class Troposphere extends Mod {
    private static readonly troposphereZ;
    private moving;
    private falling;
    private itemNimbus;
    private itemRainbow;
    private itemRainbowClayJug;
    private itemRainbowGlassBottle;
    private itemSnowflakes;
    private itemCloudstone;
    private doodadCloudBoulder;
    private doodadStormBoulder;
    private doodadRainbow;
    private terrainCloudWater;
    private terrainCloud;
    private terrainRainbow;
    private terrainCloudBoulder;
    private terrainCloudstone;
    private terrainStorm;
    private terrainStormBoulder;
    private terrainStormstone;
    private terrainHole;
    private creatureBear;
    private creatureRabbit;
    private creatureCloudling;
    private creatureLightningElemental;
    private creatureSprite;
    private creaturePool;
    private skillFlying;
    private hairstyleCloud;
    private messageFlewToTroposphere;
    private messageFlewToTroposphereFailure;
    private messageFlewToLand;
    private messageFlewToLandFailure;
    private messageFellToLand;
    private messageDeathByFalling;
    private messageGatheredRainbow;
    private messageNoRainbow;
    private data;
    private firstLoad;
    onInitialize(saveDataGlobal: any): any;
    onLoad(data: any): void;
    onUnload(): void;
    onSave(): any;
    onCreateWorld(world: IWorld): void;
    postGenerateWorld(generateNewWorld: boolean): void;
    preRenderWorld(tileScale: number, viewWidth: number, viewHeight: number): void;
    shouldRender(): RenderFlag.Player | undefined;
    onGameStart(isLoadingSave: boolean): void;
    onTurnStart(): void;
    onTurnComplete(): void;
    initializeItems(): void;
    initializeDoodads(): void;
    initializeTerrain(): void;
    initializeCreatures(): void;
    initializeSkills(): void;
    onNimbus(item: IItem | undefined): void;
    onGatherRainbow(item: IItem | undefined): void;
    canConsumeItem(itemType: ItemType, actionType: ActionType): boolean | undefined;
    onSpawnCreatureFromGroup(creatureGroup: SpawnGroup, creaturePool: CreatureType[], x: number, y: number, z: number): boolean | undefined;
    canCreatureMove(creatureId: number, creature: ICreature, tile?: ITile): boolean | undefined;
    canCreatureAttack(creatureId: number, creature: ICreature): boolean | undefined;
    canSeeCreature(creatureId: number, creature: ICreature, tile: ITile): boolean | undefined;
    setFlying(flying: boolean, passTurn: boolean): boolean;
    findOpenTile(z: number): IPoint | undefined;
    isFlyableTile(tile: ITile): boolean;
}
