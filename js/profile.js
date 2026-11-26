// 结局画像：按这一局的所作所为量出七样脾性，定个名号，再给下一局出主意
'use strict';

// 做得越多越高，越往上越难涨：做了 k 回约六成
const sat = (x, k) => 100 * (1 - Math.exp(-Math.max(0, x) / k));
// 两条路走通一条就算：好比两件事各有几成把握，至少成一件
const either = (a, b) => 100 - (100 - a) * (100 - b) / 100;

// 七样脾性，按蛛网图从正上方顺时针排；仁心与狠辣隔着半圈。
// 天天做的事按每日多少算，局长局短都能比；杀人这类一回就够分量的按总数算
function traitScores() {
  const st = S.stats, a = st.acts || {}, days = Math.max(1, S.day);
  const n = k => st[k] || 0, act = k => a[k] || 0;
  const eyed = Math.max(act('appraise'), st.appraisals) + act('inspect');
  const said = n('honest') + n('lies');
  const tech = Object.values(S.tech || {}).reduce((s, v) => s + v, 0);
  const heatMax = Math.max(n('heatMax'), S.heat), lens = Math.max(n('lensMax'), appraiseLevel());
  const list = [
    { id: 'trade', name: '장사 재능', basis: `거래 ${st.sales}건 · 하루 평균 수입 ${Math.round(st.income / days)}`,
      v: 0.45 * sat(st.sales / days, 2) + 0.35 * sat(st.income / days, 150) + 0.2 * sat((act('haggle') + act('flatter') + act('talk')) / days, 1.5) },
    { id: 'kind', name: '인심', basis: `선명 ${S.virtue}(${VIRTUE_NAME(S.virtue)}) · 진실 ${n('honest')}/${said}`,
      v: said ? 0.6 * S.virtue + 40 * n('honest') / said : S.virtue },
    { id: 'eye', name: '안목', basis: `감정·검품 ${eyed}회 · ${LENS_NAMES[lens]}`,
      v: 0.6 * sat((eyed + act('probe') * 0.5) / days, 0.8) + 0.4 * lens / (LENS_NAMES.length - 1) * 100 },
    { id: 'craft', name: '장인 정신', basis: `설비 ${S.machines.length}대 · 생산 ${n('made')}점`,
      v: 0.55 * sat(n('made') / days, 1.5) + 0.25 * sat(S.machines.length, 4) + 0.2 * sat(tech, 5) },
    { id: 'cruel', name: '악독', basis: `사람 목숨 ${n('kills')} · 거짓말 ${n('lies')} · 음험한 수 ${n('cruel') + act('soulmark')}`,
      v: either(sat(n('kills') * 4 + n('cruel') * 2 + act('soulmark') * 2, 8), sat((n('lies') + act('dispute') * 0.5 + act('command') * 0.5) / days, 0.6)) },
    { id: 'risk', name: '담력', basis: `뒤지기 ${act('dig')}회 · 장물·금물 ${n('hot')}점 · 주시 최고 ${heatMax}`,
      v: either(sat((act('dig') * 0.5 + act('market') * 1.5 + n('hot') * 0.6) / days, 1.2), heatMax * 0.8) },
    { id: 'power', name: '권세', basis: `${realmName()} · 세력 ${playerPower()}${S.cliques.joined ? ` · ${CLIQUES[S.cliques.joined].head} 문하에 몸담음` : ''}`,
      v: 0.45 * playerPower() + 0.45 * (S.cult.lv - 1) / (REALMS.length - 2) * 100 + (S.cliques.joined ? 10 : 0) },
  ];
  list.forEach(t => { t.v = Math.round(clamp(t.v, 0, 100)); });
  return list;
}

