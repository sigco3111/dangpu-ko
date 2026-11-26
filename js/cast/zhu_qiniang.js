// 朱七娘：盘丝岭来的蜘蛛精，七姐妹里最小的一个。吐的丝比灵蚕丝韧十倍，织坊的管事想把她锁在织机前一辈子；
// 买她的丝能做云锦生意，替她出头要得罪少宗主一系的织坊，卖她能讨织坊的赏
'use strict';

const QINIANG_BOSS = { name: '직방 관리', portrait: 'landlord', title: '소종주 직방 관리', faction: 'mo' };

defineCharacter({
  id: 'zhu_qiniang', name: '주칠랑', faction: 'yao', sex: 'f', title: '거미 요정',
  portrait: 'zhu_qiniang',
  // 成年女子；妖修驻颜，看上去二十出头。妩媚、灵巧，雅致不露骨
  art: 'a spider spirit, an adult woman who looks about 22: a captivating beautiful face with fair skin, sharp dark eyes with a faint crimson glint, red lips, '
    + 'long glossy black hair pinned up with silver hairpins shaped like small spiders, a fitted black and deep crimson silk qipao-style robe embroidered with silver spiderweb patterns, '
    + 'sheer black silk sleeves, a fine glittering silver thread looped between her fingers like a cat\'s cradle, a slender graceful figure, '
    + 'a sly charming smile, elegant and tasteful, not explicit',
  bio: '반사령 칠자매 중 막내. 산을 내려와 잡역 구역에서 살길을 찾는다. 그녀가 뽑는 실은 영견사보다 열 배 질기고 열 배 빛나며, 직방 관리는 그녀의 실도 탐냈고 그녀도 탐냈다.',
  intro: '눈이 부시게 빛나는 실타래 한 권을 팔러 온 거미 요정.',
  savvy: 0.7, power: 32, eye: 2,
  traits: { greed: 0.5, integrity: 0.4, caution: 0.6, wish: 'cloud_robe', budgetMul: 1.0 },
  start: { day: 9, node: 'silk', chance: 0.4, cond: () => ART_SET.has('chars/zhu_qiniang') },   // 立绘装好才登场
  regular: true,
  lines: {
    first: '(들보에서 은실 한 줄기가 내려오고 그녀가 실을 타고 카운터 앞에 내려선다) 주인장, 놀랐어요?',
    neutral: ['주인장, 오늘 실 받아요?', '(손가락 사이에 은실을 감는다) 또 폐를 끼치러 왔어요.'],
    warm: ['주인장, 이 가게 들보에 이 몸이 친 그물이 제일 질겨요.', '언니들은 잡역 구역 사람들이 나쁘다지만, 주인장은 괜찮아 보여요.'],
    close: ['앞으로 누가 이 가게를 건드리면 이 몸의 실이 막아줄게요.', '주인장, 한 벌 지어줄게요. 입으면 칼도 창도 못 뚫어요.'],
    cold: '장사만 해요. 다른 얘기는 말고요.',
    hostile: '(그녀 손의 실이 팽팽해진다) 당신이 이 몸을 직방에 팔았어요.',
    buy: ['{cat} 있어요? 이 몸은 까다로워요.', '{cat} 주세요. 하품으로 이 몸을 속이려 들지 말아요.'],
    sell: '이 {item}, {ask} 영석이에요. 이렇게 질긴 건 다른 데선 못 사요.',
  },
  on: {
    death: () => { log('들보의 거미줄이 비었고, 더는 들보에서 내려오는 이가 없다.', 'loss'); },
  },

  nodes: {
    // 头一回：卖自己吐的丝
    silk: {
      when: 'day',
      text: () => '들보에서 은실 한 줄기가 내려오더니 붉은 옷의 여자가 실을 타고 카운터 앞에 사뿐히 내려섰다. 머리에는 거미 모양 은비녀 몇 개가 흔들렸다. 그녀는 눈부시게 빛나는 실타래 한 권을 카운터에 올렸다:'
        + '"이 몸이 직접 뽑은 거예요. 영견사보다 열 배 질겨요. 세 권에 영사 세 묶음이면 운금 한 벌을 지을 수 있어요 — 주인장, 받아줄래요?"\n"다만... 직방 사람들이 이 몸이 팔았다는 걸 알면 안 돼요."',
      choices: () => [
        { label: '제값에 세 권을 받는다(220 영석)', hint: `${costHint(220)}; 거미줄 세 권을 얻는다(상품)`, req: needStones(220), run: (st, p) => {
          spend(220, '주칠랑의 거미줄 세 권을 받았다.'); for (let i = 0; i < 3; i++) giveItem('spider_silk', { q: 92 });
          remember(p, '그녀의 실을 제값에 받았다.', 15, 'fair'); st.flags.bought = true;
          return { text: '그녀는 영석을 한 닢씩 세어 주머니에 넣고 웃었다: "시원하네요. 앞으로 이 몸의 실은 주인장한테 먼저 줄게요."', go: ['boss', [3, 5]], summary: '주칠랑의 실을 받았다.', mood: 'pleased' };
        } },
        { label: '깎아서 받는다(90 영석)', hint: `${costHint(90)}; 거미줄 세 권을 얻는다; 그녀가 기억한다`, req: needStones(90), run: (st, p) => {
          spend(90, '주칠랑의 거미줄 세 권을 깎아 받았다.'); for (let i = 0; i < 3; i++) giveItem('spider_silk', { q: 92 });
          remember(p, '그녀의 실을 깎아 받았다.', -8, 'lowballed'); st.flags.bought = true; st.flags.cheated = true;
          return { text: '그녀 손의 실이 팽팽해졌다가 풀렸다: "좋아요. 잡역 구역의 값, 기억해둘게요."', go: ['boss', [3, 5]] };
        } },
        { label: '받지 않는다', hint: '이 일에 끼지 않는다', run: (st, p) => {
          remember(p, '그녀의 실을 받지 않았다.', -2);
          return { text: '"아깝네요." 그녀는 은실을 타고 들보로 올라가 눈 깜짝할 사이에 사라졌다.', go: ['boss', [3, 5]] };
        } },
      ],
    },

    // 织坊管事上门：找吐丝的蜘蛛精
    boss: {
      when: 'day',
      who: () => QINIANG_BOSS,
      text: st => '살찐 관리 하나가 느릿느릿 들어와 쇠구슬 두 개를 손에서 굴렸다: "소종주의 직방에 실이 모자라다. 잡역 구역에 은실을 뽑는 거미 요정이 있다던데 — 베틀 앞에 묶어두면 일 년에 운금 서른 벌을 짓겠군."'
        + '\n"본 관리를 위해 그녀를 찾아주면 직방이 삼백을 내리겠다. 숨겨주는 자는... 소종주의 장사에서 앞으로 빠지게 될 것이다."'
        + (st.flags.bought ? '\n그의 눈이 네 카운터의 실타래들을 훑더니 가늘어졌다.' : ''),
      choices: st => [
        { label: '본 적 없다고 한다', hint: `거짓말${st.flags.bought ? '; 카운터의 실이 약점이다' : ''}; 들통나면 소종주 일파 호감 -10${condText('me') ? `(${condText('me').replace(/[.]$/, '')}. 들통나기 쉽다)` : ''}`, run: st => {
          if (lieCaught(st.flags.bought ? 0.55 : 0.3)) { shiftSt('heir', -10); st.flags.suspect = true; return { text: '관리가 쇠구슬을 움켜쥐었다: "그래, 본 적 없다고."', go: ['web', [1, 2]], mood: 'angry' }; }
          return { text: '관리는 콧방귀를 뀌고 쇠구슬을 굴리며 떠났다.', go: ['web', [1, 2]] };
        } },
        { label: '귀시에서 샀고 출처는 모른다고 한다', hint: '60 영석을 써서 그를 믿게 한다', req: needStones(60), run: () => {
          spend(60, '직방 관리를 매수했다.');
          return { text: '관리는 영석을 받았다: "귀시? 그럼 딴 데서 흘러들어온 거군."', go: ['web', [1, 2]] };
        } },
        { label: '그녀가 네 가게 들보에서 자주 머문다고 일러바친다', hint: '+300 영석; 소종주 일파 호감 +10; 요족 명성 -8', sin: ['betray', 2], run: (st, p) => {
          earn(300, '주칠랑을 직방에 팔았다.'); shiftSt('heir', 10); adjustRep('yao', -8);
          remember(p, '그녀를 직방에 팔았다.', -100, 'betrayed'); lifeNote(p, '소종주 직방의 베틀 앞에 묶였다.'); p.status = 'gone';
          return { text: '그날 밤, 직방 사람들이 웅황 적신 그물로 네 들보를 덮었다.\n보름 뒤 직방에서 운금 한 벌이 나왔는데 눈이 부시게 빛났다.', end: true, summary: '주칠랑을 직방에 팔았다.', mood: 'pleased' };
        } },
      ],
    },

    // 当夜：织坊的人来捉，她求你帮她挡一挡
    web: {
      when: 'night',
      cond: (st, p) => p.status === 'alive',
      mood: 'afraid',
      text: st => '한밤중, 들보에서 실 한 줄기가 내려오더니 주칠랑이 미끄러져 내려왔다. 얼굴이 하얗다: "직방 사람들이 웅황 그물을 들고 골목을 집집이 뒤지고 있어요. 주인장, 오늘 밤만 들보에 숨게 해줘요."'
        + (st.flags.cheated ? '\n"지난번에 값 깎은 건 따지지 않을게요 — 오늘 밤만 이 몸을 도와줘요."' : '')
        + (st.flags.suspect ? '\n관리가 쇠구슬을 움켜쥐던 그 손이 떠올랐다.' : ''),
      choices: st => [
        { label: '들보에 숨기고 네가 문을 지킨다', hint: `직방이 찾아오면 네가 막아야 한다${st.flags.suspect ? '(그가 이미 의심하고 있다)' : ''}; 성공률 약 ${Math.round(trialOdds(36) * 100)}%(${condText('me') || '너의 상태는 아직 괜찮다'})`, run: (st, p) => {
          goodDeed(p, 3); remember(p, '그날 밤 그녀를 들보에 숨기고 문을 지켜주었다.', 25, 'helped');
          if (!st.flags.suspect || Math.random() < 0.5) return { text: '직방 사람들이 네 문 앞을 세 번 오갔지만 들어오지 않았다. 날이 밝자 들보에 촘촘한 그물 하나가 생겨 있었다.', go: ['repay', [5, 8]], summary: '주칠랑을 들보에 숨겨 직방을 피하게 했다.', mood: 'pleased' };
          const t = trial('me', 36);
          if (t.ok) { shiftSt('heir', -6); return { text: `직방 사람들이 문을 걷어차고 들어왔다. 너는 빗장을 들고 들보 아래를 막았다: "여긴 내 가게다." 한참 대치하다 그들은 물러갔다. (${partsText(t.s)})`, go: ['repay', [5, 8]], summary: '주칠랑 대신 직방 사람들을 막아냈다.', mood: 'pleased' }; }
          addCond('me', 'injured', 1, '직방 사람들을 막아섰다'); shiftSt('heir', -6);
          lifeNote(p, '한 전당포 들보에서 직방의 웅황 그물에 잡혀갔다.'); p.status = 'gone';
          return { text: `직방 사람들이 너를 밀쳐내고 웅황 그물이 들보를 덮었다. ${condText('me')}`, end: true, summary: '직방을 막지 못했고 주칠랑은 잡혀갔다.' };
        } },
        { label: '망토를 입혀 반사령으로 돌려보낸다', hint: `${costHint(50)}; 요족 명성 +5`, req: needStones(50), run: (st, p) => {
          spend(50, '주칠랑의 산행 여비를 마련해주었다.'); adjustRep('yao', 5); goodDeed(p, 2);
          remember(p, '그녀를 반사령으로 돌려보냈다.', 18, 'helped'); lifeNote(p, '반사령으로 돌아갔다.'); p.status = 'gone';
          return { text: '그녀는 망토를 걸치고 문간에서 돌아보았다: "언니들도 알게 될 거예요. 잡역 구역에 좋은 사람이 있다는 걸."', end: true, summary: '주칠랑을 반사령으로 돌려보냈다.' };
        } },
        { label: '문을 닫는다', run: (st, p) => {
          remember(p, '그날 밤 그녀를 들이지 않았다.', -15);
          return { text: '실이 문틈으로 빨려 들어갔다. 그 뒤로 들보에 그물이 쳐진 적이 없다.', end: true, summary: '그날 밤 주칠랑을 들이지 않았다.' };
        } },
      ],
    },

    // 躲过一劫：她织一件给你
    repay: {
      when: 'day',
      cond: (st, p) => p.status === 'alive',
      mood: 'pleased',
      text: () => '주칠랑이 들보에서 내려왔다. 품에는 곱게 개킨 법의 한 벌이 있고 은빛이 흘렀다: "이레 밤을 한숨도 안 자고 지었어요. 직방 것보다 밝고, 더 질겨요."',
      choices: () => [
        { label: '받는다', hint: '운금 법의 한 벌을 얻는다(극품); 그녀가 자주 들르고 들보의 그물이 문을 지켜준다', run: (st, p) => {
          giveItem('cloud_robe', { q: 95 }); p.informant = true; adjustRep('yao', 5);
          remember(p, '그녀가 지은 법의를 받았다.', 10);
          let tail = '그녀는 눈을 깜빡이고 실을 타고 들보로 돌아갔다. 앞으로 밤에 도둑이 들면 먼저 들보 아래에서 걸려 넘어질 것이다.';
          if (strongEnough() && Math.random() < 0.35) {
            S.flags.guard = true;
            tail += '\n나중에 반사령의 언니 여섯도 한 번 와서 네 가게 네 모퉁이에 그물을 하나씩 쳐주었다 — 그 뒤로 감히 문을 넘는 도둑이 없었다.';
          }
          lifeNote(p, '한 전당포의 들보에 보금자리를 틀었다.');
          return { text: tail, end: true, summary: '주칠랑이 네 가게 들보에 보금자리를 틀었다.' };
        } },
      ],
    },
  },
});
