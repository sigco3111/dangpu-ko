// 天机密探：来客各有不可告人的身份；神识探出来，举报给对立的一方换赏金、功勋与声望，或者拿来要挟、卖个人情
'use strict';

// type：秘密；to：该向哪一方举报；chance：各族有此秘密的几率
const SECRETS = {
  xian: [{ type: '선문 잠입자', to: 'mo', bounty: [260, 480], merit: 3, chance: 0.55 }],
  mo: [{ type: '요괴 사냥꾼', to: 'yao', bounty: [150, 300], merit: 3, chance: 0.16 },
       { type: '혈살종 밀정', to: 'xian', bounty: [240, 440], merit: 3, chance: 0.12 },
       { type: '전선 탈주병', to: 'mo', bounty: [120, 240], merit: 2, chance: 0.08 }],
  yao: [{ type: '요족 첩자', to: 'mo', bounty: [180, 340], merit: 3, chance: 0.3 }],
  ren: [{ type: '도망 노예', to: 'mo', bounty: [80, 160], merit: 1, chance: 0.14 },
        { type: '마종 정보원', to: 'ren', bounty: [100, 180], merit: 2, chance: 0.1 }],
};

function rollSecret(p) {
  if (p.story || p.official) return null;
  for (const s of SECRETS[p.faction] || []) {
    if (Math.random() < s.chance) return { type: s.type, to: s.to, bounty: rint(...s.bounty), merit: s.merit, known: false };
  }
  return null;
}

// 神识探查：鉴定术越高、他越信你、越不精明，越容易看透
function probeOdds(p) { return clamp(0.45 + appraiseLevel() * 0.1 + Math.max(0, p.aff) / 200 - p.savvy * 0.3 + 0.05 * (S.cult.lv - 1), 0.05, 0.92); }

function probe(c) {
  const p = personOf(c);
  if (!p || c.probed) return { err: '탐지할 수 없다' };
  const err = exert('probe');
  if (err) return { err };
  c.probed = true;
  if (Math.random() >= probeOdds(p)) {
    if (Math.random() < p.savvy * 0.4) { remember(p, '네가 신식으로 그를 엿본 것을 알아챘다.', -8, 'insulted'); return { text: `네 신식이 막 뻗어나가자 ${p.name}이(가) 미간을 찌푸리며 반 발짝 물러섰다. 그가 알아챘다.`, cls: 'bad' }; }
    return { text: `${p.name}의 속마음은 깊이 숨겨져 있어 아무것도 읽지 못했다.` };
  }
  if (!p.secret) { p.cleared = true; return { text: `너는 ${p.name}을(를) 꿰뚫어 보았다: 신상이 깨끗하고 수상한 점이 없다.` }; }
  p.secret.known = true;
  return { text: `네 신식이 ${p.name}의 식해를 스쳤다 — 이 사람은 <b>${p.secret.type}</b>다!`, cls: 'good' };
}

// 熟到一定份上，有人会主动向你吐露
function maybeConfide(c) {
  const p = personOf(c);
  if (p && p.secret && !p.secret.known && p.aff >= 60 && Math.random() < 0.3) { p.secret.known = true; c.confided = true; }
}

// 举报：赏金、功勋、受益方声望；被举报者的同族记恨，风声也可能走漏
// 当面不动声色，暗中递上去：买卖照做，等他出了门才被带走，赏金随后送到（见 settleReports）
function reportSecret(c) {
  const p = personOf(c), s = p.secret;
  if (!channelOpen(s.to)) return { err: `아직 ${CHANNEL_NAME[s.to]}와(과) 연줄이 닿지 않았다(${channelHint(s.to)})` };
  c.reportedSecret = true;
  return { text: `너는 뒷방에서 물건을 가져온다는 핑계로 사람을 시켜 ${CHANNEL_NAME[s.to]}에 소식을 전했다.\n${p.name}은(는) 아직 까맣게 모른다 — 거래는 그대로 하고, ${ta(p)}이(가) 이 문을 나서면 알아서 받아줄 사람이 있다.`, cls: 'warn' };
}

