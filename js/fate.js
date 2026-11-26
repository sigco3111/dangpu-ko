// 因果：恶事是一场赌。每做一桩恶事，就欠下一笔孽债，几日后见分晓——五五开，要么风平浪静，要么报应上门。
// 报应要赔的本金随你累计的恶行滚着涨：头几桩赔得起，做多了总有赔不起的一天（爆仓：抄货、挨打、执法堂盯上）。
// 报应由苦主本人或亲友、同族上门讨；败露多了恶名在外，机遇跟着断：来客变少、托付的人不上门、好报不再来。
// 行善能冲淡旧孽，隔一阵子不作恶，孽也会淡——一味行善赚得慢，一味作恶迟早爆仓，要在两头之间拿捏。
// 这是魔门：坑蒙拐骗、卖人求赏是家常便饭，没有天道替谁伸冤。开头小恶没人当回事；铺子做大了，盯着你的人就多了
'use strict';

const FATE_ODDS = 0.5;          // 一笔孽债败露的机会
const FATE_GROW = 1.18;         // 每作一分恶，往后的本金翻这么多
const FATE_WAIT = [3, 9];       // 几日后见分晓
const FATE_FADE = 21;           // 多少日不作恶，旧孽淡去一分
const FATE_MERIT = 8;           // 积多少善（接济、放人、护人……），抵去一分旧孽
// 世道对恶的容忍：作这么多分恶，才算一分孽；恶名的门槛也高这么多倍。开头宽、越往后越紧：
// 第 FATE_TOL_DAYS[0] 日前是 FATE_TOL[0]，到第 FATE_TOL_DAYS[1] 日降到 FATE_TOL[1]
const FATE_TOL = [3, 2], FATE_TOL_DAYS = [30, 90];
function fateTolerance(day = S.day) {
  const f = clamp((day - FATE_TOL_DAYS[0]) / (FATE_TOL_DAYS[1] - FATE_TOL_DAYS[0]), 0, 1);
  return FATE_TOL[0] + (FATE_TOL[1] - FATE_TOL[0]) * f;
}

// 恶行的种类：报应从哪儿来、怎么来
const SINS = {
  fraud:  { name: '사기', who: '네게 속아 손해 본 원한의 주인', how: ['무리를 몰아 가게 문 앞을 막고 항의했다', '고발장 한 장을 집법당에 접수했다', '불량배 몇을 불러 "따지러" 찾아왔다'] },
  betray: { name: '배신', who: '네가 배신한 사람의 옛 지인', how: ['누가 밀고했는지 알아내고 밤에 찾아왔다', '사람을 시켜 말을 흘렸다: 이 빚은 언젠가 받아내겠다고', '골목 어귀에서 너를 기다렸다'] },
  fence:  { name: '장물 취급·비호', who: '집법당', how: ['장물을 따라 네 가게까지 찾아와 추징했다', '옛 장부를 뒤져 삼킨 것을 원금에 이자까지 토해내라 했다'] },
  harm:   { name: '해인', who: '원한을 품은 이의 혈육', how: ['상복을 입고 가게에 들이닥쳤다', '칼을 들고 원수를 갚으러 찾아왔다', '네 물독 곁에서 사흘 밤을 지켰다'] },
};
const KIN = { ren: '동향인', mo: '같은 문파 사형제', yao: '족인', xian: '사문' };

function initFate() {
  S.fate = Object.assign({ n: 0, debts: [], infamy: 0, merit: 0, last: 0, total: 0, erupted: 0, buried: 0, busts: 0, patrons: 0 }, S.fate || {});
}

// 一笔恶事若败露要赔的本金：分量越重、日子越往后、作恶越多越大；后期涨得越来越快
const fateBase = () => 40 + 4 * S.day + S.day * S.day / 20;
function fateStake(w = 1) { return Math.round(w * fateBase() * Math.pow(FATE_GROW, S.fate.n / fateTolerance()) / 10) * 10; }

// 选项提示：这是一桩恶事，赌注多大
const sinHint = ([kind, w]) => `악행(${SINS[kind].name}): 절반은 들통나고, 들통나면 약 ${fateStake(w)} 영석을 배상한다. 이후 악행의 원금도 함께 불어난다`;

// 作了一桩恶：欠下孽债。w 是分量（1 小恶 / 2 出卖销赃 / 3 害命），virtue 是顺带扣的善名
function commitSin(kind, { p = null, w = 1, what = '', virtue = 0 } = {}) {
  initFate();
  const F = S.fate, stake = fateStake(w);
  F.n += w; F.last = S.day; F.total++;
  if (virtue) karmaShift(-virtue);
  F.debts.push({ kind, w, stake, what, day: S.day, due: S.day + rint(FATE_WAIT[0], FATE_WAIT[1]),
    pid: p ? p.pid : null, name: p ? p.name : null, faction: p ? p.faction : null });
  log(`이 악행(${SINS[kind].name})을 기록했다: 며칠 안에 결과가 나오고, 들통나면 약 ${stake} 영석을 배상해야 한다.`, 'warn');
  return stake;
}

