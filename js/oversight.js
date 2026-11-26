// 监管：违禁品不得陈列，管事路过会看见，客人会举报；管理者按交情视而不见、敲竹杠或上报。
// 巡查头天夜里就定下了，交情够的人会提前捎来风声
'use strict';

const isBanned = it => !!(ITEMS[it.id].contra || ITEMS[it.id].illicit);
const bannedShown = () => itemsIn('display').filter(isBanned);

// 管理者对你的容忍：看交情、收过多少好处、贪念与操守，也看你的势力
function tolerance(p) {
  if (!p || p.status !== 'alive') return 'report';
  if (p.controlled || p.loveGu || S.flags.chenShelter || (isLawman(p) && S.flags.enforcerOwned)) return 'ignore';
  const score = p.aff + (p.bribes || 0) * 8 + p.greed * 30 - p.integrity * 50 + (playerPower() - npcPower(p)) * 0.2;
  // 清官不收黑钱：要么网开一面，要么公事公办
  if (p.integrity >= 0.7) return score >= 50 ? 'ignore' : 'report';
  return score >= 50 ? 'ignore' : score >= 5 ? 'shakedown' : 'report';
}
const TOLERANCE_NAME = { ignore: '못 본 척', shakedown: '기회를 틈타 갈취', report: '집법당에 보고' };

function bannedStake() { return 30 + Math.round(bannedShown().reduce((s, it) => s + claimedValue(it) * 0.5, 0)); }

function inspectVisitor() {
  const e = official('enforcer');
  return { kind: 'inspect', faction: 'mo', portrait: e.portrait, name: e.name, title: e.title, pid: e.pid };
}

// 当天就来：举报坐实或管事告发
function inspectNow() {
  if (S.queue.some(c => c.kind === 'inspect') || (S.customer && S.customer.kind === 'inspect')) return;
  S.queue.splice(Math.min(2, S.queue.length), 0, inspectVisitor());
}

// ───────────── 巡查排期与风声 ─────────────

// 夜里定下明日是否巡查
function planInspection() {
  const p = clamp(S.heat / 100, 0, 0.9) * diff().inspect * (S.market.heat || 1) * 0.55 * S.flags.inspectMul
    * (weekdayOf().inspect || 1) * warStage().inspect;
  let reason = null;
  if (S.flags.forceInspect) { reason = '누군가 집법당에 고발장을 넣었다'; S.flags.forceInspect = false; }
  else if (S.flags.reported) { reason = S.flags.reported; }
  else if (Math.random() < p) reason = weekdayOf().inspect > 1 ? '점호 검사' : '정기 순찰';
  S.flags.reported = null;
  S.plan = { day: S.day, inspect: !!reason, reason, tipped: null };
}

// 谁会给你通风报信：[人, 几率]
function informants() {
  const out = owedInformants(), e = S.people.enforcer;
  if ((S.flags.spyUntil || 0) >= S.day) {
    const spy = Object.values(S.people).find(p => p.pid === S.flags.spyBy);
    if (spy && spy.status === 'alive') out.push([spy, 1]);
  }
  if (e && e.status === 'alive' && (e.aff >= 45 || (e.bribes || 0) >= 2)) out.push([e, 0.8]);
  const amu = S.people.amu;
  if (amu && amu.status === 'alive' && amu.portrait === 'amu_disciple' && amu.aff >= 30) out.push([amu, 0.85]);
  if (thugAlly()) out.push([S.people.thug, 0.6]);
  const ll = landlordPerson();
  if (ll && ll.status === 'alive' && ll.aff >= 35 && ll.integrity < 0.5) out.push([ll, 0.6]);
  for (const p of Object.values(S.people)) {
    if (p.story || p.official || p.status !== 'alive' || p.aff < 50 || S.day - p.lastDay > 10) continue;
    if (p.faction === 'mo' || p.faction === 'ren') out.push([p, p.faction === 'mo' ? 0.3 : 0.15]);
  }
  return out;
}

const TIP_LINES = {
  enforcer: '려한이 어린 제자 하나를 보내 한마디 남겼다: "내일 네 가게에 들를 테니 깨끗이 치워두어라."',
  amu: '아목이 밤을 틈타 뒷창을 두드렸다: "주인장, 내일 집법당이 이 거리를 뒤집니다. 미리 대비하세요."',
  thug: '류라자의 부하가 뛰어와 알렸다: "주인장, 집법당 놈들이 내일 옵니다!"',
};

// 夜间报告里的风声
function tipOff() {
  if (!S.plan || !S.plan.inspect) return null;
  for (const [p, ch] of informants()) {
    if (Math.random() >= ch) continue;
    S.plan.tipped = p.name;
    const text = TIP_LINES[p.pid] || `${p.name}이(가) 몰래 소식을 전했다: 내일 집법당이 순찰을 온다(${S.plan.reason}).`;
    return { icon: 'ic_heat', title: '소문', text: `${text}가게를 열기 전에 금물과 장물을 진열장에서 치워두자.`, cls: 'warn' };
  }
  return null;
}

// 白天的熟客也可能顺口提一句
function customerTip(c) {
  if (!S.plan || !S.plan.inspect || S.plan.tipped || !S.queue.some(x => x.kind === 'inspect')) return false;
  S.plan.tipped = c.name;
  return true;
}

// ───────────── 管事路过与客人举报 ─────────────

