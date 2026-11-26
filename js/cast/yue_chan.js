// 月婵：醉月楼的头牌舞姬，修了三百年的玉兔，被一位长老亲眷包下，满头金钗却出不得楼门。
// 她偷偷变卖贵人的赏赐攒赎身钱——帮她要得罪少宗主一系，卖她能讨那位公子的欢心
'use strict';

const CHAN_PATRON = { name: '모용 공자', portrait: 'noble', title: '장로 일가', faction: 'mo' };

defineCharacter({
  id: 'yue_chan', name: '월선', faction: 'yao', sex: 'f', title: '토끼 요괴 무희',
  portrait: 'yue_chan',
  // 成年女子；兔族驻颜有术，看上去二十出头。勾人，但雅致不露骨
  art: 'an alluring rabbit-spirit dancer, an adult woman who looks about 22: long upright white rabbit ears with soft pink inner fur, ruby-red eyes, '
    + 'flawless luminous porcelain skin, red lips, a small beauty mark at the corner of her mouth, long glossy black hair in a loose elaborate updo '
    + 'with gold hairpins and a crescent-moon ornament, a graceful curvy figure, a layered sheer white and moon-silver silk dancer dress with pink trim, '
    + 'worn off the shoulders, long flowing sleeves, a side slit in the skirt, a small fluffy white tail, holding a round silk fan near her chin, '
    + 'a playful flirtatious stance, elegant and tasteful, not explicit',
  bio: '잡역 구역 취월루의 으뜸 무희, 삼백 년을 닦은 옥토끼다. 얼굴에서 세월을 찾을 수 없다 — 토끼족은 주안에 아낌없이 쓴다. 장로 일가에게 묶여 금비녀와 옥패를 한가득 얹고도 루 문턱을 넘지 못한다.',
  intro: '귀인에게 받은 옷을 현금으로 바꾸러 오는 토끼 요괴 무희.',
  savvy: 0.7, power: 30, eye: 2,
  traits: { greed: 0.6, integrity: 0.35, caution: 0.6, wish: 'zhuyan_dan', budgetMul: 1.4 },
  start: { day: 10, node: 'robe', chance: 0.4, cond: () => ART_SET.has('chars/yue_chan') },   // 立绘装好才登场
  regular: true,
  lines: {
    first: '(부채로 얼굴 반을 가리고 붉은 눈이 부채 가장자리 너머로 너를 훑는다) 작은 주인장, 이 가게가 루보다 조용하군요.',
    neutral: ['주인장, 또 폐를 끼치러 왔어요.', '(부채를 카운터에 탁 놓는다) 오늘은 새로운 거 없어요?'],
    warm: ['주인장, 루의 언니들이 당신을 성실한 사람이라 하더군요.', '(눈을 깜빡인다) 이 몸을 위해 좋은 물건 남겨둔 거 없어요?'],
    close: ['이 거리에서 이 몸이 믿는 건 당신 하나뿐이에요.', '주인장, 앞으로 누가 당신을 괴롭히면 이 몸에게 말해요.'],
    cold: '물건 사러 왔어요. 다른 얘기는 안 해요.',
    hostile: '(부채가 얼굴을 가린다) 당신이 이 몸을 한 번 팔았지요. 선명하게 기억해요.',
    buy: ['{cat} 있어요? 제일 좋은 걸로요.', '{cat} 좀 주세요. 값은 문제없어요 — 이 몸이 샀다는 건 비밀로 해줘요.'],
    sell: '이 {item}, {ask} 영석이에요. 누가 준 건지는 묻지 말아요.',
  },
  on: {
    // 在你这儿按平价买到驻颜丹，也算帮了她一把
    sold: (st, p, it, price) => { if (it.id === 'zhuyan_dan' && price <= knownValue(it) * priceMul(it.id)) st.flags.kind = (st.flags.kind || 0) + 1; },
    death: (st, p) => { log('취월루의 으뜸이 바뀌었다. 월선이 어디로 갔는지 아는 이가 없다.', 'loss'); },
  },

  nodes: {
    // 头一回：拿贵人赏的云锦法衣来换现钱，不许多问
    robe: {
      when: 'day',
      item: { id: 'cloud_robe', extra: { q: 80 } },
      text: () => '한 여자가 부채를 흔들며 들어왔다. 새하얀 토끼 귀 한 쌍이 머리얹음 사이로 솟았고 치맛자락이 걸을 때마다 일렁였다. 그녀는 운금 법의를 카운터에 펼쳤다:'
        + '"모용 공자가 내린 것이에요. 이 몸이 딱 한 번 입었어요. 주인장, 받아줄래요? 값은 맞춰드려요 — 다만 어디서 왔는지는 묻지 말고, 이 몸이 팔았다는 것도 비밀로 해줘요."',
      choices: () => {
        const it = customerItem(), full = it ? Math.round(knownValue(it) * priceMul(it.id)) : 700;
        const fair = Math.round(full * 0.7), low = Math.round(full * 0.4);
        return [
          { label: `7할 값에 받고 비밀로 해준다(${fair} 영석)`, hint: costHint(fair), req: needStones(fair), run: (st, p) => {
            spend(fair, '월선의 운금 법의를 받았다.'); st.flags.robe = (keepCounterItem({ cost: fair, boughtDay: S.day }) || {}).uid;
            remember(p, '7할 값에 법의를 받고 아무것도 묻지 않았다.', 15, 'fair');
            return { text: '그녀는 영석을 소매에 넣고 부채로 네 손등을 살짝 찍었다: "주인장은 사정을 아는 분이군요."', go: ['patron', [3, 5]], summary: '월선의 운금 법의를 처분해주었다.', mood: 'pleased' };
          } },
          { label: `4할로 깎아 받고(${low} 영석) 뭐가 급한지 묻는다`, hint: `${costHint(low)}; 그녀가 사정을 말하지만 값을 깎은 것을 기억한다`, req: needStones(low), run: (st, p) => {
            spend(low, '월선의 운금 법의를 깎아 받았다.'); st.flags.robe = (keepCounterItem({ cost: low, boughtDay: S.day }) || {}).uid;
            remember(p, '급한 틈을 타 법의를 4할로 깎았다.', -6, 'lowballed'); st.flags.asked = true;
            return { text: '웃음이 옅어졌지만 그녀는 영석을 받았다: "뭐가 급하냐고요? 속량값을 모으는 중이에요. 새장이 아무리 금으로 칠해져도 새장은 새장이죠."', go: ['patron', [3, 5]], summary: '월선의 법의를 깎아 받았고 속량값을 모으는 중임을 알았다.' };
          } },
          { label: '받지 않고 그 공자를 건드리지 말라고 타이른다', hint: '이 일에 끼지 않는다', run: (st, p) => {
            remember(p, '모용 공자를 건드리지 말라고 타이렀다.', 3); st.flags.refused = true;
            return { text: '"이 몸을 타이르는 사람은 많았어요." 그녀는 법의를 팔에 걸쳤다. "이 몸에게서 뭘 바라지 않는 사람은 당신이 처음이에요."', go: ['patron', [3, 5]] };
          } },
        ];
      },
    },

    // 包她的公子找上门：问她卖了什么、说了什么
    patron: {
      when: 'day',
      who: () => CHAN_PATRON,
      text: st => {
        const robe = st.flags.robe && S.items[st.flags.robe] && HELD(S.items[st.flags.robe]);
        return '비단옷의 공자가 부채를 흔들며 들어왔고 뒤에 하인 둘이 따랐다: "취월루의 월선이 여기 들렀다며? 뭘 팔았고, 얼마를 받았고, 무슨 말을 했는지 — 낱낱이 본 공자에게 말해라."'
          + (robe ? '\n그의 부채가 공중에 멈췄다: "저 운금은 본 공자가 아는 물건이군."' : '');
      },
      choices: st => {
        const robe = st.flags.robe && S.items[st.flags.robe] && HELD(S.items[st.flags.robe]) ? S.items[st.flags.robe] : null;
        return [
          { label: '아무것도 못 봤다고 한다', hint: `거짓말; 들통나면 소종주 일파 호감 -8, 주시 +5${robe ? ', 법의를 뺏긴다' : ''}${condText('me') ? `(${condText('me').replace(/[.]$/, '')}. 들통나기 쉽다)` : ''}`, run: () => {
            if (lieCaught(robe ? 0.6 : 0.3)) {
              shiftSt('heir', -8); addHeat(5); if (robe) takeItem(robe);
              st.flags.covered = true;
              return { text: `그가 냉소하며 부채로 카운터를 탁 쳤다: "입 하나는 잘 놀리는군."${robe ? ' 하인이 그 운금을 네 카운터에서 끄집어냈다.' : ''}`, go: ['night', [1, 2]], mood: 'angry' };
            }
            st.flags.covered = true;
            return { text: '그는 너를 한참 노려보다가 콧방귀를 뀌고 부채를 흔들며 떠났다.', go: ['night', [1, 2]] };
          } },
          ...(robe ? [{ label: '법의를 돌려주고 사실대로 말한다', hint: '법의를 잃고 100 영석을 받는다; 소종주 일파 호감 +6; 그녀가 알게 된다', run: (st, p) => {
            takeItem(robe); earn(100, '모용 공자가 내린 입 막는 돈.'); shiftSt('heir', 6);
            remember(p, '그녀가 판 법의를 모용 공자에게 넘겼다.', -30, 'betrayed'); st.flags.told = true;
            return { text: '그는 법의를 하인 팔에 얹고 영석 한 자루를 내던졌다: "세태를 아는군."', go: ['night', [1, 2]], mood: 'pleased' };
          } }] : []),
          { label: '그녀가 속량값을 모아 달아나려 한다고 일러바친다', hint: '+200 영석; 소종주 일파 호감 +10', sin: ['betray', 2], run: (st, p) => {
            earn(200, '월선의 속셈을 모용 공자에게 팔았다.'); shiftSt('heir', 10);
            remember(p, '그녀가 속량값을 모은다는 것을 모용 공자에게 일렀다.', -100, 'betrayed');
            addCond(p, 'injured', 2, '모용 공자의 하인들에게 두들겨 맞았다'); lifeNote(p, '취월루 뒤채에 갇혀 손님을 만나지 못하게 됐다.'); p.status = 'gone';
            return { text: '그의 부채가 탁 접혔다: "삼백 년 묵은 토끼가 본 공자의 손바닥을 벗어나겠다고?"\n사흘 뒤, 취월루의 으뜸이 바뀌었다.', end: true, summary: '월선의 도주 계획을 모용 공자에게 팔았다.', mood: 'pleased' };
          } },
        ];
      },
    },

    // 当夜：她拿那位公子的把柄来换赎身钱
    night: {
      when: 'night',
      cond: (st, p) => p.status === 'alive',
      text: st => '파장 후, 누군가 문짝을 살짝 세 번 두드렸다. 월선이 눈에 띄지 않는 회색 망토를 걸치고 토끼 귀를 두건 속에 눌러 담고 있었다:'
        + (st.flags.told ? '"당신이 이 몸을 반쯤 팔았는데도 왔어요 — 이 거리에서 불 켠 가게는 당신뿐이니까요."' : '"주인장, 그 공자가 다녀갔지요? 고마워요."')
        + '\n"속량에는 삼백 영석이 드는데 이 몸에게는 이것밖에 모자라요." 그녀는 소매에서 종이 한 뭉치를 꺼냈다. "모용가의 지저분한 장부예요 — 종문에서 그를 곤혹스럽게 하기엔 족해요. 돈을 빌려주면 이건 당신 거예요. 안 빌려줘도 이건 당신에게 팔 수 있어요."',
      choices: () => [
        { label: '속량하도록 삼백 영석을 빌려준다', hint: `${costHint(300)}; 나중에 원금과 이자를 갚기로 했다`, req: needStones(300), run: (st, p) => {
          spend(300, '월선에게 속량비 삼백 영석을 빌려주었다.'); goodDeed(p, 3); makeIntel('clique', { cid: 'heir' });
          remember(p, '속량하도록 삼백 영석을 빌려주었다.', 30, 'helped'); st.flags.freed = true;
          lifeNote(p, '속량하여 취월루를 나왔다.');
          return { text: '그녀는 종이 뭉치를 네 손에 쥐여주었고 두건 속 토끼 귀가 떨렸다: "삼백 년 만에 처음으로, 이 얼굴이 아니라 이 몸의 장부를 보는 사람을 만났어요."', go: ['after', [5, 8]], summary: '돈을 빌려 월선이 속량하게 했다.', mood: 'pleased' };
        } },
        { label: '그 지저분한 장부만 산다(150 영석)', hint: `${costHint(150)}; 파벌 내막 한 장을 얻고 그녀는 루에 남는다`, req: needStones(150), run: (st, p) => {
          spend(150, '월선이 가진 모용가의 지저분한 장부를 샀다.'); makeIntel('clique', { cid: 'heir' });
          remember(p, '그녀의 장부를 샀지만 돈은 빌려주지 않았다.', 2);
          return { text: '그녀는 종이를 건네며 손끝을 네 손바닥에 잠시 멈췄다: "그것도 좋아요. 장사는 장사니까."', end: true, summary: '월선의 내막을 샀고 그녀는 취월루에 남았다.' };
        } },
        { label: '이 흙탕물은 건너지 않는다', hint: '이 일에 끼지 않는다', run: (st, p) => {
          remember(p, '그날 밤 문을 열지 않았다.', -8);
          return { text: '문 두드리는 소리가 멈췄다. 발소리가 골목 깊은 곳으로 멀어졌다.', end: true, summary: '그날 밤 월선에게 문을 열어주지 않았다.' };
        } },
      ],
    },

    // 赎身之后：她回来还钱，也带来了生意
    after: {
      when: 'day',
      cond: (st, p) => p.status === 'alive',
      mood: 'pleased',
      text: () => '월선이 수수한 옷으로 갈아입고 머리에는 나무비녀 하나만 남았지만 토끼 귀는 예전보다 씩씩하게 솟아 있었다. 그녀는 영석 한 자루를 카운터에 올렸다:'
        + '"삼백, 그리고 이자 백을 더했어요. 이 몸은 남가에 찻집 자리를 펴기로 했어요 — 루의 언니들과 귀한 손님들의 뒷말은 앞으로 전부 여기로 가져올게요."',
      choices: () => [
        { label: '받는다', hint: '+400 영석; 그녀가 너의 귀와 눈이 된다', run: (st, p) => {
          earn(400, '월선이 삼백 영석에 이자 백을 얹어 갚았다.'); p.informant = true;
          remember(p, '그녀의 이자를 받았고 그 뒤로 그녀가 소식을 물어다준다.', 10);
          let tail = '그녀는 인족의 예를 올리고 부채를 한 번 흔들더니 떠났다.';
          // 够强才有的好报：她当年的老主顾里，有人管着铺契
          if (strongEnough() && Math.random() < 0.35) {
            S.flags.deedMul *= 0.9;
            tail += '\n보름 뒤 관리가 너를 보고 깍듯이 가게 문서 값은 다시 얘기할 수 있다고 했다 — 남가 찻집에 자주 드나드는 어느 나리가 한마디 했다더군.';
          }
          return { text: tail, end: true, summary: '월선이 속량하여 남가에 찻집을 차리고 너를 위해 소식을 물어다준다.' };
        } },
        { label: '이자는 받지 않는다', hint: '+300 영석; 선명 +2; 더 깊은 인연', run: (st, p) => {
          earn(300, '월선이 삼백 영석을 갚았다.'); goodDeed(p, 2); p.informant = true;
          remember(p, '그녀의 이자를 면해주었다.', 20, 'helped');
          return { text: '그녀는 멈칫하더니 부채로 얼굴 반을 가렸다. 드러난 붉은 눈이 휘어졌다: "주인장, 당신 같은 사람은 이 거리에서 오래 못 살아요. 이 몸이 지켜봐줄게요."', end: true, summary: '월선이 속량했고 너는 이자를 면해주었다.' };
        } },
      ],
    },
  },
});
