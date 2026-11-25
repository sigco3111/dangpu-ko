// 作伪与鉴定：技艺与秘籍、作伪台、拆解研究、验货压价；卖出的假货与人心向背（见风使舵）
'use strict';

function initForgery() {
  S.tech = S.tech || {};
  S.forgeKnown = S.forgeKnown || {};
  S.sold = S.sold || [];
  if (!S.grids.tool) {
    S.grids.tool = { w: 1, h: 1 };
    const lens = makeItem('lens1', { q: 60 });
    placeItem(lens, 'tool', 0, 0);
  }
}

// ───────────── 技艺 ─────────────

const techLv = t => (S.tech && S.tech[t]) || 0;
const TECH_Q = { refine: 8, alchemy: 8, soul: 8, corpse: 8, puppet: 10, plant: 6, brew: 10 };

function techOf(type) { return Object.keys(TECHS).find(t => TECHS[t].machines.includes(type)); }
function techBonus(type) { const t = techOf(type); return t ? techLv(t) * (TECH_Q[t] || 0) : 0; }
function wispsPerPearl() { return techLv('soul') >= 2 ? 2 : 3; }

// 研读秘籍：须循序渐进
function readBook(it) {
  const b = ITEMS[it.id].book, cur = techLv(b.tech), name = TECHS[b.tech].name;
  if (b.lv <= cur) return `${name} 제${cn(b.lv)}중은 이미 통달했다.`;
  if (b.lv > cur + 1) return `먼저 ${name} 제${cn(cur + 1)}중을 통달해야 이 책을 읽을 수 있다.`;
  learnTech(b.tech, b.lv, b.teach);
  destroyItem(it);
  log(`네가 ${ITEMS[it.id].name}을(를) 탐독해 ${name} 술이 제${cn(b.lv)}중으로 올랐다.`, 'gold');
  return null;
}
function learnTech(t, lv, teach) {
  S.tech[t] = lv;
  (teach || []).forEach(x => { S.forgeKnown[x] = Math.max(S.forgeKnown[x] || 0, lv); });
}

// ───────────── 机遇：三四重 ─────────────

// 三四重鬼市不卖：除了拿功勋换，就是等机遇——行家登门传艺、拾荒偶得（scavSearch）、好人好报（BOONS）
// 你眼下正缺、货郎又不卖的那几本：每门技艺的下一重
const nextBooks = () => BOOKS.filter(([, t, lv]) => lv > BOOK_SHOP_MAX && lv === techLv(t) + 1);

// 传艺：哪位行家与你亲厚了、自己那桩事也了了，就揣着手抄登门
const teachKey = (t, lv) => `teach_${t}${lv}`;
const teachBook = (t, lv) => BOOKS.find(b => b[1] === t && b[2] === lv);
const teachAff = lv => TEACH_AFF[lv - BOOK_SHOP_MAX - 1];
const TEACH_FEE = 0.2;   // 束脩：书价的几成
const teachFee = (t, lv) => Math.round(teachBook(t, lv)[3] * TEACH_FEE);
const teacherFree = p => p && p.status === 'alive' && (!S.story[p.pid] || S.story[p.pid].done);

// 每天开铺前：够格的行家登门；已从别处学会的作罢；肯教的人死了、走了、被抓了，换一位
function teachTick() {
  for (const [, t, lv] of BOOKS.filter(b => b[2] > BOOK_SHOP_MAX)) {
    const key = teachKey(t, lv), st = S.story[key];
    if (st && !st.done) {
      if (techLv(t) >= lv) st.done = true;
      else if (S.people[st.flags.pid].status !== 'alive') delete S.story[key];
    }
    if (S.story[key] || techLv(t) !== lv - 1) continue;
    const p = TEACHERS[t].who.map(id => S.people[id]).find(p => teacherFree(p) && p.aff >= teachAff(lv));
    if (p) startStory(key, 'mastery', 'teach', rint(1, 3), { pid: p.pid, tech: t, lv });
  }
}

