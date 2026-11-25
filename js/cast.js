// 角色册：一个文件写完一个有名有姓的人物——身份、样貌、性情、自己的故事线、何时登场、和其他系统的牵连。
// 每个角色放在 js/cast/<id>.js，调用 defineCharacter 注册；工具见 tools/cast/cast.mjs，写法见 .claude/skills/dangpu-character
'use strict';

const CAST = {};
const RESERVED_FACES = new Set();   // 被角色占用的路人面孔：路人不再长这张脸

/*
defineCharacter({
  id, name, faction, sex: 'm'|'f', title, bio, intro,
  portrait,                 // 写实立绘的底图名（assets/chars/<portrait>.webp 与 _pleased… 六种神态）；复用现成的路人脸或新画
  art,                      // 新画时的画面描述（英文），tools/cast/cast.mjs art 据此生图；复用现成的脸可省
  savvy, power, eye,        // 精明 0–1；势力 0–100；眼力 0–4
  traits: { greed, integrity, caution, wish, budgetMul, secret },
  start: { day, node, cond, chance },   // 第几天起可能登场、从哪个节点开始、额外条件、每天登场几率
  regular: true,            // 故事间隙也像熟客一样来铺子买卖
  lines: { first, neutral, warm, close, cold, hostile, sell, buy },   // 熟客来时的口头禅（可选）
  command: { label, run },  // 被你控心后肯办的那件“方便”（可选）
  on: { start, gift, sold, bought, night, death },   // 与其他系统的牵连，见 castEvent
  nodes: { <节点>: { when, who, mood, item, cond, text, choices } }, // 故事线：与 stories.js 的写法相同；mood 为进场神态，抉择也可带 mood
});
*/
function defineCharacter(def) {
  const need = ['id', 'name', 'faction', 'sex', 'title', 'portrait', 'nodes', 'start'];
  const miss = need.filter(k => def[k] == null);
  if (miss.length) throw new Error(`캐릭터 ${def.id || '?'} 누락: ${miss.join(', ')}`);
  if (STORIES[def.id] && !CAST[def.id]) throw new Error(`캐릭터 id ${def.id}이(가) 기존 이야기와 겹침`);
  if (!def.nodes[def.start.node || Object.keys(def.nodes)[0]]) throw new Error(`캐릭터 ${def.id}의 시작 노드가 없음`);
  CAST[def.id] = def;
  STORIES[def.id] = {
    person: { pid: def.id, name: def.name, faction: def.faction, portrait: def.portrait, title: def.title, sex: def.sex,
      savvy: def.savvy != null ? def.savvy : 0.4, bio: def.bio || '' },
    intro: def.intro || def.bio || '',
    nodes: def.nodes,
  };
  // 立绘早有男女记录且与人物不符：记下来交给检查，不悄悄改掉
  if (FACE_SEX[def.portrait] && FACE_SEX[def.portrait] !== def.sex) def.sexConflict = FACE_SEX[def.portrait];
  else FACE_SEX[def.portrait] = def.sex;
  // 复用路人的脸：底图交给角色，路人只用另外两张；复用的是 _f1/_f2，就把这张从路人里拿掉
  if (/_f\d$/.test(def.portrait)) RESERVED_FACES.add(def.portrait);
  else if (Object.values(PORTRAITS).some(list => list.some(([k]) => k === def.portrait))) STORY_FACES.add(def.portrait);
  if (def.power != null) POWER_BY_PID[def.id] = def.power;
  if (def.command) SPECIAL_COMMANDS[def.id] = def.command;
  return def;
}

const castOf = p => p && p.story && CAST[p.story];
const castStory = id => S.story[id];

// 让某个角色的故事跳到某个节点（钩子里用）；delay 为几天后，可写 [最少, 最多]
function jump(id, node, delay = 1) {
  const st = S.story[id];
  if (!st || !STORIES[st.tpl].nodes[node]) return;
  st.node = node; st.done = false;
  st.due = S.day + (Array.isArray(delay) ? rint(delay[0], delay[1]) : delay);
}

// 每天开铺前：到了时候、满足条件的角色登场
function castTick() {
  for (const def of Object.values(CAST)) {
    const st = S.story[def.id];
    // 改过角色文件后读旧存档：存档里的节点已经删了或改名，就从头讲起
    if (st && !st.done && !def.nodes[st.node]) { st.node = def.start.node || Object.keys(def.nodes)[0]; st.due = S.day; }
    if (st) continue;
    const s = def.start;
    if (S.day < (s.day || 1) || (s.cond && !s.cond()) || (s.chance != null && Math.random() >= s.chance)) continue;
    startStory(def.id, def.id, s.node || Object.keys(def.nodes)[0], 0);
    const p = S.people[def.id];
    if (p) {
      Object.assign(p, def.traits || {});
      if (def.eye != null) p.eye = def.eye;
      p.sex = def.sex;
      // 登场时的处境：可以带着伤、中着毒来
      if (def.on && def.on.start) castEvent(p, 'start');
    }
  }
}

// 与其他系统的牵连：on.start(st, p)（刚登场时，可给他添伤添毒）、on.gift(st, p, it, res)、on.sold(st, p, it, price)（他从你这儿买走）、on.bought(st, p, it, price)（你收了他的货）、
// on.death(st, p)、on.night(st, p)（每夜，返回一句话就进夜间报告）
function castEvent(p, ev, ...args) {
  const def = castOf(p), fn = def && def.on && def.on[ev];
  if (!fn) return null;
  try { return fn(S.story[def.id], p, ...args) || null; } catch (e) { console.error(`캐릭터 ${def.id}의 ${ev} 훅 오류`, e); return null; }
}

function castNight() {
  const out = [];
  for (const def of Object.values(CAST)) {
    const p = S.people[def.id];
    if (!p || p.status !== 'alive' || !S.story[def.id]) continue;
    const r = castEvent(p, 'night');
    if (r) out.push({ icon: FACTIONS[def.faction].icon, title: def.name, text: r, cls: 'warn' });
  }
  return out;
}

// 故事间隙也来做买卖的角色：今天没有故事要讲、活着、不在门外排队
function castRegular(p) {
  const def = castOf(p);
  if (!def || !def.regular || p.status !== 'alive') return false;
  const st = S.story[def.id];
  return !st || st.done || st.due > S.day;
}

// 熟客口头禅：角色有自己的就用自己的
function castLine(p, key, vars = {}) {
  const def = castOf(p), v = def && def.lines && def.lines[key];
  return v ? fill(Array.isArray(v) ? pick(v) : v, vars) : null;
}
