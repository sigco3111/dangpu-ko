// 宗门派系：执法堂、战堂、丹房、少宗主一系明争暗斗。攀上一系，换来的不是货，而是别人拿不到的买卖；
// 押错了人，靠山倒台时一并清算。权贵也在这张网里——傲慢、阔绰、眼力平平，正好拿假货宰他们
'use strict';

// likes：进献时看重的品类；eye：验货的眼力；opps：独家买卖的种类
const CLIQUES = {
  law:  { name: '집법당', head: '냉 장로', portrait: 'mo_enforcer', rival: 'heir', likes: ['xin', 'fu', 'ju'], eye: 3, opps: ['auction', 'launder', 'contra'],
    desc: '형벌과 몰수를 쥐고 있다. 붙잡히면 몰수된 좋은 물건이 먼저 네 손을 거치고 장물도 출처를 세탁할 수 있다.' },
  war:  { name: '전당', head: '도 장로', portrait: 'mo_disciple', rival: 'dan', likes: ['qi', 'shi', 'hun', 'fu'], eye: 2, opps: ['order', 'captive', 'order'],
    desc: '전선의 군수가 전부 여기를 거친다. 군수 주문은 값을 후하게 치고 포로도 저울에 달아 판다.' },
  dan:  { name: '단방', head: '약 장로', portrait: 'ren_cultivator', rival: 'war', likes: ['dan', 'cai', 'yao', 'zhi'], eye: 3, opps: ['license', 'supply', 'order'],
    desc: '종문의 단약 장사. 판매권을 따내면 네 단약은 판로 걱정이 없고 진귀한 약재도 배급가로 받는다.' },
  heir: { name: '소종주 일파', head: '혈공자', portrait: 'noble', rival: 'law', likes: ['wan', 'qi', 'yin'], eye: 1, opps: ['salon', 'order', 'tip'],
    desc: '소종주와 그를 둘러싼 낭인들. 돈은 흥청망청 쓰고 안목은 평범하며 체면을 목숨처럼 여긴다 — 아회의 귀족들은 하나같이 잡아먹힐 양이다.' },
};

// 各系订单要的货：前几样常有，后面的要“门下”才给
const ORDER_GOODS = {
  war: ['sword_std', 'fu_jingang', 'soul_pearl', 'iron_corpse', 'puppet_doll', 'corpse_king'],
  dan: ['pill_qi', 'pill_blood', 'vine_fruit', 'herb_blood', 'pill_found', 'blood_infant'],
  heir: ['spirit_wine', 'jade_pendant', 'bronze_mirror', 'scroll_manual', 'soul_banner', 'demon_blade'],
};

function initPolitics() {
  if (S.cliques) return;
  S.cliques = { joined: null, opps: [], week: -1 };
  for (const k in CLIQUES) S.cliques[k] = { st: 0, pw: rint(45, 65) };
}

const cliqueSt = k => S.cliques[k].st;
function tierOf(k) {
  if (S.cliques.joined === k) return 3;
  const st = cliqueSt(k);
  return st >= 60 ? 2 : st >= 30 ? 1 : st >= 10 ? 0 : -1;
}
const TIER_NAME = { '-1': '낯선 사이', 0: '왕래 있음', 1: '객청', 2: '심복', 3: '문하' };

function shiftSt(k, d) { S.cliques[k].st = clamp(Math.round(S.cliques[k].st + d), -60, 100); }

// ───────────── 结交 ─────────────

// 孝敬灵石：越熟越难再往上走
function cliqueTribute(k, n) {
  if (S.stones < n) return '영석이 부족하다';
  spend(n, `${CLIQUES[k].head}에게 바침 ${n} 영석.`);
  shiftSt(k, n / (8 + Math.max(0, cliqueSt(k)) / 4));
  shiftSt(CLIQUES[k].rival, -n / 60);
  return null;
}

// 进献货物：对口的加倍看重；假货要过他们的眼
function cliqueGiftValue(k, it) {
  return Math.round(knownValue(it) * priceMul(it.id) * (CLIQUES[k].likes.includes(ITEMS[it.id].cat) ? 1.5 : 0.6));
}

