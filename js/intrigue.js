// 人心与权谋：每个人按自己的利益行事——加料、成瘾、控心、送礼、打点官差、事发追责
'use strict';

// ───────────── 所求与利益 ─────────────

// 各身份最想得到的东西
const WISHES = {
  '낙패한 산수': ['pill_found', 'pill_qi'], '범인 행상': ['spirit_wine', 'jade_pendant'], '잡역 소년': ['pill_qi', 'sword_std'],
  '유방 검객': ['xian_talisman', 'pill_qi'], '복면 여수사': ['bronze_mirror', 'jade_pendant'], '외문 제자': ['sword_std', 'pill_blood'],
  '내문 사배': ['soul_banner', 'soul_pearl'], '여우 요괴': ['spirit_fruit', 'yao_core'], '호랑이 요괴': ['spirit_wine', 'beast_hide'],
  '뱀 요괴': ['pill_found', 'wangyou'], '축기 수사': ['pill_found', 'soul_pearl'], '내문 제자': ['soul_pearl', 'iron_corpse', 'puppet_doll'],
};
WISHES['내문 사형'] = WISHES['내문 사배']; WISHES['복면 수사'] = WISHES['복면 여수사']; WISHES['잡역 소녀'] = WISHES['잡역 소년'];
const WAR_WISHES = { mo: ['sword_std', 'pill_blood', 'soul_pearl', 'iron_corpse', 'puppet_doll', 'vine_fruit'], ren: ['vine_fruit', 'pill_qi'], yao: ['vine_fruit', 'herb_blood'] };
const GREED = { ren: 0.5, mo: 0.65, xian: 0.3, yao: 0.4 };
const CAUTION = { ren: 0.6, mo: 0.2, xian: 0.9, yao: 0.5 };

function initTraits(p) {
  if (p.health == null) p.health = 100;
  if (p.greed == null) p.greed = clamp(GREED[p.faction] + rnd(-0.2, 0.2), 0.05, 0.95);
  if (p.integrity == null) p.integrity = 0.3;
  if (p.caution == null) p.caution = clamp(CAUTION[p.faction] + rnd(-0.15, 0.15), 0, 1);
  if (p.wish === undefined) p.wish = WISHES[p.title] && Math.random() < 0.65 ? pick(WISHES[p.title]) : null;
  if (p.secret === undefined) p.secret = rollSecret(p);
  if (p.eye == null) { const t = SAME_TITLE[p.title] || p.title; p.eye = EYES[t] != null ? EYES[t] : p.official ? 2 : 1; }
}

// 战事改变人们想要的东西
function rerollWarWishes() {
  const st = S.world.stage;
  for (const p of Object.values(S.people)) {
    if (p.story || p.official || p.status !== 'alive') continue;
    const pool = st >= 2 && WAR_WISHES[p.faction] && (p.faction !== 'ren' || st >= 3) ? WAR_WISHES[p.faction] : null;
    if (pool && Math.random() < 0.5) p.wish = pick(pool);
  }
}

// 陈列柜里摆着他想要的东西，消息会传到他耳朵里
function wishShown(p) { return !!p.wish && itemsIn('display').some(it => it.id === p.wish); }

// 来不来：好感与记忆、瘾、所求、对铺子名声的顾虑、处境、时令与战事
function visitScore(p) {
  if (p.status !== 'alive' || p.lastDay >= S.day) return 0;
  let s = 1 + Math.min(3, p.visits * 0.25);
  s *= clamp(1 + p.aff / 80, 0.25, 2.2);
  if (p.addict) s *= 1 + p.addict * 0.6 * (S.day - (p.lastFix || 0) > 2 ? 2 : 1);
  if (wishShown(p)) s *= 2.2;
  s *= 1 - clamp(S.heat / 100 * p.caution, 0, 0.7);
  s *= trafficMul(p.faction);
  if (p.desperate) s *= 1.6;
  if (p.controlled) s *= 1.3;
  return s;
}

function choosePerson() {
  const queued = new Set(S.queue.map(c => c.pid));
  const regs = Object.values(S.people).filter(p => (!p.story || castRegular(p)) && !p.official && p.status === 'alive' && !queued.has(p.pid));
  const opts = regs.map(p => [p, visitScore(p)]).filter(x => x[1] > 0);
  const total = opts.reduce((s, x) => s + x[1], 0);
  const newW = 2.5 + Math.max(0, 8 - regs.length) * 0.6;
  if (!opts.length || Math.random() < newW / (newW + total)) return newPerson(weighted(factionWeights()));
  return weighted(opts);
}

// 这回来干什么：成瘾的来讨药，走投无路的来当东西，听说有想要的就来买
function decideKind(p) {
  if (p.addict && Math.random() < 0.65) return 'crave';
  if (p.desperate && isWeak(p) && !p.indentured && Math.random() < 0.35) return 'plea';
  if (p.desperate) return Math.random() < 0.7 ? 'sell' : 'buy';
  if (wishShown(p) && Math.random() < 0.75) return 'wish';
  if (p.wantsFakes && Math.random() < 0.4) return 'wantfake';
  // 仙门弟子见多识广，可买去送礼的东西不必是真的——够像就行，图个便宜
  if (p.faction === 'xian' && Math.random() < 0.18) return 'giftfake';
  const r = Math.random();
  if (p.budgetMul > 1.3) return r < 0.25 ? 'sell' : r < 0.9 ? 'buy' : 'appraise';
  return r < 0.45 ? 'sell' : r < 0.86 ? 'buy' : 'appraise';
}

const isAddictive = it => it.id === 'wangyou' || it.laced === 'addict';

// 价格里属于“人”的那部分：所求、瘾、处境
function personPriceRows(c, it) {
  const p = personOf(c), rows = [];
  if (!p) return rows;
  if (c.wishId === it.id) rows.push(['바로 그가 원하던 것', '+60%']);
  if (c.noble) rows.push(['권귀의 보디가드', `+${10 + 12 * (c.flatter || 0)}%`]);
  if (c.craving && isAddictive(it)) rows.push(['중독이 올라온다', `+${p.addict * 40}%`]);
  const cure = cureFor(c, it);
  if (cure) rows.push([`급히 ${cure === 'injured' ? '상처를 치료' : cure === 'poisoned' ? '해독' : '심마를 진정'}하려 한다`, `+${Math.round(CURE_MUL * 100) * cureSev(c, cure)}%`]);
  if (p.aff) rows.push(['호감', `${p.aff > 0 ? '+' : ''}${Math.round(p.aff / 5)}%`]);
  return rows;
}

const CURE_MUL = 0.2;   // 救命的药：每重伤病多出两成

