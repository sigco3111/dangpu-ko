// 擂台：每四周一次外门小比，年终宗门大比。你可以报名、押注、暗中做手脚，或者不去。
// 胜负由 judge() 按双方境界、兵器、身上的伤毒定——带伤上擂多半败下阵来，奖赏一件也拿不到；你下过毒的人，也会在台上倒下
'use strict';

const TOURNEY_EVERY = 28;
const TOURNEY_PRIZE = {
  small: { stones: 150, items: ['pill_blood', 'zhen_fu', 'sword_std', 'soul_pearl', 'lens2'], fee: 30, name: '외문 소시합' },
  grand: { stones: 400, items: ['pill_found', 'soul_banner', 'god_blank', 'soul_crystal'], fee: 80, name: '종문 대비' },
};

// 每夜：提前四天发请帖；没人报名的擂台也照样打，打完的人各有命数
function tourneyTick() {
  const d = S.day + 1, at = d + 4;
  const grand = calendar(at).doy === 330;
  if (at % TOURNEY_EVERY === 0 || grand) startStory(`tn_${at}`, 'tourney', 'invite', 1, { day: at, grand, field: pickField(grand) });
  const out = [];
  for (const [key, st] of Object.entries(S.story)) {
    if (st.tpl !== 'tourney' || st.flags.resolved || st.flags.day > S.day) continue;
    if (st.flags.entered) continue;   // 你报了名：等你夜里上擂时一并结算
    const res = runBracket(st, false);
    st.flags.resolved = true; st.done = true;
    st.summary = `${res.champName}이(가) ${prizeOf(st).name} 우승을 차지했다.`;
    out.push({ icon: 'ic_war', title: prizeOf(st).name, text: `${res.lines.join(' ')}${betText(st, res)}`, cls: 'warn' });
  }
  return out;
}

const prizeOf = st => TOURNEY_PRIZE[st.flags.grand ? 'grand' : 'small'];

// 参赛的三个人：有修为的熟客优先，不够就来几个外门弟子
function pickField(grand) {
  // 管事、官差和老故事里的人不上擂；角色册里的人可以
  const known = Object.values(S.people).filter(p => p.status === 'alive' && !p.official && !p.noble && !PROTECTED.includes(p.pid) && (!p.story || CAST[p.story])
    && npcBasePower(p) >= 20 && ['mo', 'ren', 'yao'].includes(p.faction))
    .sort(() => Math.random() - 0.5).slice(0, 3);
  while (known.length < 3) {
    const p = newPerson('mo', { portrait: 'mo_disciple', title: '외문 제자', anyFace: true });
    if (grand) p.budgetMul = 1.4;
    known.push(p);
  }
  // 擂台之前，总有人带着伤
  if (Math.random() < 0.5) addCond(pick(known), 'injured', 1, '소시합 전에 남과 다퉜다');
  return known.map(p => p.pid);
}

const fieldOf = st => st.flags.field.map(id => S.people[id]).filter(p => p && p.status === 'alive');

// 一个人的“风声”：状态、境界——你认得他、或打听过才知道
function rumor(p) {
  const c = condList(p);
  return `${p.name}(${p.title}, ${realmName(npcLevel(p))}${c.length ? `, 소문에 ${c.map(x => x.label).join(', ')}` : ''})`;
}

// 擂台：每轮两两相斗，赢的晋级。me 为你是否在场；ignore：服药硬撑时抵掉多少状态折损
function runBracket(st, me, ignore = 0) {
  let pool = fieldOf(st).slice();
  if (me) pool.unshift('me');
  const lines = [], fate = new Map();
  let round = 1, myBest = 0;
  while (pool.length > 1) {
    const next = [];
    for (let i = 0; i < pool.length; i += 2) {
      const a = pool[i], b = pool[i + 1];
      if (!b) { next.push(a); continue; }
      const r = judge(a, b, { bonus: a === 'me' ? ignore : b === 'me' ? -ignore : 0 });
      const win = r.win ? a : b, lose = r.win ? b : a;
      const g = r.win ? r.grade : r.grade === 'rout' ? 'crush' : 'win';   // 从赢家这边说
      lines.push(`${round}회전, ${whoName(a)} 대 ${whoName(b)}: ${whoName(win)} ${GRADE_NAME[g]}.`);
      if (a === 'me' || b === 'me') lines.push(`(너: ${partsText(a === 'me' ? r.a : r.b)}; ${whoName(a === 'me' ? b : a)}: ${partsText(a === 'me' ? r.b : r.a)})`);
      // 惨败的人被抬下去：带伤
      if (Math.abs(r.margin) > 18) fate.set(lose, 'routed');
      else fate.set(lose, 'lost');
      if (win === 'me') myBest = round;
      next.push(win);
    }
    pool = next; round++;
  }
  const champ = pool[0];
  if (champ === 'me') myBest = 99;
  // 人物的命数：头名出头，惨败的带伤
  for (const p of fieldOf(st)) {
    if (p === champ) {
      const ev = LIFE[p.faction].find(e => e.id === 'rise');
      applyLife(p, Object.assign({}, ev || {}, { text: `{n}이(가) ${prizeOf(st).name}에서 우승했다.` }));
    } else if (fate.get(p) === 'routed') addCond(p, 'injured', 2, `${prizeOf(st).name}에서 중상을 입었다`);
    else if (fate.get(p) === 'lost') lifeNote(p, `${prizeOf(st).name}에서 졌다.`);
  }
  return { lines, champ, champName: whoName(champ), myBest, myFate: fate.get('me') };
}

