// 地下交易：魔修鬼市、散修联盟、宗门批发处——整批进货、整批出手，话术博弈；功勋兑换各方特产
'use strict';

// sells：[物品, 每批件数]；buys：收购的物品；price：进价相对基价的倍率；lag：行情只跟进一部分（批发价不追涨）
const DEALERS = {
  ghost: { name: '마수 귀시', who: '귀면 중개인', portrait: 'broker', faction: 'mo', price: 0.85, lag: 0.6, sellK: 0.82, eye: 2,
    desc: '뭐든 팔고 뭐든 사들인다. 장물도 받고 출처는 묻지 않는다.',
    sells: [['soul_wisp', 3], ['soul_grudge', 1], ['corpse', 2], ['wangyou', 2], ['corpse_poison', 1], ['soul_pearl', 1], ['broken_relic', 2], ['sword_std', 1], ['soul_bell', 1], ['bone_flute', 1], ['seal_xian', 2],
      ['pill_qi', 3], ['spirit_wine', 2], ['jade_pendant', 1], ['bronze_mirror', 1]],
    buys: ['soul_pearl', 'iron_corpse', 'puppet_doll', 'fu_shehun', 'soul_banner', 'wangyou', 'xian_sword', 'xian_talisman', 'god_blank', 'beast_feed', 'gu_venom', 'gu', 'gu_egg'],
    stolenOk: true },
  league: { name: '산수 연맹', who: '연맹 집사', portrait: 'ren_cultivator', faction: 'ren', price: 0.8, lag: 0.7, sellK: 0.85, eye: 1,
    desc: '산수들이 뭉쳐 하는 장사. 영재가 싸고 단약, 부록, 영액을 사들인다.',
    sells: [['iron_ore', 5], ['fu_paper', 6], ['cinnabar', 4], ['herb_dew', 4], ['herb_blood', 2], ['spirit_fruit', 4], ['incense', 3], ['jade_bottle', 6], ['filter_sand', 6]],
    buys: ['pill_qi', 'pill_blood', 'pill_found', 'fu_jingang', 'demon_charm', 'water', 'spirit_wine', 'vine_fruit', 'spirit_sand', 'xuan_essence', 'iron_ingot', 'sword_std', 'beast_feed'] },
  sect: { name: '종문 도매처', who: '창고 집사', portrait: 'mo_senior', faction: 'mo', price: 0.6, lag: 0, sellK: 0.9, eye: 3,
    desc: '혈살종 창고의 도매 창구. 도매가는 시세를 따라 오르지 않는다 — 전시에 쟁여두었다 되팔면 이윤이 가장 두텁다. 마종 명성 10 또는 마종 공훈 5가 있어야 상대해준다.',
    sells: [['pill_qi', 5], ['pill_blood', 3], ['sword_std', 2], ['fu_jingang', 5], ['iron_ingot', 6], ['spirit_crystal', 2]],
    buys: ['god_blank', 'xuan_essence', 'iron_corpse', 'puppet_doll', 'soul_pearl', 'sword_std'],
    need: () => S.rep.mo >= 10 || (S.merit && S.merit.mo >= 5) },
};

function initMarket() { S.merit = S.merit || { mo: 0, xian: 0, yao: 0, ren: 0 }; }

const isGhostNight = () => calendar().weekday === 6;
// 走量的货，收购额度翻倍
const BULK_WANT = ['water', 'iron_ingot', 'beast_feed', 'spirit_sand', 'pill_qi', 'fu_jingang'];

// 每周换一次货；鬼市夜货多
function dealerStock(key) {
  const week = Math.floor((S.day - 1) / 7);
  S.dealers = S.dealers || {};
  const cur = S.dealers[key];
  if (cur && cur.week === week) return cur;
  const d = DEALERS[key], more = isGhostNight() ? 1.5 : 1;
  const st = { week, mod: 1, talked: false,
    offers: d.sells.map(([id, lot]) => ({ id, lot, lots: Math.max(1, Math.round(rint(key === 'ghost' && ITEMS[id].cat === 'qi' ? 2 : 1, key === 'ghost' ? 4 : 3) * more)) })),
    wants: d.buys.map(id => ({ id, left: Math.round(rint(4, 10) * more * (BULK_WANT.includes(id) ? 2 : 1)) })) };
  S.dealers[key] = st;
  return st;
}

