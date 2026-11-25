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
  if (b.lv <= cur) return `${name}第${cn(b.lv)}重你早已通晓。`;
  if (b.lv > cur + 1) return `须先通${name}第${cn(cur + 1)}重，才读得懂这本。`;
  learnTech(b.tech, b.lv, b.teach);
  destroyItem(it);
  log(`你研读${ITEMS[it.id].name}，${name}之术升至第${cn(b.lv)}重。`, 'gold');
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
        return `${p.name}今日没带货来，从袖里抽出一卷磨毛了边的手抄，压在柜上不松手：《${teachBook(t, lv)[5]}》。\n“${line}”\n（学了，${TECHS[t].name}之术便到第${cn(lv)}重。）`;
      },
      choices: (st, p) => {
        const { tech: t, lv } = st.flags, fee = teachFee(t, lv), name = `${TECHS[t].name}第${cn(lv)}重`;
        const learn = () => { learnTech(t, lv, teachBook(t, lv)[6]); log(`${p.name}登门传艺，你的${TECHS[t].name}之术升至第${cn(lv)}重。`, 'gold'); };
        return [
          { label: `奉上束脩，拜师受艺`, hint: `${costHint(fee)}；${name}；好感+10`, req: needStones(fee), run: () => {
            spend(fee, `给${p.name}的束脩。`); learn();
            remember(p, `你恭恭敬敬受了${p.name}的手艺，还奉了束脩。`, 10, 'helped');
            return { text: `${p.name}掂了掂灵石，收进怀里：“规矩不能坏。”这一夜你们对着手抄讲到三更，${p.name}走时把那卷纸也带走了。`, end: true, summary: `${p.name}传你${name}。`, mood: 'pleased' };
          } },
          { label: '受艺，只道一声谢', hint: `不花灵石；${name}`, run: () => {
            learn(); remember(p, `你学了${p.name}压箱底的手艺。`, 0);
            return { text: `${p.name}讲完最后一页，看了你一会儿：“往后这一行，又多一个人抢饭碗。”`, end: true, summary: `${p.name}传你${name}。` };
          } },
          { label: '今日铺里忙，改日再请教', hint: '过几天再来', run: () => ({ text: `${p.name}把手抄收回袖里：“也好，我再想想该不该教。”`, go: ['teach', [5, 8]] }) },
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
      it.revealed = true; found.push(`${itemName(it)}（赝品）`);
    } else if (isDressed(it) && it.seen && it.seen < it.grade && it.grade <= lv) {
      it.seen = lv; found.push(`${itemName(it)}（以次充好）`);
    }
  }
  if (found.length) log(`换上${LENS_NAMES[lv]}重新审视库房，发现${found.join('、')}有问题！`, 'loss');
  return found;
}

// 拆解研究识破的假货：赝品学到仿造之法，以次充好学到作伪手法（不超过自己的鉴定术）
function studyFake(it) {
  const lv = appraiseLevel();
  if (it.forged || it.lacedBy === 'me') return '这是你自己做的，没什么好研究的。';
  // 验出来的掺料货：拆开来尝，学到别人的手法
  if (it.laced && it.lacedSeen) {
    if (laceSkill(it.laced)) return '这手法你已经会了。';
    S.laceKnown = S.laceKnown || {};
    S.laceKnown[it.laced] = 1;
    destroyItem(it);
    log(`你把这件${ITEMS[it.id].name}拆开细细辨味，摸清了别人${LACE[it.laced].verb}的手法——往后你掺这一味，手脚更干净。`, 'gold');
    return null;
  }
  if (!knownFlaw(it)) return '你还没看出它有什么问题。';
  if (lv < it.grade) return `做工${GRADE_NAMES[it.grade]}，以你如今的眼力（${LENS_NAMES[lv]}）还拆解不透。`;
  if (it.fake) {
    if (!COUNTERFEITS[it.id]) return '此物无从仿造。';
    if ((S.forgeKnown[it.id] || 0) >= it.grade) return '这种做法你已经会了。';
    S.forgeKnown[it.id] = it.grade;
    destroyItem(it);
    log(`你拆开这件假${ITEMS[it.id].name}细细揣摩，学会了它的仿造之法（${GRADE_NAMES[it.grade]}）。`, 'gold');
    return null;
  }
  if (techLv('forgery') >= it.grade) return '这手法你已经会了。';
  S.tech.forgery = techLv('forgery') + 1;
  it.sq = null;
  log(`你刮去${itemName(it)}上的做旧，摸清了手法——作伪之术升至第${cn(S.tech.forgery)}重。`, 'gold');
  return null;
}

