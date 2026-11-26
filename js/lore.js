// 门道：杂役区的人各自懂些攻略上的知识——丹师懂丹方，铁匠懂炉火，混混懂销赃，老人懂因果。
// 肯不肯告诉你，看世道（难度）、这条门道值多少（低 / 中 / 高，作恶的另算）、他对你的交情；
// 交情不够时，少数高级或作恶的门道肯卖，要价看他贪不贪、你们差多少交情；守规矩的人不卖害人的门道。
// 门道的内容由游戏数据现编：名字、配方、来路、规则都从代码里读，和攻略一样不会与程序对不上
'use strict';

const LORE_TIER = { low: '흔한 수법', mid: '요긴한 수법', high: '숨겨둔 수법' };
// 要多少交情才肯白说（好感），作恶的门道再加一截；难度越高人越嘴紧、要价越高
const LORE_NEED = { low: -9, mid: 25, high: 55 };
const LORE_EVIL_NEED = 20;
const LORE_PRICE = { low: 0, mid: 80, high: 220 };
const LORE_DIFF = { cozy: [-15, 0.7], normal: [0, 1], hard: [10, 1.3], doom: [20, 1.6] };

// 身份标签：从阵营、称谓、生平里认出这人是干哪行的
const LORE_TAGS = [
  ['medic', /의원|의술|약|단/], ['smith', /대장|장인|연기|주조|자물쇠/], ['talisman', /부적|전법|먹|진/], ['necro', /시신|영혼|장례|등지기|검시|제령/],
  ['trader', /장사|행상|상인|장부|미곡|배|나루|짐꾼/], ['shady', /사기|장물|건달|흑구|귀시|도박|거지|버림받은/],
  ['law', /집법|순찰|관리|집사|징수|야경/], ['cultivator', /제자|검|수사|사배|사형|장로|호산|무수|산수/],
  ['sage', /점|괘|승려|도사|노인|맥|전공|서생/], ['beast', /짐승|길들|벌레|영계|깃사자/], ['gu', /고충|고술/], ['farmer', /약초밭|재배|채약|농사|직조|누에|고기잡이/],
  ['brew', /술/],
];
function loreTags(p) {
  const t = new Set([p.faction]), text = `${p.title || ''}${p.bio || ''}`;
  for (const [k, re] of LORE_TAGS) if (re.test(text)) t.add(k);
  if (CAST[p.pid] && CAST[p.pid].healer) t.add('medic');
  if (p.official) t.add('law');
  return t;
}

// ───────────── 门道目录：由游戏数据现编 ─────────────

const loreN = id => ITEMS[id].name;
const loreList = ids => ids.map(loreN).join(', ');
let LORE = null;

