import { FOREST_CONFIG as C, FOREST_COIN_BANDS, FOREST_MEAL_LEVELS, forestArea, forestBand, forestRecipes, handmadeGifts } from '../data/forest';
import { ingredients } from '../data/ingredients';
import { getRecipe } from '../data/recipes';
import { findNewRecipes, isRecipeUsable } from './logic';
import { receiveSupplies } from './procurement';
import { menuMasteryFromSales } from './menuMastery';
import type { ForestState, GameState, Gift, GiftReaction, CharacterProgress, ForestMeal, ForestLayer, ForestSpotKind, ForestLoot } from '../types/game';

export type ForestAction =
    | { type:'FOREST_ENTER'; startFloor?:number; mealId?:string; now?:number }
    | { type:'FOREST_MOVE'; floor:number; now?:number }
    | { type:'FOREST_CLEAR'; floor:number; now?:number }
    | { type:'FOREST_GATHER'; floor:number; spot:number; now?:number }
    | { type:'FOREST_RETURN'; now?:number }
    | { type:'FOREST_CLAIM'|'FOREST_TAKE' }
    | { type:'FOREST_CRAFT'; giftId:string }
    | { type:'FOREST_COOK'; recipeId:string; count:number }
    | { type:'FOREST_SELL'|'FOREST_WITHDRAW'; recipeId:string; count?:number }
    | { type:'USE_SUPPLY_TICKET'; deliveryId:string; now?:number };

