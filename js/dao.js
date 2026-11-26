// 修为与杀伐：服炼丹药魂魄涨修为，破境要钥匙；修为高过对方，就能杀人夺宝——货、灵石、尸身、魂魄、妖丹
'use strict';

// need：破入下一境所需修为；key：破境的钥匙
const REALMS = [
  { name: '범인' },
  { name: '연기', need: 400, key: 'pill_found' },
  { name: '축기', need: 1600, key: 'blood_infant' },
  { name: '금단', need: 5000, key: 'soul_crystal' },
  { name: '원영' },
];

// 服炼所得修为；evil：吞人魂血，损阴德
const CULT_XP = {
  pill_qi: [12], pill_blood: [40], pill_found: [90], waste_pill: [3], herb_blood: [6], vine_fruit: [10],
  soul_wisp: [8, true], soul_grudge: [20, true], soul_pearl: [45, true], yao_core: [35, true],
  live_soul: [80, true], blood_essence: [25, true], blood_infant: [500, true], soul_crystal: [220, true],
};

function initDao() { S.cult = S.cult || { lv: 1, xp: 0 }; }

const realm = (lv = S.cult.lv) => REALMS[lv];
const realmName = (lv = S.cult.lv) => REALMS[lv].name;

// 赝品照样服得下，炼出的是里头那味的修为（见 bodyOf）
function cultXp(it) {
  it = bodyOf(it);
  if (it.id === 'water') return it.purity >= 99.9 ? 20 : 0;
  const e = CULT_XP[it.id];
  if (!e || it.fake) return 0;
  // 走火入魔涨不动，中毒涨得慢
  const state = Math.pow(0.4, condSev('me', 'deviation')) * (condSev('me', 'poisoned') ? 0.7 : 1);
  return Math.round(e[0] * potency(it) * state);
}

// 服炼：涨修为。吞魂饮血的，越炼越不像人
function cultivate(it) {
  const xp = cultXp(it);
  if (!xp) return '이것으로는 수련이 되지 않는다.';
  const err = exert('cultivate');
  if (err) return err;
  S.cult.xp += xp;
  if ((CULT_XP[bodyOf(it).id] || [])[1]) karmaShift(-1);
  log(`${itemName(it)}을(를) 복용해 수련했다. 수위 +${xp}(${S.cult.xp}/${realm().need || '—'}).`, 'gain');
  tasteFake(it);
  destroyItem(it);
  return null;
}

function breakOdds() {
  const r = realm();
  const hurt = 0.15 * condSev('me', 'injured') + 0.1 * condSev('me', 'poisoned');
  return clamp(0.55 + (S.retreat ? 0.15 : 0) + Math.min(0.2, (S.cult.xp - r.need) / r.need * 0.4) - hurt, 0.05, 0.95);
}

// 破境之物要真、要足：赝品、以次充好的服得下去，冲不开关
const flawedKey = it => !!it.fake || isDressed(it);
// 冲关用哪一件：先挑真的；没有真的，就是你看不出毛病、当成真的那件
const breakKey = (r = realm()) => r.key && (ownItem(it => it.id === r.key && !flawedKey(it)) || ownItem(it => it.id === r.key && !knownFlaw(it)));

function canBreak() {
  const r = realm();
  if (!r.need) return '이미 이 경지의 끝에 이르렀다';
  if (S.cult.xp < r.need) return `수위 부족(${S.cult.xp}/${r.need})`;
  if (condSev('me', 'deviation')) return '주화입마가 낫지 않아 관문을 돌파할 수 없다';
  if (!breakKey(r)) { const bad = owns(r.key); return bad ? `가진 ${ITEMS[r.key].name}은(는) ${bad.fake ? '위작' : '속임수로 만든 것'}이라 관문을 뚫을 수 없다` : `파경의 물건이 없다: ${ITEMS[r.key].name}`; }
  return null;
}