function buildLore() {
  const L = [];
  const add = (id, topic, tier, who, text, evil = false) => L.push({ id, topic, tier, who, text, evil });
  const has = (...ids) => ids.every(id => ITEMS[id]);

  // 拾荒：哪儿能翻到什么、险不险
  for (const l of LOCATIONS) {
    const top = l.loot.slice().sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]);
    const rare = l.loot.filter(([id, w]) => w <= 1.5 && !top.includes(id)).map(x => x[0]);
    const risky = l.danger >= 0.1;
    add(`scav_${l.id}`, '노획처', risky ? 'mid' : 'low', risky ? ['cultivator', 'hunter', 'shady', 'mo'] : ['ren', 'trader', 'farmer', 'shady'],
      `${l.name}에는 주로 ${loreList(top)}이(가) 나온다${rare.length ? `. 운이 좋으면 ${loreList(rare)}도 줍는다` : ''}. ${risky ? '그곳은 험악하다. ' : ''}${l.hazard.text.replace(/[.]$/, '')} — 상처 입은 몸으로는 가지 마라.`);
  }
  // 买货：货郎、鬼市、批发处
  add('buy_supply', '어디서 사나', 'low', ['ren', 'trader'], `보부상은 날마다 물건을 바꾸고 ${loreList(SUPPLY.filter(s => s[2] <= -100).slice(0, 6).map(s => s[0]))}은(는) 늘 갖춰두었다. 마종 명성이 높아지면 ${loreList(SUPPLY.filter(s => s[2] > -100).map(s => s[0]).slice(0, 4))}도 팔아준다.`);
  for (const [k, d] of Object.entries(DEALERS)) {
    const evil = d.sells.some(([id]) => ITEMS[id].illicit || ITEMS[id].contra || ['live_soul', 'cult_corpse', 'corpse_poison', 'wangyou'].includes(id));
    add(`deal_${k}`, '어디서 사나', evil ? 'mid' : 'low', k === 'ghost' ? ['shady', 'mo', 'necro'] : k === 'sect' ? ['mo', 'law', 'cultivator'] : ['ren', 'trader'],
      `${d.name}은(는) ${loreList(d.sells.map(x => x[0]))}을(를) 팔고 ${loreList(d.buys.slice(0, 6))} 같은 것을 사들인다.${k === 'ghost' ? ' 귀시 밤에 가면 물건이 많고 집법당도 상관하지 않는다.' : ''}`, evil && k === 'ghost');
  }
  // 功勋兑换：高阶材料
  for (const [f, items] of Object.entries(MERIT_SHOP)) {
    const top = items.slice().sort((a, b) => b[1] - a[1]).slice(0, 3);
    add(`merit_${f}`, '공훈 교환품', top[0][1] >= 6 ? 'high' : 'mid', [f, 'law', 'cultivator'],
      `${FACTIONS[f].name}의 일을 도와 공훈을 쌓으면 ${top.map(([id, c]) => `${loreN(id)}(${c}점)`).join(', ')}(으)로 바꿀 수 있다 — 이런 것들은 밖에서는 돈이 있어도 못 산다.`, ['live_soul', 'cult_corpse'].some(id => items.some(x => x[0] === id)));
  }
  // 配方：只写游戏里真有的（设备、材料都在）
  const R = (id, machine, use, out, tier, who, extra = '', evil = false) => {
    if (!MACHINES[machine] || !use.every(([x]) => ITEMS[x]) || !ITEMS[out]) return;
    add(`rx_${id}`, `${MACHINES[machine].name}의 조제법`, tier, who, `${MACHINES[machine].name}에 ${use.map(([x, n]) => `${loreN(x)}${n > 1 ? `×${n}` : ''}`).join(', ')}을(를) 넣으면, ${extra}${loreN(out)}이(가) 나온다.`, evil);
  };
  R('ingot', 'furnace', [['iron_ore', 2]], 'iron_ingot', 'low', ['smith', 'ren']);
  R('sword', 'forge', [['iron_ingot', 3]], 'sword_std', 'mid', ['smith', 'cultivator'], `모듈 홈에 ${loreN('jade_slip')} 하나를 꽂고, `);
  R('essence', 'dihuo', [['iron_ore', 6]], 'xuan_essence', 'mid', ['smith']);
  R('god_blank', 'dihuo', [['xuan_essence', 4]], 'god_blank', 'high', ['smith', 'sage'], '네가 폐관하여 지킨 그 밤, ');
  R('demon_blade', 'forge', [['god_blank', 1], ['soul_crystal', 1]], 'demon_blade', 'high', ['smith', 'necro', 'mo'], `연기 2중, ${loreN('jade_slip')}을(를) 꽂은 채로, `, true);
  R('pill_qi', 'danlu', [['herb_dew', 2]], 'pill_qi', 'low', ['medic', 'farmer']);
  R('pill_blood', 'danlu', [['herb_blood', 1], ['yao_core', 1]], 'pill_blood', 'mid', ['medic', 'cultivator']);
  R('pill_found', 'danlu', [['herb_blood', 2], ['yao_core', 1], ['herb_dew', 1]], 'pill_found', 'high', ['medic', 'sage'], `모듈 홈에 ${loreN('pill_recipe')}을(를) 꽂고, `);
  R('blood_infant', 'danlu', [['yao_core', 1], ['blood_essence', 2], ['herb_blood', 1]], 'blood_infant', 'high', ['medic', 'necro', 'mo'], '단약 2중, ', true);
  R('wangyou', 'danlu', [['mihun_flower', 2]], 'wangyou', 'mid', ['shady', 'medic', 'yao'], '', true);
  R('pearl', 'soulfurnace', [['soul_wisp', 3]], 'soul_pearl', 'mid', ['necro', 'mo']);
  R('soul_crystal', 'soulfurnace', [['live_soul', 1], ['soul_pearl', 1]], 'soul_crystal', 'high', ['necro', 'sage'], '', true);
  R('iron_corpse', 'coffin', [['corpse', 1], ['soul_pearl', 1]], 'iron_corpse', 'mid', ['necro'], '관을 이틀 밤 봉하고, ', true);
  R('corpse_king', 'coffin', [['cult_corpse', 1], ['soul_crystal', 1]], 'corpse_king', 'high', ['necro', 'mo'], '', true);
  R('puppet', 'puppetbench', [['iron_ingot', 2], ['soul_pearl', 1]], 'puppet_doll', 'mid', ['smith', 'necro'], `${loreN('puppet_scroll')}을(를) 꽂은 채로, `);
  R('fu', 'fudesk', [['fu_paper', 1], ['cinnabar', 1]], 'fu_jingang', 'low', ['talisman']);
  R('seal_xian', 'fudesk', [['fu_paper', 1], ['cinnabar', 1], ['xian_talisman', 1]], 'seal_xian', 'high', ['talisman', 'xian'], '부적 3중, ');
  R('wine', 'winejar', [['spirit_fruit', 2], ['yeast', 1]], 'spirit_wine', 'low', ['brew', 'farmer', 'trader'], '단지를 이틀 밤 봉하고, ');
  R('vine', 'yaopot', [['vine_seed', 1], ['bones', 3]], 'vine_fruit', 'mid', ['farmer', 'medic', 'yao'], '하룻밤에 한 개씩 먹이고, ');
  if (has('water', 'filter_sand', 'spirit_sand')) add('rx_water', `${MACHINES.pool.name}의 조제법`, 'mid', ['trader', 'farmer', 'ren'],
    `${loreN('filter_sand')}로 씻은 영수는 아무리 씻어도 완전무결에는 못 미친다. 경장옥로로 만들려면 ${loreN('spirit_sand')}이(가) 필요하다 — 서금충이 현철광이나 낡은 동발을 삼키면 이걸 토해낸다.`);
  // 治伤解毒
  add('cure', '상처와 독 치료', 'low', ['medic', 'ren', 'farmer'], Object.values(CONDS).map(c => `${c.name}에는 ${loreList(c.cure)}`).join('; ') + '.');
  const docs = Object.values(CAST).filter(d => d.healer);
  if (docs.length) add('healers', '상처와 독 치료', 'low', ['medic', 'ren', 'yao'], `${docs.map(d => d.name).join(', ')}은(는) 의술을 알아 한번 만나기만 하면 찾아가 진찰을 청할 수 있다. 사이가 좋을수록 진찰료가 싸고, 척지면 움직이지 않는다.`);
  // 修为
  add('realm', '수위', 'mid', ['cultivator', 'sage', 'mo'], REALMS.filter(r => r.key).map(r => `${r.name} 돌파에는 ${loreN(r.key)}이(가) 필요하다`).join(', ') + '. 폐관할 때 돌파 성공률이 높고, 상처나 독이 있으면 낮다.');
  // 执法堂
  add('law_heat', '집법당', 'mid', ['law', 'shady', 'mo'], `집법당의 주시가 차오르면 사람을 잡아간다. 금물은 진열장에 두지 마라. ${UPGRADES.find(u => u.id === 'hidden').name}과(와) 카운터는 순찰이 뒤지지 않는다. 순찰이 와서 아무것도 못 찾으면 주시가 크게 내려간다.`);
  add('law_bribe', '집법당', 'high', ['law', 'shady'], '순찰은 매수할 수 있다. 청렴한 관리는 값이 비싸고, 받아먹은 놈일수록 갈수록 말이 잘 통한다. 적게 주면 오히려 모욕이라 여긴다. 집법당을 대신해 수배범을 감시하고 신고하면 상도 받고 주시도 내려간다.', true);
  // 作恶的门道
  add('evil_fake', '뒷문 장사', 'high', ['shady', 'smith', 'mo'], `세공 나이 먹이는 수법은 이렇다... 작위대에 솜씨를 곁들이면 하품을 명품으로 둔갑시킬 수 있고, ${loreList(BOOKS.filter(b => b[1] === 'forgery' && b[6]).map(b => b[6][0]))}의 모조법까지 익히면 그대로 베낄 수 있다. 솜씨가 좋을수록 간파하는 이가 적다.`, true);
  add('evil_lace', '뒷문 장사', 'high', ['shady', 'medic', 'gu'], `${loreList(Object.keys(ITEMS).filter(id => ITEMS[id].additive && !['tonic', 'control', 'love'].includes(ITEMS[id].additive)))}은(는) 전부 ${loreList(['pill_qi', 'spirit_wine', 'water', 'zhuyan_dan'])}처럼 먹고 마시는 물건에 섞을 수 있고 겉으로는 알아챌 수 없다. 수법은 이렇다... 깨끗하게 섞는 법을 익히면 남이 섞은 물건도 한 번에 알아본다. 상대가 영리할수록, 너를 못 믿을수록 간파당하기 쉽다.`, true);
  add('evil_erase', '뒷문 장사', 'mid', ['shady', 'mo'], '장물에는 원주인의 신식 낙인이 남아 있어 조요경이 좋아야 보이고, 말인술이 높아야 지워진다. 깨끗이 못 지우면 원주인이 자취를 따라 찾아온다.', true);
  add('evil_seal', '뒷문 장사', 'mid', ['shady', 'talisman', 'xian'], `물건에 ${loreN('seal_xian')} 한 장을 붙이면 명문가 소산처럼 보여 몸값이 배가 된다.`, true);
  // 因果
  add('fate', '인과', 'mid', ['sage', 'law', 'yao'], `나쁜 짓은 도박과 같다. 건당 절반은 드러나고, 저지를수록 판돈이 커져 언젠가는 감당이 안 된다. ${FATE_FADE}일 동안 악행을 멈추거나 선행을 쌓으면 옛 장부는 옅어진다.`);
  // 时令行情
  add('season', '시세', 'low', ['trader', 'farmer', 'ren'], SEASONS.map(s => `${s.name}: ${s.text.replace(/[.]$/, '')}`).join('; ') + '.');
  add('war', '시세', 'low', ['trader', 'cultivator', 'mo'], '전쟁이 거세질수록 단약, 법기, 부적, 혼백, 시괴가 귀해지고 진완은 값이 떨어진다. 순찰도 잦아진다.');
  return L;
}
const loreAll = () => LORE || (LORE = buildLore());