function dealerBuyPrice(key, id) {   // 你从他那儿买，每件
  const d = DEALERS[key], st = dealerStock(key);
  const mkt = 1 + (priceMul(id) - 1) * d.lag;
  return Math.max(1, Math.round(ITEMS[id].base * mkt * d.price * st.mod * (1 + diff().markup)));
}

function dealerSellPrice(key, it) {  // 你卖给他，这一件
  const d = DEALERS[key], st = dealerStock(key);
  const k = d.sellK * (st.mod < 1 ? 1.1 : st.mod > 1 ? 0.9 : 1) * (it.stolen > 0 ? 0.8 : 1);
  return Math.max(1, Math.round(knownValue(it) * priceMul(it.id) * k));
}

// 能卖给他的货：在他的收购单上、还有额度；赃物只有鬼市收
function sellable(key) {
  const d = DEALERS[key], st = dealerStock(key);
  return Object.values(S.items).filter(it => HELD(it) && st.wants.some(w => w.id === it.id && w.left > 0)
    && (d.stolenOk || !(it.stolen > 0)) && !(it.mark && !d.stolenOk));
}

function buyLot(key, i) {
  const st = dealerStock(key), o = st.offers[i];
  const unit = dealerBuyPrice(key, o.id), total = unit * o.lot;
  if (o.lots <= 0) return '이 물건은 다 팔렸다';
  if (S.stones < total) return '영석이 부족하다';
  const got = [];
  for (let n = 0; n < o.lot; n++) {
    const extra = { q: rint(40, 75) };
    if (key === 'ghost' && ITEMS[o.id].cat === 'qi' && Math.random() < 0.7) Object.assign(extra, { stolen: rint(3, 6) });
    // 鬼市的古玩一半是赝品，丹药灵酒常有人掺过料；散修联盟少些，宗门批发处几乎没有
    if (ITEMS[o.id].appraise) extra.fake = Math.random() < ({ ghost: 0.5, league: 0.25, sect: 0.05 })[key];
    marketLace(o.id, extra, ({ ghost: 0.2, league: 0.05, sect: 0 })[key]);
    const it = makeItem(o.id, extra);
    if (extra.stolen) stampMark(it);
    if (dressable(it) && Math.random() < (key === 'sect' ? 0.05 : 0.3)) dressUp(it, rollGrade());
    stow(it);
    it.cost = unit; it.boughtDay = S.day;
    got.push(it);
  }
  o.lots--;
  spend(unit * got.length, `${DEALERS[key].name}에서 ${ITEMS[o.id].name} ${got.length}개를 일괄 구입했다.`);
  if (DEALERS[key].faction === 'mo' && key === 'ghost' && !isGhostNight()) addHeat(1);
  return null;
}

// 卖给贩子：眼力够的看得穿作伪，当场退货
function sellToDealer(key, it) {
  const d = DEALERS[key], st = dealerStock(key);
  const w = st.wants.find(x => x.id === it.id);
  if (!w || w.left <= 0) return { err: '그는 이제 이것을 받지 않는다' };
  if (isFlawed(it) && d.eye >= (it.grade || 1) && Math.random() < 0.7) {
    adjustRep(d.faction, -3);
    if (it.fake) it.revealed = true; else it.seen = Math.max(it.seen || 0, it.grade);
    return { err: `${d.who}이(가) 무게를 가늠해보고 냉소하며 도로 밀었다: "이걸로 나를 속이려고?"` };
  }
  const price = dealerSellPrice(key, it);
  w.left--;
  if (d.faction === 'mo') fuelWar(it, price);
  earn(price, `${itemName(it)}을(를) ${d.name}에 넘겨 ${price} 영석을 벌었다.`);
  if (it.cost != null && (!S.stats.bestFlip || price - it.cost > S.stats.bestFlip.profit))
    S.stats.bestFlip = { name: itemName(it), cost: it.cost, price, profit: price - it.cost, day: it.boughtDay };
  if (sel === it.uid) sel = null;
  destroyItem(it);
  return { price };
}

