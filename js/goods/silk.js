// 货品册：灵蚕与云锦。一条两段的生产链：영잠종吃灵果吐出영사（散修联盟收、可零卖），六束영사织成一件운금 법의（权贵与少宗主一系的雅集抢着要）
'use strict';

// 영잠대：便宜、省力，但离不开灵果；御兽之术让蚕吐的丝更好
defineMachine({
  type: 'silkrack', name: '영잠대', price: 520, power: 2, in: [3, 2], out: [3, 2], cost: [3, 2], tech: 'beast', overflow: true,
  art: "a tall wooden silkworm rearing rack with several woven bamboo trays, pale glowing silkworms on mulberry leaves, white silk threads drifting, xianxia workshop",
  desc: '영잠종 한 알에 영과 두 알을 주면 영사 두 타래를 토한다. 밤마다 두 대. 재배술을 익히면 영사 여섯 타래로 운금 법의 한 벌을 짠다. 산출 칸이 가득 차면 바닥으로 넘친다.',
});

defineItem({
  id: 'silk_seed', name: '영잠종', cat: 'cai', w: 1, h: 1, base: 14,
  art: "a small round bamboo tray holding a sheet of paper dotted with tiny pale luminous silkworm eggs, a few fresh mulberry leaves",
  desc: '종이 한 장에 빼곡한 영잠 알이 희미한 빛을 낸다. 영잠대에 올리고 영과를 먹이면 영사를 토한다.',
  from: {
    supply: [16, -100], bulk: true,            // 행상이 상비, 재고 많음
    sell: { ren: 2 },                          // 범인 농가가 가져다 바꾼다
    gift: ['ren'],
  },
});

defineItem({
  id: 'silk', name: '영사', cat: 'cai', w: 1, h: 1, base: 40,
  art: "a neat skein of shimmering pale silver spirit silk thread wound around a small wooden spindle, faint moonlight sheen",
  desc: '영잠이 토한 실은 달빛 아래 은빛이 돌고 칼로도 끊기 어렵다. 산수는 법의를 깁는 데 쓰고 연기방은 검자루를 감는 데 쓴다. 여섯 타래면 운금 법의 한 벌을 짠다.',
  from: { sell: { ren: 1 } },
  to: { dealer: ['league'] },
});

defineItem({
  id: 'cloud_robe', name: '운금 법의', cat: 'wan', w: 2, h: 2, base: 700, lux: true,
  art: "an exquisitely folded xianxia robe of cloud-patterned brocade, iridescent pale blue and silver silk with woven auspicious clouds, faint protective light",
  desc: '영사로 짠 운금 법의는 구름 무늬가 빛을 따라 흐르고 보통 검기를 막는다. 권귀가 아집에 입고 가 체면을 세우고 선문 여수사도 아낌없이 돈을 쓴다. 태평한 시절에 가장 비싸다.',
  from: { sell: { xian: 0.3 } },               // 가끔 곤경에 처한 선문 제자가 가져와 맡긴다
  to: {
    wish: ['복면 여수사', '내문 사배'],
    order: ['heir'],                           // 소종주 일파의 주문
  },
});

// 第一段：蚕种吃灵果吐丝
defineRecipe({
  machine: 'silkrack', in: [['silk_seed', 1], ['spirit_fruit', 2]], out: 'silk', qty: 2, batches: 2,
  desc: '영잠종 한 알＋영과 두 알→영사 두 타래, 밤마다 두 대',
});

// 第二段：六束영사织云锦（要会栽培——养蚕缫丝本是农桑之事）
defineRecipe({
  machine: 'silkrack', in: [['silk', 6]], out: 'cloud_robe', tech: ['plant', 1], batches: 1,
  desc: '영사 여섯 타래→운금 법의(재배 1중)',
});
