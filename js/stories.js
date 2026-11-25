// 故事线：每个角色是一台按日推进的状态机。节点给出处境与抉择，抉择改变命数、好感与铺子的处境
'use strict';

// S.story[key] = { tpl, node, due, flags, done, summary }
// 节点：{ when: 'day'|'night', who?, item?, cond?, text(st, p), choices(st, p) → [{ label, hint, req, run }] }
// run 返回 { text, go: [节点, 延迟日数或 [最少, 最多]], end, summary }

// ───────────── 引擎 ─────────────

function startStory(key, tpl, node, delay, flags = {}) {
  if (S.story[key]) return;
  const def = STORIES[tpl];
  if (def.person && !S.people[def.person.pid]) newPerson(def.person.faction, Object.assign({ story: key }, def.person));
  S.story[key] = { tpl, node, due: S.day + delay, flags, done: false, summary: def.intro || '' };
}

function storyDef(st) { return STORIES[st.tpl]; }
function storyNode(st) { return storyDef(st).nodes[st.node]; }
function storyPerson(st) {
  const def = storyDef(st);
  return def.person ? S.people[def.person.pid] : st.flags.pid ? S.people[st.flags.pid] : null;
}

// 今天到期、条件满足的故事；条件不满足的顺延
function dueStories(when) {
  const out = [];
  for (const [key, st] of Object.entries(S.story)) {
    if (st.done || st.due > S.day) continue;
    const node = storyNode(st);
    if (node.when !== when) continue;
    if (node.cond && !node.cond(st, storyPerson(st))) { st.due = S.day + 1; continue; }
    out.push(key);
  }
  return out;
}

// 故事来客：放进当天的队列
function storyVisitor(key) {
  const st = S.story[key], p = storyPerson(st), node = storyNode(st);
  const who = Object.assign({ name: p && p.name, portrait: p && p.portrait, title: p && p.title, faction: p ? p.faction : 'ren' },
    node.who ? node.who(st, p) : {});
  const mood = typeof node.mood === 'function' ? node.mood(st, p) : node.mood;
  return Object.assign({ kind: 'story', key, pid: p && !node.who ? p.pid : null }, mood ? { mood } : {}, who);
}

// 抉择之后来客的神情：抉择或结果里写明的为准；否则看交情涨跌——你作了恶，他斗不过你就怕，斗得过就恼。
// 换了别人出场（官差、苦主）的节点，交情说的不是眼前这个人，不猜
function storyMood(node, ch, res, p, aff0) {
  if (res.mood || ch.mood) return res.mood || ch.mood;
  if (node.who || !p || p.status !== 'alive' || aff0 == null) return null;
  const d = p.aff - aff0;
  if (ch.sin && d < 0) return playerPower() >= npcPower(p) + 10 ? 'afraid' : 'angry';
  return d >= 4 ? 'pleased' : d <= -4 ? 'angry' : null;
}