function betText(st, res) {
  const b = st.flags.bet;
  if (!b) return '';
  if (res.champ !== 'me' && res.champ.pid === b.pid) { earn(b.n * 3, `${res.champName}을(를) 적중시켜 ${b.n * 3} 영석을 땄다.`); return `네가 건 ${res.champName}이(가) 이겨 ${b.n * 3} 영석이 들어왔다.`; }
  return `네가 건 ${S.people[b.pid].name}은(는) 우승하지 못해 ${b.n} 영석이 물거품이 됐다.`;
}

Object.assign(STORIES, {
  tourney: {
    nodes: {
      invite: {
        when: 'day',
        who: () => ({ name: '전당 집사', portrait: 'mo_disciple_f1', title: '비무대 집사', faction: 'mo' }),
        text: st => {
          const P = prizeOf(st), me = condText('me');
          return `전당의 붉은 도포를 걸친 집사가 비무 초청장 한 장을 카운터에 탁 내려놓았다: "${P.name}, 나흘 뒤 개막이다. 잡역 구역에도 자리가 하나 있지. 참가비 ${P.fee} 영석."\n`
            + `"우승 상금 ${P.stones} 영석에 창고의 좋은 물건 한 점이 곁들여진다. 진 사람은 아무것도 못 받고, 들것에 실려 나가도 전당을 탓하지 마라."\n`
            + `"이번 출전자: ${fieldOf(st).map(rumor).join('; ')}."`
            + (me ? `\n그가 너를 위아래로 훑어보았다: "${me.replace(/[.]$/, '')} — 이런 몸으로 오르려면 생사는 알아서 해라."` : '');
        },
        choices: (st, p) => {
          const P = prizeOf(st), field = fieldOf(st), list = [];
          if (!field.length) return [{ label: '...', run: () => ({ text: '오를 사람이 하나둘 사라졌다. 비무대가 비었고 집사는 토라져 초청장을 거뒀다.', end: true }) }];
          const odds = Math.round(field.reduce((s, f) => s * judgeOdds('me', f), 1) * 100);
          list.push({ label: `출전 신청(${P.fee} 영석)`, hint: `끝까지 연승 확률 약 ${odds}%. 부상·중독은 실력을 깎는다${deathWarn('injured')}`, req: needStones(P.fee), run: () => {
            spend(P.fee, `${P.name} 참가비.`); st.flags.entered = true;
            return { text: '집사가 초청장에 네 이름을 적었다: "나흘 뒤, 밤에 시작한다. 몸이나 잘 챙겨라."', go: ['bout', st.flags.day - S.day] };
          } });
          for (const f of field.slice(0, 2)) list.push({ label: `100 영석을 걸어 ${f.name}의 우승에 베팅`, hint: `이기면 3배. ${condList(f).length ? `${ta(f)}: ${condList(f).map(c => c.label).join(', ')}` : `${ta(f)}은(는) 상처도 병도 없어 보인다`}`,
            req: needStones(100), run: () => {
              spend(100, `${f.name} 우승에 베팅.`); st.flags.bet = { pid: f.pid, n: 100 };
              return { text: `집사가 영석을 받고 베팅 장부에 동그라미를 그렸다: "${f.name}, 3배."`, go: ['bout', st.flags.day - S.day] };
            } });
          const dose = ownItem(it => ['corpse_poison', 'wangyou', 'spider_venom', 'gu_venom'].includes(it.id) || (lacedKnown(it) && ['poison', 'addict', 'numb'].includes(it.laced)));
          list.push({ label: `몰래 ${field[0].name}에게 약을 탄다`, hint: dose ? `${itemName(dose)}을(를) 쓴다. ${ta(field[0])}이(가) 출전할 때 중독된다. 들키면 집법당 주시 +12` : '손에 시독, 망우산, 거미 독, 고충 독이나 뭔가 섞인 물건이 없다',
            req: () => !!dose || '탈 만한 약이 없다', run: () => {
              const f = field[0];
              takeItem(dose); karmaShift(-4);
              commitSin('harm', { p: f, w: 1, what: `비무대 전에 ${f.name}에게 약을 탔다` });
              if (lieCaught(f.savvy * 0.6)) {
                addHeat(12); adjustRep('mo', -5); remember(f, '비무대 전에 약을 탄 것을 그가 알아챘다.', -60, 'poisoned');
                return { text: `${f.name}이(가) 사발을 들어 냄새를 맡더니 안색이 변해 약을 네 발밑에 쏟았다. 다음 날 집법당 사람들이 물으러 왔다.`, go: ['bout', st.flags.day - S.day] };
              }
              addCond(f, 'poisoned', 2, '비무대 전에 출처 불명의 탕약 한 사발을 마셨다');
              return { text: `약이 ${f.name}의 음식에 섞였다. ${ta(f)}은(는) 아주 맛있게 먹었다.`, go: ['bout', st.flags.day - S.day] };
            } });
          list.push({ label: '가지 않는다', run: () => ({ text: '집사가 콧방귀를 뀌며 초청장을 거뒀다.', end: true }) });
          return list;
        },
      },

      bout: {
        when: 'night',
        who: () => ({ name: '비무대', portrait: 'mo_disciple_f1', title: '전당 비무대', faction: 'mo' }),
        text: st => {
          const P = prizeOf(st), me = condText('me');
          return `${P.name} 비무대가 전당 밖에 세워졌고 횃불이 핏빛으로 비춘다. ${st.flags.entered ? '잡역 구역 경기 차례다.' : '너는 인파에 섞여 구경한다.'}\n`
            + `출전자: ${fieldOf(st).map(rumor).join('; ')}.`
            + (st.flags.entered && me ? `\n${me} 오르기 전에 잘 생각해라.` : '');
        },
        choices: st => {
          if (!st.flags.entered) return [{ label: '구경한다', run: () => {
            const res = runBracket(st, false); st.flags.resolved = true;
            return { text: `${res.lines.join('\n')}\n${betText(st, res)}`, end: true, summary: `${res.champName}이(가) ${prizeOf(st).name} 우승을 차지했다.` };
          } }];
          const hurt = condPenalty('me'), list = [];
          const fight = ignore => {
            const P = prizeOf(st), res = runBracket(st, true, ignore);
            st.flags.resolved = true;
            let tail;
            if (res.champ === 'me') {
              const it = giveItem(pick(P.items), { q: rint(70, 90) });
              earn(P.stones, `${P.name} 우승, 상금 ${P.stones} 영석.`); adjustRep('mo', st.flags.grand ? 10 : 5); S.merit.mo += st.flags.grand ? 4 : 2; shiftSt('war', 8);
              tail = `우승! 상금 ${P.stones} 영석${it ? `, 그리고 ${itemName(it)} 한 점` : ''}. 전당이 네 이름을 기억했다.`;
            } else {
              if (res.myFate === 'routed') addCond('me', 'injured', 2, '비무대에서 중상을 입었다');
              else if (Math.random() < 0.5) addCond('me', 'injured', 1, '비무대에서 상처를 입었다');
              tail = res.myBest ? `너는 ${res.myBest + 1}회전에서 멈췄다.` : '너는 첫 회전에서 비무대 밑으로 떨어졌다.';
              tail += res.myFate === 'routed' ? '너는 들것에 실려 내려왔고 상은 하나도 받지 못했다.' : '상은 하나도 받지 못했다.';
            }
            if (ignore) addCond('me', 'injured', 1, '약기운이 빠지며 상처가 도졌다');
            return { text: `${res.lines.join('\n')}\n${tail}${betText(st, res)}`, end: true, summary: res.champ === 'me' ? `네가 ${prizeOf(st).name} 우승을 차지했다.` : `너는 ${prizeOf(st).name}에서 져 빈손으로 돌아왔다.` };
          };
          list.push({ label: '오른다', hint: hurt ? `몸 상태로 실력 -${hurt}${deathWarn('injured')}` : '상태 양호', run: () => fight(0) });
          if (hurt && owns('pill_blood')) list.push({ label: '혈살단 한 알을 삼키고 버틴다', hint: '혈살단을 쓴다. 오늘 밤은 상처·독의 대부분을 버티지만 이후 상처가 악화된다', run: () => {
            takeItem(owns('pill_blood')); return fight(Math.round(hurt * 0.8));
          } });
          list.push({ label: '기권', hint: '참가비는 돌려받지 못한다. 다치지 않는다', run: () => {
            const res = runBracket(st, false); st.flags.resolved = true;
            return { text: `你在擂台下撕了自己的名帖。\n${res.lines.join('\n')}${betText(st, res)}`, end: true, summary: `너는 ${prizeOf(st).name}에서 기권했다.` };
          } });
          return list;
        },
      },
    },
  },
});
