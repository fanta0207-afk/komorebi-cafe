import type { Ingredient, Recipe, Gift } from '../types/game';
export const FOREST_CONFIG = { maxEnergy: 70, recoveryMs: 60000, basket: 10, coinChance: .3, ticketChance: .15, coinMin: 50, coinMax: 2000, deepReturns: 5, deepOrders: 20 };
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
    next: [
        string,
        number
    ][];
    normal: Record<string, number>;
    bonus: Record<string, number>;
    rate: number;
    secret?: string;
}
export const forestAreas: ForestArea[] = [
    { id: 'entrance', name: '森の入口', icon: '🌲', next: [['clearing', 1]], normal: {}, bonus: {}, rate: 0 },
    { id: 'clearing', name: 'こもれび広場', icon: '🌳', next: [['fork', 1]], normal: { coffeeBeans: 30, bread: 30, strawberry: 20, herb: 10, sugar: 10 }, bonus: { forestBerry: 50, forestHerb: 30, forestPetal: 20 }, rate: 10 },
    { id: 'fork', name: '分かれ道', icon: '🪧', next: [['river', 1], ['grove', 2]], normal: {}, bonus: {}, rate: 0 },
    { id: 'river', name: '川辺', icon: '🏞️', next: [['pond', 1]], normal: { mint: 35, herb: 30, teaLeaves: 20, milk: 10, egg: 5 }, bonus: { forestMint: 50, forestHerb: 30, forestPetal: 20 }, rate: 14 },
    { id: 'pond', name: '小さな池', icon: '💧', next: [['roots', 2]], normal: { milk: 25, egg: 25, vanillaIce: 20, frozenBerries: 20, teaLeaves: 10 }, bonus: { forestHerb: 50, forestMint: 30, forestPetal: 20 }, rate: 18, secret: 'forestSecretTea' },
    { id: 'grove', name: '木立', icon: '🌲', next: [['roots', 2]], normal: { flour: 30, bread: 25, tomato: 20, lettuce: 15, strawberry: 10 }, bonus: { forestWalnut: 50, forestMushroom: 30, forestBerry: 20 }, rate: 14 },
    { id: 'roots', name: '大樹の根元', icon: '🌳', next: [['stone', 2]], normal: { coffeeBeans: 25, flour: 25, chocolate: 20, sugar: 20, herb: 10 }, bonus: { forestMushroom: 45, forestWalnut: 45, forestHerb: 10 }, rate: 22, secret: 'forestSecretCookie' },
    { id: 'stone', name: '苔むす石畳', icon: '🪨', next: [['spring', 2]], normal: { chocolate: 30, sugar: 25, teaLeaves: 20, milk: 15, coffeeBeans: 10 }, bonus: { forestHoney: 40, forestMoonBerry: 20, forestPetal: 20, forestHerb: 20 }, rate: 26 },
    { id: 'spring', name: '月しずくの泉', icon: '✨', next: [], normal: { frozenBerries: 30, vanillaIce: 25, milk: 20, strawberry: 15, mint: 10 }, bonus: { forestMoonBerry: 45, forestHoney: 25, forestBerry: 15, forestMint: 15 }, rate: 30, secret: 'spring' },
];
export const forestArea = (id: string) => forestAreas.find(a => a.id === id)!;
