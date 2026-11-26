// 냉비：隐藏人物。你给执法堂巡查下蛊被察觉、却没被当场锁拿，厉寒“告了病假”，冷长老派侄女来接手杂役区——
// 铁面、洁癖、清廉得油盐不进，그런데 벌레를 무서워한다. 그녀는 고충 사건 때문에 온 것이다.中了你的情蛊，你的卷宗就永远递不上去了（见 js/gu.js）
'use strict';

// 到任：执法堂的巡查从此是她；厉寒的那些“方便”一笔勾销
function lengFeiTakeOffice(p) {
  S.flags.lawSwap = true;
  S.flags.enforcerPid = 'leng_fei';
  S.flags.enforcerOwned = false;
  p.official = true;
  const old = S.people.enforcer;
  if (old && old.status === 'alive') { old.status = 'gone'; lifeNote(old, '가슴에 자꾸 벌레가 기어다니는 것 같다며 병가를 내고, 냉 장로에 의해 뒷산에 요양하러 보내졌다.'); }
}

defineCharacter({
  id: 'leng_fei', name: '냉비', faction: 'mo', sex: 'f', age: 26, title: '집법당 순찰사',
  portrait: 'leng_fei', hidden: true,
  art: 'a stern and coldly beautiful female law-enforcement inspector of a demonic sect, an adult woman about 26: sharp elegant face, thin straight brows, cold grey eyes, '
    + 'pale skin, glossy black hair pulled into a tight high bun pinned with a plain black iron hairpin, immaculate black official robes with crimson trim and a high collar buttoned to the chin, '
    + 'spotless white gloves, a slim silver needle case and a small lacquered law-hall token at her belt, rigid upright posture, a faint fastidious frown as if something here is not clean enough',
  moodArt: {
    // 受控雾由 tools/art/thrall_mist.py 合成，这里不让模型画雾
    thrall: 'dazed and entranced: eyes unfocused and glassy, blank face, stiff posture slackened, lips slightly parted. Nothing around the head',
    // 情蛊：脸红花痴、妩媚；官袍换成轻薄的丝袍（成年人，雅致不露骨）
    smitten: 'helplessly infatuated: deeply blushing cheeks up to the ears, soft dreamy half-lidded eyes gazing at the viewer, a shy coquettish smile, head tilted, '
      + 'one hand (glove removed) twirling a loosened strand of hair that has slipped from her bun; her stiff high-collared robe is replaced by a lighter, thinner, loosely tied '
      + 'black-and-crimson silk robe that shows her collarbones and shoulders, tasteful and elegant, no cleavage, no lingerie, no nudity',
  },
  bio: '집법당 냉 장로의 조카딸, 새로 부임한 잡역 구역 순찰사. 철면피에 결벽증, 청렴해서 부정이라곤 통하지 않는다——그런데 벌레를 무서워한다. 그녀는 고충 사건 때문에 온 것이다.',
  intro: '고충 사건 때문에 부임한 새 순찰사.',
  savvy: 0.8, power: 58, eye: 3,
  traits: { greed: 0.05, integrity: 0.95, caution: 0.85 },
  start: { day: 1, node: 'arrive', chance: 1, cond: () => lawSwapDue() },
  // 校验工具用：模拟里替玩家把“给巡查下蛊被察觉”这件事做了
  trigger: () => { S.flags.guCaught = S.day - 2; },
  command: { label: '그녀가 네 문서철을 서류 맨 밑에 처박게 했다', run: () => { S.flags.enforcerOwned = true; addHeat(-20); return '냉비가 네 문서철을 선반에서 뽑아 맨 밑에 깔아놓고는, 손수건으로 손을 꼼꼼히 닦았다.'; } },
  on: {
    start: (st, p) => lengFeiTakeOffice(p),
    death: () => { log('집법당의 새 순찰사 냉비가 죽었다. 냉 장로가 크게 노해 잡역 구역을 며칠 동안 연거푸 뒤졌다.', 'loss'); addHeat(15); },
  },

  nodes: {
    arrive: {
      when: 'day', mood: 'sly',
      text: () => '문 앞으로 한 번도 본 적 없는 여순찰관이 들어왔다. 검은 바탕에 주홍 가장자리를 두른 관복을 턱까지 채우고, 흰 장갑에는 먼지 한 점 없었다. 들어오자마자 손수건으로 카운터를 닦고 나서야 집법당 명패 하나를 그 위에 탁 내려놓았다.'
        + '\n“집법당 새 잡역 구역 순찰사, 냉비.”목소리가 우물물처럼 차가웠다,“려한이 병가를 냈다——그가 돌아간 뒤로 날마다 가슴에 벌레가 기어다닌다고 소란을 피운다더군. 냉 장로께서 나를 보내 이어받게 했다.”'
        + '\n그녀가 소매에서 삼 촌짜리 은바늘을 꺼내 네 카운터 틈새를 쓱 훑더니, 황급히 손을 거두며 얼굴이 하얗게 질렸다:“잡역 구역에 고충 사건이 났다. 끝까지 파헤치겠다.”',
      choices: () => [
        { label: '공손하게 응한다', hint: '그녀가 너를 기록했다', run: (st, p) => {
          remember(p, '새 관리 부임 첫날, 너는 카운터 앞에서 공손하게 대답했다.', 3);
          return { text: '“그래야 할 것이다.”냉비는 장갑을 한 번 더 닦고 몸을 돌려 나갔다. 문 앞에 이르러서는 문지방을 한 번 돌아보았다——무언가 따라 나올까 두려운 듯.', go: ['probe', [4, 6]], summary: '집법당에서 새 순찰사 냉비가 왔다. 고충 사건을 위해 온 것이다.' };
        } },
        { label: '안신향 한 상자를 건넨다', hint: '그녀는 뒷돈을 받지 않는다', run: (st, p) => {
          remember(p, '새 관리 부임 첫날부터 너는 그녀에게 뭔가 건네려 했다.', -4);
          return { text: '냉비가 한번 보고는 향을 도로 밀어냈다:“치워라. 나는 이런 것에 넘어가지 않는다.”——밀어내다 말고 다시 집어 냄새를 맡았다:“……이 향은 꽤 좋군. 어디서 샀나?”', go: ['probe', [4, 6]], summary: '집법당에서 새 순찰사 냉비가 왔다. 부정이 통하지 않는 사람이다.', mood: 'angry' };
        } },
        ...(plantableGu().length ? [{ label: '소매 끝의 고충이 고개를 내밀게 한다', hint: '주시 +5；그녀는 이 장면을 기억할 것이다', run: (st, p) => {
          addHeat(5); remember(p, '너는 그녀가 보는 앞에서 고충 한 마리가 소매 끝에서 고개를 내밀게 했다.', -8, 'scared');
          return { text: '냉비가 "악" 소리와 함께 뒤로 세 걸음이나 뛰어 물러나 문 앞 우산꽂이를 엎었다. 그녀는 문틀을 붙잡고 자세를 가다듬으며 얼굴이 새빨갛게 달아올랐다:“你——두고 보자.”', go: ['probe', [3, 5]], summary: '너는 새로 온 순찰사 냉비를 놀라게 해 우산꽂이를 엎게 만들었다.', mood: 'afraid' };
        } }] : []),
      ],
    },
    // 은방울查蛊：铺里明处有蛊，铃就响
    probe: {
      when: 'day', mood: 'sly',
      text: () => '냉비가 또 왔다. 이번에는 허리에 은방울 하나를 더 달고——고충이 가까이 오면 저절로 울린다고 한다. 그녀는 네 카운터에서 한참 떨어져 서서 팔을 쭉 뻗어 방울을 내밀었다.',
      choices: () => {
        const shown = Object.values(S.items).filter(it => HELD(it) && ['gu', 'gu_egg', 'gu_venom'].includes(it.id) && it.pos.g !== 'hidden').length
          + S.machines.filter(m => m.type === 'gupot').length;
        return [
          { label: '그녀가 조사하게 둔다', hint: shown ? '가게 노골적인 곳에 고충이 있다: 주시 +12' : '가게 노골적인 곳에 고충이 없다', run: (st, p) => {
            if (shown) {
              addHeat(12); remember(p, '은방울이 네 가게에서 그칠 줄 모르고 울렸다.', -6);
              return { text: '은방울“딸랑딸랑”이 일제히 울렸다. 냉비의 얼굴이 순식간에 하얘졌고, 몇 자를 급히 적더니 거의 도망치듯 문을 나서며 말했다:“다시 오겠다!”', end: true, summary: '냉비의 은방울이 네 가게에서 울렸고, 그녀는 이 빚을 기록해두었다.', mood: 'afraid' };
            }
            remember(p, '은방울이 네 가게에서 한 번도 울리지 않았으니, 그녀가 너를 억울하게 만들었다.', 6);
            return { text: '은방울은 한 번도 울리지 않았다. 냉비가 의심스럽다는 듯 주위를 둘러보다가 방울을 거두며 드물게 고개를 끄덕였다:“……실례했다.”', end: true, summary: '냉비의 은방울이 네 가게에서 아무것도 찾아내지 못했다.' };
          } },
        ];
      },
    },
  },
});
