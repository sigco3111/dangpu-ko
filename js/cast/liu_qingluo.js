// 柳青萝：游方蛇医。拿本钱价收药，去救丹房见死不救的杂役；丹房容不下她——帮她要掏钱、要得罪人，卖了她换丹房的交情
'use strict';

defineCharacter({
  id: 'liu_qingluo', name: '유청라', faction: 'yao', sex: 'f', title: '떠도는 뱀 의원',
  portrait: 'yao_snake',
  bio: '화형한 지 오래된 푸른 뱀. 잡역 구역 뒷골목에 초막을 짓고 사람들을 진료하며 진찰료를 받지 않는다. 단방 사람들은 약 장사를 빼앗는다 하고, 잡역들은 살아있는 보살이라 한다.',
  intro: '잡역들을 진료하며 네게 원가로 약재를 달라는 뱀 요괴.',
  savvy: 0.6, power: 32, eye: 2,
  traits: { greed: 0.15, integrity: 0.8, caution: 0.6, wish: 'herb_blood' },
  start: { day: 6, node: 'herbs', chance: 0.5 },
  regular: true,
  // 懂医术：结识后可在「人物」页或点状态求诊；fee 是每重伤毒的底价
  healer: { heals: ['injured', 'poisoned'], fee: 20 },
  lines: {
    first: '(혀끝을 살짝 내밀어 공기 속 냄새를 맡는 듯하다) 작은 주인장, 여기서 약초 향기가 나는군요.',
    neutral: ['주인장, 또 폐를 끼치러 왔소.', '뒷골목에 쓰러진 이가 또 늘었소. 여기 뭐가 있는지 보러 왔소.'],
    warm: ['주인장, 초막의 사람들이 모두 당신을 생각하오.', '이 가게는 이 거리에서 유일하게 사람을 잡아먹지 않는 곳이오.'],
    close: ['주인장, 앞으로 누가 아프면 이 몸의 이름을 대라 하시오.', '이 몸이 빚진 것은 기억하고 있소.'],
    cold: '약을 사러 왔을 뿐이오. 다른 말은 없소.',
    hostile: '... 당신은 이 몸을 한 번 팔았소. 잊지 않겠소.',
    buy: ['{cat} 있소? 사람을 살릴 물건이오.', '{cat} 좀 주시오. 값은 당신이 정하되, 너무 모질지는 말아주시오.'],
    sell: '산에서 캔 {item}, {ask} 영석이오. 받아주겠소?',
  },
  command: { label: '그녀에게 잡역들을 진료하게 해 인심을 산다', run: () => { adjustRep('ren', 8); return '유청라의 초막 앞에 긴 줄이 늘어섰고, 약이 네 가게에서 나왔다는 것을 모두가 안다.'; } },
  on: {
    // 在你这儿按平价买到救命的药，也算帮了她
    sold: (st, p, it, price) => {
      if (['herb_blood', 'herb_dew', 'pill_qi', 'vine_fruit'].includes(it.id) && price <= knownValue(it) * priceMul(it.id)) st.flags.helped = (st.flags.helped || 0) + 1;
    },
    death: (st, p) => { adjustRep('ren', -8); log('유청라가 죽었다. 뒷골목 초막의 환자들을 돌보는 이가 없어졌다.', 'loss'); },
  },

  nodes: {
    herbs: {
      when: 'day',
      text: (st, p) => {
        const has = owns('herb_blood') || owns('herb_dew');
        const lead = st.flags.visits ? '유청라가 또 왔다. 옷자락에 초막의 약찌꺼기가 묻어 있다.' : '푸른 옷의 여자가 가게로 들어왔다. 동공이 실처럼 가늘고, 목덜미에 푸른 비늘 몇 장이 어렴풋하다.';
        return `${lead}\n"뒷골목 광산에서 내려온 자들 말이오. 단방은 회기단 한 알에 서른 영석을 부르는데, 그건 그들 석 달 품삯이오." 그녀는 잘게 부순 영석 한 자루를 카운터에 놓았다. "${has ? '혈영지와 응로초가 있지요 — 원가로 이 몸에게 팔아주시겠소?' : '혈영지와 응로초가 들어오면 이 몸을 위해 남겨두시오. 원가로.'}"`;
      },
      choices: (st, p) => {
        const herb = owns('herb_blood') || owns('herb_dew');
        const again = () => (st.flags.visits = (st.flags.visits || 0) + 1, (st.flags.helped || 0) >= 2 || st.flags.visits >= 3 ? ['envoy', [3, 5]] : ['herbs', [3, 5]]);
        if (!herb) return [
          { label: '남겨두기로 약속한다', run: () => { remember(p, '원가로 약을 남겨주기로 약속했다.', 5); return { text: '"약속한 것이오." 그녀의 동공이 살짝 오므라들었다. 웃은 것 같았다.', go: again() }; } },
          { label: '약 사라고 50 영석을 준다', hint: costHint(50), req: needStones(50), run: () => {
            spend(50, '유청라에게 약값으로 50 영석을 주었다.'); goodDeed(p, 2); st.flags.helped = (st.flags.helped || 0) + 1;
            remember(p, '약을 사라며 쉰 영석을 주었다.', 18, 'helped');
            return { text: '그녀는 잠시 멈칫하더니 영석을 소매에 넣고 인족의 예를 올렸다.', go: again(), summary: '그녀의 초막을 도운 적이 있다.' };
          } },
          { label: '여기는 자선당이 아니라고 한다', run: () => { remember(p, '여기는 자선당이 아니라고 했다.', -6); return { text: '"그것도 그렇군요." 그녀는 고개를 끄덕이고 돌아갔다.', go: again() }; } },
        ];
        const name = itemName(herb), cost = Math.round(ITEMS[herb.id].base * 0.6), full = Math.round(knownValue(herb) * priceMul(herb.id));
        return [
          { label: `원가로 판다(${cost} 영석)`, hint: `시가보다 ${full - cost} 덜 번다`, run: () => {
            takeItem(herb); earn(cost, `${name}을(를) 유청라에게 원가로 팔았다.`); goodDeed(p, 1); st.flags.helped = (st.flags.helped || 0) + 1;
            remember(p, `${name}을(를) 원가로 팔았다.`, 12, 'cheap');
            return { text: '그녀는 약초를 품에 넣고 돌아서다가 문간에서 돌아보았다: "초막의 세 사람이 오늘 밤은 잘 수 있겠소."', go: again() };
          } },
          { label: `그냥 준다`, hint: `${name}을(를) 잃는다`, run: () => {
            takeItem(herb); goodDeed(p, 3); st.flags.helped = (st.flags.helped || 0) + 2;
            remember(p, `${name}을(를) 그냥 주었다.`, 22, 'helped');
            return { text: '그녀는 너를 오래 바라보았다: "인족 중에도 당신 같은 이가 있었군요."', go: again(), summary: '그녀에게 목숨을 살릴 약을 그냥 준 적이 있다.' };
          } },
          { label: `시가대로(${full} 영석)`, run: () => {
            takeItem(herb); earn(full, `${name}을(를) 유청라에게 팔았다.`);
            remember(p, `${name}을(를) 시가대로 팔았다.`, 0);
            return { text: '그녀는 영석을 아주 천천히 셌고, 다 세고 나니 자루가 비어 있었다.', go: again() };
          } },
        ];
      },
    },

    envoy: {
      when: 'day',
      who: () => ({ name: '단방 집사', portrait: 'ren_cultivator', title: '단방 집사', faction: 'mo' }),
      text: (st, p) => `단방 도포를 입은 중년인이 은 덩어리 같은 영석 한 개를 카운터에 눌러놓았다: "뒷골목의 그 푸른 뱀, 약은 네 가게에서 나오지?"\n"단방의 단약이 안 팔려서 장로님이 몹시 불쾌해하신다. 그 계집이 어디에 있는지 말하면 이 영석은 네 것이고, 단방도 네게 은혜를 입었다 하겠다."${(st.flags.helped || 0) >= 2 ? '\n그는 잠시 멈췄다. "물론, 계속 착한 사람 노릇을 해도 좋다 — 다만 단방의 문은 다시 들어오지 마라."' : ''}`,
      choices: (st, p) => [
        { label: '그녀의 거처를 말한다', sin: ['betray', 3], hint: '+200 영석; 단방 호감 +20; 선명 폭락', run: () => {
          earn(200, '유청라의 거처를 단방에 팔았다.'); shiftSt('dan', 20);
          st.flags.sold = true;
          return { text: '집사는 만족스럽게 떠났다. 저녁때, 뒷골목에서 한바탕 소란이 들렸다.', go: ['raid', 0], summary: '그녀의 거처를 단방에 팔았다.' };
        } },
        { label: '돈을 쥐여주며 집사를 돌려보내 그녀를 감춘다', hint: costHint(80), req: needStones(80), run: () => {
          spend(80, '단방 집사를 매수해 유청라를 감췄다.'); shiftSt('dan', -5); goodDeed(p, 2);
          remember(p, '단방이 찾아오자 돈으로 그녀를 감춰주었다.', 20, 'helped');
          return { text: '집사는 영석을 저울질했다: "이번은 넘어가지." 나가기 전 그는 너를 돌아보았다. "착한 놈은 잡역 구역에서 오래 못 산다."', go: ['plague', [4, 7]] };
        } },
        { label: '모른다고 한다', hint: '단방 호감 -10', run: () => {
          shiftSt('dan', -10);
          return { text: '"모른다고?" 집사가 냉소했다. "그럼 천천히 생각해봐라."', go: ['plague', [4, 7]] };
        } },
      ],
    },

    raid: {
      when: 'night',
      text: (st, p) => '뒷골목에 불길이 치솟았다. 문틈으로 단방 사람들이 초막을 뒤엎고 환자들을 빗속으로 끌어내는 것이 보였다.\n유청라가 쇠사슬에 묶인 채 네 문 앞으로 끌려가다가 고개를 들었고, 가늘고 긴 동공이 네 눈과 마주쳤다.',
      choices: (st, p) => [
        { label: '문을 닫는다', run: () => {
          p.status = 'jailed'; lifeNote(p, '단방에 잡혀 뱀쓸개를 적출당해 약이 되었다.');
          remember(p, '그녀를 단방에 팔았다.', -100, 'betrayed');
          adjustRep('ren', -6); adjustRep('yao', -10);
          const r = pick(['dan_guide', 'pill_recipe']);
          giveItem(r);
          return { text: `이튿날 단방이 ${ITEMS[r].name}을(를) 보내왔다. 장로의 사례라 했다. 뒷골목의 초막은 다시는 세워지지 않았다.`, end: true, summary: '그녀를 팔았다. 단방은 은혜를 기억했고, 잡역 구역은 원한을 기억했다.' };
        } },
        { label: '뛰쳐나가 사람을 빼앗는다', hint: `성공률 약 ${Math.round(trialOdds(48) * 100)}%(${condText('me') || '너의 상태는 아직 괜찮다'}); 지면 중상${deathWarn('injured')}`, run: () => {
          const t = trial('me', 48);
          if (t.ok) {
            addHeat(15); shiftSt('dan', -25); karmaShift(4);
            remember(p, '그녀를 팔았다가, 빗속에서 목숨을 걸고 되찾아왔다.', 25);
            return { text: '너는 빗장을 들고 빗속으로 뛰쳐나가 단방 제자 둘을 쳐눕혔다. 유청라가 쇠사슬을 풀고 너를 끌고 수로로 기어들었다.\n날이 밝을 때 그녀는 네 상처를 싸매주며 아무 말도 하지 않았다. 다만 손이 무척 가벼웠다.', end: true, summary: '그녀를 팔았다가 죽을힘을 다해 되찾아왔다.' };
          }
          addCond('me', 'injured', 2, '단방 무리 속으로 뛰어들어 사람을 빼앗으려 했다'); addHeat(10);
          p.status = 'jailed'; lifeNote(p, '단방에 잡혀 뱀쓸개를 적출당해 약이 되었다.');
          remember(p, '그녀를 팔았다가 구하려 했지만 구하지 못했다.', -40);
          return { text: '세 걸음도 못 가 몽둥이에 맞아 진흙탕에 쓰러졌다. 유청라가 너를 돌아보았고, 어둠 속으로 끌려갔다.', end: true, summary: '그녀를 팔았고, 구하려다 실패해 중상을 입었다.' };
        } },
        { label: '뛰쳐나가 영석으로 그녀를 속량한다', hint: '-300 영석; 단방 호감 -20', req: needStones(300), run: () => {
          spend(300, '단방에게서 유청라를 속량했다.'); shiftSt('dan', -20); karmaShift(6);
          remember(p, '그녀를 팔았다가, 빗속에서 속량해왔다.', 10);
          return { text: '단방 사람들은 영석을 받고 쇠사슬을 풀었다. 유청라는 한마디도 없이 환자 한 명을 부축하고 빗속으로 걸어갔다.', end: true, summary: '그녀를 팔았다가 속량했다. 그녀는 아무 말도 하지 않았다.' };
        } },
      ],
    },

    plague: {
      when: 'day',
      cond: (st, p) => p.status === 'alive',
      text: (st, p) => '잡역 구역에 시역이 돌았고, 단방의 회기단은 한 알에 예순 영석까지 올랐다.\n유청라가 가게로 뛰어들어왔다. 눈은 밤을 새워 새빨갰다: "이 몸은 해독약을 만들 수 있소. 회기단 두 알이 약재로 필요하오 — 아니면 백 영석을 주시오. 귀시에서 직접 사겠소. 초막에 열몇 명이 누워 있소."'
        + (hasCond('me', 'poisoned') || hasCond('me', 'injured') ? `\n그녀가 너를 흘끗 보고 눈살을 찌푸렸다: "당신도 ${condSev('me', 'poisoned') ? '독에 걸렸군요' : '상처를 입었군요'}."` : ''),
      choices: (st, p) => {
        const pills = Object.values(S.items).filter(it => HELD(it) && it.id === 'pill_qi' && !it.fake);
        const list = [];
        // 你身上有伤毒：交情够，她先治你；交情不够，开价
        if (hasCond('me', 'poisoned') || hasCond('me', 'injured')) list.push(p.aff >= 25
          ? { label: '그녀에게 겸사겸사 치료를 부탁한다', hint: '너의 상처와 독을 고친다; 돈을 받지 않는다', run: () => {
              cureCond('me', 'poisoned'); cureCond('me', 'injured');
              remember(p, '시역이 돌던 해, 그녀가 지나는 길에 너를 고쳐주었다.', 5);
              return { text: '그녀는 몇 번에 침을 놓고 약가루 한 봉지를 쥐여주었다: "머금고 있으시오. 삼키지 말고."\n찻잔 하나 식을 무렵 너는 검은 피를 토했고 온몸이 가벼워졌다. 그녀는 이미 떠난 뒤였다.', go: ['plague', 0] };
            } }
          : { label: '그녀에게 치료를 청한다(60 영석)', hint: '그녀는 네게 빚진 것이 없으니 제값을 받는다', req: needStones(60), run: () => {
              spend(60, '유청라에게 치료를 청했다.'); cureCond('me', 'poisoned'); cureCond('me', 'injured');
              return { text: '그녀는 영석을 받고 빠르게 침을 놓았으며, 다른 말은 없었다.', go: ['plague', 0] };
            } });
        if (pills.length >= 2) list.push({ label: '회기단 두 알을 준다', hint: '회기단 두 알을 잃는다', run: () => {
          pills.slice(0, 2).forEach(takeItem); goodDeed(p, 4); st.flags.saved = true;
          remember(p, '시역이 돌던 해, 목숨을 살릴 약재를 주었다.', 25, 'helped');
          return { text: '그녀는 단약을 움켜쥐고 달려갔다. 사흘 뒤, 뒷골목에서 시신이 나오지 않았다.', go: ['repay', [4, 6]], summary: '시역이 돌던 해, 목숨을 살릴 약재를 주었다.' };
        } });
        list.push({ label: '백 영석을 준다', hint: costHint(100), req: needStones(100), run: () => {
          spend(100, '유청라의 시역 해독약 조제를 도왔다.'); goodDeed(p, 4); st.flags.saved = true;
          remember(p, '시역이 돌던 해, 약을 짓도록 백 영석을 주었다.', 25, 'helped');
          return { text: '그녀는 영석을 움켜쥐고 빗속으로 뛰어갔다. 사흘 뒤, 뒷골목에서 시신이 나오지 않았다.', go: ['repay', [4, 6]], summary: '시역이 돌던 해, 해독약 조제를 도왔다.' };
        } });
        list.push({ label: '역병을 틈타 그녀의 뱀 허물 약재를 헐값에 산다', sin: ['fraud', 1], hint: '+120 영석; 그녀가 너를 미워한다', run: () => {
          earn(120, '역병을 틈타 유청라의 뱀 허물을 깎아 샀다.');
          remember(p, '시역이 돌던 해, 불난 집을 털었다.', -50, 'gouged');
          lifeNote(p, '시역이 지난 뒤 잡역 구역을 떠났다.');
          p.status = 'gone';
          return { text: '그녀는 뱀 허물을 카운터에 내던지고 영석만 챙겨 갔다. 그 해, 뒷골목에서 많은 사람이 죽었다.', end: true, summary: '시역이 돌던 해, 너는 불난 집을 털었다. 그녀는 떠났다.' };
        } });
        return list;
      },
    },

    repay: {
      when: 'day',
      cond: (st, p) => p.status === 'alive',
      text: (st, p) => '잡역들이 네 문 앞에 모여 달걀과 무명천, 말린 약초 봉지를 받쳐 들고 있다. 유청라가 그들 뒤에 서 있다.\n"이들은 드릴 게 없소," 그녀가 말했다. "이 몸은 있소."',
      choices: (st, p) => [
        { label: '받는다', run: () => {
          adjustRep('ren', 10);
          // 好人好报：只有你够强，她才肯把真正的底牌押在你身上
          if (strongEnough() && Math.random() < 0.4) {
            adjustRep('yao', 25); giveItem('soul_crystal', { q: 90 }); S.flags.savior = (S.flags.savior || 0) + 1;
            lifeNote(p, '청사 일족으로 돌아가 족장을 이었다.');
            return { text: '그녀는 목덜미의 푸른 비늘 한 장을 떼어 네 손바닥에 올렸다: "이 몸은 청사 일족의 소주요. 이 비늘이 있는 한 요족은 당신을 벗으로 여기오. 언젠가 큰 재앙이 닥치면 부수시오."\n그녀는 혼정 하나를 더 내려놓았다. "이건 일족이 은인에게 드리는 사례요."', end: true, summary: '그녀는 청사 일족의 소주였다. 요족은 이제 너를 벗으로 여기고, 네 손에 부적 하나가 늘었다.' };
          }
          p.informant = true; giveItem('vine_fruit', { q: 85 }); giveItem('vine_fruit', { q: 85 });
          return { text: '그녀는 혈등과 두 알을 카운터에 올렸다: "뒷골목의 귀가 앞으로 당신을 위해 듣겠소."', end: true, summary: '시역이 지난 뒤 잡역 구역 모두가 네 호의를 알게 됐고, 유청라가 너의 귀와 눈이 되었다.' };
        } },
      ],
    },
  },
});