STORIES.mastery = {
  nodes: {
    teach: {
      when: 'day',
      // 登门那天交情还得够、人在场；不够就往后拖
      cond: st => { const p = S.people[st.flags.pid]; return p.status === 'alive' && p.aff >= teachAff(st.flags.lv); },
      text: (st, p) => {
        const { tech: t, lv } = st.flags, line = TEACHERS[t].lines[lv - BOOK_SHOP_MAX - 1];
        return `${p.name}이(가) 오늘 물건은 안 가져오고, 소매에서 닳아빠진 필사본 한 권을 꺼내 카운터에 눌러놓고 놓지 않았다: 《${teachBook(t, lv)[5]}》.\n\"${line}\"\n(배우면 ${TECHS[t].name} 술이 제${cn(lv)}중에 이른다.)`;
      },
      choices: (st, p) => {
        const { tech: t, lv } = st.flags, fee = teachFee(t, lv), name = `${TECHS[t].name} 제${cn(lv)}중`;
        const learn = () => { learnTech(t, lv, teachBook(t, lv)[6]); log(`${p.name}이(가) 찾아와 기예를 전수해, 네 ${TECHS[t].name} 술이 제${cn(lv)}중으로 올랐다.`, 'gold'); };
        return [
          { label: `수업료를 바치고 스승으로 모셔 기예를 받는다`, hint: `${costHint(fee)}; ${name}; 호감+10`, req: needStones(fee), run: () => {
            spend(fee, `${p.name}에게 줄 수업료.`); learn();
            remember(p, `네가 공손히 ${p.name}의 솜씨를 받들고 수업료도 바쳤다.`, 10, 'helped');
            return { text: `${p.name}이(가) 영석을 저울질하며 품에 넣었다: \"규칙은 깨면 안 되지.\" 그날 밤 너희는 필사본을 두고 삼경까지 이야기했고, ${p.name}은(는) 떠나며 그 두루마리도 가져갔다.`, end: true, summary: `${p.name}이(가) 너에게 ${name}을(를) 전수했다.`, mood: 'pleased' };
          } },
          { label: '기예를 받고 감사 인사만 한다', hint: `영석 안 듦; ${name}`, run: () => {
            learn(); remember(p, `네가 ${p.name}의 비장의 솜씨를 배웠다.`, 0);
            return { text: `${p.name}이(가) 마지막 페이지를 다 읽고 너를 한참 보다가 말했다: \"이 바닥에 밥그릇 뺏을 사람이 하나 더 늘었군.\"`, end: true, summary: `${p.name}이(가) 너에게 ${name}을(를) 전수했다.` };
          } },
          { label: '오늘 가게가 바쁘니 다른 날 다시 배우겠다', hint: '며칠 후에 다시 온다', run: () => ({ text: `${p.name}이(가) 필사본을 소매에 도로 넣으며 말했다: \"좋아, 가르칠지 다시 생각해보지.\"`, go: ['teach', [5, 8]] }) },
        ];
      },
    },
  },
};

// ───────────── 鉴定术 ─────────────

function appraiseLevel() { return itemsIn('tool').reduce((m, it) => Math.max(m, ITEMS[it.id].tool || 0), 0); }

const dressable = it => hasQuality(it) && !it.fake && !ITEMS[it.id].tool && !ITEMS[it.id].book && !ITEMS[it.id].appraise;

// 验货：眼力够得着做工，才看得出以次充好
function quickInspect(it) {
  const lv = appraiseLevel();
  it.seen = Math.max(it.seen || 0, lv);
  // 掺了料的：眼力够得着手法，或者你自己学过这门手法，就闻得出来
  if (it.laced && !lacedKnown(it) && (lv >= (it.laceGrade || 1) || laceSkill(it.laced))) it.lacedSeen = true;
  return { lv, found: isDressed(it) && lv >= it.grade, laced: it.laced && it.lacedSeen && it.lacedBy !== 'me' ? it.laced : null };
}

// 换上更好的鉴定器物后，重新审视库房：从前看着没毛病的，可能露了馅
function recheckStock() {
  const lv = appraiseLevel(), found = [];
  for (const it of Object.values(S.items)) {
    if (!HELD(it) || it.forged) continue;
    if (it.fake && !it.revealed && it.verdict === 'real' && Math.max(...Object.values(it.subtle || { a: 1 })) <= lv) {
      it.revealed = true; found.push(`${itemName(it)}(위작)`);
    } else if (isDressed(it) && it.seen && it.seen < it.grade && it.grade <= lv) {
      it.seen = lv; found.push(`${itemName(it)}(하급을 상급으로)`);
    }
  }
  if (found.length) log(`${LENS_NAMES[lv]}(으)로 갈아 끼우고 창고를 다시 살피니, ${found.join('·')}에 문제가 있었다!`, 'loss');
  return found;
}