// 偏门门道听懂了就是手艺：加料的手法、以次充好的入门
const LORE_GRANTS = {
  evil_lace: () => { S.laceKnown = S.laceKnown || {}; Object.keys(LACE).filter(k => !['tonic', 'control', 'love'].includes(k)).forEach(k => { S.laceKnown[k] = 1; }); log('섞는 수법을 익혔다. 앞으로는 깨끗하게 섞을 수 있고, 남이 섞은 물건도 알아낼 수 있다.', 'gold'); },
  evil_fake: () => { if (!techLv('forgery')) { S.tech.forgery = 1; log('하품을 명품으로 둔갑시키는 입문 수법을 익혔다(작위 1중).', 'gold'); } },
};
const loreTip = id => loreAll().find(t => t.id === id);

// ───────────── 谁懂什么 ─────────────

// 第一次打听时定下来：身份对得上的门道里挑几条（真人多几条），之后不变
function loreKnown(p) {
  if (!p.lore) {
    const tags = loreTags(p), pool = loreAll().filter(t => t.who.some(w => tags.has(w)));
    const n = Math.min(pool.length, p.story || CAST[p.pid] ? 5 : 3);
    p.lore = pool.sort(() => Math.random() - 0.5).slice(0, n).map(t => t.id);
  }
  return p.lore.map(loreTip).filter(Boolean);
}
const loreLearned = id => !!(S.lore && S.lore[id]);

