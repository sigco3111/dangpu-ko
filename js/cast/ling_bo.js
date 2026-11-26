// 凌波：石盆里养了三百年的水仙花妖，自恋、爱照镜子，离了纯净的灵泉水就要谢。
// 丹房要她的花球炼驻颜丹——护她要得罪丹房，卖她丹房给个好价
'use strict';

const LINGBO_DAN = { name: '단방 집사', portrait: 'mo_senior', title: '단방 집사', faction: 'mo' };
// 铺里有没有九十九成以上的灵泉水（够她续一回命的）
const lingboWater = () => ownItem(it => it.id === 'water' && it.purity >= 99 && !it.laced);

defineCharacter({
  id: 'ling_bo', name: '능파', faction: 'yao', sex: 'f', title: '수선화 요정',
  portrait: 'ling_bo',
  // 成年女子；花妖驻颜，看上去二十出头。清冷、自赏，衣着雅致
  art: 'a narcissus flower spirit, an adult woman who looks about 22: a cool, delicate, strikingly beautiful face with porcelain skin, pale jade-green eyes, '
    + 'long straight silver-white hair adorned with small white narcissus blossoms with golden cups, a layered white and pale-gold silk dress with long flowing water-like sleeves, '
    + 'a pale green sash, holding a small bronze hand mirror and glancing at it, a slight proud self-admiring air, elegant and graceful',
  bio: '돌 화분에서 삼백 년을 자란 수선화 요정. 화형하고도 물을 떠나지 못한다. 자기 모습을 몹시 아껴 거울을 손에서 놓지 않는다. 영천수가 맑지 않으면 그녀의 꽃이 시든다.',
  intro: '동경을 맡기러 와서 맑은 물 몇 병만 바라는 수선화 요정.',
  savvy: 0.6, power: 22, eye: 2,
  traits: { greed: 0.3, integrity: 0.6, caution: 0.5, wish: 'zhuyan_dan', budgetMul: 1.1 },
  start: { day: 8, node: 'mirror', chance: 0.4, cond: () => ART_SET.has('chars/ling_bo') },   // 立绘装好才登场
  regular: true,
  lines: {
    first: '(카운터의 동경에 먼저 자신을 비춰본 뒤에야 너를 본다) 이 가게는 이 몸의 모습을 비출 만하군요.',
    neutral: ['주인장, 좋은 물 있어요?', '(카운터 면에 비춰 구레나룻의 꽃을 다듬는다) 오늘도 폐를 끼치러 왔어요.'],
    warm: ['여기 물이 이 몸이 마셔본 것 중 제일 맑아요.', '주인장은 거울보다 이 몸을 잘 알아요.'],
    close: ['이 몸의 꽃은 절반은 당신이 물을 줘 살린 거예요.', '앞으로 이 가게에 두는 수선화는 이 몸이 제일 곱게 피워줄게요.'],
    cold: '물 사러 왔어요. 다른 얘기는 말고요.',
    hostile: '(거울조차 보지 않는다) 당신이 이 몸의 꽃구근을 팔았어요.',
    buy: ['{cat} 있어요? 제일 맑은 걸로요.', '{cat} 주세요 — 맑지 않으면 싫어요.'],
    sell: '이 {item}, {ask} 영석이에요. 삼백 년을 비춰본 거예요.',
  },
  on: {
    // 卖给她纯水，算帮她续命
    sold: (st, p, it) => { if (it.id === 'water' && it.purity >= 99) st.flags.watered = (st.flags.watered || 0) + 1; },
    death: () => { log('돌 화분의 수선화가 시들어 다시는 피지 않았다.', 'loss'); },
  },

  nodes: {
    // 头一回：抱着照了三百年的铜镜来典当，只为换纯水
    mirror: {
      when: 'day',
      item: { id: 'bronze_mirror', extra: { q: 78, fake: false } },
      text: () => '흰옷의 여자가 들어왔다. 구레나룻에 금잔 흰 꽃잎의 수선화를 꽂고, 먼저 카운터의 동경에 자신을 비춰본 뒤에야 품에서 옛 거울 하나를 꺼내 올렸다:'
        + '"삼백 년을 비춰온 거라 아까워요 — 하지만 이 몸의 꽃이 시들어가요. 주인장, 아흔아홉 할 이상의 영천수와 바꿔줘요. 거울은 가져요."'
        + (lingboWater() ? '' : '\n(지금 네 가게에는 그만큼 맑은 물이 없다.)'),
      choices: () => {
        const w = lingboWater();
        return [
          ...(w ? [{ label: `${itemName(w)}(으)로 그녀의 동경과 바꾼다`, hint: `좋은 물 하나를 잃고 옛 거울을 얻는다; 그녀가 고마움을 기억한다`, run: (st, p) => {
            takeItem(w); keepCounterItem({ cost: 0, boughtDay: S.day }); goodDeed(p, 1);
            remember(p, '맑은 물 하나로 그녀의 동경과 바꿨고 그녀의 꽃이 되살아났다.', 18, 'fair'); st.flags.watered = 1;
            return { text: '그녀는 물병을 받쳐 들고 손끝으로 병을 한 바퀴 쓸자 구레나룻의 꽃이 조금씩 펼쳐졌다: "거울은 당신 거예요. 잘 비춰줘요."', go: ['dan', [3, 5]], summary: '맑은 물로 능파의 동경과 바꿨다.', mood: 'pleased' };
          } }] : []),
          { label: '동경을 받고 딴 데서 물 사라고 삼백 영석을 준다', hint: costHint(300), req: needStones(300), run: (st, p) => {
            spend(300, '능파의 청동 옛 거울을 받았다.'); keepCounterItem({ cost: 300, boughtDay: S.day });
            remember(p, '그녀의 동경을 받고 삼백 영석을 주었다.', 6, 'fair');
            return { text: '"영석이라..." 그녀는 영석을 소매에 쓸어 담고 동경을 한 번 더 돌아보았다. "그것도 좋아요."', go: ['dan', [3, 5]], summary: '능파의 동경을 받았다.' };
          } },
          { label: '거울은 간직하고 물은 외상으로 준다', hint: '물건은 받지 않는다; 나중에 그녀가 갚는다', run: (st, p) => {
            goodDeed(p, 2); remember(p, '거울은 받지 않고 먼저 물을 사게 했다.', 12, 'helped'); st.flags.owes = true;
            return { text: '그녀는 잠시 멈칫하더니 거울을 다시 품에 안았다: "기억해둘게요. 삼백 년 만에 처음으로 이 거울을 탐내지 않는 사람이네요."', go: ['dan', [3, 5]] };
          } },
        ];
      },
    },

    // 丹房执事上门：要一株三百年的水仙花球炼驻颜丹
    dan: {
      when: 'day',
      who: () => LINGBO_DAN,
      text: () => '단방 집사 하나가 휘장을 걷고 들어왔다. 소매에 약찌꺼기가 묻어 있다: "단방에 삼백 년 묵은 수선화 꽃구근이 필요하다. 주안단의 주재료다. 잡역 구역에 정령이 된 것이 있다던데 — 어디 있는지 아는가?"'
        + '\n"알려주면 단방이 이백을 내리겠다. 감춰주면 단방과의 장사는 앞으로 꿈도 꾸지 마라."',
      choices: () => [
        { label: '모른다고 한다', hint: `거짓말; 들통나면 단방 호감 -10${condText('me') ? `(${condText('me').replace(/[.]$/, '')}. 들통나기 쉽다)` : ''}`, run: st => {
          if (lieCaught(0.4)) { shiftSt('dan', -10); st.flags.suspect = true; return { text: '집사가 너를 한참 보았다: "그래. 단방이 기억하지."', go: ['night', [1, 2]], mood: 'angry' }; }
          return { text: '집사는 응, 하고 떠났다.', go: ['night', [1, 2]] };
        } },
        { label: '진작 성을 나갔다고 한다', hint: '50 영석을 써서 확답을 산다', req: needStones(50), run: () => {
          spend(50, '단방 집사를 매수했다.');
          return { text: '집사는 영석을 저울질했다: "성을 나갔다고? 그럼 됐다."', go: ['night', [1, 2]] };
        } },
        { label: '그녀가 늘 그림자를 비추는 우물을 일러바친다', hint: '+200 영석; 단방 호감 +10; 요족 명성 -8', sin: ['betray', 2], run: (st, p) => {
          earn(200, '능파의 거처를 단방에 팔았다.'); shiftSt('dan', 10); adjustRep('yao', -8);
          remember(p, '그녀가 늘 가는 우물을 단방에 일렀다.', -100, 'betrayed');
          lifeNote(p, '꽃구근을 단방에 파내어 주안단이 되었다.'); p.status = 'gone';
          return { text: '사흘 뒤 단방에서 주안단 한 가마가 나왔는데 향기가 반 거리에 퍼졌다.\n우물가에는 비춰주는 이 없는 물만 남았다.', end: true, summary: '능파를 단방에 팔았다.', mood: 'pleased' };
        } },
      ],
    },

    // 当夜：她要把花球寄在你铺里
    night: {
      when: 'night',
      cond: (st, p) => p.status === 'alive',
      mood: 'afraid',
      text: st => '밤, 능파가 물을 담은 돌 화분을 안고 문을 두드렸다. 화분에는 새하얀 꽃구근이 놓여 있다: "단방 사람들이 이틀째 우물가를 맴돌아요. 뿌리를 여기 맡길게요 — 몸은 없어도 뿌리가 있으면 이 몸은 죽지 않아요."'
        + (st.flags.suspect ? '\n단방 집사의 "단방이 기억하지"라는 말이 떠올랐다.' : ''),
      choices: st => [
        { label: '돌 화분을 숨긴다', hint: `집사가 의심하면 뒤지러 온다${S.grids.hidden ? '(암격이 있어 더 안전)' : ''}`, run: (st, p) => {
          goodDeed(p, 2); remember(p, '그녀의 꽃구근을 숨겨주었다.', 20, 'helped');
          if (st.flags.suspect && hideRoll(0.5)) {
            shiftSt('dan', -8); addHeat(5); addCond(p, 'injured', 2, '꽃구근을 파냈다');
            return { text: '날이 밝기 전 단방 사람들이 뒷문을 걷어차고 카운터 밑에서 돌 화분을 가져갔다.\n능파는 다시 오지 않았다. 나중에 들으니 성 밖 강가에 뿌리내렸는데 꽃이 아주 작게 핀다더군.', end: true, summary: '단방이 네 가게에서 능파의 꽃구근을 찾아갔다.' };
          }
          return { text: '돌 화분을 창고 가장 안쪽에 밀어넣었다. 한밤중, 화분에서 여린 초록 싹이 돋았다.', go: ['bloom', [5, 8]], summary: '능파의 꽃구근을 숨겨주었다.', mood: 'pleased' };
        } },
        { label: '성을 나가라 하고 길에 마실 좋은 물 한 병을 준다', hint: `${lingboWater() ? '맑은 물 하나를 잃는다' : costHint(60)}; 요족 명성 +5`, req: () => !!lingboWater() || S.stones >= 60 || '맑은 물도 없고 60 영석도 마련할 수 없다', run: (st, p) => {
          const w = lingboWater(); if (w) takeItem(w); else spend(60, '능파에게 길에 마실 물을 사주었다.');
          adjustRep('yao', 5); goodDeed(p, 2); remember(p, '그녀를 성 밖으로 보내며 좋은 물 한 병을 주었다.', 18, 'helped');
          lifeNote(p, '성을 나가 남쪽 호수로 갔다.'); p.status = 'gone';
          return { text: '그녀는 돌 화분을 안고 어둠 속으로 들어가며 돌아보았다: "남쪽에 호수가 있어요. 거기서 꽃 피울게요. 오면 비춰줄게요."', end: true, summary: '능파를 성 밖으로 보냈다.' };
        } },
        { label: '단방과 척지기 싫다', run: (st, p) => {
          remember(p, '그날 밤 그녀의 꽃구근을 받지 않았다.', -12);
          return { text: '그녀는 돌 화분을 안은 채 오래 서 있다가 떠났다.', end: true, summary: '그날 밤 능파의 꽃구근을 받지 않았다.' };
        } },
      ],
    },

    // 风头过去：花开了，她来还情
    bloom: {
      when: 'day',
      cond: (st, p) => p.status === 'alive',
      mood: 'pleased',
      text: st => '능파가 왔다. 구레나룻의 수선화가 어느 때보다 활짝 폈다. 그녀는 새로 간 동경을 카운터에 올리고 자신을 비춰본 뒤에야 돌아섰다:'
        + '"뿌리가 다 자랐어요. 이건 이 몸의 사례예요 — 꽃이슬 두 병이에요. 단로에 넣으면 주안단이 한 가마에 두 알 나오고, 주화입마에 빠졌을 때 한 모금 마시면 가라앉아요."'
        + (st.flags.owes ? '\n"지난번 외상 물값도 여기 함께 쳐줘요."' : ''),
      choices: () => [
        { label: '받는다', hint: '수선화 이슬 두 병과 경장옥로 하나를 얻는다; 그녀가 단방의 동정을 봐준다', run: (st, p) => {
          giveItem('narcissus_dew', { q: 92 }); giveItem('narcissus_dew', { q: 92 }); giveItem('water', { purity: 99.95, q: 90 }); p.informant = true; adjustRep('yao', 5);
          remember(p, '그녀의 사례를 받았다.', 10);
          let tail = '그녀는 떠나기 전 네 물독에 꽃이슬 한 방울을 떨어뜨렸다. 이튿날 독의 물이 사람 그림자가 비칠 만큼 맑아졌다.';
          // 够强才有：她带来丹房的独门方子
          if (strongEnough() && Math.random() < 0.35) {
            makeIntel('clique', { cid: 'dan' });
            tail += '\n그녀는 종이 한 장도 남겼다: "단방의 그 주안단 가마의 속사정 — 이 몸의 동족이 대신 기억해주고 있어요."';
          }
          lifeNote(p, '꽃이 피었고 가게에 들러 거울을 보곤 한다.');
          return { text: tail, end: true, summary: '능파의 꽃이 피었고 그녀는 네 가게에 자주 온다.' };
        } },
      ],
    },
  },
});