// ───────────── 作伪台 ─────────────

function dressTargets(inputs) { return inputs.filter(it => dressable(it) && !isDressed(it) && it.q < 80); }

function forgeryCheck(m, inputs) {
  const lv = techLv('forgery');
  if (!lv) return { ok: false, msg: '未通作伪之术（研读秘籍或拆解识破的以次充好）' };
  const sample = itemsIn(gridOf(m, 'mod'))[0];
  if (sample) {
    const rec = COUNTERFEITS[sample.id];
    if (!rec) return { ok: false, msg: '此物无从仿造' };
    if (!S.forgeKnown[sample.id]) return { ok: false, msg: `还不会仿造${ITEMS[sample.id].name}` };
    if (!rec.use.every(([id, n]) => countIn(inputs, id) >= n)) return { ok: false, msg: `缺料：${rec.use.map(([id, n]) => `${ITEMS[id].name}×${n}`).join('、')}` };
    if (!findSpot(gridOf(m, 'out'), { id: sample.id })) return { ok: false, msg: '产出格已满' };
    return { ok: true, msg: `仿造${ITEMS[sample.id].name}（${GRADE_NAMES[Math.min(lv, S.forgeKnown[sample.id])]}）` };
  }
  const t = dressTargets(inputs);
  if (!t.length) return { ok: false, msg: '输入格没有可做旧的货（品质 80 以下）' };
  return { ok: true, msg: `以次充好 ${Math.min(2, t.length)} 件（${GRADE_NAMES[lv]}）` };
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
      done.push(`假${ITEMS[sample.id].name}`);
    } else {
      const it = dressTargets(inputs)[0];
      if (!it || !findSpot(gridOf(m, 'out'), it)) break;
      dressUp(it, lv);
      it.forged = true;
      autoPlace(it, [gridOf(m, 'out')]);
      inputs.splice(inputs.indexOf(it), 1);
      done.push(`${itemName(it)}（${it.q}→看着${it.sq}）`);
    }
  }
  return done.length ? `做好了：${done.join('、')}` : '没做成什么';
}

// ───────────── 势力：见风使舵 ─────────────

const POWER_BY_TITLE = {
  '잡역 소년': 5, 凡人行商: 12, 落魄散修: 18, 外门弟子: 28, 内门师姐: 55, 内门弟子: 55, 游方剑客: 40, 蒙面女修: 50,
  '여우 요괴': 30, 虎妖: 42, 蛇妖: 32, 筑基修士: 38, 血煞宗外门弟子: 30, 前魔宗长老: 90, 内门公子: 68, 长老亲眷: 72, 世家小姐: 65,
};
const POWER_BY_PID = { thug: 35, qian: 55, sun: 60, tu: 55, enforcer: 60, collector: 65 };
// 男女异称的身份，势力与眼力相同
const SAME_TITLE = { 内门师兄: '内门师姐', 蒙面修士: '蒙面女修', 杂役少女: '杂役少年' };
const EYES = { 内门公子: 1, 长老亲眷: 1, 世家小姐: 1, 杂役少年: 0, 凡人行商: 1, 落魄散修: 1, 外门弟子: 1, 内门师姐: 3, 内门弟子: 3, 游方剑客: 2, 蒙面女修: 3, 狐妖: 2, 虎妖: 0, 蛇妖: 2, 筑基修士: 2 };

