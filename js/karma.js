// 善恶有报：做好人要掏真金白银，回报来得慢却稳——口碑让客人肯多出价、熟客荐来生意，你帮过的人记着你；
// 极少时候，那份回报大得能改命。善名太盛也有代价：人人当你好欺负。作恶的账另记在因果里（js/fate.js）。弱者可以帮，也可以榨
'use strict';

function initKarma() {
  if (S.virtue == null) S.virtue = 10;
  S.loans = S.loans || [];
}

// 善名：如实相告、公道买卖、接济弱者会涨；骗人、害人、杀人会跌
function karmaShift(n) { S.virtue = clamp(Math.round(S.virtue + n), 0, 100); }

// 一件善事：记在善名上，也记在对方心里
function goodDeed(p, n) {
  karmaShift(n);
  tally('good', n);
  if (p && !p.official) p.owed = (p.owed || 0) + n;
  fateMerit(p, n);
}

// 善名太盛又没本事：人人当你好欺负。修到金丹，就没人敢了
function softPenalty() { return S.cult.lv >= 3 ? 0 : Math.min(6, Math.floor(S.virtue / 12)); }
// 卖货的人看你老实，开价也敢高些
function softTouch() { return 1 + S.virtue / 800; }

const VIRTUE_NAME = v => v >= 70 ? '살아있는 보살' : v >= 45 ? '후덕한 사람' : v >= 20 ? '성실' : v >= 8 ? '영리함' : '흑심';

function isWeak(p) { return !p.official && !p.noble && npcPower(p) < 20; }

// ───────────── 求助 ─────────────

const PLEAS = ['어머니가 병으로 몸져누워 약값이 {n} 영석 모자랍니다', '광산에서 품삯을 떼먹어 집안이 사흘째 불도 못 땠습니다. {n} 영석만 빌려주십시오',
  '류라자에게 빚진 고리대금을 못 갚으면 다리가 부러집니다. {n} 영석이 모자랍니다', '동생이 단방에 끌려가 약 시험을 당합니다. 구해내려면 {n} 영석이 필요합니다'];

function pleaSetup(c, p) {
  c.need = Math.round(rnd(20, 45) * (1 + S.day * 0.02) / 5) * 5;
  c.plea = fill(pick(PLEAS), { n: c.need });
}

function pleaLine(c) { return `(${c.name}이(가) 털썩 카운터 앞에 무릎을 꿇었다) ${ADDRESS[c.faction]}... ${c.plea}. 뭐든 하겠습니다!`; }

// 善名在外，求上门的人也多
function queuePleas() {
  if (!fateTrusted() || Math.random() > Math.min(0.3, S.virtue / 200)) return;
  const old = Object.values(S.people).filter(p => p.status === 'alive' && !p.story && isWeak(p) && p.desperate && !p.indentured && !S.queue.some(c => c.pid === p.pid));
  const p = old.length ? pick(old) : newPerson('ren');
  if (!old.length) Object.assign(p, { desperate: true, budgetMul: 0.4 });
  S.queue.splice(rint(0, S.queue.length), 0, makeCustomer(p.faction, 'plea', p));
}

// 接济：掏钱，他念你的好，往后成了你的耳目
function helpWeak(c) {
  const p = personOf(c);
  if (S.stones < c.need) return '영석이 부족하다';
  spend(c.need, `${p.name}에게 구제금 ${c.need} 영석.`);
  goodDeed(p, 3);
  Object.assign(p, { informant: true, desperate: false, budgetMul: Math.min(1, p.budgetMul + 0.2) });
  remember(p, '막다른 골목에서 네가 도움의 손길을 내밀었다.', 20, 'helped');
  dismissCustomer(false);
  return null;
}

