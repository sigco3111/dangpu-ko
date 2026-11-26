// 状态与判定：受伤、中毒、走火入魔、力竭……人身上的状态改变事件的走向。
// 你（'me'）与每个人物都有状态；judge() 把双方的境界、兵器、状态折算成一次比斗的胜负与缘由，
// fightRoll / lieCaught / hideRoll / 杀人 / 拾荒 / 破境 / 人物命数都会读它
'use strict';

// combat：比斗每重的折损；regen：你夜里少恢复多少；heal：几天好一重；cure：服下即愈的东西
// lethal：到了第三重，每夜咽气的机会；第三重上再添一重，当场毙命
const CONDS = {
  injured:   { name: '부상', combat: 14, regen: 15, heal: 3, lethal: 0.05, cure: ['vine_fruit', 'pill_blood'], grade: ['경상', '중상', '빈사'],
               desc: '겨루기, 싸움, 뒤지기 모두 불리하다; 밤의 회복량이 줄어든다. 혈등과와 혈살단으로 치료하거나 며칠 요양한다. 빈사 상태에서는 언제 숨을 거둘지 모르고 상처가 하나 더해지면 반드시 죽는다.' },
  poisoned:  { name: '중독', combat: 10, drain: 5, heal: 0, worsen: 4, lethal: 0.05, cure: ['herb_blood', 'pill_qi'], grade: ['경독', '독 발작', '독이 심맥에 퍼짐'],
               desc: '매일 밤 체력과 정신이 소모된다. 경독은 며칠 견디면 저절로 낫지만 독 발작 이상은 치료하지 않으면 점점 심해지고, 독이 심맥에 퍼지면 언제든 독발사할 수 있다. 혈영지와 회기단으로 해독한다.' },
  deviation: { name: '주화입마', combat: 8, heal: 5, cure: ['water'], grade: ['기란', '주화', '입마'],
               desc: '수위가 오르지 않고 관문 돌파는 반드시 실패하며, 마음이 불안해 거짓말이 쉽게 들통난다. 순도 높은 영천수면 가라앉힐 수 있고 하룻밤 폐관하면 빨리 낫는다.' },
};
// 不必记账、看当下就知道的状态
const DERIVED = {
  exhausted: { name: '탈진', combat: 10 },   // 你：体力或精神见底
  sickly:    { name: '병약', combat: 12 },   // 人物：体魄不足四十
  addicted:  { name: '약물 중독', combat: 5 },    // 人物：每重瘾
  gu:        { name: '고충에 걸림', combat: 6 },    // 人物：身中你的蛊，出手迟滞
  dazed:     { name: '조종당함', combat: 6 },    // 人物：识海里种着魂印，神志受控
};

function initConditions() { S.conds = S.conds || {}; }

const condBox = who => who === 'me' ? S.conds : (who.conds = who.conds || {});
const whoName = who => who === 'me' ? '너' : who.name;

// 添一重状态（同类叠加，最多三重）
function addCond(who, kind, sev = 1, why = '') {
  const box = condBox(who), c = box[kind] || { sev: 0, day: S.day }, was = c.sev;
  c.sev = clamp(c.sev + sev, 1, 3); c.day = S.day;
  box[kind] = c;
  const C = CONDS[kind];
  if (who === 'me') {
    log(`${why}${why ? ', ' : ''}너는 ${C.grade[c.sev - 1]} 상태다(${C.name}). ${C.lethal && c.sev === 3 ? '치료하지 않으면 언제 목숨을 잃을지 모른다.' : ''}`, 'loss');
    if (C.lethal && was === 3) dieMe(kind, why);
  } else { if (kind === 'injured') guHold(who); lifeNote(who, `${why}${why ? ', ' : ''}${C.grade[c.sev - 1]}.`); }
  return c;
}

