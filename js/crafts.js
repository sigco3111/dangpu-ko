// 各流派的工艺：重新祭炼残器废丹、地火炉炼神兵、灵兽圈养灵宠、符案画符、灵液装瓶、赃物的烙印与封印
'use strict';

// ───────────── 阵符与丹引（一次性模组） ─────────────

const modAccepts = (it, type) => { const m = ITEMS[it.id].mod; return Array.isArray(m) ? m.includes(type) : m === type; };
const hasBoostFu = m => hasMod(m, 'zhen_fu');
function burnMod(m, id) { const it = itemsIn(gridOf(m, 'mod')).find(x => x.id === id); if (it) destroyItem(it); return !!it; }

// 闭关的夜里，诸炉出品更精
const retreatQ = () => (S.retreat ? 10 : 0);

// ───────────── 重新祭炼 ─────────────

const SALVAGE_FORGE = [['sword_std', 5], ['soul_bell', 3], ['bone_flute', 3], ['demon_charm', 2], ['soul_banner', 0.6]];

// 补残器的铁：一锭玄铁，或一柄残剑废铁，或两块玄铁矿（拾荒翻得到的都能用，没有炼器炉也补得上）
const SALVAGE_METAL = [['iron_ingot', 1], ['scrap_sword', 1], ['iron_ore', 2]];
const salvageMetal = inputs => SALVAGE_METAL.find(([id, n]) => countIn(inputs, id) >= n);
const salvageReady = inputs => countIn(inputs, 'broken_relic') > 0 && !!salvageMetal(inputs);

// 炼器台（器鼎）：残破法器 + 补料的铁 → 一件法宝，品质往往高过原物
function salvageForge(m, inputs, emit) {
  if (!salvageReady(inputs)) return false;
  const [id0, n] = salvageMetal(inputs);
  const [relic] = takeItems(inputs, 'broken_relic', 1), metal = takeItems(inputs, id0, n);
  const id = weighted(SALVAGE_FORGE.map(([k, w]) => [k, k === 'soul_banner' ? w * (1 + techLv('refine')) : w]));
  emit(makeItem(id, { q: clamp(Math.round((relic.q + avgQ(metal)) / 2) + 22 + retreatQ() + techBonus('forge'), 5, 100) }));
  if (Math.random() < 0.2) emit(makeItem('xuan_essence', { q: rint(50, 80) }));
  return true;
}

// 丹炉：两颗废丹重炼；有丹引必成
function salvagePills(m, inputs, emit) {
  if (countIn(inputs, 'waste_pill') < 2) return null;
  const used = takeItems(inputs, 'waste_pill', 2);
  const guided = hasMod(m, 'dan_guide');
  if (!guided && Math.random() < 0.25) return '폐단 재련, 또 한 가마를 날렸다';
  const id = weighted([['pill_qi', 70], ['pill_blood', 25], ['pill_found', 5]]);
  emit(makeItem(id, { q: clamp(avgQ(used) + 10 + (guided ? 25 : 0) + retreatQ(), 5, 100) }));
  return true;
}

// ───────────── 地火炉 ─────────────

const dihuoFeed = inputs => countIn(inputs, 'iron_ingot') >= 3 || countIn(inputs, 'iron_ore') >= 6;

function dihuoCheck(m, inputs) {
  if (S.retreat && countIn(inputs, 'xuan_essence') >= 4) return { ok: true, msg: '폐관 좌진: 오늘 밤 신병 배료를 만든다' };
  if (!dihuoFeed(inputs)) return { ok: false, msg: S.retreat ? '재료 부족: 현철정 4개, 또는 현철광 6개와 현철 3개' : '재료 부족: 현철광 6개 또는 현철 3개(현철정 4개는 그날 밤 폐관해야 함)' };
  if (!outputHasRoom(m, 'xuan_essence')) return { ok: false, msg: '산출 칸과 바닥이 모두 찼다' };
  return { ok: true, msg: `현철정 ${hasBoostFu(m) ? 4 : 2}가마` };
}

