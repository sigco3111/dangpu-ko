// 天下大势：历法周期（周 / 季 / 年）、四方关系与战事、世事与行情
'use strict';

// ───────────── 历法 ─────────────
// 一周七日，一季十二周，一年四季（三百三十六日）

const WEEK_LEN = 7, SEASON_LEN = 84, YEAR_LEN = 336;

const WEEKDAYS = [
  { name: '녹봉날', text: '오늘은 종문 녹봉날, 외문 제자들 주머니가 두둑하다.', budget: { mo: 1.3 } },
  { name: '장터날', text: '잡역 구역 장터가 열리고 범인들이 성 안으로 장보러 몰려든다.', traffic: { ren: 1.5 }, cats: { cai: -0.1, yin: 0.05 } },
  { name: '연기일', text: '연기방이 가마를 열어 사방에서 영재를 사들인다.', cats: { cai: 0.15, qi: 0.05 } },
  { name: '점호일', text: '집법당이 정례 점호를 하며 순찰이 유난히 부지런하다.', inspect: 1.4 },
  { name: '출단일', text: '단방에서 단약이 나와 약값이 조금 내린다.', cats: { dan: -0.1 } },
  { name: '비무일', text: '외문 비무가 열려 상처약과 법기가 잘 팔린다.', cats: { dan: 0.1, qi: 0.1, zhi: 0.1 } },
  { name: '귀시의 밤', text: '오늘 밤 귀시가 열린다. 진귀한 물건을 쟁여둘 기회, 집법당도 귀찮아 관여하지 않는다.', cats: { wan: 0.2, hun: 0.15, gu: 0.1 }, traffic: { xian: 1.4, yao: 1.3 }, inspect: 0.7 },
];

const SEASONS = [
  { name: '봄', growth: 1.4, rot: 1, cats: { cai: -0.12, zhi: -0.1, yin: 0.05 }, text: '봄이 오니 꽃이 피고 영초가 미친 듯 자라 영재 값이 떨어진다.' },
  { name: '여름', growth: 1.1, rot: 1.8, cats: { yin: 0.3, shi: -0.15, wan: -0.05 }, text: '몹시 더워 영음료가 귀하고 시신이 쉽게 썩는다.' },
  { name: '가을', growth: 0.9, rot: 1, cats: { yao: -0.2, yin: 0.1, hun: 0.2, gu: 0.1 }, text: '하늘 높고 요괴가 살찌는 계절, 요재가 넘치고 음기가 짙어져 혼백이 잘 팔린다.' },
  { name: '겨울', growth: 0.5, rot: 0.4, cats: { dan: 0.2, ju: 0.2, cai: 0.15, zhi: 0.3, yin: -0.1 }, text: '천지가 얼어붙어 단약과 영정이 귀하고 요족이 움츠러든다.', traffic: { yao: 0.5 } },
];

// 年度节令：按一年中的第几日
const ANNUAL = [
  { from: 1, to: 7, name: '개산제', text: '새해 개산제. 종문의 하사가 넉넉해 모두 주머니 사정이 좋다.', budget: { mo: 1.2, ren: 1.1 }, cats: { fu: 0.2 } },
  { from: 211, to: 217, name: '혈월제', text: '일 년에 한 번 혈월제. 혼백과 시신 값이 두 배로 뛴다.', cats: { hun: 0.6, shi: 0.3 } },
  { from: 330, to: 336, name: '종문 대비', text: '연말 종문 대비. 법기와 단약이 동이 났다.', cats: { qi: 0.45, dan: 0.25, fu: 0.2 } },
];

// Korean build: Arabic numerals everywhere
function cn(n) { return String(n); }

function calendar(day = S.day) {
  const i = day - 1;
  const year = Math.floor(i / YEAR_LEN) + 1, doy = i % YEAR_LEN + 1;
  const season = Math.floor((doy - 1) / SEASON_LEN), week = Math.floor(((doy - 1) % SEASON_LEN) / WEEK_LEN);
  return {
    year, doy, season, week, weekday: i % WEEK_LEN,
    text: `${SEASONS[season].name} · ${week + 1}주째 · ${WEEKDAYS[i % WEEK_LEN].name}`,
    yearText: `혈살력 ${300 + year}년`,
  };
}

const seasonOf = (day = S.day) => SEASONS[calendar(day).season];
const weekdayOf = (day = S.day) => WEEKDAYS[calendar(day).weekday];
const annualOf = (day = S.day) => { const d = calendar(day).doy; return ANNUAL.find(a => d >= a.from && d <= a.to) || null; };

// ───────────── 四方关系与战事 ─────────────

