import { FOREST_CONFIG as C, FOREST_COIN_BANDS, forestArea, forestRecipes, handmadeGifts } from '../data/forest';
import { getIngredient, ingredients } from '../data/ingredients';
import { getRecipe } from '../data/recipes';
import { findNewRecipes } from './logic';
import { receiveSupplies } from './procurement';
import type { ForestState, GameState, Gift, GiftReaction, CharacterProgress } from '../types/game';
export type ForestAction = {
    type: 'FOREST_ENTER';
    now?: number;
} | {
    type: 'FOREST_MOVE';
    area: string;
    now?: number;
} | {
    type: 'FOREST_GATHER';
    spot: number;
    careful: boolean;
    now?: number;
} | {
    type: 'FOREST_FRAGMENT';
    now?: number;
} | {
    type: 'FOREST_TAKE';
} | {
    type: 'FOREST_DROP';
    index: number;
} | {
    type: 'FOREST_DISCARD';
} | {
    type: 'FOREST_RETURN';
} | {
    type: 'FOREST_CLAIM';
} | {
    type: 'FOREST_CRAFT';
    giftId: string;
} | {
    type: 'FOREST_SELL';
    recipeId: string;
    count: number;
} | {
    type: 'FOREST_WITHDRAW';
    recipeId: string;
} | {
    type: 'USE_SUPPLY_TICKET';
    deliveryId: string;
    now?: number;
};
export const emptyForest = (now = Date.now()): ForestState => ({ energy: C.maxEnergy, recoveredAt: now, nextId: 1, returns: 0, fragments: {}, discovered: [], crafted: [], tickets: 0, sales: {}, serveForestNext: true });
export function recoverForest(f: ForestState, now: number): ForestState {
    if (!Number.isFinite(now) || now <= f.recoveredAt)
        return f;
    if (f.energy >= C.maxEnergy)
        return f;
    const gained = Math.floor((now - f.recoveredAt) / C.recoveryMs);
    if (!gained)
        return f;
    const energy = Math.min(C.maxEnergy, f.energy + gained);
    return { ...f, energy, recoveredAt: energy === C.maxEnergy ? now : f.recoveredAt + gained * C.recoveryMs };
}
export const basketCapacity = (f: ForestState) => Object.values(f.fragments).filter(n => n >= 3).length >= 4 ? 16 : Object.values(f.fragments).filter(n => n >= 3).length >= 2 ? 14 : f.returns >= 3 ? 12 : 10;
export const foodWeight = (id: string) => id === 'forestHoney' || id === 'forestMoonBerry' || !!getIngredient(id)?.unlockEventId ? 2 : 1;
export const basketWeight = (items: string[]) => items.reduce((n, id) => n + foodWeight(id), 0);
export const forestDeepUnlocked = (s: GameState) => s.forest.returns >= C.deepReturns && s.lifetimeStats.totalOrders >= C.deepOrders;
export function forestSecret(f: ForestState): string | undefined {
    const exp = f.expedition;
    if (!exp || exp.fragment)
        return;
    let id = forestArea(exp.area).secret;
    if (id === 'spring') {
        const a = 'forestSecretMilk', b = 'forestSecretPancake';
        id = (f.fragments[a] || 0) <= (f.fragments[b] || 0) ? a : b;
    }
    return id && (f.fragments[id] || 0) < 3 ? id : undefined;
}
// Stable per outing, place, spot and chosen method; reloading never rerolls a result.
export function forestRandom(seed: number, key: string) { let h = seed >>> 0; for (const ch of key) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
} return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function weighted(pool: Record<string, number>, random: () => number) { let n = random() * Object.values(pool).reduce((a, b) => a + b, 0); for (const [id, w] of Object.entries(pool)) {
    n -= w;
    if (n < 0)
        return id;
} return Object.keys(pool)[0]; }
// One draw selects both the weighted band and its uniform integer amount.
// Keeping one draw preserves the existing gather RNG sequence.
export function forestCoinAmount(roll: number): number {
    let remaining = roll * FOREST_COIN_BANDS.reduce((sum, band) => sum + band.weight, 0);
    for (const band of FOREST_COIN_BANDS) {
        if (remaining < band.weight) {
            return band.min + Math.floor(remaining / band.weight * (band.max - band.min + 1));
        }
        remaining -= band.weight;
    }
    return C.coinMax;
}
export function syncForestRecipes(s: GameState): GameState { if (s.lifetimeStats.totalOrders < 1)
    return s; const ids = forestRecipes.filter(r => !r.hidden || (s.forest.fragments[r.id] || 0) >= 3).map(r => r.id); if (ids.every(id => s.unlockedRecipes.includes(id)))
    return s; return { ...s, unlockedRecipes: [...new Set([...s.unlockedRecipes, ...ids])] }; }