// 放贷：借他三倍，七日后还一倍半
function lendTo(c) {
  const p = personOf(c), amt = c.need * 3, owe = Math.round(amt * 1.5);
  if (S.stones < amt) return '영석이 부족하다';
  spend(amt, `${p.name}에게 ${amt} 영석을 빌려줬다. 이레 뒤 ${owe} 상환.`);
  S.loans.push({ pid: p.pid, amt, owe, due: S.day + 7 });
  remember(p, `네가 ${amt} 영석을 빌려줬고 이레 뒤에 ${owe}을(를) 갚아야 한다.`, 2);
  karmaShift(-1);
  dismissCustomer(false);
  return null;
}

// 苦力夜里替你烧炉搬货：每人顶 15 点体力
const laborPool = () => Object.values(S.people).filter(p => p.status === 'alive' && p.indentured).length * 15;

// 收作苦力：管口饭，替你搬货烧炉，干到死为止
function indenture(p, why = '밥 한 끼를 위해 스스로를 네게 저당 잡혀 고역꾼이 되었다.') {
  p.indentured = { day: S.day };
  tally('cruel');
  p.informant = false;
  remember(p, why, -12);
  karmaShift(-5); adjustRep('ren', -1);
  commitSin('harm', { p, w: 1, what: `${p.name}을(를) 고역꾼으로 삼았다` });
  if (S.customer && S.customer.pid === p.pid) dismissCustomer(false);
  return null;
}

function turnAway(c) {
  remember(personOf(c), '도움을 청했다가 네게 쫓겨났다.', -6);
  karmaShift(-1);
  dismissCustomer(false);
}

function release(p) {
  p.indentured = null;
  remember(p, '네가 그를 풀어주었다.', 12);
  goodDeed(p, 2);
}

// ───────────── 讨债 ─────────────

const loanOf = p => S.loans.find(l => l.pid === p.pid);

function collectDebt(p, how) {
  const l = loanOf(p);
  S.loans.splice(S.loans.indexOf(l), 1);
  switch (how) {
    case 'mine': {
      const n = Math.round(80 + l.owe * 0.4);
      earn(n, `빚을 못 갚는 ${p.name}을(를) 광산에 팔아 ${n} 영석을 벌었다.`);
      p.status = 'gone'; lifeNote(p, '고리대금을 갚지 못해 마종 광산의 고역꾼으로 팔려갔다.');
      karmaShift(-8); adjustRep(p.faction, -3);
      commitSin('harm', { p, w: 2, what: `${p.name}을(를) 광산에 팔았다` });
      return `${p.name}이(가) 광산 감독에게 쇠사슬로 묶여 끌려가며 너를 돌아보았다.`;
    }
    case 'labor': indenture(p, '빚을 갚지 못해 네게 고역꾼으로 잡혀 빚을 갚게 되었다.'); return `${p.name}이(가) 고개를 숙인 채 네 뒤뜰로 들어왔다.`;
    case 'extend':
      S.loans.push({ ...l, owe: Math.round(l.owe * 1.2), due: S.day + 7, defaulted: false });
      remember(p, '네가 이레를 기다려주었다. 이자에 이자가 붙는다.', 2);
      return `이레 유예. 빚이 ${Math.round(l.owe * 1.2)}(으)로 불었다.`;
    case 'forgive':
      goodDeed(p, 4);
      remember(p, `네가 그가 빚진 ${l.owe} 영석을 깨끗이 탕감해주었다.`, 30, 'helped');
      return `${p.name}이(가) 한참을 멍하니 있다가 네게 세 번 절했다.`;
  }
  return '';
}

// ───────────── 好报 ─────────────

