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
  return r === true ? null : r || '条件不足';
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
const needStones = n => () => S.stones >= n || '灵石不够';

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
    person: { pid: 'beggar', name: '破碗陈', faction: 'ren', portrait: 'beggar', title: '老乞丐', savvy: 0.85,
      bio: '瞎了一只眼的老乞丐，在杂役区讨饭不知多少年了。没人知道他从哪儿来。' },
    intro: '한쪽 눈이 먼 늙은 거지로, 종종 네 문 앞에서 구걸한다.',
    nodes: {
      beg: {
        when: 'day',
        who: st => st.flags.kicked >= 2 ? { at: 'door', mood: 'afraid' } : {},
        text: (st, p) => {
          const f = st.flags;
          if (!f.met) return '（一个瞎了只眼的老乞丐颤巍巍地伸出一只缺口铜钵）“掌柜的……行行好，老汉三天没吃东西了。”';
          if (f.kicked >= 2) return '（老乞丐缩在门槛外，不敢进来）“老汉不进门……就在门口讨一口，讨一口就走。”';
          if (f.kind >= 2) return '\\"주인장, 또 늙은이요.\\"(그가 이 하나 남은 입을 찢으며 웃었다) \\"좋은 분이시오. 늙은이가 기억하겠소.\\"';
          return '\\"주인장...\\"(낡은 발우가 카운터에 살짝 부딪혔다) \\"먹을 것 좀 주십시오.\\"';
        },
        choices: () => [
          { label: '施一碗热粥', hint: costHint(5), req: needStones(5), run: (st, p) => {
            spend(5); st.flags.met = true; st.flags.kind = (st.flags.kind || 0) + 1;
            remember(p, '你施了他一碗热粥。', 8, 'helped');
            return beggarNext(st, '老乞丐捧着粥，那只好眼睛盯着你看了许久。“好人……好人呐。”');
          } },
          { label: '给他一块灵石', hint: costHint(20), req: needStones(20), run: (st, p) => {
            spend(20); st.flags.met = true; st.flags.kind = (st.flags.kind || 0) + 2;
            remember(p, '你给了他二十灵石。', 15, 'helped');
            return beggarNext(st, '그가 영석을 쥐고 오래도록 문질렀다. 무언가를 확인하듯이. \\"영석... 늙은이가 영석을 만져본 지도 오래됐구먼.\\"');
          } },
          { label: '让他扫地换饭', hint: '돈이 안 든다', run: (st, p) => {
            st.flags.met = true; st.flags.kind = (st.flags.kind || 0) + 1; st.flags.noticed = true;
            remember(p, '你让他扫地换了一顿饭。', 4);
            return beggarNext(st, '그는 몹시 느리게, 그러나 티끌 하나 없이 쓸었다. 빗자루를 쥔 손이 이상하리만치 안정됐고, 엄지와 검지 사이에는 굳은살이 가득했다 - 오래 병기를 쥔 자의 굳은살이다.');
          } },
          { label: '轰出去', hint: '인족 평판 -1', run: (st, p) => {
            st.flags.met = true; st.flags.kicked = (st.flags.kicked || 0) + 1;
            adjustRep('ren', -1);
            remember(p, '你把他轰出了门。', -12);
            return beggarNext(st, '老乞丐被推出门，摔在泥水里，一声没吭，慢慢爬起来走了。');
          } },
        ],
      },
      hunted: {
        when: 'night',
        text: () => '夜半，有人急促地叩门。是那个老乞丐，满身是血，那只瞎眼上的旧疤裂开了。\n“掌柜的……执法堂在追老汉……让老汉在柜台底下躲一夜，就一夜……”\n远处传来锁链声，火把的光越来越近。',
        choices: () => [
          { label: '把他藏起来', hint: `被搜出则执法堂关注 +25、罚银${S.grids.hidden ? '（有暗格，较稳妥）' : ''}`, run: (st, p) => {
            if (hideRoll(0.35)) {
              addHeat(25); payUpTo(200, '窝藏要犯，被执法堂罚银。');
              p.status = 'jailed';
              lifeNote(p, '在你的铺子里被执法堂搜出，锁拿而去。');
              remember(p, '你冒险藏他，却没能藏住。', 10);
              return { text: '巡查踹开门，从柜台底下拖出了老乞丐。他被铁链锁着拖走时回头看了你一眼——那只好眼睛里没有怨，只有一丝说不清的东西。', end: true, summary: '你冒险藏他，没藏住。他被执法堂锁走了。' };
            }
            remember(p, '那一夜，你把他藏在柜台底下。', 40, 'helped');
            return { text: '巡查踹开门搜了一圈，骂骂咧咧地走了。天亮前，老乞丐对你深深一揖，消失在晨雾里。', go: ['return', [5, 7]], summary: '那一夜，你藏下了被执法堂追捕的老乞丐。' };
          } },
          { label: '把他交给执法堂', sin: ['betray', 3], hint: '得赏银，魔宗声望 +6；人族声望 -8', run: (st, p) => {
            earn(200, '늙은 거지를 넘기고 상금 200 영석을 받았다.');
            adjustRep('mo', 6); adjustRep('ren', -8); addHeat(-10);
            remember(p, '你把他交给了执法堂。', -100, 'betrayed');
            p.status = 'jailed';
            return { text: '你打开门，朝巡查指了指柜台。老乞丐没有挣扎，只是被拖走时笑了一声，笑得你后背发凉。', go: ['sold', [3, 5]], summary: '你把他交给了执法堂。' };
          } },
          { label: '闩紧门，装没听见', run: (st, p) => {
            remember(p, '그가 문을 열어달라 애원했지만 너는 열지 않았다.', -25);
            p.status = 'gone';
            lifeNote(p, '那一夜之后，杂役区再没人见过他。');
            return { text: '叩门声渐渐弱了。第二天一早，街口多了一摊血迹，一只缺口铜钵倒扣在血里。', end: true, summary: '그가 문을 열어달라 애원했지만 너는 열지 않았다. 그 후로 그를 보지 못했다.' };
          } },
        ],
      },
      return: {
        when: 'day',
        who: () => ({ name: '血手陈枭', portrait: 'beggar_master', title: '前魔宗长老', faction: 'mo' }),
        text: () => '门口站着一个腰背笔直的老者，墨袍暗红云纹，瞎眼上的疤痕透着血光——竟是那个老乞丐。\n“三十年前，老夫遭同门暗算，修为尽失，沦落到讨饭为生。那一夜若不是你……”他把那只缺口铜钵轻轻放在柜上。\n“老夫血手陈枭，恩怨分明。说吧，你要什么？”',
        choices: () => [
          { label: '천오백 영석', run: (st, p) => {
            earn(1500, '血手陈枭以一千五百灵石相谢。');
            return chenReward(p, '그가 손가락을 튀기자 영석 한 주머니가 카운터에 떨어졌다. \\"속되긴 해도, 실속은 있군.\\"');
          } },
          { label: '손에 익은 법보 하나', run: (st, p) => {
            giveItem('soul_banner', { q: 95 });
            return chenReward(p, '그가 소매에서 검은 편(幡) 한 자루를 털어내자, 편면의 잔혼이 처절하게 울부짖었다. \\"노부가 한때 지니던 물건이니, 네게 주마.\\"');
          } },
          { label: '求他庇护这间铺子', hint: '执法堂关注大降，巡查大为宽松', run: (st, p) => {
            S.flags.chenShelter = true; addHeat(-40); adjustRep('mo', 15);
            S.flags.inspectMul *= 0.5;
            return chenReward(p, '그가 고개를 끄덕이며 문설주 위에 피 손도장을 찍었다. \\"앞으로 집법당 놈들이 들어오기 전에 이걸 먼저 볼 거다.\\"');
          } },
        ],
      },
      sold: {
        when: 'day',
        who: () => ({ name: '执法堂巡查', portrait: 'mo_enforcer', title: '执法堂', faction: 'mo' }),
        text: () => '执法堂巡查把一个包袱扔在柜上：“那老东西原来是三十年前叛出宗门的血手陈枭。长老们很满意，这是另一半赏钱。”\n包袱里，除了灵石，还有那只缺口铜钵。',
        choices: () => [
          { label: '收下', run: (st, p) => {
            earn(300, '执法堂补发赏银 300 灵石。');
            giveItem('broken_bowl', { q: 10 });
            lifeNote(p, '被押入血狱，三日后暴毙狱中。');
            p.status = 'dead';
            return { text: '巡查走后，你拿起那只破钵。钵底刻着一行小字，被磨得几乎看不清了：“血手陈枭，恩怨分明。”', end: true, summary: '你出卖了他。他死在了血狱里。' };
          } },
        ],
      },
    },
  },

  // ── 骗子：胡不归 ──
  swindler: {
    person: { pid: 'swindler', name: '胡不归', faction: 'ren', portrait: 'swindler', title: '落第书生', savvy: 0.8,
      bio: '自称落第书生，摇着一柄折扇，说话比唱的还好听。' },
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
            remember(p, '你花二百灵石买了他的“祖传古镜”。', 10);
            st.flags.mark = true;
            return { text: '胡不归千恩万谢，折扇一合，脚步轻快地出了门。', go: ['venture', [4, 6]], summary: '你花二百灵石买了他的“祖传古镜”。' };
          } },
          { label: '当面揭穿：“这镜子是假的”', run: (st, p) => {
            const it = customerItem();
            if (it.verdict !== 'fake' && !lieCaught(0.6)) {
              remember(p, '你说他的镜子是假的，他一番巧辩，你竟没能说出破绽。', -5);
              return { text: '\\"오? 어디가 가짜라는 거요?\\" 호불귀가 빙긋 웃으며 너를 보았다. 네가 허점을 말하지 못하자, 그는 태연히 거울을 챙겨 떠났다.', go: ['venture', [4, 6]] };
            }
            st.flags.exposed = true; adjustRep('ren', 2);
            remember(p, '네가 한눈에 그의 가짜 거울을 간파했다.', -25);
            return { text: '\\"거울 손잡이가 민무늬고, 구슬 수도 모자라네.\\" 네 말이 끝나자마자 호불귀의 얼굴색이 바뀌더니, 헛웃음 두 번 치고 거울을 안고 줄행랑쳤다.', go: ['venture', [5, 7]], summary: '你识破了他的假古镜。' };
          } },
          { label: '将计就计，压到六十收下', sin: ['fraud', 1], hint: costHint(60) + '；成为“同道中人”', req: needStones(60), run: (st, p) => {
            spend(60);
            keepCounterItem({ cost: 60, boughtDay: S.day });
            st.flags.partner = true;
            remember(p, '你看穿了假镜子，却压价收下，好转手坑别人。', 25);
            return { text: '\\"육십?\\" 호불귀가 멈칫하더니 눈을 빛내며 다가와 낮게 말했다: \\"주인장도 같은 길의 사람이었군! 앞으로 좋은 장거리가 있으면 제가 제일 먼저 찾겠습니다.\\"', go: ['venture', [4, 6]], summary: '너희는 \\"같은 길의 사람\\"이 됐다.' };
          } },
          { label: '사지 않는다', run: () => ({ text: '胡不归也不恼，摇着扇子走了。', go: ['venture', [5, 7]] }) },
        ],
      },
      venture: {
        when: 'day',
        text: st => st.flags.partner
          ? '胡不归又来了，左右看看，凑到柜前耳语：“同道中人，咱们做票大的——城南那帮暴发户迷信仙门遗府。在下画了一沓藏宝图，只差三百灵石打点。五日后，分你四百五。”'
          : st.flags.exposed
            ? '胡不归换了身行头，硬着头皮进门：“掌柜的，上回是误会。在下得了一张仙门遗府的藏宝图，这回是真的。三百灵石入股，五日后三倍奉还！”'
            : '胡不归神神秘秘地展开一张泛黄的羊皮：“掌柜的，仙门遗府的藏宝图！只差三百灵石雇人开路，五日之后，三倍奉还！”',
        choices: st => [
          { label: '投三百灵石', hint: costHint(300), req: needStones(300), run: (st, p) => {
            spend(300, '投给胡不归三百灵石。');
            st.flags.invested = true;
            remember(p, '你投了他三百灵石。', 10);
            return { text: '\\"주인장, 대단한 배포요!\\" 호불귀가 영석을 소매에 넣었다, \\"닷새 뒤, 좋은 소식을 기다리시오.\\"', go: ['payout', 5], summary: '你投给他三百灵石，等着五日后的回报。' };
          } },
          { label: '婉拒', run: () => ({ text: '\\"아쉽군, 아쉬워.\\" 호불귀가 한숨 쉬며 떠났다.', go: ['caught', [6, 9]] }) },
          ...(st.flags.exposed ? [{ label: '扭送执法堂', hint: '得赏银 150，魔宗声望 +3', run: (st, p) => {
            earn(150, '扭送骗子胡不归，得赏银 150 灵石。'); adjustRep('mo', 3);
            remember(p, '你把他扭送了执法堂。', -60, 'betrayed');
            p.status = 'jailed';
            lifeNote(p, '被你扭送执法堂，发配矿上。');
            return { text: '巡查给胡不归上了枷。他被拖出门时还在回头喊：“掌柜的，后会有期！”', end: true, summary: '你把他扭送了执法堂。' };
          } }] : []),
        ],
      },
      payout: {
        when: 'day',
        who: st => st.flags.partner ? {} : thugAlly() ? { name: '刘癞子', portrait: 'thug', title: '杂役区混混', faction: 'ren' }
          : { name: '城南苦主', portrait: 'ren_merchant', title: '被骗的街坊', faction: 'ren' },
        text: st => st.flags.partner
          ? '胡不归如约而来，把一袋灵石往柜上一放：“四百五，一个子儿不少。同道中人，说话算话。”'
          : !thugAlly()
            ? '닷새가 지나도 호불귀는 오지 않았다.\\n대신 눈이 빨갛게 운 부인이 찾아왔다: \\"당신도 그 보물 지도를 샀나요? 그 호 씨 놈이 성남 절반을 속이고 진작 달아났어요...\\"'
            : '刘癞子拎着一个鼻青脸肿的白面书生进门，往地上一扔：“兄弟，这小子骗了半个城南，听说也骗了你三百？人我给你逮来了，你说怎么办。”\n胡不归趴在地上，折扇断成了两截。',
        choices: st => !st.flags.partner && !thugAlly() ? [
          { label: '认栽', run: (st, p) => {
            remember(p, '그가 네 삼백 영석을 챙겨 달아났다.', -40, 'lied');
            return { text: '삼백 영석, 교훈 하나 샀다고 치자. 하지만 너는 이 얼굴을 기억했다.', go: ['caught', [5, 8]], summary: '그가 네 삼백 영석을 챙겨 달아났다.' };
          } },
        ] : st.flags.partner ? [
          { label: '收下', sin: ['fraud', 2], run: (st, p) => {
            earn(450, '胡不归分来四百五十灵石。');
            remember(p, '这票买卖，你们赚了。', 10);
            return { text: '你收下了这笔来路不正的钱。城南有好几户人家，这几天哭得很惨。', go: ['caught', [4, 6]], summary: '너희가 함께 성남 사람들을 속였다.' };
          } },
        ] : [
          { label: '讨回本钱，再加利息', hint: '+600 영석', run: (st, p) => {
            earn(600, '호불귀에게서 육백 영석을 되찾았다.');
            remember(p, '你让刘癞子从他身上榨出了六百灵石。', -30);
            return { text: '刘癞子从胡不归身上搜出一沓灵石。胡不归看你的眼神，像在看一只更大的狐狸。', end: true, summary: '你被他骗过，又连本带利讨了回来。' };
          } },
          { label: '收他为己用', hint: '+300 영석; 앞으로 그가 진품을 찾아준다', run: (st, p) => {
            earn(300, '胡不归退回三百灵石。');
            st.flags.agent = true;
            remember(p, '你没要他的命，反倒收他为己用。', 35, 'helped');
            return { text: '\\"앞으로 그 입으로 나를 위해 진짜 물건을 좀 찾아오게.\\" 호불귀가 한참 멍하니 있다가, 부러진 부채를 허리에 꽂고 깊이 절했다: \\"주인장... 호모가 졌습니다.\\"', go: ['deal', [5, 7]], summary: '你收服了这个骗子，让他替你寻货。' };
          } },
        ],
      },
      caught: {
        when: 'day',
        mood: 'afraid',
        text: st => st.flags.partner
          ? '胡不归被两个巡查押着从门口经过，突然扑过来抓住柜台：“掌柜的救我！三百灵石保金就能放人！”\n巡查冷笑一声，看了你一眼：“这骗子招了个同伙，是你吧？”'
          : st.flags.invested
            ? '胡不归被两个巡查押着从门口经过，看见你，脸一红，还是扑通跪下了：“掌柜的……那三百灵石，在下对不住您。可您若肯担保，在下这辈子做牛做马！”'
            : '胡不归被两个巡查押着从门口经过，扑通一声跪下：“掌柜的救我！只要您担保，交三百灵石保金……在下这辈子做牛做马！”',
        choices: st => [
          { label: '替他担保', hint: costHint(300) + '，执法堂关注 +10', req: needStones(300), run: (st, p) => {
            spend(300, '替胡不归缴了三百灵石保金。'); addHeat(10);
            st.flags.agent = true;
            remember(p, '그가 곤경에 처했을 때 네가 대신 보석금을 냈다.', 45, 'helped');
            return { text: '巡查收了灵石，开了枷。胡不归揉着手腕，第一次没有笑：“这条命是掌柜的的了。往后在下只给您寻真货。”', go: ['deal', [5, 7]], summary: '네가 그를 지켜줬다. 그는 진품만 찾아주겠다고 맹세했다.' };
          } },
          { label: '撇清关系', hint: st.flags.partner ? '그가 너를 불 것이다' : '', run: (st, p) => {
            remember(p, '그가 곤경에 처했을 때 너는 관계를 끊었다.', -30, 'betrayed');
            p.status = 'jailed';
            lifeNote(p, '被执法堂发配矿上做苦役。');
            if (st.flags.partner) {
              addHeat(25); payUpTo(200, '被胡不归供出，罚银。'); adjustRep('mo', -5);
              return { text: '\\"좋아, 좋아!\\" 호불귀가 끌려가며 크게 웃었다, \\"그럼 같이 죽자고! 성남의 그 수십 장 보물 지도, 전부 이 사람 가게에서 나온 거다!\\"', end: true, summary: '你撇清关系，他把你供了出来。' };
            }
            return { text: '胡不归被拖走了。你听见他一路都在喊冤。', end: true, summary: '你没有管他。他被发配去了矿上。' };
          } },
        ],
      },
      deal: {
        when: 'day',
        item: st => {
          const id = pick(['jade_pendant', 'bronze_mirror', 'pill_found']);
          return { id, extra: { fake: Math.random() < 0.15, q: rint(55, 90) } };
        },
        text: () => '胡不归神色郑重地把一件东西放在柜上：“掌柜的，城北老宅抄出来的，这回是真货。照市价五成给您。”\n（他说得诚恳——可他毕竟是胡不归。）',
        choices: () => {
          const it = customerItem(), price = it ? Math.round(claimedValue(it) * 0.5) : 0;
          return [
            { label: `반값에 받는다(${price})`, hint: costHint(price), req: needStones(price), run: (st, p) => {
              spend(price, `호불귀에게서 ${itemName(it)} 하나를 받았다.`);
              const kept = keepCounterItem({ cost: price, boughtDay: S.day });
              if (kept.fake) st.flags.burned = (st.flags.burned || 0) + 1;
              remember(p, `你收了他送来的${itemName(kept)}。`, 3);
              return { text: '胡不归拱拱手：“下回再来。”', go: ['deal', [6, 8]] };
            } },
            { label: '사양한다', run: () => ({ text: '\\"그럼 다음에 더 좋은 걸 찾아오지.\\"', go: ['deal', [6, 8]] }) },
            { label: '断了来往', run: (st, p) => {
              remember(p, '你断了和他的来往。', -10);
              return { text: '胡不归怔了怔，收起东西，没说什么就走了。', end: true, summary: '你断了和他的来往。' };
            } },
          ];
        },
      },
    },
  },

  // ── 混混：刘癞子 ──
  thug: {
    person: { pid: 'thug', name: '刘癞子', faction: 'ren', portrait: 'thug', title: '杂役区混混', savvy: 0.5,
      bio: '杂役区一霸，手底下有七八个弟兄。凶是凶，讲的倒是江湖规矩。' },
    intro: '这条街的混混头子，每七天来收一次保护费。',
    nodes: {
      fee: {
        when: 'day',
        who: st => st.flags.rival ? { name: '黑狗', title: '黑狗帮', portrait: 'mo_disciple' } : {},
        text: st => {
          const fee = st.flags.fee || 50;
          if (st.flags.rival) return `黑狗帮的人踹开门：“刘癞子死了，这条街归黑狗帮。每七天，${fee} 灵石。”`;
          if (!st.flags.met) return `门帘一掀，进来个寸头疤脸的汉子，往柜台上一靠，叼着草茎斜眼看你：“新来的？这条街归我刘癞子罩着。每七天，${fee} 灵石，保你平安。”`;
          if (st.flags.refused) return `刘癞子身后跟着三四个弟兄，把门堵了：“上回不给面子，这回连本带利，${fee} 灵石。”`;
          return `刘癞子又来了，手指在柜台上敲了敲：“老规矩，${fee} 灵石。”`;
        },
        choices: st => {
          const fee = st.flags.fee || 50;
          const list = [
            { label: `돈으로 무마한다(${fee})`, hint: costHint(fee), req: needStones(fee), run: (st, p) => {
              spend(fee, `보호비 ${fee} 영석을 냈다.`);
              st.flags.met = true; st.flags.refused = false; st.flags.fee = fee + 20;
              remember(p, `네가 보호비 ${fee} 영석을 냈다.`, 5);
              return { text: '刘癞子掂了掂灵石，咧嘴一笑：“识相。”', go: ['fee', 7] };
            } },
          ];
          if (!st.flags.rival) list.push({ label: '请他喝坛灵酒', hint: '需要一坛灵酒', req: () => !!owns('spirit_wine') || '库房里没有灵酒', run: (st, p) => {
            takeItem(owns('spirit_wine'));
            st.flags.met = true;
            remember(p, '你请他喝了一坛灵酒。', 25, 'helped');
            if (p.aff >= 40) return { text: '刘癞子拍开泥封灌了一大口，抹抹嘴：“痛快！这钱，这回不收了。”他盯着你看了一会儿，“你这人，有意思。”', go: ['ally', [2, 4]] };
            return { text: '刘癞子拍开泥封灌了一大口：“痛快！这回不收了，下回照旧。”', go: ['fee', 7] };
          } });
          list.push({ label: '병기를 꺼내 정면으로 맞선다', hint: '需要法器；胜则免交，败则挨打破财', req: () => !!ownWeapon() || '手边没有法器', run: (st, p) => {
            st.flags.met = true;
            const w = ownWeapon();
            if (fightRoll()) {
              remember(p, `你拿${itemName(w)}逼退了他。`, -15);
              return { text: `你把${itemName(w)}往柜上一拍。对方盯着看了半晌，啐了一口：“有种。”转身走了。可走到门口，他回头看了你一眼。`, go: ['gang', [4, 6]] };
            }
            const lost = payUpTo(120, '被打了一顿，抢走灵石。');
            const disp = itemsIn('display');
            if (disp.length) takeItem(pick(disp));
            remember(p, '你想动手，被他打趴下了。', -5);
            return { text: `你还没摆好架势就被一拳撂倒，他们抢走 ${lost} 灵石，还顺走了陈列柜里一件货。`, go: ['fee', 7] };
          } });
          if (!st.flags.rival) list.push({ label: '报执法堂', hint: '魔宗声望需 15，打点 100 灵石', req: () => S.rep.mo >= 15 && S.stones >= 100 || '魔宗声望或灵石不足', run: (st, p) => {
            spend(100, '打点执法堂，抓了刘癞子。');
            remember(p, '你把他告到了执法堂。', -50, 'betrayed');
            p.status = 'jailed';
            lifeNote(p, '被执法堂关了十天。');
            return { text: '第二天，刘癞子就被执法堂锁走了。街坊们看你的眼神有些复杂。', go: ['release', 10], summary: '你把他告进了执法堂大牢。' };
          } });
          list.push({ label: '주지 않는다', hint: '그가 순순히 물러나지 않을 것이다', run: (st, p) => {
            st.flags.met = true; st.flags.refused = true;
            remember(p, '你拒绝交保护费。', -10);
            return { text: '\\"좋아, 좋아.\\" 상대가 고개를 끄덕였다, \\"두고 보자고.\\"', go: ['smash', [1, 2]] };
          } });
          return list;
        },
      },
      smash: {
        when: 'night',
        text: () => '夜里，铺子的门板被砸得砰砰响，外头有人骂骂咧咧：“开门！不开门就拆了你的铺子！”',
        choices: st => [
          { label: '开门赔笑，交双份', hint: costHint((st.flags.fee || 50) * 2), req: needStones((st.flags.fee || 50) * 2), run: (st, p) => {
            const n = (st.flags.fee || 50) * 2;
            spend(n, `夜里被逼交了 ${n} 灵石。`);
            st.flags.refused = false; st.flags.fee = (st.flags.fee || 50) + 20;
            return { text: '그들이 돈을 받고 욕 몇 마디 하더니 흩어졌다.', go: ['fee', 7] };
          } },
          { label: '抄家伙出去', hint: '需要法器', req: () => !!ownWeapon() || '手边没有法器', run: (st, p) => {
            if (fightRoll(-0.1)) {
              remember(p, '那一夜你抄家伙打散了他的弟兄。', -10);
              st.flags.feared = true;
              return { text: '你提着家伙冲出去，几个混混一哄而散。刘癞子站在巷口看了你很久，转身走了。', go: ['gang', [5, 7]] };
            }
            const lost = payUpTo(150, '被一群混混打劫。');
            return { text: `你被围在巷子里打得爬不起来，身上 ${lost} 灵石被搜了个干净。`, go: ['fee', 6] };
          } },
          { label: '躲着不出声', hint: '陈列柜和地上的货会遭殃', run: st => {
            const lost = [...itemsIn('display').slice(0, 2), ...itemsIn('floor')].map(it => { const n = itemName(it); takeItem(it); return n; });
            st.flags.fee = (st.flags.fee || 50) + 30;
            return { text: lost.length ? `天亮后，你看着满地狼藉：${lost.join('、')}都没了。` : '그들이 밤새 문을 부수려다 못 열고 풀이 죽어 갔다.', go: ['fee', 5] };
          } },
        ],
      },
      gang: {
        when: 'day',
        mood: 'angry',
        text: () => '刘癞子带着七八个弟兄堵在门口，手里拎着铁链：“上回给你面子。这回，要么交两份钱，要么咱们好好‘聊聊’。”',
        choices: st => [
          { label: '认怂，交两份', hint: costHint((st.flags.fee || 50) * 2), req: needStones((st.flags.fee || 50) * 2), run: (st, p) => {
            spend((st.flags.fee || 50) * 2, '두 배의 보호비를 냈다.');
            return { text: '刘癞子收了钱，拍拍你的脸：“早这样多好。”', go: ['fee', 7] };
          } },
          { label: '摆一桌酒，讲和', hint: costHint(80), req: needStones(80), run: (st, p) => {
            spend(80, '摆酒与刘癞子讲和。');
            remember(p, '你摆酒讲和，给足了他面子。', 45, 'helped');
            return { text: '술 세 사발이 들어가자, 류라자가 탁자를 내리쳤다: \\"네놈이 내 심금에 드는군! 싸워보지 않으면 모르는 법이지!\\"', go: ['ally', [2, 3]] };
          } },
          { label: '拼了', hint: '需要法器', req: () => !!ownWeapon() || '手边没有法器', run: (st, p) => {
            if (fightRoll(-0.15)) {
              remember(p, '네가 혼자 그의 부하들을 물리쳤다.', 20);
              st.flags.fee = 0;
              return { text: '난투 끝에, 류라자가 팔을 부여잡고 일어나 너를 한참 보다가 오히려 웃었다: \\"졌다. 이 거리에서 네 가게 돈은 안 받겠다.\\"', go: ['ally', [3, 5]] };
            }
            payUpTo(200, '混战落败，赔了汤药费。');
            const disp = itemsIn('display');
            disp.slice(0, 2).forEach(takeItem);
            return { text: '你寡不敌众，铺子被砸，陈列柜里的货也被抢走了。', go: ['fee', 6] };
          } },
        ],
      },
      ally: {
        when: 'day',
        text: () => '刘癞子拎着两坛酒进门，往柜上一墩：“掌柜的，往后你这铺子，我刘癞子罩了，不收钱！夜里有我的弟兄守着，哪个小贼敢来？”\n他咧嘴一笑，“不过嘛，兄弟有难，你也得帮一把。”',
        choices: () => [
          { label: '结为兄弟', hint: '铺子有人守夜；人族声望 -5，执法堂关注 +5', run: (st, p) => {
            st.flags.ally = true; S.flags.guard = true;
            adjustRep('ren', -5); addHeat(5);
            remember(p, '你和他拜了把子。', 30, 'helped');
            return { text: '너희가 관공상에 절을 했다. 이웃들이 멀리서 지켜봤고, 누군가는 고개를 저으며 한숨 쉬었다 - 류라자가 평소 괴롭히던 이들이 바로 그들이었다.', go: ['war', [6, 9]], summary: '你和他拜了把子。他的弟兄夜里替你守铺子。' };
          } },
          { label: '只做朋友，不入帮', run: (st, p) => {
            st.flags.fee = 0;
            remember(p, '你没入帮，但他也不再收你的钱。', 5);
            return { text: '\\"알았어, 너는 정직한 장사를 하는군.\\" 류라자도 더 강요하지 않았다, \\"일 있으면 말해.\\"', end: true, summary: '너희는 서로 침범하지 않기로 했고, 그는 더 이상 보호비를 받지 않는다.' };
          } },
        ],
      },
      war: {
        when: 'day',
        text: () => '刘癞子满身是血地撞进门：“城西黑狗帮要吞我的地盘！今晚就要火并……兄弟，借我三百灵石买家伙，或者给把飞剑！”',
        choices: () => [
          { label: '借他三百灵石', hint: costHint(300), req: needStones(300), run: (st, p) => warWin(st, p, () => spend(300, '借给刘癞子三百灵石。')) },
          { label: '给他一件法器', hint: '창고의 법기 하나를 넘긴다', req: () => !!ownWeapon() || '没有法器', run: (st, p) => {
            const w = ownWeapon(), name = itemName(w);
            return warWin(st, p, () => takeItem(w), `그가 ${name}을(를) 쥐고 어둠 속으로 달려갔다.`);
          } },
          { label: '这浑水我不蹚', run: (st, p) => {
            remember(p, '그가 궁지에 몰렸을 때 너는 돕지 않았다.', -40, 'betrayed');
            p.status = 'dead';
            lifeNote(p, '火并失败，尸首被挂在街口。');
            S.flags.guard = false;
            st.flags.ally = false; st.flags.rival = true; st.flags.fee = 80;
            return { text: '那一夜，城西的喊杀声响到天明。三天后，刘癞子的尸首被挂在了街口。', go: ['fee', 3], summary: '그가 너에게 구원을 청했지만 너는 돕지 않았다. 그는 죽었고, 흑구방이 이 거리를 접수했다.' };
          } },
        ],
      },
      release: {
        when: 'day',
        text: () => '刘癞子出狱了，瘦了一圈，眼神阴得吓人。他慢慢走到柜前：“掌柜的，执法堂的板子，我挨了四十。这笔账，咱们慢慢算。”',
        choices: () => [
          { label: '赔礼，奉上二百灵石', hint: costHint(200), req: needStones(200), run: (st, p) => {
            spend(200, '向刘癞子赔礼。');
            p.status = 'alive';
            remember(p, '你赔了二百灵石的礼。', 40);
            st.flags.fee = 60;
            return { text: '刘癞子收了灵石，脸色缓了缓：“这事就算翻篇。保护费照旧。”', go: ['fee', 7] };
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
    person: { pid: 'qian', name: '钱执事', faction: 'mo', portrait: 'landlord', title: '杂役区执事', savvy: 0.7,
      bio: '管着杂役区的铺面和租子，脸上永远挂着笑。据说他的私库比宗门库房还满。' },
    intro: '收你租子的钱执事。',
    nodes: {
      fence: {
        when: 'day',
        text: () => '钱执事眯着眼，把一个沉甸甸的包袱推到你面前：“宗门库房里‘损耗’了些东西，你帮着出手。卖得的钱，七成归我，三成归你。”\n他笑得像尊弥勒佛，“往后租子嘛……好商量。”',
        choices: () => [
          { label: '接下（同流合污）', sin: ['fence', 2], hint: '得一批赃物；下期租子要加上他的七成；此后租金八五折', run: (st, p) => {
            st.flags.complicit = true;
            const got = [['sword_std', 85], ['pill_blood', 80], ['soul_bell', 75]].map(([id, q]) => giveItem(id, { q, stolen: 8 })).filter(Boolean);
            const owed = Math.round(got.reduce((s, it) => s + claimedValue(it), 0) * 0.7);
            S.flags.rentExtra = (S.flags.rentExtra || 0) + owed;
            S.flags.rentExtraAt = S.rentIndex + 1;
            S.flags.rentMul *= 0.85;
            remember(p, '你替他销赃。', 30);
            return { text: `그가 만족스럽게 네 어깨를 두드렸다: \"사정을 아는군.\" 보따리 안에는 ${got.map(itemName).join('·')}이(가) 있다. 다다음 임대료 납부 때, 원금에 이자를 붙여 ${owed} 영석을 거둬간다.`, go: ['audit', [7, 9]], summary: '你替钱执事销赃，成了他的人。' };
          } },
          { label: '婉拒', hint: '그가 앙심을 품는다: 이후 임대료가 반 할 오른다', run: (st, p) => {
            S.flags.rentMul *= 1.05;
            remember(p, '你拒绝替他销赃。', -25);
            return { text: '钱执事的笑僵了一瞬，又堆了回去：“年轻人，有骨气。”下期起，你的租子涨了半成。', go: ['audit', [7, 9]], summary: '你拒绝替钱执事销赃，他给你涨了租。' };
          } },
        ],
      },
      audit: {
        when: 'day',
        who: () => { ensureSun(); return { name: '孙管事', portrait: 'steward_sun', title: '杂役区副管事', faction: 'mo' }; },
        text: st => '머리빗 한 올도 흐트러지지 않은 여자가 가게에 들어와 종문 명패를 내밀었다: \\"잡역 구역 부관리, 손이오. 전 집사의 장부가 깨끗하지 않아 종문이 철저히 조사하라 했소.\\"\\n그녀가 장부를 펴고 붓끝을 든 채 말했다: \\"그의 밑에서 가게를 빌렸다면, 본 게 있지 않소?\\"'
          + (st.flags.complicit ? '\\n(네가 그 보따리를 떠올렸다.)' : ''),
        choices: st => [
          { label: '如实作证（对抗钱执事）', hint: st.flags.complicit ? '你自己也脱不了干系：罚银、执法堂关注上升' : '钱执事倒台，换孙管事收租', run: st => {
            const sun = S.people.sun, qian = S.people.qian;
            let extra = '';
            if (st.flags.complicit) { payUpTo(300, '증언에서 장물 판매를 자백해 벌금을 물었다.'); addHeat(15); extra = '너도 그를 위해 장물을 팔았음을 자백해 벌금을 물었다.'; }
            else { earn(200, '孙管事奖励举证。'); extra = '孙管事给了你二百灵石的举证赏。'; }
            remember(sun, '你如实作证。', 30, 'honest');
            remember(qian, '你在孙管事面前作证告了他。', -100, 'betrayed');
            qian.status = 'jailed'; lifeNote(qian, '贪墨事发，被革去执事之职，押入血狱。');
            S.flags.landlord = 'sun'; S.flags.rentMul = 0.8; S.flags.deedMul = 0.85; S.flags.inspectMul *= 1.2; S.flags.rentExtra = 0;
            return { text: `钱执事当天就被锁走了。${extra}\n孙管事接管了杂役区：“租子按规矩来，不多收一文。但规矩就是规矩——违禁的东西，别让我查到。”`, go: ['revenge', [2, 3]], summary: '네 증언으로 전 집사를 무너뜨렸다. 손 관리가 잡역 구역을 접수했다.' };
          } },
          { label: '包庇钱执事（撒谎）', sin: ['fence', 2], hint: '孙管事精明，未必瞒得过', run: st => {
            const sun = S.people.sun, qian = S.people.qian;
            if (lieCaught(sun.savvy)) {
              addHeat(25); S.flags.inspectMul *= 1.4;
              remember(sun, '你当着她的面撒谎，被她识破。', -40, 'lied');
              return { text: '孙管事的笔尖停了。“你的账，和钱执事的账，对不上。”她合上账册，“我会盯着你的铺子。”\n钱执事最终没倒，可执法堂来得越来越勤了。', end: true, summary: '你包庇钱执事，被孙管事识破。她盯上了你的铺子。' };
            }
            S.flags.deedMul *= 0.8; S.flags.rentMul *= 0.9;
            remember(qian, '你在孙管事面前替他遮掩。', 50, 'helped');
            remember(sun, '你说你什么都没见过。', -5);
            return { text: '孙管事查了半月，无功而返。钱执事亲自登门，笑得眼睛都没了：“自己人！铺契的价钱，我给你让两成。”', end: true, summary: '你替钱执事遮掩过去，他许你铺契让价两成。' };
          } },
          { label: '推说不知（明哲保身）', run: st => {
            remember(S.people.sun, '你推说不知。', -5);
            if (Math.random() < 0.5) {
              const qian = S.people.qian;
              qian.status = 'jailed'; lifeNote(qian, '贪墨事发，被押入血狱。');
              S.flags.landlord = 'sun'; S.flags.rentMul = 0.9; S.flags.rentExtra = 0;
              return { text: '没有你的证词，孙管事还是查出了钱执事的私库。钱执事被锁走了，杂役区换了主人。', end: true, summary: '钱执事倒台了，你没有沾手。' };
            }
            return { text: '孙管事查了半月，无功而返。钱执事又笑眯眯地来收租了，什么也没说——但你知道他什么都知道。', end: true, summary: '风波过去，钱执事仍是你的房东。' };
          } },
        ],
      },
      revenge: {
        when: 'night',
        text: () => S.flags.guard ? '夜里，后院传来一阵打斗声。' : '夜里，后院突然腾起火光——有人往你的铺子扔了火把！',
        choices: () => [
          { label: S.flags.guard ? '出去看看' : '扑火', run: () => {
            if (S.flags.guard) return { text: '刘癞子的弟兄按住了两个纵火的人，一搜，身上有钱执事府上的腰牌。', end: true };
            const lost = itemsIn('floor').map(it => { const n = itemName(it); takeItem(it); return n; });
            payUpTo(100, '修补被烧毁的后院。');
            return { text: `火扑灭了，后院烧得焦黑${lost.length ? `，地上的${lost.join('·')}都化成了灰` : ''}. 방화범은 진작 달아났다 - 누가 보냈는지 너는 알고 있었다.`, end: true };
          } },
        ],
      },
    },
  },

  // ── 杂役少年：阿木 ──
  amu: {
    person: { pid: 'amu', name: '阿木', faction: 'ren', portrait: 'ren_kid', title: '杂役少年', savvy: 0.15,
      bio: '父母死在魔宗矿上的孤儿。做梦都想拜入外门，不再任人欺负。' },
    intro: '외문에 들어가고 싶어하는 잡역 소년.',
    nodes: {
      pawn: {
        when: 'day',
        item: { id: 'jade_pendant', extra: { fake: false, q: 82 } },
        text: () => '杂役少年攥着一块玉佩站在柜前，眼圈通红：“掌柜的……这是俺娘留下的。外门试炼要交一百五十灵石的拜师礼，俺……俺只要一百五十。”\n他把玉佩推过来，又忍不住多看了一眼。',
        choices: () => {
          const fair = Math.round(claimedValue(customerItem()) * 0.8);
          return [
            { label: `按真价收（${fair}）`, hint: costHint(fair), req: needStones(fair), run: (st, p) => {
              spend(fair, `按真价 ${fair} 灵石收下阿木的玉佩。`);
              keepCounterItem({ cost: fair, boughtDay: S.day, amu: true });
              st.flags.fair = true; st.flags.paid = fair;
              remember(p, `你说那块玉值 ${fair} 灵石，一文没少给。`, 30, 'fair');
              return amuGo('阿木愣住了，捧着灵石不知所措，最后结结实实给你磕了个头。');
            } },
            { label: '照他开价收（150）', hint: costHint(150), req: needStones(150), run: (st, p) => {
              spend(150, '150 영석에 아목의 옥패를 받았다.');
              keepCounterItem({ cost: 150, boughtDay: S.day, amu: true });
              st.flags.under = true; st.flags.paid = 150;
              remember(p, '你照他开的价，一百五十灵石收了玉佩。', 10);
              return amuGo('阿木千恩万谢地走了。他不知道那块玉值多少。');
            } },
            { label: '压到八十', sin: ['fraud', 1], hint: costHint(80), req: needStones(80), run: (st, p) => {
              spend(80, '80 영석으로 깎아 아목의 옥패를 받았다.');
              keepCounterItem({ cost: 80, boughtDay: S.day, amu: true });
              st.flags.low = true; st.flags.paid = 80;
              remember(p, '你只给了八十灵石，他拜师的钱还差一截。', -15, 'lowballed');
              return amuGo('阿木咬着嘴唇收下了。走出门时，他的肩膀一抽一抽的。');
            } },
            { label: '借他一百五，玉佩他留着', hint: costHint(150), req: needStones(150), run: (st, p) => {
              spend(150, '借给阿木一百五十灵石。');
              st.flags.loan = true;
              remember(p, '네가 그에게 돈을 빌려주고 그의 어머니 옥패는 받지 않았다.', 45, 'helped');
              return amuGo('\\"주인장, 나는...\\" 아목이 옥패를 다시 품에 넣고 말을 잇지 못한 채 그저 힘차게 고개를 끄덕였다.');
            } },
            { label: '받지 않는다', run: (st, p) => {
              st.flags.refused = true;
              remember(p, '你没收他的玉佩。', -5);
              return amuGo('阿木低着头，攥着玉佩出去了。');
            } },
          ];
        },
      },
      back: {
        when: 'day',
        who: st => st.flags.refused ? { at: 'door' } : { portrait: 'amu_disciple', title: '血煞宗外门弟子', faction: 'mo' },
        text: st => {
          const f = st.flags;
          if (f.refused) return '阿木站在门口，没有进来。他没凑够拜师礼，如今跟在刘癞子屁股后面跑腿，脸上多了道疤。\n“掌柜的，俺不怪您。”他说完就走了。';
          let t = '阿木换了一身血煞宗外门弟子的劲装，一进门就给你作了个揖：“掌柜的！俺过了试炼！”';
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
          if (f.refused) return [{ label: '目送他离开', run: (st, p) => {
            lifeNote(p, '没凑够拜师礼，跟着刘癞子混日子。');
            return { text: '你看着他瘦削的背影消失在巷口。', end: true, summary: '你没帮他，他没能拜入外门。' };
          } }];
          const pre = (st, p) => {
            if (f.under) remember(p, '그 옥을 네가 헐값에 받았다는 걸 그가 알게 됐다.', -25, 'lowballed');
            if (f.loan) { earn(200, '阿木还了二百灵石。'); }
            p.portrait = 'amu_disciple'; p.title = '血煞宗外门弟子'; p.faction = 'mo';
            lifeNote(p, '通过外门试炼，拜入血煞宗。');
          };
          if (!held) return [{ label: '恭喜他', run: (st, p) => {
            pre(st, p);
            if (!f.loan && !f.fair) remember(p, '娘的玉佩，被你卖掉了。', -10);
            return { text: '阿木又作了个揖，走了。', go: ['fate', [8, 10]] };
          } }];
          return [
            { label: `原价让他赎回（${f.paid}）`, run: (st, p) => {
              pre(st, p); takeItem(held); earn(f.paid, '阿木赎回了玉佩。');
              remember(p, '你让他原价赎回了娘的玉佩。', 25, 'helped');
              return { text: '阿木把玉佩贴在胸口，眼泪一下就下来了。', go: ['fate', [8, 10]] };
            } },
            { label: '送还给他', run: (st, p) => {
              pre(st, p); takeItem(held);
              remember(p, '你把娘的玉佩白送还给了他。', 40, 'helped');
              return { text: '\\"주인장...\\" 아목이 옥패를 꽉 쥐고 한참 만에 한마디 했다, \\"이 아목, 평생 은혜를 입었습니다.\\"', go: ['fate', [8, 10]] };
            } },
            { label: '要赎回，得按市价', sin: ['fraud', 1], hint: '多赚一笔', run: (st, p) => {
              pre(st, p);
              const price = Math.round(claimedValue(held) * 1.1);
              if (p.aff > 0 && Math.random() < 0.6) {
                takeItem(held); earn(price, `阿木按市价 ${price} 灵石赎回了玉佩。`);
                remember(p, `你要他按市价 ${price} 灵石才肯让他赎回娘的玉佩。`, -20, 'gouged');
                return { text: '阿木一言不发，把攒下的灵石一枚一枚数在柜上，拿起玉佩走了。', go: ['fate', [8, 10]] };
              }
              remember(p, '네가 그가 어머니의 옥패를 되찾는 걸 허락하지 않았다.', -20);
              return { text: `\"${price}... 낼 수가 없습니다.\" 그가 그 옥패를 마지막으로 보고 떠났다.`, go: ['fate', [8, 10]] };
            } },
          ];
        },
      },
      fate: {
        when: 'day',
        who: (st, p) => p.aff <= -10 ? { portrait: 'mo_enforcer', title: '执法堂巡查', faction: 'mo' } : { portrait: 'amu_disciple' },
        text: (st, p) => p.aff >= 30
          ? '阿木晋了内门，披着一件崭新的黑红大氅。他把一柄制式飞剑放在柜上，压低声音：“掌柜的，执法堂下个月要严查杂役区。我能压下的，都压下了。”'
          : p.aff <= -10
            ? '집법당 흑갑을 입은 젊은이가 가게에 들어와 면구를 벗었다 - 아목이었다. 그의 눈빛이 얼음처럼 차가웠다: \\"명령을 받들어 순찰 중이다. 주인장, 네 가게에는 자주 오겠다.\\"'
            : '阿木路过铺子，朝你点了点头，没有进来。',
        choices: (st, p) => p.aff >= 30 ? [
          { label: '收下他的心意', run: (st, p) => {
            giveItem('sword_std', { q: 88 }); addHeat(-20); S.flags.inspectMul *= 0.7;
            lifeNote(p, '晋升内门，在执法堂说得上话。');
            return { text: '\\"그때 주인장이 아니었다면 오늘의 아목도 없었을 겁니다.\\" 그가 포권하고 외투를 휘날리며 떠났다.', end: true, summary: '阿木成了内门弟子，暗中照应着你的铺子。' };
          } },
        ] : p.aff <= -10 ? [
          { label: '赔礼道歉，奉上三百灵石', hint: costHint(300), req: needStones(300), run: (st, p) => {
            spend(300, '向阿木赔礼。');
            remember(p, '你拿三百灵石赔礼。', 15);
            addHeat(5); S.flags.inspectMul *= 1.1;
            lifeNote(p, '进了执法堂。');
            return { text: '阿木看着那堆灵石，收下了，又像是没收下：“有些东西，灵石买不回来。”他走了，可来得没那么勤了。', end: true, summary: '阿木进了执法堂。你赔了礼，他没再为难你，也没原谅你。' };
          } },
          { label: '随他去', run: (st, p) => {
            addHeat(20); S.flags.inspectMul *= 1.3;
            lifeNote(p, '进了执法堂，专查杂役区。');
            return { text: '此后，执法堂的人来你铺子的次数，明显多了。', end: true, summary: '阿木进了执法堂，专盯你的铺子。' };
          } },
        ] : [
          { label: '点头回礼', run: (st, p) => {
            lifeNote(p, '在外门站稳了脚跟。');
            return { text: '그의 뒷모습이 한결 꼿꼿해졌다.', end: true, summary: '阿木拜入外门，过上了自己的日子。' };
          } },
        ],
      },
    },
  },

  // ── 狐妖：白绡 ──
  fox: {
    person: { pid: 'fox', name: '白绡', faction: 'yao', portrait: 'yao_fox', title: '狐妖', savvy: 0.55,
      bio: '化形不久的狐妖，姐姐的妖丹被猎妖人剖走，她混进杂役区寻找下落。' },
    intro: '일족의 요단을 찾는 여우 요괴.',
    nodes: {
      seek: {
        when: 'day',
        text: st => owns('yao_core')
          ? '여우 귀 소녀가 살금살금 가게에 들어오더니, 콧잎을 씰룩이며 얼굴이 하얗게 질렸다: \\"여기서... 요단 냄새가 나.\\" 그녀가 옷자락을 꽉 쥐었다, \\"우리 일족의 거야. 우리 언니의...\\"'
          : st.flags.asked
            ? '白绡又来了，在铺子里嗅了一圈：“还是没有……你答应过替吾留意的。”'
            : '여우 귀 소녀가 살금살금 가게에 들어와 카운터 앞에서 킁킁거렸다: \\"인족 꼬마 주인장, 요단을 보거든 - 특히 흰 털 한 올 박힌 것은 - 나를 위해 남겨두어. 보답할게.\\"',
        choices: st => owns('yao_core') ? [
          { label: '无偿还给她', hint: '失去妖丹；妖族声望 +8', run: (st, p) => {
            takeItem(owns('yao_core')); adjustRep('yao', 8);
            remember(p, '你把族人的妖丹还给了她，分文未取。', 40, 'helped');
            return { text: '白绡把妖丹捧在手心，眼泪啪嗒啪嗒落在上面。“谢谢你……人族。”', go: ['hunted', [4, 6]], summary: '你把族人的妖丹无偿还给了她。' };
          } },
          { label: '半价卖给她', hint: '+35 영석', run: (st, p) => {
            takeItem(owns('yao_core')); earn(35, '把妖丹半价卖给白绡。');
            remember(p, '你把妖丹半价卖给了她。', 10);
            return { text: '白绡把一把碎灵石数在柜上，那是她全部的家当。', go: ['hunted', [4, 6]], summary: '你把妖丹卖给了她。' };
          } },
          { label: '주지 않는다', run: (st, p) => {
            remember(p, '네가 일족의 요단을 그녀에게 주기를 거부했다.', -20);
            return { text: '\\"...기억하겠다.\\" 그녀가 돌아서서 뛰쳐나갔다.', go: ['seek', [5, 7]] };
          } },
          { label: '稳住她，暗中报执法堂', sin: ['betray', 3], hint: '赏银 150，魔宗声望 +5；妖族声望 -20', run: (st, p) => {
            earn(150, '设计诱捕狐妖，得赏银。'); adjustRep('mo', 5); adjustRep('yao', -20);
            remember(p, '你设局把她交给了执法堂。', -100, 'betrayed');
            p.status = 'dead'; lifeNote(p, '被执法堂擒获，剖丹炼药。');
            return { text: '你笑着请她喝茶。半炷香后，执法堂的人堵住了门。她被拖走时死死盯着你，一双琥珀色的眼睛里全是血。', go: ['sister', [3, 5]], summary: '你出卖了她。' };
          } },
        ] : [
          { label: '答应替她留意', run: (st, p) => {
            st.flags.asked = (st.flags.asked || 0) + 1;
            remember(p, '你答应替她留意妖丹。', 5);
            return { text: '\\"약속이다.\\" 그녀의 꼬리가 살랑 흔들렸다.', go: st.flags.asked >= 3 ? ['hunted', [3, 5]] : ['seek', [5, 7]] };
          } },
          { label: '妖族的事与我无关', run: (st, p) => {
            remember(p, '你说妖族的事与你无关。', -8);
            return { text: '她撇撇嘴，走了。', go: ['seek', [7, 10]] };
          } },
        ],
      },
      hunted: {
        when: 'night',
        text: () => '窗外有人轻叩。你推开窗——白绡浑身是血，一条尾巴断了半截。远处传来猎妖人的号角。\n“求你……让吾躲一躲。”',
        choices: () => [
          { label: '让她进来', hint: '被搜出则执法堂关注 +20', run: (st, p) => {
            if (hideRoll(0.3)) {
              addHeat(20);
              remember(p, '네가 위험을 무릅쓰고 그녀를 숨겨줬지만, 요괴 사냥꾼을 끌어들였다.', 15);
              lifeNote(p, '在你的铺子里被猎妖人发现，拼死逃脱。');
              return { text: '猎妖人循着血迹找上门，白绡撞破后窗逃了。你被执法堂盘问到天亮。', go: ['repay', [6, 8]] };
            }
            remember(p, '那一夜你收留了她。', 35, 'helped');
            return { text: '你把她藏在米缸后面。号角声在门外停了很久，终于远去。天亮前，她舔干净了伤口，从后窗跃上了屋顶。', go: ['repay', [6, 8]], summary: '你收留了被猎妖人追杀的她。' };
          } },
          { label: '关上窗', run: (st, p) => {
            remember(p, '那一夜，你关上了窗。', -30);
            p.status = 'gone'; lifeNote(p, '那一夜之后下落不明。');
            return { text: '窗外的喘息声渐渐远了。第二天，你在巷口看到一撮染血的白毛。', end: true, summary: '她求你收留，你关上了窗。' };
          } },
        ],
      },
      repay: {
        when: 'day',
        cond: (st, p) => p.status === 'alive',
        text: (st, p) => p.aff >= 40
          ? '白绡背着一只竹篓进门，尾巴已经长好了：“狐族欠你的，吾来还。”篓里是山里最好的灵芝和灵果。\n“往后妖族来你这里，吾会让他们规矩些。”'
          : '白绡在门口放下一只竹篓，没进来：“两清了。”',
        choices: (st, p) => [
          { label: '收下', run: (st, p) => {
            const big = p.aff >= 40;
            for (let i = 0; i < (big ? 3 : 1); i++) giveItem('herb_blood', { q: big ? 92 : 70 });
            for (let i = 0; i < (big ? 3 : 1); i++) giveItem('spirit_fruit', { q: 85 });
            if (big) { adjustRep('yao', 20); S.flags.foxBlessing = true; }
            lifeNote(p, big ? '回到妖域，成了一方狐族的首领。' : '回到了妖域。');
            return { text: big ? '她临走时回头冲你笑了笑，眼睛弯成了月牙。' : '她走了，没有回头。', end: true, summary: big ? '她报答了你，妖族从此对你另眼相看。' : '她还了人情，两清了。' };
          } },
        ],
      },
      sister: {
        when: 'night',
        who: () => ({ name: '青绡', portrait: 'yao_fox_f1', title: '白绡之姐', faction: 'yao' }),
        text: () => '비릿한 바람이 휘몰아치고, 가게의 등불이 하나둘 꺼졌다. 어둠 속에서 목소리가 들렸다: \\"내 여동생의 목숨, 피에는 피로 갚는다.\\"\\n문짝에 깊은 발톱 자국 다섯 줄이 남았다.',
        choices: () => [
          { label: '……', run: () => {
            const store = itemsIn('store');
            const lost = store.sort(() => Math.random() - 0.5).slice(0, 3).map(it => { const n = itemName(it); takeItem(it); return n; });
            adjustRep('yao', -30);
            return { text: `天亮后，库房被翻得一片狼藉${lost.length ? `，${lost.join('·')}不见了` : ''}. 그 후로 요족은 다시 네 가게에 발을 들이지 않았다.`, end: true, summary: '你出卖了白绡，她的姐姐来复仇了。' };
          } },
        ],
      },
    },
  },

  // ── 仙门叛徒：顾青崖 ──
  defector: {
    person: { pid: 'defector', name: '顾青崖', faction: 'xian', portrait: 'xian_defector', title: '선문 기도(棄徒)', savvy: 0.6,
      bio: '선문이 보낸 잠복자. 마종 장로 암살 명령을 받았지만 마지막 순간에 손을 거뒀다.' },
    intro: '선문에서 탈주한 젊은 검수.',
    nodes: {
      sword: {
        when: 'day',
        item: { id: 'xian_sword', extra: { q: 88 } },
        text: () => '斗篷下的青年把一个长条布包放在柜上，掀开一角——寒光凛冽，是仙门名剑青霄。\n“我奉师命潜入魔宗刺杀长老，可我下不去手……那长老在给孙女扎辫子。”他声音发紧，“仙门不会放过叛徒。三百灵石，够我逃去南疆。求店家莫要声张。”',
        choices: () => [
          { label: '收剑（300）', hint: costHint(300) + '；仙门禁物', req: needStones(300), run: (st, p) => {
            spend(300, '收下顾青崖的青霄剑。');
            keepCounterItem({ cost: 300, boughtDay: S.day });
            st.flags.bought = true;
            remember(p, '你收了他的剑，给了他逃命的钱。', 20, 'helped');
            return { text: '顾青崖朝你一揖，拉低斗笠，消失在人群里。', go: ['hunter', [3, 5]], summary: '你收了他的剑，给了他逃命的钱。' };
          } },
          { label: '赠他一百灵石路费，剑不收', hint: costHint(100), req: needStones(100), run: (st, p) => {
            spend(100, '赠顾青崖一百灵石路费。');
            st.flags.helped = true;
            remember(p, '你白送他路费，剑也没要。', 40, 'helped');
            return { text: '\\"가게 주인...\\" 그가 영석을 꽉 쥐고 한참 만에 말했다, \\"구모, 기억하겠습니다.\\"', go: ['hunter', [3, 5]], summary: '你白送他路费，没要他的剑。' };
          } },
          { label: '받지 않고 다른 곳을 알아보라 한다', run: (st, p) => {
            remember(p, '你没收他的剑。', -5);
            return { text: '그가 말없이 검을 싸서 떠났다.', go: ['hunter', [3, 5]] };
          } },
          { label: '稳住他，报执法堂', sin: ['betray', 3], hint: '赏银 250；仙门声望 -15', run: (st, p) => {
            earn(250, '선문 간첩을 신고해 상금을 받았다.'); adjustRep('mo', 5); adjustRep('xian', -15);
            remember(p, '你把他交给了魔宗执法堂。', -100, 'betrayed');
            p.status = 'dead'; lifeNote(p, '被魔宗执法堂擒获，死在血狱。');
            return { text: '그가 끌려갈 때 발버둥 치지 않고 너에게 말했다: \\"원망하지 않아. 이 세상, 누구나 살고 싶으니까.\\"', end: true, summary: '你把他交给了执法堂。' };
          } },
        ],
      },
      hunter: {
        when: 'day',
        who: () => {
          if (!S.people.spy) newPerson('xian', { pid: 'spy', name: '寒霜', portrait: 'xian_spy', title: '선문 추적사', savvy: 0.75, story: 'defector',
            bio: '선문이 배신자를 추적하라고 보낸 여수사. 면사 아래 얼굴을 본 사람이 없다.' });
          return { name: '寒霜', portrait: 'xian_spy', title: '선문 추적사', faction: 'xian' };
        },
        text: () => '蒙面女修在柜前站定，声音清冷：“店家可曾见过一个背剑的青年？他是仙门叛徒，带着一柄青霄剑。”\n她把一袋灵石放在柜上，“说出他的去向，仙门必有重谢。”',
        choices: st => [
          { label: '说出他的去向', sin: ['betray', 3], hint: '+300 영석, 선문 평판 +10', run: st => {
            earn(300, '向仙门追缉使出卖顾青崖。'); adjustRep('xian', 10);
            const p = S.people.defector, spy = S.people.spy;
            remember(spy, '你告诉了她叛徒的去向。', 20);
            remember(p, '你出卖了他的去向。', -100, 'betrayed');
            p.status = 'dead'; lifeNote(p, '在去南疆的路上被仙门追上，废去修为，押回山门。');
            let t = '寒霜收起名册：“多谢。”她走后第三天，你听说南疆官道上发生了一场恶斗。';
            const sword = owns('xian_sword');
            if (sword) { takeItem(sword); t += '\\n떠나기 전, 그녀가 네 창고를 힐끗 보았다: \\"청소검은 선문이 회수했다.\\"'; }
            return { text: t, end: true, summary: '你向仙门出卖了他的去向。' };
          } },
          { label: '谎称没见过', hint: '她未必信', run: st => {
            const spy = S.people.spy;
            if (lieCaught(spy.savvy - (owns('xian_sword') ? 0 : 0.25))) {
              adjustRep('xian', -15); addHeat(10);
              remember(spy, '你当面撒谎，被她识破。', -30, 'lied');
              return { text: '\\"너에게서 청소검의 검기가 난다.\\" 한상의 목소리가 차가워졌다, \\"배신자를 숨겨준 것, 선문이 기억하겠다.\\" 그녀가 떠난 뒤, 집법당에도 무슨 소문이 들어간 모양이다.', go: ['letter', [6, 9]] };
            }
            remember(spy, '你说你没见过他。', 0);
            return { text: '寒霜盯着你看了片刻，收起灵石走了。', go: ['letter', [6, 9]] };
          } },
        ],
      },
      letter: {
        when: 'day',
        who: () => ({ name: '南疆行商', portrait: 'ren_merchant', title: '南疆行商', faction: 'ren' }),
        text: () => '새까맣게 그을린 남강 행상이 기름종이 보따리를 카운터에 올렸다: \\"구 공자라는 분이 전해달라 했습니다. 누군지 아실 거라고요.\\"\\n보따리 안에는 편지 한 통, 영석 한 주머니, 맑은 빛을 뿜는 부적 두 장이 있었다. 편지에는 한 줄만 적혀 있었다: \\"청애는 이미 남강에 몸을 의탁했다. 이 생에 다시는 검을 뽑지 않으리. 고맙네.\\"',
        choices: () => [
          { label: '收下', run: (st, p) => {
            earn(600, '顾青崖从南疆捎来六百灵石。');
            giveItem('xian_talisman', { q: 90 }); giveItem('xian_talisman', { q: 90 });
            lifeNote(p, '在南疆隐姓埋名，开了间小小的剑铺，只卖菜刀。');
            return { text: '你把信在灯上烧了。那两张符箓，最好也藏好。', end: true, summary: '그가 남강으로 달아나 사례를 보내왔다.' };
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
          return { name: `${p.name}의 가족`, portrait: p.faction === 'ren' ? 'ren_merchant' : pick(PORTRAITS[p.faction])[0], title: '故人亲属', faction: p.faction };
        },
        text: st => {
          const p = S.people[st.flags.pid];
          return `来人一身素服，把一个布包放在柜上：“${p.name}走了。临走前嘱咐我，把这个交给您。他说您是杂役区少有的好人。”`;
        },
        choices: st => {
          const p = S.people[st.flags.pid];
          return [
            { label: '收下', run: () => {
              const id = pick(['jade_pendant', 'bronze_mirror', 'pill_found']);
              const it = giveItem(id, { q: rint(75, 95), fake: false, verdict: 'real' });
              return { text: `布包里是一件${it ? itemName(it) : '旧物'}。你想起${p.name}站在柜前的样子。`, end: true };
            } },
            { label: '请他们留着度日', hint: `${FACTIONS[p.faction].name} 평판 +5`, run: () => {
              adjustRep(p.faction, 5);
              return { text: '来人怔了怔，眼圈红了，深深鞠了一躬。', end: true };
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
    p.status = 'gone'; lifeNote(p, '再没来过你的铺子。');
    return { text: text + '\\n그 후로 그는 다시 오지 않았다.', end: true, summary: '네가 몇 번이고 쫓아내자 그는 다시 오지 않았다.' };
  }
  if ((f.kind || 0) >= 3 && S.day >= 9) return { text, go: ['hunted', [2, 3]] };
  return { text, go: ['beg', [3, 5]] };
}

function chenReward(p, text) {
  p.name = '血手陈枭'; p.portrait = 'beggar_master'; p.title = '前魔宗长老'; p.faction = 'mo';
  lifeNote(p, '恢复修为，重回血煞宗。');
  remember(p, '你救过他的命，他报了恩。', 20, 'helped');
  return { text: text + '\\n\\"후회유기.\\" 말이 끝나기도 전에 사람은 사라졌다.', end: true, summary: '老乞丐原来是前魔宗长老血手陈枭，他报答了你的救命之恩。' };
}

const thugAlly = () => !!(S.story.thug && S.story.thug.flags.ally && S.people.thug.status === 'alive');

function amuGo(text) { return { text, go: ['back', [6, 8]] }; }

function warWin(st, p, pay, extra = '') {
  pay();
  st.flags.boss = true; S.flags.thugBoss = true;
  remember(p, '그가 패싸움할 때 네가 한손 거들었다.', 40, 'helped');
  lifeNote(p, '火并黑狗帮大胜，成了杂役区一霸。');
  return { text: `${extra}날이 밝을 때, 류라자가 온몸 피투성이로 돌아와 입을 찢으며 웃었다: \"형제여, 흑구방은 끝났다. 앞으로 이 잡역 구역은 우리가 주인이다!\"`, end: true, summary: '你助他火并黑狗帮，他成了杂役区一霸。' };
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