function cliqueOffer(k, it) {
  const C = CLIQUES[k], name = itemName(it);
  if (isFlawed(it) && Math.random() < (C.eye >= (it.grade || 1) ? 0.7 : 0.05)) {
    destroyItem(it);
    shiftSt(k, -15);
    if (k === 'law') addHeat(8);
    return { bad: true, text: `${C.head}이(가) ${name}을(를) 바닥에 내동댕이쳤다: "이런 걸로 나를 속이려고?"` };
  }
  const v = cliqueGiftValue(k, it);
  const d = v / (20 + Math.max(0, cliqueSt(k)) / 2);
  shiftSt(k, d);
  destroyItem(it);
  return { text: `${C.head}이(가) ${name}을(를) 받았다. (${C.name} 호감 +${Math.round(d)})` };
}

// 投靠：从此是这一系的人，对头一系把你当眼中钉
function joinClique(k) {
  if (S.cliques.joined) return '이미 뒷배가 있다';
  if (cliqueSt(k) < 30) return `${CLIQUES[k].name}은(는) 아직 너를 식구로 여기지 않는다(호감 30부터 받아준다)`;
  S.cliques.joined = k;
  shiftSt(CLIQUES[k].rival, -25);
  for (const o in CLIQUES) if (o !== k && o !== CLIQUES[k].rival) shiftSt(o, -5);
  S.cliques.week = -1;
  log(`너는 ${CLIQUES[k].head} 문하에 들었다. ${CLIQUES[CLIQUES[k].rival].name}은(는) 이제 너를 적으로 삼는다.`, 'gold');
  return null;
}

// ───────────── 独家买卖 ─────────────

function marketPrice(id) { return Math.round(rawValue({ id, q: 70 }) * priceMul(id)); }

function makeOpp(k, type, tier) {
  const until = S.day + 7, o = { cid: k, type, until, key: `${k}${type}${S.day}${rint(0, 9999)}` };
  const goods = ORDER_GOODS[k];
  switch (type) {
    case 'order': {
      const id = pick(goods.slice(0, tier >= 3 ? goods.length : 4));
      const n = ITEMS[id].base >= 600 ? 1 : rint(2, 4);
      return Object.assign(o, { id, left: n, unit: Math.round(marketPrice(id) * (1.6 + 0.15 * tier)) });
    }
    case 'auction': {
      // 抄家抄来的整批货：来路已由执法堂洗净
      const pool = [...SELL_POOLS.mo, ...SELL_POOLS.xian].filter(([id]) => ITEMS[id].base >= 70);
      const items = Array.from({ length: rint(3, 4) }, () => weighted(pool));
      const v = items.reduce((s, id) => s + marketPrice(id), 0);
      return Object.assign(o, { items, value: v, price: Math.round(v * (tier >= 3 ? 0.3 : 0.42) / 10) * 10 });
    }
    case 'launder': return Object.assign(o, { rate: tier >= 3 ? 0.06 : 0.12 });
    case 'contra': {
      // 仙门禁物在执法堂这儿是缴获，可以明着收
      const id = pick(['xian_sword', 'xian_talisman', 'xian_robe']);
      return Object.assign(o, { type: 'order', id, left: rint(1, 3), unit: Math.round(marketPrice(id) * (1.3 + 0.1 * tier)) });
    }
    case 'captive': return Object.assign(o, { price: tier >= 3 ? 220 : 320, left: tier >= 3 ? 2 : 1 });
    case 'license': return Object.assign(o, { cat: 'dan', mul: 1.3 + 0.05 * tier, left: 6 });
    case 'supply': {
      const id = pick(['yao_core', 'herb_blood', 'dan_guide', tier >= 2 ? 'pill_recipe' : 'yao_core']);
      return Object.assign(o, { id, left: id === 'pill_recipe' ? 1 : rint(2, 4), unit: Math.round(marketPrice(id) * 0.5) });
    }
    case 'salon': return Object.assign(o, { guests: tier >= 2 ? 3 : 2 });
    case 'tip': return o;
  }
  return o;
}

// 每周换一批机会：交情越深、越是自己人，机会越多越好
function refreshOpps() {
  const week = Math.floor((S.day - 1) / 7);
  if (S.cliques.week === week) return;
  S.cliques.week = week;
  S.cliques.opps = [];
  for (const k in CLIQUES) {
    const t = tierOf(k);
    if (t < 0) continue;
    const pool = CLIQUES[k].opps;
    for (let i = 0; i < Math.min(3, t + 1); i++) S.cliques.opps.push(makeOpp(k, pool[i % pool.length], t));
  }
}