// 名号：最突出的一样；第二样也不弱、又挨得近，就看两样合起来像什么人
const ARCHETYPES = {
  trade: ['철주판', '일전일리 모두 장부에 올리고 자기 목숨까지 밑천으로 계산한 사람.'],
  kind: ['살아있는 보살', '모두가 너의 좋은 점을 얘기한다. 아쉽게도 좋은 평판으로 월세를 낼 수는 없었다.'],
  eye: ['감정에 미친 자', '조요경으로 천하의 위작은 다 비춰봤지만 이 세도만은 비춰내지 못했다.'],
  craft: ['백 가지 솜씨의 장인', '공방의 설비가 밤새 멈추지 않았고 전당포는 부업처럼 보였다.'],
  cruel: ['흑심 주인장', '카운터 아래 깔린 것은 장부가 아니라 사람 목숨이었다.'],
  risk: ['망나니', '난장판이 자기 카운터보다 익숙한 사람.'],
  power: ['동네 큰손', '잡역 구역의 풀잎 스치는 소리도 먼저 네 귀를 거친다.'],
};
const PAIR_ARCHETYPES = {
  'cruel+trade': ['웃는 얼굴의 간상', '웃으며 손님을 맞고 돌아서서 위작을 진품으로 팔았다. 이웃들은 네가 후덕하다 했다 — 그렇게 말한 사람들이 아직 모를 뿐.'],
  'kind+trade': ['양심 주인장', '값을 공정하게 받고 아이와 노인을 속이지 않으며 고된 돈을 벌었다. 이 세도는 도리를 말하지 않는데 너만은 지켰다.'],
  'eye+trade': ['금안 감정사', '들어오는 물건은 한눈에 거품을 가늠했고 깎아도 상대가 수긍하게 깎았다.'],
  'craft+trade': ['앞가게 뒷공방', '밤에는 가마 불이 꺼지지 않고 낮에는 카운터가 쉴 새 없어, 가게는 영석을 삼키고 영석을 토하는 기계가 되었다.'],
  'risk+trade': ['투기꾼', '싼 곳이 있으면 어디든 파고들었다. 버는 것도 빨랐고 잃는 것도 빨랐다.'],
  'power+trade': ['대주인장', '장사가 이쯤 되면 더 이상 장사만은 아니다.'],
  'cruel+kind': ['두 얼굴의 사람', '낮에는 죽을 베풀고 밤에는 사람을 묻었다. 선명도 목숨도 장부에 올랐다, 각기 다른 칸에.'],
  'cruel+risk': ['목숨을 건 마수', '칼날의 피를 핥는 데 익숙해졌고 집법당 명부에 네 이름은 갈수록 굵어졌다.'],
  'cruel+power': ['잡역 구역의 좌주', '네 빚을 질 감히 있는 사람도, 갚지 않을 감히 있는 사람도 없었다.'],
  'eye+risk': ['줍줍꾼', '난장판에서 보물을 파내고 귀시에서 진가를 한눈에 가렸다. 남들이 폐품이라 한 것이 네 손에서는 보물이 되었다.'],
  'eye+kind': ['정직한 감정사', '진짜는 진짜, 가짜는 가짜. 네 입에서 나온 말은 조요경보다 정확했다. 아쉽게도 진실은 값이 안 나갔다.'],
  'kind+power': ['일방의 선인', '잡역 구역 사람들은 일이 생기면 먼저 너를 찾았고 너는 정말로 나섰다 — 네 주머니에 한 푼 남지 않을 때까지.'],
  'craft+eye': ['솜씨 좋은 장인', '네가 만든 물건은 네가 검증했다. 위작은 네 문을 들어오지도, 네 가마에서 나오지도 못했다.'],
  'craft+cruel': ['사도의 연사', '가마에서 무엇을 태우는지는 묻지 않는 게 좋다.'],
};

function archetype(sc) {
  const [a, b] = sc.slice().sort((x, y) => y.v - x.v), st = S.stats, act = st.acts || {};
  const busy = (st.sales + Math.max(act.appraise || 0, st.appraisals) + (act.dig || 0) + (st.made || 0)) / Math.max(1, S.day);
  if (a.v < 25 || busy < 0.5) return { name: '무색무취', text: '와서 문을 열고 월세를 냈다. 잡역 구역 누구도 너를 기억하지 못한다.', top: a };
  const pair = b.v >= 40 && a.v - b.v <= 15 && PAIR_ARCHETYPES[[a.id, b.id].sort().join('+')];
  const [name, text] = pair || ARCHETYPES[a.id];
  return { name, text, top: a, also: !pair && b.v >= 40 ? b : null };
}