// 势力：身手与地位；带伤、中毒、病弱的人底气也弱（npcBasePower 不算状态，用来定境界）
function npcPower(p) { return clamp(npcBasePower(p) - Math.round(condPenalty(p) / 2), 0, 100); }

function npcBasePower(p) {
  const t = SAME_TITLE[p.title] || p.title;
  let v = POWER_BY_PID[p.pid] != null ? POWER_BY_PID[p.pid] : POWER_BY_TITLE[t] != null ? POWER_BY_TITLE[t] : p.official ? 60 : 25;
  if (p.pid === 'thug' && S.flags.thugBoss) v += 25;
  return clamp(Math.round(v + (p.budgetMul - 1) * 10), 0, 100);
}

function powerParts() {
  const parts = [['魔宗人脉', Math.round(clamp(S.rep.mo, -40, 100) * 0.3)], ['财力', Math.round(Math.min(20, Math.max(0, S.stones) / 300))]];
  if (thugAlly()) parts.push(['刘癞子一伙', S.flags.thugBoss ? 25 : 15]);
  if (S.flags.chenShelter) parts.push(['血手陈枭的庇护', 25]);
  if (condSev('me', 'injured')) parts.push(['身上带伤', -5 * condSev('me', 'injured')]);
  if (S.flags.enforcerOwned) parts.push(['执法堂有人', 15]);
  const ctrl = Object.values(S.people).filter(p => p.controlled && p.status === 'alive' && (p.official || ['qian', 'sun', 'tu'].includes(p.pid))).length;
  if (ctrl) parts.push(['控着官差', 10 * ctrl]);
  const amu = S.people.amu;
  if (amu && amu.status === 'alive' && amu.portrait === 'amu_disciple' && amu.aff >= 30) parts.push(['内门有人', 10]);
  const g = Object.values(S.items).filter(HELD).reduce((s, it) => s + ({ iron_corpse: 6, puppet_doll: 6, soul_banner: 8, corpse_king: 12, demon_blade: 12 }[it.id] || 0), 0);
  if (g) parts.push(['镇店之物', Math.min(30, g)]);
  if (daoPower()) parts.push([`修为·${realmName()}`, daoPower()]);
  const patron = S.cliques && S.cliques.joined;
  if (patron) parts.push([`靠山·${CLIQUES[patron].name}`, 12]);
  if (softPenalty()) parts.push(['心慈手软，人人可欺', -softPenalty()]);
  if (S.heat) parts.push(['执法堂盯着你', -Math.round(S.heat * 0.2)]);
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
  if (!told && knownFlaw(it)) commitSin('fraud', { p: personOf(c), w: 1, what: `把${itemName(it)}当真货卖给${c.name}`, virtue: 2 });
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
      news.push(grievance(p, g, `发现从你这儿买的${e.name}${e.fake ? '是赝品' : '以次充好'}`, e));
      return false;
    }
    if (age < 2) return true;
    const r = Math.random();
    if (r < 0.5) {
      remember(p, `把你卖的${e.name}转手骗了人，赚了一笔。`, 8, 'profitFake');
      p.wantsFakes = true;
      news.push({ text: `${p.name}把从你这儿买的假${ITEMS[e.id].name}转手卖了个好价钱。`, cls: 'ok' });
    } else if (r < 0.75) {
      news.push(grievance(p, rint(30, 60), `拿你卖的假${ITEMS[e.id].name}去糊弄人，被人识破，反倒怪到你头上`, e));
    }
    return false;
  });
  return news.filter(Boolean);
}

