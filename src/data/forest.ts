import type { Ingredient, Recipe, Gift } from '../types/game';
export const FOREST_CONFIG = { maxEnergy: 70, recoveryMs: 60000, maxFloor: 70, actionCost: 1, boxChance: .12, maxBoxes: 1, coinChance: .3, ticketChance: .1, coinMin: 50, coinMax: 2000, deepReturns: 5, deepOrders: 20, fragmentChance: .4, abundantChance: .06, maxRareBonus: .05, maxPathReduction: 2 };
// Amounts after a coin drop: mostly small finds, with a fixed 4% jackpot.
export const FOREST_COIN_BANDS = [
    { min: 50, max: 300, weight: 70 },
    { min: 301, max: 450, weight: 20 },
    { min: 451, max: 600, weight: 6 },
    { min: 2000, max: 2000, weight: 4 },
] as const;
export const forestIngredients: Ingredient[] = [['forestBerry', '野いちご', '🍓'], ['forestWalnut', '森くるみ', '🌰'], ['forestHerb', '香草', '🌿'], ['forestMint', '森ミント', '🍃'], ['forestPetal', '食用花', '🌸'], ['forestMushroom', '森きのこ', '🍄'], ['forestHoney', '琥珀花蜜', '🍯'], ['forestMoonBerry', '月しずくベリー', '🫐']].map(([id, name, icon]) => ({ id, name, icon, price: 0, supplierId: 'forest', limited: true }));
const recipe = (id: string, name: string, icon: string, sale: number, seconds: number, materials: string[], equipment: string, tags: string[], secret = false): Recipe => ({ id, name, icon, price: sale * 2, cookingSeconds: seconds, requiredIngredients: materials, requiredEquipmentIds: [equipment], tags, limited: true, forest: true, hidden: secret, unlockHint: secret ? '森でレシピの切れ端を3枚集める' : '最初の料理を提供する' });
export const forestRecipes: Recipe[] = [
    recipe('forestBerrySoda', '野いちごソーダ', '🍹', 1100, 10, ['forestBerry', 'forestMint', 'sugar'], 'coffeeCounter', ['fruit', 'drink']),
    recipe('forestPetalTea', '花びらティー', '🫖', 1300, 10, ['forestPetal', 'forestHerb', 'teaLeaves'], 'coffeeCounter', ['tea', 'drink']),
    recipe('forestMushroomToast', '森きのこトースト', '🍞', 1600, 20, ['forestMushroom', 'bread'], 'toastGrill', ['bread', 'vegetable']),
    recipe('forestSecretTea', 'こもれび香草ティー', '🍵', 1700, 20, ['forestHerb', 'forestMint', 'teaLeaves'], 'coffeeCounter', ['tea', 'drink'], true),
    recipe('forestSecretCookie', '森くるみクッキー', '🍪', 1900, 20, ['forestWalnut', 'flour', 'sugar'], 'prepTable', ['sweet', 'dessert'], true),
    recipe('forestSecretMilk', '琥珀花蜜ミルク', '🥛', 2200, 20, ['forestHoney', 'milk'], 'coffeeCounter', ['milk', 'drink'], true),
    recipe('forestSecretPancake', '月しずくパンケーキ', '🥞', 2600, 30, ['forestMoonBerry', 'flour', 'egg', 'milk'], 'prepTable', ['sweet', 'dessert'], true),
];
const gift = (id: string, name: string, icon: string, materials: Record<string, number>, tags: string[], lovedBy: string[]): Gift => ({ id, name, icon, price: 100, rarity: 'common', description: '森の素材で作った手作りギフト', handmade: true, materials, tags, lovedBy });
export const handmadeGifts: Gift[] = [
    gift('forestTeaGift', '香草ティーセット', '🍵', { forestHerb: 2, forestMint: 1, teaLeaves: 1 }, ['tea', 'nature', 'handmade'], ['nagisa']),
    gift('forestJamGift', '野いちごジャム', '🍓', { forestBerry: 3, sugar: 1 }, ['food', 'sweet', 'handmade'], ['haru']),
    gift('forestCookieGift', 'コーヒーくるみ菓子', '🍪', { forestWalnut: 2, forestBerry: 1, coffeeBeans: 1, flour: 1 }, ['coffee', 'craft', 'sweet', 'handmade'], ['ren', 'haru', 'cacao']),
    gift('forestBookmarkGift', '花びらのしおり', '🔖', { forestPetal: 3 }, ['flower', 'book', 'art', 'elegant', 'handmade'], ['itsuki']),
    gift('forestWarmGift', 'あたたかな香草包み', '🎁', { forestHerb: 2, forestWalnut: 1 }, ['nature', 'warm', 'practical', 'handmade'], ['sota', 'aki', 'sae', 'haru']),
    gift('forestChocolateGift', '花蜜チョコレート', '🍫', { forestHoney: 1, forestPetal: 2, chocolate: 1 }, ['sweet', 'craft', 'elegant'], ['itsuki', 'cacao']),
];
export interface ForestArea {
    id: string;
    name: string;
    icon: string;
    normal: Record<string, number>;
    bonus: Record<string, number>;
    secret?: string;
}
export interface ForestBand { area:string; from:number; to:number; spots:[number,number]; pathLimit:number; rareRate:number; forestRate:number; emptyRate:number; obstacleChance:number; obstacleMax:number; background:'clearing'|'river'|'spring'; }
export const FOREST_BANDS: ForestBand[] = [
    { area:'clearing', from:1, to:10, spots:[6,8], pathLimit:4, rareRate:0, forestRate:0.08, emptyRate:.35, obstacleChance:0, obstacleMax:0, background:'clearing' },
    { area:'river', from:11, to:20, spots:[7,9], pathLimit:5, rareRate:0, forestRate:0.1, emptyRate:.35, obstacleChance:0, obstacleMax:0, background:'river' },
    { area:'pond', from:21, to:30, spots:[7,9], pathLimit:5, rareRate:.05, forestRate:0.12, emptyRate:.3, obstacleChance:.2, obstacleMax:1, background:'river' },
    { area:'grove', from:31, to:40, spots:[8,10], pathLimit:6, rareRate:.05, forestRate:0.14, emptyRate:.3, obstacleChance:.2, obstacleMax:1, background:'clearing' },
    { area:'roots', from:41, to:50, spots:[8,10], pathLimit:6, rareRate:.1, forestRate:0.16, emptyRate:.3, obstacleChance:.3, obstacleMax:2, background:'clearing' },
    { area:'stone', from:51, to:60, spots:[9,11], pathLimit:7, rareRate:.15, forestRate:0.18, emptyRate:.25, obstacleChance:.3, obstacleMax:2, background:'spring' },
    { area:'spring', from:61, to:70, spots:[10,12], pathLimit:7, rareRate:.25, forestRate:0.2, emptyRate:.2, obstacleChance:.4, obstacleMax:3, background:'spring' },
];
export const FOREST_MEAL_LEVELS = [
    { from:1, to:3, obstacleSkip:1, emptyHints:1, pathReduction:1, rareBonus:0 },
    { from:4, to:6, obstacleSkip:1, emptyHints:2, pathReduction:1, rareBonus:.03 },
    { from:7, to:10, obstacleSkip:2, emptyHints:2, pathReduction:2, rareBonus:.05 },
];
export const forestBand = (floor:number) => FOREST_BANDS.find(b=>floor>=b.from&&floor<=b.to)!;
export const forestAreas: ForestArea[] = [
    { id: 'clearing', name: 'こもれび広場', icon: '🌳', normal: { coffeeBeans: 30, bread: 30, strawberry: 20, herb: 10, sugar: 10 }, bonus: { forestBerry: 50, forestHerb: 30, forestPetal: 20 } },
    { id: 'river', name: '川辺', icon: '🏞️', normal: { mint: 35, herb: 30, teaLeaves: 20, milk: 10, egg: 5 }, bonus: { forestMint: 50, forestHerb: 30, forestPetal: 20 } },
    { id: 'pond', name: '小さな池', icon: '💧', normal: { milk: 25, egg: 25, vanillaIce: 20, frozenBerries: 20, teaLeaves: 10 }, bonus: { forestHerb: 50, forestMint: 30, forestPetal: 20 }, secret: 'forestSecretTea' },
    { id: 'grove', name: '木立', icon: '🌲', normal: { flour: 30, bread: 25, tomato: 20, lettuce: 15, strawberry: 10 }, bonus: { forestWalnut: 50, forestMushroom: 30, forestBerry: 20 } },
    { id: 'roots', name: '大樹の根元', icon: '🌳', normal: { coffeeBeans: 25, flour: 25, chocolate: 20, sugar: 20, herb: 10 }, bonus: { forestMushroom: 45, forestWalnut: 45, forestHerb: 10 }, secret: 'forestSecretCookie' },
    { id: 'stone', name: '苔むす小道', icon: '🌿', normal: { chocolate: 30, sugar: 25, teaLeaves: 20, milk: 15, coffeeBeans: 10 }, bonus: { forestHoney: 40, forestMoonBerry: 20, forestPetal: 20, forestHerb: 20 } },
    { id: 'spring', name: '月しずくの泉', icon: '✨', normal: { frozenBerries: 30, vanillaIce: 25, milk: 20, strawberry: 15, mint: 10 }, bonus: { forestMoonBerry: 45, forestHoney: 25, forestBerry: 15, forestMint: 15 }, secret: 'spring' },
];
export const forestArea = (id: string) => forestAreas.find(a => a.id === id)!;