// 你死了：结局文字按死因；手里有护身符，就有人把你从鬼门关拽回来
const DEATHS = {
  injured: why => ({ title: '중상으로 사망', text: `${why ? `${why}. 상처 위에 상처가 더해져 너는 다시 일어나지 못했다` : '상처가 밤에 터져 너는 새벽을 넘기지 못했다'}. 다음 날 아침 이웃들은 전당포 문 앞에 흰 등롱이 걸린 것을 보았다. 카운터의 등잔 기름은 다 타버렸고 장부는 그 페이지에 펼쳐진 채였다.` }),
  poisoned: why => ({ title: '독발사', text: `${why ? `${why}. 독 위에 독이 겹쳐 검은 피 한 움큼이 솟아올랐다` : '독이 가슴까지 번진 그날 밤 너는 사람을 부를 힘조차 없었다'}. 날이 밝았을 때 전당포 문 앞에는 흰 등롱이 걸려 있었고 카운터의 약탕관에는 약이 반 모금만 남아 있었다.` }),
};
// 选项提示用：第二重再添就到了鬼门关前；第三重再添就没命了
function deathWarn(kind) {
  const C = CONDS[kind], sev = condSev('me', kind), hurt = kind === 'injured' ? '부상을' : '중독을';
  if (!C.lethal || sev < 2) return '';
  return sev === 3 ? `; 이미 ${C.grade[2]} 상태다. 다시 ${hurt} 입으면 반드시 죽는다` : `; 이미 ${C.grade[1]} 상태다. 다시 ${hurt} 입으면 ${C.grade[2]}이(가) 된다`;
}

function dieMe(kind, why = '') {
  if (S.over) return;
  if (savedByBenefactor('death')) { const c = S.conds[kind]; c.sev = 2; c.day = S.day; return; }
  S.over = { win: false, cause: 'death', scene: kind === 'poisoned' ? 'end_death_poison' : 'end_death', ...DEATHS[kind](why) };
}

function cureCond(who, kind) { const box = condBox(who); if (!box[kind]) return false; delete box[kind]; return true; }
// 减轻几重，减到零就好了；返回剩下几重
function easeCond(who, kind, n) {
  const c = condBox(who)[kind];
  if (!c) return 0;
  c.sev -= n; c.day = S.day;
  if (c.sev <= 0) { delete condBox(who)[kind]; return 0; }
  return c.sev;
}
const condSev = (who, kind) => (condBox(who)[kind] || {}).sev || 0;
const hasCond = (who, kind) => condSev(who, kind) > 0 || condList(who).some(c => c.kind === kind);

// 当下所有状态：[{ kind, name, sev, label, combat }]
function condList(who) {
  const out = [];
  for (const [k, c] of Object.entries(condBox(who))) {
    const C = CONDS[k];
    if (C) out.push({ kind: k, name: C.name, sev: c.sev, label: C.grade[c.sev - 1], combat: C.combat * c.sev });
  }
  if (who === 'me') {
    if (S.vit.st < 25 || S.vit.sp < 20) out.push({ kind: 'exhausted', name: '탈진', sev: 1, label: '탈진', combat: DERIVED.exhausted.combat });
  } else {
    if (who.poisonedDay && S.day - who.poisonedDay <= 5 && who.health < 60 && !condBox(who).poisoned)
      out.push({ kind: 'poisoned', name: '중독', sev: 2, label: '시독에 걸림', combat: 20 });
    if (who.health != null && who.health < 40) out.push({ kind: 'sickly', name: '병약', sev: 1, label: '병약', combat: DERIVED.sickly.combat });
    if ((who.addict || 0) >= 2) out.push({ kind: 'addicted', name: '약물 중독', sev: who.addict, label: `약물 중독 ${who.addict}단계`, combat: DERIVED.addicted.combat * who.addict });
    if (guBound(who)) out.push({ kind: 'gu', name: '고충에 걸림', sev: 1, label: `${GU_STAGES[who.controlled.stage || 0].name}에 걸림`, combat: DERIVED.gu.combat });
    if (who.soulBound) out.push({ kind: 'dazed', name: '조종당함', sev: 1, label: '정신이 조종됨(혼인)', combat: DERIVED.dazed.combat });
  }
  return out;
}

