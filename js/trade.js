// 交易盘：一位来客可以同时买你几样、卖你几样，谈一个总价——正数是他付你，负数是你付他
'use strict';

function initTrade() {
  if (!S.grids.tray) S.grids.tray = { w: 4, h: 3 };
  S.grids.counter = { w: 4, h: 3 };
}

// 不是他专程来找的，但对他有用的货，只肯出六五成，至多捎上两样；他要的件数凑够了、顺带的也捎满了，再多的只当囤货压价收下：
// 出他心理价的五成（不低于货郎的收价）
const SIDE_BUY = 0.65;
const SIDE_MAX = 2;
const EXTRA_BUY = 0.5;

const goodsOf = () => itemsIn('counter');
const tradeOpen = () => !!S.customer && ['sell', 'buy'].includes(S.customer.kind) && !S.customer.refuse && !S.customer.offended;
const trayItems = () => itemsIn('tray');

// 能治好他眼下伤病的药：返回治的是哪一样（几天前被下过毒、心里发慌的，也当中毒急着解）
function cureFor(c, it) {
  const p = personOf(c);
  if (!p || !p.conds && !p.poisonedDay) return null;
  return Object.keys(CONDS).find(k => CONDS[k].cure.includes(it.id)
    && (condSev(p, k) || (k === 'poisoned' && p.poisonedDay && S.day - p.poisonedDay <= 5))) || null;
}
const cureSev = (c, k) => Math.max(1, condSev(personOf(c), k));

// 手艺人：称号看得出是哪一行，来买的多是本行的料，一买就是好几份
// 先认得窄的：兽医不算郎中，药圃不算药堂
const CRAFTS = [
  { re: /대장장이|연기|감기|주기|자물쇠|괴뢰/, name: '연기', ids: ['iron_ore', 'iron_ingot', 'scrap_sword', 'xuan_essence', 'spirit_sand'] },
  { re: /영수 의사|조련|수의/, name: '영수 기르기', ids: ['beast_feed', 'spirit_fruit'] },
  { re: /영식|약초|산나물/, name: '영식 재배', ids: ['herb_seed', 'mihun_seed', 'vine_seed', 'water', 'filter_sand'] },
  { re: /단사|약사|의원|의수|산파|약당/, name: '약 제조', ids: ['herb_dew', 'herb_blood', 'spirit_fruit', 'vine_fruit', 'mihun_flower', 'water'] },
  { re: /부사|부적|조묵|제지/, name: '부적 제작', ids: ['fu_paper', 'cinnabar', 'blood_essence'] },
  { re: /고충/, name: '고 기르기', ids: ['gu_egg', 'gu_venom', 'bones'] },
  { re: /포진|담맥/, name: '진 설치', ids: ['spirit_crystal', 'spirit_sand', 'filter_sand'] },
  { re: /연시|제련/, name: '시체 제련', ids: ['corpse', 'blood_essence', 'corpse_poison', 'bones'] },
];
const craftOf = p => (p && p.title && CRAFTS.find(k => k.re.test(p.title))) || null;
const CRAFT_PICK = 0.45;   // 手艺人专程来买本行料的机会
function craftWant(p) {
  const k = craftOf(p);
  return k && Math.random() < CRAFT_PICK ? pick(k.ids.filter(id => ITEMS[id])) : null;
}

// 他要几件：心心念念的、送礼的、冲着柜里那件来的、问药治伤的只要一件；
// 丹药灵饮符箓灵材这类用了就没的，常要两三件；手艺人买本行的料要得更多；法器珍玩这类经用的，多半一件、至多两件。瘾越深要得越多
const CONSUME_CATS = ['dan', 'yin', 'fu', 'cai', 'zhi', 'yao'];
const CONSUME_IDS = ['beast_feed', 'incense', 'gu_egg', 'gu_venom', 'corpse_poison', 'bones'];
const NEED_ODDS = {
  consume: [[1, 40], [2, 35], [3, 25]],
  craft:   [[1, 15], [2, 35], [3, 30], [4, 20]],
  gear:    [[1, 80], [2, 20]],
};
const isConsumable = id => CONSUME_CATS.includes(ITEMS[id].cat) || CONSUME_IDS.includes(id);
const wantNeedMax = kind => Math.max(...NEED_ODDS[kind].map(([n]) => n));
function wantNeed(c, p) {
  if (c.craving) return clamp(1 + Math.floor(((p && p.addict) || 1) / 2), 1, 3);
  if (c.wishId || c.wantFake || c.attracted || c.noble || !c.wantId) return 1;
  if (p && Object.keys(CONDS).some(k => condSev(p, k) && CONDS[k].cure.includes(c.wantId))) return 1;
  const k = craftOf(p);
  return +weighted(NEED_ODDS[k && k.ids.includes(c.wantId) ? 'craft' : isConsumable(c.wantId) ? 'consume' : 'gear']);
}