function dihuoRun(m, inputs, emit) {
  if (S.retreat && countIn(inputs, 'xuan_essence') >= 4) {
    const used = takeItems(inputs, 'xuan_essence', 4);
    emit(makeItem('god_blank', { q: clamp(avgQ(used) + 15 + techBonus('forge'), 5, 100) }));
    burnMod(m, 'zhen_fu');
    return;
  }
  for (let b = 0; b < (hasBoostFu(m) ? 4 : 2); b++) {
    if (!dihuoFeed(inputs)) break;
    const used = countIn(inputs, 'iron_ingot') >= 3 ? takeItems(inputs, 'iron_ingot', 3) : takeItems(inputs, 'iron_ore', 6);
    emit(makeItem('xuan_essence', { q: clamp(avgQ(used) + 10 + retreatQ() + techBonus('furnace'), 5, 100) }));
  }
  burnMod(m, 'zhen_fu');
}

// ───────────── 灵兽圈 ─────────────

const RAT_FOOD = ['waste_pill', 'bones', 'spirit_fruit', 'beast_feed'];
// 兽栏的饲料格只放 1×1 的小件（同种叠放，见 stackCap），长条的残剑、残器放不进去；噬金虫啃玄铁矿与破铜钵
const BUG_FOOD = ['broken_bowl', 'iron_ore', 'bones'];
// 各灵宠吃什么、吃饱了产什么（货品册里的新灵宠在这两张表里登记）；没登记产出的当寻宝鼠
const PET_FOOD = { treasure_rat: RAT_FOOD, gold_bug: BUG_FOOD };
const PET_YIELD = {};
// 两只成年的同类每夜添丁的机会（未登记的按 0.3）
const PET_BREED = {};
const RAT_LOOT = [['iron_ore', 4], ['herb_dew', 3], ['spirit_fruit', 3], ['bones', 3], ['broken_relic', 1.5], ['waste_pill', 2], ['spirit_crystal', 0.8], ['jade_pendant', 0.3]];

// 兽栏：灵兽圈每一栏一行，左边一排饲料格（f0、f1……）、右边一排灵兽格（b0、b1……），一栏只养一种；
// 吃出来的东西落进产物格（out）。栏不够就加盖，至多 stallMax 栏
const isPet = it => !!PET_FOOD[it.id];
const petMenu = id => PET_FOOD[id] || RAT_FOOD;
const PET_FOODS = () => [...new Set(Object.values(PET_FOOD).flat())];
const stallCount = m => m.stalls || 0;
const stallGrids = (m, i) => ({ feed: gridOf(m, `f${i}`), pen: gridOf(m, `b${i}`) });
const stallSpecies = (m, i, skip) => { const pet = itemsIn(stallGrids(m, i).pen).find(it => it !== skip); return pet ? pet.id : null; };

function addStall(m) {
  const def = MACHINES[m.type], i = stallCount(m), n = def.stallSize;
  S.grids[gridOf(m, `f${i}`)] = { w: n, h: 1 };
  S.grids[gridOf(m, `b${i}`)] = { w: n, h: 1 };
  m.stalls = i + 1;
}

// 开局往第几栏里放东西：栏不够就先补上（不收钱）
function ensureStall(m, slot) {
  const k = /^[fb](\d+)$/.exec(slot);
  if (k) while (stallCount(m) <= +k[1]) addStall(m);
}

function stallPrice(m) { return supplierPrice(MACHINES[m.type].stallPrice); }

function buyStall(m) {
  const def = MACHINES[m.type];
  if (stallCount(m) >= def.stallMax) return `${def.name}은(는) 최대 ${def.stallMax}칸`
  const price = stallPrice(m);
  if (S.stones < price) return '영석이 부족하다';
  spend(price, `${def.name}에 ${stallCount(m) + 1}번째 칸을 증축했다.`);
  addStall(m);
  return null;
}

// 往兽栏里放东西：饲料格只收灵宠吃的东西；灵兽格只收灵宠，且不能和栏里已有的混养
function stallReject(m, slot, it) {
  const i = +slot.slice(1);
  if (slot[0] === 'f') return PET_FOODS().includes(it.id) ? null : '영충은 이걸 먹지 않는다';
  if (!isPet(it)) return '수란에는 영충만 기른다';
  const sp = stallSpecies(m, i, it);
  return sp && sp !== it.id ? `이 칸에는 ${ITEMS[sp].name}을(를) 기른다. 섞어 기를 수 없다` : null;
}