function paySecret(p) {
  const s = p.secret;
  // 战事越紧，细作越值钱
  s.bounty = Math.round(s.bounty * (1 + 0.4 * S.world.stage) / 10) * 10;
  s.merit += S.world.stage >= 2 ? 1 : 0;
  earn(s.bounty, `${CHANNEL_NAME[s.to]}에 ${s.type} ${p.name}을(를) 고발해 현상금 ${s.bounty} 영석을 받았다.`);
  S.merit[s.to] += s.merit;
  adjustRep(s.to, 4); adjustRep(p.faction, -4);
  remember(p, `네가 그가 ${s.type}라는 것을 고발했다.`, -100, 'betrayed');
  p.status = s.to === 'mo' ? 'jailed' : 'dead';
  lifeNote(p, s.to === 'mo' ? `네 고발로 ${s.type}임이 드러나 혈옥에 갇혔다.` : `네 고발로 ${s.type}임이 드러나 ${FACTIONS[s.to].name}의 손에 죽었다.`);
  p.secret = null;
  commitSin('betray', { p, w: 2, what: `${p.name}이(가) ${s.type}임을 고발했다`, virtue: 6 });
  let leak = '';
  if (Math.random() < 0.2) {
    adjustRep(p.faction, -8);
    leak = `소문이 새어나가 ${FACTIONS[p.faction].name}은(는) 모두 네가 밀고한 줄 안다.`;
  }
  return { text: `${p.name}은(는) 문을 나서자마자 ${CHANNEL_NAME[s.to]} 사람들에게 끌려갔다. 현상금 ${s.bounty} 영석, ${FACTIONS[s.to].name} 공훈 +${s.merit}. ${leak}`, cls: leak ? 'bad' : 'good' };
}

// 要挟：他掂量你的势力，给钱或翻脸
function blackmail(c) {
  const p = personOf(c), s = p.secret;
  const ask = Math.round(s.bounty * 0.6 * Math.max(0.5, p.budgetMul) / 10) * 10;
  tally('cruel');
  if (Math.random() < overpowerOdds(p) + 0.1) {
    earn(ask, `${p.name}이(가) ${ask} 영석으로 네 입을 막았다.`);
    remember(p, `네가 그의 ${s.type} 신분을 빌미로 협박해 ${ask} 영석을 뜯어냈다.`, -30, 'blackmailed');
    commitSin('betray', { p, w: 2, what: `${p.name}을(를) 협박했다`, virtue: 6 });
    p.blackmailed = (p.blackmailed || 0) + 1;
    dismissCustomer(false);
    return { text: `${p.name}의 얼굴이 새파랗게 질려 ${ask} 영석을 세어 카운터에 올렸다: "됐지?"`, cls: 'good' };
  }
  const dmg = retaliate(p, 60);
  remember(p, '네가 그의 신분으로 협박하려 했다.', -40, 'blackmailed');
  dismissCustomer(false);
  return { text: `${p.name}이(가) 차갑게 너를 보았다: "고발하든지 말든지."\n${ta(p)}은(는) 돌아서 갔다 — ${dmg}`, cls: 'bad' };
}

// 守口如瓶：他欠你一个人情，往后会替你留意风声
function keepSecret(c) {
  const p = personOf(c);
  remember(p, `네가 그가 ${p.secret.type}임을 알면서도 비밀을 지켜주었다.`, 18, 'helped');
  p.owes = true;
  return { text: `너는 목소리를 낮췄다: "네 일은 말하지 않겠다." ${p.name}이(가) 멈칫하더니 엄숙히 고개를 끄덕였다.`, cls: 'good' };
}