// ───────────── 肯不肯说 ─────────────

const loreShady = p => loreTags(p).has('shady');
// 要多少交情才肯白说
function loreNeed(p, t) { return LORE_NEED[t.tier] + (t.evil && !loreShady(p) ? LORE_EVIL_NEED : 0) + (LORE_DIFF[S.diff] || LORE_DIFF.normal)[0]; }

// 他的答复：tell 白说 / sell 要价 / refuse 不说（附原因）
function loreOffer(p, t) {
  if (loreLearned(t.id)) return { kind: 'known' };
  if (mood(p.aff) === 'hostile') return { kind: 'refuse', why: `${ta(p)}는 너를 미워해 한마디도 해주지 않는다` };
  const need = loreNeed(p, t);
  if (p.aff >= need) return { kind: 'tell' };
  // 交情不够：只有压箱底的、作恶的门道才肯卖；守规矩的人不卖害人的门道
  if (!(t.tier === 'high' || t.evil)) return { kind: 'refuse', why: `아직 사이가 모자란다(${MOOD_NAME[mood(need)]} 필요)` };
  if (t.evil && !loreShady(p) && (p.integrity || 0) > 0.6) return { kind: 'refuse', why: `${ta(p)}는 규칙을 지키는 사람이라 이런 일은 돈을 줘도 말하지 않는다` };
  const gap = need - p.aff, mul = (LORE_DIFF[S.diff] || LORE_DIFF.normal)[1];
  const price = Math.round((LORE_PRICE[t.tier] || 60) * mul * (1 + gap / 100) * (0.7 + (p.greed != null ? p.greed : 0.5)) / 10) * 10;
  return { kind: 'sell', price: Math.max(20, price) };
}