// 破境：成则境界大进，败则修为折损、元气大伤
function breakthrough() {
  const why = canBreak();
  if (why) return { err: why };
  const err = exert('breakthrough');
  if (err) return { err };
  const r = realm(), key = breakKey(r);
  takeItem(key);
  // 赝品、以次充好的：药力撑不到关口，白白耗去一件，修为倒不折损
  if (flawedKey(key)) {
    log(`${ITEMS[r.key].name}을(를) 삼키고 관문에 도전했지만 약기운이 관문까지 이르지 못하고 흩어졌다 — 그것은 ${key.fake ? '위작' : '속임수로 만든 물건'}이었다.`, 'loss');
    return { ok: false, text: `약기운이 부실해 관문에 닿자마자 흩어졌고 관문은 열리지 않았다. 곱씹어보니 깨달았다. 이 ${ITEMS[r.key].name}은(는) ${key.fake ? '가짜였다' : '속임수로 만든 것이라 약성이 일찍 상해 있었다'}.` };
  }
  if (Math.random() < breakOdds()) {
    S.cult.xp -= r.need;
    S.cult.lv++;
    S.vit.st = VIT_MAX; S.vit.sp = VIT_MAX;
    log(`${ITEMS[r.key].name}을(를) 삼키고 관문에 도전해 단번에 ${realmName()} 경지에 들었다!`, 'gold');
    return { ok: true, text: `영기가 역류하며 경맥이 강물처럼 출렁인다 — 너는 <b>${realmName()}</b>에 들어섰다. 잡역 구역에서 네가 고개 숙일 사람이 또 줄었다.` };
  }
  S.cult.xp = Math.round(S.cult.xp * 0.6);
  drain(S.vit.st - 5, S.vit.sp - 5);
  addCond('me', 'deviation', 1, '관문 돌파 실패');
  log(`관문 돌파 실패. ${ITEMS[r.key].name}을(를) 헛되이 쓰고 수위가 40% 깎였다.`, 'loss');
  return { ok: false, text: `단기가 경맥을 마구 휘저어 너는 방석에 피를 한 움큼 토했다. 관문은 열리지 않았다.` };
}

// 闭关的夜里也在修行
function retreatXp() {
  if (!S.retreat) return 0;
  const n = 20 + 10 * S.cult.lv;
  S.cult.xp += n;
  return n;
}

// 修为在势力里的分量
function daoPower() { return [0, 0, 12, 26, 42][S.cult.lv] || 0; }

// ───────────── 对方的境界 ─────────────

function npcLevel(p) {
  if (p.realm != null) return p.realm;
  const pw = npcBasePower(p);
  return pw < 20 ? 0 : pw < 40 ? 1 : pw < 60 ? 2 : pw < 80 ? 3 : 4;
}

const PROTECTED = ['qian', 'sun', 'tu'];
const killable = p => p && p.status === 'alive' && !p.official && !PROTECTED.includes(p.pid);
// 跟你动手时，中了你的蛊的人跌一境
const cultGap = p => S.cult.lv - (npcLevel(p) - guDrop(p));

function canKill(p) {
  if (!killable(p)) return '건드릴 수 없다: 이 사람은 종문 관리다';
  if (cultGap(p) < 1) return `${p.name}은(는) ${realmName(npcLevel(p))} 경지다. 너는 ${ta(p)}을(를) 죽일 수 없다`;
  return null;
}

function killOdds(p, night) {
  const w = ownWeapon();
  const arms = !w ? 0 : w.id === 'demon_blade' ? 0.2 : 0.1;
  const guards = Math.min(0.15, Object.values(S.items).filter(it => HELD(it) && ['iron_corpse', 'corpse_king', 'puppet_doll'].includes(it.id)).length * 0.05);
  // 你带伤中毒则难，对方带伤中毒则易
  const state = (condPenalty(p) - condPenalty('me')) / 100;
  return clamp(0.45 + 0.2 * (cultGap(p) - 1) + arms + guards + (night ? 0.08 : 0) - (p.faction === 'yao' ? 0.05 : 0) + state, 0.1, 0.97);
}

// 身上能搜出什么：灵石、肉身、魂魄、精血、妖丹，外加随身之物
function lootPerson(p, where) {
  const lv = npcLevel(p), got = [];
  const add = (id, extra = {}) => { const it = giveItem(id, extra); if (it) got.push(itemName(it)); return it; };
  const cash = Math.round(rnd(30, 120) * p.budgetMul * (lv + 1));
  earn(cash, `${p.name}에게서 ${cash} 영석을 찾아냈다.`);
  if (where === 'counter') goodsOf().forEach(it => {
    ['ask', 'knew', 'told', 'disputed'].forEach(k => delete it[k]);
    it.stolen = 5;
    if (hasQuality(it) && !it.mark) stampMark(it, p.faction);
    stow(it);
    got.push(itemName(it));
  });
  if (p.faction === 'yao') {
    add('yao_core', { q: clamp(45 + lv * 12 + rint(0, 15), 5, 100) });
    if (Math.random() < 0.5) add('beast_hide', { q: rint(50, 85) });
    add('soul_grudge');
  } else if (lv === 0) {
    add('corpse', { fresh: 6 });
    add(p.aff < -30 ? 'soul_grudge' : 'soul_wisp');
  } else {
    add('cult_corpse', { q: clamp(40 + lv * 12, 5, 100) });
    add('live_soul', { q: clamp(45 + lv * 12, 5, 100) });
    for (let i = 0; i < lv; i++) add('blood_essence', { q: rint(50, 85) });
  }
  if (Math.random() < 0.5) add(weighted(SELL_POOLS[p.faction]), { stolen: 4 });
  return { cash, got };
}

