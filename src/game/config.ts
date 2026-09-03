export const GAME_CONFIG = {
  saveKey:"komorebi-cafe-save-v1",
  saveVersion:4,
  initialCurrency:3000,
  daysPerSeason:28,
  orderSpawnMinMs:5000,
  orderSpawnMaxMs:10000,
  maxOrders:3,
  offlineCoinsPerMinute:2,
  maxOfflineMinutes:240,
  talkAffection:5,
  maxDailyActions:5,
  giftAffection:{ love:25, like:15, normal:8, dislike:-5 },
};

export const relationshipNames = [
  "未訪問", "はじめまして", "顔なじみ", "信頼の芽", "近づく距離", "素顔を知る",
  "特別な存在", "心を分かち合う", "大切な約束", "恋人", "ふたりの未来",
];

export const affectionThresholds = [0, 0, 20, 45, 75, 110, 150, 195, 245, 300, 360];

export function relationshipLabel(stage:number, route="undecided") {
  if (route==="friendship" && stage>=9) return stage===10?"これからも仕事仲間":"大切な仕事仲間";
  return relationshipNames[stage] || relationshipNames[0];
}