// 状态让比斗吃多少亏（正数）
const condPenalty = who => condList(who).reduce((s, c) => s + c.combat, 0);

// 一句话描述，写进事件文字里
function condText(who) {
  const l = condList(who);
  if (!l.length) return '';
  return who === 'me' ? `너: ${l.map(c => c.label).join(', ')}.` : `${who.name}: ${l.map(c => c.label).join(', ')}.`;
}

// ───────────── 判定 ─────────────

const WEAPON_POWER = { demon_blade: 20, xian_sword: 16, soul_banner: 16, god_blank: 8, sword_std: 8, bone_flute: 5, soul_bell: 5 };

// 一方的实力与构成：境界、兵器/护卫（你）、势力（人物）、状态
function strengthOf(who) {
  const parts = [];
  if (who === 'me') {
    parts.push([`경지·${realmName()}`, S.cult.lv * 18]);
    const w = ownWeapon();
    if (w) parts.push([`무기·${itemName(w)}`, WEAPON_POWER[w.id] || 5]);
    const g = Object.values(S.items).filter(it => HELD(it) && ['iron_corpse', 'corpse_king', 'puppet_doll'].includes(it.id)).length;
    if (g) parts.push(['호위', Math.min(15, g * 6)]);
  } else {
    const lv = Math.max(0, npcLevel(who) - guDrop(who));   // 中了你的蛊，跟你动手跌一境
    parts.push([`경지·${realmName(lv)}${guDrop(who) ? '(고충)' : ''}`, lv * 18]);
    parts.push(['몸놀림', Math.round(npcBasePower(who) / 5)]);
  }
  for (const c of condList(who)) parts.push([c.label, -c.combat]);
  return { total: parts.reduce((s, p) => s + p[1], 10), parts };
}

// 比斗：a 对 b（'me' 或人物）。bonus 给 a 加减；返回胜负、等第、双方构成——事件据 grade 分支
// grade：crush 大胜 / win 胜 / edge 险胜 / lose 败 / rout 惨败
function judge(a, b, { bonus = 0, luck = 12 } = {}) {
  const A = strengthOf(a), B = strengthOf(b);
  const margin = A.total + bonus - B.total + rnd(-luck, luck);
  const grade = margin > 22 ? 'crush' : margin > 8 ? 'win' : margin > 0 ? 'edge' : margin > -18 ? 'lose' : 'rout';
  return { win: margin > 0, grade, margin: Math.round(margin), a: A, b: B };
}
const GRADE_NAME = { crush: '대승', win: '승', edge: '신승', lose: '패', rout: '참패' };
const partsText = s => s.parts.map(([k, v]) => `${k}${v >= 0 ? '+' : ''}${v}`).join(', ');

// 对固定难度的判定（翻山、逃命、硬撑）：dc 越高越难
function trial(who, dc, { luck = 12 } = {}) {
  const S_ = strengthOf(who), margin = S_.total - dc + rnd(-luck, luck);
  return { ok: margin > 0, margin: Math.round(margin), s: S_ };
}

// 对固定难度的成算估计（给选项提示用）
function trialOdds(dc) { let w = 0; for (let i = 0; i < 200; i++) if (trial('me', dc).ok) w++; return w / 200; }

// 胜率估计（给选项提示用）：多算几次
function judgeOdds(a, b, opts = {}) {
  let w = 0;
  for (let i = 0; i < 200; i++) if (judge(a, b, opts).win) w++;
  return w / 200;
}

// ───────────── 每夜：恢复、恶化、毒发 ─────────────

