export const GAME_CONFIG = {
  saveKey:"komorebi-cafe-save-v1",
  saveVersion:14,
  initialCurrency:200,
  profitMultiplier:0.1,
  daysPerSeason:28,
  orderSpawnMinMs:5000,
  orderSpawnMaxMs:10000,
  maxOrders:6,
  requestOrderChance:.2,
  requestOrderBonus:1.25,
  baseCookingSeconds:30,
  ingredientPackSize:4,
  improvedPackSize:5,
  dateUnlockStage:8,
  dateAffection:12,
  autoProcurementThreshold:2,
  procurementMs:60000,
  minProcurementMs:30000,
  maxProcurementPacks:20,
  hirePrice:1200,
  maxStationsPerType:3,
  maxStationLevel:5,
  serveMs:2000,
  talkAffection:2,
  procurementAffection:1,
  giftShopSize:8,
  maxDailyActions:5,
  giftAffection:{ love:10, like:6, normal:2, dislike:-4 },
  giftRarityMultiplier:{ common:1, rare:1.6, superRare:2.8, ultraRare:5 },
  giftRarityWeight:{ common:60, rare:25, superRare:8, ultraRare:2 },
};

export const relationshipNames = [
  "未訪問", "はじめまして", "顔なじみ", "信頼の芽", "近づく距離", "素顔を知る",
  "特別な存在", "心を分かち合う", "大切な約束", "恋人", "ふたりの未来",
];

export const affectionThresholds = [0, 0, 10, 30, 65, 110, 170, 245, 335, 450, 600];
export const giftRequirementTargets = [0, 0, 0, 0, 0, 0, 1, 2, 4, 7, 10];

export function relationshipLabel(stage:number, route="undecided") {
  if (route==="friendship" && stage>=9) return stage===10?"これからも仕事仲間":"大切な仕事仲間";
  return relationshipNames[stage] || relationshipNames[0];
}