const liveOpps = () => { refreshOpps(); return S.cliques.opps.filter(o => o.until >= S.day && !o.done); };
const findOpp = key => S.cliques.opps.find(o => o.key === key);

// 交货：按单价收；验货不过，整单作废
function oppGoods(o) {
  if (o.type === 'order') return Object.values(S.items).filter(it => HELD(it) && it.id === o.id);
  if (o.type === 'license') return Object.values(S.items).filter(it => HELD(it) && ITEMS[it.id].cat === o.cat && !ITEMS[it.id].illicit);
  return [];
}

function oppUnit(o, it) {
  if (o.type === 'license') return Math.round(knownValue(it) * priceMul(it.id) * o.mul);
  return Math.round(o.unit * (hasQuality(it) ? 0.75 + shownQ(it) / 280 : 1));
}

function deliverOpp(o, it) {
  const C = CLIQUES[o.cid], name = itemName(it);
  if (isFlawed(it) && Math.random() < (C.eye >= (it.grade || 1) ? 0.7 : 0.05)) {
    destroyItem(it);
    o.done = true;
    shiftSt(o.cid, -20);
    if (o.cid === 'law') addHeat(10);
    return { bad: true, text: `${C.name}의 집사가 ${name}이(가) 가짜임을 알아채고 그 자리에서 주문서를 찢었다: "다시는 오지 마라."` };
  }
  const price = oppUnit(o, it);
  if (isFlawed(it)) S.cliques.fakes = (S.cliques.fakes || 0) + 1;
  if (ITEMS[it.id].war) fuelWar(it, price);
  earn(price, `${name}을(를) ${C.name}에 넘겨 ${price} 영석을 받았다.`);
  destroyItem(it);
  shiftSt(o.cid, 2);
  if (--o.left <= 0) o.done = true;
  return { text: `${C.name}이(가) ${name}을(를) 받고 ${price} 영석을 지불했다.` };
}

function takeOpp(o) {
  const C = CLIQUES[o.cid];
  switch (o.type) {
    case 'auction': {
      if (S.stones < o.price) return { err: '灵石不够' };
      spend(o.price, `${C.name}의 몰수 경매에서 물건 한 조를 낙찰받았다.`);
      const got = o.items.map(id => giveItem(id, { q: rint(55, 85) })).filter(Boolean);
      o.done = true;
      return { text: `몰수품이 도착했다: ${got.map(itemName).join(', ')}. 출처는 깨끗하고 집법당 봉인이 그대로 붙어 있다.` };
    }
    case 'launder': {
      const dirty = Object.values(S.items).filter(it => HELD(it) && (it.stolen > 0 || it.mark));
      if (!dirty.length) return { err: '손에 출처 불명의 물건이 없다' };
      const fee = Math.max(20, Math.round(dirty.reduce((s, it) => s + claimedValue(it), 0) * o.rate / 10) * 10);
      if (S.stones < fee) return { err: `출처 세탁에 ${fee} 영석이 든다` };
      spend(fee, `${C.name}에 부탁해 장물 ${dirty.length}점의 출처를 세탁했다.`);
      dirty.forEach(it => { it.stolen = 0; delete it.mark; });
      o.done = true;
      return { text: `${dirty.length}점의 물건에 집법당 증빙이 붙었다. 이제 출처가 깨끗하다.` };
    }
    case 'captive': {
      if (S.stones < o.price) return { err: '灵石不够' };
      spend(o.price, `${C.name}에게서 포로 한 명을 샀다.`);
      const got = [giveItem('cult_corpse', { q: rint(50, 75) }), giveItem('live_soul', { q: rint(50, 80) }), giveItem('blood_essence'), giveItem('blood_essence')].filter(Boolean);
      karmaShift(-3);
      commitSin('harm', { w: 1, what: '포로를 사들여 처분했다' });
      if (--o.left <= 0) o.done = true;
      return { text: `포로는 선문의 축기 제자였고 끌려올 때 이미 숨이 반쯤 넘어가 있었다. 처분을 마치고 ${got.map(itemName).join(', ')}을(를) 얻었다.` };
    }
    case 'supply': {
      if (S.stones < o.unit) return { err: '灵石不够' };
      const it = giveItem(o.id);
      if (!it) return { err: '库房放不下' };
      spend(o.unit, `단방 배급가로 ${itemName(it)}을(를) 샀다.`);
      if (--o.left <= 0) o.done = true;
      return { text: `${itemName(it)}을(를) 배급가로 받았다.` };
    }
    case 'salon': {
      S.flags.salon = { day: S.day + (S.phase === 'morning' ? 0 : 1), n: o.guests };
      o.done = true;
      return { text: `혈공자가 초대장에 네 가게 이름을 적었다. ${S.phase === 'morning' ? '오늘' : '내일'} 귀족 ${o.guests}명이 '구경'하러 온다.` };
    }
    case 'tip': {
      const it = makeIntel('market');
      o.done = true;
      return it ? { text: `소종주 측근이 슬쩍 귀띔해주었고 너는 그것을 ${itemName(it)}(으)로 적어두었다.` } : { err: '库房放不下' };
    }
  }
  return { err: '' };
}