function condTick() {
  const out = [];
  const step = (who, k, c) => {
    const C = CONDS[k], age = S.day - c.day;
    // 微毒熬得过去：四天自己退；毒发以上才会加重
    if (k === 'poisoned' && c.sev === 1 && age >= 4) { delete condBox(who)[k]; return 'gone'; }
    if (C.worsen && age >= C.worsen && c.sev < 3 && !(k === 'poisoned' && c.sev === 1)) { c.sev++; c.day = S.day; return 'worse'; }
    if (C.heal && age >= C.heal) { c.sev--; c.day = S.day; if (c.sev <= 0) { delete condBox(who)[k]; return 'gone'; } return 'better'; }
    return null;
  };
  for (const [k, c] of Object.entries(S.conds)) {
    if (k === 'deviation' && S.retreat) c.day -= 2;
    if (k === 'poisoned') drain(CONDS.poisoned.drain * c.sev, CONDS.poisoned.drain * c.sev);
    const r = step('me', k, c);
    if (r === 'gone') out.push({ icon: 'ic_stamina', title: CONDS[k].name, text: `네 ${CONDS[k].name}이(가) 나았다.`, cls: 'ok' });
    else if (r === 'worse') out.push({ icon: 'ic_stamina', title: CONDS[k].name, text: `네 ${CONDS[k].name}이(가) 심해졌다: ${CONDS[k].grade[c.sev - 1]}. ${CONDS[k].desc}`, cls: 'bad' });
    else if (k === 'poisoned') out.push({ icon: 'ic_stamina', title: '중독', text: `독이 경맥을 돌아다닌다. 체력·정신 각각 -${CONDS.poisoned.drain * c.sev}.`, cls: 'bad' });
    // 第三重熬一夜是一夜（刚加重的那夜不算）
    if (CONDS[k].lethal && c.sev === 3 && r !== 'worse') {
      if (Math.random() < CONDS[k].lethal) dieMe(k);
      else out.push({ icon: 'ic_stamina', title: CONDS[k].grade[2], text: `너는 ${CONDS[k].grade[2]} 상태로 밤새 몇 번이나 기절했다가 겨우 새벽을 맞았다. 치료하지 않으면 다음 밤에는 깨어나지 못할지도 모른다.`, cls: 'bad' });
    }
  }
  for (const p of Object.values(S.people)) {
    if (p.status !== 'alive' || !p.conds) continue;
    for (const [k, c] of Object.entries(p.conds)) {
      if (k === 'poisoned') p.health = (p.health != null ? p.health : 100) - 4 * c.sev;
      step(p, k, c);
    }
    // 毒发以上熬不过去：手头宽裕的人会去寻郎中
    if (condSev(p, 'poisoned') >= 2 && p.health > 0 && Math.random() < 0.08 * Math.min(1, p.budgetMul)) {
      cureCond(p, 'poisoned'); lifeNote(p, '의원을 찾아 몸의 독을 풀었다.');
    }
    // 垂危没人救，随时可能咽气
    guHold(p);
    if (condSev(p, 'injured') === 3 && Math.random() < CONDS.injured.lethal) {
      die(p, `${p.name}이(가) 중상을 이기지 못하고 숨을 거두었다.`);
      out.push({ icon: 'ic_ledger', title: '장터 소문', text: p.life[p.life.length - 1].t, cls: 'bad' });
    }
  }
  return out;
}

// 夜里恢复少多少（受伤）
const condRegenPenalty = () => condSev('me', 'injured') * CONDS.injured.regen;

// 服下能治状态的东西
function cureBy(it, who = 'me') {
  for (const [k, C] of Object.entries(CONDS)) {
    if (!condSev(who, k) || !C.cure.includes(bodyOf(it).id)) continue;
    if (k === 'deviation' && it.id === 'water' && it.purity < 99) continue;
    return k;
  }
  return null;
}