// 话术博弈：成则压价抬价，败则对方提防
function talkDealer(key) {
  const st = dealerStock(key), d = DEALERS[key];
  if (st.talked) return { err: '이미 흥정했다' };
  const err = exert('talk');
  if (err) return { err };
  st.talked = true;
  const odds = clamp(0.4 + S.rep[d.faction] / 200 + (S.upgrades.master ? 0.1 : 0) + S.vit.sp / 500, 0.1, 0.9);
  if (Math.random() < odds) { st.mod = 0.85; return { ok: true, text: `너는 ${d.who}와(과) 설전을 벌였고, 그는 값을 15% 깎고 물건을 받을 때도 10% 더 쳐주기로 했다.` }; }
  st.mod = 1.1;
  return { ok: false, text: `${d.who}이(가) 네 속셈을 알아챘다: "내 말을 떠보려고?" 오늘 밤 값은 10% 더 비싸다.` };
}

function visitMarket() {
  const err = exert('market');
  if (err) return err;
  S.scavenged = true;
  if (!isGhostNight()) addHeat(2);
  return null;
}

// ───────────── 功勋兑换 ─────────────

// 各方的特产：只换中高阶的货（基价六十以上），大多外头有钱也买不着；和货郎、鬼市、联盟、批发处每方至多重一样。
// 功勋难攒，一点约抵五六十灵石的货；能再炼成更贵东西的（玄铁精四块炼神兵胚料）定得贵些
// 三四重的秘籍鬼市不卖，只在这里换（另一条路是机遇：行家传艺、拾荒偶得、好人好报）。各方收着本行的书：
// 执法堂管魔道（炼魂、炼尸、炼丹、抹印、作伪四重），仙门暗桩换符箓与洗灵，妖族线人换御兽与栽培，散修联盟换炉火、机关、酿酒与仿丹
const MERIT_SHOP = {
  mo:   [['pill_blood', 3], ['fu_shehun', 3], ['live_soul', 6], ['cult_corpse', 8], ['soul_banner', 16], ['iron_corpse', 25],    // 血煞丹批发处也有
         ['bk_soul3', 18], ['bk_soul4', 28], ['bk_corpse3', 19], ['bk_corpse4', 30], ['bk_alchemy3', 16], ['bk_alchemy4', 26],
         ['bk_erase3', 18], ['bk_erase4', 28], ['bk_forgery4', 24]],
  xian: [['xian_talisman', 2], ['seal_xian', 3], ['xian_robe', 5], ['pill_found', 12], ['xian_sword', 20],                       // 封印符鬼市也有
         ['bk_talisman3', 15], ['bk_talisman4', 24], ['bk_water3', 12], ['bk_water4', 19]],
  yao:  [['vine_fruit', 1], ['gold_bug', 2], ['bk_beast3', 16], ['bk_beast4', 25], ['bk_plant3', 13], ['bk_plant4', 22]],       // 噬金虫货郎也有
  ren:  [['zhen_fu', 1], ['dan_guide', 2], ['xuan_essence', 4], ['cloud_robe', 12], ['bk_refine3', 15], ['bk_refine4', 25],
         ['bk_forgery3', 13], ['bk_puppet3', 21], ['bk_puppet4', 32], ['bk_brew3', 11], ['bk_brew4', 18]],
};
const CHANNEL_NAME = { mo: '집법당', xian: '선문 잠복조', yao: '요족 정보원', ren: '산수 연맹' };

// 能不能和这一方搭上线
function channelOpen(f) {
  if (f === 'mo') return true;
  if (f === 'xian') return S.rep.xian >= 15 || (S.people.spy && S.people.spy.status === 'alive' && S.people.spy.aff >= 0);
  if (f === 'yao') return S.rep.yao >= 15 || (S.people.fox && S.people.fox.status === 'alive' && S.people.fox.aff >= 20);
  return S.rep.ren >= 5;
}
function channelHint(f) {
  return { xian: '선문 명성 15, 또는 선문 추적사자 한상과 교류', yao: '요족 명성 15, 또는 여우 요괴 백초와 친교', ren: '인족 명성 5' }[f] || '';
}

function redeemMerit(f, i) {
  const [id, cost] = MERIT_SHOP[f][i];
  if (!channelOpen(f)) return `아직 ${CHANNEL_NAME[f]}와(과) 연줄이 닿지 않았다`;
  if (S.merit[f] < cost) return '공훈이 부족하다';
  const it = giveItem(id, { q: rint(60, 85) });
  if (!it) return '창고에 들어가지 않는다';
  S.merit[f] -= cost;
  log(`${FACTIONS[f].name} 공훈 ${cost}점으로 ${itemName(it)}을(를) 교환했다.`, 'gain');
  return null;
}