// 大回报：只有混出头的人给得起；给得起的，足以改命
const BOONS = [
  { text: '{n}이(가) 이제 종문에서 발언권이 있어 사람을 시켜 네 가게 문서 값을 사분의 일 깎아주었다.', run: () => { S.flags.deedMul *= 0.75; } },
  { text: '{n}이(가) 호신부 하나를 보냈다: "언젠가 큰 화가 닥치면 이걸 가지고 나를 찾아오게."(체포, 추방, 변사를 한 번 면함)', run: () => { S.flags.savior = (S.flags.savior || 0) + 1; } },
  { text: '{n}이(가) 아끼던 심법 한 구절을 전수하고 경지 돌파의 물건까지 보냈다.', run: () => { S.cult.xp += Math.round((realm().need || 3000) * 0.7); giveItem(realm().key || 'soul_crystal'); } },
  { text: '{n}이(가) 사람을 시켜 귀중한 보물을 실어 보냈다: "그때의 은혜, 늘 기억하고 있었습니다."', run: () => giveItem(pick(['god_blank', 'soul_banner', 'demon_blade', 'lens4'])) },
  { text: '{n}이(가) 표지에 "외부에 알리지 말 것"이라 쓴 필사본 한 권을 보냈다: "네게 모자란 그 단계, 내가 구해왔네."', ok: () => nextBooks().length > 0, run: () => giveItem(pick(nextBooks())[0]) },
];

// 大回报要两头都硬：他混出了头，你也得强到让人敢把重注押在你身上
const strongEnough = () => S.cult.lv >= 2 || playerPower() >= 45;

function repay(p) {
  const fill_ = t => fill(t, { n: p.name });
  const rich = p.budgetMul >= 1.4 || npcLevel(p) >= 2;
  p.owed = 0;
  if (rich && strongEnough() && fateClean() && Math.random() < 0.15) {
    const b = pick(BOONS.filter(b => !b.ok || b.ok()));
    b.run();
    remember(p, '그때의 은혜에 보답했다.', 10);
    return { icon: 'ic_gift', title: '선행의 보답', text: fill_(b.text), cls: 'ok' };
  }
  if (Math.random() < 0.3) {
    const r = Math.random();
    if (r < 0.4) {
      const n = Math.round(rint(20, 50) * 10 * Math.min(2, p.budgetMul));
      earn(n, `${p.name}이(가) 감사의 뜻으로 ${n} 영석을 보냈다.`);
      return { icon: 'ic_gift', title: '은혜 갚기', text: `${p.name}이(가) 사람을 시켜 ${n} 영석을 보냈다: "그때 정말 고마웠습니다."`, cls: 'ok' };
    }
    if (r < 0.75) {
      const it = giveItem(pick(['pill_found', 'soul_pearl', 'lens2', 'spirit_wine', 'xuan_essence']));
      return it ? { icon: 'ic_gift', title: '은혜 갚기', text: `${p.name}이(가) ${itemName(it)}을(를) 보내왔다. 그때 돌봐준 답례란다.`, cls: 'ok' } : null;
    }
    const k = pick(Object.keys(CLIQUES));
    shiftSt(k, 12);
    return { icon: 'ic_clique', title: '은혜 갚기', text: `${p.name}이(가) ${CLIQUES[k].name}에서 네게 좋은 말을 몇 마디 해주었다(${CLIQUES[k].name} 호감 +12).`, cls: 'ok' };
  }
  if (Math.random() < 0.5) {
    const it = giveItem(pick(GIFTS[p.faction]), { q: rint(55, 80) });
    return it ? { icon: 'ic_gift', title: '은혜 갚기', text: `${p.name}이(가) 문 앞에 ${itemName(it)}을(를) 놓고 아무 말 없이 떠났다.`, cls: 'ok' } : null;
  }
  const it = makeIntel('market');
  return it ? { icon: 'ic_secret', title: '은혜 갚기', text: `${p.name}이(가) 몰래 ${itemName(it)}을(를) 건네주었다.`, cls: 'ok' } : null;
}

// 护身符：大祸临头，你帮过的人出面保你一次
function savedByBenefactor(kind) {
  if (!S.flags.savior) return false;
  S.flags.savior--;
  if (kind === 'heat') { S.heat = 60; log('집법당이 너를 잡으러 오자 네가 도왔던 사람이 밤새 나서서 일을 덮었다.', 'gold'); }
  else if (kind === 'death') log('숨이 끊어지려는 찰나 호신부가 갑자기 뜨겁게 달아올랐다 — 네가 도왔던 사람이 의원을 불러 너를 저승 문턱에서 끌어냈다.', 'gold');
  else { earn(S.rentOwed, '네가 도왔던 사람이 대신 월세를 냈다.'); payRent(); }
  return true;
}