// 拆解研究识破的假货：赝品学到仿造之法，以次充好学到作伪手法（不超过自己的鉴定术）
function studyFake(it) {
  const lv = appraiseLevel();
  if (it.forged || it.lacedBy === 'me') return '이건 네가 만든 거라 연구할 게 없다.';
  // 验出来的掺料货：拆开来尝，学到别人的手法
  if (it.laced && it.lacedSeen) {
    if (laceSkill(it.laced)) return '이 수법은 이미 익혔다.';
    S.laceKnown = S.laceKnown || {};
    S.laceKnown[it.laced] = 1;
    destroyItem(it);
    log(`네가 이 ${ITEMS[it.id].name}을(를) 뜯어 자세히 살펴 남이 ${LACE[it.laced].verb}하는 수법을 간파했다 - 앞으로 네가 이 재료를 섞을 때 손놀림이 더 깔끔해진다.`, 'gold');
    return null;
  }
  if (!knownFlaw(it)) return '너는 아직 이것의 문제를 알아보지 못했다.';
  if (lv < it.grade) return `솜씨 ${GRADE_NAMES[it.grade]}, 지금의 네 안목(${LENS_NAMES[lv]})으로는 아직 분해해 꿰뚫지 못한다.`;
  if (it.fake) {
    if (!COUNTERFEITS[it.id]) return '이 물건은 모조할 방법이 없다.';
    if ((S.forgeKnown[it.id] || 0) >= it.grade) return '이 제작법은 이미 익혔다.';
    S.forgeKnown[it.id] = it.grade;
    destroyItem(it);
    log(`네가 이 가짜 ${ITEMS[it.id].name}을(를) 뜯어 자세히 살펴 그 모조법을 배웠다(${GRADE_NAMES[it.grade]}).`, 'gold');
    return null;
  }
  if (techLv('forgery') >= it.grade) return '이 수법은 이미 익혔다.';
  S.tech.forgery = techLv('forgery') + 1;
  it.sq = null;
  log(`네가 ${itemName(it)}의 작구를 긁어내고 수법을 간파했다 - 작위 술이 제${cn(S.tech.forgery)}중으로 올랐다.`, 'gold');
  return null;
}

// ───────────── 作伪台 ─────────────

function dressTargets(inputs) { return inputs.filter(it => dressable(it) && !isDressed(it) && it.q < 80); }

function forgeryCheck(m, inputs) {
  const lv = techLv('forgery');
  if (!lv) return { ok: false, msg: '작위 술을 모른다(비급 탐독 또는 간파한 하급 속임 물건 분해 필요)' };
  const sample = itemsIn(gridOf(m, 'mod'))[0];
  if (sample) {
    const rec = COUNTERFEITS[sample.id];
    if (!rec) return { ok: false, msg: '이 물건은 모조할 방법이 없다' };
    if (!S.forgeKnown[sample.id]) return { ok: false, msg: `아직 ${ITEMS[sample.id].name}을(를) 모조하지 못한다` };
    if (!rec.use.every(([id, n]) => countIn(inputs, id) >= n)) return { ok: false, msg: `재료 부족: ${rec.use.map(([id, n]) => `${ITEMS[id].name}×${n}`).join('·')}` };
    if (!findSpot(gridOf(m, 'out'), { id: sample.id })) return { ok: false, msg: '산출 칸이 가득 찼다' };
    return { ok: true, msg: `${ITEMS[sample.id].name} 모조(${GRADE_NAMES[Math.min(lv, S.forgeKnown[sample.id])]})` };
  }
  const t = dressTargets(inputs);
  if (!t.length) return { ok: false, msg: '입력 칸에 작구할 물건이 없다(품질 80 이하)' };
  return { ok: true, msg: `하급을 상급으로 ${Math.min(2, t.length)}건(${GRADE_NAMES[lv]})` };
}