// 起了怨气：按势力与交情决定怎么办
function grievance(p, g, what, e = {}) {
  if (guShrug(p)) return { text: `${p.name}${what}，心口的蛊一紧，那点怨气就散了。`, cls: 'warn' };
  // 权贵最怕丢脸：被你骗了，多半打落牙齿和血吞；不吞的，报复也格外狠
  if (p.noble && Math.random() < 0.6 * (p.pride || 0.8)) {
    remember(p, `${what}，怕传出去丢脸，绝口不提。`, -Math.round(g / 3), 'swallowed');
    return { text: `${p.name}${what}，却怕丢了面子，一个字也没往外说。`, cls: 'warn' };
  }
  if (p.noble) g *= 1.6;
  const st = stance(p, g);
  if (st === 'swallow') {
    remember(p, `${what}，掂量了一下你的势力，忍下了这口气。`, -Math.round(g / 4), 'swallowed');
    return { text: `${p.name}${what}，却敢怒不敢言。`, cls: 'warn' };
  }
  const comp = Math.max(20, Math.round((e.loss || g * 4) * 0.8 / 10) * 10);
  const flags = { pid: p.pid, g, what, comp, knew: e.knew !== false, told: !!e.told };
  if (st === 'retaliate') {
    flags.damage = retaliate(p, g);
    remember(p, `${what}，于是报复了你。`, -Math.round(g / 3), 'poisoned');
    startStory(`gr_${p.pid}_${S.day}`, 'grudge', 'aftermath', 1, flags);
    return { text: `${p.name}${what}——${flags.damage}`, cls: 'bad' };
  }
  remember(p, `${what}。`, -Math.round(g / 5));
  startStory(`gr_${p.pid}_${S.day}`, 'grudge', 'demand', rint(1, 2), flags);
  return { text: `${p.name}${what}，扬言要找你讨个说法。`, cls: 'bad' };
}

// 报复的手段因人而异；刘癞子的弟兄能挡下一半
function retaliate(p, g) { return gx(p, retaliateBy(p, g)); }

function retaliateBy(p, g) {
  if (guShrug(p)) return '可话到嘴边，心口的蛊一紧，又咽了回去。';
  const pw = npcPower(p);
  if (pw >= 45 || p.official || (p.faction === 'xian' && Math.random() < 0.5)) {
    addHeat(6 + Math.round(g / 10));
    S.flags.forceInspect = true;
    return '他往执法堂递了状子，告你卖假货。';
  }
  if (S.flags.guard && Math.random() < 0.5) return '他夜里带人来砸铺子，被刘癞子的弟兄打跑了。';
  // 打不过你的不敢动手；打得过的，夜里堵你
  if (p.faction === 'mo' && Math.random() < 0.45 && judge(p, 'me').win) { addCond('me', 'injured', 1, `${p.name}夜里在巷口堵你`); return '他夜里在巷口把你蒙头打了一顿。'; }
  if (p.faction === 'yao' && Math.random() < 0.15) { addCond('me', 'poisoned', 1, `${p.name}在你的水缸里下了毒`); return '他夜里往你的水缸里吐了毒涎。'; }
  if (p.faction === 'ren' || p.faction === 'xian') {
    adjustRep(p.faction, -Math.round(6 + g / 10));
    return `他在坊间到处说你的铺子卖假货，${FACTIONS[p.faction].name}都在传。`;
  }
  if (p.faction === 'yao') {
    const it = pick(itemsIn('store'));
    if (it) { const n = itemName(it); destroyItem(it); return `夜里，你库房里的${n}不翼而飞，只留下几根兽毛。`; }
    adjustRep('yao', -6);
    return '他在妖族里四处说你的坏话。';
  }
  const lost = itemsIn('display').slice(0, 2).map(it => { const n = itemName(it); destroyItem(it); return n; });
  const paid = payUpTo(30 + g, '铺子被砸，修补花销。');
  return `他带人砸了你的铺子${lost.length ? `，陈列柜里的${lost.join('、')}没了` : ''}，修补花了 ${paid} 灵石。`;
}

// ───────────── 买货：验货压价，也会得罪人 ─────────────