export function handmadeAmount(gift: Gift, reaction: GiftReaction, p: CharacterProgress) { let base = { love: 8, like: 5, normal: 2, dislike: -4 }[reaction]; if (base > 0 && p.lastGiftId === gift.id && (p.giftStreak || 0) >= 2)
    base = Math.ceil(base / 2); if ((reaction === 'love' || reaction === 'like') && !(p.handmadeFirst || []).includes(gift.id))
    base += 2; return base; }
export function reduceForest(state: GameState, a: ForestAction): GameState {
    let f = state.forest;
    const now = 'now' in a ? a.now ?? Date.now() : Date.now();
    if (['FOREST_ENTER', 'FOREST_MOVE', 'FOREST_GATHER', 'FOREST_FRAGMENT', 'USE_SUPPLY_TICKET'].includes(a.type)) {
        f = recoverForest(f, now);
        if (f.energy === C.maxEnergy)
            f = { ...f, recoveredAt: Math.max(f.recoveredAt, now) };
    }
    const e = f.expedition;
    const finish = (next: ForestState) => ({ ...state, forest: next });
    switch (a.type) {
        case 'FOREST_ENTER':
            if (e || state.lifetimeStats.totalOrders < 1 || f.energy < 1)
                return state;
            return finish({ ...f, nextId: f.nextId + 1, lastReturn: undefined, expedition: { id: f.nextId, seed: Math.floor(Math.random() * 4294967296), area: 'entrance', used: [], basket: [], coins: 0, tickets: 0, harvested: false, deepGather: 0, gotRare: false, returning: false } });
        case 'FOREST_MOVE': {
            if (!e || e.pending || e.returning)
                return state;
            const link = forestArea(e.area).next.find(([id]) => id === a.area);
            if (!link || f.energy < link[1] || (['stone', 'spring'].includes(a.area) && !forestDeepUnlocked(state)))
                return state;
            return finish({ ...f, energy: f.energy - link[1], expedition: { ...e, area: a.area } });
        }
        case 'FOREST_GATHER': {
            if (!e || e.pending || e.returning || !Number.isInteger(a.spot) || a.spot < 0 || a.spot > 2)
                return state;
            const area = forestArea(e.area), key = `${e.area}:${a.spot}`, cost = a.careful ? 3 : 2;
            if (!Object.keys(area.normal).length || e.used.includes(key) || f.energy < cost)
                return state;
            const random = forestRandom(e.seed, `${key}:${a.careful}`), food = [f.returns === 0 && !f.tutorialDone ? 'bread' : weighted(area.normal, random)];
            const deep = ['stone', 'spring'].includes(e.area), deepGather = e.deepGather + (deep ? 1 : 0), pity = deep && deepGather === 4 && !e.gotRare;
            if (random() < (area.rate + (a.careful ? 5 : 0)) / 100 || pity) {
                const story = ingredients.filter(i => i.unlockEventId && state.unlockedIngredients.includes(i.id));
                food.push(pity ? (e.area === 'stone' ? 'forestHoney' : 'forestMoonBerry') : story.length && random() < .25 ? story[Math.floor(random() * story.length)].id : weighted(area.bonus, random));
            }
            const coins = random() < C.coinChance ? forestCoinAmount(random()) : 0;
            const tickets = forestRandom(e.seed, `${key}:tickets`)() < C.ticketChance ? 1 : 0;
            return finish({ ...f, energy: f.energy - cost, tutorialDone: true, expedition: { ...e, used: [...e.used, key], harvested: true, deepGather, gotRare: e.gotRare || food.some(id => id === 'forestHoney' || id === 'forestMoonBerry'), coins: e.coins + coins, tickets: e.tickets + tickets, pending: { food, coins, tickets } } });
        }
        case 'FOREST_FRAGMENT': {
            const id = forestSecret(f);
            if (!e || e.returning || e.pending || f.energy < 2 || !id)
                return state;
            return finish({ ...f, energy: f.energy - 2, expedition: { ...e, fragment: id } });
        }
        case 'FOREST_TAKE':
            if (!e?.pending || basketWeight([...e.basket, ...e.pending.food]) > basketCapacity(f))
                return state;
            return finish({ ...f, expedition: { ...e, basket: [...e.basket, ...e.pending.food], pending: undefined } });
        case 'FOREST_DROP':
            if (!e || !e.pending || !Number.isInteger(a.index) || a.index < 0 || a.index >= e.basket.length)
                return state;
            return finish({ ...f, expedition: { ...e, basket: e.basket.filter((_, i) => i !== a.index) } });
        case 'FOREST_DISCARD':
            if (!e?.pending)
                return state;
            return finish({ ...f, expedition: { ...e, pending: undefined } });
        case 'FOREST_RETURN':
            if (!e || e.pending)
                return state;
            return finish({ ...f, expedition: { ...e, returning: true } });
        case 'FOREST_CLAIM': {
            if (!e?.returning || e.pending)
                return state;
            const stock = { ...state.ingredients };
            for (const id of e.basket)
                stock[id] = (stock[id] || 0) + 1;
            const fragments = { ...f.fragments };
            if (e.fragment)
                fragments[e.fragment] = Math.min(3, (fragments[e.fragment] || 0) + 1);
            return syncForestRecipes({ ...state, currency: state.currency + e.coins, ingredients: stock, unlockedRecipes: [...state.unlockedRecipes, ...findNewRecipes(stock, state.unlockedRecipes)], forest: { ...f, fragments, returns: f.returns + (e.basket.length > 0 || e.fragment ? 1 : 0), tickets: f.tickets + e.tickets, discovered: [...new Set([...f.discovered, ...e.basket])], lastReturn: { food: e.basket, coins: e.coins, tickets: e.tickets, fragment: e.fragment }, expedition: undefined } });
        }
        case 'FOREST_CRAFT': {
            const gift = handmadeGifts.find(g => g.id === a.giftId);
            if (!gift || state.currency < 100 || !Object.entries(gift.materials!).every(([id, n]) => (state.ingredients[id] || 0) >= n))
                return state;
            const stock = { ...state.ingredients };
            for (const [id, n] of Object.entries(gift.materials!))
                stock[id] -= n;
            return { ...state, currency: state.currency - 100, ingredients: stock, inventory: { ...state.inventory, [gift.id]: (state.inventory[gift.id] || 0) + 1 }, forest: { ...f, crafted: [...new Set([...f.crafted, gift.id])] } };
        }
        case 'FOREST_SELL': {
            const r = forestRecipes.find(r => r.id === a.recipeId), count = a.count;
            if (!r || !state.unlockedRecipes.includes(r.id) || !Number.isInteger(count) || count < 1 || count > 3)
                return state;
            const active = new Set([...Object.keys(f.sales).filter(id => f.sales[id] > 0), ...state.orders.filter(o => o.forestReserved).map(o => o.recipeId)]);
            const inFlight = state.orders.filter(o => o.forestReserved && o.recipeId === r.id).length;
            if ((!active.has(r.id) && active.size >= 2) || (f.sales[r.id] || 0) + inFlight + count > 3 || !r.requiredIngredients.every(id => (state.ingredients[id] || 0) >= count))
                return state;
            const stock = { ...state.ingredients };
            r.requiredIngredients.forEach(id => stock[id] -= count);
            return { ...state, ingredients: stock, forest: { ...f, sales: { ...f.sales, [r.id]: (f.sales[r.id] || 0) + count } } };
        }
        case 'FOREST_WITHDRAW': {
            const r = getRecipe(a.recipeId), count = f.sales[a.recipeId] || 0;
            if (!r?.forest || !count)
                return state;
            const stock = { ...state.ingredients };
            r.requiredIngredients.forEach(id => stock[id] = (stock[id] || 0) + count);
            return { ...state, ingredients: stock, forest: { ...f, sales: { ...f.sales, [r.id]: 0 } } };
        }
        case 'USE_SUPPLY_TICKET': {
            const received = receiveSupplies({ ...state, forest: f }, now), d = received.deliveries.find(d => d.id === a.deliveryId);
            if (!d || d.orderedAt > now || f.tickets < 1)
                return received;
            return receiveSupplies({ ...received, forest: { ...f, tickets: f.tickets - 1 }, deliveries: received.deliveries.map(item => item.id === d.id ? { ...item, arrivesAt: now } : item) }, now);
        }
    }
}
