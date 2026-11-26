// 货品册：一个文件写完一条货——物品长什么样、值多少、从哪儿来、到哪儿去、怎么做出来、用什么设备做。
// 文件放在 js/goods/<名>.js，调用 defineItem / defineRecipe / defineMachine 注册；工具见 tools/goods/goods.mjs，写法见 .claude/skills/dangpu-item
'use strict';

const GOODS = {};      // id → 定义（只含货品册里新加的）
const RECIPES = [];    // 自定义配方（含给老设备加的）
const NEW_MACHINES = {};

/*
defineItem({
  id, name, cat, w, h, base, desc,            // 必填；cat 见 data.js 的 CATS；w×h 占几格（1–3）；base 中等品相的基础价
  art,                                         // 英文画面描述，tools/goods/goods.mjs art 据此生图（底图 + 下品/上品/极品）
  noTier,                                      // 没有品相之分（不画三档、不显示品质）
  war, lux, contra, illicit,                   // 战时涨价权重 0–1；太平奢侈品；仙门禁物；魔宗禁药
  mod,                                         // 可装进哪台设备的模组格（设备类型或数组）
  from: {                                      // 从哪儿来（至少一处，或由配方做出来）
    supply: [单价, 魔宗声望要求], bulk,        //   货郎常备；bulk 备货多
    sell: { ren: 权重, mo: 权重, ... },        //   哪族客人会拿来卖
    loot: { ruins: 权重, ... }, warLoot: {},   //   拾荒地点（ruins battlefield scrapyard graveyard beastcave）；战时才有的
    dealer: { ghost: 每批件数, ... },          //   鬼市 ghost / 散修联盟 league / 宗门批发 sect 出货
    merit: { mo: 功勋, ... },                  //   功勋兑换
    gift: ['ren', ...],                        //   亲厚熟客会送的
  },
  to: {                                        // 到哪儿去（客人按品类自然会来买，这里写额外的去处）
    wish: ['蛇妖', ...],                       //   这些身份的人心心念念想要
    dealer: ['league', ...],                   //   这些贩子收
    order: ['heir', ...],                      //   这些派系的订单会要
    cultivate: [修为, 损阴德?],                //   能服炼
    restore: [体力, 精神],                     //   能服用
    lace: true,                                //   能往里加料
  },
});
defineRecipe({ machine, in: [[id, 件数], ...], out, qty, mod, burnMod, tech: [技艺, 重数], q, batches, first, desc });
defineLace(kind, { name, verb, detect, desc, apply(p, it, name, knew), onMe(it) });   // 新的料；物品上写 additive: kind
defineMachine({ type, name, price, power, in: [w, h], out: [w, h], mod: [w, h], modLabel, overflow, feedStack, cost: [体力, 精神], tech, art, desc });   // feedStack：料与产物同种叠放，一处至多几份
*/

const LOOT_LOC = id => LOCATIONS.find(l => l.id === id);

function defineItem(def) {
  const need = ['id', 'name', 'cat', 'base', 'desc'];
  const miss = need.filter(k => def[k] == null);
  if (miss.length) throw new Error(`상품 ${def.id || '?'}에 ${miss.join(', ')}이(가) 없음`);
  if (ITEMS[def.id] && !GOODS[def.id]) throw new Error(`상품 id ${def.id}이(가) 기존 물품과 중복됨`);
  if (!CATS[def.cat]) throw new Error(`상품 ${def.id}의 품목 ${def.cat}이(가) 없음(data.js의 CATS 참조)`);
  GOODS[def.id] = def;
  const it = { name: def.name, cat: def.cat, w: def.w || 1, h: def.h || 1, base: def.base, desc: def.desc };
  for (const k of ['war', 'lux', 'contra', 'illicit', 'mod', 'icon', 'additive']) if (def[k] != null) it[k] = def[k];
  ITEMS[def.id] = it;
  if (def.noTier) NO_QUALITY.add(def.id);
  const f = def.from || {}, t = def.to || {};
  if (f.supply) { SUPPLY.push([def.id, f.supply[0], f.supply[1] != null ? f.supply[1] : -100]); if (f.bulk) BULK.push(def.id); }
  for (const [fac, w] of Object.entries(f.sell || {})) SELL_POOLS[fac].push([def.id, w]);
  for (const [loc, w] of Object.entries(f.loot || {})) LOOT_LOC(loc).loot.push([def.id, w]);
  for (const [loc, w] of Object.entries(f.warLoot || {})) (LOOT_LOC(loc).warLoot = LOOT_LOC(loc).warLoot || []).push([def.id, w]);
  for (const [d, lot] of Object.entries(f.dealer || {})) DEALERS[d].sells.push([def.id, lot]);
  for (const [fac, cost] of Object.entries(f.merit || {})) MERIT_SHOP[fac].push([def.id, cost]);
  for (const fac of f.gift || []) GIFTS[fac].push(def.id);
  for (const title of t.wish || []) (WISHES[title] = WISHES[title] || []).push(def.id);
  for (const d of t.dealer || []) DEALERS[d].buys.push(def.id);
  for (const k of t.order || []) ORDER_GOODS[k].push(def.id);
  if (t.cultivate) CULT_XP[def.id] = t.cultivate;
  if (t.restore) RESTORE[def.id] = t.restore;
  if (t.lace) LACEABLE.push(def.id);
  for (const k of t.cure || []) CONDS[k].cure.push(def.id);
  return def;
}