// 交好的熟客夜里会透露别人的底细
function gossipTick() {
  const out = [];
  const friends = Object.values(S.people).filter(p => p.status === 'alive' && !p.story && p.aff >= 30 && S.day - p.lastDay <= 10);
  for (const f of friends) {
    if (Math.random() > 0.12) continue;
    const t = pick(Object.values(S.people).filter(p => p !== f && p.status === 'alive' && p.secret && !p.secret.known) || []);
    if (!t) continue;
    t.secret.known = true;
    out.push({ icon: 'ic_secret', title: '단서', text: `${f.name}이(가) 살며시 알려주었다: ${t.name}(${t.title})은(는) ${t.secret.type}다. [인물] 페이지에서 ${CHANNEL_NAME[t.secret.to]}에 고발할 수 있다.`, cls: 'warn' });
    if (out.length >= 2) break;
  }
  return out;
}

// 欠你人情的人也是线人
function owedInformants() {
  return Object.values(S.people).filter(p => p.owes && p.status === 'alive').map(p => [p, 0.35]);
}

// ───────────── 消息买卖 ─────────────

// 消息是一纸密报：可以自己用，也可以卖、可以送。值多少看写的是什么、给了谁、过没过时
// info：{ kind, title, text, value, until, ... }
const intelExpired = it => !it.info || it.info.until < S.day;
function intelValue(it) { return intelExpired(it) ? 2 : it.info.value; }

const RUMORS = [
  ['dan', '단약 시장이 앞당겨 열린다'], ['qi', '외문 대비 날짜가 바뀐다'], ['hun', '혈월제에 혼번을 한 벌 더 만든다'], ['shi', '전당이 철시 한 무리를 보충한다'],
  ['yin', '요족 사절단이 산에 들어온다'], ['fu', '호산 대진의 부적을 갈아야 한다'], ['cai', '연기방이 군수품 한 조를 서둘러 만든다'], ['wan', '내문 장로가 생일 잔치를 연다'],
];
const DIRT = ['몰수 재물 횡령', '선문과 내통', '군량 부정 청구', '산 사람으로 약 시험', '영맥 무단 개발'];

// 造一份密报，放进库房；放不下返回 null
function makeIntel(kind, opt = {}) {
  const info = { kind, until: S.day + 14 };
  if (kind === 'market') {
    const [cat, why] = pick(RUMORS), day = S.day + rint(2, 3), up = rnd(0.35, 0.6);
    S.world.pending = S.world.pending || [];
    S.world.pending.push({ day, cats: { [cat]: up }, days: 4, text: `${why}. ${CATS[cat]} 시세가 크게 오른다.` });
    Object.assign(info, { title: `밀보·${CATS[cat]}`, until: day, value: Math.round(60 + up * 300),
      text: `${day}일 무렵 ${why}. ${CATS[cat]}이(가) 약 ${Math.round(up * 100)}% 오른다. 소문이 퍼지기 전에 쟁여둬라. 그날이 지나면 이 종이는 휴지다.` });
  } else if (kind === 'secret') {
    const p = opt.p, s = p.secret;
    Object.assign(info, { title: `약점·${p.name}`, pid: p.pid, value: Math.round(s.bounty * 0.5),
      text: `${p.name}(${p.title})은(는) ${s.type}다. ${FACTIONS[s.to].name} 사람에게 팔면 그들이 알아서 손을 쓴다. ${ta(p)} 본인에게 되팔면 큰돈을 주고 네 입을 막을 것이다.` });
    s.filed = true;
  } else if (kind === 'treasure') {
    const loc = pick(LOCATIONS), id = pick(loc.loot.filter(([, w]) => w <= 2))[0];
    Object.assign(info, { title: `보물·${loc.name}`, loc: loc.id, id, value: Math.round(ITEMS[id].base * 0.35 + 20),
      text: `${loc.name} 어딘가에 ${ITEMS[id].name}이(가) 묻혀 있다. 그곳에서 폐품을 주울 때 첫 번째 뒤지기에서 반드시 건진다.` });
  } else if (kind === 'clique') {
    const cid = opt.cid || pick(Object.keys(CLIQUES)), C = CLIQUES[cid];
    Object.assign(info, { title: `내막·${C.name}`, cid, value: 180,
      text: `${C.head}의 ${pick(DIRT)} 증거. ${CLIQUES[C.rival].name}에 넘기면 ${C.name}의 근간을 흔들 수 있고, 마종 사람에게 팔아도 영석 몇 푼은 된다.` });
  }
  const it = makeItem('intel', { info, q: 60 });
  stow(it);
  return it;
}

