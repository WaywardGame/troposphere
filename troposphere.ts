/// <reference path="mod-reference/modreference.d.ts"/>

interface ITroposphereData {
	seed: number;
	flying: boolean;
};

class Mod extends Mods.Mod {
	private static TroposphereZ: number = Z_MAX + 1;

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

	private monsterBear: number;
	private monsterRabbit: number;
	private monsterCloudling: number;
	private monsterLightningElemental: number;
	private monsterSprite: number;
	private monsterPool: number[];

	private messageFlewToTroposphere: number;
	private messageFlewToTroposphereFailure: number;
	private messageFlewToLand: number;
	private messageFlewToLandFailure: number;
	private messageFellToLand: number;
	private messageDeathByFalling: number;
	private messageGatheredRainbow: number;
	private messageNoRainbow: number;

	private data: ITroposphereData;

	public onInitialize(saveDataGlobal: any): any {
	}

	public onLoad(data: any): void {
		this.data = data;

		if (!this.data) {
			this.data = {
				seed: new Date().getTime(),
				flying: false,
			};
		}

		this.initializeItems();
		this.initializeDoodads();
		this.initializeTerrain();
		this.initializeMonsters();

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
		this.getItemByType(ItemType.GlassBottle).use.pop();
	}

	public onSave(): any {
		return this.data;
	}

	public onCreateWorld(world: World) {
		world.addLayer(Mod.TroposphereZ);
	}