const RELATIONS = {
  xm: { name: '선마', w: 0.5, drift: 0.9, desc: '정마의 다툼, 전란의 근원' },
  my: { name: '마요', w: 0.2, drift: 0.55, desc: '마종이 요괴를 사냥해 단을 취하니 요족의 원한이 쌓인다' },
  xy: { name: '선요', w: 0.1, drift: 0.35, desc: '선문이 요괴 토벌을 명분으로 세를 넓힌다' },
  rm: { name: '인마', w: 0.2, drift: 0.5, desc: '마종이 인족을 착취하니 민심이 들끓는다' },
};

const WAR_STAGES = [
  { at: 0,  name: '대치', econ: 1,    supply: 1,    war: 0,    lux: 0,     inspect: 1,   levy: 0,   traffic: {},
    text: '사방에 암류가 요동치지만 잡역 구역은 그럭저럭 평온하다.' },
  { at: 22, name: '마찰', econ: 0.93, supply: 1.08, war: 0.25, lux: -0.08, inspect: 1.1, levy: 0,   traffic: { xian: 0.85 },
    text: '변경에서 충돌이 끊이지 않고 종문이 단약과 법기를 비축하기 시작했다.' },
  { at: 42, name: '개전', econ: 0.83, supply: 1.22, war: 0.7,  lux: -0.2,  inspect: 1.3, levy: 60,  traffic: { xian: 0.7, mo: 1.2, ren: 0.9 },
    text: '선마가 정식으로 개전했다. 전시 세금을 매주 걷고 전비 물자 값이 치솟는다.' },
  { at: 62, name: '대전', econ: 0.72, supply: 1.4,  war: 1.3,  lux: -0.35, inspect: 1.5, levy: 120, traffic: { xian: 0.55, mo: 1.3, ren: 0.75 },
    text: '전화가 들불처럼 번지고 요족까지 휘말리며 인족이 강제 징집된다. 모든 업종이 시들했는데 전쟁 장사만 성황이다.' },
  { at: 80, name: '대재앙', econ: 0.6,  supply: 1.65, war: 2.2,  lux: -0.5,  inspect: 1.8, levy: 200, traffic: { xian: 0.45, mo: 1.4, ren: 0.6, yao: 1.2 },
    text: '선문 대군이 국경을 짓누르고 혈살종이 풍전등화다. 영석이 혼주 하나만 못하고 태평성대의 보물은 한 푼 값어치도 없다.' },
];

const STAGE_TEXT = [
  null,
  '선문 제자가 변경에서 혈살종 상단 하나를 습격해 양쪽 모두 사상자가 났다. 종문이 전비 비축을 시작했다.',
  '혈살종 종주가 사람들 앞에서 선문 사자를 참수했다 — 선마 정식 개전! 잡역 구역에 방문이 붙었다: 매주 전시 세금을 걷는다.',
  '전선의 불길이 번지고 요족이 혼란을 틈타 습격하며 종문이 인족을 강제 징집한다. 장터의 사람이 나날이 줄어든다.',
  '선문 대군이 산문 앞까지 몰려와 호산 대진이 밤낮으로 윙윙거린다. 잡역 구역은 공포에 휩싸여 사람 목숨만 빼고 모든 것이 오른다.',
];

function initWorld() {
  S.world = S.world || { rel: { xm: 16, my: 10, xy: 8, rm: 12 }, stage: 0, shocks: [], fuel: 0, news: [] };
}

function tension() {
  return Math.round(Object.entries(RELATIONS).reduce((s, [k, r]) => s + S.world.rel[k] * r.w, 0));
}

function stageOf(t = tension()) {
  let st = 0;
  WAR_STAGES.forEach((s, i) => { if (t >= s.at) st = i; });
  return st;
}

const warStage = () => WAR_STAGES[S.world.stage];
const DIFF_DRIFT = { cozy: 0.75, normal: 1, hard: 1.15, doom: 1.3 };

function worldNews(text, cls = '') {
  S.world.news.push({ d: S.day, t: text, cls });
  if (S.world.news.length > 30) S.world.news.shift();
}

function addShock(cats, days, text) { S.world.shocks.push({ cats, until: S.day + days, text }); }

function nudge(rel) { for (const k in rel) S.world.rel[k] = clamp(S.world.rel[k] + rel[k], 0, 100); }

// 战备买卖为战火添柴：卖给魔宗的战备物资会推高仙魔对立
function fuelWar(it, price) {
  const w = ITEMS[it.id].war || 0;
  if (w) S.world.fuel += w * price / 400;
}

// ───────────── 行情 ─────────────