function forgeryRun(m, inputs) {
  const lv = techLv('forgery'), done = [];
  const sample = itemsIn(gridOf(m, 'mod'))[0];
  for (let b = 0; b < 2; b++) {
    if (sample) {
      const rec = COUNTERFEITS[sample.id];
      if (!rec.use.every(([id, n]) => countIn(inputs, id) >= n) || !findSpot(gridOf(m, 'out'), { id: sample.id })) break;
      rec.use.forEach(([id, n]) => takeItems(inputs, id, n));
      const it = makeItem(sample.id, { fake: true, forged: true, grade: Math.min(lv, S.forgeKnown[sample.id]), q: rint(60, 88) });
      autoPlace(it, [gridOf(m, 'out')]);
      done.push(`가짜 ${ITEMS[sample.id].name}`);
    } else {
      const it = dressTargets(inputs)[0];
      if (!it || !findSpot(gridOf(m, 'out'), it)) break;
      dressUp(it, lv);
      it.forged = true;
      autoPlace(it, [gridOf(m, 'out')]);
      inputs.splice(inputs.indexOf(it), 1);
      done.push(`${itemName(it)}(${it.q}→겉보기 ${it.sq})`);
    }
  }
  return done.length ? `완성: ${done.join('·')}` : '이룬 게 없다';
}

// ───────────── 势力：见风使舵 ─────────────

const POWER_BY_TITLE = {
  '잡역 소년': 5, '범인 행상': 12, '낙패한 산수': 18, '외문 제자': 28, '내문 사배': 55, '내문 제자': 55, '유방 검객': 40, '복면 여수사': 50,
  '여우 요괴': 30, '호랑이 요괴': 42, '뱀 요괴': 32, '축기 수사': 38, '혈살종 외문 제자': 30, '전 마종 장로': 90, '내문 공자': 68, '장로 일가': 72, '세가 소저': 65,
};
const POWER_BY_PID = { thug: 35, qian: 55, sun: 60, tu: 55, enforcer: 60, collector: 65 };
// 男女异称的身份，势力与眼力相同
const SAME_TITLE = { '내문 사형': '내문 사배', '복면 수사': '복면 여수사', '잡역 소녀': '잡역 소년' };
const EYES = { '내문 공자': 1, '장로 일가': 1, '세가 소저': 1, '잡역 소년': 0, '범인 행상': 1, '낙패한 산수': 1, '외문 제자': 1, '내문 사배': 3, '내문 제자': 3, '유방 검객': 2, '복면 여수사': 3, '여우 요괴': 2, '호랑이 요괴': 0, '뱀 요괴': 2, '축기 수사': 2 };

// 势力：身手与地位；带伤、中毒、病弱的人底气也弱（npcBasePower 不算状态，用来定境界）
function npcPower(p) { return clamp(npcBasePower(p) - Math.round(condPenalty(p) / 2), 0, 100); }

function npcBasePower(p) {
  const t = SAME_TITLE[p.title] || p.title;
  let v = POWER_BY_PID[p.pid] != null ? POWER_BY_PID[p.pid] : POWER_BY_TITLE[t] != null ? POWER_BY_TITLE[t] : p.official ? 60 : 25;
  if (p.pid === 'thug' && S.flags.thugBoss) v += 25;
  return clamp(Math.round(v + (p.budgetMul - 1) * 10), 0, 100);
}

function powerParts() {
  const parts = [['마종 인맥', Math.round(clamp(S.rep.mo, -40, 100) * 0.3)], ['재력', Math.round(Math.min(20, Math.max(0, S.stones) / 300))]];
  if (thugAlly()) parts.push(['류라자 일당', S.flags.thugBoss ? 25 : 15]);
  if (S.flags.chenShelter) parts.push(['혈수 진효의 비호', 25]);
  if (condSev('me', 'injured')) parts.push(['몸에 상처가 있다', -5 * condSev('me', 'injured')]);
  if (S.flags.enforcerOwned) parts.push(['집법당에 조력자가 있다', 15]);
  const ctrl = Object.values(S.people).filter(p => p.controlled && p.status === 'alive' && (p.official || ['qian', 'sun', 'tu'].includes(p.pid))).length;
  if (ctrl) parts.push(['관차를 쥐고 흔든다', 10 * ctrl]);
  const amu = S.people.amu;
  if (amu && amu.status === 'alive' && amu.portrait === 'amu_disciple' && amu.aff >= 30) parts.push(['내문에 조력자가 있다', 10]);
  const g = Object.values(S.items).filter(HELD).reduce((s, it) => s + ({ iron_corpse: 6, puppet_doll: 6, soul_banner: 8, corpse_king: 12, demon_blade: 12 }[it.id] || 0), 0);
  if (g) parts.push(['가게를 지키는 물건', Math.min(30, g)]);
  if (daoPower()) parts.push([`수련·${realmName()}`, daoPower()]);
  const patron = S.cliques && S.cliques.joined;
  if (patron) parts.push([`뒷배·${CLIQUES[patron].name}`, 12]);
  if (softPenalty()) parts.push(['마음이 여려 누구에게나 당한다', -softPenalty()]);
  if (S.heat) parts.push(['집법당이 너를 주시한다', -Math.round(S.heat * 0.2)]);
  return parts.filter(x => x[1]);
}