function personValueMul(c, it) {
  const p = personOf(c);
  let k = 1;
  if (c.wishId === it.id) k *= 1.6;
  if (p && c.craving && isAddictive(it)) k *= 1 + 0.4 * p.addict;
  // 带着伤、中着毒的人，救命的药肯多出钱：伤病越重出得越多
  const cure = cureFor(c, it);
  if (cure) k *= 1 + CURE_MUL * cureSev(c, cure);
  if (c.noble) k *= 1.1 + 0.12 * (c.flatter || 0);
  if (it.id === 'intel') k *= intelMul(c, it);
  return k;
}

// ───────────── 加料 ─────────────

const LACE = {
  addict:  { name: '망우산', verb: '망우산을 섞었다', act: '망우산 섞기', detect: 0.35, desc: '복용자가 중독된다. 점점 자주 오고, 점점 돈을 잘 내고, 점점 허약해지고 가난해지다가 기름이 다하고 등불이 꺼질 때까지.' },
  control: { name: '고충',   verb: '고충을 숨겼다', act: '고충 숨기기',   detect: 0.5,  desc: '먹은 사람이 고에 걸린다. 네 지시를 따르고, 거역하면 고가 심장을 갉아먹어 중상(목숨은 건진다). 고를 기르는 사람만 섞을 수 있다. 먹는 사람의 수련이 네 고보다 높거나 이미 고가 있으면 고가 자리 잡지 못한다. 고가 독할수록 알아채기 어렵다.' },
  love:    { name: '정고',   verb: '정고를 숨겼다', act: '정고 숨기기',   detect: 0.2,  desc: '성인 여자만 인정한다. 그녀가 먹으면 호감이 최고치로 고정되고 모든 일이 네 뜻대로 된다. 그녀가 죽으면 너도 살 수 없으며, 일생에 한 사람만 인정한다. 남자나 아이가 먹으면 고가 인정하지 않아 헛되이 죽는다.' },
  tonic:   { name: '혈영지', verb: '혈영지를 추가했다', act: '혈영지 추가하기', detect: 0,    desc: '확실한 보양: 기혈이 크게 보강되고 경지 돌파가 쉬워진다. 상대가 너를 고마워한다.' },
  poison:  { name: '시독',   verb: '시독을 넣었다', act: '시독 넣기',   detect: 0.4,  desc: '복용자가 며칠 내로 급사한다. 친족이 의심하면 끝까지 추적한다.' },
};
// 能掺料的：服得下、对人有好处的吃食与药——补气力、涨修为、治伤毒的丹药、灵饮、灵果、草药、妖材入药都算；
// 吞魂饮血的魂魄精血妖丹（不是丹药的）、点的香、本身就是料的（蛊虫也是料）、废料不算。货品册写 to.lace 的另补进 LACEABLE。
// 料要吃下去才发作：买去、收下的人揣回去，自己吃了或转送别人，谁吃谁中（见 eatStash）
const LACEABLE = [];
const LACE_CATS = ['dan', 'yin', 'zhi', 'cai', 'yao'];
const isLaceable = id => LACEABLE.includes(id) || (LACE_CATS.includes(ITEMS[id].cat) && !ITEMS[id].additive && !JUNK.includes(id)
  && !!(RESTORE[id] || CULT_XP[id] || id === 'water' || Object.values(CONDS).some(c => c.cure.includes(id)))
  && !(CULT_XP[id] && CULT_XP[id][1] && ITEMS[id].cat !== 'dan'));

// 赝品、以次充好的照样掺得进去：看的是这一样东西能不能吃，不看真假
const canLace = it => isLaceable(it.id) && !it.laced;

// 市面上偶尔混着别人掺过料的货：成瘾的多，下毒、种蛊的少；chance 是这件货被掺过的机会
function marketLace(id, extra, chance) {
  if (!isLaceable(id) || Math.random() >= chance) return extra;
  extra.laced = weighted([['addict', 6], ['poison', 1.5], ['control', 1]]);
  extra.laceGrade = rint(1, 3);
  if (extra.laced === 'control') extra.laceTox = rint(10, 45);
  return extra;
}
const additives = () => Object.values(S.items).filter(it => HELD(it) && ITEMS[it.id].additive);

// 掺了料的货：自己掺的、或验出来了的才算知道；市面上也有别人掺好了的，外表看不出来
const lacedKnown = it => !!it.laced && (it.lacedBy === 'me' || !!it.lacedSeen);
// 掺料的手法：钻研识破的掺料货、或打听到偏门门道才学得会；学会了手脚更干净
const laceSkill = kind => !!(S.laceKnown && S.laceKnown[kind]);

// 能不能把这味料掺进这件货：能返回 null，否则返回缘由；蛊只有养蛊人掺得进去
function laceBlock(target, add) {
  if (!canLace(target)) return `${itemName(target)}에는 섞을 수 없다`;
  return isGuLace(ITEMS[add.id].additive) ? guLaceBlock(add) : null;
}

function laceWith(target, add) {
  const why = laceBlock(target, add);
  if (why) return why;
  target.laced = ITEMS[add.id].additive;
  target.lacedBy = 'me';
  if (target.laced === 'tonic') target.laceQ = add.q;
  // 成蛊比幼蛊难察觉，进化过的更难；吃下去中的是哪一等蛊，也记在货上
  if (add.id === 'gu') { target.laceTox = add.tox + [0, 40, 55, 70][guStage(add)]; target.laceStage = guStage(add); }
  destroyItem(add);
  tally('cruel');
  log(`네가 ${itemName(target)}에 ${LACE[target.laced].verb}.`, 'warn');
  return null;
}

function laceDetectChance(p, it) {
  const L = LACE[it.laced];
  if (!L || !L.detect) return 0;
  const tox = it.laced === 'control' ? 1 - Math.min(0.7, (it.laceTox || 0) / 200) : 1;
  // 你亲手掺的：学过手法的干净，生手的粗糙
  const hand = it.lacedBy === 'me' ? (laceSkill(it.laced) ? 0.6 : 1.4) : 1;
  return clamp(L.detect * (0.4 + (p ? p.savvy : 0.4)) * tox * hand * (1 - clamp(p ? p.aff : 0, 0, 80) / 160), 0.02, 0.9) * (1 - guShield(p));
}

