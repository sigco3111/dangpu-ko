// 鲁半仙：瞎眼算命先生，其实是被清洗的执法堂书吏。他把一只漆盒寄在你这儿——里面是冷长老的黑账，和一张写着你铺名的抄家单
'use strict';

defineCharacter({
  id: 'lu_banxian', name: '노반선', faction: 'ren', sex: 'm', title: '점술가',
  portrait: 'lu_banxian',
  art: "an old blind fortune teller in his sixties with a strip of black cloth tied over his eyes, thin grey goatee, weathered face, shabby faded indigo Taoist robe, holding a bamboo pole with a blank white cloth fortune banner in one hand and an old bronze luopan compass in the other, a knowing faint smile",
  bio: '눈을 가린 점술가. 잡역 구역 어귀에 자리를 펴고 점을 치는데 소름 끼치게 잘 맞는다. 예전에 집법당에서 공문서를 베껴 썼다는 이야기가 있다.',
  intro: '너무나 잘 맞히는 장님 점술가.',
  savvy: 0.85, power: 22, eye: 3,
  traits: { greed: 0.35, integrity: 0.55, caution: 0.8, wish: 'spirit_wine' },
  start: { day: 8, node: 'fortune', chance: 0.4 },
  regular: true,
  lines: {
    first: '(대나무 지팡이를 짚고, 검은 천으로 가린 얼굴이 정면으로 너를 향한다) 작은 주인장, 그대의 운명이 좀 재미있군.',
    neutral: ['주인장, 오늘은 개점하기 좋고 잔소리하기 나쁜 날이오.', '늙은이가 또 차 한 잔 얻으러 왔소.'],
    warm: ['주인장, 미간이 지난번보다 밝아졌소.', '늙은이의 이 먼 눈도 사람 보는 눈만은 정확하오.'],
    close: ['주인장, 어떤 말은 당신에게만 하오.', '우리 사이는 점칠 필요가 없소.'],
    cold: '장사는 장사요.',
    hostile: '... 늙은이가 그대의 명을 점쳐봤소. 좋지 않소.',
    buy: ['{cat} 있소? 늙은이는 눈은 멀었지만 코는 멀지 않았소.', '늙은이를 위해 {cat}을(를) 구해주시오. 하품으로 장님을 속이려 들지 마시오.'],
  },
  command: { label: '그에게 조정의 기류를 점치게 한다', run: () => { const it = makeIntel('clique'); return it ? `노반선이 손가락을 꼽으며 한참 중얼거렸고, 너는 ${itemName(it)}을(를) 한 장 적어두었다.` : '그는 한참을 떠들었지만 네 창고에는 종이 한 장 둘 곳이 없다.'; } },
  on: {
    // 送他灵酒，他“算”出一份行情
    gift: (st, p, it, res) => {
      if (res.caught || it.id !== 'spirit_wine') return;
      const m = makeIntel('market');
      if (m) log(`노반선이 네 영주를 마시고 고개를 흔들흔들하며 ${itemName(m)} 한 장을 '점쳐냈다'.`, 'gain');
    },
    // 漆盒在你柜底的那几夜
    night: (st, p) => st.flags.box && !st.done && ['hunt', 'opened'].includes(st.node) ? '칠함이 카운터 밑에 눌려 있다. 밤이면 그것이 뜨거워지는 것만 같다.' : null,
  },

  nodes: {
    fortune: {
      when: 'day',
      text: () => '검은 천으로 눈을 가린 늙은 장님이 가게로 더듬어 들어와 대나무 지팡이로 바닥을 세 번 두드리더니 정확히 네 앞에 멈췄다.\n"작은 주인장, 늙은이가 점 한 번 쳐주리다. 스무 영석만 받겠소. 안 맞으면 한 푼도 받지 않겠소."',
      choices: (st, p) => [
        { label: '점을 친다', hint: costHint(20), req: needStones(20), run: () => {
          spend(20, '노반선에게 점을 청했다.');
          const it = makeIntel('market');
          remember(p, '그에게 점을 청했다.', 6);
          return { text: `그는 손가락을 꼽으며 한참 중얼거렸다: "${it ? `동쪽 물건이 오르겠소. ${it.info.text}` : '동쪽 물건이 오르겠소만... 아쉽게도 이 가게에는 더 둘 자리가 없군.'}"\n그는 영석을 거두며 목소리를 낮췄다. "공짜로 한마디 더 하지. 며칠 안 가 이 가게에 물건 하나가 들어올 것이오. 받을지 말지는 스스로 저울질하시오."`,
            go: ['box', [2, 4]] };
        } },
        { label: '믿지 않는다', run: () => {
          remember(p, '그의 점을 믿지 않았다.', -3);
          return { text: '늙은 장님은 화내지 않았다: "믿지 않아도 좋소. 다만 며칠간은 밤에 문을 잘 걸어 잠그시오."', go: ['box', [2, 4]] };
        } },
      ],
    },

    box: {
      when: 'night',
      text: () => '삼경, 누군가 문을 두드렸다. 노반선이 문 밖에 서서 검은 칠나무 함을 품에 안고 있었다. 함에는 봉인이 붙어 있다.\n"이레만 맡아주시오. 백 영석이오." 그는 함을 내밀었다. "누가 물어도, 아무리 알고 싶어도 — 열지 마시오."',
      choices: (st, p) => [
        { label: '칠함을 받는다', hint: '+100 영석', run: () => {
          earn(100, '노반선의 칠함 보관 사례금.'); st.flags.box = true;
          remember(p, '그의 칠함을 맡았다.', 12);
          return { text: '그는 문설주를 더듬어 어둠 속으로 들어갔고, 지팡이 소리는 곧 들리지 않았다.', go: ['hunt', [2, 3]], summary: '출처를 알 수 없는 칠함 하나를 맡았다.' };
        } },
        { label: '받지 않는다', run: () => {
          remember(p, '그의 칠함을 받지 않았다.', -5);
          return { text: '"그럴 만도 하오." 그는 한숨 쉬고 함을 안은 채 떠났다.', go: ['news', [4, 6]] };
        } },
      ],
    },

    hunt: {
      when: 'day',
      who: () => ({ name: '집법당 첩자', portrait: 'mo_enforcer', title: '집법당', faction: 'mo' }),
      text: () => '철가면을 쓴 자가 들어와 물건 칸은 보지도 않고 곧장 너를 노려보았다: "며칠 전 밤, 장님 하나가 여기 와서 칠함 하나를 맡겼다."\n"냉 장로가 그 함을 원하신다. 내놓으면 집법당이 네 공을 기억할 것이고, 숨기면 —" 그는 손마디로 카운터를 두드렸다. "요주의 인물을 숨겨준 죄, 함께 묻겠다."'
        + (condSev('me', 'injured') ? '\n그의 눈이 네가 걸고 있는 팔에서 잠시 멈췄고 입꼬리가 움찔했다.' : condSev('me', 'poisoned') ? '\n그는 네 새파란 입술을 보았다: "안색이 안 좋군, 주인장."' : ''),
      choices: (st, p) => [
        { label: '칠함을 넘긴다', sin: ['betray', 3], hint: '+150 영석; 집법당 호감 +15, 주시 -10; 노반선은 반드시 죽는다', run: () => {
          earn(150, '노반선의 칠함을 집법당에 넘겼다.'); shiftSt('law', 15); addHeat(-10);
          p.status = 'dead'; lifeNote(p, '집법당에 끌려가 다시 돌아오지 못했다.');
          remember(p, '그의 칠함을 집법당에 넘겼다.', -100, 'betrayed');
          return { text: '첩자는 함을 챙겨 갔다. 이튿날 어귀의 점술 자리는 비었고 부러진 대나무 지팡이만 남았다.', end: true, summary: '그의 칠함을 집법당에 넘겼다. 그는 죽었다.' };
        } },
        { label: '그런 일 없다고 한다', hint: '첩자가 믿지 않을 수 있다', run: () => {
          if (lieCaught(0.55)) {
            addHeat(18); shiftSt('law', -10); st.flags.box = false;
            p.status = 'jailed'; lifeNote(p, '집법당이 네 가게에서 칠함을 찾아내 자취를 쫓아 그를 잡았다.');
            return { text: '첩자가 냉소하며 카운터 밑을 걷자 칠함이 나왔다. "은닉, 기록해두지."', end: true, summary: '칠함을 지키지 못했고 그는 잡혔다.' };
          }
          st.flags.lied = true;
          return { text: '첩자가 너를 오래 노려보다가 돌아섰다. 네 등은 흠뻑 젖어 있었다.', go: ['back', [3, 4]] };
        } },
        // 动手：成败看你的修为、兵器与身上的伤毒
        { label: '틈을 타 기절시키고 밤사이 칠함을 빼돌린다', hint: `성공률 약 ${Math.round(trialOdds(42) * 100)}%(${condText('me') || '너의 상태는 아직 괜찮다'}); 지면 중상을 입고 칠함을 빼앗긴다${deathWarn('injured')}`, run: () => {
          const t = trial('me', 42);
          if (t.ok) {
            addHeat(12); st.flags.knocked = true;
            remember(p, '칠함을 위해 집법당 첩자를 카운터 뒤에서 기절시켰다.', 30, 'helped');
            return { text: `너는 카운터 밑의 문진을 들어 그의 뒤통수를 내리쳤다. 철가면이 힘없이 쓰러졌다.\n날이 밝기 전 칠함은 부골 수레에 실려 잡역 구역을 빠져나갔다. 첩자는 깨어나 아무것도 찾지 못했고 네 얼굴만 기억했다.`, go: ['back', [3, 4]] };
          }
          addCond('me', 'injured', 2, '집법당 첩자와 몸싸움을 벌였다'); addHeat(20); shiftSt('law', -15);
          p.status = 'jailed'; lifeNote(p, '집법당이 칠함을 빼앗고 자취를 쫓아 그를 잡았다.');
          return { text: `손을 들기도 전에 철가면의 장풍이 가슴에 꽂혔다 — ${condText('me') || ''}\n너는 물건 칸을 쓰러뜨리며 칠함을 낀 채 유유히 떠나는 그를 바라만 봤다.`, end: true, summary: '그를 위해 싸웠지만 첩자에게 져 칠함을 빼앗겼고 그는 잡혔다.' };
        } },
        { label: '일단 달래두고 밤에 칠함을 연다', hint: '안에 뭐가 있는지 본다', run: () => {
          remember(p, '약속을 어기고 그의 칠함을 열었다.', -10);
          return { text: '뒤뜰을 찾아봐야 한다며 첩자를 내일 오라고 돌려보냈다. 밤, 너는 봉인을 찢었다.', go: ['opened', 0] };
        } },
      ],
    },

    opened: {
      when: 'night',
      text: () => '함 안에는 장부 한 권이 있었다. 냉 장로가 몰수품을 빼돌리고 선문과 내통한 내역이 획획 또렷이 적혀 있다.\n장부 맨 아래에는 압수 명단이 깔려 있었다 — 셋째 줄에 네 가게 이름이 있었다.',
      choices: (st, p) => [
        { label: '장부를 소종주 일파에 넘긴다', hint: '집법당 권세 급락; 소종주 일파 호감 +25', run: () => {
          S.cliques.law.pw = clamp(S.cliques.law.pw - 25, 0, 100); shiftSt('heir', 25); shiftSt('law', -20); earn(200, '소종주 일파가 냉 장로의 검은 장부에 치른 사례.');
          st.flags.delivered = true;
          return { text: '날이 밝기도 전에 장부는 혈공자 손에 들어갔다. 그는 이백 영석과 함께 한마디를 전했다: "압수 명단의 그 줄은 지웠다."', go: ['back', [2, 3]] };
        } },
        { label: '장부로 냉 장로를 협박한다', sin: ['betray', 2], hint: `성공 여부는 네 세력에 달렸다(${playerPower()})`, run: () => {
          if (Math.random() < clamp(playerPower() / 100, 0.1, 0.8)) {
            earn(600, '냉 장로가 자기 검은 장부를 되샀다.'); addHeat(-25); shiftSt('law', 10); st.flags.sold = true;
            return { text: '냉 장로가 몸소 와서 아무 말 없이 육백 영석을 내려놓고 장부를 가져갔다. 압수 명단은 네 눈앞에서 태워졌다.', go: ['back', [2, 3]] };
          }
          addHeat(30); shiftSt('law', -30);
          return { text: '사람을 시켜 말을 전했더니 이튿날 집법당이 가게를 포위하고 장부를 찾아갔다. 너는 혈옥에 사흘 갇혔다 풀려났다.', go: ['back', [2, 3]] };
        } },
        { label: '원래대로 봉한다', run: () => {
          st.flags.kept = true;
          return { text: '장부를 도로 넣고 풀로 봉인을 붙였다. 압수 명단의 그 한 줄 때문에 밤새 잠들지 못했다.', go: ['back', [2, 3]] };
        } },
      ],
    },

    back: {
      when: 'day',
      cond: (st, p) => p.status === 'alive',
      text: st => st.flags.knocked ? '노반선이 와서 칠함의 봉인을 더듬더니 길게 숨을 내쉬었다: "늙은이를 위해 집법당 사람을 쳤다며?"\n그는 눈가리개를 벗었다 — 그 눈은 멀쩡했다. "늙은이는 예전에 집법당 서리였소. 이 은혜는 목숨으로 기억하겠소."'
        : st.flags.delivered ? '노반선이 와서 이번에는 눈가리개를 벗었다 — 그 눈은 멀쩡했다.\n"늙은이는 예전에 집법당 서리였고, 냉 장로가 우리 집안을 멸했소." 그가 깊이 허리를 숙였다. "장부가 간 곳이 늙은이의 생각보다 더 좋은 곳이오."'
        : st.flags.sold ? '노반선이 문간에 서서 들어오지 않았다: "장부를 좋은 값에 팔았소?"\n그의 목소리는 담담했다. "늙은이가 점쳤던 것이오."'
          : '노반선이 가게로 더듬어 들어와 칠함의 봉인을 만져보고 웃었다: "좋소, 좋아. 이레가 다 되었소."',
      choices: st => st.flags.sold ? [
        { label: '...', run: (st, p) => {
          remember(p, '그가 목숨 걸고 만든 장부를 영석으로 바꿨다.', -60, 'betrayed');
          p.status = 'gone'; lifeNote(p, '잡역 구역을 떠나 행방을 알 수 없다.');
          return { text: '그는 돌아서서 갔다. 그 뒤로 어귀에서 점을 치는 이가 없었다.', end: true, summary: '그의 장부를 냉 장로에게 팔았다.' };
        } },
      ] : [
        { label: '칠함을 돌려준다', run: (st, p) => {
          earn(200, '노반선이 보관 사례금을 치렀다.');
          remember(p, st.flags.delivered ? '냉 장로의 검은 장부를 가야 할 곳에 보냈다.' : '칠함을 지켜 이레 동안 아무에게도 빼앗기지 않았다.', 40, 'helped');
          p.informant = true; p.owes = true; goodDeed(p, 3);
          // 好人好报：要你自己站得住，他才敢把命押在你身上
          if (strongEnough() && Math.random() < 0.35) {
            S.flags.savior = (S.flags.savior || 0) + 1; S.flags.deedMul *= 0.85;
            return { text: '그는 목소리를 낮췄다: "집법당 압수 명단이 앞으로 늙은이 손을 거치는 한 그대의 이름은 오르지 않을 것이오. 가게 문서 값도 사람을 시켜 눌러두었소."', end: true,
              summary: '그는 숙청당한 집법당 서리였다. 압수 명단에서 네 이름을 지워주었고 가게 문서도 싸졌다.' };
          }
          return { text: '그는 남은 이백 영석을 카운터에 올렸다: "앞으로 어귀에 무슨 소문이 돌든 늙은이가 들어주겠소."', end: true, summary: '그의 칠함을 지켰다. 그가 너의 귀와 눈이 되었다.' };
        } },
      ],
    },

    news: {
      when: 'day',
      who: () => ({ name: '이웃', portrait: 'ren_merchant_f1', title: '잡역 구역 이웃', faction: 'ren' }),
      text: () => '옆집 쇠빵 장수가 고개를 들이밀었다: "들었어? 어귀의 그 장님, 그저께 밤에 수로에 떠 있었대. 품에 빈 함을 꽉 끌어안은 채로."\n"집법당은 실족이라던데." 그는 목소리를 낮췄다. "장님이 한밤에 수로 가엔 무슨 볼일이 있겠어."',
      choices: (st, p) => [
        { label: '……', run: () => {
          if (p.status === 'alive') { p.status = 'dead'; lifeNote(p, '수로에서 죽은 채 빈 함을 품에 안고 있었다.'); }
          if (Math.random() < 0.5) { addHeat(10); return { text: '며칠 뒤 집법당이 집집마다 "요주의 인물 은닉" 가게를 조사했다. 네 가게도 명단에 있었다.', end: true, summary: '그의 칠함을 받지 않았다. 그는 죽었고 압수 명단의 이름은 남았다.' }; }
          return { text: '너는 그를 위해 향 한 대를 피웠다.', end: true, summary: '그의 칠함을 받지 않았다. 그는 수로에서 죽었다.' };
        } },
      ],
    },
  },
});
