// 体力与精神：一切行动都有消耗，入定歇息后恢复；丹药、灵酒、安神香等可以补回来
'use strict';

const VIT_MAX = 100;

// [体力, 精神]
const MACHINE_COST = {
  furnace: [8, 2], forge: [10, 4], danlu: [4, 10], pool: [3, 2], spring: [1, 0], herbbed: [2, 1], gupot: [2, 1], winejar: [2, 0],
  puppet: [0, 0], soulfurnace: [4, 8], coffin: [6, 6], puppetbench: [10, 6], yaopot: [2, 1], forgery: [4, 10],
  dihuo: [15, 3], pen: [3, 1], fudesk: [2, 16],
};
const ACTION_COST = {
  appraise: [0, 4], inspect: [0, 2], probe: [0, 8], haggle: [0, 2], dispute: [0, 3], dig: [6, 2], market: [10, 2],
  talk: [0, 6], erase: [3, 12], seal: [1, 5], bottle: [1, 0], retreat: [30, 10],
  cultivate: [0, 4], breakthrough: [20, 30], kill: [25, 10], soulmark: [5, 20], flatter: [0, 6], command: [0, 5],
};
const ACTION_NAME = { appraise: '감정', inspect: '검품', probe: '신식 탐지', haggle: '흥정', dispute: '흠 잡기', dig: '뒤지기', market: '귀시 가기',
  talk: '말솜씨', erase: '낙인 지우기', seal: '봉인 부착', bottle: '병에 담기', retreat: '폐관',
  cultivate: '복용 수련', breakthrough: '돌파', kill: '손 쓰기', soulmark: '혼인 심기', flatter: '띄우기', command: '부리기' };

// 服用后恢复的 [体力, 精神]：中品（品质 50）的数，品质高低按 potency 增减
const RESTORE = {
  pill_qi: [0, 30], pill_blood: [25, 10], vine_fruit: [40, 0], spirit_wine: [15, 15], herb_dew: [0, 8], spirit_fruit: [10, 0],
  incense: [0, 40],
};
function restoreOf(it) {
  it = bodyOf(it);
  if (it.id === 'water') return it.purity >= 99.9 ? [25, 25] : it.purity >= 99 ? [0, 15] : null;
  return RESTORE[it.id] && (RESTORE[it.id][0] || RESTORE[it.id][1]) ? RESTORE[it.id].map(v => Math.round(v * potency(it))) : null;
}

// 药力：按真实品质算（以次充好的看着好，药力还是原来那点）。下品约七成，中品足量，极品近一倍半；灵泉水看纯度，不看这个
const potency = it => hasQuality(it) ? 0.6 + it.q / 125 : 1;

function initVitality() { S.vit = S.vit || { st: VIT_MAX, sp: VIT_MAX }; }

function vitShort(st, sp) {
  if (S.vit.st < st) return '체력 부족';
  if (S.vit.sp < sp) return '정신 부족';
  return null;
}

function drain(st, sp) {
  S.vit.st = clamp(Math.round(S.vit.st - st), 0, VIT_MAX);
  S.vit.sp = clamp(Math.round(S.vit.sp - sp), 0, VIT_MAX);
}

// 行动：够就扣，不够返回原因
function exert(key, mult = 1) {
  const [st, sp] = ACTION_COST[key].map(v => Math.round(v * mult));
  const why = vitShort(st, sp);
  if (why) return `${why}: ${ACTION_NAME[key]}할 수 없다(필요 체력 ${st}, 정신 ${sp})`;
  drain(st, sp);
  const acts = S.stats.acts = S.stats.acts || {};
  acts[key] = (acts[key] || 0) + 1;
  return null;
}

function costText(key, mult = 1) {
  const [st, sp] = ACTION_COST[key].map(v => Math.round(v * mult));
  return [st ? `체${st}` : '', sp ? `정${sp}` : ''].filter(Boolean).join(' ');
}

// 服用
function consume(it) {
  const cure = cureBy(it);
  if (cure) {
    const left = easeCond('me', cure, cureGrades(bodyOf(it)));
    log(`${itemName(it)}을(를) 복용했다. ${left ? `${CONDS[cure].name}이(가) ${CONDS[cure].grade[left - 1]}(으)로 줄었다. 약력이 부족해 뿌리를 뽑지 못했다` : `${CONDS[cure].name}이(가) 나았다`}.`, 'gain');
  }
  // 吃下别人掺过料的货：自己吃这个亏（药效先到，料后发作）；自己掺的料、蛊，自己吃了不算数
  if (it.laced && it.laced !== 'tonic' && it.laced !== 'love' && it.lacedBy !== 'me') {
    it.lacedSeen = true;
    if (it.laced === 'poison') addCond('me', 'poisoned', 2, `${itemName(it)}에 시독이 섞여 있었다`);
    else if (it.laced === 'control') addCond('me', 'injured', 1, `${itemName(it)}에 남의 고가 숨어 있었다. 운공해서 몰아냈고 고에 걸리지 않았다`);
    else if (LACE[it.laced].onMe) LACE[it.laced].onMe(it);
    else { drain(0, 30); log(`${itemName(it)}에 망우산이 섞여 있었다. 한참 몽롱했다. 정신 -30.`, 'loss'); }
  }
  const r = restoreOf(it);
  if (!r) { if (cure) { tasteFake(it); destroyItem(it); return null; } return '이것으로는 기력을 보충할 수 없다.'; }
  const before = { ...S.vit };
  S.vit.st = Math.min(VIT_MAX, S.vit.st + r[0]);
  S.vit.sp = Math.min(VIT_MAX, S.vit.sp + r[1]);
  log(`${itemName(it)}을(를) 복용했다. 체력 +${S.vit.st - before.st}, 정신 +${S.vit.sp - before.sp}.`, 'gain');
  tasteFake(it);
  destroyItem(it);
  return null;
}

// 入定歇息：闭关的夜里恢复得少
function restNight() {
  const q = S.upgrades.quiet ? 20 : 0, r = S.retreat ? -25 : 0, d = 5 * (S.cult.lv - 1);
  const hurt = condRegenPenalty();
  const st = 50 + q + r + d - hurt, sp = 45 + q + r + d - hurt;
  // 垂危还闭关，一夜下来只会更虚——但不至于虚到零以下
  S.vit.st = clamp(S.vit.st + st, 0, VIT_MAX);
  S.vit.sp = clamp(S.vit.sp + sp, 0, VIT_MAX);
  const xp = retreatXp();
  return { icon: 'ic_stamina', title: '휴식', text: `${S.retreat ? `폐관한 밤, 수위 +${xp}. ` : hurt ? '상처가 아파 설쳤다. ' : '푹 잤다. '}체력이 ${S.vit.st}, 정신이 ${S.vit.sp}(으)로 회복됐다` };
}

// 闭关：当夜亲自坐镇炉火，地火炉可炼神兵胚料，诸炉出品更精
function toggleRetreat() {
  if (S.retreat) { S.retreat = false; drain(-ACTION_COST.retreat[0], -ACTION_COST.retreat[1]); return null; }
  const err = exert('retreat');
  if (err) return err;
  S.retreat = true;
  return null;
}