// 杀人夺宝。where：'counter' 关门打狗；'night' 夜里截杀
function killPerson(p, where) {
  const why = canKill(p);
  if (why) return { err: why };
  if (where === 'night' && S.scavenged) return { err: '오늘 밤은 이미 외출했다' };
  const err = exert('kill');
  if (err) return { err };
  if (where === 'night') S.scavenged = true;
  if (Math.random() >= killOdds(p, where === 'night')) {
    remember(p, '네가 그의 목숨을 노렸지만 그가 도망쳤다.', -100, 'betrayed');
    addCond('me', 'injured', 2, `${p.name}와(과) 사투`); addCond(p, 'injured', 1, '네 손에서 필사적으로 도망쳤다');
    const dmg = retaliate(p, 90);
    drain(30, 20); addHeat(8);
    const fee = payUpTo(rint(30, 100), '사투 끝에 다쳐 의원을 찾았다.');
    if (where === 'counter') dismissCustomer(false);
    return { ok: false, text: `${p.name}이(가) 필사적으로 몸을 빼 문짝을 부수고 도망쳤다. 너는 한 방 얻어맞았고 상처를 치료하는 데 ${fee} 영석이 들었다.\n${dmg}` };
  }
  const loot = lootPerson(p, where);
  const traitor = p.secret && p.secret.known && p.secret.to === 'mo';
  die(p, where === 'night' ? `${p.name}이(가) 밤길 골목을 걷다가 다시는 아무에게도 보이지 않았다.` : `${p.name}이(가) 한 전당포에 들어간 뒤 다시는 아무에게도 보이지 않았다.`);
  p.killed = true;
  karmaShift(-12);
  commitSin('harm', { p, w: 3, what: `${p.name}을(를) 죽였다` });
  S.stats.kills = (S.stats.kills || 0) + 1;
  const seen = clamp((where === 'counter' ? 0.2 + 0.07 * S.queue.length : 0.1) - playerPower() / 500, 0.03, 0.8);
  let tail;
  if (traitor) {
    addHeat(-8); adjustRep('mo', 2);
    tail = `${ta(p)}은(는) ${p.secret.type}였다 — 집법당은 네가 종문의 해를 제거했다고 여긴다.`;
  } else if (Math.random() < seen) {
    addHeat(where === 'counter' ? 20 : 12); adjustRep(p.faction, -8);
    startScandal(p, 'murder');
    tail = '불행히도 누군가 보았다. 소문이 이미 퍼졌다.';
  } else {
    adjustRep(p.faction, -1);
    tail = '아무도 보지 못했다. 잡역 구역에서는 매일 누군가 사라진다.';
  }
  if (where === 'counter') { clearCounter(); returnTray(); S.customer = null; }
  log(`너는 ${p.name}을(를) 죽이고 ${loot.got.join(', ')}을(를) 노획했다.`, 'loss');
  return { ok: true, text: `${where === 'counter' ? '너는 문짝을 걸어 잠갔다.' : '너는 골목 어귀에서 삼경까지 기다렸다.'} ${p.name}은(는) 소리 낼 새도 없이 맥없이 쓰러졌다.\n노획: ${loot.cash} 영석, ${loot.got.join(', ')}.\n${tail}` };
}

// 种魂印：以魂珠为引，在修为低于你的人识海里烙下印记，从此难违你意
function soulMarkOdds(p) { return clamp(0.4 + 0.15 * cultGap(p) + techLv('soul') * 0.05, 0.05, 0.9); }

function canSoulMark(p) {
  if (!killable(p) || p.soulBound) return '심을 수 없다';
  if (cultGap(p) < 1) return '수위가 상대에 미치지 못한다';
  if (!techLv('soul')) return '연혼술을 익혀야 한다';
  if (!owns('soul_pearl')) return '연혼주 한 알이 매개로 필요하다';
  return null;
}

function soulMark(p) {
  const why = canSoulMark(p);
  if (why) return { err: why };
  const err = exert('soulmark');
  if (err) return { err };
  takeItem(owns('soul_pearl'));
  karmaShift(-4);
  commitSin('harm', { p, w: 2, what: `${p.name}에게 혼인을 심었다` });
  if (Math.random() < soulMarkOdds(p)) {
    p.soulBound = { day: S.day };
    remember(p, '정신이 아득해지더니 식해에 무언가 더해졌다.', 0);
    return { ok: true, text: gx(p, `혼주가 네 손바닥에서 녹아 흑기 한 가락이 ${p.name}의 미간으로 스며들었다. 그는 휘청이며 눈빛이 잠시 비었다가 다시 돌아왔다 — 다만 이제부터 네 말을 거스르기 어려워진다.`) };
  }
  remember(p, '네가 그의 식해에 혼인을 심으려 한 것을 그가 알아챘다.', -60, 'controlled');
  startScandal(p, 'control');
  return { ok: false, text: gx(p, `${p.name}이(가) 힘껏 뿌리치자 혼인이 검은 연기로 부서졌다. 그가 놀람과 분노로 너를 노려본다: "너... 네가 내 혼을 제련하려 했어?"`) };
}