// 指出以次充好：他若心知肚明又自恃势大，会翻脸
function disputeFlaw(c) {
  const it = customerItem(), p = personOf(c);
  if ((it.seen || 0) >= (it.grade || 9) && isDressed(it)) {
    const gap = (playerPower() - npcPower(p)) / 40;
    if (it.knew && gap < -0.2 && Math.random() < 0.6) {
      c.patience -= 2;
      remember(p, '你当众揭穿他以次充好，他觉得丢了脸。', -12, 'insulted');
      it.disputed = 'caught';
      return { angry: true };
    }
    it.ask = Math.min(it.ask, Math.max(1, Math.round(trueValue(it) * priceMul(it.id) * rnd(0.85, 1))));
    remember(p, it.knew ? '你看穿他以次充好，压了价。' : '你指出他的货以次充好——他自己也不知道。', it.knew ? -6 : -2, it.knew ? 'lowballed' : null);
    it.disputed = 'ok';
    return { ok: true };
  }
  // 鸡蛋里挑骨头：本没毛病（或你看不出），硬说有
  if (Math.random() < lieDetectChance(c)) {
    c.patience -= 2;
    it.ask = Math.round(it.ask * 1.1);
    remember(p, '你鸡蛋里挑骨头想压价，被他驳了回去。', -15, 'lied');
    it.disputed = 'caught';
    return { caught: true };
  }
  it.ask = Math.max(1, Math.round(it.ask * 0.7));
  remember(p, '你挑了一堆毛病，他让了三成价。', -4);
  it.disputed = 'ok';
  return { ok: true, bluff: true };
}

// ───────────── 结怨：讨说法与报复之后 ─────────────