// 货到了对方手里（买去或收礼）：当面识破就摔回来；没识破的揣回去，吃下去才发作。
// pass：买来送人的，转手就送出去，吃的是别人。返回 { caught }
function applyLace(p, it, via, pass = false) {
  if (!p) return {};
  const name = itemName(it);
  if (it.id === 'wangyou') return hook(p, name);
  // 蛊是拿来掺进吃食的，不是拿来吃的：买去、收下一只蛊，身上什么也不会多
  if (!it.laced || ITEMS[it.id].cat === 'gu') return {};
  // 明知掺了料还卖、还送，才算你作的恶；不知情的，只是替别人背了锅
  const knew = lacedKnown(it);
  if (Math.random() < laceDetectChance(p, it)) {
    remember(p, `네가 ${via === 'gift' ? '준' : '판'} ${name}에 ${LACE[it.laced].verb}.`, -45, 'poisoned');
    adjustRep(p.faction, -6); addHeat(8);
    startScandal(p, 'laced', { item: name, lace: it.laced });
    return { caught: true };
  }
  const { laced, lacedBy, laceQ, laceTox, laceStage } = it;
  (p.stash = p.stash || []).push({ id: it.id, name, laced, lacedBy, laceQ, laceTox, laceStage, knew, pass, day: S.day });
  return {};
}

// 揣回去的吃食：多半自己吃了，也可能转送给同族的人（买来送人的一定送出去）——谁吃下去，料就在谁身上发作。
// 放了五天的总要吃掉
function eatStash(p) {
  const out = [];
  p.stash = (p.stash || []).filter(x => {
    const r = Math.random();
    const give = x.pass || r < 0.15, eat = give || r < 0.75 || S.day - x.day >= 5;
    if (!eat) return true;
    const other = give && pick(Object.values(S.people).filter(t => t !== p && t.status === 'alive' && t.faction === p.faction))
      || give && pick(Object.values(S.people).filter(t => t !== p && t.status === 'alive'));
    const eater = other || p;
    const r2 = laceEffect(eater, x, x.name, x.knew);
    // 你亲手掺的才知道下落：转了手的告诉你吃的是谁
    if (x.lacedBy === 'me' && eater !== p) out.push({ text: `${p.name}이(가) ${x.name}을(를) ${eater.name}에게 건네줬고, ${eater.name}이(가) 먹어치웠다.${r2.text ? `\n${r2.text}` : ''}`, cls: r2.cls || 'warn' });
    else if (r2.text) out.push({ text: r2.text, cls: r2.cls });
    return false;
  });
  return out;
}

// 料入了体之后的效果
function laceEffect(p, it, name, knew) {
  if (LACE[it.laced].apply) return LACE[it.laced].apply(p, it, name, knew) || {};
  switch (it.laced) {
    case 'addict': return hook(p, name, knew);
    case 'control': case 'love': return guTakes(p, it, name, knew);
    case 'tonic':
      // 补多少看那株血灵芝的品质
      p.health = Math.min(130, (p.health || 100) + Math.round(25 * potency({ id: 'herb_blood', q: it.laceQ != null ? it.laceQ : 60 })));
      p.boost = { id: 'pill_qi', fake: false, q: it.laceQ != null ? clamp(it.laceQ + 20, 5, 100) : 80, day: S.day };
      remember(p, `네가 ${name}에 혈영지를 넣었다. 그의 기혈이 크게 보강된다.`, 10, 'pillHelped');
      return {};
    case 'poison':
      p.health = (p.health || 100) - 85;
      p.poisonedDay = S.day;
      remember(p, `네가 ${name}에 시독을 넣었다.`, 0);
      if (knew) commitSin('harm', { p, w: 3, what: `${p.name}에게 시독을 넣는다`, virtue: 9 });
      return {};
  }
  return {};
}

function hook(p, name, knew = true) {
  // 学过手法的，下得更重
  p.addict = Math.min(5, (p.addict || 0) + (knew && laceSkill('addict') ? 2 : 1));
  p.health = (p.health || 100) - 6;
  p.lastFix = S.day;
  if (knew) commitSin('harm', { p, w: 1, what: `${p.name}에게 망우산을 먹인다`, virtue: 3 });
  remember(p, `네 ${name}을(를) 먹고 황홀해졌다.`, 6, 'hooked');
  return {};
}

// ───────────── 送礼 ─────────────

// 这件东西对他值多少：所求、喜好、瘾
function giftValue(p, it) {
  const wants = BUY_WANTS[p.faction] || {}, maxW = Math.max(...Object.values(wants), 1);
  let v = knownValue(it) * priceMul(it.id) * (0.6 + 0.8 * (wants[ITEMS[it.id].cat] || 0) / maxW);
  if (p.wish === it.id) v *= 2.5;
  if (p.addict && isAddictive(it)) v *= 3;
  return Math.round(v);
}

function giftAff(p, value) {
  return clamp(Math.round(value / (15 + 35 * p.budgetMul) * (0.6 + p.greed)), 1, 35);
}

const canGift = p => p.status === 'alive' && p.giftedDay !== S.day && (p.visits || p.mem.length);

function giveGift(p, it) {
  const name = itemName(it), v = giftValue(p, it);
  let gain = giftAff(p, v);
  const wish = p.wish === it.id;
  if (wish) { gain += 10; p.wish = null; }
  p.giftedDay = S.day;
  remember(p, `네가 그에게 ${name}을(를) 줬다${wish ? ' - 바로 그가 원하던 것' : ''}.`, gain, wish ? 'helped' : null);
  if (['pill_qi', 'pill_blood', 'pill_found'].includes(it.id)) p.boost = { id: it.id, fake: !!it.fake, q: it.q, day: S.day };
  npcCure(p, it);
  if (p.addict && it.id === 'wangyou') p.lastFix = S.day;
  const res = applyLace(p, it, 'gift');
  destroyItem(it);
  storyGiftHook(p, it, res);
  return { gain, ...res };
}

function giveStones(p, n) {
  spend(n, `${p.name}에게 ${n} 영석을 줬다.`);
  p.giftedDay = S.day;
  const gain = clamp(Math.round(n / (10 + 40 * p.budgetMul) * (0.4 + p.greed)), 1, 40);
  remember(p, `네가 그에게 ${n} 영석을 줬다.`, gain, 'bribed');
  return gain;
}

// 送礼对故事人物的额外影响
function storyGiftHook(p, it, res) {
  castEvent(p, 'gift', it, res);
  if (res.caught) return;
  if (p.pid === 'thug' && S.story.thug && !S.story.thug.done && p.aff >= 40 && !S.story.thug.flags.ally) {
    S.story.thug.node = 'ally'; S.story.thug.due = S.day + 1;
  }
}

// ───────────── 控心：让人听话的几种法子 ─────────────