function catShift(cat, day = S.day) {
  const parts = [S.market.cats[cat] || 0, weekdayOf(day).cats && weekdayOf(day).cats[cat] || 0,
    seasonOf(day).cats[cat] || 0, (annualOf(day) || { cats: {} }).cats[cat] || 0];
  S.world.shocks.forEach(sh => { if (sh.until >= day) parts.push(sh.cats[cat] || 0); });
  return parts.reduce((a, b) => a + b, 0);
}

function marketMul(cat) { return Math.max(0.2, 1 + catShift(cat)); }

// 单件货物的行情倍率：周期、世事、战争与奢侈
function priceMul(id) {
  const d = ITEMS[id], st = warStage();
  return Math.max(0.15, (1 + catShift(d.cat)) * (1 + st.war * (d.war || 0)) * (1 + (d.lux ? st.lux : 0)));
}

// 行情构成，供界面展示
function priceBreakdown(id) {
  const d = ITEMS[id], st = warStage(), rows = [];
  const add = (name, v) => { if (Math.abs(v) >= 0.005) rows.push([name, v]); };
  add('오늘의 시세', S.market.cats[d.cat] || 0);
  add(weekdayOf().name, weekdayOf().cats && weekdayOf().cats[d.cat] || 0);
  add(`${seasonOf().name}철`, seasonOf().cats[d.cat] || 0);
  if (annualOf()) add(annualOf().name, annualOf().cats[d.cat] || 0);
  S.world.shocks.filter(sh => sh.until >= S.day && sh.cats[d.cat]).forEach(sh => add('세상사', sh.cats[d.cat]));
  add(`전황·${st.name}`, st.war * (d.war || 0));
  if (d.lux) add('세도 불황', st.lux);
  return rows;
}

// 客流：周期与战事改变各族来客
function trafficMul(f) {
  return ((weekdayOf().traffic || {})[f] || 1) * ((seasonOf().traffic || {})[f] || 1) * (warStage().traffic[f] || 1)
    * (S.flags.foxBlessing && f === 'yao' ? 1.4 : 1);
}

// 预算：发饷、节令与战时经济
function budgetMul(f) {
  return ((weekdayOf().budget || {})[f] || 1) * (((annualOf() || {}).budget || {})[f] || 1) * warStage().econ;
}

// ───────────── 世事 ─────────────

const WORLD_EVENTS = [
  { min: 0, w: 3, rel: { xm: 3 }, shock: [{ cai: 0.2 }, 4], text: '선문 제자가 변경에서 상단 하나를 습격해 영재가 들어오지 못한다.' },
  { min: 0, w: 2, rel: { my: 4 }, shock: [{ yao: -0.2, zhi: 0.15 }, 5], text: '만마굴의 요수가 폭동을 일으켜 사냥대가 수레째 요괴 시체를 끌고 돌아왔다.' },
  { min: 0, w: 2, rel: { rm: 3 }, heat: 4, text: '광산에서 인족 고역꾼 한 무리가 도망쳐 집법당이 집집마다 수색한다.' },
  { min: 1, w: 2, rel: { xm: 4 }, shock: [{ fu: 0.25 }, 4], heat: 5, text: '집법당이 선문 첩자 셋을 잡아 공개적으로 가죽을 벗겨 본보기로 삼았다. 모두가 제 몸 성할까 두려워한다.' },
  { min: 1, w: 2, requisition: true, text: '종문이 잡역 구역의 전비 물자 징발을 명했다. 징발사가 내일 집집마다 찾아온다.' },
  { min: 1, w: 1.5, rel: { my: 3, xy: 2 }, shock: [{ gu: 0.3, yao: 0.15 }, 5], text: '남강의 고사들이 북상해 마종에 전쟁용 고충 한 무리를 팔겠다고 한다.' },
  { min: 2, w: 2, rel: { xm: 5 }, shock: [{ dan: 0.3, zhi: 0.3 }, 5], text: '혈살종 대군이 출정해 단방이 밤낮으로 가마를 돌려도 수요를 못 따라간다.' },
  { min: 2, w: 2, rel: { xm: 6, rm: 3 }, shock: [{ dan: 0.4, zhi: 0.5, hun: 0.3 }, 4], text: '전선에서 대패해 부상병이 수레째 산문으로 실려 온다. 혈등과와 회기단이 구할 수 없을 만큼 귀하다.' },
  { min: 2, w: 1.5, rel: { my: 8, xy: -5 }, shock: [{ yao: 0.3 }, 6], text: '요족 한 갈래가 선문에 붙어 마종이 요단에 현상금을 걸었다.' },
  { min: 2, w: 1, rel: { xm: -8 }, shock: [{ qi: -0.15, dan: -0.15 }, 5], text: '선마 양쪽이 잠시 휴전하고 포로를 교환했다. 하지만 모두가 안다, 이건 숨 고르기일 뿐이라는 걸.' },
  { min: 2, w: 1.5, requisition: true, text: '전선이 급박하다. 징발사가 또 왔다.' },
  { min: 2, w: 1.5, heat: 8, shock: [{ dan: 0.1 }, 4], text: '종문이 전시 금령을 내렸다: 망우산을 사적으로 팔면 참수한다. 집법당 순찰이 두 배로 늘었다.' },
  { min: 3, w: 2, rel: { rm: 8 }, shock: [{ cai: 0.3 }, 5], heat: 10, text: '인족 고역꾼이 폭동을 일으켜 광산 절반을 불태웠다. 집법당이 눈이 뒤집혀 닥치는 대로 죽인다.' },
  { min: 3, w: 1.5, rel: { rm: 5, xm: 4 }, shock: [{ hun: 0.6, shi: 0.4 }, 5], text: '혈살종이 선문에 붙은 인족 성 하나를 도륙했다. 난장판 언덕이 새 시체로 가득하다.' },
  { min: 3, w: 1.5, shock: [{ ju: 0.5, yin: 0.4 }, 6], text: '선문이 영맥 하나를 끊어 영정과 영천 값이 치솟는다.' },
  { min: 4, w: 2, rel: { xm: 6 }, shock: [{ qi: 0.5, shi: 0.5, hun: 0.3 }, 5], text: '선문 대군이 국경을 짓누른다. 종문이 대가를 가리지 않고 철시, 괴뢰, 법기를 사들인다.' },
  { min: 4, w: 1.5, requisition: true, text: '호산 대진이 위태롭다! 종문이 모든 전비 물자를 강제 징발한다!' },
];