export const emptyForest = (now=Date.now()):ForestState => ({ energy:C.maxEnergy, recoveredAt:now, nextId:1, returns:0, fragments:{}, discovered:[], crafted:[], tickets:0, dishes:{}, serveForestNext:true, deepestFloor:0, checkpoints:[] });
export function recoverForest(f:ForestState, now:number):ForestState {
    if (f.expedition || !Number.isFinite(now) || now<=f.recoveredAt || f.energy>=C.maxEnergy) return f;
    const gained=Math.floor((now-f.recoveredAt)/C.recoveryMs);
    if (!gained) return f;
    const energy=Math.min(C.maxEnergy,f.energy+gained);
    return {...f,energy,recoveredAt:energy===C.maxEnergy?now:f.recoveredAt+gained*C.recoveryMs};
}
export const forestDeepUnlocked = (s:GameState) => s.forest.returns>=C.deepReturns && s.lifetimeStats.totalOrders>=C.deepOrders;
export function canStartForest(s:GameState, floor:number) {
    return Number.isInteger(floor) && (floor===1 || [11,21,31,41,51,61].includes(floor)&&s.forest.checkpoints.includes(floor-1)) && (floor<51||forestDeepUnlocked(s));
}
// All generated outcomes, including empty hints, are saved with the layer.
export function forestRandom(seed:number,key:string) {
    let h=seed>>>0;
    for (const ch of key) h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
    return ()=>{ h+=0x6D2B79F5; let t=h; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; };
}
function shuffle<T>(items:T[],random:()=>number):T[] {
    const out=[...items];
    for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
    return out;
}
function weighted(pool:Record<string,number>,random:()=>number) {
    let n=random()*Object.values(pool).reduce((a,b)=>a+b,0);
    for(const [id,w] of Object.entries(pool)){n-=w;if(n<0)return id;}
    return Object.keys(pool)[0];
}
export function forestMeal(recipeId:string,s:GameState):ForestMeal|undefined {
    const recipe=getRecipe(recipeId);
    if(!recipe)return;
    const level=menuMasteryFromSales(s.lifetimeStats.recipeSales[recipeId]||0).level;
    const tier=FOREST_MEAL_LEVELS.find(t=>level>=t.from&&level<=t.to)!;
    const kind=recipe.tags.some(tag=>['bread','breakfast','lunch','vegetable'].includes(tag))||recipeId==='forestSecretCookie'?'foot':'luck';
    const rarity=recipe.requiredIngredients.some(id=>['forestHoney','forestMoonBerry'].includes(id))?'rare':recipe.forest?'special':'normal';
    return {recipeId,kind,rarity,level,
        pathReduction:Math.min(C.maxPathReduction,(kind==='luck'?tier.pathReduction:0)+(rarity==='rare'?1:0)),
        rareBonus:Math.min(C.maxRareBonus,(kind==='luck'?tier.rareBonus:0)+(rarity==='rare'?.05:rarity==='special'?.02:0)),
        obstacleSkip:kind==='foot'?tier.obstacleSkip:0,emptyHints:kind==='foot'?tier.emptyHints:0};
}
export function canEatForestMeal(recipeId:string,s:GameState,count=1) {
    const r=getRecipe(recipeId);
    if(!r||!isRecipeUsable(recipeId,s))return false;
    const reserved:Record<string,number>={};
    for(const o of s.orders.filter(o=>o.status==='queued'&&!o.forestReserved)) {
        for(const id of getRecipe(o.recipeId)?.requiredIngredients||[])reserved[id]=(reserved[id]||0)+1;
    }
    const needed:Record<string,number>={};
    for(const id of r.requiredIngredients)needed[id]=(needed[id]||0)+1;
    return Object.entries(needed).every(([id,n])=>(s.ingredients[id]||0)-(reserved[id]||0)>=n*count);
}
export function canCookForestDish(s:GameState,recipeId:string,count:number) {
    return !!forestRecipes.find(r=>r.id===recipeId) && Number.isInteger(count) && count>=1 && count<=3
        && (s.forest.dishes[recipeId]||0)+s.orders.filter(o=>o.forestReserved&&o.recipeId===recipeId).length+count<=3
        && canEatForestMeal(recipeId,s,count);
}
export function createForestLayer(s:GameState,floor:number,seed:number,meal?:ForestMeal,collected:Record<string,number>={},tutorial=false):ForestLayer {
    const band=forestBand(floor),area=forestArea(band.area),random=forestRandom(seed,`layer:${floor}`);
    const count=band.spots[0]+Math.floor(random()*(band.spots[1]-band.spots[0]+1));
    const cells=shuffle(Array.from({length:12},(_,i)=>i),random).slice(0,count);
    const kinds:ForestSpotKind[]=['berries','herbs','flowers','mushrooms','roots','leaves'];
    const rarePool=Object.fromEntries(Object.entries(area.bonus).filter(([id])=>['forestHoney','forestMoonBerry'].includes(id)));
    if(floor<51) for(const id of ['forestHoney','forestMoonBerry'])if(s.forest.discovered.includes(id))rarePool[id]=1;
    const basicPool=Object.fromEntries(Object.entries(area.bonus).filter(([id])=>!['forestHoney','forestMoonBerry'].includes(id)));
    const pathSpot=floor===C.maxFloor?-1:Math.floor(random()*count);
    const obstacleTotal=floor===C.maxFloor||random()>=band.obstacleChance?0:1+Math.floor(random()*band.obstacleMax);
    const obstacleSkipped=Math.min(obstacleTotal,meal?.obstacleSkip||0);
    let boxes=0;
    const spots=cells.map((cell,id)=>{
        const boxRoll=random();
        const kind:ForestSpotKind=boxes<C.maxBoxes&&boxRoll<C.boxChance?'box':kinds[Math.floor(random()*kinds.length)];
        if(kind==='box')boxes++;
        const food:string[]=[];
        let coins=0,tickets=0;
        if(kind==='box') {
            const story=ingredients.filter(i=>i.unlockEventId&&s.unlockedIngredients.includes(i.id));
            food.push(story.length&&random()<.08?story[Math.floor(random()*story.length)].id:weighted(area.normal,random));
            if(random()<C.coinChance)coins=forestCoinAmount(random());
            if(random()<C.ticketChance)tickets=1;
        } else {
            const found=random()<C.findChance;
            const roll=random(),rareRate=Object.keys(rarePool).length?Math.min(1-band.forestRate,band.rareRate+(meal?.rareBonus||0)):0;
            if(found&&roll<rareRate)food.push(weighted(rarePool,random));
            else if(found&&roll<rareRate+band.forestRate) {
                const preferred:Record<string,number>={...basicPool};
                const preference:Partial<Record<ForestSpotKind,string[]>>={berries:['forestBerry','forestWalnut'],herbs:['forestHerb','forestMint'],flowers:['forestPetal'],mushrooms:['forestMushroom'],roots:['forestMushroom','forestWalnut']};
                for(const preferredId of preference[kind]||[])if(preferred[preferredId])preferred[preferredId]*=2;
                food.push(weighted(preferred,random));
            } else if(found) {
                food.push(weighted(area.normal,random));
                if(random()<C.abundantChance)food.push(food[0]);
            }
        }
        return {id,cell,x:Math.round((random()-.5)*10),y:Math.round((random()-.5)*8),kind,food,coins,tickets,fragment:undefined as string|undefined,emptyHint:false};
    });
    const secret=area.secret;
    if(secret&&!collected[secret]&&(s.forest.fragments[secret]||0)<3&&random()<C.fragmentChance)spots[Math.floor(random()*count)].fragment=secret;
    if(tutorial&&floor===1)spots[0].food=['forestBerry'];
    // A leaves spot may be a path clue; never label a path or reward as empty.
    const hints=shuffle(spots.filter(p=>p.kind!=='box'&&p.id!==pathSpot&&!p.food.length&&!p.fragment&&!p.coins&&!p.tickets),random).slice(0,meal?.emptyHints||0);
    for(const hint of hints)hint.emptyHint=true;
    return {floor,spots,used:[],pathSpot,pathLimit:tutorial&&floor===1?3:Math.max(2,band.pathLimit-(meal?.pathReduction||0)),pathFound:false,obstacleTotal,obstacleSkipped,obstacleRemaining:obstacleTotal-obstacleSkipped};
}
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
    return s; const ids = forestRecipes.filter(r => (s.forest.fragments[r.id] || 0) >= 3).map(r => r.id); if (ids.every(id => s.unlockedRecipes.includes(id)))
    return s; return { ...s, unlockedRecipes: [...new Set([...s.unlockedRecipes, ...ids])] }; }