// 灵石之外，药瘾、利益、修为、魂魄都能拴住一个人；拴得越死，越听话，代价各不相同
// odds：差遣成算；pay：差遣前付出的代价（返回错误则不能用）；cut：上贡时他交几成；fail：不听话的后果
const LEVERS = {
  // 亲手下的蛊：不从就蛊噬其心，重伤——要不了命，也不会被逼出来
  gu: { name: '고', has: p => guBound(p), odds: p => clamp(0.55 + 0.1 * p.controlled.stage + 0.06 * guLv(), 0, 0.97), cut: 1, note: () => '거역하면 고가 심장을 갉아먹는다: 중상, 목숨은 건진다',
    fail: p => guBite(p) },
  love: { name: '정고', has: p => !!p.loveGu, odds: () => 1, cut: 1, note: p => `${ta(p)}이(가) 너를 위해 무엇이든 하겠다` },
  bond: { name: '혼인', has: p => !!p.soulBound, odds: () => 0.95, cut: 1, note: () => '식해 속의 인장은 거역하기 어렵다',
    fail: p => { p.soulBound = null; remember(p, '혼인이 느슨해져 그가 잠시 정신을 차리고 모든 것을 기억해냈다.', -50, 'controlled'); return `${p.name}이(가) 머리를 움켜쥐고 비명을 질렀다. 혼인이 깨졌다.`; } },
  drug: { name: '약물 중독', has: p => (p.addict || 0) >= 2, odds: p => clamp(0.45 + 0.1 * p.addict, 0, 0.95), cut: 0.7, note: () => '망우산 한 첩으로 그를 붙잡아둔다',
    pay: p => { const d = ownItem(isAddictive); if (!d) return '손에 망우산(또는 그것을 섞은 물건)이 없다'; hook(p, itemName(d)); destroyItem(d); return null; },
    fail: p => `${p.name}이(가) 약을 낚아채 한입에 삼키고, 눈을 뒤집으며 바닥에 쓰러졌다. 아무것도 이루지 못했다.` },
  dao: { name: '수련 위압', has: p => killable(p) && cultGap(p) >= 1, odds: p => clamp(0.35 + 0.2 * cultGap(p), 0, 0.92), cut: 0.9, note: () => '정신이 소모되고 호감이 떨어진다',
    pay: p => { const err = exert('command', 2); if (err) return err; remember(p, '네가 수련으로 눌러 일을 시켰다.', -6); return null; },
    fail: p => { grievance(p, 40, '네가 수련을 믿고 괴롭혔다'); return `${p.name}이(가) 이를 악물고 네 위압을 버텨냈다: \"두고 보자.\"`; } },
  gain: { name: '이익', has: p => p.aff >= 40 || !!p.owes, odds: p => clamp(0.4 + p.aff / 200 + (p.owes ? 0.2 : 0), 0, 0.9), cut: 0.5, note: p => `그에게 이익을 나눠줘라, 약 ${gainCost(p)} 영석`,
    pay: p => { const n = gainCost(p); if (S.stones < n) return '그에게 나눠줄 영석이 부족하다'; spend(n, `${p.name}에게 ${n} 영석의 이익을 나눠줬다.`); return null; },
    fail: p => { remember(p, '네가 시킨 일을 그는 관여하고 싶지 않아 했다.', -3); return `${p.name}이(가) 이득을 받았지만 고개를 저었다: \"이 일은 내가 처리할 수 없다.\"`; } },
  dirt: { name: '약점', has: p => !!(p.secret && p.secret.known), odds: p => clamp(overpowerOdds(p) + 0.15, 0, 0.9), cut: 0.8, note: () => '호감을 잃고, 몰리면 반격한다',
    pay: p => { remember(p, `네가 그의 ${p.secret.type} 신분으로 그에게 일을 시켰다.`, -10, 'blackmailed'); return null; },
    fail: p => `${p.name}이(가) 차갑게 너를 보았다: \"고하든지 말든지.\" - ${retaliate(p, 50)}` },
};

const gainCost = p => Math.round((30 + npcPower(p) * 1.5) / 5) * 5;

const COMMANDS = {
  tribute: { label: '상납', cd: 5, run: (p, L) => {
    const n = Math.round(rint(40, 80) * p.budgetMul * (p.faction === 'xian' ? 2 : p.faction === 'mo' ? 1.4 : 1) * L.cut);
    earn(n, `${p.name}이(가) ${n} 영석을 \"효심\"으로 보내왔다.`);
    return `${p.name}이(가) ${n} 영석을 네 카운터에 올려놓았다.`;
  } },
  spy: { label: '집법당을 주시한다', cd: 7, run: p => {
    S.flags.spyUntil = S.day + 7; S.flags.spyBy = p.pid;
    addHeat(-5);
    return `${p.name}이(가) 집법당에 너의 눈을 심어뒀다. 앞으로 7일간 순찰 전날 밤에 풍문이 새어나온다.`;
  } },
  scout: { label: '정보 캐내기', cd: 4, run: p => {
    const target = pick(Object.values(S.people).filter(t => t !== p && t.status === 'alive' && t.secret && !t.secret.known));
    const kind = weighted([['market', 4], ['clique', p.faction === 'mo' ? 3 : 1], ['secret', target ? 3 : 0], ['treasure', 2]]);
    if (kind === 'secret') target.secret.known = true;
    const it = makeIntel(kind, { p: target });
    return it ? `${p.name}이(가) ${itemName(it)} 하나를 알아냈다.` : `${p.name}이(가) 무언가 캐냈지만, 네 창고에는 종이 한 장 놓을 자리도 없다.`;
  } },
  special: { label: null, cd: 999, run: p => SPECIAL_COMMANDS[p.pid].run(p) },
};

const SPECIAL_COMMANDS = {
  qian: { label: '그에게 한 기의 임대료를 면하게 하라', run: () => { S.flags.rentWaive = true; return '전 집사가 장부에 한 획을 그었다: \\"이번 기는... 받지 않겠다.\\"'; } },
  sun: { label: '그녀에게 너에 대한 순찰을 느슨하게 하라', run: () => { S.flags.inspectMul *= 0.6; return '손 관리가 네 가게를 순찰 명부에서 절반 지웠다.'; } },
  enforcer: { label: '그에게 앞으로 네 가게를 통과시키게 하라', run: () => { S.flags.enforcerOwned = true; return '려한이 고개를 끄덕였다: \\"네 가게는 앞으로 내가 직접 조사하겠다.\\"'; } },
  collector: { label: '그녀에게 네 물건을 더 이상 징발하지 않게 하라', run: () => { S.flags.noRequisition = true; return '사도홍초가 네 이름을 징발부에서 지웠다.'; } },
  thug: { label: '그에게 너를 대신해 밤을 지키게 하라', run: () => { S.flags.guard = true; return '류라자의 형제들이 밤에 네 가게 문 앞에서 졸기 시작했다.'; } },
  fox: { label: '그녀에게 너를 대신해 요족을 모집하게 하라', run: () => { S.flags.foxBlessing = true; return '요족 손님이 점점 늘어났다.'; } },
  amu: { label: '그에게 순찰을 누르게 하라', run: () => { S.flags.inspectMul *= 0.7; return '아목이 집법당에서 너를 위해 몇 마디 변호했다.'; } },
};