// 开铺时：管事路过，看见陈列的违禁品
function overseeDisplay() {
  const banned = bannedShown();
  if (!banned.length || Math.random() > 0.6) return;
  const m = landlordPerson(), names = banned.map(itemName).join(', ');
  const t = tolerance(m);
  if (t === 'ignore') { log(`${m.name}이(가) 진열장을 지나며 ${names}을(를) 힐끗 보았지만 아무 말도 하지 않았다.`, 'gain'); return; }
  if (t === 'shakedown') { startStory(`ov_${S.day}_${m.pid}`, 'oversight', 'shakedown', 0, { pid: m.pid, items: names }); return; }
  log(`${m.name}이(가) 네가 진열한 ${names}을(를) 보고 얼굴을 굳히더니 집법당으로 향했다.`, 'loss');
  remember(m, `네가 ${names}을(를) 버젓이 진열한 것을 보았다.`, -5);
  addHeat(6);
  inspectNow();
}

// 客人看见陈列的违禁品：交情差的会去举报（仙门的人自己就是冲着它来的，不会举报）
function maybeReport(c) {
  const p = personOf(c);
  if (!p || c.faction === 'xian' || !bannedShown().length) return;
  const ch = clamp((-p.aff - 5) / 90, 0, 0.55) + (c.faction === 'mo' ? 0.05 : 0) + (p.integrity > 0.5 ? 0.1 : 0);
  if (Math.random() >= ch) return;
  S.reports = S.reports || [];
  S.reports.push({ pid: p.pid, name: p.name, items: bannedShown().map(itemName).join(', '), day: S.day });
  remember(p, '네가 금물을 진열한 일을 집법당에 알렸다.', -3);
  c.reporting = true;
}

// 夜里：执法堂处置举报
function resolveReports() {
  const out = [];
  const list = S.reports || [];
  S.reports = [];
  if (!list.length) return out;
  const e = official('enforcer'), t = tolerance(e), who = list.map(r => r.name).join(', ');
  if (t === 'ignore') {
    out.push({ icon: 'ic_heat', title: '고발', text: `${who}이(가) 네 금물 진열을 집법당에 고발했다더군. ${e.name}이(가) 고발장을 덮어두고 쳐다보지도 않았다.`, cls: 'ok' });
  } else if (t === 'shakedown') {
    startStory(`ov_rep_${S.day}`, 'oversight', 'shakedown', 1, { pid: e.pid, items: list[0].items, reported: who });
    out.push({ icon: 'ic_heat', title: '고발', text: `${who}이(가) 너를 집법당에 고발했다. ${e.name}은(는) 고발장을 품에 넣었다 — 보아하니 먼저 너와 '얘기'를 나눌 모양이다.`, cls: 'warn' });
  } else {
    S.flags.reported = `${who}이(가) 네 금물 진열을 고발했다`;
    addHeat(5);
    out.push({ icon: 'ic_heat', title: '고발', text: `${who}이(가) 네 금물 진열을 집법당에 고발했고, ${e.name}이(가) 고발장을 받아들였다.`, cls: 'bad' });
  }
  return out;
}

// ───────────── 敲竹杠 ─────────────

Object.assign(STORIES, {
  oversight: {
    nodes: {
      shakedown: {
        when: 'day',
        who: st => { const p = S.people[st.flags.pid]; return { name: p.name, portrait: p.portrait, title: p.title, faction: p.faction, pid: p.pid }; },
        cond: st => S.people[st.flags.pid].status === 'alive',
        text: st => {
          const f = st.flags, p = S.people[f.pid];
          const lead = f.reported ? `${p.name}이(가) 품에서 고발장 한 장을 꺼내 네 눈앞에서 흔들었다: "${f.reported}. 네가 ${f.items}을(를) 버젓이 진열했다는군."`
            : `${p.name}이(가) 가게로 거들먹거리며 들어와 진열장 앞에 멈춰 서서 손가락 마디로 장문을 두드렸다: "${f.items}... 쯔쯔, 겁도 없군."`;
          return `${lead}\n“这事嘛，可大可小。”${ta(landlordPerson())}压低了声音，“我可以当没看见——就看你懂不懂事了。”`;
        },
        choices: st => {
          const p = S.people[st.flags.pid], stake = bannedStake();
          return [
            ...bribeChoices(p, stake, (n, ok) => ok
              ? { text: `${p.name}이(가) 영석을 소매에 챙기고 네 어깨를 툭툭 두드렸다: "나는 아무것도 못 봤다."`, end: true }
              : (inspectNow(), { text: `"겨우 이거야?" ${p.name}이(가) 냉소했다. "그럼 공무대로 처리하지." 집법당 사람들이 곧 도착한다.`, end: true }), '입막음'),
            { label: '그 자리에서 치운다', hint: '금물을 창고로 거둔다; 그가 네가 눈치 있음을 기억한다', run: () => {
              const moved = bannedShown().filter(it => autoPlace(it));
              remember(p, '너는 그가 보는 앞에서 금물을 치웠다.', 2);
              return { text: `너는 ${moved.map(itemName).join(', ') || '물건들'}을(를) 거둬들였다. ${p.name}은(는) 콧방귀를 뀌었다: "이번만 봐준다."`, end: true };
            } },
            { label: '모르는 척한다', hint: '그는 아마 보고할 것이다', run: () => {
              remember(p, '너는 그의 앞에서 모르는 척했다.', -8);
              if (tolerance(p) === 'ignore') return { text: `${p.name}이(가) 너를 한참 노려보다가 고개를 저으며 떠났다.`, end: true };
              inspectNow(); addHeat(5);
              return { text: `"좋아, 모르는 척이라는 거지." ${p.name}이(가) 돌아서 나갔다. 반 시진도 안 되어 집법당 사람들이 왔다.`, end: true };
            } },
          ];
        },
      },
    },
  },
});