// 谁肯为这份消息出价
function intelMul(c, it) {
  if (intelExpired(it)) return 0.1;
  const i = it.info;
  if (i.kind === 'secret') {
    const t = S.people[i.pid];
    if (!t || t.status !== 'alive' || !t.secret) return 0.1;
    return c.pid === i.pid ? 3 : c.faction === t.secret.to ? 1.6 : 0.3;
  }
  if (i.kind === 'treasure') return c.faction === 'ren' ? 1.2 : 0.6;
  if (i.kind === 'clique') return c.faction === 'mo' ? 1 : 0.3;
  return c.faction === 'ren' && c.title === '凡人行商' ? 1.3 : 1;
}

// 消息到了别人手里：把柄会要人命，行情让人发财
function deliverIntel(p, it) {
  if (!p || it.id !== 'intel' || intelExpired(it)) return;
  const i = it.info;
  if (i.kind === 'secret') {
    const t = S.people[i.pid];
    if (!t || t.status !== 'alive' || !t.secret) return;
    if (t === p) { remember(p, '네 손에서 자기 약점을 사갔다.', 4); return; }
    if (p.faction !== t.secret.to) return;
    t.status = t.secret.to === 'mo' ? 'jailed' : 'dead';
    lifeNote(t, `${t.secret.type}라는 신분이 ${FACTIONS[t.secret.to].name}에 팔려갔다.`);
    remember(t, '누군가 그의 뒷배경을 팔아넘겼다.', -30);
    commitSin('betray', { p: t, w: 2, what: `${t.name}의 약점을 ${FACTIONS[t.secret.to].name}에 팔았다`, virtue: 6 });
    adjustRep(t.secret.to, 2);
    worldNews(`${t.name}(${t.title})이(가) ${t.secret.type}(으)로 발각되어 다시는 나타나지 않았다.`);
    t.secret = null;
  } else if (i.kind === 'market') remember(p, '네가 준 정보 덕에 한몫 챙겼다.', 4, 'helped');
  else if (i.kind === 'clique' && p.faction === 'mo') S.cliques[i.cid].pw = clamp(S.cliques[i.cid].pw - 6, 0, 100);
}

// 风声成真：到了日子，密报里说的事就发生了
function pendingTick() {
  const out = [];
  S.world.pending = (S.world.pending || []).filter(e => {
    if (e.day > S.day + 1) return true;
    addShock(e.cats, e.days + 1, e.text);
    worldNews(e.text);
    out.push({ icon: 'ic_war', title: '소문이 현실로', text: e.text, cls: 'warn' });
    return false;
  });
  return out;
}

// 拾荒时手里有这处的藏宝图，头一回翻找必得
function treasureFind(locId) {
  const map = Object.values(S.items).find(it => HELD(it) && it.id === 'intel' && !intelExpired(it) && it.info.kind === 'treasure' && it.info.loc === locId);
  if (!map) return null;
  const id = map.info.id;
  destroyItem(map);
  return id;
}

// 货郎那儿也有卖消息的
function intelShop() {
  if (!S.intelShop || S.intelShop.day !== S.day) {
    S.intelShop = { day: S.day, list: Array.from({ length: rint(1, 2) }, () => weighted([['market', 5], ['treasure', 3], ['clique', 2]])) };
  }
  return S.intelShop.list;
}
const INTEL_PRICE = { market: 130, treasure: 90, clique: 200 };

function buyIntel(i) {
  const kind = S.intelShop.list[i], price = Math.round(INTEL_PRICE[kind] * (1 + diff().markup));
  if (!kind) return '다 팔렸다';
  if (S.stones < price) return '영석이 부족하다';
  const it = makeIntel(kind);
  if (!it) return '창고에 들어가지 않는다';
  spend(price, `정보 장수에게서 ${itemName(it)}을(를) 샀다.`);
  S.intelShop.list.splice(i, 1);
  return null;
}