// 一栏此刻的情形：养的什么、几只，饲料里有几份对得上它的口；matched 就是今夜吃得上
function stallState(m, i) {
  const g = stallGrids(m, i), pets = itemsIn(g.pen), species = pets.length ? pets[0].id : null;
  const feed = itemsIn(g.feed), menu = species ? petMenu(species) : [];
  const fit = feed.filter(it => menu.includes(it.id)).length;
  return { i, species, pets: pets.length, feed: feed.length, fit, need: pets.length * (1 + techLv('beast')), matched: pets.length > 0 && fit > 0 };
}

function penCheck(m) {
  const st = [...Array(stallCount(m)).keys()].map(i => stallState(m, i)).filter(x => x.pets);
  if (!st.length) return { ok: false, msg: '수란에 영충이 없다' };
  const pets = st.reduce((s, x) => s + x.pets, 0);
  const hungry = st.filter(x => !x.matched);
  if (hungry.length === st.length) return { ok: true, msg: `맞는 사료가 없다(영충 ${pets}마리)` };
  return { ok: true, msg: hungry.length ? `${hungry.length}칸에 사료가 없다` : `${st.length}칸 · 영충 ${pets}마리` };
}

function penRun(m) {
  const notes = [], out = gridOf(m, 'out'), bq = techLv('beast') * 10;
  const place = it => {
    if (autoPlace(it, [out]) || autoPlace(it, ['floor'])) { notes.push(itemName(it)); return; }
    destroyItem(it);
  };
  for (let i = 0; i < stallCount(m); i++) {
    const g = stallGrids(m, i), feed = itemsIn(g.feed);
    // 每只灵宠每夜吃 1 + 御兽重数 份，只吃自己栏里的
    for (const pet of itemsIn(g.pen)) for (let bite = 0; bite <= techLv('beast'); bite++) {
      const food = feed.find(it => petMenu(pet.id).includes(it.id));
      if (!food) { if (!bite) pet.growth = Math.max(0, (pet.growth || 0) - 5); break; }
      destroyItem(food); feed.splice(feed.indexOf(food), 1);
      // 灵兽饲料一份顶两份
      pet.growth = Math.min(100, (pet.growth || 0) + (25 + 10 * techLv('beast')) * (food.id === 'beast_feed' ? 2 : 1));
      if (pet.growth < 50) continue;
      if (PET_YIELD[pet.id]) {
        const note = PET_YIELD[pet.id](pet, food, place, bq);
        if (note) notes.push(note);
      } else if (pet.id === 'gold_bug') {
        place(makeItem(food.id === 'bones' ? 'beast_feed' : 'spirit_sand', { q: clamp(food.q + 15 + bq, 5, 100) }));
      } else {
        if (food.id === 'waste_pill' && Math.random() < 0.35) place(makeItem('dan_guide', { q: 60 + bq }));
        if (Math.random() < 0.45 + 0.1 * techLv('beast')) {
          const id = weighted(RAT_LOOT.map(([k, w]) => [k, k === 'spirit_crystal' || k === 'jade_pendant' ? w * (1 + techLv('beast')) : w]));
          place(makeItem(id, { q: rint(30, 70) + bq }));
        }
      }
    }
    // 一栏里两只成年的，可能添丁：先放本栏，满了放同种的别栏、再放空栏
    const kind = stallSpecies(m, i);
    const adults = itemsIn(g.pen).filter(it => it.growth >= 100);
    if (kind && adults.length >= 2 && Math.random() < (PET_BREED[kind] != null ? PET_BREED[kind] : 0.3) + 0.1 * techLv('beast')) {
      const baby = makeItem(kind, { growth: 0, q: 50 });
      const order = [i, ...[...Array(stallCount(m)).keys()].filter(j => j !== i && stallSpecies(m, j) === kind),
        ...[...Array(stallCount(m)).keys()].filter(j => !stallSpecies(m, j))];
      if (autoPlace(baby, order.map(j => stallGrids(m, j).pen))) notes.push(`새끼 ${ITEMS[kind].name} 한 마리`);
      else { destroyItem(baby); notes.push(`${ITEMS[kind].name}이(가) 새끼를 낳으려 했지만 수란이 꽉 찼다`); }
    }
  }
  return notes.length ? `산출: ${notes.join(', ')}` : '영충들이 배부르게 먹고 자라고 있다';
}