// 要的件数怎么说：用了就没的论份，经用的论件
const needUnit = c => '개';
// 说出口的件数：两份，不说二份
const needCn = n => cn(n);
const needText = c => `${c.need || 1} ${needUnit(c)}`;
// 他开口说要几件；心心念念的、冲着柜里那件来的、送礼的、权贵，一听就是一件，不必多说
function needLine(c) {
  if (!c.wantCat || c.noble || c.attracted || c.wishId || c.wantFake) return '';
  const n = c.need || 1;
  return voice(c.faction, n > 1 ? 'qty' : 'qtyOne', { n: needCn(n) + needUnit(c) });
}

// 1 为正中下怀；SIDE_BUY 为顺带捎上；0 为不要
function wantMatch(c, it) {
  const d = ITEMS[it.id];
  if (c.craving && isAddictive(it)) return 1;
  if (c.wishId && it.id === c.wishId) return 1;
  if (cureFor(c, it)) return 1;
  if (c.wantFake) return isFlawed(it) && knownFlaw(it) && d.cat === c.wantCat && (!c.forGift || (it.grade || 1) >= 2) ? 1 : 0;
  if (c.wantId && it.id === c.wantId) return 1;
  if (!c.wantCat || d.tool || d.book || JUNK.includes(it.id) || (it.id === 'intel' && intelExpired(it))) return 0;
  const wants = c.noble ? NOBLE_WANTS : BUY_WANTS[c.faction] || {};
  return wants[d.cat] ? SIDE_BUY : 0;
}

// 这笔交易的全貌：他要的、他不要的、你要收的。
// 他要的货按值钱的先算：治伤病的药每样一份、他要的东西凑够件数、顺带的捎两样，都按他的心理价；再多的（role 'extra'）压价收下
function dealOf(c) {
  const take = (c.take || []).map(uid => S.items[uid]).filter(it => it && it.pos && it.pos.g === 'counter').map(it => ({ it, a: it.ask }));
  const give = [], reject = [], need = c.need || 1, seen = {}, cured = {};
  let got = 0, side = 0;
  const offered = trayItems().map(it => ({ it, m: wantMatch(c, it), cure: cureFor(c, it), b: buyerValuation(c, it) }))
    .sort((a, b) => b.m - a.m || b.b - a.b);
  for (const { it, m, cure, b } of offered) {
    if (!m) { reject.push(it); continue; }
    let role = 'extra';
    if (cure && !cured[cure]) { cured[cure] = true; role = 'cure'; if (it.id === c.wantId) got++; }
    else if (m === 1 && !cure && got < need) { got++; role = 'want'; }
    else if (m < 1 && !seen[it.id] && side < SIDE_MAX) { side++; role = 'side'; }
    seen[it.id] = true;
    const v = role === 'extra' ? Math.min(b * SIDE_BUY, Math.max(brokerPrice(it), b * EXTRA_BUY)) : b * m;
    give.push({ it, m, role, v, sev: role === 'cure' ? cureSev(c, cure) : 0 });
  }
  const V = give.reduce((s, g) => s + g.v, 0), A = take.reduce((s, t) => s + t.a, 0);
  return { give, take, reject, need, got, V, A, N0: Math.round(V - A), scale: Math.max(1, V + A) };
}

// 由你摆布的人：中了你的蛊、识海里种着你的魂印、情蛊认了你——你开什么价他都认，只是掏不出钱袋里没有的
function compliant(c) {
  const p = personOf(c);
  return !!(p && (guBound(p) || p.soulBound || p.loveGu));
}

// 急不急：治眼下伤病的药（伤越重越急）、心心念念的东西、瘾头上来的那一口；按这几样在他要的货里占的份量算，0～1
function urgency(c, d) {
  if (!d.V) return 0;
  const p = personOf(c);
  const u = g => g.role === 'cure' ? [0.45, 0.65, 0.85][g.sev - 1]
    : g.role !== 'want' ? 0 : c.wishId === g.it.id ? 0.5 : c.craving && p ? Math.min(0.9, 0.25 + 0.15 * (p.addict || 1)) : 0;
  return d.give.reduce((s, g) => s + g.v * u(g), 0) / d.V;
}