const leversOf = p => p.status === 'alive' ? Object.keys(LEVERS).filter(k => LEVERS[k].has(p)) : [];

// 只有蛊、情蛊与魂印拴得住的人，才肯替你办那件“方便”
function commandList(p, lever) {
  const list = ['tribute', 'spy', 'scout'];
  if (SPECIAL_COMMANDS[p.pid] && ['soul', 'bond', 'gu', 'love'].includes(lever)) list.push('special');
  return list.map(id => {
    const c = COMMANDS[id];
    const last = (p.ctrlUsed || {})[id];
    const ready = last == null || S.day - last >= c.cd;
    return { id, label: id === 'special' ? SPECIAL_COMMANDS[p.pid].label : c.label, ready, why: ready ? null : id === 'special' ? '사용 완료' : `${c.cd - (S.day - last)}일 후` };
  });
}


function runCommand(p, id, lever = 'soul') {
  const L = LEVERS[lever];
  if (!L.has(p)) return { text: '그를 묶어둘 수 없다.', exposed: true };
  const err = L.pay && L.pay(p);
  if (err) return { text: err, exposed: true };
  p.ctrlUsed = p.ctrlUsed || {};
  p.ctrlUsed[id] = S.day;
  p.ctrlUses = (p.ctrlUses || 0) + 1;
  if (Math.random() >= L.odds(p)) return { exposed: true, text: L.fail(p) };
  return { text: COMMANDS[id].run(p, L) };
}

function exposeControl(p) {
  const gu = GU_STAGES[p.controlled.stage || 0].name;
  p.controlled = null;
  remember(p, `${ta(p)} 몸속의 ${gu}이(가) 빠져나왔다. ${ta(p)}이(가) 네가 고를 심은 줄 알았다.`, -80, 'controlled');
  adjustRep(p.faction, -12); addHeat(20);
  startScandal(p, 'control');
}

function releaseControl(p) { remember(p, `네가 조용히 ${ta(p)} 몸속의 ${GU_STAGES[p.controlled.stage || 0].name}을(를) 풀었다.`, 0); p.controlled = null; }

// ───────────── 每夜：瘾、毒、蛊 ─────────────

function intrigueTick() {
  const news = [];
  for (const p of Object.values(S.people)) {
    if (p.status !== 'alive') continue;
    initTraits(p);
    news.push(...eatStash(p));
    if (p.addict) {
      p.health -= 2 * p.addict;
      if (S.day - (p.lastFix || 0) > 3) {
        p.budgetMul = Math.max(0.2, p.budgetMul * 0.97);
        if (Math.random() < 0.04) {
          addHeat(10);
          news.push({ text: `${p.name}이(가) 망우산 흡입으로 집법당에 잡혔는데, 물건의 출처를 불었다는 소문이 돌았다.`, cls: 'bad' });
          p.status = 'jailed'; lifeNote(p, '망우산 흡입으로 집법당에 체포됐다.');
          continue;
        }
      }
      // 断了货熬过十天，此后每五天退一重瘾
      const dry = S.day - (p.lastFix || 0);
      if (dry >= 10 && dry % 5 === 0) {
        p.addict--;
        lifeNote(p, p.addict ? '한동안 금단을 견뎌 중독이 좀 가벼워졌다.' : '금단을 견뎌내 망우산 중독이 끊겼다.');
      }
    }
    if (p.health <= 0) {
      // 尸毒、忘忧散是你的货；毒入心脉另有来由（擂台前那碗汤当场已判过识破与否），不另起事端
      const poisoned = p.poisonedDay && S.day - p.poisonedDay <= 5, addicted = !poisoned && !condSev(p, 'poisoned') && p.addict > 0;
      die(p, poisoned ? `${p.name}이(가) 갑자기 칠규혈을 흘리며 집에서 급사했다.` : addicted ? `${p.name}에게 중독이 뼛속까지 배어, 해골처럼 마른 채 숨을 거뒀다.` : `${p.name}에게 독이 심맥으로 퍼져, 버티지 못했다.`);
      news.push({ text: p.life[p.life.length - 1].t, cls: 'bad' });
      if ((poisoned || addicted) && Math.random() < (poisoned ? 0.5 : 0.35)) startScandal(p, poisoned ? 'poison' : 'addictdeath');
      continue;
    }
    if (!p.addict && p.health < 100) p.health = Math.min(100, p.health + 2);
    if (guBound(p) && Math.random() < (0.004 + p.savvy * 0.008) * (1 - 0.2 * guLv())) {
      exposeControl(p);
      news.push({ text: `${p.name} 몸속의 고를 한 유방 고인이 몰아냈다.`, cls: 'bad' });
    }
    p.desperate = p.budgetMul < 0.55 || p.health < 40 || (!!p.addict && S.day - (p.lastFix || 0) > 3);
  }
  return news;
}

// 人死了：故事随之改变
function die(p, text) {
  p.status = 'dead';
  lifeNote(p, text);
  castEvent(p, 'death');
  const st = p.story && S.story[p.story];
  if (st && !st.done) { st.done = true; st.summary = `${p.name}이(가) 죽었다.`; }
  if (p.pid === 'thug') S.flags.guard = false;
  if (p.pid === 'qian' && S.flags.landlord === 'qian') { S.flags.landlord = 'sun'; S.flags.rentMul = 0.9; S.flags.rentExtra = 0; ensureSun(); }
  if (p.pid === 'sun' && S.flags.landlord === 'sun') S.flags.landlord = S.people.qian && S.people.qian.status === 'alive' ? 'qian' : 'tu';
  if (p.pid === 'enforcer') S.flags.enforcerOwned = false;
  loveBondCheck();
}

function ensureSun() {
  if (!S.people.sun) newPerson('mo', { pid: 'sun', name: '손 관리', portrait: 'steward_sun', title: '잡역 구역 부관리', savvy: 0.8, story: 'stewards',
    bio: '종문이 파견한 부관리. 머리빗 한 올도 흐트러지지 않고, 장부 계산은 누구보다 정확하다. 그녀가 가장 미워하는 게 탐관오리라는 소문이다.' });
  if (!S.people.sun.tuned) Object.assign(S.people.sun, { greed: 0.15, integrity: 0.85, tuned: true });
}

// ───────────── 官差与打点 ─────────────