// 旧存档：灵兽圈原来是一格饲料、一格圈内混养。拆成兽栏：同种的放一栏（四只一栏），饲料跟着对口的栏走
function migratePen(m) {
  const def = MACHINES[m.type];
  if (m.stalls) return;
  const lift = g => { const l = itemsIn(g); l.forEach(it => { it.pos = null; }); return l; };
  const food = lift(gridOf(m, 'in')), inPen = lift(gridOf(m, 'out'));
  delete S.grids[gridOf(m, 'in')];
  S.grids[gridOf(m, 'out')] = { w: def.out[0], h: def.out[1] };
  m.stalls = 0;
  const kinds = [...new Set(inPen.filter(isPet).map(it => it.id))];
  for (const k of kinds) {
    const pets = inPen.filter(it => it.id === k);
    for (let n = 0; n < pets.length; n += def.stallSize) if (stallCount(m) < def.stallMax) addStall(m);
  }
  while (stallCount(m) < def.stalls) addStall(m);
  for (const pet of inPen.filter(isPet)) {
    const ok = [...Array(stallCount(m)).keys()].filter(i => [pet.id, null].includes(stallSpecies(m, i))).sort((a, b) => !stallSpecies(m, a) - !stallSpecies(m, b));
    if (!autoPlace(pet, ok.map(i => stallGrids(m, i).pen))) stow(pet);
  }
  for (const it of inPen.filter(it => !isPet(it))) if (!autoPlace(it, [gridOf(m, 'out')])) stow(it);
  for (const it of food) {
    const ok = [...Array(stallCount(m)).keys()].sort((a, b) => {
      const fa = stallSpecies(m, a) && petMenu(stallSpecies(m, a)).includes(it.id), fb = stallSpecies(m, b) && petMenu(stallSpecies(m, b)).includes(it.id);
      return fb - fa;
    });
    if (!autoPlace(it, ok.map(i => stallGrids(m, i).feed))) stow(it);
  }
}

// ───────────── 蛊盅 ─────────────

// 三格：原料（腐骨，同种可叠）→ 蛊虫（养着的蛊、待孵的卵）→ 产物（下的卵、吐的蛊毒，只能取出）
// 开盅喂养：卵孵化、幼蛊食骨长大、成蛊产卵，进化过的蛊食骨吐毒。封盅斗蛊：不喂不孵，每夜最凶的一只吞掉最弱的一只
const potGu = m => itemsIn(gridOf(m, 'pot')).filter(it => it.id === 'gu');
// 斗蛊谁凶：道行最要紧，其次毒性、个头，再看当夜的运气
const guFight = it => guStage(it) * 40 + it.tox * 0.6 + it.growth * 0.2 + rint(0, 25);
// 开盅喂养时，各级的蛊食一骨吐一份蛊毒的机会（万毒蛊一半，蛊王每夜都吐）
const GU_VENOM = [0, 0, 0.5, 1];
// 吞掉一只，夺来它几成毒性
const GU_DEVOUR_TOX = 0.3;

// 离下一级还差什么（悬停提示用）
function guNext(it) {
  const st = guStage(it), eat = it.eat || 0;
  if (st === 3) return '이미 고왕이다';
  if (st === 0) return eat >= GU_STAGES[2].eat ? `다 자라면 ${GU_STAGES[guStage({ growth: 100, eat })].name}이(가) 된다` : '다 자라면 금잠고가 된다. 봉중 상식으로도 빨리 자란다';
  return `봉중에서 ${GU_STAGES[st + 1].eat - eat}마리를 더 삼키면 ${GU_STAGES[st + 1].name}이(가) 된다`;
}

function gupotCheck(m, bones) {
  const pot = itemsIn(gridOf(m, 'pot')), gu = pot.filter(it => it.id === 'gu');
  if (!pot.length) return { ok: false, msg: '고충 칸에 고가 없다' };
  if (m.seal) return gu.length >= 2 ? { ok: true, msg: `봉중 투고: ${gu.length}마리가 서로 먹는다` } : { ok: false, msg: '봉해 둔 항아리에 고가 한 마리뿐이라 먹을 상대가 없다' };
  const hungry = gu.filter(it => it.growth < 100 || GU_VENOM[guStage(it)]).length, n = countIn(bones, 'bones');
  return { ok: true, msg: n < hungry ? `원료 부족(부골 ${n}/${hungry})` : `개중 포식: 고/란 ${pot.length}마리` };
}