export function handmadeAmount(gift: Gift, reaction: GiftReaction, p: CharacterProgress) { let base = { love: 8, like: 5, normal: 2, dislike: -4 }[reaction]; if (base > 0 && p.lastGiftId === gift.id && (p.giftStreak || 0) >= 2)
    base = Math.ceil(base / 2); if ((reaction === 'love' || reaction === 'like') && !(p.handmadeFirst || []).includes(gift.id))
    base += 2; return base; }

function settleForest(s:GameState,loot:ForestLoot,now:number):GameState {
    const stock={...s.ingredients};
    for(const id of loot.food)stock[id]=(stock[id]||0)+1;
    const fragments={...s.forest.fragments};
    const found=loot.fragments|| (loot.fragment?{[loot.fragment]:1}:{});
    for(const [id,n] of Object.entries(found))fragments[id]=Math.min(3,(fragments[id]||0)+n);
    const success=loot.food.length>0||Object.keys(found).length>0||loot.coins>0||loot.tickets>0;
    return syncForestRecipes({...s,currency:s.currency+loot.coins,ingredients:stock,
        unlockedRecipes:[...new Set([...s.unlockedRecipes,...findNewRecipes(stock,s.unlockedRecipes)])],
        forest:{...s.forest,fragments,returns:s.forest.returns+(success?1:0),tickets:s.forest.tickets+loot.tickets,
            discovered:[...new Set([...s.forest.discovered,...loot.food])],lastReturn:loot,expedition:undefined,recoveredAt:Math.max(s.forest.recoveredAt,now)}});
}
export function migrateForest(s:GameState,version:number,now:number):GameState {
    if(version<24) {
        const forestIds=new Set(forestRecipes.map(r=>r.id));
        s={...s,unlockedRecipes:s.unlockedRecipes.filter(id=>!forestIds.has(id)||(s.forest.fragments[id]||0)>=3)};
    }
    if(version<23) {
        const {sales,...forest}=s.forest as ForestState & {sales?:Record<string,number>};
        s={...s,forest:{...forest,dishes:{...(sales||{}),...forest.dishes}}};
    }
    if(version<22) {
        const f=s.forest;
        const legacyBasketLevel=Object.values(f.fragments).filter(n=>n>=3).length>=4?16:Object.values(f.fragments).filter(n=>n>=3).length>=2?14:f.returns>=3?12:10;
        const lastReturn=f.lastReturn?.fragment&&!f.lastReturn.fragments?{...f.lastReturn,fragments:{[f.lastReturn.fragment]:1}}:f.lastReturn;
        s={...s,forest:{...f,legacyBasketLevel,lastReturn}};
    }
    const f=s.forest;
    // Legacy outings held unclaimed food in pending; their coins/tickets were already totals.
    const old=f.expedition as unknown as {layer?:ForestLayer;basket?:string[];pending?:ForestLoot;coins?:number;tickets?:number;fragment?:string}|undefined;
    if(old&&(version<22||!old.layer)) {
        return settleForest({...s,forest:{...f,expedition:undefined}},
            {food:[...(old.basket||[]),...(old.pending?.food||[])],coins:old.coins??old.pending?.coins??0,tickets:old.tickets??old.pending?.tickets??0,fragments:old.fragment?{[old.fragment]:1}:{},energySpent:0},now);
    }
    return s;
}
export function reduceForest(state:GameState,a:ForestAction):GameState {
    const now='now' in a?a.now??Date.now():Date.now();
    let f=recoverForest(state.forest,now);
    const e=f.expedition;
    const finish=(next:ForestState)=>({...state,forest:next});
    switch(a.type) {
        case 'FOREST_ENTER': {
            const floor=a.startFloor??1;
            if(e||state.lifetimeStats.totalOrders<1||f.energy<1||!canStartForest({...state,forest:f},floor)||a.mealId&&!canEatForestMeal(a.mealId,state))return state;
            const meal=a.mealId?forestMeal(a.mealId,state):undefined;
            const stock={...state.ingredients};
            if(meal)for(const id of getRecipe(meal.recipeId)!.requiredIngredients)stock[id]-=1;
            const seed=Math.floor(Math.random()*4294967296),tutorial=!f.tutorialDone;
            const layer=createForestLayer({...state,forest:f},floor,seed,meal,{},tutorial);
            return {...state,ingredients:stock,forest:{...f,nextId:f.nextId+1,lastReturn:undefined,recoveredAt:Math.max(now,f.recoveredAt),deepestFloor:Math.max(f.deepestFloor,floor),expedition:{id:f.nextId,seed,startFloor:floor,layer,basket:[],coins:0,tickets:0,fragments:{},harvested:false,energySpent:0,meal,tutorial}}};
        }
        case 'FOREST_GATHER': {
            if(!e||f.energy<1||a.floor!==e.layer.floor||!Number.isInteger(a.spot)||e.layer.used.includes(a.spot))return state;
            const spot=e.layer.spots.find(p=>p.id===a.spot);
            if(!spot)return state;
            const used=[...e.layer.used,a.spot];
            const tutorial=e.tutorial&&e.layer.floor===1;
            const pathFound=e.layer.floor<C.maxFloor && (e.layer.pathFound||used.length>=e.layer.pathLimit||used.includes(e.layer.pathSpot)&&(!tutorial||used.length>=2));
            const food=tutorial&&!e.harvested&&spot.food.length===0?['forestBerry']:spot.food;
            const fragment=spot.fragment&&!e.fragments[spot.fragment]&&(f.fragments[spot.fragment]||0)<3?spot.fragment:undefined;
            return finish({...f,energy:f.energy-1,tutorialDone:true,expedition:{...e,harvested:true,energySpent:e.energySpent+1,
                basket:[...e.basket,...food],coins:e.coins+spot.coins,tickets:e.tickets+spot.tickets,
                fragments:fragment?{...e.fragments,[fragment]:1}:e.fragments,layer:{...e.layer,used,pathFound},
                lastFind:{spot:a.spot,food,coins:spot.coins,tickets:spot.tickets,fragment,path:!e.layer.pathFound&&pathFound}}});
        }
        case 'FOREST_CLEAR':
            if(!e||a.floor!==e.layer.floor||!e.layer.pathFound||e.layer.obstacleRemaining<1||f.energy<1)return state;
            return finish({...f,energy:f.energy-1,expedition:{...e,energySpent:e.energySpent+1,layer:{...e.layer,obstacleRemaining:e.layer.obstacleRemaining-1},lastFind:undefined}});
        case 'FOREST_MOVE': {
            if(!e||a.floor!==e.layer.floor||!e.layer.pathFound||e.layer.obstacleRemaining>0||f.energy<1||e.layer.floor>=C.maxFloor)return state;
            const floor=e.layer.floor+1;
            if(floor>=51&&!forestDeepUnlocked({...state,forest:f}))return state;
            const checkpoint=floor%10===0&&floor<C.maxFloor;
            f={...f,energy:f.energy-1,deepestFloor:Math.max(f.deepestFloor,floor),checkpoints:checkpoint?[...new Set([...f.checkpoints,floor])]:f.checkpoints};
            const layer=createForestLayer({...state,forest:f},floor,e.seed,e.meal,e.fragments,false);
            return finish({...f,expedition:{...e,layer,energySpent:e.energySpent+1,lastFind:undefined}});
        }
        case 'FOREST_RETURN':
            if(!e)return state;
            return settleForest({...state,forest:f},{food:e.basket,coins:e.coins,tickets:e.tickets,fragments:e.fragments,floor:e.layer.floor,energySpent:e.energySpent},now);
        case 'FOREST_CLAIM':
        case 'FOREST_TAKE': return state;
        case 'FOREST_CRAFT': {
            const gift = handmadeGifts.find(g => g.id === a.giftId);
            if (!gift || state.currency < 100 || !Object.entries(gift.materials!).every(([id, n]) => (state.ingredients[id] || 0) >= n))
                return state;
            const stock = { ...state.ingredients };
            for (const [id, n] of Object.entries(gift.materials!))
                stock[id] -= n;
            return { ...state, currency: state.currency - 100, ingredients: stock, inventory: { ...state.inventory, [gift.id]: (state.inventory[gift.id] || 0) + 1 }, forest: { ...f, crafted: [...new Set([...f.crafted, gift.id])] } };
        }
        case 'FOREST_COOK': {
            const r=forestRecipes.find(r=>r.id===a.recipeId),count=a.count;
            if(!r||!canCookForestDish(state,r.id,count))return state;
            const stock={...state.ingredients};
            for(const id of r.requiredIngredients)stock[id]-=count;
            return {...state,ingredients:stock,forest:{...f,dishes:{...f.dishes,[r.id]:(f.dishes[r.id]||0)+count},serveForestNext:true}};
        }
        case 'FOREST_SELL':
        case 'FOREST_WITHDRAW': return state;
        case 'USE_SUPPLY_TICKET': {
            const received = receiveSupplies({ ...state, forest: f }, now), d = received.deliveries.find(d => d.id === a.deliveryId);
            if (!d || d.orderedAt > now || f.tickets < 1)
                return received;
            return receiveSupplies({ ...received, forest: { ...f, tickets: f.tickets - 1 }, deliveries: received.deliveries.map(item => item.id === d.id ? { ...item, arrivesAt: now } : item) }, now);
        }
    }
}