// 他对价钱有多在乎（1 为寻常）：权贵不屑计较；急着要药、要东西的，急着脱手赃物违禁品、被通缉、走投无路的，都顾不上讨价
function calmOf(c, d) {
  const w = d.V / d.scale, p = personOf(c);
  const rush = d.take.some(t => t.it.stolen || ITEMS[t.it.id].contra) || c.wanted || (p && p.desperate) ? 0.35 : 0;
  return (c.noble ? 0.6 : 1) * (1 - 0.5 * urgency(c, d) * w) * (1 - rush * (1 - w));
}

// 掏得出钱袋几成还不心疼：自动报价、他还价都不过这个数
const PURSE_EASY = 0.8, PURSE_OFFER = 0.85;

const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// 他的盘算：k 为你要价高出公道价的比例（按他在乎价钱的程度折过）。处处连续，多一两枚灵石，几成的变化都是一点点地挪
//   成交：公道价上八成五肯，高出两三成剩一半；他掏钱时，价钱过了钱袋八成越来越舍不得，过了钱袋根本拿不出
//   拂袖：要价过了他心里那道坎才动气，往上越来越快；耐心越少坎越低、火越大，但公道价上谁也不会翻脸
function dealOdds(c, d, net) {
  if (compliant(c)) return net > 0 && net > c.budget ? { accept: 0, counter: 1, leave: 0 } : { accept: 1, counter: 0, leave: 0 };
  const w = d.V / d.scale, tired = 4 - c.patience;
  const k = (net - d.N0) / d.scale * calmOf(c, d);
  let accept = 0.97 / (1 + Math.exp((k - 0.25 - 0.05 * (1 - w)) / 0.125));
  if (net > 0) accept *= c.budget > 0 ? 1 - smooth((net / c.budget - PURSE_EASY) / (1 - PURSE_EASY)) : 0;
  const x = Math.max(0, k - Math.max(0.03, 0.12 - 0.03 * tired));
  const leave = Math.min(0.9, 1 - accept, 2.8 * (1 + 0.15 * tired) * x * x);
  return { accept, counter: Math.max(0, 1 - accept - leave), leave };
}

const PRESET_SAFE = 0.008, PRESET_BOLD = 0.09;

// 自动报价：让利、公道照他心里的公道价走；小赚是他几乎不会翻脸（拂袖不到百分之一）的最高价，狠宰是十个里约一个甩手走人的价。
// 他掏钱时都不过他痛快掏得出的数（钱袋八成五）；由你摆布的人不会走，小赚只多要一成，狠宰要到滑杆的顶、钱袋见底为止
function dealPresets(c, d, [lo, hi]) {
  const tame = compliant(c);
  const top = Math.max(lo, Math.min(hi, Math.max(0, Math.round(c.budget * (tame ? 1 : PURSE_OFFER)))));
  const fit = n => clamp(Math.round(n), lo, top);
  const fair = fit(d.N0);
  const upTo = cap => {
    let a = fair, b = top;
    if (dealOdds(c, d, b).leave <= cap) return b;
    while (b - a > 1) { const m = Math.floor((a + b) / 2); if (dealOdds(c, d, m).leave <= cap) a = m; else b = m; }
    return a;
  };
  // 小买卖一枚灵石就差好几成：拂袖离一成近的那一档
  const near = n => { const o = dealOdds(c, d, n + 1).leave; return n < top && o <= 0.1 && o - PRESET_BOLD < PRESET_BOLD - dealOdds(c, d, n).leave ? n + 1 : n; };
  return [['양보', fit(d.N0 - d.scale * 0.12)], ['공정', fair],
    ['적은 이익', tame ? fit(d.N0 + d.scale * 0.1) : upTo(PRESET_SAFE)], ['바가지', tame ? top : near(upTo(PRESET_BOLD))]];
}

// 谈价滑杆的范围：公道价上下拉开；他钱袋比公道价还瘪，就让滑杆够得着他掏得出的数
function dealRange(c, d) {
  let lo = Math.round(d.N0 - d.scale * 0.6);
  const hi = Math.round(d.N0 + d.scale * 0.9);
  if (c.budget * PURSE_OFFER < lo && lo > 0) lo = Math.max(0, Math.round(c.budget * 0.5));
  return [lo, hi];
}