// ───────────── 倾轧与清洗 ─────────────

const PURGE_TEXT = ['선문과 내통한 것이 드러났다', '군량 횡령이 발각됐다', '단약을 빚다 장로의 직계 제자를 죽였다', '종주 앞에서 총애를 잃었다', '금물을 숨겨둔 것이 고발됐다'];

// 每周推演各系消长；有人倒台，跟着他的人一并清算，对头一系论功行赏
function cliqueTick() {
  if (S.day % 7) return [];
  const out = [];
  const J = S.cliques.joined;
  for (const k in CLIQUES) {
    const c = S.cliques[k];
    c.pw = clamp(c.pw + rnd(-9, 9) + (J === k ? 3 : 0) - (J === CLIQUES[k].rival ? 2 : 0), 0, 100);
    if (J !== k) shiftSt(k, -2);
  }
  if (Math.random() < 0.4) {
    const a = pick(Object.keys(CLIQUES)), b = CLIQUES[a].rival;
    S.cliques[a].pw = clamp(S.cliques[a].pw + 5, 0, 100);
    S.cliques[b].pw = clamp(S.cliques[b].pw - 12, 0, 100);
    worldNews(`${CLIQUES[a].name}이(가) 종주 앞에서 ${CLIQUES[b].name}을(를) 탄핵했다.`);
    out.push({ icon: 'ic_clique', title: '종문 암투', text: `${CLIQUES[a].name}이(가) 종주 앞에서 ${CLIQUES[b].name}을(를) 탄핵해 ${CLIQUES[b].head}의 자리가 흔들리기 시작했다.`, cls: 'warn' });
  }
  for (const k in CLIQUES) if (S.cliques[k].pw <= 20) out.push(purge(k));
  if (J && cliqueSt(CLIQUES[J].rival) <= -30 && Math.random() < 0.5) {
    addHeat(5);
    out.push({ icon: 'ic_clique', title: '견제', text: `${CLIQUES[CLIQUES[J].rival].name} 사람들이 너를 원망해 집법당에 네 일을 기록했다(집법당 주시 +5)`, cls: 'bad' });
  }
  return out;
}

function purge(k) {
  const C = CLIQUES[k], J = S.cliques.joined;
  const why = pick(PURGE_TEXT);
  worldNews(`${C.head} — ${why}. ${C.name} 일파가 숙청당했다.`, 'bad');
  S.cliques[k] = { st: Math.round(S.cliques[k].st * 0.3), pw: 50 };
  S.cliques.opps = S.cliques.opps.filter(o => o.cid !== k);
  S.cliques[C.rival].pw = clamp(S.cliques[C.rival].pw + 15, 0, 100);
  if (J === k) {
    S.cliques.joined = null;
    S.cliques[k].st = -20;
    addHeat(25); adjustRep('mo', -10);
    const seized = Object.values(S.items).filter(it => HELD(it) && it.pos.g !== 'hidden')
      .sort((a, b) => claimedValue(b) - claimedValue(a)).slice(0, 2);
    const names = seized.map(itemName);
    seized.forEach(destroyItem);
    return { icon: 'ic_clique', title: '뒷배가 무너졌다', cls: 'bad',
      text: `${C.head} — ${why}. 수위를 빼앗기고 혈옥에 갇혔다. 너는 그의 문하였다 — 집법당이 와서 ${names.join(', ') || '네 장부'}를 압수해갔다. 집법당 주시 +25, 마종 명성 -10.` };
  }
  if (J === C.rival) {
    const n = rint(20, 40) * 10;
    earn(n, `${C.name} 몰락. ${CLIQUES[J].head}이(가) 공을 가려 상을 내렸다.`);
    shiftSt(J, 10);
    return { icon: 'ic_clique', title: '라이벌 몰락', cls: 'ok', text: `${C.head} — ${why}. ${C.name} 일파가 우수수 흩어졌다. ${CLIQUES[J].head}이(가) 네게 ${n} 영석을 내렸다.` };
  }
  return { icon: 'ic_clique', title: '종문 숙청', cls: 'warn', text: `${C.head} — ${why}. ${C.name} 일파가 숙청당했다. 새로 올라온 사람들은 너를 모른다.` };
}