function gupotRun(m, bones) {
  const notes = [];
  const emit = (it, note) => {
    if (autoPlace(it, [gridOf(m, 'out')])) notes.push(note);
    else { destroyItem(it); notes.push(`산출 칸이 차서 ${note}을(를) 둘 곳이 없다`); }
  };
  // 升到万毒蛊、蛊王那一夜蜕一回皮，吐出一份蛊毒
  const shed = (gu, from) => {
    if (guStage(gu) <= from || guStage(gu) < 2) return;
    emit(makeItem('gu_venom', { tox: gu.tox }), `탈피하며 고독 한 덩이를 토했다(독성 ${gu.tox})`);
    guXp('shed');
  };
  if (m.seal) guDuel(m, notes, shed); else guFeed(m, bones, notes, emit, shed);
  return notes.length ? notes.join('; ') : '고충이 조용히 꿈틀거린다';
}

function guFeed(m, bones, notes, emit, shed) {
  itemsIn(gridOf(m, 'pot')).filter(it => it.id === 'gu_egg').forEach(egg => {
    const pos = egg.pos;
    destroyItem(egg);
    placeItem(makeItem('gu', { growth: 0, tox: egg.tox }), pos.g, pos.x, pos.y);
    notes.push('고란 하나가 부화했다');
    guXp('hatch');
  });
  // 蛊虫精通每重：蛊长得快、产卵勤、子代更毒
  const lv = guLv();
  // 三重：迷魂花饲金蚕，一夜化一只情蛊
  const gold = lv >= 3 && potGu(m).find(it => guStage(it) === 1 && !it.eat);
  if (gold && countIn(bones, 'mihun_flower') && findSpot(gridOf(m, 'out'), { id: 'love_gu' })) {
    takeItems(bones, 'mihun_flower', 1);
    destroyItem(gold);
    emit(makeItem('love_gu', { q: clamp(40 + gold.tox, 5, 100) }), '금잠고 한 마리가 미혼화를 먹고 온몸이 붉어지며 둘로 갈라졌다 — 정고 한 쌍이 완성됐다');
    guXp('love');
  }
  let starved = 0;
  potGu(m).filter(it => it.growth < 100).forEach(gu => {
    const from = guStage(gu);
    if (takeItems(bones, 'bones', 1).length) {
      gu.growth = Math.min(100, gu.growth + 18 + 2 * lv + Math.round(gu.tox / 8));
      guXp('feed');
      if (gu.growth >= 100) { notes.push(`고 한 마리가 ${itemName(gu)}(으)로 변했다(독성 ${gu.tox})`); shed(gu, from); guXp('grown'); }
    } else {
      gu.growth = Math.max(0, gu.growth - 5);
      if (Math.random() < 0.15) { destroyItem(gu); notes.push('고 한 마리가 굶어 죽었다'); } else starved++;
    }
  });
  if (starved) notes.push(`고 ${starved}마리가 굶고 있다`);
  // 万毒蛊、蛊王食一骨吐毒；没骨头吃就不吐，也饿不死
  potGu(m).filter(it => GU_VENOM[guStage(it)]).forEach(gu => {
    if (!takeItems(bones, 'bones', 1).length) return;
    if (Math.random() < GU_VENOM[guStage(gu)]) { emit(makeItem('gu_venom', { tox: gu.tox }), `${itemName(gu)}이(가) 고독 한 덩이를 토했다(독성 ${gu.tox})`); guXp('venom'); }
  });
  const adults = potGu(m).filter(it => it.growth >= 60);
  if (adults.length >= 2 && Math.random() < 0.35 + 0.03 * lv) {
    const [a, b] = adults.sort(() => Math.random() - 0.5);
    const egg = makeItem('gu_egg', { tox: clamp(Math.round((a.tox + b.tox) / 2) + rint(-6, 12) + 2 * lv, 0, 100) });
    emit(egg, `고란 하나를 낳았다(독성 ${egg.tox})`);
    guXp('egg');
  }
}

