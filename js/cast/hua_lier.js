// 花狸儿：刚学会化形的小猫妖，爹娘被灵兽阁捉走，一个人在屋檐上过活，拿“捡来的”东西换鱼干。
// 灵兽阁的人满杂役区捉野妖崽子——护她要担私藏妖物的罪名，卖她只值五十灵石
'use strict';

const LIER_CATCHER = { name: '영수각 제자', portrait: 'mo_disciple', title: '영수각 포역', faction: 'mo' };
// 她那块玉佩还在你铺里摆着么
const lierPendant = st => { const it = st.flags.pendant && S.items[st.flags.pendant]; return it && HELD(it) ? it : null; };

defineCharacter({
  id: 'hua_lier', name: '화리아', faction: 'yao', sex: 'f', title: '아기 고양이 요괴',
  portrait: 'hua_lier',
  // 孩子：画成可爱俏皮的童星，衣着严实；神态里不画成瘾、黑筋
  artSubject: 'a little girl (child actress)',
  art: 'a cute cheerful little cat-spirit girl who looks about ten years old, small and round-faced, big bright amber cat eyes, '
    + 'fluffy orange-and-white cat ears and a long striped orange tail, messy short hair tied with a red ribbon, a smudge of dust on one cheek, '
    + 'a simple patched orange cotton jacket and loose trousers fully covering arms and legs, cloth shoes, holding a small dried fish in both hands, wholesome and innocent',
  minor: true,
  moodArt: {
    wasted: 'sick and worn out: pale face, tired droopy eyes, ears flat and drooping, hugging herself as if cold',
    thrall: 'dazed and entranced: eyes glazed with a soft purple glow, blank sleepy face, a faint purple mist around her head',
  },
  bio: '화형을 갓 익힌 아기 고양이 요괴. 귀와 꼬리를 아직 집어넣지 못한다. 부모가 영수각에 잡혀갔고, 혼자 잡역 구역 처마 위에서 살며 "주운" 물건으로 생선 말린 것을 바꿔 먹는다.',
  intro: '귀와 꼬리를 숨기지 못하는 아기 고양이 요괴. "주워온" 물건으로 먹을 것을 바꾸러 온다.',
  savvy: 0.25, power: 12, eye: 1,
  traits: { greed: 0.4, integrity: 0.4, caution: 0.3, wish: 'spirit_fruit', budgetMul: 0.4 },
  start: { day: 6, node: 'meet', chance: 0.4, cond: () => ART_SET.has('chars/hua_lier') },   // 立绘装好才登场
  regular: true,
  lines: {
    first: '(카운터 옆으로 복슬복슬한 귀 두 개가 솟는다) 주인장, 여기 생선 말린 거 있어요?',
    neutral: ['주인장, 이 몸 또 왔어요.', '오늘 지붕 위는 몹시 추웠어요.'],
    warm: ['주인장, 이 몸이 문을 지켜줄게요. 나쁜 놈 오면 할퀼 거예요.', '(카운터 모퉁이에 몸을 비빈다) 여기 따뜻해요.'],
    close: ['주인장은 좋은 사람이에요. 기억할게요.', '이 몸 크면 가게를 열 거예요. 바로 옆에다 열 거예요.'],
    cold: '... 물건 하나만 사러 왔어요.',
    hostile: '(문 밖에 숨어 눈 하나만 내민다) 주인장이 이 몸을 팔았어요.',
    buy: ['{cat} 있어요? 이 몸이 오래오래 모은 영석이에요.', '{cat} 갖고 싶어요. 싸게 해주면 안 돼요?'],
    sell: '이 {item}은(는) 이 몸이 주운 거예요. {ask} 영석이랑 바꿔요... 아니, 생선 말린 것도 좋아요.',
  },
  on: {
    death: (st, p) => { adjustRep('yao', -10); log('그 작은 고양이가 죽었다. 처마 위가 비었다.', 'loss'); },
  },

  nodes: {
    // 头一回：拿一块“捡来的”玉佩换鱼干——丝绦还是新的，多半是从哪位贵人腰上摘的
    meet: {
      when: 'day',
      item: { id: 'jade_pendant', extra: { q: 72, fake: false } },
      text: () => '카운터 옆으로 복슬복슬한 귀 두 개가 솟고, 이어서 꼬질꼬질한 작은 얼굴이 나타났다. 귀도 꼬리도 숨기지 못한 아기 고양이 요괴가 까치발을 들고 옥패 하나를 카운터에 밀어 올렸다:'
        + '"주인장, 이거... 주운 거예요. 생선 말린 거 세 마리랑 바꾸면 안 돼요?"\n옥패의 비단 끈은 아직 새것이다 — 아마 어느 귀인의 허리에서 "주워온" 것이리라.',
      choices: () => [
        { label: '받고 예순 영석과 생선 말린 것 한 봉지를 준다', hint: `${costHint(60)}; 옥패는 장물이니 팔 때 조심`, req: needStones(60), run: (st, p) => {
          spend(60, '화리아의 옥패를 받았다.'); st.flags.pendant = (keepCounterItem({ stolen: 5, cost: 60, boughtDay: S.day }) || {}).uid;
          goodDeed(p, 1); remember(p, '예순 영석과 생선 말린 것 한 봉지를 주었다.', 15, 'fair');
          st.flags.fed = true;
          return { text: '그녀는 생선 말린 것을 껴안고 한참 멍하니 있다가 꼬리가 천천히 곧추섰다: "주인장... 좋은 사람이에요."', go: ['chase', [2, 4]], summary: '화리아의 옥패를 받고 박하게 굴지 않았다.' };
        } },
        { label: '생선 말린 것 세 마리만 주고 옥패를 남긴다', hint: '옥패 한 점을 거저 얻는 셈(장물); 그녀가 기억한다', req: needStones(3), run: (st, p) => {
          spend(3, '생선 말린 것 세 마리로 옥패 한 점을 바꿨다.'); st.flags.pendant = (keepCounterItem({ stolen: 5, cost: 3, boughtDay: S.day }) || {}).uid;
          remember(p, '생선 말린 것 세 마리로 그녀의 옥패를 바꿔치기했다.', -6, 'lowballed');
          st.flags.cheated = true;
          return { text: '그녀는 생선을 물고 달려가다가 문간에서 카운터 위의 옥패를 돌아보았다.', go: ['chase', [2, 4]], summary: '생선 말린 것 세 마리로 화리아의 옥패를 바꿨다.' };
        } },
        { label: '장물은 받지 않고 영과 한 움큼을 쥐여준다', hint: `${costHint(10)}; 선명 +1`, req: needStones(10), run: (st, p) => {
          spend(10, '화리아에게 영과 한 움큼을 주었다.'); goodDeed(p, 1); remember(p, '물건은 받지 않고 영과를 주었다.', 10, 'helped');
          st.flags.refused = true;
          return { text: '"싫으면 말구요." 그녀는 옥패를 도로 품에 넣고 영과를 움켜쥐더니 맞은편 처마로 휙 올라갔다.', go: ['chase', [2, 4]], summary: '화리아의 장물은 받지 않고 영과 한 움큼을 주었다.' };
        } },
      ],
    },

    // 灵兽阁上门捉野妖崽子：报信有赏，私藏论罪
    chase: {
      when: 'day',
      who: () => LIER_CATCHER,
      text: st => {
        const pend = lierPendant(st);
        return '외문 제자 하나가 철창을 들고 들어왔다. 창 바닥에는 마른 풀이 깔려 있다: "영수각에서 들요괴 새끼들을 거둔다. 이 동네에서 물건을 훔치는 작은 고양이가 있는데 귀도 꼬리도 못 숨겼다 — 본 적 있나?"\n'
          + '"알려주면 쉰 영석. 숨겨주고 잠자코 있으면 요물 은닉죄로 다스린다."'
          + (pend ? '\n그의 눈이 네 카운터 안의 옥패에서 잠시 멈췄지만 아무 말도 하지 않았다.' : '');
      },
      choices: st => [
        { label: '본 적 없다고 한다', hint: `거짓말; 들통나면 집법당 주시 +8${condText('me') ? `(${condText('me').replace(/[.]$/, '')}. 들통나기 쉽다)` : ''}`, run: () => {
          const caught = lieCaught(0.35 + (lierPendant(st) ? 0.2 : 0));
          if (caught) { addHeat(8); st.flags.suspect = true; }
          return { text: caught ? '그는 너를 한참 노려보다가 냉소했다: "그래, 본 적 없다고." 나가면서 문설주에 노란 종이 한 장을 붙였다.' : '그는 혀를 차고 빈 철창을 들고 갔다.',
            go: ['hide', 0] };
        } },
        { label: '서른 영석을 쥐여주고 딴 데서 찾아달라 한다', hint: costHint(30), req: needStones(30), run: () => {
          spend(30, '영수각 포역을 매수했다.'); st.flags.bribed = true;
          return { text: '그는 영석을 저울질했다: "이 동네는 오늘 그만둬주지."', go: ['hide', 0] };
        } },
        { label: '그녀가 늘 웅크리던 처마를 가리켜준다', hint: '+50 영석; 요족 명성 -8', sin: ['betray', 1], run: (st, p) => {
          earn(50, '영수각에 알려 쉰 영석의 상을 받았다.'); adjustRep('yao', -8);
          remember(p, '그녀가 늘 웅크리던 처마를 영수각에 일러주었다.', -100, 'betrayed');
          lifeNote(p, '영수각의 철창에 갇혔다.'); p.status = 'gone';
          return { text: '그날 저녁 맞은편 처마에서 한바탕 소란이 나더니 이어서 철창이 잠기는 소리가 났다.\n그 뒤로 카운터에 생선 말린 것을 달라는 작은 고양이는 없었다.', end: true, summary: '화리아의 거처를 영수각에 일렀다.', mood: 'pleased' };
        } },
      ],
    },

    // 当夜：她挠你的后窗
    hide: {
      when: 'night',
      cond: (st, p) => p.status === 'alive',
      mood: 'afraid',
      text: st => '한밤중, 뒷창을 살살 긁는 소리가 세 번 났다. 화리아가 창턱에 웅크리고 꼬리를 부풀리고 있다: "그들이... 옆집 대황이도 잡아갔어요. 주인장, 이 며칠만 숨어있으면 안 돼요?"'
        + (st.flags.cheated ? '\n너를 보는 눈이 살짝 피한다 — 지난번 생선 말린 것 세 마리를 기억하고 있는 것이다.' : '')
        + (st.flags.suspect ? '\n문설주에 붙은 노란 종이가 떠올랐다.' : ''),
      choices: st => [
        { label: '거둬서 카운터 밑에서 재운다', hint: `집법당 주시 +${st.flags.suspect ? 8 : 3}; 영수각이 뒤지러 올 수 있다`, run: (st, p) => {
          addHeat(st.flags.suspect ? 8 : 3); goodDeed(p, 3); remember(p, '그날 밤 창을 열어 그녀를 거뒀다.', 25, 'helped');
          st.flags.kept = true;
          return { text: '그녀는 카운터 밑으로 기어 들어가 둥글게 몸을 말더니 금세 작은 코골이를 시작했다.', go: ['raid', [2, 4]], summary: '화리아를 거뒀다.', mood: 'pleased' };
        } },
        { label: '건량과 여비를 주고 성 밖 요역으로 보낸다', hint: `${costHint(40)}; 요족 명성 +5`, req: needStones(40), run: (st, p) => {
          spend(40, '화리아의 성 밖 여비와 건량.'); adjustRep('yao', 5); goodDeed(p, 2);
          remember(p, '밤새 그녀를 성 밖으로 보냈다.', 20, 'helped'); lifeNote(p, '요역으로 돌아갔다.'); p.status = 'gone';
          return { text: '날이 밝기 전 성벽 밑 개 구멍까지 데려다주었다. 그녀는 기어나가다가 돌아보며 앞발을 흔들었다.', end: true, summary: '밤새 화리아를 성 밖으로 보냈다.', mood: 'pleased' };
        } },
        { label: '창을 닫는다', run: (st, p) => {
          remember(p, '그날 밤 창을 열지 않았다.', -15);
          return { text: '창 긁는 소리가 멈췄다. 이튿날, 처마 위는 텅 비어 있었다.', end: true, summary: '그날 밤 화리아에게 창을 열어주지 않았다.', mood: 'afraid' };
        } },
      ],
    },

    // 灵兽阁带灵犬回来搜：藏得住藏不住，看暗格、看你身上的伤（血腥味盖不住），也可以硬挡
    raid: {
      when: 'day',
      who: () => LIER_CATCHER,
      text: () => '영수각 사람들이 또 왔다. 이번에는 코를 땅에 박은 영견을 끌고 왔다: "그 작은 고양이가 네 가게로 기어들었다는 걸 본 사람이 있다. 뒤져봐도 되겠지?"\n카운터 밑에서는 아무 기척도 없었다.'
        + (condSev('me', 'injured') ? '\n영견이 네가 걸고 있는 팔 냄새를 맡더니 목구멍에서 낮게 으르렁댔다.' : ''),
      choices: () => [
        { label: '뒤지게 둔다', hint: `잘 숨었으면 대체로 무사하다${S.grids.hidden ? '(암격이 있어 더 안전)' : ''}${condSev('me', 'injured') ? '; 네 몸의 상처에서 나는 피 냄새가 개를 끌 수 있다' : ''}`, run: (st, p) => {
          if (!hideRoll(0.5)) return { text: '영견이 카운터를 세 바퀴 돌더니 재채기를 했다. 그는 욕을 하고 떠났다.', go: ['grow', [5, 8]] };
          addHeat(10); adjustRep('yao', -3);
          lifeNote(p, '영수각이 전당포에서 찾아내 끌고 갔다.'); p.status = 'gone';
          return { text: '영견이 카운터 밑으로 고개를 처박았다. 철창이 잠길 때 그녀는 울지도 않고 너만 바라보았다.\n"요물 은닉, 기록해두겠다."', end: true, summary: '영수각이 카운터 밑에서 화리아를 찾아갔다.' };
        } },
        { label: '문간을 막고 들이지 않는다', hint: `성공률 약 ${Math.round(trialOdds(34) * 100)}%(${condText('me') || '너의 상태는 아직 괜찮다'}); 못 막으면 얻어맞고 그녀도 지키지 못한다`, run: (st, p) => {
          const t = trial('me', 34);
          if (t.ok) { addHeat(6); return { text: `너는 문짝을 가로막았다: "여기는 전당포지 영수 우리가 아니다."\n그는 너를 보고, 문 밖에 몰려든 이웃들을 보고, 개를 끌고 갔다. (${partsText(t.s)})`, go: ['grow', [5, 8]] }; }
          addCond('me', 'injured', 1, '영수각 사람들을 막아섰다'); addHeat(10);
          lifeNote(p, '영수각이 전당포에서 찾아내 끌고 갔다.'); p.status = 'gone';
          return { text: `그의 손바닥이 너를 물건 칸으로 밀쳐냈다. 영견이 카운터 밑에서 작은 고양이를 끌어냈다. ${condText('me')}`, end: true, summary: '영수각 사람들을 막지 못했고 화리아는 끌려갔다.' };
        } },
        { label: '백 영석을 쥐여준다', hint: costHint(100), req: needStones(100), run: () => {
          spend(100, '영수각을 또 한 번 매수했다.');
          return { text: '그는 영석을 받고 카운터 밑을 힐끗 보더니 개를 끌고 갔다: "다음엔 꼭꼭 숨겨라."', go: ['grow', [5, 8]] };
        } },
      ],
    },

    // 风头过了：她在你铺子里扎下根来
    grow: {
      when: 'day',
      cond: (st, p) => p.status === 'alive',
      mood: 'pleased',
      text: st => '화리아가 들보에 웅크리고 귀를 파르르 떨었다: "주인장, 창고 쥐는 이 몸이 다 잡았어요." 그녀는 폴짝 뛰어내려 품에서 누렇게 바랜 종이 한 뭉치를 꺼냈다.'
        + '\n"지붕에서 주웠어요 — 이번엔 진짜로 주운 거예요!"'
        + (st.flags.cheated ? '\n"지난번 그 옥패는... 됐어요. 따지지 않을게요."' : ''),
      choices: () => [
        { label: '받고, 앞으로 여기가 네 보금자리라고 한다', hint: '보물지도 한 장을 얻는다; 그녀가 문을 지키고 소식을 전한다', run: (st, p) => {
          makeIntel('treasure'); p.informant = true; adjustRep('yao', 5); goodDeed(p, 1);
          remember(p, '앞으로 여기가 그녀의 보금자리라고 했다.', 20, 'helped');
          let tail = '그녀는 카운터 밑에 보금자리를 깔았고, 밤에 무슨 기척이 나면 달려와 네게 알려준다.';
          // 够强才有的好报：她找到了爹娘的下落，妖族记下你这份情
          if (strongEnough() && Math.random() < 0.4) {
            adjustRep('yao', 15); S.flags.foxBlessing = true;
            tail += '\n나중에 그녀는 그 종이를 따라 부모가 갇힌 곳을 찾아냈다. 요역에서 말이 전해졌다: 이 가게는 요족이 지킨다.';
          }
          lifeNote(p, '한 전당포의 카운터 밑에 보금자리를 틀었다.');
          return { text: tail, end: true, summary: '화리아가 네 가게에 남았다.' };
        } },
      ],
    },
  },
});