const OFFICIALS = {
  enforcer: { name: '려한', faction: 'mo', portrait: 'mo_enforcer', title: '집법당 순찰', greed: 0.55, integrity: 0.35, savvy: 0.6,
    bio: '집법당의 노련한 순찰. 철면 뒤에는 주판알 같은 눈이 있다. 규칙도 잘 알고, 규칙의 값도 잘 안다.' },
  collector: { name: '사도홍초', faction: 'mo', portrait: 'mo_senior', title: '종문 징발사', greed: 0.7, integrity: 0.25, savvy: 0.65,
    bio: '내문 출신의 징발사로, 종문을 위해 전비를 거두고 자신을 위해서도 이득을 챙긴다.' },
};

function official(pid) {
  if (pid === 'enforcer' && S.flags.enforcerPid && S.people[S.flags.enforcerPid]) return S.people[S.flags.enforcerPid];
  if (!S.people[pid]) {
    const o = OFFICIALS[pid];
    const p = newPerson(o.faction, Object.assign({ pid, story: 'official' }, o));
    Object.assign(p, { official: true, greed: o.greed, integrity: o.integrity });
  }
  return S.people[pid];
}

// 他心里的价码：规矩越硬、风险越大，价码越高；越贪、越熟、收得越惯，越好说话
function bribePrice(p, stake) {
  initTraits(p);
  const risk = warStage().inspect * (1 - playerPower() / 300);   // 你势大，他也得给几分面子
  const trust = 1 - clamp(p.aff, -60, 80) / 200;
  const habit = 1 - Math.min(0.3, (p.bribes || 0) * 0.05);
  return Math.max(10, Math.round((stake * (0.3 + p.integrity * 0.9) + 20 + 120 * p.integrity) * risk * trust * habit / (0.55 + p.greed) / 5) * 5);
}

function bribeOdds(p, stake, offer) {
  if (p.controlled) return 1;
  const price = bribePrice(p, stake);
  let o = 1 / (1 + Math.exp(-(offer / price - 1) * 4.5));
  if (p.integrity > 0.7 && offer < price * 1.8) o *= 0.6;   // 清官：要么给足，要么别碰
  return clamp(o, 0.02, 0.98);
}

function tryBribe(p, stake, offer, what = '') {
  const ok = Math.random() < bribeOdds(p, stake, offer);
  if (ok) {
    spend(offer, `${p.name}에게 뇌물 ${offer} 영석${what ? `, ${what}` : ''}.`);
    p.bribes = (p.bribes || 0) + 1;
    remember(p, `네 ${offer} 영석의 이득을 받았다.`, Math.min(12, Math.round(offer / Math.max(20, stake) * 8) + 2), 'bribed');
  } else {
    remember(p, `네가 ${offer} 영석으로 그를 매수하려 했지만 거절당했다.`, -8, 'insulted');
    addHeat(6 + Math.round(p.integrity * 10));
  }
  return ok;
}

// 三档打点的选项
function bribeChoices(p, stake, onResult, what) {
  const price = bribePrice(p, stake);
  const tiers = [...new Set([0.6, 1, 1.6].map(k => Math.max(10, Math.round(price * k / 10) * 10)))];
  return tiers.map(n => ({
    label: `뇌물 ${n} 영석`, hint: `성공 확률 ${Math.round(bribeOdds(p, stake, n) * 100)}%. 실패 시 집법당 주목 상승`, req: needStones(n),
    run: (st, sp) => onResult(n, tryBribe(p, stake, n, what), st, sp),
  }));
}

// 巡查时他能抄到多少：被他看见的禁物、禁药、赃物
function inspectionStake() {
  let s = 30 + S.heat;
  for (const it of Object.values(S.items)) {
    if (!HELD(it) || it.pos.g === 'hidden') continue;
    const shown = it.pos.g === 'display';
    const d = ITEMS[it.id];
    if (d.contra || d.illicit) s += claimedValue(it) * (shown ? 0.5 : 0.25);
    else if (it.stolen > 0) s += claimedValue(it) * (shown ? 0.16 : 0.07);
  }
  return Math.round(s);
}

function startOfficial(kind, delay) {
  if (kind === 'requisition' && S.flags.noRequisition) return;
  startStory(`off_${kind}_${S.day}`, 'official', kind, delay);
}

// 征调目标：看得见的战备物资，按价值取前三
function requisitionTargets() {
  return Object.values(S.items).filter(it => HELD(it) && it.pos.g !== 'hidden' && (ITEMS[it.id].war || 0) >= 0.5)
    .sort((a, b) => claimedValue(b) * priceMul(b.id) - claimedValue(a) * priceMul(a.id)).slice(0, 3);
}

function landlordPerson() {
  if (S.flags.landlord === 'sun') { ensureSun(); return S.people.sun; }
  if (S.flags.landlord === 'tu') {
    if (!S.people.tu) {
      newPerson('mo', { pid: 'tu', name: '도 관리', portrait: 'mo_disciple', title: '잡역 구역 관리', story: 'official',
        bio: '전임 관리 사후 종문이 파견한 새 관리. 탐욕스럽고 숨기지도 않는다.' });
      Object.assign(S.people.tu, { official: true, greed: 0.85, integrity: 0.15 });
    }
    return S.people.tu;
  }
  const q = S.people.qian;
  if (q && !q.tuned) Object.assign(q, { greed: 0.9, integrity: 0.1, tuned: true });
  return q;
}

// ───────────── 官差与事发：故事模板 ─────────────