// 下一局：先说这局栽在哪，再补最弱的两样（善恶是你自己选的，狠辣不算短板），最后荐一个没走过的出身
const CAUSE_TIPS = {
  rent: st => `월세는 이레마다 오르고 한 번에 삼 할 가까이 오른다${st.late ? `. 이번 판에 월세를 ${st.late}번 밀렸다` : ''}. 맞는 물건을 진열장에 올려 손님을 끌고, 살 때는 깎고 팔 때는 올려라. 돈이 급하면 유예 기간의 가산금을 기다리기보다 아끼는 물건을 미리 행상에게 파는 게 낫다.`,
  heat: st => `집법당 주시가 한때 ${Math.max(st.heatMax || 0, S.heat)}까지 갔다. 금물은 이중 바닥 은닉 칸에 넣고 진열장에 올리지 마라. 선문과의 거래도 줄이고, 순찰이 오면 영석을 쥐여주는 편이 들키는 것보다 싸다.`,
  death: () => '상처와 독이 네 목숨을 앗았다. 다친 몸으로 폐품을 주우러 나가지 마라. 뒤질수록 위험하다. 상처와 독을 치료할 단약을 몇 알 챙기거나 [인물] 페이지에서 의원을 찾아라.',
  lovegu: () => '정고를 심는 순간 그녀의 목숨은 네 목숨이다. 그녀를 지켜라: 싸움에 휘말리게 하지 말고 다치고 중독된 채 방치하지 마라 — 아니면 다음 판에는 이 목숨을 남에게 맡기지 마라.',
  deed: () => S.diff === DIFFICULTIES[DIFFICULTIES.length - 1].id
    ? '마겁의 세도조차 너는 버텨냈다 — 다만 가게 문서를 손에 넣은 날, 너는 처음 왔을 때처럼 빈털터리였다. 다른 신분을 골라 다른 삶을 살아봐라.'
    : `가게 문서는 손에 넣었지만 영석과 물건도 함께 넘겼다. 다음엔 더 험한 세도에 도전해봐라(${DIFFICULTIES[DIFFICULTIES.findIndex(d => d.id === S.diff) + 1].name}).`,
};
const TRAIT_TIPS = {
  trade: '진열장이 어떤 손님이 올지 결정한다: [진열] 페이지의 고객층을 보고 그들이 원하는 물건을 올려라. 거래판에서 한 번에 여러 물건을 흥정하면 안 팔리는 물건도 끼워 팔 수 있다.',
  kind: '사실대로 말하고 공정하게 거래하고 찾아와 돕기를 청하는 사람을 구제하면 선명이 오른다. 도운 사람은 너를 기억하고, 드물게 그 보답이 네 목숨을 구한다.',
  eye: '사들이기 전에 먼저 검품하고 감정하라. 감보대를 더 좋은 조요경으로 바꾸면 창고의 묵은 물건도 다시 정체를 드러낸다.',
  craft: '공방에 설비를 한 대 들이면 밤에 네가 정좌하는 동안 스스로 물건을 만든다. 비급을 익히면 결과물이 더 좋아진다.',
  risk: '밤에 한 번 나가봐라: 폐품 줍기로 좋은 물건을 건질 수 있고 귀시가 열리는 밤에 들여오면 집법당 눈도 피한다.',
  power: '파벌에 붙고 단골과 교분을 쌓고 단약을 복용해 경지를 올리면 세력이 오른다 — 세가 커지면 손해 본 사람도 쓴웃음만 삼킨다.',
};
const TRAIT_STARTS = {
  trade: ['apprentice', 'water'], kind: ['water', 'apprentice'], eye: ['fence', 'digger'], craft: ['smith', 'alchemist', 'talisman'],
  cruel: ['fence', 'corpse'], risk: ['digger', 'fence'], power: ['corpse', 'nothing'],
};

function nextTips(sc) {
  const tips = [];
  const cause = S.over.cause || (S.over.win ? 'deed' : 'death');
  tips.push({ head: S.over.win ? '다음 수' : '패인', text: CAUSE_TIPS[cause](S.stats) });
  const weak = sc.slice().sort((x, y) => x.v - y.v).filter(t => t.v < 40 && t.id !== 'cruel').slice(0, 2);
  weak.forEach(t => tips.push({ head: `보완: ${t.name}`, text: TRAIT_TIPS[t.id] }));
  const want = (weak[0] || sc.slice().sort((x, y) => x.v - y.v)[0]).id;
  const start = TRAIT_STARTS[want].map(id => STARTS.find(s => s.id === id)).find(s => s && s.id !== S.start);
  if (start) tips.push({ head: '다른 신분', text: `[${start.name}]: ${start.desc}` });
  return tips;
}

// 家底走势：每夜结算时的灵石，再补上收场那一刻
function wealthSeries() {
  const pts = S.stats.days.map(d => ({ day: d.day, v: d.stones }));
  if (pts.length && pts[pts.length - 1].day === S.day) pts.pop();
  pts.push({ day: S.day, v: S.stones });
  return pts;
}