// 封盅斗蛊：最凶的吞掉最弱的，夺其毒性与道行（它吞过的也算进来），个头也长一截
function guDuel(m, notes, shed) {
  const gu = potGu(m);
  if (gu.length < 2) { notes.push('항아리에 한 마리뿐이라 더 삼킬 것이 없다'); return; }
  const ranked = gu.map(it => [it, guFight(it)]).sort((a, b) => b[1] - a[1]);
  const eater = ranked[0][0], prey = ranked[ranked.length - 1][0], from = guStage(eater);
  const who = itemName(eater), whom = itemName(prey);
  eater.tox = Math.min(100, eater.tox + Math.round(prey.tox * GU_DEVOUR_TOX) + 2);
  eater.growth = Math.min(100, eater.growth + 35);
  eater.eat = (eater.eat || 0) + 1 + (prey.eat || 0);
  destroyItem(prey);
  guXp('devour');
  notes.push(`${who}이(가) ${whom} 한 마리를 삼켰다${guStage(eater) > from ? `. ${itemName(eater)}(으)로 변했다` : ''}(독성 ${eater.tox})`);
  shed(eater, from);
}

// 旧存档：蛊盅原来是饲料 2×2 + 盅内 3×2。添一格蛊虫，盅内的蛊与卵挪进去，产物格改成 3×1
function migrateGupot(m) {
  if (S.grids[gridOf(m, 'pot')]) return;
  const def = MACHINES[m.type], old = itemsIn(gridOf(m, 'out'));
  S.grids[gridOf(m, 'pot')] = { w: def.pot[0], h: def.pot[1] };
  S.grids[gridOf(m, 'out')] = { w: def.out[0], h: def.out[1] };
  old.forEach(it => { it.pos = null; });
  for (const it of old) if (!autoPlace(it, def.habitat.includes(it.id) ? [gridOf(m, 'pot'), gridOf(m, 'out')] : [gridOf(m, 'out')])) stow(it);
}

// ───────────── 符案 ─────────────

function fuRecipe(inputs) {
  const has = (id, n = 1) => countIn(inputs, id) >= n;
  if (!has('fu_paper') || !has('cinnabar')) return null;
  const t = techLv('talisman');
  if (t >= 3 && has('xian_talisman')) return { out: 'seal_xian', n: 2, use: [['fu_paper', 1], ['cinnabar', 1], ['xian_talisman', 1]] };
  if (t >= 2 && has('spirit_crystal')) return { out: 'zhen_fu', n: 1, use: [['fu_paper', 1], ['cinnabar', 1], ['spirit_crystal', 1]] };
  if (has('soul_wisp')) return { out: 'fu_shehun', n: 1, use: [['fu_paper', 1], ['cinnabar', 1], ['soul_wisp', 1]] };
  if (has('bones')) return { out: 'demon_charm', n: 1, use: [['fu_paper', 1], ['cinnabar', 1], ['bones', 1]] };
  return { out: 'fu_jingang', n: 1, use: [['fu_paper', 1], ['cinnabar', 1]] };
}

function fudeskCheck(m, inputs) {
  const r = fuRecipe(inputs);
  if (!r) return { ok: false, msg: '재료 부족: 부적 종이와 주사' };
  if (!findSpot(gridOf(m, 'out'), { id: r.out })) return { ok: false, msg: '산출 칸이 찼다' };
  return { ok: true, msg: `${ITEMS[r.out].name} 그리기, 최대 ${1 + techLv('talisman')}장` };
}

function fudeskRun(m, inputs, emit) {
  const made = [];
  for (let b = 0; b < 1 + techLv('talisman'); b++) {
    const r = fuRecipe(inputs);
    if (!r || !findSpot(gridOf(m, 'out'), { id: r.out })) break;
    const used = r.use.flatMap(([id, n]) => takeItems(inputs, id, n));
    for (let i = 0; i < r.n; i++) emit(makeItem(r.out, { q: clamp(avgQ(used) + 8 * techLv('talisman') + retreatQ(), 5, 100) }));
    made.push(r.out);
  }
  return made.length;
}

// ───────────── 灵液 ─────────────

function waterTier(p) { return p >= 99.9 ? '경장옥로' : p >= 99 ? '무근영수' : p >= 80 ? '청영수' : '탁영수'; }

