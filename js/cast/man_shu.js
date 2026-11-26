// 曼殊：乱葬岗边上长了五百年的曼陀罗花妖。她的花粉是迷魂花的祖宗，执法堂按魔宗禁药缉她；
// 她拿花粉换安身的地方——收了来钱快，被搜出来是重罪；举报她，执法堂记你一功
'use strict';

const MANSHU_LAW = { name: '집법당 순찰', portrait: 'mo_enforcer', title: '집법당', faction: 'mo' };

defineCharacter({
  id: 'man_shu', name: '만수', faction: 'yao', sex: 'f', title: '만다라화 요정',
  portrait: 'man_shu',
  // 成年女子；花妖驻颜，看上去二十出头。妖冶、危险，雅致不露骨
  art: 'a datura flower spirit, an adult woman who looks about 23: a strikingly beautiful bewitching face with pale skin, heavy-lidded violet eyes with dark purple eyeliner, '
    + 'dark plum lips, long black hair loosely braided with large trumpet-shaped white and deep-violet datura flowers, a layered deep violet and black silk gown '
    + 'with trailing sleeves embroidered with datura blossoms, worn off one shoulder, a faint shimmer of pale golden pollen in the air near her fingertips, '
    + 'a languid, dangerous, mysterious smile, elegant and tasteful, not explicit',
  bio: '난장판 곁에서 오백 년을 자란 만다라화. 화형한 뒤 잡역 구역을 떠돈다. 꽃가루를 한 번 맡으면 구름 위를 걷는 듯하고, 몇 번 더 맡으면 깨어나지 못한다 — 집법당이 마종 금약으로 그녀를 쫓는다.',
  intro: '꽃가루 한 단지를 들고 몸 숨길 곳을 구하러 온 만다라화 요정.',
  savvy: 0.75, power: 34, eye: 2,
  traits: { greed: 0.5, integrity: 0.3, caution: 0.7, wish: 'incense', budgetMul: 1.2 },
  start: { day: 12, node: 'pollen', chance: 0.4, cond: () => ART_SET.has('chars/man_shu') },   // 立绘装好才登场
  regular: true,
  lines: {
    first: '(그녀가 들어서자 가게에 진득하게 단 향기가 퍼진다) 주인장, 이 가게에서는... 맛있는 배포 냄새가 나요.',
    neutral: ['주인장, 또 만났네요.', '(카운터에 기대선다. 머리의 꽃잎이 오므라들었다 폈다 한다) 오늘은 뭘 받아요?'],
    warm: ['주인장은 이 향기를 맡아도 이 몸이 두렵지 않나 봐요.', '이 거리에서 이 몸이 편히 잘 수 있는 곳은 여기뿐이에요.'],
    close: ['누가 당신과 맞서면 말해요. 그의 꿈에 가서 좀 놀다 올게요.', '오백 년 만에, 이 몸을 두려워하지 않는 첫 사람이에요.'],
    cold: '장사만 해요. 다른 얘기는 말고요.',
    hostile: '(그녀의 향기가 순간 차가워진다) 당신이 이 몸을 집법당에 팔았어요.',
    buy: ['{cat} 있어요? 독한 걸로요.', '{cat} 갖고 싶어요. 어디에 쓰는지는 묻지 말아요.'],
    sell: '이 {item}, {ask} 영석이에요. 맡아보고 놀라지는 말아요.',
  },
  on: {
    death: () => { log('난장판 곁의 만다라화가 하룻밤 사이에 전부 말라 죽었다.', 'loss'); },
  },

  nodes: {
    // 头一回：一罐花粉换一个藏身处
    pollen: {
      when: 'day',
      text: () => '검은 옷의 여자가 문가에 기대 서 있다. 머리에는 나팔 모양의 자주빛 흰 꽃이 꽂혀 있다. 그녀는 작은 질그릇 단지를 카운터에 올렸고, 단지 입구에서 금가루가 새어 나와 단향이 확 끼쳐 머리가 어질했다:'
        + '"만다라화 꽃가루예요. 이 몸의 것이죠. 술이나 단약에 섞으면 밤새 잠들고 꿈속에서 묻는 말에 다 대답해요 — 누가 어떤 정체를 숨기고 있는지, 물으면 금방 알아요."'
        + '\n"영석은 필요 없어요. 집법당이 이 몸을 쫓고 있으니, 창고를 며칠 빌려 숨게 해줘요. 이 단지는 당신 거예요."',
      choices: () => [
        { label: '받고 창고 뒤편에 숨겨준다', hint: '만다라화 꽃가루 세 단지를 얻는다(금약); 집법당 주시 +5; 그녀가 발각되면 너는 은닉죄', run: (st, p) => {
          for (let i = 0; i < 3; i++) giveItem('datura_pollen', { q: 85 });
          addHeat(5); remember(p, '그녀를 네 창고에 숨겨주었다.', 20, 'helped'); st.flags.hid = true;
          return { text: '그녀는 눈을 깜빡이고 창고 뒤편으로 기어들었다. 그 단향이 가게 안을 하루 종일 맴돌았다.', go: ['raid', [2, 4]], summary: '만수를 거두고 그녀의 꽃가루를 받았다.', mood: 'pleased' };
        } },
        { label: '꽃가루만 받고 사람은 두지 않는다(80 영석)', hint: `${costHint(80)}; 만다라화 꽃가루 두 단지를 얻는다(금약); 그녀가 알아서 숨는다`, req: needStones(80), run: (st, p) => {
          spend(80, '만수의 꽃가루 두 단지를 받았다.'); for (let i = 0; i < 2; i++) giveItem('datura_pollen', { q: 80 });
          remember(p, '그녀의 꽃가루를 샀지만 거두지는 않았다.', 2);
          return { text: '"그것도 장사네요." 그녀는 영석을 소매에 넣고 떠났고 향기는 오래 남았다.', go: ['raid', [2, 4]], summary: '만수의 꽃가루를 샀다.' };
        } },
        { label: '이런 건 손대지 않는다', hint: '이 일에 끼지 않는다', run: (st, p) => {
          remember(p, '그녀의 꽃가루에 손대지 않았다.', -4); st.flags.refused = true;
          return { text: '"배포가 생각만큼은 아니네요." 그녀는 단지를 거두며 빙긋 웃었다.', go: ['raid', [2, 4]] };
        } },
      ],
    },

    // 执法堂上门缉毒
    raid: {
      when: 'day',
      who: () => MANSHU_LAW,
      text: st => '집법당 순찰이 들어와 코를 킁킁거렸다: "향이 좋군." 그는 초상화 한 장을 카운터에 탁 내려놓았다. 그림은 바로 그 검은 옷의 여자였다: "만다라화 요정. 금약을 몰래 판다. 본 적 있나?"'
        + (st.flags.hid ? '\n창고 뒤편은 고요했지만 그 단향이 아직 다 가시지 않았다.' : ''),
      choices: st => [
        ...(st.flags.hid ? [{ label: '가게에 피운 건 안신향이라고 한다', hint: `거짓말; 향기가 약점이다${condText('me') ? `(${condText('me').replace(/[.]$/, '')}. 들통나기 쉽다)` : ''}; 들키면 집법당 주시 +15, 그녀는 끌려간다`, run: (st, p) => {
          if (lieCaught(0.45)) {
            addHeat(15); shiftSt('law', -8);
            lifeNote(p, '한 전당포 창고에서 집법당에 찾아내 끌려갔다.'); p.status = 'jailed';
            return { text: '순찰이 냉소하며 곧장 창고로 들어갔다. 나올 때 쇠사슬에는 검은 옷의 여자가 묶여 있었고 그녀는 너를 돌아보았다.\n"금약 은닉, 기록해두겠다."', end: true, summary: '집법당이 네 창고에서 만수를 찾아갔다.' };
          }
          return { text: '순찰이 코를 다시 킁킁거리더니 아무 말 없이 갔다.', go: ['debt', [3, 5]] };
        } }] : [{ label: '본 적 없다', hint: '사실대로 말한다', run: () => ({ text: '순찰은 초상화를 거두고 갔다.', go: ['debt', [3, 5]] }) }]),
        { label: '백오십 영석을 쥐여준다', hint: costHint(150), req: needStones(150), run: () => {
          spend(150, '집법당 순찰을 매수했다.');
          return { text: '그는 영석을 저울질하고 초상화를 접어 품에 넣었다: "이 동네는 뒤졌다."', go: ['debt', [3, 5]] };
        } },
        { label: st.flags.hid ? '창고를 가리킨다' : '그녀가 늘 난장판 곁에 나타난다고 일러바친다', hint: '+180 영석 포상; 집법당 호감 +10; 주시 -10; 요족 명성 -6', sin: ['betray', 2], run: (st, p) => {
          earn(180, '만수를 신고해 집법당 포상을 받았다.'); shiftSt('law', 10); addHeat(-10); adjustRep('yao', -6);
          remember(p, '그녀를 집법당에 넘겼다.', -100, 'betrayed'); lifeNote(p, '집법당의 혈옥에 갇혔다.'); p.status = 'jailed';
          return { text: '쇠사슬 소리가 한동안 울리고 가게의 단향이 서서히 옅어졌다.\n순찰은 떠나며 네 어깨를 두드렸다: "세태를 아는군."', end: true, summary: '만수를 집법당에 넘겼다.', mood: 'pleased' };
        } },
      ],
    },

    // 风头过后：她来还人情，也带来一笔交易
    debt: {
      when: 'night',
      cond: (st, p) => p.status === 'alive',
      text: st => '밤, 만수가 네 카운터에 걸터앉아 다리를 흔들었다: "집법당의 그 순찰, 꿈에 가서 좀 놀다 왔어요. 요즘은 만다라화만 보면 돌아간대요."'
        + '\n그녀는 소매에서 가시 돋친 열매 두 알을 꺼냈다: "만다라화 씨앗이에요. 요식 화분에 심으면 사흘 밤이면 피고, 꽃가루는 직접 거둬요 — 앞으로 이 몸에게 빌 필요 없어요.'
        + (st.flags.hid ? '당신이 이 몸을 한 번 막아줬으니 이건 그냥 줄게요.' : '백 영석에 팔게요.') + '"',
      choices: st => [
        { label: st.flags.hid ? '받는다' : '산다(100 영석)', hint: `만다라화 씨앗 두 알과 꽃가루 한 단지를 얻는다${st.flags.hid ? '' : `; ${costHint(100)}`}`, req: st.flags.hid ? undefined : needStones(100), run: (st, p) => {
          if (!st.flags.hid) spend(100, '만수에게 만다라화 씨앗을 샀다.');
          giveItem('datura_seed', { q: 90 }); giveItem('datura_seed', { q: 90 }); giveItem('datura_pollen', { q: 90 });
          remember(p, '그녀의 꽃씨를 받았다.', 8); p.informant = true;
          let tail = '그녀는 카운터에서 뛰어내려 꽃잎을 오므리듯 사라졌다. 앞으로 집법당 순찰이 오기 하룻밤 전이면 어김없이 단향이 먼저 풍긴다.';
          if (strongEnough() && Math.random() < 0.35) {
            S.flags.inspectMul *= 0.8;
            tail += '\n나중에 집법당 순찰 여럿이, 네 거리를 지나면 졸음이 쏟아진다고 했다.';
          }
          return { text: tail, end: true, summary: '만수가 너의 귀와 눈이 되었고 집법당이 오기 전에 늘 소문이 난다.', mood: 'sly' };
        } },
        { label: '잡역 구역을 떠나라고 타이른다', hint: '요족 명성 +4; 그녀는 다시 오지 않는다', run: (st, p) => {
          adjustRep('yao', 4); goodDeed(p, 1); remember(p, '잡역 구역을 떠나라고 타이렀다.', 6);
          lifeNote(p, '잡역 구역을 떠나 난장판 바깥 들판으로 돌아갔다.'); p.status = 'gone';
          return { text: '"이 몸을 생각해주는군요." 그녀는 웃으며 꽃잎을 오므렸다. "난장판 밖에 좋은 곳이 하나 더 있어요."', end: true, summary: '만수에게 잡역 구역을 떠나라고 했다.' };
        } },
      ],
    },
  },
});