// 一笔买卖件数越多，谈起来越费神
function dealEffort(d) { return 1 + 0.6 * Math.max(0, d.give.length + d.take.length - 1); }

// 他还的价：从他心里的价朝你的价让一步（越不在乎价钱让得越多）；钱袋不够就报个八成五身家（由你摆布的，全掏出来）
function dealCounter(c, d, net) {
  let n = Math.round(d.N0 + (net - d.N0) * (1 - 0.5 * calmOf(c, d)));
  if (n > 0) n = Math.min(n, Math.round(c.budget * (compliant(c) ? 1 : PURSE_OFFER)));
  return Math.min(n, net);
}

// 摆上货盘：记下原来的位置，没卖出去的放回原处
function toTray(it, x, y) {
  if (it.pos.g !== 'tray') it.from = it.pos;
  placeItem(it, 'tray', x, y);
}

function returnTray() {
  trayItems().forEach(it => {
    const f = it.from;
    delete it.claim; delete it.from;
    if (f && S.grids[f.g] && !rejectReason(f.g, it) && fits(f.g, it, f.x, f.y)) placeItem(it, f.g, f.x, f.y);
    else stow(it);
  });
}

// 出价前先过眼：当真货卖的假货，眼力够的当场看穿，整笔买卖告吹
function dealInspect(c, d) {
  const caught = d.give.find(g => buyerDetectsFake(c, g.it));
  return caught ? caught.it : null;
}

// 成交：总价按各件的分量摊开，逐件交割；卖出去的货出了岔子，他当场翻脸，收货也作罢
function settleDeal(c, d, net) {
  const k = (net - d.N0) / d.scale;
  const prices = d.give.map(g => Math.max(1, Math.round(g.v * (1 + k))));
  const pays = d.take.map(t => Math.max(0, Math.round(t.a * (1 - k))));
  // 摊剩的零头记在最大的一笔上；那一笔扣不下（卖价至少一枚、收价不能倒贴）的，挪到另一头，总数和谈定的分毫不差
  let drift = net - (prices.reduce((a, b) => a + b, 0) - pays.reduce((a, b) => a + b, 0));
  const big = a => a.indexOf(Math.max(...a));
  if (drift && prices.length) { const i = big(prices), to = Math.max(1, prices[i] + drift); drift -= to - prices[i]; prices[i] = to; }
  if (drift && pays.length) { const i = big(pays), to = Math.max(0, pays[i] - drift); drift -= pays[i] - to; pays[i] = to; }
  const out = { sold: [], bought: [], income: 0, paid: 0 };
  for (let i = 0; i < d.give.length; i++) {
    const { it, v } = d.give[i], name = itemName(it);
    const r = completeSale(c, it, prices[i], v);
    if (r.stolenCaught || r.lacedCaught) { out.caught = r.stolenCaught ? 'stolen' : 'laced'; break; }
    out.sold.push(name); out.income += prices[i];
  }
  if (!out.caught) d.take.forEach((t, i) => { completePurchase(c, t.it, pays[i]); out.bought.push(itemName(t.it)); out.paid += pays[i]; });
  c.take = [];
  S.stats.deals = (S.stats.deals || 0) + 1;
  if (d.give.length + d.take.length >= 3) log(`${c.name}과(와) 큰 거래를 했다: ${out.sold.length}건 팔고 ${out.bought.length}건 받았다.`, 'gold');
  return out;
}

function toggleTake(c, uid) {
  c.take = c.take || [];
  const i = c.take.indexOf(uid);
  if (i >= 0) c.take.splice(i, 1); else c.take.push(uid);
}

// 来客想要什么，用一句话说清
function wantText(c) {
  if (c.craving) return '망우산(또는 그것이 섞인 것)';
  if (c.wishId) return ITEMS[c.wishId].name;
  if (c.forGift) return `선물용 고급 모작 ${CATS[c.wantCat]}(만듦새 보통 이상, 너는 가짜인 걸 안다)`;
  if (c.wantFake) return `진짜처럼 보이는 ${CATS[c.wantCat]}`;
  const k = craftOf(personOf(c));
  if (c.wantId && k && k.ids.includes(c.wantId)) return `${ITEMS[c.wantId].name}(${k.name} 재료)`;
  if (c.wantId) return `${ITEMS[c.wantId].name}(${CATS[c.wantCat]})`;
  return c.wantCat ? CATS[c.wantCat] : '';
}