// 内幕递给对头：这一系的位子更不稳了
function leakDirt(it, to) {
  const k = it.info.cid, C = CLIQUES[k];
  if (to !== C.rival) return '이 내막은 라이벌 일파만이 큰돈을 낸다';
  S.cliques[k].pw = clamp(S.cliques[k].pw - 14, 0, 100);
  shiftSt(to, 15); shiftSt(k, -10);
  destroyItem(it);
  log(`너는 ${C.name}의 내막을 ${CLIQUES[to].head}에게 넘겼다.`, 'warn');
  return null;
}

// ───────────── 权贵 ─────────────

const NOBLE_LINES = [
  '({n}, 부채를 흔들며 눈도 마주치지 않는다) 이 초라한 가게에 볼만한 {item}이(가) 몇 점 있다며? 꺼내봐라. 볼품없는 것으로 본 공자의 눈을 더럽히지 말고.',
  '({n}, 손수건으로 코를 가린다) 이 가난뱅이 냄새는... 됐다. 좋은 {item}이(가) 있으면 어서 올려라.',
  '({n}, 뒤에 하인 둘을 거느리고 있다) 본 도련님의 시간은 귀하다. {item}, 제일 좋은 걸로 — 값? 네놈이 나와 값을 논할 자격이 있나?',
];

function nobleLine(c) { return fill(pick(NOBLE_LINES), { n: c.name, item: c.wantId ? ITEMS[c.wantId].name : CATS[c.wantCat] }); }

function newNoble() {
  const p = newPerson('mo', { portrait: 'noble', anyFace: true, title: '귀족', savvy: rnd(0.25, 0.45),
    bio: '내문에 있는 어른의 권세를 믿고 잡역 구역을 활보한다. 돈을 물 쓰듯 하고 체면 구기는 것을 가장 두려워한다.' });
  p.title = pick(NOBLE_TITLE[sexOf(p)]);
  Object.assign(p, { noble: true, pride: rnd(0.6, 1), eye: 1, budgetMul: 1.2, wish: null, secret: null });
  return p;
}

// 雅集请柬、少宗主的交情，都会招来权贵
function queueNobles() {
  const s = S.flags.salon;
  let n = s && s.day === S.day ? s.n : 0;
  if (S.day >= 4 && Math.random() < 0.1 + Math.max(0, cliqueSt('heir')) / 400) n++;
  for (let i = 0; i < n; i++) {
    const old = Object.values(S.people).filter(p => p.noble && p.status === 'alive' && p.lastDay < S.day && !S.queue.some(c => c.pid === p.pid));
    const p = old.length && Math.random() < 0.5 ? pick(old) : newNoble();
    S.queue.splice(rint(0, S.queue.length), 0, makeCustomer('mo', 'noble', p));
  }
}

// 吹捧：捧得越高，他越舍得掏钱、越懒得细看；捧过了头，反倒惹他起疑
function flatter(c) {
  const p = personOf(c);
  c.flatter = (c.flatter || 0) + 1;
  if (c.flatter > 3 || Math.random() < p.savvy * 0.25 * c.flatter) {
    c.patience--;
    c.flatter = Math.min(c.flatter, 3);
    return { ok: false, text: `${c.name}이(가) 냉소했다: "아부도 그럴듯하게 해야지."` };
  }
  return { ok: true, text: pick([`${c.name}의 입꼬리가 올라갔다: "보는 눈은 있군."`, `${c.name}이(가) 부채를 탁 접었다: "계속해봐라."`, `${c.name}은(는) 듣기 좋은지 턱이 삼 푼 더 올라갔다.`]) };
}