Object.assign(STORIES, {
  official: {
    nodes: {
      requisition: {
        when: 'day',
        who: () => { const p = official('collector'); return { name: p.name, portrait: p.portrait, title: p.title, faction: 'mo', pid: p.pid }; },
        text: () => {
          const t = requisitionTargets();
          return t.length
            ? `붉은 옷의 여수사가 집법 제자 둘을 데리고 문을 넘어 들어와 황색 비단을 펼쳤다: \"종문 징발 명령이다.\"\n그녀의 눈이 네 진열대를 스쳤다: \"${t.map(itemName).join('·')} - 이 몇 가지는 종문이 가져간다.\"\n\"물론이지,\" 그녀가 여유롭게 비단을 말며 말했다, \"규칙은 죽었어도 사람은 살아있으니까.\"`
            : '붉은 옷의 여수사가 집법 제자 둘을 데리고 문을 넘어 들어와 사방을 둘러보며 입술을 깨물었다: \\"가난한 가게라, 건질 게 없네.\\"\\n\\"그래도 말이야, 우리 자매가 이 일을 왔으니 수고비는 받아야겠지. 삼십 영석.\\"';
        },
        choices: () => {
          const p = official('collector'), t = requisitionTargets();
          if (!t.length) return [
            { label: '삼십 영석을 준다', hint: costHint(30), req: needStones(30), run: () => { spend(30, '징발사에게 수고비를 줬다.'); remember(p, '수고비를 줬다.', 3); return { text: '\\"사정은 아는구나.\\" 그녀가 영석을 챙기고 떠났다.', end: true }; } },
            { label: '주지 않는다', hint: '그녀가 기억할 것이다', run: () => { remember(p, '삼십 영석의 수고비도 주지 않는다.', -10); addHeat(3); return { text: '그녀가 냉소했다: \\"좋아, 기억해두지.\\"', end: true }; } },
          ];
          const stake = Math.round(t.reduce((s, it) => s + claimedValue(it) * priceMul(it.id), 0) * 0.7);
          const seize = (why) => { const names = t.map(itemName); t.forEach(takeItem); return names.join('·') + why; };
          return [
            { label: '정해진 대로 상납', hint: '이 물건들을 잃는다. 마종 평판 +4', run: () => {
              const names = seize(''); adjustRep('mo', 4); remember(p, '정해진 대로 전비를 상납했다.', 5);
              return { text: `집법 제자가 ${names}을(를) 수레에 실었다. \"종문이 네 공을 기록하겠다.\"`, end: true };
            } },
            ...bribeChoices(p, stake, (n, ok) => ok
              ? { text: '그녀가 영석을 저울질하며 황색 비단에 몇 자 적었다: \\"이 가게는 징발할 게 없다.\\"', end: true }
              : { text: `그녀가 영석을 밀어냈다: \"종문의 군수품을 무엇으로 보느냐?\" 집법 제자가 ${seize('')}을(를) 가져갔다.`, end: true }, '징발 면제'),
            { label: '진작 다 팔렸다고 거짓말한다', hint: '그녀가 반드시 믿지는 않는다', run: () => {
              if (lieCaught(p.savvy)) {
                const names = seize(''); const fine = payUpTo(Math.round(stake * 0.3), '징발사를 속인 죄로 벌금을 물렸다.'); addHeat(12);
                remember(p, '그녀 앞에서 거짓말한다.', -20, 'lied');
                return { text: `그녀가 손을 들자 집법 제자가 네 진열대에서 ${names}을(를) 꺼냈다. \"종문 징발을 속인 죄, 벌금 ${fine} 영석.\"`, end: true };
              }
              remember(p, '물건이 진작 다 팔렸다고 말한다.', -3);
              return { text: '그녀가 의심스럽게 너를 쳐다보고, 뒤에 줄 선 가게들을 보더니 손을 흔들며 떠났다.', end: true };
            } },
          ];
        },
      },
      levy: {
        when: 'day',
        who: () => { const p = official('collector'); return { name: p.name, portrait: p.portrait, title: '징세사', faction: 'mo', pid: p.pid }; },
        text: () => `징세사가 장부를 탁 내려치며 말했다: \"전시 기부금, 이번 주 ${levyAmount()} 영석${S.flags.levyDebt ? `, 네가 빚진 ${S.flags.levyDebt} 영석` : ''}.\" 그녀가 붓대로 카운터를 두드리며 말했다, \"내지 못하는 자는 적과 내통한 죄로 다스린다.\"`,
        choices: () => {
          const p = official('collector'), due = levyAmount() + (S.flags.levyDebt || 0);
          return [
            { label: `정해진 대로 납부 (${due})`, hint: costHint(due), req: needStones(due), run: () => {
              spend(due, `전시 기부금 ${due} 영석을 냈다.`); S.flags.levyDebt = 0; remember(p, '제때 전시 기부금을 냈다.', 2);
              return { text: '그녀가 장부에 한 획을 긋고 다음 가게로 갔다.', end: true };
            } },
            ...bribeChoices(p, due, (n, ok) => {
              if (ok) { S.flags.levyDebt = 0; return { text: '그녀가 영석을 소매에 넣고 장부에 \\"납부 완료\\"라고 적었다.', end: true }; }
              const paid = payUpTo(due, '뇌물이 안 통해서 정해진 전시 기부금을 냈다.'); S.flags.levyDebt = due - paid;
              return { text: '\\"나를 무슨 사람으로 보느냐?\\" 그녀가 차가운 표정으로 정해진 대로 기부금을 받았다.', end: true };
            }, '전시 기부금 탕감'),
            { label: '연체', hint: '연체료 20% 가산. 집법당 주목 +10, 마종 평판 -3', run: () => {
              S.flags.levyDebt = Math.round(due * 1.2); addHeat(10); adjustRep('mo', -3);
              remember(p, '전시 기부금을 연체했다.', -8);
              return { text: '\\"좋아, 다음엔 원금에 이자까지.\\" 그녀가 네 이름 옆에 붉은 동그라미를 그렸다.', end: true };
            } },
          ];
        },
      },
      tribute: {
        when: 'day',
        who: () => { const p = landlordPerson(); return { name: p.name, portrait: p.portrait, title: '세공을 거둔다', faction: 'mo', pid: p.pid }; },
        text: () => `${landlordName()}이 들어오며 공수했다: \"연말이라, 종문의 세공을 잡역 구역의 가게마다 ${tributeAmount()} 영석씩 거둔다.\"`,
        choices: () => {
          const p = landlordPerson(), due = tributeAmount();
          return [
            { label: `정해진 대로 납부 (${due})`, hint: costHint(due), req: needStones(due), run: () => { spend(due, `세공 ${due} 영석을 냈다.`); return { text: '새해가 다시 시작됐다.', end: true }; } },
            ...bribeChoices(p, due, (n, ok) => ok
              ? { text: '장부에 네 가게는 \\"납부 완료\\"로 적혀 있다.', end: true }
              : (payUpTo(due, '뇌물이 안 통해서 정해진 세공을 냈다.'), { text: '상대가 무표정하게 정해진 세공을 받았다.', end: true }), '세공 면제'),
          ];
        },
      },
    },
  },

  // 坏事败露：苦主上门，赔钱、打点、抵赖或威吓
  scandal: {
    nodes: {
      demand: {
        when: 'day',
        who: st => {
          const p = S.people[st.flags.pid];
          if (p.status === 'alive') return { name: p.name, portrait: p.portrait, title: '직접 찾아와 항의', faction: p.faction, pid: p.pid };
          return { name: `${p.name}의 친족`, portrait: pick(PORTRAITS[p.faction])[0], title: '직접 찾아와 항의', faction: p.faction };
        },
        text: st => {
          const p = S.people[st.flags.pid], f = st.flags;
          const lead = {
            fakepill: `\"${p.name}이(가) 네가 판 축기단을 먹었더니 ${p.status === 'dead' ? '경맥이 끊어져 죽었다' : '수련이 다 망가져 폐인이 됐다'}! 가짜 약이었다!\"`,
            laced: `\"네가 판 ${f.item}에 ${(LACE[f.lace] || {}).verb || '손을 댔다'}! 우리를 바보로 아느냐?\"`,
            addictdeath: `\"${p.name}이(가) 네 망우산을 먹고 뼈만 남아 어젯밤 숨졌다. 그의 방에서 나온 약포에 네 가게의 표시가 찍혀 있었다!\"`,
            poison: `\"${p.name}이(가) 네 곳에서 나간 것을 마시고 칠규혈을 흘리며 죽었다. 검시관이 확인했는데, 시독이었다!\"`,
            control: `\"${p.name} 몸속의 ${p.soulBound ? '혼인은 네가 심은 것' : '고는 네가 넣은 것'}이라고!\"`,
            murder: `\"${p.name}이(가) 그날 네 가게에 들어간 뒤로 나오지 못했다! 네가 밤에 난장골로 뭔가를 끌고 가는 걸 봤다는 사람이 있어!\"`,
          }[f.kind];
          return `${f.damage ? `（${f.damage}）\n` : ''}방문객이 주먹으로 카운터를 내려쳤다: ${lead}\n\"오늘 네가 납득할 설명을 내놓지 못하면, 우리는 집법당에 고하고 네 암흑 가게의 소문을 잡역 구역 전체에 퍼뜨리겠다!\"`;
        },
        choices: st => {
          const p = S.people[st.flags.pid], f = p.faction, sev = SEVERITY[st.flags.kind];
          const demand = Math.round(sev * (0.7 + (p.greed || 0.5)) / 10) * 10;
          const enf = official('enforcer');
          const list = [
            { label: `배상금 ${demand} 영석`, hint: costHint(demand), req: needStones(demand), run: () => {
              spend(demand, `${p.name}의 일로 배상금 ${demand} 영석을 물었다.`); adjustRep(f, -1);
              if (p.status === 'alive') remember(p, `네가 ${demand} 영석을 배상했다.`, 20);
              return { text: '방문객이 영석을 세어보고 표정이 누그러졌다: \\"이 일은... 여기까지.\\"', end: true };
            } },
            ...bribeChoices(enf, sev, (n, ok) => {
              if (ok) { adjustRep(f, -3); if (p.status === 'alive') remember(p, '그가 집법당에 고했지만 네가 눌러버렸다.', -10); return { text: `다음 날, ${enf.name}이(가) 직접 고소인을 집법당에서 쫓아냈다: \"선량한 사람을 모함하다니, 더 소란 피우면 가둬버리겠다.\"`, end: true }; }
              const fine = payUpTo(Math.round(sev * 0.4), '일이 발각돼 집법당이 벌금을 물렸다.'); adjustRep(f, -8); addHeat(12);
              return { text: `${enf.name}이 네 영석을 바닥에 내던지며, 고소인이 보는 앞에서 벌금 ${fine} 영석을 물렸다.`, end: true };
            }, '일을 누른다'),
            { label: '오리발', hint: '상대가 반드시 믿지는 않는다', run: () => {
              if (lieCaught(0.55)) { adjustRep(f, -10); addHeat(15); return { text: '\\"증거가 여기 있어!\\" 방문객이 물건을 카운터에 내던지고 멀리 사라졌다. 다음 날, 잡역 구역 전체가 알게 됐다.', end: true }; }
              adjustRep(f, -3);
              return { text: '방문객이 반신반의하며 욕설 몇 마디 하고 떠났다.', end: true };
            } },
          ];
          if (p.status === 'alive') list.push({ label: '세력으로 사람을 누른다', hint: `성공 확률 ${Math.round(overpowerOdds(p) * 100)}% (네 세력 ${playerPower()}, 그 ${npcPower(p)})`, run: () => {
            if (Math.random() < overpowerOdds(p)) { remember(p, '네가 세력으로 눌러버렸다.', -12, 'swallowed'); return { text: '네가 몇몇 이름을 언급하자 방문객의 얼굴이 창백해져 더 이상 말하지 못했다.', end: true }; }
            adjustRep(f, -6); addHeat(10);
            return { text: '\\"누구를 협박하느냐?\\" 방문객이 곧장 집법당으로 갔다. 일이 커졌다.', end: true };
          } });
          if (thugAlly()) list.push({ label: '류라자에게 \\"설득\\"하러 가게 한다', hint: '대부분 겁먹힐 수 있지만, 커질 수도 있다', run: () => {
            if (Math.random() < 0.7) { adjustRep('ren', -4); addHeat(3); return { text: '그날 밤, 류라자의 형제들이 고소인 집에 다녀왔다. 다음 날부터 아무도 이 일을 거론하지 않았다.', end: true }; }
            adjustRep(f, -8); addHeat(20);
            return { text: '고소인이 다리가 부러진 채 절뚝거리며 집법당에 기어 들어갔다. 일이 커졌다.', end: true };
          } });
          if (ownWeapon()) list.push({ label: '무기를 꺼내 쫓아낸다', hint: `${FACTIONS[f].name} 평판 -8, 집법당 주목 +5`, run: () => {
            adjustRep(f, -8); addHeat(5);
            return { text: '네가 무기를 꺼내자 방문객이 원망스럽게 물러났다. 하지만 이 원한은 맺어졌다.', end: true };
          } });
          return list;
        },
      },
    },
  },
});

const SEVERITY = { fakepill: 300, laced: 160, addictdeath: 420, poison: 520, control: 450, murder: 600 };

// 苦主也见风使舵：你势大，他可能忍了；怨气大，他先报复再上门
function startScandal(p, kind, extra = {}) {
  if (guShrug(p)) { log(`${p.name}이(가) 마음속으로 의심했지만, 고가 움직이자 다시 잊어버렸다.`, 'warn'); return; }
  const st = stance(p, SEVERITY[kind] / 5);
  if (st === 'swallow') {
    remember(p, '네 손해를 봤지만 네 세력을 가늠하고 참았다.', -10, 'swallowed');
    log(`${p.name}${p.status === 'alive' ? '' : '의 친족'}이(가) 암암리에 손해를 봤지만 감히 드러내지 못했다.`, 'warn');
    return;
  }
  if (st === 'retaliate') extra.damage = retaliate(p, SEVERITY[kind] / 5);
  startStory(`sc_${p.pid}_${S.day}_${kind}`, 'scandal', 'demand', rint(1, 2), Object.assign({ pid: p.pid, kind }, extra));
}