// 每夜推演天下大势，返回给夜间报告的条目
function worldTick() {
  const out = [];
  const k = DIFF_DRIFT[S.diff] || 1;
  for (const [key, r] of Object.entries(RELATIONS)) S.world.rel[key] = clamp(S.world.rel[key] + r.drift * k + rnd(-0.4, 0.6), 0, 100);
  if (S.world.fuel) { nudge({ xm: Math.min(3, S.world.fuel) }); S.world.fuel = 0; }
  S.world.shocks = S.world.shocks.filter(sh => sh.until >= S.day + 1);

  if (Math.random() < 0.16 + S.world.stage * 0.03) {
    const pool = WORLD_EVENTS.filter(e => S.world.stage >= e.min);
    const ev = weighted(pool.map(e => [e, e.w]));
    if (ev.rel) nudge(ev.rel);
    if (ev.shock) addShock(ev.shock[0], ev.shock[1], ev.text);
    if (ev.heat) addHeat(ev.heat);
    if (ev.requisition) startOfficial('requisition', 1);
    worldNews(ev.text);
    out.push({ icon: 'ic_war', title: '천하 대세', text: ev.text, cls: 'warn' });
  }

  const next = stageOf();
  if (next > S.world.stage) {
    S.world.stage = next;
    const t = STAGE_TEXT[next];
    worldNews(t, 'bad');
    out.push({ icon: 'ic_war', title: `전황·${WAR_STAGES[next].name}`, text: t, cls: 'bad' });
    rerollWarWishes();
  }
  return out;
}

// 周期性征收：开战后每周发饷日征战时捐；年终岁供
function periodicTick() {
  const cal = calendar(S.day + 1);
  if (cal.weekday === 0 && warStage().levy) startOfficial('levy', 1);
  if (cal.doy === YEAR_LEN) startOfficial('tribute', 1);
  if ((cal.doy - 1) % SEASON_LEN === 0 && S.day > 0) worldNews(`${SEASONS[cal.season].name}(이)가 시작되었다. ${SEASONS[cal.season].text}`);
}

// 下一个节令还有几日
function nextAnnual() {
  const doy = calendar().doy;
  const list = ANNUAL.map(a => ({ a, d: (a.from - doy + YEAR_LEN) % YEAR_LEN })).sort((x, y) => x.d - y.d);
  return list[0];
}

function levyAmount() { return Math.round(warStage().levy * diff().rent / 10) * 10; }
function tributeAmount() { return Math.round((150 + 120 * S.world.stage) * diff().rent / 10) * 10; }

// 今日的周期性说明（晨间展示）
function todayText() {
  const parts = [weekdayOf().text];
  const an = annualOf();
  if (an) parts.push(an.text);
  return parts.join('');
}