function playerPower() { return clamp(10 + powerParts().reduce((s, x) => s + x[1], 0), 0, 100); }

// 吃了亏之后：忍、讨说法、还是报复——看怨气、交情与双方势力
function stance(p, grievance) {
  const gap = (playerPower() - npcPower(p)) / 40;
  const anger = grievance / 60 + Math.max(0, -p.aff) / 80 - Math.max(0, p.aff) / 120;
  const s = anger - gap + rnd(-0.25, 0.25);
  return s < 0.35 ? 'swallow' : s < 1.1 ? 'demand' : 'retaliate';
}

// 以势压人：势力差越大越管用
function overpowerOdds(p) { return clamp(1 / (1 + Math.exp(-(playerPower() - npcPower(p)) / 12)), 0.05, 0.95); }

// ───────────── 卖出的假货 ─────────────

function recordSold(c, it, price, told) {
  if (!told && knownFlaw(it)) commitSin('fraud', { p: personOf(c), w: 1, what: `${itemName(it)}을(를) 진품인 척 ${c.name}에게 판다`, virtue: 2 });
  if (told) tally('honest'); else if (knownFlaw(it)) tally('lies');
  S.sold.push({ pid: c.pid, name: itemName(it), id: it.id, fake: !!it.fake, grade: it.grade || 1, told, knew: knownFlaw(it),
    price, loss: Math.max(0, price - trueValue(it)), day: S.day });
}

// 每夜：没告知的可能被识破；告知了的，有人靠它发财，也有人出事后怪到你头上
function soldTick() {
  const news = [];
  S.sold = S.sold.filter(e => {
    const p = S.people[e.pid], age = S.day - e.day;
    if (!p || p.status !== 'alive' || age > 14) return false;
    if (!e.told) {
      if (Math.random() > (p.eye >= e.grade ? 0.09 : 0.02) + (e.fake ? 0.03 : 0)) return true;
      p.eye = Math.min(4, p.eye + 1);
      const g = clamp(Math.round(e.loss / (40 + 120 * p.budgetMul) * 40), 10, 100);
      news.push(grievance(p, g, `너에게서 산 ${e.name}이(가) ${e.fake ? '위작' : '하급을 상급으로 속인 것'}임을 알아냈다`, e));
      return false;
    }
    if (age < 2) return true;
    const r = Math.random();
    if (r < 0.5) {
      remember(p, `네가 판 ${e.name}을(를) 돌려 남을 속여 한몫 챙겼다.`, 8, 'profitFake');
      p.wantsFakes = true;
      news.push({ text: `${p.name}이(가) 너에게서 산 가짜 ${ITEMS[e.id].name}을(를) 되팔아 좋은 값을 받았다.`, cls: 'ok' });
    } else if (r < 0.75) {
      news.push(grievance(p, rint(30, 60), `네가 판 가짜 ${ITEMS[e.id].name}으로 남을 속이다 들통나서 도리어 네 탓이 됐다`, e));
    }
    return false;
  });
  return news.filter(Boolean);
}