Object.assign(STORIES, {
  grudge: {
    nodes: {
      demand: {
        when: 'day',
        who: st => { const p = S.people[st.flags.pid]; return { name: p.name, portrait: p.portrait, title: '上门讨说法', faction: p.faction, pid: p.pid }; },
        cond: st => S.people[st.flags.pid].status === 'alive',
        text: st => {
          const f = st.flags, p = S.people[f.pid];
          return `${p.name}把东西往柜上一摔：“${ADDRESS[p.faction]}，我${f.what}！”`
            + (f.told ? '\n你提醒他当初说过那是假货。他梗着脖子：“出了事，你也脱不了干系！”' : '')
            + `\n“赔我 ${f.comp} 灵石，这事就算了。不然……”他看了你一眼，似乎在掂量你在杂役区的分量。`;
        },
        choices: st => {
          const f = st.flags, p = S.people[f.pid], half = Math.round(f.comp / 20) * 10;
          return [
            { label: `赔他 ${f.comp} 灵石（妥协）`, hint: costHint(f.comp), req: needStones(f.comp), run: () => {
              spend(f.comp, `赔给${p.name} ${f.comp} 灵石。`); remember(p, `你赔了他 ${f.comp} 灵石。`, 15);
              return { text: '他收了灵石，脸色缓和下来：“行，这事揭过。”', end: true };
            } },
            { label: `讨价还价，只赔一半（${half}）`, hint: `他${p.greed > 0.6 ? '贪，多半肯' : '未必肯'}`, req: needStones(half), run: () => {
              if (Math.random() < clamp(0.25 + p.greed * 0.4 + (playerPower() - npcPower(p)) / 100, 0.05, 0.9)) {
                spend(half, `赔给${p.name} ${half} 灵石。`); remember(p, `你只赔了一半。`, 5);
                return { text: '他嘟囔了几句，还是收下了。', end: true };
              }
              const dmg = retaliate(p, f.g); remember(p, '你连赔都不肯赔足。', -10);
              return { text: `“打发叫花子？”他甩袖而去。\n没过两天——${dmg}`, end: true };
            } },
            { label: '以势压人（对抗）', hint: `成算 ${Math.round(overpowerOdds(p) * 100)}%（你的势力 ${playerPower()}，他 ${npcPower(p)}）`, run: () => {
              if (Math.random() < overpowerOdds(p)) {
                remember(p, '你仗势压了下来，他敢怒不敢言。', -12, 'swallowed'); p.cowed = true;
                return { text: '你不紧不慢地提了几个名字。他的脸色变了又变，最后一言不发地走了。', end: true };
              }
              const dmg = retaliate(p, f.g + 20); remember(p, '你仗势欺人，没压住。', -15);
              return { text: `“你吓唬谁？”他冷笑一声走了。\n第二天——${dmg}`, end: true };
            } },
            ...(f.knew ? [] : [{ label: '“我也是被人骗了”（实情）', hint: '他未必信', run: () => {
              if (Math.random() < 0.55 + Math.max(0, p.aff) / 200) { remember(p, '你说你也是被骗的，他信了。', -2); return { text: '他叹了口气：“这世道……罢了。”', end: true }; }
              remember(p, '你推说自己也被骗了，他不信。', -6);
              return { text: '“鬼才信！”他骂骂咧咧地走了，看样子还没完。', go: ['demand', [3, 5]] };
            } }]),
            { label: '不认账', hint: '看他敢不敢闹', run: () => {
              const st2 = stance(p, f.g + 10);
              if (st2 === 'swallow') { remember(p, '你不认账，他也没办法。', -10, 'swallowed'); return { text: '他瞪了你半天，终究没敢闹，悻悻地走了。', end: true }; }
              const dmg = retaliate(p, f.g); remember(p, '你不认账。', -15);
              return { text: `他摔门而去。\n没过几天——${dmg}`, end: true };
            } },
          ];
        },
      },
      aftermath: {
        when: 'day',
        who: st => { const p = S.people[st.flags.pid]; return { name: p.name, portrait: p.portrait, title: '寻仇', faction: p.faction, pid: p.pid }; },
        cond: st => S.people[st.flags.pid].status === 'alive',
        text: st => {
          const f = st.flags, p = S.people[f.pid];
          return `（${f.damage}）\n${p.name}抱着胳膊站在门口：“${f.what}，这只是个开头。要么赔 ${f.comp} 灵石，要么咱们走着瞧。”`;
        },
        choices: st => {
          const f = st.flags, p = S.people[f.pid];
          return [
            { label: `赔礼求和（${f.comp}）`, hint: costHint(f.comp), req: needStones(f.comp), run: () => {
              spend(f.comp, `向${p.name}赔礼 ${f.comp} 灵石。`); remember(p, '你赔礼求和。', 20);
              return { text: '他收下灵石，点点头：“早这样不就完了。”', end: true };
            } },
            { label: '以牙还牙（对抗）', hint: `成算 ${Math.round(overpowerOdds(p) * 100)}%（你的势力 ${playerPower()}，他 ${npcPower(p)}）`, run: () => {
              if (Math.random() < overpowerOdds(p)) {
                const back = Math.round(f.comp / 2);
                earn(back, `${p.name}赔了你 ${back} 灵石的损失。`);
                remember(p, '你反手把他收拾了一顿，他服了软。', -10, 'swallowed'); p.cowed = true;
                return { text: `你找上门去，把账算得明明白白。他当着街坊的面赔了你 ${back} 灵石，从此见了你绕道走。`, end: true };
              }
              const dmg = retaliate(p, f.g + 20); remember(p, '你想报复，反吃了亏。', -15);
              return { text: `你没讨到便宜，反倒——${dmg}`, end: true };
            } },
            { label: '忍了', hint: '他可能还会再来', run: () => {
              remember(p, '你忍了下来。', 0);
              if (Math.random() < 0.3) return { text: `你没理他。他冷笑着走了。\n几天后——${retaliate(p, f.g)}`, end: true };
              return { text: '你没理他。日子久了，这事也就淡了。', end: true };
            } },
          ];
        },
      },
    },
  },
});