function waterValue(p) {
  const v = 3 + 70 * Math.pow(Math.max(0, p - 40) / 59.01, 2);
  return Math.round(p >= 99.9 ? v * 4 : p >= 99 ? v * 1.5 : v);
}

// 装瓶：修士只认玉净瓶装的好灵液
const bottleMul = it => (it.bottled ? (it.purity >= 99 ? 1.8 : 1.15) : 1);
function canBottle(it) { return it.id === 'water' && !it.bottled && !!owns('jade_bottle'); }
function bottle(it) {
  if (!canBottle(it)) return '옥정병이 없다';
  const err = exert('bottle');
  if (err) return err;
  destroyItem(owns('jade_bottle'));
  it.bottled = true;
  return null;
}

// ───────────── 烙印、抹印、封印 ─────────────

// 赃物上原主留下的神识烙印：几重
// 重宝（基价 DEEP_MARK_BASE 以上）的原主多半修为深，烙印也深，可达四重
const DEEP_MARK_BASE = 1000;
function stampMark(it, ownerFaction = 'mo') {
  const owner = newPerson(ownerFaction);
  it.mark = { owner: owner.pid, str: +weighted(ITEMS[it.id].base >= DEEP_MARK_BASE ? [[2, 30], [3, 45], [4, 25]] : [[1, 50], [2, 35], [3, 15]]) };
}

const markVisible = it => !!it.mark && appraiseLevel() >= it.mark.str;

function canErase(it) { return !!it.mark && markVisible(it) && techLv('erase') >= it.mark.str; }

function eraseMark(it) {
  if (!canErase(it)) return '말인술이 모자라 이 낙인은 지울 수 없다';
  const err = exert('erase', it.mark.str);
  if (err) return err;
  const owner = S.people[it.mark.owner];
  if (Math.random() < 0.12) {
    log(`말인 중 낙인이 반격해 ${owner ? owner.name : '원주인'}이(가) 느꼈다!`, 'loss');
    if (owner) startStory(`tr_${it.uid}`, 'tracker', 'claim', 1, { pid: owner.pid, uid: it.uid, name: itemName(it) });
    return '낙인이 반격해 깨끗이 지우지 못했다 — 원주인이 느꼈으니 찾아올지도 모른다.';
  }
  it.mark = null;
  it.stolen = 0;
  log(`${itemName(it)}의 원주인 낙인을 깨끗이 지웠다. 이제 출처가 완전히 깨끗하다.`, 'gold');
  return null;
}

const SEALABLE = ['qi', 'wan', 'dan', 'fu'];
function canSeal(it) {
  return !!owns('seal_xian') && SEALABLE.includes(ITEMS[it.id].cat) && !ITEMS[it.id].tool && !it.sealed && !it.mark && !(it.stolen > 0) && !ITEMS[it.id].contra && it.id !== 'seal_xian';
}

function sealItem(it) {
  if (!canSeal(it)) return owns('seal_xian') ? '이 물건에는 봉인을 붙일 수 없다' : '정파 봉인부가 없다';
  const err = exert('seal');
  if (err) return err;
  destroyItem(owns('seal_xian'));
  it.sealed = true;
  // 封印是真的，假的是来历：要看穿得认得名门的出品，做工至少二重，作伪越精越难看穿
  it.grade = Math.max(it.grade || 0, Math.min(4, 2 + Math.floor(techLv('forgery') / 2)));
  it.forged = true;
  log(`${itemName(it)}에 정파 봉인을 붙였다. 명문가 소산처럼 보인다.`, 'warn');
  return null;
}

// 未抹的烙印：原主循迹追来；卖出去的，原主顺着买主也能找回来
function markTick() {
  S.markedSold = (S.markedSold || []).filter(e => {
    if (S.day - e.day > 12) return false;
    if (Math.random() >= 0.05 * e.str + 0.03) return true;
    startStory(`tr_sold_${e.owner}_${S.day}`, 'tracker', 'claim', 1, { pid: e.owner, uid: -1, name: e.name });
    return false;
  });
  for (const it of Object.values(S.items)) {
    if (!it.mark || !HELD(it) || S.story[`tr_${it.uid}`]) continue;
    const ch = 0.04 * it.mark.str + (it.pos.g === 'display' ? 0.05 : 0) - (it.pos.g === 'hidden' ? 0.03 : 0);
    if (Math.random() < ch) startStory(`tr_${it.uid}`, 'tracker', 'claim', 1, { pid: it.mark.owner, uid: it.uid, name: itemName(it) });
  }
}