// 起了怨气：按势力与交情决定怎么办
function grievance(p, g, what, e = {}) {
  if (guShrug(p)) return { text: `${p.name}${what}, 가슴의 고가 조이자 그 원기가 흩어졌다.`, cls: 'warn' };
  // 权贵最怕丢脸：被你骗了，多半打落牙齿和血吞；不吞的，报复也格外狠
  if (p.noble && Math.random() < 0.6 * (p.pride || 0.8)) {
    remember(p, `${what}, 알려지면 체면이 깎일까 봐 입을 다물었다.`, -Math.round(g / 3), 'swallowed');
    return { text: `${p.name}${what}, 하지만 체면을 잃을까 봐 한마디도 밖에 새어나가지 않았다.`, cls: 'warn' };
  }
  if (p.noble) g *= 1.6;
  const st = stance(p, g);
  if (st === 'swallow') {
    remember(p, `${what}, 네 세력을 가늠하고 분을 삼켰다.`, -Math.round(g / 4), 'swallowed');
    return { text: `${p.name}${what}, 하지만 화가 나도 말하지 못했다.`, cls: 'warn' };
  }
  const comp = Math.max(20, Math.round((e.loss || g * 4) * 0.8 / 10) * 10);
  const flags = { pid: p.pid, g, what, comp, knew: e.knew !== false, told: !!e.told };
  if (st === 'retaliate') {
    flags.damage = retaliate(p, g);
    remember(p, `${what}, 그리고 너에게 보복했다.`, -Math.round(g / 3), 'poisoned');
    startStory(`gr_${p.pid}_${S.day}`, 'grudge', 'aftermath', 1, flags);
    return { text: `${p.name}${what}——${flags.damage}`, cls: 'bad' };
  }
  remember(p, `${what}.`, -Math.round(g / 5));
  startStory(`gr_${p.pid}_${S.day}`, 'grudge', 'demand', rint(1, 2), flags);
  return { text: `${p.name}${what}, 너에게 항의하겠다고 호언했다.`, cls: 'bad' };
}

// 报复的手段因人而异；刘癞子的弟兄能挡下一半
function retaliate(p, g) { return gx(p, retaliateBy(p, g)); }

function retaliateBy(p, g) {
  if (guShrug(p)) return '말이 목까지 나왔지만, 가슴의 고가 조여서 다시 삼켰다.';
  const pw = npcPower(p);
  if (pw >= 45 || p.official || (p.faction === 'xian' && Math.random() < 0.5)) {
    addHeat(6 + Math.round(g / 10));
    S.flags.forceInspect = true;
    return '그가 집법당에 네가 가짜를 판다고 고소장을 냈다.';
  }
  if (S.flags.guard && Math.random() < 0.5) return '그가 밤에 사람을 데려와 가게를 부수려다 류라자의 형제들에게 쫓겨났다.';
  // 打不过你的不敢动手；打得过的，夜里堵你
  if (p.faction === 'mo' && Math.random() < 0.45 && judge(p, 'me').win) { addCond('me', 'injured', 1, `${p.name}이(가) 밤에 골목 어귀에서 너를 가로막았다`); return '그가 밤에 골목 어귀에서 너를 뒤집어씌워 두들겨 팼다.'; }
  if (p.faction === 'yao' && Math.random() < 0.15) { addCond('me', 'poisoned', 1, `${p.name}이(가) 네 물독에 독을 탔다`); return '그가 밤에 네 물독에 독침을 뱉었다.'; }
  if (p.faction === 'ren' || p.faction === 'xian') {
    adjustRep(p.faction, -Math.round(6 + g / 10));
    return `그가 방간에 네 가게가 가짜를 판다고 떠들어, ${FACTIONS[p.faction].name}이(가) 다 퍼뜨렸다.`;
  }
  if (p.faction === 'yao') {
    const it = pick(itemsIn('store'));
    if (it) { const n = itemName(it); destroyItem(it); return `밤에 네 창고의 ${n}이(가) 사라지고 짐승 털 몇 가닥만 남았다.`; }
    adjustRep('yao', -6);
    return '그가 요족 사이에서 네 험담을 퍼뜨렸다.';
  }
  const lost = itemsIn('display').slice(0, 2).map(it => { const n = itemName(it); destroyItem(it); return n; });
  const paid = payUpTo(30 + g, '가게가 부서져 수리비가 들었다.');
  return `그가 사람을 데려와 네 가게를 부쉈다${lost.length ? `, 진열장의 ${lost.join('·')}이(가) 사라졌다` : ''}. 수리에 ${paid} 영석이 들었다.`;
}

// ───────────── 买货：验货压价，也会得罪人 ─────────────