// 打听：一人一天一回，费些精神
function askLore(p, id, pay = false) {
  const t = loreTip(id);
  if (!t || !loreKnown(p).includes(t)) return { err: `${ta(p)}는 이걸 모른다` };
  if (p.loreDay === S.day) return { err: `오늘은 이미 ${ta(p)}에게 물어봤다` };
  const o = loreOffer(p, t);
  if (o.kind === 'known') return { err: '이미 알고 있는 내용이다' };
  if (o.kind === 'refuse') return { err: o.why };
  if (o.kind === 'sell' && !pay) return { price: o.price };
  if (o.kind === 'sell' && S.stones < o.price) return { err: `${ta(p)}는 ${o.price} 영석을 원하는데, 너에게는 모자란다` };
  const err = exert('talk');
  if (err) return { err };
  p.loreDay = S.day;
  if (o.kind === 'sell') { spend(o.price, `${p.name}에게 수법 하나를 사서 ${o.price} 영석을 냈다.`); remember(p, '돈을 내고 그에게 수법 하나를 샀다.', 2); }
  else remember(p, '너에게 수법 몇 가지를 알려주었다.', 1);
  S.lore = S.lore || {};
  S.lore[id] = { day: S.day, from: p.name };
  if (LORE_GRANTS[id]) LORE_GRANTS[id]();
  return { text: `${p.name}이(가) ${o.kind === 'sell' ? `${o.price} 영석을 받고 ` : ''}목소리를 낮춰 말했다: "${t.text}"`, tip: t };
}