function resolveChoice(key, idx) {
  const st = S.story[key], node = storyNode(st), p = storyPerson(st);
  const ch = node.choices(st, p)[idx], aff0 = p ? p.aff : null;
  const res = ch.run(st, p) || {};
  if (ch.sin) commitSin(ch.sin[0], { p, w: ch.sin[1], what: ch.label.replace(/[（(].*$/, ''), virtue: 3 * ch.sin[1] });
  res.mood = storyMood(node, ch, res, p, aff0);
  loveBondCheck();
  if (res.summary) st.summary = res.summary;
  if (res.end) st.done = true;
  else if (res.go) {
    const [next, delay] = res.go;
    st.node = next;
    st.due = S.day + (Array.isArray(delay) ? rint(delay[0], delay[1]) : delay);
  }
  if (p && res.text) p.lastStory = res.text;
  checkHeat();
  return res;
}

function choiceState(ch, st, p) {
  if (!ch.req) return null;
  const r = ch.req(st, p);
  return r === true ? null : r || '조건 부족';
}

// ───────────── 工具 ─────────────

const HELD = it => it.pos && !['counter', 'basket'].includes(it.pos.g);
function ownItem(pred) { return Object.values(S.items).find(it => HELD(it) && pred(it)); }
function owns(id) { return ownItem(it => it.id === id); }
// 照妖镜之类的鉴定法器不算兵器
function ownWeapon() { return ownItem(it => ITEMS[it.id].cat === 'qi' && !ITEMS[it.id].tool && !it.fake); }

function giveItem(id, extra = {}) {
  const it = makeItem(id, Object.assign({ q: rint(60, 90) }, extra));
  stow(it);
  return it;
}

function takeItem(it) { if (it) destroyItem(it); }

// 把柜台上的东西收进库房（故事中买下对方的货）
function keepCounterItem(extra = {}) {
  const it = customerItem();
  if (!it) return null;
  Object.assign(it, extra);
  S.customer.item = null;
  stow(it);
  return it;
}

function payUpTo(n, why) { const paid = Math.min(n, Math.max(0, S.stones)); spend(paid, why); return paid; }
const costHint = n => `-${n} 영석`;
const needStones = n => () => S.stones >= n || '영석이 부족하다';

// 交手：armed 时有法器加成，魔宗声望也壮胆
// 你身上的伤、毒、力竭都拖后腿；境界越高越从容
function fightRoll(bonus = 0) {
  const w = ownWeapon();
  const power = w ? (w.id === 'soul_banner' ? 0.35 : w.id === 'xian_sword' ? 0.3 : 0.18) : 0;
  return Math.random() < clamp(0.3 + power + S.rep.mo / 250 + bonus + 0.06 * (S.cult.lv - 1) - condPenalty('me') / 100, 0.05, 0.9);
}

// 说谎：savvy 越高越易识破
// 心神不宁（走火入魔、力竭、毒发）时谎话更容易露馅
function lieCaught(savvy) {
  const shaky = 0.06 * condSev('me', 'deviation') + 0.04 * condSev('me', 'poisoned') + (hasCond('me', 'exhausted') ? 0.05 : 0);
  return Math.random() < clamp(savvy - (S.upgrades.master ? 0.1 : 0) + shaky, 0.05, 0.95);
}

// 夜里有人搜查，藏人能否瞒过
// 你带着伤，地上的血迹容易让人循迹找来
function hideRoll(base) { return Math.random() < base * (S.grids.hidden ? 0.45 : 1) * (S.flags.chenShelter ? 0.2 : 1) * (1 + 0.25 * condSev('me', 'injured')); }

// ───────────── 故事 ─────────────

const STORIES = {

  // ── 乞丐：破碗陈 ──
  beggar: {
    person: { pid: 'beggar', name: '파완 진', faction: 'ren', portrait: 'beggar', title: '늙은 거지', savvy: 0.85,
      bio: '한쪽 눈이 먼 늙은 거지. 잡역 구역에서 몇 년이나 구걸했는지 모른다. 어디서 왔는지 아는 사람이 없다.' },
    intro: '한쪽 눈이 먼 늙은 거지로, 종종 네 문 앞에서 구걸한다.',
    nodes: {
      beg: {
        when: 'day',
        who: st => st.flags.kicked >= 2 ? { at: 'door', mood: 'afraid' } : {},
        text: (st, p) => {
          const f = st.flags;
          if (!f.met) return '(한쪽 눈이 먼 늙은 거지가 떨리는 손으로 깨진 동발우 하나를 내밀었다) \\"주인장... 자비를 베푸시오. 늙은이가 사흘을 굶었소.\\"';
          if (f.kicked >= 2) return '(늙은 거지가 문지방 밖에 움츠리고 감히 들어오지 못했다) \\"늙은이는 들어가지 않겠소... 문 앞에서 한 입만, 한 입만 얻고 가겠소.\\"';
          if (f.kind >= 2) return '\\"주인장, 또 늙은이요.\\"(그가 이 하나 남은 입을 찢으며 웃었다) \\"좋은 분이시오. 늙은이가 기억하겠소.\\"';
          return '\\"주인장...\\"(낡은 발우가 카운터에 살짝 부딪혔다) \\"먹을 것 좀 주십시오.\\"';
        },
        choices: () => [
          { label: '따뜻한 죽 한 그릇을 베푼다', hint: costHint(5), req: needStones(5), run: (st, p) => {
            spend(5); st.flags.met = true; st.flags.kind = (st.flags.kind || 0) + 1;
            remember(p, '네가 그에게 따뜻한 죽 한 그릇을 베풀었다.', 8, 'helped');
            return beggarNext(st, '늙은 거지가 죽을 받아 들고, 그 멀쩡한 눈으로 너를 오래 보았다. \\"좋은 사람... 좋은 사람이오.\\"');
          } },
          { label: '그에게 영석 하나를 준다', hint: costHint(20), req: needStones(20), run: (st, p) => {
            spend(20); st.flags.met = true; st.flags.kind = (st.flags.kind || 0) + 2;
            remember(p, '네가 그에게 이십 영석을 줬다.', 15, 'helped');
            return beggarNext(st, '그가 영석을 쥐고 오래도록 문질렀다. 무언가를 확인하듯이. \\"영석... 늙은이가 영석을 만져본 지도 오래됐구먼.\\"');
          } },
          { label: '그에게 청소를 시키고 밥을 준다', hint: '돈이 안 든다', run: (st, p) => {
            st.flags.met = true; st.flags.kind = (st.flags.kind || 0) + 1; st.flags.noticed = true;
            remember(p, '네가 그에게 청소를 시키고 밥 한 끼를 줬다.', 4);
            return beggarNext(st, '그는 몹시 느리게, 그러나 티끌 하나 없이 쓸었다. 빗자루를 쥔 손이 이상하리만치 안정됐고, 엄지와 검지 사이에는 굳은살이 가득했다 - 오래 병기를 쥔 자의 굳은살이다.');
          } },
          { label: '쫓아낸다', hint: '인족 평판 -1', run: (st, p) => {
            st.flags.met = true; st.flags.kicked = (st.flags.kicked || 0) + 1;
            adjustRep('ren', -1);
            remember(p, '네가 그를 문 밖으로 쫓아냈다.', -12);
            return beggarNext(st, '늙은 거지가 밀려 문 밖으로 나가 진흙탕에 넘어졌지만, 한마디도 없이 천천히 일어나 갔다.');
          } },
        ],
      },
      hunted: {
        when: 'night',
        text: () => '한밤중, 누군가 다급하게 문을 두드렸다. 그 늙은 거지였다. 온몸이 피투성이고, 먼 눈 위의 옛 흉터가 터져 있었다.\\n\\"주인장... 집법당이 늙은이를 쫓고 있소... 카운터 밑에 하룻밤만, 딱 하룻밤만 숨겨주시오...\\"\\n멀리서 쇠사슬 소리가 들리고, 횃불 빛이 다가왔다.',
        choices: () => [
          { label: '그를 숨긴다', hint: `발각되면 집법당 주목 +25, 벌금${S.grids.hidden ? '(암격 있음, 비교적 안전)' : ''}`, run: (st, p) => {
            if (hideRoll(0.35)) {
              addHeat(25); payUpTo(200, '중요범을 숨겨준 죄로 집법당에 벌금을 물었다.');
              p.status = 'jailed';
              lifeNote(p, '네 가게에서 집법당에 발각돼 끌려갔다.');
              remember(p, '네가 위험을 무릅쓰고 그를 숨겼지만 숨기지 못했다.', 10);
              return { text: '순찰이 문을 걷어차고 카운터 밑에서 늙은 거지를 끌어냈다. 그가 쇠사슬에 묶여 끌려가며 너를 돌아보았다 - 그 멀쩡한 눈에는 원망이 없고, 알 수 없는 무언가만 있었다.', end: true, summary: '네가 위험을 무릅쓰고 그를 숨겼지만 못 숨겼다. 그가 집법당에 끌려갔다.' };
            }
            remember(p, '그날 밤, 너는 그를 카운터 밑에 숨겼다.', 40, 'helped');
            return { text: '순찰이 문을 걷어차고 한 바퀴 수색한 뒤 욕을 하며 떠났다. 날이 밝기 전, 늙은 거지가 너에게 깊이 절하고 아침 안개 속으로 사라졌다.', go: ['return', [5, 7]], summary: '그날 밤, 너는 집법당에 쫓기는 늙은 거지를 숨겼다.' };
          } },
          { label: '그를 집법당에 넘긴다', sin: ['betray', 3], hint: '상금 획득, 마종 평판 +6. 인족 평판 -8', run: (st, p) => {
            earn(200, '늙은 거지를 넘기고 상금 200 영석을 받았다.');
            adjustRep('mo', 6); adjustRep('ren', -8); addHeat(-10);
            remember(p, '네가 그를 집법당에 넘겼다.', -100, 'betrayed');
            p.status = 'jailed';
            return { text: '네가 문을 열어 순찰에게 카운터를 가리켰다. 늙은 거지는 저항하지 않았다. 끌려가며 한 번 웃었는데, 그 웃음에 네 등골이 서늘해졌다.', go: ['sold', [3, 5]], summary: '네가 그를 집법당에 넘겼다.' };
          } },
          { label: '문을 걸어 잠그고 못 들은 척한다', run: (st, p) => {
            remember(p, '그가 문을 열어달라 애원했지만 너는 열지 않았다.', -25);
            p.status = 'gone';
            lifeNote(p, '그날 밤 이후, 잡역 구역에서 그를 본 사람이 없다.');
            return { text: '문 두드리는 소리가 점점 약해졌다. 다음 날 아침, 길모퉁이에 핏자국 한 웅덩이가 생겼고, 깨진 동발우 하나가 피 속에 엎어져 있었다.', end: true, summary: '그가 문을 열어달라 애원했지만 너는 열지 않았다. 그 후로 그를 보지 못했다.' };
          } },
        ],
      },
      return: {
        when: 'day',
        who: () => ({ name: '혈수 진효', portrait: 'beggar_master', title: '전 마종 장로', faction: 'mo' }),
        text: () => '문 앞에 허리가 꼿꼿한 노인이 서 있었다. 먹빛 도포에 암홍 운무늬, 먼 눈 위 흉터가 핏빛을 띠었다 - 바로 그 늙은 거지였다.\\n\\"삼십 년 전, 노부는 같은 문파의 암계를 당해 수련을 모두 잃고 구걸로 연명했네. 그날 밤 자네가 아니었다면...\\" 그가 깨진 동발우를 카운터에 살며시 놓았다.\\n\\"노부는 혈수 진효, 은원이 분명하네. 말하게, 무엇을 원하나?\\"',
        choices: () => [
          { label: '천오백 영석', run: (st, p) => {
            earn(1500, '혈수 진효가 천오백 영석으로 사례했다.');
            return chenReward(p, '그가 손가락을 튀기자 영석 한 주머니가 카운터에 떨어졌다. \\"속되긴 해도, 실속은 있군.\\"');
          } },
          { label: '손에 익은 법보 하나', run: (st, p) => {
            giveItem('soul_banner', { q: 95 });
            return chenReward(p, '그가 소매에서 검은 편 한 자루를 털어내자, 편면의 잔혼이 처절하게 울부짖었다. \\"노부가 한때 지니던 물건이니, 네게 주마.\\"');
          } },
          { label: '그에게 이 가게의 비호를 청한다', hint: '집법당 주목이 크게 내리고 순찰이 한결 느슨해졌다', run: (st, p) => {
            S.flags.chenShelter = true; addHeat(-40); adjustRep('mo', 15);
            S.flags.inspectMul *= 0.5;
            return chenReward(p, '그가 고개를 끄덕이며 문설주 위에 피 손도장을 찍었다. \\"앞으로 집법당 놈들이 들어오기 전에 이걸 먼저 볼 거다.\\"');
          } },
        ],
      },
      sold: {
        when: 'day',
        who: () => ({ name: '집법당 순찰', portrait: 'mo_enforcer', title: '집법당', faction: 'mo' }),
        text: () => '집법당 순찰이 보따리 하나를 카운터에 내던졌다: \\"그 늙은 놈이 삼십 년 전 종문을 배신한 혈수 진효였어. 장로들이 매우 만족해하네. 이건 나머지 상금이야.\\"\\n보따리 안에는 영석 외에 그 깨진 동발우도 있었다.',
        choices: () => [
          { label: '받아들인다', run: (st, p) => {
            earn(300, '집법당이 상금 300 영석을 추가로 지급했다.');
            giveItem('broken_bowl', { q: 10 });
            lifeNote(p, '혈옥에 압송돼 사흘 뒤 옥에서 급사했다.');
            p.status = 'dead';
            return { text: '순찰이 떠난 뒤, 너는 그 낡은 발우를 들었다. 발우 바닥에 닳아 거의 보이지 않는 작은 글자 한 줄이 새겨져 있었다: \\"혈수 진효, 은원이 분명하다.\\"', end: true, summary: '네가 그를 팔았다. 그가 혈옥에서 죽었다.' };
          } },
        ],
      },
    },
  },

  // ── 骗子：胡不归 ──
  swindler: {
    person: { pid: 'swindler', name: '호불귀', faction: 'ren', portrait: 'swindler', title: '낙방 서생', savvy: 0.8,
      bio: '스스로 낙방 서생이라 칭하며 접선을 흔든다. 말이 노래보다 듣기 좋다.' },
    intro: '접선을 흔들며 점잔만 떠는 흰 얼굴의 서생.',
    nodes: {
      mirror: {
        when: 'day',
        item: { id: 'bronze_mirror', extra: { fake: true, q: 75 } },
        text: () => '흰 얼굴의 서생이 접선을 흔들며 들어오더니, 말하기 전에 먼저 웃었다: \\"저는 호불귀라 하오. 십 년 한창 공부했으나 낙방하고, 여비도 다 떨어져 가보인 고경을 팔 수밖에 없게 됐소.\\"\\n그가 청동 거울 하나를 카운터에 올렸다: \\"이건 상고 시대의 여덟 꽃잎 거울이오. 알아보는 사람이 드물지. 주인장은 한눈에 전문가로 보이니 - 이백 영석, 아픔을 무릅쓰고 내놓겠소.\\"',
        choices: () => [
          { label: '산다', hint: costHint(200), req: needStones(200), run: (st, p) => {
            spend(200, '200 영석에 호불귀에게서 청동 고경을 샀다.');
            keepCounterItem({ cost: 200, boughtDay: S.day });
            remember(p, '네가 이백 영석에 그의 \\"가보 고경\\"을 샀다.', 10);
            st.flags.mark = true;
            return { text: '호불귀가 거듭 감사하며 접선을 탁 접고, 가벼운 발걸음으로 나갔다.', go: ['venture', [4, 6]], summary: '네가 이백 영석에 그의 \\"가보 고경\\"을 샀다.' };
          } },
          { label: '정면으로 폭로한다: \\"이 거울은 가짜요\\"', run: (st, p) => {
            const it = customerItem();
            if (it.verdict !== 'fake' && !lieCaught(0.6)) {
              remember(p, '네가 거울이 가짜라고 하자 그가 교묘히 변명해, 너는 허점을 지적하지 못했다.', -5);
              return { text: '\\"오? 어디가 가짜라는 거요?\\" 호불귀가 빙긋 웃으며 너를 보았다. 네가 허점을 말하지 못하자, 그는 태연히 거울을 챙겨 떠났다.', go: ['venture', [4, 6]] };
            }
            st.flags.exposed = true; adjustRep('ren', 2);
            remember(p, '네가 한눈에 그의 가짜 거울을 간파했다.', -25);
            return { text: '\\"거울 손잡이가 민무늬고, 구슬 수도 모자라네.\\" 네 말이 끝나자마자 호불귀의 얼굴색이 바뀌더니, 헛웃음 두 번 치고 거울을 안고 줄행랑쳤다.', go: ['venture', [5, 7]], summary: '네가 그의 가짜 고경을 간파했다.' };
          } },
          { label: '계략에 계략으로, 육십으로 깎아 받는다', sin: ['fraud', 1], hint: costHint(60) + '; \\"같은 길의 사람\\"이 된다', req: needStones(60), run: (st, p) => {
            spend(60);
            keepCounterItem({ cost: 60, boughtDay: S.day });
            st.flags.partner = true;
            remember(p, '네가 가짜 거울임을 간파하고도 깎아서 받아, 되팔아 남을 속이려 했다.', 25);
            return { text: '\\"육십?\\" 호불귀가 멈칫하더니 눈을 빛내며 다가와 낮게 말했다: \\"주인장도 같은 길의 사람이었군! 앞으로 좋은 장거리가 있으면 제가 제일 먼저 찾겠습니다.\\"', go: ['venture', [4, 6]], summary: '너희는 \\"같은 길의 사람\\"이 됐다.' };
          } },
          { label: '사지 않는다', run: () => ({ text: '호불귀도 화내지 않고 부채를 흔들며 떠났다.', go: ['venture', [5, 7]] }) },
        ],
      },
      venture: {
        when: 'day',
        text: st => st.flags.partner
          ? '호불귀가 또 와서 좌우를 살피더니 카운터로 다가와 속삭였다: \\"같은 길의 사람, 우리 크게 한 건 합시다 - 성남의 그 졸부들은 선문 유부를 미신처럼 믿소. 제가 보물 지도를 한 뭉치 그렸는데, 삼백 영석의 뇌물만 모자라오. 닷새 뒤, 사백오십을 드리지.\\"'
          : st.flags.exposed
            ? '호불귀가 차림을 바꾸고 뻔뻔하게 들어왔다: \\"주인장, 지난번은 오해였소. 이번엔 선문 유부의 보물 지도를 손에 넣었는데, 이번엔 진짜요. 삼백 영석 출자하면 닷새 뒤 세 배로 갚겠소!\\"'
            : '호불귀가 은밀하게 누런 양피지 한 장을 펼쳤다: \\"주인장, 선문 유부의 보물 지도요! 길을 열 사람 고용에 삼백 영석만 모자라오. 닷새 뒤, 세 배로 갚겠소!\\"',
        choices: st => [
          { label: '삼백 영석을 투자한다', hint: costHint(300), req: needStones(300), run: (st, p) => {
            spend(300, '호불귀에게 삼백 영석을 투자했다.');
            st.flags.invested = true;
            remember(p, '네가 그에게 삼백 영석을 투자했다.', 10);
            return { text: '\\"주인장, 대단한 배포요!\\" 호불귀가 영석을 소매에 넣었다, \\"닷새 뒤, 좋은 소식을 기다리시오.\\"', go: ['payout', 5], summary: '네가 그에게 삼백 영석을 투자하고 닷새 뒤의 회수를 기다린다.' };
          } },
          { label: '정중히 거절한다', run: () => ({ text: '\\"아쉽군, 아쉬워.\\" 호불귀가 한숨 쉬며 떠났다.', go: ['caught', [6, 9]] }) },
          ...(st.flags.exposed ? [{ label: '붙잡아 집법당에 넘긴다', hint: '상금 150 획득, 마종 평판 +3', run: (st, p) => {
            earn(150, '사기꾼 호불귀를 넘기고 상금 150 영석을 받았다.'); adjustRep('mo', 3);
            remember(p, '네가 그를 붙잡아 집법당에 넘겼다.', -60, 'betrayed');
            p.status = 'jailed';
            lifeNote(p, '너에게 붙잡혀 집법당에 넘겨져 광산으로 유배됐다.');
            return { text: '순찰이 호불귀에게 족쇄를 채웠다. 그가 끌려 나가며 돌아보며 외쳤다: \\"주인장, 후회유기!\\"', end: true, summary: '네가 그를 붙잡아 집법당에 넘겼다.' };
          } }] : []),
        ],
      },
      payout: {
        when: 'day',
        who: st => st.flags.partner ? {} : thugAlly() ? { name: '류라자', portrait: 'thug', title: '잡역 구역 건달', faction: 'ren' }
          : { name: '성남의 피해자', portrait: 'ren_merchant', title: '속은 이웃들', faction: 'ren' },
        text: st => st.flags.partner
          ? '호불귀가 약속대로 와서 영석 한 주머니를 카운터에 올렸다: \\"사백오십, 한 푼도 모자라지 않소. 같은 길의 사람, 말은 지키는 법이오.\\"'
          : !thugAlly()
            ? '닷새가 지나도 호불귀는 오지 않았다.\\n대신 눈이 빨갛게 운 부인이 찾아왔다: \\"당신도 그 보물 지도를 샀나요? 그 호 씨 놈이 성남 절반을 속이고 진작 달아났어요...\\"'
            : '류라자가 코뼈가 부러진 흰 얼굴 서생을 끌고 들어와 바닥에 내던졌다: \\"형제여, 이 놈이 성남 절반을 속였고, 너한테도 삼백을 떼먹었다며? 잡아왔으니 어떻게 할지 말해봐.\\"\\n호불귀가 바닥에 엎드려 있었다. 접선은 두 동강 나 있었다.',
        choices: st => !st.flags.partner && !thugAlly() ? [
          { label: '패배를 인정한다', run: (st, p) => {
            remember(p, '그가 네 삼백 영석을 챙겨 달아났다.', -40, 'lied');
            return { text: '삼백 영석, 교훈 하나 샀다고 치자. 하지만 너는 이 얼굴을 기억했다.', go: ['caught', [5, 8]], summary: '그가 네 삼백 영석을 챙겨 달아났다.' };
          } },
        ] : st.flags.partner ? [
          { label: '받아들인다', sin: ['fraud', 2], run: (st, p) => {
            earn(450, '호불귀가 사백오십 영석을 나눠줬다.');
            remember(p, '이 건으로 너희는 벌었다.', 10);
            return { text: '네가 이 출처가 바르지 않은 돈을 받았다. 성남의 몇 집이 요며칠 처절하게 울고 있다.', go: ['caught', [4, 6]], summary: '너희가 함께 성남 사람들을 속였다.' };
          } },
        ] : [
          { label: '원금에 이자를 더해 되찾는다', hint: '+600 영석', run: (st, p) => {
            earn(600, '호불귀에게서 육백 영석을 되찾았다.');
            remember(p, '네가 류라자를 시켜 그에게서 육백 영석을 짜냈다.', -30);
            return { text: '류라자가 호불귀 몸에서 영석 한 뭉치를 찾아냈다. 너를 보는 호불귀의 눈빛은 더 큰 여우를 보는 듯했다.', end: true, summary: '네가 그에게 속았다가 원금에 이자까지 되찾았다.' };
          } },
          { label: '그를 거둬 쓴다', hint: '+300 영석; 앞으로 그가 진품을 찾아준다', run: (st, p) => {
            earn(300, '호불귀가 삼백 영석을 돌려줬다.');
            st.flags.agent = true;
            remember(p, '네가 그의 목숨을 거두지 않고 도리어 거둬 썼다.', 35, 'helped');
            return { text: '\\"앞으로 그 입으로 나를 위해 진짜 물건을 좀 찾아오게.\\" 호불귀가 한참 멍하니 있다가, 부러진 부채를 허리에 꽂고 깊이 절했다: \\"주인장... 호모가 졌습니다.\\"', go: ['deal', [5, 7]], summary: '네가 이 사기꾼을 휘하에 거둬 물건을 찾게 했다.' };
          } },
        ],
      },
      caught: {
        when: 'day',
        mood: 'afraid',
        text: st => st.flags.partner
          ? '호불귀가 순찰 둘에게 끌려 문 앞을 지나다가, 갑자기 달려와 카운터를 붙잡았다: \\"주인장, 살려주시오! 삼백 영석 보석금이면 풀려나요!\\"\\n순찰이 냉소하며 너를 보았다: \\"이 사기꾼이 공범을 불었는데, 너냐?\\"'
          : st.flags.invested
            ? '호불귀가 순찰 둘에게 끌려 문 앞을 지나다가, 너를 보고 얼굴이 붉어졌지만 그래도 털썩 무릎을 꿇었다: \\"주인장... 그 삼백 영석, 죄송했습니다. 하지만 보증만 서주시면, 평생 소처럼 말처럼 일하겠습니다!\\"'
            : '호불귀가 순찰 둘에게 끌려 문 앞을 지나다가, 털썩 무릎을 꿇었다: \\"주인장, 살려주시오! 보증만 서주시면, 삼백 영석 보석금... 평생 소처럼 말처럼 일하겠소!\\"',
        choices: st => [
          { label: '그를 보증한다', hint: costHint(300) + ', 집법당 주목 +10', req: needStones(300), run: (st, p) => {
            spend(300, '호불귀를 위해 삼백 영석의 보석금을 냈다.'); addHeat(10);
            st.flags.agent = true;
            remember(p, '그가 곤경에 처했을 때 네가 대신 보석금을 냈다.', 45, 'helped');
            return { text: '순찰이 영석을 받고 족쇄를 풀었다. 호불귀가 손목을 문지르며 처음으로 웃지 않았다: \\"이 목숨은 주인장의 것이오. 앞으로 진품만 찾아드리겠소.\\"', go: ['deal', [5, 7]], summary: '네가 그를 지켜줬다. 그는 진품만 찾아주겠다고 맹세했다.' };
          } },
          { label: '관계를 끊는다', hint: st.flags.partner ? '그가 너를 불 것이다' : '', run: (st, p) => {
            remember(p, '그가 곤경에 처했을 때 너는 관계를 끊었다.', -30, 'betrayed');
            p.status = 'jailed';
            lifeNote(p, '집법당에 의해 광산 고역으로 유배됐다.');
            if (st.flags.partner) {
              addHeat(25); payUpTo(200, '호불귀가 불어서 벌금을 물었다.'); adjustRep('mo', -5);
              return { text: '\\"좋아, 좋아!\\" 호불귀가 끌려가며 크게 웃었다, \\"그럼 같이 죽자고! 성남의 그 수십 장 보물 지도, 전부 이 사람 가게에서 나온 거다!\\"', end: true, summary: '네가 관계를 끊자, 그가 너를 불었다.' };
            }
            return { text: '호불귀가 끌려갔다. 그가 가는 내내 억울하다 외치는 소리가 들렸다.', end: true, summary: '네가 그를 거들지 않았다. 그는 광산으로 유배됐다.' };
          } },
        ],
      },
      deal: {
        when: 'day',
        item: st => {
          const id = pick(['jade_pendant', 'bronze_mirror', 'pill_found']);
          return { id, extra: { fake: Math.random() < 0.15, q: rint(55, 90) } };
        },
        text: () => '호불귀가 점잖은 얼굴로 물건 하나를 카운터에 올렸다: \\"주인장, 성북 옛 저택에서 압수해온 것인데, 이번엔 진짜요. 시가의 절반에 드리겠소.\\"\\n(그의 말은 정성스러웠다 - 하지만 그는 어쨌든 호불귀다.)',
        choices: () => {
          const it = customerItem(), price = it ? Math.round(claimedValue(it) * 0.5) : 0;
          return [
            { label: `반값에 받는다(${price})`, hint: costHint(price), req: needStones(price), run: (st, p) => {
              spend(price, `호불귀에게서 ${itemName(it)} 하나를 받았다.`);
              const kept = keepCounterItem({ cost: price, boughtDay: S.day });
              if (kept.fake) st.flags.burned = (st.flags.burned || 0) + 1;
              remember(p, `네가 그가 보낸 ${itemName(kept)}을(를) 받았다.`, 3);
              return { text: '호불귀가 공수했다: \\"다음에 다시 오겠소.\\"', go: ['deal', [6, 8]] };
            } },
            { label: '사양한다', run: () => ({ text: '\\"그럼 다음에 더 좋은 걸 찾아오지.\\"', go: ['deal', [6, 8]] }) },
            { label: '왕래를 끊었다', run: (st, p) => {
              remember(p, '네가 그와의 왕래를 끊었다.', -10);
              return { text: '호불귀가 멈칫하더니 물건을 챙기고, 아무 말 없이 떠났다.', end: true, summary: '네가 그와의 왕래를 끊었다.' };
            } },
          ];
        },
      },
    },
  },

  // ── 混混：刘癞子 ──
  thug: {
    person: { pid: 'thug', name: '류라자', faction: 'ren', portrait: 'thug', title: '잡역 구역 건달', savvy: 0.5,
      bio: '잡역 구역의 패자로, 부하가 일곱여덟 있다. 흉포하긴 해도 강호의 도리는 지킨다.' },
    intro: '이 거리의 건달 두목. 이레마다 보호비를 거두러 온다.',
    nodes: {
      fee: {
        when: 'day',
        who: st => st.flags.rival ? { name: '흑구', title: '흑구방', portrait: 'mo_disciple' } : {},
        text: st => {
          const fee = st.flags.fee || 50;
          if (st.flags.rival) return `흑구방 사람들이 문을 걷어찼다: \"류라자는 죽었다. 이 거리는 흑구방의 것이다. 이레마다 ${fee} 영석.\"`;
          if (!st.flags.met) return `문발이 들리자 삭발에 흉터 얼굴의 사내가 들어와 카운터에 기대며, 풀 줄기를 물고 너를 곁눈질했다: \"새로 왔나? 이 거리는 나 류라자가 관리해. 이레마다 ${fee} 영석, 네 평안을 보장하지.\"`;
          if (st.flags.refused) return `류라자 뒤로 부하 서넛이 따라와 문을 막았다: \"지난번에 체면을 안 세워줬지. 이번엔 원금에 이자까지, ${fee} 영석.\"`;
          return `류라자가 또 와서 손가락으로 카운터를 두드렸다: \"늘 하던 대로, ${fee} 영석.\"`;
        },
        choices: st => {
          const fee = st.flags.fee || 50;
          const list = [
            { label: `돈으로 무마한다(${fee})`, hint: costHint(fee), req: needStones(fee), run: (st, p) => {
              spend(fee, `보호비 ${fee} 영석을 냈다.`);
              st.flags.met = true; st.flags.refused = false; st.flags.fee = fee + 20;
              remember(p, `네가 보호비 ${fee} 영석을 냈다.`, 5);
              return { text: '류라자가 영석을 저울질하며 입을 찢었다: \\"사정을 아는군.\\"', go: ['fee', 7] };
            } },
          ];
          if (!st.flags.rival) list.push({ label: '그에게 영주 한 단을 대접한다', hint: '영주 한 단이 필요하다', req: () => !!owns('spirit_wine') || '창고에 영주가 없다', run: (st, p) => {
            takeItem(owns('spirit_wine'));
            st.flags.met = true;
            remember(p, '네가 그에게 영주 한 단을 대접했다.', 25, 'helped');
            if (p.aff >= 40) return { text: '류라자가 진흙 봉인을 뜯어 한 모금 들이켜고 입을 닦았다: \\"시원하다! 이 돈, 이번엔 안 받겠다.\\" 그가 너를 한참 보았다, \\"너란 놈, 재밌군.\\"', go: ['ally', [2, 4]] };
            return { text: '류라자가 진흙 봉인을 뜯어 한 모금 들이켰다: \\"시원하다! 이번엔 안 받고, 다음엔 평소대로.\\"', go: ['fee', 7] };
          } });
          list.push({ label: '병기를 꺼내 정면으로 맞선다', hint: '법기가 필요하다. 이기면 면제, 지면 맞고 재물을 잃는다', req: () => !!ownWeapon() || '손에 법기가 없다', run: (st, p) => {
            st.flags.met = true;
            const w = ownWeapon();
            if (fightRoll()) {
              remember(p, `네가 ${itemName(w)}(으)로 그를 물러나게 했다.`, -15);
              return { text: `네가 ${itemName(w)}을(를) 카운터에 탁 올려놓았다. 상대가 한참 노려보다 침을 뱉었다: \"배짱 좋군.\" 돌아서서 갔다. 그런데 문 앞에서 너를 돌아보았다.`, go: ['gang', [4, 6]] };
            }
            const lost = payUpTo(120, '두들겨 맞고 영석을 빼앗겼다.');
            const disp = itemsIn('display');
            if (disp.length) takeItem(pick(disp));
            remember(p, '네가 덤비려다 그에게 깔려버렸다.', -5);
            return { text: `네가 자세를 잡기도 전에 한 방에 쓰러졌고, 그들이 ${lost} 영석을 빼앗고 진열장의 물건 하나도 챙겨갔다.`, go: ['fee', 7] };
          } });
          if (!st.flags.rival) list.push({ label: '집법당에 신고한다', hint: '마종 평판 15 필요, 뇌물 100 영석', req: () => S.rep.mo >= 15 && S.stones >= 100 || '마종 평판 또는 영석 부족', run: (st, p) => {
            spend(100, '집법당에 뇌물을 써서 류라자를 잡아들였다.');
            remember(p, '네가 그를 집법당에 고했다.', -50, 'betrayed');
            p.status = 'jailed';
            lifeNote(p, '집법당에 열흘 갇혔다.');
            return { text: '다음 날, 류라자가 집법당에 끌려갔다. 너를 보는 이웃들의 눈빛이 미묘했다.', go: ['release', 10], summary: '네가 그를 고해 집법당 대옥에 넣었다.' };
          } });
          list.push({ label: '주지 않는다', hint: '그가 순순히 물러나지 않을 것이다', run: (st, p) => {
            st.flags.met = true; st.flags.refused = true;
            remember(p, '네가 보호비 내기를 거절했다.', -10);
            return { text: '\\"좋아, 좋아.\\" 상대가 고개를 끄덕였다, \\"두고 보자고.\\"', go: ['smash', [1, 2]] };
          } });
          return list;
        },
      },
      smash: {
        when: 'night',
        text: () => '밤에 가게 문짝이 쾅쾅 두들겨지고, 밖에서 누군가 욕설을 했다: \\"문 열어! 안 열면 가게를 부순다!\\"',
        choices: st => [
          { label: '문을 열고 웃으며 사과, 두 배를 낸다', hint: costHint((st.flags.fee || 50) * 2), req: needStones((st.flags.fee || 50) * 2), run: (st, p) => {
            const n = (st.flags.fee || 50) * 2;
            spend(n, `밤에 억지로 ${n} 영석을 냈다.`);
            st.flags.refused = false; st.flags.fee = (st.flags.fee || 50) + 20;
            return { text: '그들이 돈을 받고 욕 몇 마디 하더니 흩어졌다.', go: ['fee', 7] };
          } },
          { label: '무기를 들고 나간다', hint: '법기가 필요하다', req: () => !!ownWeapon() || '손에 법기가 없다', run: (st, p) => {
            if (fightRoll(-0.1)) {
              remember(p, '그날 밤 네가 무기를 들고 그의 부하들을 흩어버렸다.', -10);
              st.flags.feared = true;
              return { text: '네가 무기를 들고 뛰쳐나가자 건달 몇이 우르르 흩어졌다. 류라자가 골목 어귀에서 너를 오래 보다가 돌아서서 갔다.', go: ['gang', [5, 7]] };
            }
            const lost = payUpTo(150, '건달 무리에게 약탈당했다.');
            return { text: `네가 골목에 포위돼 일어나지 못할 정도로 맞고, 지닌 ${lost} 영석을 모조리 털렸다.`, go: ['fee', 6] };
          } },
          { label: '숨어서 소리를 내지 않는다', hint: '진열장과 바닥의 물건이 피해를 본다', run: st => {
            const lost = [...itemsIn('display').slice(0, 2), ...itemsIn('floor')].map(it => { const n = itemName(it); takeItem(it); return n; });
            st.flags.fee = (st.flags.fee || 50) + 30;
            return { text: lost.length ? `날이 밝은 뒤, 너는 난장판을 보았다: ${lost.join('·')}이(가) 다 사라졌다.` : '그들이 밤새 문을 부수려다 못 열고 풀이 죽어 갔다.', go: ['fee', 5] };
          } },
        ],
      },
      gang: {
        when: 'day',
        mood: 'angry',
        text: () => '류라자가 부하 일곱여덟을 데리고 문을 막았다. 손에는 쇠사슬: \\"지난번엔 체면을 세워줬지. 이번엔 두 배를 내든지, 아니면 제대로 \'이야기\' 좀 하자고.\\"',
        choices: st => [
          { label: '꼬리를 내리고 두 배를 낸다', hint: costHint((st.flags.fee || 50) * 2), req: needStones((st.flags.fee || 50) * 2), run: (st, p) => {
            spend((st.flags.fee || 50) * 2, '두 배의 보호비를 냈다.');
            return { text: '류라자가 돈을 받고 네 뺨을 톡톡 쳤다: \\"진작 이랬으면 얼마나 좋아.\\"', go: ['fee', 7] };
          } },
          { label: '술상을 차려 화해한다', hint: costHint(80), req: needStones(80), run: (st, p) => {
            spend(80, '류라자와 술자리로 화해했다.');
            remember(p, '네가 술자리를 베풀어 화해하며 그의 체면을 세워줬다.', 45, 'helped');
            return { text: '술 세 사발이 들어가자, 류라자가 탁자를 내리쳤다: \\"네놈이 내 심금에 드는군! 싸워보지 않으면 모르는 법이지!\\"', go: ['ally', [2, 3]] };
          } },
          { label: '한판 붙는다', hint: '법기가 필요하다', req: () => !!ownWeapon() || '손에 법기가 없다', run: (st, p) => {
            if (fightRoll(-0.15)) {
              remember(p, '네가 혼자 그의 부하들을 물리쳤다.', 20);
              st.flags.fee = 0;
              return { text: '난투 끝에, 류라자가 팔을 부여잡고 일어나 너를 한참 보다가 오히려 웃었다: \\"졌다. 이 거리에서 네 가게 돈은 안 받겠다.\\"', go: ['ally', [3, 5]] };
            }
            payUpTo(200, '난투에서 져서 치료비를 물었다.');
            const disp = itemsIn('display');
            disp.slice(0, 2).forEach(takeItem);
            return { text: '네가 중과부적으로 밀려 가게가 부서지고, 진열장의 물건도 약탈당했다.', go: ['fee', 6] };
          } },
        ],
      },
      ally: {
        when: 'day',
        text: () => '류라자가 술 두 단을 들고 들어와 카운터에 탁 놓았다: \\"주인장, 앞으로 네 가게는 이 류라자가 보호한다, 돈은 안 받아! 밤엔 내 부하들이 지키니 어느 좀도둑이 오겠어?\\"\\n그가 입을 찢으며 웃었다, \\"그래도 말이야, 형제가 어려울 땐 너도 한손 거들어야지.\\"',
        choices: () => [
          { label: '의형제를 맺는다', hint: '가게에 밤을 지키는 사람이 생겼다. 인족 평판 -5, 집법당 주목 +5', run: (st, p) => {
            st.flags.ally = true; S.flags.guard = true;
            adjustRep('ren', -5); addHeat(5);
            remember(p, '네가 그와 의형제를 맺었다.', 30, 'helped');
            return { text: '너희가 관공상에 절을 했다. 이웃들이 멀리서 지켜봤고, 누군가는 고개를 저으며 한숨 쉬었다 - 류라자가 평소 괴롭히던 이들이 바로 그들이었다.', go: ['war', [6, 9]], summary: '네가 그와 의형제를 맺었다. 그의 부하들이 밤에 네 가게를 지켜준다.' };
          } },
          { label: '친구로만 지내고 패거리에는 들지 않는다', run: (st, p) => {
            st.flags.fee = 0;
            remember(p, '너는 패거리에 들지 않았지만, 그도 더 이상 네 돈을 받지 않는다.', 5);
            return { text: '\\"알았어, 너는 정직한 장사를 하는군.\\" 류라자도 더 강요하지 않았다, \\"일 있으면 말해.\\"', end: true, summary: '너희는 서로 침범하지 않기로 했고, 그는 더 이상 보호비를 받지 않는다.' };
          } },
        ],
      },
      war: {
        when: 'day',
        text: () => '류라자가 온몸 피투성이로 문을 부딪치며 들어왔다: \\"성서 흑구방이 내 구역을 삼키려 해! 오늘 밤 패싸움이야... 형제, 삼백 영석 빌려줘 무기를 사게 하든가, 비검 한 자루를 줘!\\"',
        choices: () => [
          { label: '그에게 삼백 영석을 빌려준다', hint: costHint(300), req: needStones(300), run: (st, p) => warWin(st, p, () => spend(300, '류라자에게 삼백 영석을 빌려줬다.')) },
          { label: '그에게 법기 하나를 준다', hint: '창고의 법기 하나를 넘긴다', req: () => !!ownWeapon() || '법기가 없다', run: (st, p) => {
            const w = ownWeapon(), name = itemName(w);
            return warWin(st, p, () => takeItem(w), `그가 ${name}을(를) 쥐고 어둠 속으로 달려갔다.`);
          } },
          { label: '이 텁텁한 물에는 안 낀다', run: (st, p) => {
            remember(p, '그가 궁지에 몰렸을 때 너는 돕지 않았다.', -40, 'betrayed');
            p.status = 'dead';
            lifeNote(p, '패싸움에 져서 시신이 길목에 걸렸다.');
            S.flags.guard = false;
            st.flags.ally = false; st.flags.rival = true; st.flags.fee = 80;
            return { text: '그날 밤, 성서의 함성이 새벽까지 울렸다. 사흘 뒤, 류라자의 시신이 길목에 걸렸다.', go: ['fee', 3], summary: '그가 너에게 구원을 청했지만 너는 돕지 않았다. 그는 죽었고, 흑구방이 이 거리를 접수했다.' };
          } },
        ],
      },
      release: {
        when: 'day',
        text: () => '류라자가 출옥했다. 살이 한 겹 빠지고 눈빛이 섬뜩할 만큼 음침해졌다. 그가 천천히 카운터 앞으로 왔다: \\"주인장, 집법당 곤장을 마흔 대나 맞았어. 이 빚은 천천히 계산하자고.\\"',
        choices: () => [
          { label: '사례하며 이백 영석을 바친다', hint: costHint(200), req: needStones(200), run: (st, p) => {
            spend(200, '류라자에게 사례했다.');
            p.status = 'alive';
            remember(p, '네가 이백 영석의 사례를 했다.', 40);
            st.flags.fee = 60;
            return { text: '류라자가 영석을 받고 표정이 누그러졌다: \\"이 일은 넘어가자. 보호비는 평소대로.\\"', go: ['fee', 7] };
          } },
          { label: '무시한다', hint: '그가 보복할 것이다', run: (st, p) => {
            p.status = 'alive';
            return { text: '\\"좋아.\\" 그가 한번 웃고 돌아서서 떠났다.', go: ['smash', 1] };
          } },
        ],
      },
    },
  },

  // ── 管理者：钱执事与孙管事 ──
  stewards: {
    person: { pid: 'qian', name: '전 집사', faction: 'mo', portrait: 'landlord', title: '잡역 구역 집사', savvy: 0.7,
      bio: '잡역 구역의 가게와 임대료를 관리한다. 얼굴에 늘 웃음을 띤다. 그의 사고가 종문 창고보다 가득하다는 소문이 있다.' },
    intro: '네 임대료를 거두는 전 집사.',
    nodes: {
      fence: {
        when: 'day',
        text: () => '전 집사가 눈을 가늘게 뜨며 묵직한 보따리를 네 앞으로 밀었다: \\"종문 창고에서 \'손모\' 난 물건이 있어. 네가 좀 팔아줘. 판 돈은 7할은 나, 3할은 너야.\\"\\n그가 미륵불처럼 웃었다, \\"앞으로 임대료는... 잘 봐주지.\\"',
        choices: () => [
          { label: '받아들인다(한통속이 된다)', sin: ['fence', 2], hint: '장물 한 무리를 얻는다. 다음 임대료에 그의 7할이 붙는다. 이후 임대료 15% 할인', run: (st, p) => {
            st.flags.complicit = true;
            const got = [['sword_std', 85], ['pill_blood', 80], ['soul_bell', 75]].map(([id, q]) => giveItem(id, { q, stolen: 8 })).filter(Boolean);
            const owed = Math.round(got.reduce((s, it) => s + claimedValue(it), 0) * 0.7);
            S.flags.rentExtra = (S.flags.rentExtra || 0) + owed;
            S.flags.rentExtraAt = S.rentIndex + 1;
            S.flags.rentMul *= 0.85;
            remember(p, '네가 그를 위해 장물을 팔았다.', 30);
            return { text: `그가 만족스럽게 네 어깨를 두드렸다: \"사정을 아는군.\" 보따리 안에는 ${got.map(itemName).join('·')}이(가) 있다. 다다음 임대료 납부 때, 원금에 이자를 붙여 ${owed} 영석을 거둬간다.`, go: ['audit', [7, 9]], summary: '네가 전 집사를 위해 장물을 팔아 그의 사람이 됐다.' };
          } },
          { label: '정중히 거절한다', hint: '그가 앙심을 품는다: 이후 임대료가 반 할 오른다', run: (st, p) => {
            S.flags.rentMul *= 1.05;
            remember(p, '네가 그를 위해 장물 팔기를 거절했다.', -25);
            return { text: '전 집사의 웃음이 잠시 굳었다가 다시 쌓였다: \\"젊은이, 기개가 있군.\\" 다음 회차부터 네 임대료가 반 할 올랐다.', go: ['audit', [7, 9]], summary: '네가 전 집사를 위해 장물 팔기를 거절하자, 그가 임대료를 올렸다.' };
          } },
        ],
      },
      audit: {
        when: 'day',
        who: () => { ensureSun(); return { name: '손 관리', portrait: 'steward_sun', title: '잡역 구역 부관리', faction: 'mo' }; },
        text: st => '머리빗 한 올도 흐트러지지 않은 여자가 가게에 들어와 종문 명패를 내밀었다: \\"잡역 구역 부관리, 손이오. 전 집사의 장부가 깨끗하지 않아 종문이 철저히 조사하라 했소.\\"\\n그녀가 장부를 펴고 붓끝을 든 채 말했다: \\"그의 밑에서 가게를 빌렸다면, 본 게 있지 않소?\\"'
          + (st.flags.complicit ? '\\n(네가 그 보따리를 떠올렸다.)' : ''),
        choices: st => [
          { label: '사실대로 증언한다(전 집사와 대항)', hint: st.flags.complicit ? '너도 무관하지 않다: 벌금, 집법당 주목 상승' : '전 집사가 무너지고 손 관리가 임대료를 거둔다', run: st => {
            const sun = S.people.sun, qian = S.people.qian;
            let extra = '';
            if (st.flags.complicit) { payUpTo(300, '증언에서 장물 판매를 자백해 벌금을 물었다.'); addHeat(15); extra = '너도 그를 위해 장물을 팔았음을 자백해 벌금을 물었다.'; }
            else { earn(200, '손 관리가 증거 제출에 포상했다.'); extra = '손 관리가 증거 제출 포상으로 이백 영석을 줬다.'; }
            remember(sun, '네가 사실대로 증언했다.', 30, 'honest');
            remember(qian, '네가 손 관리 앞에서 그를 고하는 증언을 했다.', -100, 'betrayed');
            qian.status = 'jailed'; lifeNote(qian, '횡령이 발각돼 집사 직을 박탈당하고 혈옥에 압송됐다.');
            S.flags.landlord = 'sun'; S.flags.rentMul = 0.8; S.flags.deedMul = 0.85; S.flags.inspectMul *= 1.2; S.flags.rentExtra = 0;
            return { text: `전 집사가 그날 바로 끌려갔다. ${extra}\n손 관리가 잡역 구역을 접수했다: \"임대료는 규정대로, 한 푼도 더 안 받아. 하지만 규정은 규정이야 - 금지된 물건은 내게 걸리지 마.\"`, go: ['revenge', [2, 3]], summary: '네 증언으로 전 집사를 무너뜨렸다. 손 관리가 잡역 구역을 접수했다.' };
          } },
          { label: '전 집사를 비호한다(거짓말)', sin: ['fence', 2], hint: '손 관리가 영리해서 속이지 못할 수도 있다', run: st => {
            const sun = S.people.sun, qian = S.people.qian;
            if (lieCaught(sun.savvy)) {
              addHeat(25); S.flags.inspectMul *= 1.4;
              remember(sun, '네가 그녀 앞에서 거짓말하다 들켰다.', -40, 'lied');
              return { text: '손 관리의 붓끝이 멈췄다. \\"네 장부와 전 집사의 장부가 맞지 않아.\\" 그녀가 장부를 닫았다, \\"네 가게를 지켜보겠어.\\"\\n전 집사는 끝내 무너지지 않았지만, 집법당이 점점 자주 들른다.', end: true, summary: '네가 전 집사를 비호하다 손 관리에게 들켰다. 그녀가 네 가게를 주목하기 시작했다.' };
            }
            S.flags.deedMul *= 0.8; S.flags.rentMul *= 0.9;
            remember(qian, '네가 손 관리 앞에서 그를 감싸줬다.', 50, 'helped');
            remember(sun, '네가 아무것도 본 게 없다고 말했다.', -5);
            return { text: '손 관리가 보름을 조사하고 빈손으로 돌아갔다. 전 집사가 직접 찾아와 눈이 안 보이게 웃었다: \\"우리 편이었군! 가게 문서 값, 2할 깎아주겠네.\\"', end: true, summary: '네가 전 집사를 감싸 넘기자, 그가 가게 문서 값의 2할을 깎아주기로 했다.' };
          } },
          { label: '모른다고 둘러댄다(몸을 사린다)', run: st => {
            remember(S.people.sun, '네가 모른다고 둘러댔다.', -5);
            if (Math.random() < 0.5) {
              const qian = S.people.qian;
              qian.status = 'jailed'; lifeNote(qian, '횡령이 발각돼 혈옥에 압송됐다.');
              S.flags.landlord = 'sun'; S.flags.rentMul = 0.9; S.flags.rentExtra = 0;
              return { text: '네 증언이 없어도, 손 관리가 전 집사의 사고를 밝혀냈다. 전 집사가 끌려가고 잡역 구역의 주인이 바뀌었다.', end: true, summary: '전 집사가 무너졌고, 너는 손을 대지 않았다.' };
            }
            return { text: '손 관리가 보름을 조사하고 빈손으로 돌아갔다. 전 집사가 다시 싱글벙글 웃으며 임대료를 거두러 왔다. 아무 말도 없었다 - 하지만 너는 그가 다 알고 있음을 안다.', end: true, summary: '소동이 지나고, 전 집사는 여전히 네 집주인이다.' };
          } },
        ],
      },
      revenge: {
        when: 'night',
        text: () => S.flags.guard ? '밤에 뒤뜰에서 싸움 소리가 들렸다.' : '밤에 뒤뜰에서 갑자기 불길이 치솟았다 - 누군가 네 가게에 횃불을 던졌다!',
        choices: () => [
          { label: S.flags.guard ? '나가서 본다' : '불을 끈다', run: () => {
            if (S.flags.guard) return { text: '류라자의 부하들이 방화범 둘을 붙잡아 뒤지니, 몸에서 전 집사 저택의 요패가 나왔다.', end: true };
            const lost = itemsIn('floor').map(it => { const n = itemName(it); takeItem(it); return n; });
            payUpTo(100, '불탄 뒤뜰을 수리했다.');
            return { text: `불은 꺼졌지만 뒤뜰은 새까맣게 탔다${lost.length ? `, 바닥의 ${lost.join('·')}은(는) 재가 됐다` : ''}. 방화범은 진작 달아났다 - 누가 보냈는지 너는 알고 있었다.`, end: true };
          } },
        ],
      },
    },
  },

  // ── 杂役少年：阿木 ──
  amu: {
    person: { pid: 'amu', name: '아목', faction: 'ren', portrait: 'ren_kid', title: '잡역 소년', savvy: 0.15,
      bio: '부모가 마종 광산에서 죽은 고아. 외문에 들어가 더 이상 남에게 당하지 않기를 꿈꾼다.' },
    intro: '외문에 들어가고 싶어하는 잡역 소년.',
    nodes: {
      pawn: {
        when: 'day',
        item: { id: 'jade_pendant', extra: { fake: false, q: 82 } },
        text: () => '잡역 소년이 옥패 하나를 꽉 쥐고 카운터 앞에 섰다. 눈가가 새빨갰다: \\"주인장... 이건 어머니가 남기신 겁니다. 외문 시련에 백오십 영석의 입문 예물을 내야 하는데, 나는... 백오십만 있으면 됩니다.\\"\\n그가 옥패를 밀어넣고는, 못 이기는 척 한 번 더 쳐다보았다.',
        choices: () => {
          const fair = Math.round(claimedValue(customerItem()) * 0.8);
          return [
            { label: `제값에 받는다(${fair})`, hint: costHint(fair), req: needStones(fair), run: (st, p) => {
              spend(fair, `제값 ${fair} 영석에 아목의 옥패를 받았다.`);
              keepCounterItem({ cost: fair, boughtDay: S.day, amu: true });
              st.flags.fair = true; st.flags.paid = fair;
              remember(p, `네가 그 옥은 ${fair} 영석의 값어치라며 한 푼도 깎지 않고 줬다.`, 30, 'fair');
              return amuGo('아목이 멍하니 영석을 받쳐 들고 어쩔 줄 몰라 하다가, 끝내 너에게 정성스럽게 절을 올렸다.');
            } },
            { label: '그가 부른 값대로 받는다(150)', hint: costHint(150), req: needStones(150), run: (st, p) => {
              spend(150, '150 영석에 아목의 옥패를 받았다.');
              keepCounterItem({ cost: 150, boughtDay: S.day, amu: true });
              st.flags.under = true; st.flags.paid = 150;
              remember(p, '네가 그가 부른 값대로 백오십 영석에 옥패를 받았다.', 10);
              return amuGo('아목이 거듭 감사하며 떠났다. 그는 그 옥이 얼마짜리인지 몰랐다.');
            } },
            { label: '팔십으로 깎는다', sin: ['fraud', 1], hint: costHint(80), req: needStones(80), run: (st, p) => {
              spend(80, '80 영석으로 깎아 아목의 옥패를 받았다.');
              keepCounterItem({ cost: 80, boughtDay: S.day, amu: true });
              st.flags.low = true; st.flags.paid = 80;
              remember(p, '네가 팔십 영석만 줘서, 그의 입문 비용이 모자랐다.', -15, 'lowballed');
              return amuGo('아목이 입술을 깨물며 받았다. 문을 나설 때, 그의 어깨가 들썩였다.');
            } },
            { label: '그에게 백오십을 빌려주고 옥패는 그가 가진다', hint: costHint(150), req: needStones(150), run: (st, p) => {
              spend(150, '아목에게 백오십 영석을 빌려줬다.');
              st.flags.loan = true;
              remember(p, '네가 그에게 돈을 빌려주고 그의 어머니 옥패는 받지 않았다.', 45, 'helped');
              return amuGo('\\"주인장, 나는...\\" 아목이 옥패를 다시 품에 넣고 말을 잇지 못한 채 그저 힘차게 고개를 끄덕였다.');
            } },
            { label: '받지 않는다', run: (st, p) => {
              st.flags.refused = true;
              remember(p, '네가 그의 옥패를 받지 않았다.', -5);
              return amuGo('아목이 고개를 숙인 채 옥패를 꽉 쥐고 나갔다.');
            } },
          ];
        },
      },
      back: {
        when: 'day',
        who: st => st.flags.refused ? { at: 'door' } : { portrait: 'amu_disciple', title: '혈살종 외문 제자', faction: 'mo' },
        text: st => {
          const f = st.flags;
          if (f.refused) return '아목이 문 앞에 서서 들어오지 않았다. 그는 입문 예물을 마련하지 못해, 지금은 류라자 뒤를 따라다니며 심부름을 한다. 얼굴에 흉터가 하나 더 생겼다.\\n\\"주인장, 나는 원망하지 않습니다.\\" 그는 그렇게 말하고 떠났다.';
          let t = '아목이 혈살종 외문 제자의 경장으로 갈아입고, 들어오자마자 너에게 절했다: \\"주인장! 나 시련에 합격했습니다!\\"';
          if (f.under) t += '\\n(그의 웃음이 갑자기 굳었다) \\"...나중에 사형이 봐줬는데, 우리 어머니 그 옥은 사백 영석이 넘는 값이었습니다.\\"';
          if (f.low) t += '\\n그가 너를 보며 더 이상 웃지 않았다: \\"팔십 영석. 하마터면 못 갈 뻔했습니다.\\"';
          if (f.fair) t += '\\n\\"주인장이 쳐준 값, 나중에 알아봤는데 한 푼도 모자라지 않았습니다. 기억하고 있습니다.\\"';
          if (f.loan) t += '\\n그가 베낭 하나를 카운터에 올렸다: \\"이백 영석, 백오십은 갚는 것이고 오십은 이자입니다. 어머니의 옥패는 늘 지니고 다닙니다.\\"';
          const held = ownItem(it => it.amu);
          if (held) t += '\\n그의 눈이 네 창고에 머물렀다 - 그 옥패가 아직 있었다. \\"주인장... 되찾아갈 수 있을까요?\\"';
          else if (!f.loan) t += '\\n그가 네 진열장을 보았다. 그 옥패는 이미 없었다.';
          return t;
        },
        choices: st => {
          const f = st.flags, held = ownItem(it => it.amu);
          if (f.refused) return [{ label: '그가 떠나는 것을 배웅한다', run: (st, p) => {
            lifeNote(p, '입문 예물을 마련하지 못해 류라자를 따라다니며 산다.');
            return { text: '네가 그의 야윈 뒷모습이 골목 어귀로 사라지는 것을 지켜보았다.', end: true, summary: '네가 돕지 않아 그는 외문에 들지 못했다.' };
          } }];
          const pre = (st, p) => {
            if (f.under) remember(p, '그 옥을 네가 헐값에 받았다는 걸 그가 알게 됐다.', -25, 'lowballed');
            if (f.loan) { earn(200, '아목이 이백 영석을 갚았다.'); }
            p.portrait = 'amu_disciple'; p.title = '혈살종 외문 제자'; p.faction = 'mo';
            lifeNote(p, '외문 시련을 통과해 혈살종에 입문했다.');
          };
          if (!held) return [{ label: '그를 축하한다', run: (st, p) => {
            pre(st, p);
            if (!f.loan && !f.fair) remember(p, '어머니의 옥패가 너에게 팔렸다.', -10);
            return { text: '아목이 다시 한번 절하고 떠났다.', go: ['fate', [8, 10]] };
          } }];
          return [
            { label: `원값에 되찾게 한다(${f.paid})`, run: (st, p) => {
              pre(st, p); takeItem(held); earn(f.paid, '아목이 옥패를 되찾았다.');
              remember(p, '네가 그가 원값에 어머니의 옥패를 되찾게 해줬다.', 25, 'helped');
              return { text: '아목이 옥패를 가슴에 대자, 눈물이 왈칵 쏟아졌다.', go: ['fate', [8, 10]] };
            } },
            { label: '그에게 돌려준다', run: (st, p) => {
              pre(st, p); takeItem(held);
              remember(p, '네가 어머니의 옥패를 공짜로 돌려줬다.', 40, 'helped');
              return { text: '\\"주인장...\\" 아목이 옥패를 꽉 쥐고 한참 만에 한마디 했다, \\"이 아목, 평생 은혜를 입었습니다.\\"', go: ['fate', [8, 10]] };
            } },
            { label: '되찾으려면 시가를 내야 한다', sin: ['fraud', 1], hint: '한몫 더 챙긴다', run: (st, p) => {
              pre(st, p);
              const price = Math.round(claimedValue(held) * 1.1);
              if (p.aff > 0 && Math.random() < 0.6) {
                takeItem(held); earn(price, `아목이 시가 ${price} 영석에 옥패를 되찾았다.`);
                remember(p, `네가 시가 ${price} 영석을 내야만 어머니의 옥패를 되찾게 해주겠다고 했다.`, -20, 'gouged');
                return { text: '아목이 한마디도 없이, 모아둔 영석을 한 닢 한 닢 카운터에 세어 놓고, 옥패를 들고 갔다.', go: ['fate', [8, 10]] };
              }
              remember(p, '네가 그가 어머니의 옥패를 되찾는 걸 허락하지 않았다.', -20);
              return { text: `\"${price}... 낼 수가 없습니다.\" 그가 그 옥패를 마지막으로 보고 떠났다.`, go: ['fate', [8, 10]] };
            } },
          ];
        },
      },
      fate: {
        when: 'day',
        who: (st, p) => p.aff <= -10 ? { portrait: 'mo_enforcer', title: '집법당 순찰', faction: 'mo' } : { portrait: 'amu_disciple' },
        text: (st, p) => p.aff >= 30
          ? '아목이 내문으로 승진해 새 흑홍 외투를 걸쳤다. 그가 제식 비검 한 자루를 카운터에 올리며 목소리를 낮췄다: \\"주인장, 집법당이 다음 달에 잡역 구역을 엄히 조사합니다. 제가 누를 수 있는 건 다 눌러뒀습니다.\\"'
          : p.aff <= -10
            ? '집법당 흑갑을 입은 젊은이가 가게에 들어와 면구를 벗었다 - 아목이었다. 그의 눈빛이 얼음처럼 차가웠다: \\"명령을 받들어 순찰 중이다. 주인장, 네 가게에는 자주 오겠다.\\"'
            : '아목이 가게를 지나가다 너에게 고개를 끄덕이고 들어오지 않았다.',
        choices: (st, p) => p.aff >= 30 ? [
          { label: '그의 마음을 받는다', run: (st, p) => {
            giveItem('sword_std', { q: 88 }); addHeat(-20); S.flags.inspectMul *= 0.7;
            lifeNote(p, '내문으로 승진해 집법당에서 발언권이 생겼다.');
            return { text: '\\"그때 주인장이 아니었다면 오늘의 아목도 없었을 겁니다.\\" 그가 포권하고 외투를 휘날리며 떠났다.', end: true, summary: '아목이 내문 제자가 되어 네 가게를 슬쩍슬쩍 챙겨준다.' };
          } },
        ] : p.aff <= -10 ? [
          { label: '사과하며 삼백 영석을 바친다', hint: costHint(300), req: needStones(300), run: (st, p) => {
            spend(300, '아목에게 사례했다.');
            remember(p, '네가 삼백 영석으로 사례했다.', 15);
            addHeat(5); S.flags.inspectMul *= 1.1;
            lifeNote(p, '집법당에 들어갔다.');
            return { text: '아목이 그 영석 더미를 보고 받긴 했지만, 받지 않은 듯했다: \\"어떤 것들은 영석으로 살 수 없습니다.\\" 그가 떠났지만, 예전만큼 자주 오지는 않았다.', end: true, summary: '아목이 집법당에 들어갔다. 네가 사례하자, 그는 더 이상 너를 괴롭히지 않았지만 용서하지도 않았다.' };
          } },
          { label: '그냥 둔다', run: (st, p) => {
            addHeat(20); S.flags.inspectMul *= 1.3;
            lifeNote(p, '집법당에 들어가 잡역 구역을 전담 조사한다.');
            return { text: '그 후로 집법당 사람들이 네 가게에 오는 횟수가 눈에 띄게 늘었다.', end: true, summary: '아목이 집법당에 들어가 네 가게만 골라 주시한다.' };
          } },
        ] : [
          { label: '고개를 끄덕여 답례한다', run: (st, p) => {
            lifeNote(p, '외문에서 자리를 잡았다.');
            return { text: '그의 뒷모습이 한결 꼿꼿해졌다.', end: true, summary: '아목이 외문에 입문해 자기 삶을 살기 시작했다.' };
          } },
        ],
      },
    },
  },

  // ── 狐妖：白绡 ──
  fox: {
    person: { pid: 'fox', name: '백초', faction: 'yao', portrait: 'yao_fox', title: '여우 요괴', savvy: 0.55,
      bio: '화형한 지 얼마 안 된 여우 요괴. 언니의 요단이 요괴 사냥꾼에게 도려내져, 행방을 찾으려 잡역 구역에 숨어들었다.' },
    intro: '일족의 요단을 찾는 여우 요괴.',
    nodes: {
      seek: {
        when: 'day',
        text: st => owns('yao_core')
          ? '여우 귀 소녀가 살금살금 가게에 들어오더니, 콧잎을 씰룩이며 얼굴이 하얗게 질렸다: \\"여기서... 요단 냄새가 나.\\" 그녀가 옷자락을 꽉 쥐었다, \\"우리 일족의 거야. 우리 언니의...\\"'
          : st.flags.asked
            ? '백초가 또 와서 가게를 한 바퀴 킁킁거렸다: \\"여전히 없어... 살펴주기로 약속했잖아.\\"'
            : '여우 귀 소녀가 살금살금 가게에 들어와 카운터 앞에서 킁킁거렸다: \\"인족 꼬마 주인장, 요단을 보거든 - 특히 흰 털 한 올 박힌 것은 - 나를 위해 남겨두어. 보답할게.\\"',
        choices: st => owns('yao_core') ? [
          { label: '대가 없이 그녀에게 돌려준다', hint: '요단을 잃는다. 요족 평판 +8', run: (st, p) => {
            takeItem(owns('yao_core')); adjustRep('yao', 8);
            remember(p, '네가 일족의 요단을 그녀에게 돌려주고 한 푼도 받지 않았다.', 40, 'helped');
            return { text: '백초가 요단을 손바닥에 받쳐 들었고, 눈물이 방울방울 떨어졌다. \\"고마워... 인족.\\"', go: ['hunted', [4, 6]], summary: '네가 일족의 요단을 대가 없이 그녀에게 돌려줬다.' };
          } },
          { label: '반값에 그녀에게 판다', hint: '+35 영석', run: (st, p) => {
            takeItem(owns('yao_core')); earn(35, '요단을 반값에 백초에게 팔았다.');
            remember(p, '네가 요단을 반값에 그녀에게 팔았다.', 10);
            return { text: '백초가 부서진 영석 한 줌을 카운터에 세어 놓았다. 그것이 그녀의 전 재산이었다.', go: ['hunted', [4, 6]], summary: '네가 요단을 그녀에게 팔았다.' };
          } },
          { label: '주지 않는다', run: (st, p) => {
            remember(p, '네가 일족의 요단을 그녀에게 주기를 거부했다.', -20);
            return { text: '\\"...기억하겠다.\\" 그녀가 돌아서서 뛰쳐나갔다.', go: ['seek', [5, 7]] };
          } },
          { label: '그녀를 달래고 몰래 집법당에 신고한다', sin: ['betray', 3], hint: '상금 150, 마종 평판 +5. 요족 평판 -20', run: (st, p) => {
            earn(150, '계략으로 여우 요괴를 유인해 잡고 상금을 받았다.'); adjustRep('mo', 5); adjustRep('yao', -20);
            remember(p, '네가 함정을 파서 그녀를 집법당에 넘겼다.', -100, 'betrayed');
            p.status = 'dead'; lifeNote(p, '집법당에 사로잡혀 단을 도려내 약으로 제련됐다.');
            return { text: '네가 웃으며 그녀에게 차를 권했다. 반 주사 후, 집법당 사람들이 문을 막았다. 그녀가 끌려가며 너를 매섭게 노려보았다. 호박색 두 눈이 온통 피빛이었다.', go: ['sister', [3, 5]], summary: '네가 그녀를 팔았다.' };
          } },
        ] : [
          { label: '그녀를 위해 살펴주기로 약속한다', run: (st, p) => {
            st.flags.asked = (st.flags.asked || 0) + 1;
            remember(p, '네가 요단을 살펴주기로 그녀와 약속했다.', 5);
            return { text: '\\"약속이다.\\" 그녀의 꼬리가 살랑 흔들렸다.', go: st.flags.asked >= 3 ? ['hunted', [3, 5]] : ['seek', [5, 7]] };
          } },
          { label: '요족 일은 나와 무관하다', run: (st, p) => {
            remember(p, '네가 요족 일은 너와 무관하다고 말했다.', -8);
            return { text: '그녀가 입술을 깨물고 떠났다.', go: ['seek', [7, 10]] };
          } },
        ],
      },
      hunted: {
        when: 'night',
        text: () => '창밖에서 누군가 가볍게 두드렸다. 네가 창을 열자 - 백초가 온몸 피투성이에 꼬리 하나가 반쯤 잘려 있었다. 멀리서 요괴 사냥꾼의 뿔피리 소리가 들렸다.\\n\\"부탁이야... 나 좀 숨겨줘.\\"',
        choices: () => [
          { label: '그녀를 들인다', hint: '발각되면 집법당 주목 +20', run: (st, p) => {
            if (hideRoll(0.3)) {
              addHeat(20);
              remember(p, '네가 위험을 무릅쓰고 그녀를 숨겨줬지만, 요괴 사냥꾼을 끌어들였다.', 15);
              lifeNote(p, '네 가게에서 요괴 사냥꾼에게 발각돼 필사적으로 달아났다.');
              return { text: '요괴 사냥꾼이 핏자국을 따라 찾아왔고, 백초가 뒷창을 깨고 달아났다. 너는 집법당에 새벽까지 신문을 받았다.', go: ['repay', [6, 8]] };
            }
            remember(p, '그날 밤 네가 그녀를 거뒀다.', 35, 'helped');
            return { text: '네가 그녀를 쌀독 뒤에 숨겼다. 뿔피리 소리가 문 밖에 오래 머물다가 마침내 멀어졌다. 날이 밝기 전, 그녀가 상처를 핥고 뒷창으로 지붕 위에 올라갔다.', go: ['repay', [6, 8]], summary: '네가 요괴 사냥꾼에게 쫓기는 그녀를 거뒀다.' };
          } },
          { label: '창을 닫는다', run: (st, p) => {
            remember(p, '그날 밤, 너는 창을 닫았다.', -30);
            p.status = 'gone'; lifeNote(p, '그날 밤 이후 행방불명.');
            return { text: '창밖의 헐떡임이 점점 멀어졌다. 다음 날, 너는 골목 어귀에서 피 묻은 흰 털 한 움큼을 보았다.', end: true, summary: '그녀가 거둬달라 애원했지만 너는 창을 닫았다.' };
          } },
        ],
      },
      repay: {
        when: 'day',
        cond: (st, p) => p.status === 'alive',
        text: (st, p) => p.aff >= 40
          ? '백초가 대바구니를 지고 들어왔다. 꼬리는 다 자라 있었다: \\"여우 일족이 너에게 진 빚, 내가 갚으러 왔어.\\" 바구니 안에는 산에서 가장 좋은 영지와 영과가 있었다.\\n\\"앞으로 요족이 여기 오면, 내가 얌전하게 할게.\\"'
          : '백초가 문 앞에 대바구니 하나를 놓고 들어오지 않았다: \\"이제 깨끗해.\\"',
        choices: (st, p) => [
          { label: '받아들인다', run: (st, p) => {
            const big = p.aff >= 40;
            for (let i = 0; i < (big ? 3 : 1); i++) giveItem('herb_blood', { q: big ? 92 : 70 });
            for (let i = 0; i < (big ? 3 : 1); i++) giveItem('spirit_fruit', { q: 85 });
            if (big) { adjustRep('yao', 20); S.flags.foxBlessing = true; }
            lifeNote(p, big ? '요역으로 돌아가 한 지역 여우 일족의 우두머리가 됐다.' : '요역으로 돌아갔다.');
            return { text: big ? '그녀가 떠나며 돌아보며 웃었다. 눈이 초승달처럼 휘었다.' : '그녀가 돌아보지 않고 떠났다.', end: true, summary: big ? '그녀가 보답했고, 요족이 너를 다르게 보기 시작했다.' : '그녀가 빚을 갚았다. 이제 깨끗하다.' };
          } },
        ],
      },
      sister: {
        when: 'night',
        who: () => ({ name: '청초', portrait: 'yao_fox_f1', title: '백초의 언니', faction: 'yao' }),
        text: () => '비릿한 바람이 휘몰아치고, 가게의 등불이 하나둘 꺼졌다. 어둠 속에서 목소리가 들렸다: \\"내 여동생의 목숨, 피에는 피로 갚는다.\\"\\n문짝에 깊은 발톱 자국 다섯 줄이 남았다.',
        choices: () => [
          { label: '……', run: () => {
            const store = itemsIn('store');
            const lost = store.sort(() => Math.random() - 0.5).slice(0, 3).map(it => { const n = itemName(it); takeItem(it); return n; });
            adjustRep('yao', -30);
            return { text: `날이 밝자 창고가 난장판이 됐다${lost.length ? `, ${lost.join('·')}이(가) 사라졌다` : ''}. 그 후로 요족은 다시 네 가게에 발을 들이지 않았다.`, end: true, summary: '네가 백초를 팔았고, 그녀의 언니가 복수하러 왔다.' };
          } },
        ],
      },
    },
  },

  // ── 仙门叛徒：顾青崖 ──
  defector: {
    person: { pid: 'defector', name: '구청애', faction: 'xian', portrait: 'xian_defector', title: '선문 기도', savvy: 0.6,
      bio: '선문이 보낸 잠복자. 마종 장로 암살 명령을 받았지만 마지막 순간에 손을 거뒀다.' },
    intro: '선문에서 탈주한 젊은 검수.',
    nodes: {
      sword: {
        when: 'day',
        item: { id: 'xian_sword', extra: { q: 88 } },
        text: () => '망토 속의 청년이 긴 보따리 하나를 카운터에 올리고 한 귀퉁이를 열었다 - 서리 같은 빛, 선문의 명검 청소였다.\\n\\"저는 사명을 받고 마종에 잠입해 장로를 암살하려 했지만... 차마 손을 쓸 수 없었습니다. 그 장로가 손녀 머리를 땋아주고 있었어요.\\" 그의 목소리가 떨렸다, \\"선문은 배신자를 가만두지 않습니다. 삼백 영석이면 남강으로 달아날 수 있습니다. 부디 소문 내지 말아주세요.\\"',
        choices: () => [
          { label: '검을 받는다(300)', hint: costHint(300) + '; 선문 금물', req: needStones(300), run: (st, p) => {
            spend(300, '구청애의 청소검을 받았다.');
            keepCounterItem({ cost: 300, boughtDay: S.day });
            st.flags.bought = true;
            remember(p, '네가 그의 검을 받고 도망칠 돈을 줬다.', 20, 'helped');
            return { text: '구청애가 너에게 절하고, 삿갓을 눌러쓴 채 인파 속으로 사라졌다.', go: ['hunter', [3, 5]], summary: '네가 그의 검을 받고 도망칠 돈을 줬다.' };
          } },
          { label: '그에게 백 영석의 여비를 주고 검은 받지 않는다', hint: costHint(100), req: needStones(100), run: (st, p) => {
            spend(100, '구청애에게 백 영석의 여비를 줬다.');
            st.flags.helped = true;
            remember(p, '네가 여비를 그냥 주고 검도 받지 않았다.', 40, 'helped');
            return { text: '\\"가게 주인...\\" 그가 영석을 꽉 쥐고 한참 만에 말했다, \\"구모, 기억하겠습니다.\\"', go: ['hunter', [3, 5]], summary: '네가 여비를 그냥 주고 그의 검은 받지 않았다.' };
          } },
          { label: '받지 않고 다른 곳을 알아보라 한다', run: (st, p) => {
            remember(p, '네가 그의 검을 받지 않았다.', -5);
            return { text: '그가 말없이 검을 싸서 떠났다.', go: ['hunter', [3, 5]] };
          } },
          { label: '그를 달래고 집법당에 신고한다', sin: ['betray', 3], hint: '상금 250. 선문 평판 -15', run: (st, p) => {
            earn(250, '선문 간첩을 신고해 상금을 받았다.'); adjustRep('mo', 5); adjustRep('xian', -15);
            remember(p, '네가 그를 마종 집법당에 넘겼다.', -100, 'betrayed');
            p.status = 'dead'; lifeNote(p, '마종 집법당에 사로잡혀 혈옥에서 죽었다.');
            return { text: '그가 끌려갈 때 발버둥 치지 않고 너에게 말했다: \\"원망하지 않아. 이 세상, 누구나 살고 싶으니까.\\"', end: true, summary: '네가 그를 집법당에 넘겼다.' };
          } },
        ],
      },
      hunter: {
        when: 'day',
        who: () => {
          if (!S.people.spy) newPerson('xian', { pid: 'spy', name: '한상', portrait: 'xian_spy', title: '선문 추적사', savvy: 0.75, story: 'defector',
            bio: '선문이 배신자를 추적하라고 보낸 여수사. 면사 아래 얼굴을 본 사람이 없다.' });
          return { name: '한상', portrait: 'xian_spy', title: '선문 추적사', faction: 'xian' };
        },
        text: () => '복면 여수사가 카운터 앞에 서서 맑고 차가운 목소리로 말했다: \\"가게 주인, 검을 멘 청년을 본 적 있나? 그는 선문의 배신자로, 청소검을 지니고 있어.\\"\\n그녀가 영석 한 주머니를 카운터에 올렸다, \\"그의 행방을 말하면 선문이 반드시 후사할 거야.\\"',
        choices: st => [
          { label: '그의 행방을 말한다', sin: ['betray', 3], hint: '+300 영석, 선문 평판 +10', run: st => {
            earn(300, '선문 추적사에게 구청애를 팔았다.'); adjustRep('xian', 10);
            const p = S.people.defector, spy = S.people.spy;
            remember(spy, '네가 그녀에게 배신자의 행방을 알려줬다.', 20);
            remember(p, '네가 그의 행방을 팔았다.', -100, 'betrayed');
            p.status = 'dead'; lifeNote(p, '남강으로 가는 길에 선문에게 따라잡혀, 수련을 빼앗기고 산문으로 압송됐다.');
            let t = '한상이 명부를 거뒀다: \\"고맙네.\\" 그녀가 떠난 지 사흘째 되는 날, 남강 관도에서 격전이 벌어졌다는 소문을 들었다.';
            const sword = owns('xian_sword');
            if (sword) { takeItem(sword); t += '\\n떠나기 전, 그녀가 네 창고를 힐끗 보았다: \\"청소검은 선문이 회수했다.\\"'; }
            return { text: t, end: true, summary: '네가 선문에 그의 행방을 팔았다.' };
          } },
          { label: '본 적 없다고 거짓말한다', hint: '그녀가 반드시 믿지는 않는다', run: st => {
            const spy = S.people.spy;
            if (lieCaught(spy.savvy - (owns('xian_sword') ? 0 : 0.25))) {
              adjustRep('xian', -15); addHeat(10);
              remember(spy, '네가 눈앞에서 거짓말하다 그녀에게 들켰다.', -30, 'lied');
              return { text: '\\"너에게서 청소검의 검기가 난다.\\" 한상의 목소리가 차가워졌다, \\"배신자를 숨겨준 것, 선문이 기억하겠다.\\" 그녀가 떠난 뒤, 집법당에도 무슨 소문이 들어간 모양이다.', go: ['letter', [6, 9]] };
            }
            remember(spy, '네가 그를 본 적 없다고 말했다.', 0);
            return { text: '한상이 너를 잠시 보다가 영석을 거두고 떠났다.', go: ['letter', [6, 9]] };
          } },
        ],
      },
      letter: {
        when: 'day',
        who: () => ({ name: '남강 행상', portrait: 'ren_merchant', title: '남강 행상', faction: 'ren' }),
        text: () => '새까맣게 그을린 남강 행상이 기름종이 보따리를 카운터에 올렸다: \\"구 공자라는 분이 전해달라 했습니다. 누군지 아실 거라고요.\\"\\n보따리 안에는 편지 한 통, 영석 한 주머니, 맑은 빛을 뿜는 부적 두 장이 있었다. 편지에는 한 줄만 적혀 있었다: \\"청애는 이미 남강에 몸을 의탁했다. 이 생에 다시는 검을 뽑지 않으리. 고맙네.\\"',
        choices: () => [
          { label: '받아들인다', run: (st, p) => {
            earn(600, '구청애가 남강에서 육백 영석을 보내왔다.');
            giveItem('xian_talisman', { q: 90 }); giveItem('xian_talisman', { q: 90 });
            lifeNote(p, '남강에서 이름을 숨기고 작은 칼가게를 열어, 식칼만 판다.');
            return { text: '네가 편지를 등불에 태웠다. 그 부적 두 장도 잘 숨겨두는 게 좋다.', end: true, summary: '그가 남강으로 달아나 사례를 보내왔다.' };
          } },
        ],
      },
    },
  },

  // ── 遗物：故人所托 ──
  legacy: {
    nodes: {
      gift: {
        when: 'day',
        who: st => {
          const p = S.people[st.flags.pid];
          return { name: `${p.name}의 가족`, portrait: p.faction === 'ren' ? 'ren_merchant' : pick(PORTRAITS[p.faction])[0], title: '옛 친분의 친족', faction: p.faction };
        },
        text: st => {
          const p = S.people[st.flags.pid];
          return `수백 옷차림의 사람이 보따리 하나를 카운터에 올렸다: \"${p.name}이(가) 떠났습니다. 떠나기 전에 이걸 전해달라고 하셨습니다. 당신이 잡역 구역에 드문 좋은 분이라고요.\"`;
        },
        choices: st => {
          const p = S.people[st.flags.pid];
          return [
            { label: '받아들인다', run: () => {
              const id = pick(['jade_pendant', 'bronze_mirror', 'pill_found']);
              const it = giveItem(id, { q: rint(75, 95), fake: false, verdict: 'real' });
              return { text: `보따리 안은 ${it ? itemName(it) : '낡은 물건'} 하나였다. 너는 카운터 앞에 서 있던 ${p.name}의 모습을 떠올렸다.`, end: true };
            } },
            { label: '그들이 살아가도록 남겨준다', hint: `${FACTIONS[p.faction].name} 평판 +5`, run: () => {
              adjustRep(p.faction, 5);
              return { text: '방문객이 멈칫하더니 눈가가 붉어졌고, 깊이 허리를 숙였다.', end: true };
            } },
          ];
        },
      },
    },
  },
};

// ───────────── 分支辅助 ─────────────

function beggarNext(st, text) {
  const f = st.flags;
  if ((f.kicked || 0) >= 3) {
    const p = S.people.beggar;
    p.status = 'gone'; lifeNote(p, '다시는 네 가게에 오지 않았다.');
    return { text: text + '\\n그 후로 그는 다시 오지 않았다.', end: true, summary: '네가 몇 번이고 쫓아내자 그는 다시 오지 않았다.' };
  }
  if ((f.kind || 0) >= 3 && S.day >= 9) return { text, go: ['hunted', [2, 3]] };
  return { text, go: ['beg', [3, 5]] };
}

function chenReward(p, text) {
  p.name = '혈수 진효'; p.portrait = 'beggar_master'; p.title = '전 마종 장로'; p.faction = 'mo';
  lifeNote(p, '수련을 회복하고 혈살종으로 돌아갔다.');
  remember(p, '네가 그의 목숨을 구해줬고, 그가 은혜를 갚았다.', 20, 'helped');
  return { text: text + '\\n\\"후회유기.\\" 말이 끝나기도 전에 사람은 사라졌다.', end: true, summary: '늙은 거지는 사실 전 마종 장로 혈수 진효였고, 그가 네 목숨 구원의 은혜에 보답했다.' };
}

const thugAlly = () => !!(S.story.thug && S.story.thug.flags.ally && S.people.thug.status === 'alive');

function amuGo(text) { return { text, go: ['back', [6, 8]] }; }

function warWin(st, p, pay, extra = '') {
  pay();
  st.flags.boss = true; S.flags.thugBoss = true;
  remember(p, '그가 패싸움할 때 네가 한손 거들었다.', 40, 'helped');
  lifeNote(p, '흑구방과의 패싸움에서 크게 이겨 잡역 구역의 패자가 됐다.');
  return { text: `${extra}날이 밝을 때, 류라자가 온몸 피투성이로 돌아와 입을 찢으며 웃었다: \"형제여, 흑구방은 끝났다. 앞으로 이 잡역 구역은 우리가 주인이다!\"`, end: true, summary: '네가 흑구방과의 패싸움을 도와 그가 잡역 구역의 패자가 됐다.' };
}

// ───────────── 开局与每日 ─────────────

const STORY_STARTS = [['beggar', 'beggar', 'beg', 1], ['thug', 'thug', 'fee', 2], ['swindler', 'swindler', 'mirror', 3],
  ['amu', 'amu', 'pawn', 4], ['stewards', 'stewards', 'fence', 5], ['fox', 'fox', 'seek', 7], ['defector', 'defector', 'sword', 9]];

function initStories() { STORY_STARTS.forEach(([key, tpl, node, delay]) => startStory(key, tpl, node, delay)); }

// 白天的故事来客插进队列，每天最多两位
function queueStoryVisitors() {
  // 官差与苦主不等人，排在前头
  const urgent = k => ['official', 'scandal'].includes(S.story[k].tpl) ? 0 : 1;
  const due = dueStories('day').sort((a, b) => urgent(a) - urgent(b));
  due.slice(2).forEach(k => { S.story[k].due = S.day + 1; });
  due.slice(0, 2).forEach(k => S.queue.splice(rint(0, S.queue.length), 0, storyVisitor(k)));
}

// 故事来客到柜前：摆上他带来的东西
function arriveStory(c) {
  const st = S.story[c.key], node = storyNode(st);
  const spec = typeof node.item === 'function' ? node.item(st) : node.item;
  if (spec) {
    const it = makeItem(spec.id, Object.assign({}, spec.extra));
    placeItem(it, 'counter', 0, 0);
    c.item = it.uid;
  }
  const p = storyPerson(st);
  if (p && !node.who) { p.visits++; p.lastDay = S.day; }
}