// 指出以次充好：他若心知肚明又自恃势大，会翻脸
function disputeFlaw(c) {
  const it = customerItem(), p = personOf(c);
  if ((it.seen || 0) >= (it.grade || 9) && isDressed(it)) {
    const gap = (playerPower() - npcPower(p)) / 40;
    if (it.knew && gap < -0.2 && Math.random() < 0.6) {
      c.patience -= 2;
      remember(p, '네가 사람들 앞에서 그의 속임수를 폭로해 그가 체면을 깎였다.', -12, 'insulted');
      it.disputed = 'caught';
      return { angry: true };
    }
    it.ask = Math.min(it.ask, Math.max(1, Math.round(trueValue(it) * priceMul(it.id) * rnd(0.85, 1))));
    remember(p, it.knew ? '네가 그의 속임수를 간파하고 값을 깎았다.' : '네가 그의 물건이 하급임을 지적했다 - 그 자신도 몰랐다.', it.knew ? -6 : -2, it.knew ? 'lowballed' : null);
    it.disputed = 'ok';
    return { ok: true };
  }
  // 鸡蛋里挑骨头：本没毛病（或你看不出），硬说有
  if (Math.random() < lieDetectChance(c)) {
    c.patience -= 2;
    it.ask = Math.round(it.ask * 1.1);
    remember(p, '네가 트집을 잡아 값을 깎으려다 그에게 퇴짜를 맞았다.', -15, 'lied');
    it.disputed = 'caught';
    return { caught: true };
  }
  it.ask = Math.max(1, Math.round(it.ask * 0.7));
  remember(p, '네가 흠을 한 바가지 잡아내자 그가 3할을 깎아줬다.', -4);
  it.disputed = 'ok';
  return { ok: true, bluff: true };
}

// ───────────── 结怨：讨说法与报复之后 ─────────────