Object.assign(STORIES, {
  tracker: {
    nodes: {
      claim: {
        when: 'day',
        who: st => { const p = S.people[st.flags.pid]; return { name: p.name, portrait: p.portrait, title: '자취를 따라온 자', faction: p.faction, pid: p.pid }; },
        cond: st => S.people[st.flags.pid] && S.people[st.flags.pid].status === 'alive',
        text: st => {
          const p = S.people[st.flags.pid], held = S.items[st.flags.uid] && HELD(S.items[st.flags.uid]);
          return held
            ? `${p.title} 하나가 곧장 카운터 앞으로 와서 손바닥을 뒤집자 신식 한 가닥이 네 창고를 더듬었다: "내 ${st.flags.name}, 아직 내 낙인이 남아 있지."\n"누가 훔쳤는지는 상관없다. 내가 묻는 건 하나뿐이다 — 돌려주겠나, 아니면 말겠나?"`
            : `${p.title} 하나가 찾아왔다: "내 ${st.flags.name}에 내 낙인이 있어. 자취를 따라가 보니 산 사람이 네 가게에서 샀다더군."\n"이 계산은 네가 풀어줘야겠다."`;
        },
        choices: st => {
          const p = S.people[st.flags.pid], it = S.items[st.flags.uid], held = it && HELD(it);
          const val = held ? Math.round(claimedValue(it) * priceMul(it.id)) : 150;
          const pay = Math.round(val * 0.4 / 10) * 10;
          const list = [];
          if (held) list.push({ label: '주인에게 돌려준다', hint: '이 물건을 잃는다', run: () => {
            destroyItem(it); remember(p, '도둑맞은 물건을 그에게 돌려주었다.', 20, 'helped');
            return { text: '그는 물건을 거두며 고개를 끄덕였다: "너는 세상 물정을 아는 자로군."', end: true };
          } });
          list.push({ label: `돈으로 무마한다(${pay})`, hint: costHint(pay), req: needStones(pay), run: () => {
            spend(pay, `분실주 ${p.name}에게 ${pay} 영석을 배상했다.`); remember(p, `그에게 ${pay} 영석을 배상했다.`, 8);
            if (it) { it.mark = null; it.stolen = 0; }
            return { text: '그는 영석을 받고 자기 낙인을 지웠다: "이 물건은 이제 네 것이다."', end: true };
          } });
          list.push({ label: '세력으로 눌러버린다', hint: `성공률 ${Math.round(overpowerOdds(p) * 100)}%(너의 세력 ${playerPower()}, 상대 ${npcPower(p)})`, run: () => {
            if (Math.random() < overpowerOdds(p)) { remember(p, '세를 믿고 눌러버렸다.', -15, 'swallowed'); return { text: '그는 너를 한참 노려보다가 콧방귀를 뀌고 물러났다.', end: true }; }
            if (held) destroyItem(it);
            const dmg = retaliate(p, 50); remember(p, '세를 믿고 깔아뭉개려 했지만 누르지 못했다.', -20);
            return { text: `"건방진 소리." 그는 물건을 빼앗아 갔다.\n며칠 안 가 — ${dmg}`, end: true };
          } });
          list.push({ label: '모른 체한다', hint: '믿지 않을 수도 있다', run: () => {
            if (lieCaught(p.savvy + 0.2)) {
              if (held) destroyItem(it);
              addHeat(10); remember(p, '정면으로 모른 체하다가 낙인에 들통났다.', -25, 'lied');
              return { text: '그가 냉소하며 낙인을 움직이자 그 물건이 네 창고에서 희미하게 빛났다. 그는 그 자리에서 가져가고 집법당에 고했다.', end: true };
            }
            remember(p, '본 적 없다고 했다.', -5);
            return { text: '그는 의심스러운 듯 한 바퀴 둘러보고 못 찾은 채 풀이 죽어 돌아갔다.', end: true };
          } });
          return list;
        },
      },
    },
  },
});