// 行善冲淡旧孽：有分量的善事（n ≥ 2）才算；头一回真心帮某个人，他还会给你荐来客人
function fateMerit(p, n) {
  initFate();
  const F = S.fate;
  if (n < 2) return;
  F.merit += n;
  while (F.merit >= FATE_MERIT && F.n > 0) { F.merit -= FATE_MERIT; F.n = Math.max(0, F.n - fateTolerance()); }
  if (p && !p.official && !p.patron) { p.patron = true; F.patrons++; }
}

// ───────────── 恶名：机遇断了 ─────────────

const fateInfamy = () => (S.fate ? S.fate.infamy : 0);
// 托付、求助、报恩的人还肯不肯上门
const fateTrusted = () => fateInfamy() < 4 * fateTolerance();
// 恶名在外，来客变少
const fateCustomerLoss = () => fateInfamy() >= 8 * fateTolerance() ? 2 : fateInfamy() >= 4 * fateTolerance() ? 1 : 0;
// 恶名让客人压价
const infamyDiscount = () => Math.min(0.2, fateInfamy() * 0.025 / fateTolerance());
// 名声还算干净：好报、奇遇还会找上门
const fateClean = () => fateInfamy() < fateTolerance();

// ───────────── 善名：口碑与熟客 ─────────────

// 口碑：老实人的铺子，客人肯多出些（善名到七十就到顶，再往上只是花钱买名声）；恶名让人压价
function trustMul() { return 1 + clamp((S.virtue - 20) / 400, 0, 0.125) - infamyDiscount(); }
// 熟客：善名在外多一位；真心帮过五个人，他们荐来的客人再多一位
const patronBonus = () => (S.virtue >= 45 ? 1 : 0) + Math.min(1, Math.floor((S.fate ? S.fate.patrons : 0) / 5));

// ───────────── 每夜：见分晓 ─────────────

function fateTick() {
  initFate();
  const F = S.fate, out = [];
  // 隔一阵子不作恶，旧孽淡一分
  if (F.n > 0 && S.day - F.last >= FATE_FADE) { F.n = Math.max(0, F.n - fateTolerance()); F.last = S.day; }
  const due = F.debts.filter(d => d.due <= S.day);
  F.debts = F.debts.filter(d => d.due > S.day);
  for (const d of due) {
    if (Math.random() >= FATE_ODDS) {
      F.buried++;
      out.push({ icon: 'ic_secret', title: '인과', text: `${d.what ? `"${d.what}" 그 일` : `그 ${SINS[d.kind].name} 건`} — 점차 아무도 언급하지 않게 되었다. 이번 판은 네가 이겼다.`, cls: 'ok' });
      continue;
    }
    out.push(retribution(d));
    if (S.over) break;
  }
  return out;
}

// 报应：谁来讨、讨多少、赔不起会怎样
function retribution(d) {
  const F = S.fate, K = SINS[d.kind];
  F.erupted++;
  const p = d.pid && S.people[d.pid];
  const who = d.kind === 'fence' ? K.who : p && p.status === 'alive' ? p.name : d.name ? `${d.name}의 ${KIN[d.faction] || '친구'}` : K.who;
  const paid = payDebt(d.stake);
  F.infamy += d.w;
  if (d.faction) adjustRep(d.faction, -d.w);
  let text = `${d.what ? `"${d.what}"의 일` : `그 ${K.name} 건`}이(가) 들통났다: ${who} — ${pick(K.how)}. 배상금 ${d.stake} 영석`
    + (paid.cash ? `, 네가 ${paid.cash} 영석을 내놓았고` : '') + (paid.seized.length ? `, 다시 압수당했다: ${paid.seized.slice(0, 4).join('、')}${paid.seized.length > 4 ? `외 ${paid.seized.length}점의 물건` : ''}` : '') + '。';
  if (paid.rest > 0) {
    // 爆仓：赔不起的那部分，拿人来抵
    F.busts++;
    const heat = Math.min(40, Math.round(paid.rest / 25));
    addHeat(heat);
    text += `${paid.rest} 영석이 모자라 갚지 못했다. 너는 일어나지 못할 만큼 두들겨 맞았고, 집법당 주시 +${heat}.`;
    addCond('me', 'injured', 2, '업보 빚을 갚지 못해 사람들이 찾아와 두들겨 팼다');
  }
  text += '악명이 조금 더 퍼졌다.';
  return { icon: 'ic_heat', title: '응보', text, cls: 'bad' };
}

// 先掏灵石，不够就抄货（挑最值钱的），还不够的就是窟窿
function payDebt(amount) {
  const cash = Math.min(Math.max(0, S.stones), amount);
  if (cash) spend(cash, `업보 배상 ${cash} 영석.`);
  let rest = amount - cash;
  const seized = [];
  if (rest > 0) {
    const goods = Object.values(S.items).filter(it => it.pos && ['store', 'display', 'floor', 'hidden'].includes(it.pos.g))
      .sort((a, b) => knownValue(b) - knownValue(a));
    for (const it of goods) {
      if (rest <= 0) break;
      rest -= knownValue(it); seized.push(itemName(it)); destroyItem(it);
    }
  }
  return { cash, seized, rest: Math.max(0, rest) };
}