// 药能治几重伤毒：看真实品质——下品减一重，中品减两重，上品以上除根；灵泉水只要纯度够就除根
const CURE_GRADES = [[65, 3], [35, 2], [0, 1]];
const cureGrades = it => hasQuality(it) ? CURE_GRADES.find(([q]) => it.q >= q)[1] : 3;
const CURE_TEXT = ['', '1단계 완화', '2단계 완화', '완치'];

// 人物服下你卖的、送的东西：真药治伤解毒（掺了血灵芝的照样管用）
function npcCure(p, it) {
  if (it.fake || (it.laced && it.laced !== 'tonic')) return null;
  const k = cureBy(it, p);
  if (k) { const left = easeCond(p, k, cureGrades(it)); lifeNote(p, `${itemName(it)}을(를) 먹고 ${left ? `${CONDS[k].name}이(가) ${CONDS[k].grade[left - 1]}(으)로 나아졌다` : `${CONDS[k].name}이(가) 나았다`}.`); }
  return k;
}

// ───────────── 求医 ─────────────

// 手上对症的药
const cureItems = () => Object.values(S.items).filter(it => HELD(it) && cureBy(it));

// 结识过的医者：人物定义里写了 healer、见过面、人还在
const isHealer = p => !!(CAST[p.pid] && CAST[p.pid].healer);
const healers = () => Object.values(S.people).filter(p => isHealer(p) && p.status === 'alive' && p.visits > 0);

// 他治得了你身上的哪几样
const healable = p => CAST[p.pid].healer.heals.filter(k => condSev('me', k));

// 诊金：伤毒越重越贵；交情越好越便宜，亲厚的只收个药钱；贪的人多要；仇视你的不肯治（null）
const HEAL_MOOD = { cold: 1.6, neutral: 1, warm: 0.6, close: 0.25 };
function healFee(p) {
  const m = mood(p.aff);
  if (m === 'hostile') return null;
  const sev = healable(p).reduce((s, k) => s + condSev('me', k), 0);
  return Math.max(10, Math.round(CAST[p.pid].healer.fee * sev * HEAL_MOOD[m] * (0.7 + 0.6 * (p.greed != null ? p.greed : 0.5)) / 10) * 10);
}

// 能不能找他看：能看返回 null，否则返回原因
function healBlock(p) {
  if (!p.visits) return `${ta(p)}은(는) 아직 네 가게에 온 적이 없다. 알고 지내야 진료를 청할 수 있다`;
  if (!Object.keys(S.conds).length) return '너에게는 상처도 독도 없다';
  if (!healable(p).length) return `${ta(p)}은(는) 네 병을 고칠 수 없다`;
  const fee = healFee(p);
  if (fee == null) return `${ta(p)}은(는) 너를 뼛속까지 미워해 진료해주지 않는다`;
  if (S.stones < fee) return `진료비 ${fee} 영석, 네게 부족하다`;
  return null;
}

const CURE_VERB = { injured: '뼈를 맞추고 약을 발랐다', poisoned: '침을 놓아 독을 몰아냈다', deviation: '기혈을 바로잡았다' };
function seekHealer(p) {
  const why = healBlock(p);
  if (why) return { err: why };
  const kinds = healable(p), fee = healFee(p);
  spend(fee, `${p.name}에게 진료를 청해 진료비 ${fee} 영석을 냈다.`);
  kinds.forEach(k => cureCond('me', k));
  remember(p, `네가 찾아가 진료를 받고 ${fee} 영석을 냈다.`, 2);
  return { text: `${p.name}이(가) ${fee} 영석을 받고 너를 위해 ${kinds.map(k => CURE_VERB[k]).join(', ')}. 네 ${kinds.map(k => CONDS[k].name).join(', ')}이(가) 나았다.` };
}

// 人物受伤后的命数与需求：带伤的人会来买药
function healingWant(p) {
  if (condSev(p, 'injured')) return pick(['vine_fruit', 'pill_blood']);
  if (condSev(p, 'poisoned') || (p.poisonedDay && S.day - p.poisonedDay <= 5)) return 'herb_blood';
  return null;
}