Object.assign(STORIES, {
  grudge: {
    nodes: {
      demand: {
        when: 'day',
        who: st => { const p = S.people[st.flags.pid]; return { name: p.name, portrait: p.portrait, title: '직접 찾아와 항의', faction: p.faction, pid: p.pid }; },
        cond: st => S.people[st.flags.pid].status === 'alive',
        text: st => {
          const f = st.flags, p = S.people[f.pid];
          return `${p.name}이(가) 물건을 카운터에 내던지며 말했다: \"${ADDRESS[p.faction]}, 내가 ${f.what}!\"`
            + (f.told ? '\\n네가 그에게 처음에 가짜라고 했던 걸 상기시켰다. 그가 목을 빳빳이 세웠다: \\"일이 터지면 너도 무관하지 않아!\\"' : '')
            + `\n\"${f.comp} 영석을 배상하면 이 일은 없던 걸로 하지. 아니면...\" 그가 너를 보았다. 잡역 구역에서 네 무게를 가늠하는 듯했다.`;
        },
        choices: st => {
          const f = st.flags, p = S.people[f.pid], half = Math.round(f.comp / 20) * 10;
          return [
            { label: `그에게 ${f.comp} 영석 배상(타협)`, hint: costHint(f.comp), req: needStones(f.comp), run: () => {
              spend(f.comp, `${p.name}에게 ${f.comp} 영석을 배상했다.`); remember(p, `네가 그에게 ${f.comp} 영석을 배상했다.`, 15);
              return { text: '그가 영석을 받고 표정이 누그러졌다: \\"좋아, 이 일은 덮자.\\"', end: true };
            } },
            { label: `흥정해서 절반만 배상(${half})`, hint: `그는 ${p.greed > 0.6 ? '탐욕스러워 대개 응한다' : '반드시 응하지는 않는다'}`, req: needStones(half), run: () => {
              if (Math.random() < clamp(0.25 + p.greed * 0.4 + (playerPower() - npcPower(p)) / 100, 0.05, 0.9)) {
                spend(half, `${p.name}에게 ${half} 영석을 배상했다.`); remember(p, `네가 절반만 배상했다.`, 5);
                return { text: '그가 투덜거렸지만 결국 받았다.', end: true };
              }
              const dmg = retaliate(p, f.g); remember(p, '네가 배상조차 제대로 안 하려 했다.', -10);
              return { text: `\"거지 취급이냐?\" 그가 소매를 뿌리며 떠났다.\n이틀도 안 돼 - ${dmg}`, end: true };
            } },
            { label: '세력으로 누른다(대항)', hint: `성공 확률 ${Math.round(overpowerOdds(p) * 100)}%(네 세력 ${playerPower()}, 그 ${npcPower(p)})`, run: () => {
              if (Math.random() < overpowerOdds(p)) {
                remember(p, '네가 세력으로 눌러버리자, 그는 화가 나도 말하지 못했다.', -12, 'swallowed'); p.cowed = true;
                return { text: '네가 태연하게 몇몇 이름을 언급하자, 그의 얼굴색이 몇 번이고 바뀌더니 끝내 말없이 떠났다.', end: true };
              }
              const dmg = retaliate(p, f.g + 20); remember(p, '네가 세력으로 괴롭혔지만 누르지 못했다.', -15);
              return { text: `\"누구를 협박하느냐?\" 그가 냉소하며 떠났다.\n다음 날 - ${dmg}`, end: true };
            } },
            ...(f.knew ? [] : [{ label: '\\"나도 남에게 속았다\\"(사실)', hint: '그가 반드시 믿지는 않는다', run: () => {
              if (Math.random() < 0.55 + Math.max(0, p.aff) / 200) { remember(p, '네가 자신도 속았다고 하자 그가 믿었다.', -2); return { text: '그가 한숨 쉬었다: \\"이 세상이... 됐다.\\"', end: true }; }
              remember(p, '네가 자신도 속았다고 둘러댔지만 그는 믿지 않았다.', -6);
              return { text: '\\"귀신이나 믿겠네!\\" 그가 욕을 중얼거리며 떠났다. 아직 끝나지 않은 모양이다.', go: ['demand', [3, 5]] };
            } }]),
            { label: '모르쇠', hint: '그가 소란을 피울 배짱이 있는지 본다', run: () => {
              const st2 = stance(p, f.g + 10);
              if (st2 === 'swallow') { remember(p, '네가 모르쇠로 일관하자 그도 어쩔 수 없었다.', -10, 'swallowed'); return { text: '그가 한참 너를 노려보다가 끝내 소란을 피우지 못하고 풀이 죽어 떠났다.', end: true }; }
              const dmg = retaliate(p, f.g); remember(p, '네가 모르쇠로 일관했다.', -15);
              return { text: `그가 문을 쾅 닫고 떠났다.\n며칠도 안 돼 - ${dmg}`, end: true };
            } },
          ];
        },
      },
      aftermath: {
        when: 'day',
        who: st => { const p = S.people[st.flags.pid]; return { name: p.name, portrait: p.portrait, title: '원한을 갚으러 옴', faction: p.faction, pid: p.pid }; },
        cond: st => S.people[st.flags.pid].status === 'alive',
        text: st => {
          const f = st.flags, p = S.people[f.pid];
          return `(${f.damage})\n${p.name}이(가) 팔짱을 끼고 문 앞에 섰다: \"${f.what}, 이건 시작일 뿐이다. ${f.comp} 영석을 배상하든지, 두고 보든지 하자.\"`;
        },
        choices: st => {
          const f = st.flags, p = S.people[f.pid];
          return [
            { label: `사과하고 화해를 구한다(${f.comp})`, hint: costHint(f.comp), req: needStones(f.comp), run: () => {
              spend(f.comp, `${p.name}에게 사례금 ${f.comp} 영석을 준다.`); remember(p, '네가 사과하며 화해를 구했다.', 20);
              return { text: '그가 영석을 받고 고개를 끄덕였다: \\"진작 이랬으면 됐을 걸.\\"', end: true };
            } },
            { label: '이에는 이(대항)', hint: `성공 확률 ${Math.round(overpowerOdds(p) * 100)}%(네 세력 ${playerPower()}, 그 ${npcPower(p)})`, run: () => {
              if (Math.random() < overpowerOdds(p)) {
                const back = Math.round(f.comp / 2);
                earn(back, `${p.name}이(가) 너에게 ${back} 영석의 손해를 배상했다.`);
                remember(p, '네가 되려 그를 손봐주자 그가 꼬리를 내렸다.', -10, 'swallowed'); p.cowed = true;
                return { text: `네가 찾아가 장부를 명백히 따졌다. 그가 이웃들 앞에서 너에게 ${back} 영석을 배상했고, 그 후로 너를 보면 돌아간다.`, end: true };
              }
              const dmg = retaliate(p, f.g + 20); remember(p, '네가 보복하려다 오히려 손해를 봤다.', -15);
              return { text: `네가 이득을 못 보고 오히려 - ${dmg}`, end: true };
            } },
            { label: '참았다', hint: '그가 다시 올지도 모른다', run: () => {
              remember(p, '네가 참았다.', 0);
              if (Math.random() < 0.3) return { text: `네가 무시했다. 그가 냉소하며 떠났다.\n며칠 후 - ${retaliate(p, f.g)}`, end: true };
              return { text: '네가 무시했다. 시간이 지나자 이 일도 흐릿해졌다.', end: true };
            } },
          ];
        },
      },
    },
  },
});