// ───────────── 每夜 ─────────────

function karmaTick() {
  const out = [];
  // 债到期
  for (const l of S.loans) {
    if (l.defaulted || l.due > S.day + 1) continue;
    const p = S.people[l.pid];
    if (!p || p.status !== 'alive') { l.defaulted = true; l.dead = true; continue; }
    if (!p.desperate && (p.budgetMul >= 0.6 || Math.random() < 0.4)) {
      earn(l.owe, `${p.name}이(가) 빚 ${l.owe} 영석을 갚았다.`);
      remember(p, '원금과 이자까지 네 빚을 모두 갚았다.', 0);
      l.paid = true;
      out.push({ icon: 'ic_ledger', title: '빚 회수', text: `${p.name}이(가) 원금과 이자를 합쳐 ${l.owe} 영석을 갚았다.`, cls: 'ok' });
    } else {
      l.defaulted = true;
      out.push({ icon: 'ic_ledger', title: '빚 떼먹기', text: `${p.name}이(가) 네게 빚진 ${l.owe} 영석을 갚지 못한다. [인물] 페이지에서 독촉할 수 있다.`, cls: 'warn' });
    }
  }
  S.loans = S.loans.filter(l => !l.paid && !l.dead);
  for (const p of Object.values(S.people)) {
    if (p.status !== 'alive') continue;
    // 苦力：替你干活，熬干了就是一具尸首
    if (p.indentured) {
      p.health -= 7;
      if (p.health <= 0) {
        die(p, `${p.name}이(가) 네 뒤뜰에서 과로사했다.`);
        giveItem('corpse', { fresh: 6 }); giveItem('soul_grudge');
        karmaShift(-5); adjustRep('ren', -3);
        out.push({ icon: 'ic_ledger', title: '고역꾼', text: `${p.name}이(가) 이 밤을 넘기지 못하고 뒤뜰에서 과로사했다. 시신과 원혼 한 가락이 네게 남았다.`, cls: 'bad' });
      }
      continue;
    }
    // 耳目：你接济过的人，在街头巷尾替你听着
    if (p.informant && Math.random() < 0.1) {
      const target = pick(Object.values(S.people).filter(t => t.status === 'alive' && t.secret && !t.secret.known && t !== p));
      const kind = target && Math.random() < 0.35 ? 'secret' : Math.random() < 0.7 ? 'market' : 'treasure';
      if (kind === 'secret') target.secret.known = true;
      const it = makeIntel(kind, { p: target });
      if (it) out.push({ icon: 'ic_secret', title: '귀와 눈', text: `${p.name}이(가) 쪽지 하나를 몰래 건넸다: ${itemName(it)}.`, cls: 'ok' });
    }
    // 你帮过的人，命也硬些；混出头的，才还得起大情
    if ((p.owed || 0) >= 3 && !p.story && Math.random() < 0.012) {
      const ev = LIFE[p.faction].find(e => e.id === 'rise');
      out.push({ icon: 'ic_ledger', title: '장터 소문', text: `네가 도왔던 ${applyLife(p, ev)}`, cls: 'ok' });
    }
    if ((p.owed || 0) >= 2 && !p.official && Math.random() < Math.min(0.06, p.owed * 0.008)) {
      const r = repay(p);
      if (r) out.push(r);
    }
  }
  // 天道偶尔也开眼：善名在外、没有恶名，越到后来越可能撞上大机缘
  if (S.virtue >= 50 && fateClean() && (strongEnough() || S.day >= 45) && Math.random() < 0.004 + Math.max(0, S.day - 30) * 0.0002) {
    const b = pick(BOONS.filter(b => !b.ok || b.ok()));
    b.run();
    out.push({ icon: 'ic_gift', title: '기연', text: fill(b.text, { n: '네가 이름조차 잊은 옛 사람' }), cls: 'ok' });
  }
  return out;
}