	public postGenerateWorld(generateNewWorld: boolean) {
		// percentage
		var doodadChance = 0.6;
		var doodadChanceStorm = 0.2;

		var terrainHoleChance = 0.02;

		var monsterChance = 0.0025;
		var monsterSpriteChance = 0.0001;
		var monsterAberrantChance = 0.05;
		var monsterAberrantStormChance = 0.50;

		var tile: ITile;
		var terrainType: number;

		Utilities.Random.setSeed(this.data.seed);

		for (var x = 0; x < game.mapSize; x++) {
			for (var y = 0; y < game.mapSize; y++) {
				tile = game.setTile(x, y, Mod.TroposphereZ, game.getTile(x, y, Mod.TroposphereZ) || <ITile>{});

				var tileGfx = 0;
				var normalTerrainType = terrains[Utilities.TileHelpers.getType(game.getTile(x, y, Z_NORMAL))].terrainType;

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
						}
						else {
							terrainType = this.terrainStorm;
						}
						break;

					case TerrainType.Trees:
					case TerrainType.BareTrees:
					case TerrainType.BarePalmTrees:
					case TerrainType.TreesWithVines:
					case TerrainType.TreesWithBerries:
					case TerrainType.TreesWithFungus:
					case TerrainType.PalmTrees:
					case TerrainType.PalmTreesWithCoconuts:
						if (Utilities.Random.nextFloat() <= doodadChance) {
							terrainType = this.terrainCloudBoulder;
						}
						else {
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

		for (var x = 0; x < game.mapSize; x++) {
			for (var y = 0; y < game.mapSize; y++) {
				terrainType = Utilities.TileHelpers.getType(game.getTile(x, y, Mod.TroposphereZ));

				if (generateNewWorld) {
					switch (terrainType) {
						case this.terrainCloud:
						case this.terrainStorm:
							var chance = Utilities.Random.nextFloat();
							var aberrantChance = terrainType === this.terrainCloud ? monsterAberrantChance : monsterAberrantStormChance;
							if (chance <= monsterSpriteChance) {
								game.spawnMonster(this.monsterSprite, x, y, Mod.TroposphereZ, true, Utilities.Random.nextFloat() <= aberrantChance);
							}
							else if (chance <= monsterChance) {
								var monsterType = this.monsterPool[Utilities.Random.nextInt(this.monsterPool.length)];
								game.spawnMonster(monsterType, x, y, Mod.TroposphereZ, true, Utilities.Random.nextFloat() <= aberrantChance);
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
			var turnProgress = 1 - Math.min(1, Math.max(0, (game.nextProcessInput - game.time) / (Delay.Collision * game.interval)));
			tileScale = Utilities.easeInCubic(turnProgress, tileScale * 0.25, tileScale * 0.75, 1.0);
			game.updateRender = true;
		} else {
			tileScale *= 0.25;
		}
		var scrollX = Utilities.lerp(player.fromX, player.x, game.turnProgress);
		var scrollY = Utilities.lerp(player.fromY, player.y, game.turnProgress);
		renderer.layers[Z_NORMAL].renderFullbright(scrollX, scrollY, tileScale, viewWidth, viewHeight);
		renderer.layers[Z_NORMAL].postRenderFullbright(scrollX, scrollY, tileScale, viewWidth, viewHeight);
	}

	public shouldRender() {
		if (!this.falling) {
			return undefined;
		}
		return RenderFlag.Player;
	}

	public onGameStart(isLoadingSave: boolean): void {
		if (!isLoadingSave) {
			// give nimbus
			Item.create(this.itemNimbus);
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
			//fall damage
			ui.displayMessage(this.messageFellToLand, MessageType.Bad);
			var tile = game.getTile(player.x, player.y, player.z);
			var terrainType = Utilities.TileHelpers.getType(tile);
			if (TileAtlas.isWater(terrainType)) {
				player.damage(-30, messages[this.messageDeathByFalling]);
			} else {
				player.damage(-40, messages[this.messageDeathByFalling]);
				game.placeCorpse({ type: MonsterType.Blood, x: player.x, y: player.y, z: player.z });
			}
			game.passTurn();
		} else {
			var tile = game.getTile(player.x, player.y, player.z);
			var terrainType = Utilities.TileHelpers.getType(tile);

			if (terrainType === this.terrainHole) {
				this.falling = true;
				game.addDelay(Delay.Collision, true);
				game.passTurn();
				game.fov.compute(false); //no light blocking
			}
		}
	}

	public initializeItems() {
		var actionTypeFly = this.addActionType("Fly", "Fly to/from the Troposphere.", (item: Item.IItem) => this.onNimbus(item));
		var actionTypeGatherRainbow = this.addActionType("Gather Rainbow", "Gather a Rainbow.", (item: Item.IItem) => this.onGatherRainbow(item));

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

		this.getItemByType(ItemType.GlassBottle).use.push(actionTypeGatherRainbow);
	}

	public initializeDoodads() {
		this.doodadCloudBoulder = this.addDoodad({
			name: "CloudBoulder"
		});

		this.doodadStormBoulder = this.addDoodad({
			name: "StormBoulder"
		});

		this.doodadRainbow = this.addDoodad({
			name: "Rainbow",
			blockMove: true
		});
	}

	public initializeTerrain() {

		this.terrainCloudWater = this.addTerrain({
			name: "CloudWater",
			passable: true,
			shallowWater: true,
			particles: [47, 128, 157],
			freshWater: true,
			noBackground: true
		});

		this.terrainCloud = this.addTerrain({
			name: "Cloud",
			passable: true,
			particles: [250, 250, 250],
			noBackground: true
		});

		this.terrainRainbow = this.addTerrain({
			name: "Rainbow",
			passable: true,
			particles: [20, 20, 20],
			gather: true,
			noGfxSwitch: true,
			noBackground: true,
			doodad: this.doodadRainbow
		}, this.terrainCloud);

		this.terrainCloudBoulder = this.addTerrain({
			name: "CloudBoulder",
			particles: [250, 250, 250],
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
			particles: [250, 250, 250],
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
			item: this.itemCloudstone,
			itemChance: 45
		}]);

		this.terrainStorm = this.addTerrain({
			name: "Storm",
			passable: true,
			particles: [20, 20, 20],
			noBackground: true
		});

		this.terrainStormBoulder = this.addTerrain({
			name: "Storm",
			particles: [20, 20, 20],
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
			particles: [20, 20, 20],
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
			item: this.itemCloudstone,
			itemChance: 100
		}]);

		this.terrainHole = this.addTerrain({
			name: "Hole",
			passable: true,
			particles: [250, 250, 250],
			noBackground: true
		});
	}

	public initializeMonsters() {
		this.monsterBear = this.addMonster({
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
			ai: MonsterAiType.Hostile,
			moveType: MoveType.Land | MoveType.ShallowWater | MoveType.Water,
			canCauseStatus: [StatusType.Bleeding],
			spawnTiles: MonsterSpawnableTiles.None,
			spawnTalent: 16000,
			makeNoise: true,
			breaksWalls: true,
			loot: [this.itemRainbow],
			lootChance: 0.5,
			noCorpse: true
		});

		this.monsterRabbit = this.addMonster({
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
			ai: MonsterAiType.Scared,
			moveType: MoveType.Land | MoveType.ShallowWater,
			spawnTiles: MonsterSpawnableTiles.None,
			spawnTalent: 0,
			makeNoise: true,
			jumpOver: true
		});

		this.monsterCloudling = this.addMonster({
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
			ai: MonsterAiType.Neutral,
			moveType: MoveType.Flying,
			spawnTiles: MonsterSpawnableTiles.None,
			loot: [ItemType.Feather, ItemType.Feather],
			lootGroup: LootGroupType.Low
		});

		this.monsterLightningElemental = this.addMonster({
			name: "LightningElemental",
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
			ai: MonsterAiType.Hostile,
			moveType: MoveType.Flying,
			spawnTiles: MonsterSpawnableTiles.None,
			lootGroup: LootGroupType.High,
			loot: [ItemType.PileOfAsh],
			blood: [210, 125, 20],
			canCauseStatus: [StatusType.Bleeding],
			spawnTalent: 32000,
			makeNoise: true
		});

		this.monsterSprite = this.addMonster({
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
			ai: MonsterAiType.Hostile,
			moveType: MoveType.Flying,
			spawnTiles: MonsterSpawnableTiles.None,
			lootGroup: LootGroupType.High,
			loot: [ItemType.PileOfAsh],
			blood: [210, 125, 20],
			canCauseStatus: [StatusType.Bleeding],
			spawnTalent: 32000,
			makeNoise: true
		});

		this.monsterPool = [this.monsterBear, this.monsterRabbit, this.monsterCloudling, this.monsterLightningElemental];
	}

	public onNimbus(item: Item.IItem): any {
		this.setFlying(!this.data.flying, true);
	}

	public onGatherRainbow(item: Item.IItem): any {
		var tile = game.getTileInFrontOfPlayer();
		var tileType = Utilities.TileHelpers.getType(tile);
		if (tileType === this.terrainRainbow) {
			ui.displayMessage(this.messageGatheredRainbow);

			game.createParticles(12, 128, 247);

			var newItem = Item.create(this.itemRainbowGlassBottle, item.quality);
			newItem.decay = item.decay;
			newItem.minDur = item.minDur;
			newItem.maxDur = item.maxDur;

			Item.remove(item);

			game.changeTile({ type: this.terrainCloud }, player.x + player.direction.x, player.y + player.direction.y, player.z, false);
			game.passTurn();
		}
		else {
			ui.displayMessage(this.messageNoRainbow);
		}
	}

	public onConsumeItem(itemType: ItemType, actionType: ActionType): boolean {
		if (itemType === this.itemRainbowGlassBottle && actionType === ActionType.Drink) {
			player.gender = player.gender === Gender.Male ? Gender.Female : Gender.Male;
			return true;
		}
		return undefined;
	}

	public onSpawnMonsterFromGroup(monsterGroup: MonsterSpawnGroup, monsterPool: MonsterType[], x: number, y: number, z: number): boolean {
		if (z !== Mod.TroposphereZ) {
			return undefined;
		}
		monsterPool.push.apply(monsterPool, this.monsterPool);
	}

	public canMonsterMove(monsterId: number, monster: IMonster, tile?: ITile): boolean {
		if (tile && Utilities.TileHelpers.getType(tile) === this.terrainHole) {
			return monster.type !== this.monsterBear && monster.type !== this.monsterRabbit;
		}
	}

	public canMonsterAttack(monsterId: number, monster: IMonster): boolean {
		if (monster.type !== this.monsterSprite) {
			return;
		}

		var monsterObj = <any>monster;
		monsterObj.justAttacked = true;
	}

	public canSeeMonster(monsterId: number, monster: IMonster, tile: ITile): boolean {
		if (monster.type !== this.monsterSprite) {
			return;
		}

		var monsterObj = <any>monster;

		if (monsterObj.justAttacked) {
			monsterObj.justAttacked = undefined;
			return;
		}

		if (monsterObj.nextVisibleCount === undefined || monsterObj.nextVisibleCount === 0) {
			monsterObj.nextVisibleCount = Utilities.Random.randomFromInterval(1, 6);
			return;
		}

		monsterObj.nextVisibleCount--;

		return false;
	}

	public setFlying(flying: boolean, message: boolean) {
		var z = !flying ? Z_NORMAL : Mod.TroposphereZ;

		var openTile = this.findOpenTile(z);
		if (openTile === null || player.z === Z_CAVE) {
			if (message) {
				ui.displayMessage(flying ? this.messageFlewToTroposphereFailure : this.messageFlewToLandFailure, MessageType.Bad);
			}
			return;
		}

		this.data.flying = flying;

		player.x = openTile.x;
		player.y = openTile.y;
		game.setPlayerZ(z);

		if (message) {
			ui.displayMessage(flying ? this.messageFlewToTroposphere : this.messageFlewToLand, MessageType.Good);
		}
	}

	public findOpenTile(z: number): IPoint {

		var q: IPoint[] = [{ x: player.x, y: player.y }];
		var visited: string[] = [];
		var tilesChecked = 0;

		var indexPoint = (point: IPoint) => {
			return `${point.x},${point.y}`;
		};

		while (q.length > 0) {
			var point = q.pop();

			var tile = game.getTile(point.x, point.y, z);
			if (!tile) {
				continue;
			}

			if (this.isFlyableTile(tile)) {
				return point;
			}

			for (var i = 0; i < 4; i++) {

				var neighbor: IPoint = { x: point.x, y: point.y };

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

		return null;
	}

	public isFlyableTile(tile: ITile): boolean {
		if (tile.monsterId !== undefined && tile.monsterId !== null) {
			return false;
		}

		if (tile.doodadId !== undefined && tile.doodadId !== null) {
			return false;
		}

		var terrainType = Utilities.TileHelpers.getType(tile);
		if (terrainType === this.terrainHole) {
			return false;
		}

		var terrainInfo = terrains[terrainType];

		return terrainInfo.water || terrainInfo.passable;
	}
}