function defineRecipe(r) {
  const ids = [...r.in.map(x => x[0]), r.out, ...(r.mod ? [r.mod] : [])];
  const bad = ids.filter(id => !ITEMS[id]);
  if (bad.length) throw new Error(`레시피 ${r.out}이(가) 없는 물품을 씀: ${bad.join(', ')}(먼저 defineItem)`);
  const m = MACHINES[r.machine];
  if (!m) throw new Error(`레시피 ${r.out}의 설비 ${r.machine}이(가) 없음`);
  if (Array.isArray(m.inputs)) for (const [id] of r.in) if (!m.inputs.includes(id)) m.inputs.push(id);
  // first：排到同设备的其他配方前头（用料更专的配方，免得被通用配方先截走）
  RECIPES[r.first ? 'unshift' : 'push'](Object.assign({ qty: 1, batches: 1, q: 0 }, r));
  return r;
}

// 新的“料”：可加进别的货里。apply(p, it, name, knew) 是货到了别人手里后的效果；onMe(it) 是你自己吃下别人掺了这料的货
function defineLace(kind, def) {
  if (LACE[kind]) throw new Error(`재료 ${kind}이(가) 이미 있음`);
  const need = ['name', 'verb', 'desc', 'apply'];
  const miss = need.filter(k => def[k] == null);
  if (miss.length) throw new Error(`재료 ${kind}에 ${miss.join(', ')}이(가) 없음`);
  LACE[kind] = Object.assign({ detect: 0 }, def);
  return LACE[kind];
}

function defineMachine(def) {
  const need = ['type', 'name', 'price', 'power', 'in', 'out', 'desc'];
  const miss = need.filter(k => def[k] == null);
  if (miss.length) throw new Error(`설비 ${def.type || '?'}에 ${miss.join(', ')}이(가) 없음`);
  if (MACHINES[def.type]) throw new Error(`설비 ${def.type}이(가) 이미 있음`);
  NEW_MACHINES[def.type] = def;
  MACHINES[def.type] = { name: def.name, icon: def.icon || def.type, price: def.price, power: def.power, in: def.in, out: def.out,
    inputs: [], overflow: !!def.overflow, desc: def.desc, custom: true };
  if (def.mod) Object.assign(MACHINES[def.type], { mod: def.mod, modLabel: def.modLabel });
  if (def.feedStack) MACHINES[def.type].feedStack = def.feedStack;
  MACHINE_COST[def.type] = def.cost || [4, 4];
  if (def.tech) TECHS[def.tech].machines.push(def.type);
  return def;
}

// ───────────── 配方运转 ─────────────

const recipesFor = type => RECIPES.filter(r => r.machine === type);

function recipeReady(m, r, inputs) {
  if (r.tech && techLv(r.tech[0]) < r.tech[1]) return false;
  if (r.mod && !hasMod(m, r.mod)) return false;
  return r.in.every(([id, n]) => countIn(inputs, id) >= n);
}

// 夜间检查：有配方能做就报能做什么；新设备没配方能做时报缺什么；老设备没对上自定义配方就交还原来的逻辑
function customCheck(m, inputs) {
  const rs = recipesFor(m.type);
  if (!rs.length || m.brew > 0 || m.ready) return null;
  const r = rs.find(x => recipeReady(m, x, inputs));
  if (r) return outputHasRoom(m, r.out) ? { ok: true, msg: `제작 예정: ${ITEMS[r.out].name}` } : { ok: false, msg: '산출 칸이 가득 참' };
  if (!MACHINES[m.type].custom) return null;
  const hint = rs.map(x => `${x.in.map(([id, n]) => `${ITEMS[id].name}×${n}`).join('+')}${x.mod ? `(모듈: ${ITEMS[x.mod].name})` : ''}${x.tech ? `(${TECHS[x.tech[0]].name} ${x.tech[1]}단계)` : ''}→${ITEMS[x.out].name}`);
  return { ok: false, msg: `재료 부족: ${hint.join('; ')}` };
}

function customRun(m, inputs, emit) {
  const rs = recipesFor(m.type);
  if (!rs.length || m.brew > 0 || m.ready) return false;
  let done = false;
  for (const r of rs) {
    for (let b = 0; b < r.batches * (hasBoostFu(m) ? 2 : 1); b++) {
      if (!recipeReady(m, r, inputs) || !outputHasRoom(m, r.out)) break;
      const used = r.in.flatMap(([id, n]) => takeItems(inputs, id, n));
      const q = clamp((used.some(hasQuality) ? avgQ(used.filter(hasQuality)) : 60) + r.q + retreatQ(), 5, 100);
      for (let k = 0; k < r.qty; k++) emit(makeItem(r.out, { q }));
      done = true;
    }
    if (done && r.burnMod) burnMod(m, r.mod);
    if (done) break;
  }
  if (done) burnMod(m, 'zhen_fu');
  return done;
}

// 读旧存档：删掉了的货品不能留在库房里（否则界面找不到它）
function pruneUnknownItems() {
  for (const it of Object.values(S.items)) if (!ITEMS[it.id]) delete S.items[it.uid];
  for (const m of S.machines.slice()) if (!MACHINES[m.type]) S.machines.splice(S.machines.indexOf(m), 1);
}
