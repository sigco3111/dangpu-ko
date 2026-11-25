// 货品册：주안단。灵果与血灵芝在丹炉里炼出的养颜丹——不涨修为，女修、权贵、여우 요괴却抢着要；太平年景值钱，打起仗来没人顾得上脸
'use strict';

defineItem({
  id: 'zhuyan_dan', name: '주안단', cat: 'dan', w: 1, h: 1, base: 260, lux: true,
  art: "a single pearl-pink elixir pill with a faint peach-blossom pattern, resting on a tiny white jade dish beside a few pink peach petals, soft rosy glow",
  desc: '분홍 구슬 같은 단환에서 복숭아꽃 향이 난다. 먹으면 얼굴이 늙지 않는다——내문 사배도, 세가 소저도, 멋부리기 좋아하는 여우 요괴도 서로 가지려 한다. 수위는 오르지 않으니 싸움이 나면 값어치가 없다.',
  from: {
    sell: { xian: 1 },                         // 선문 여수사가 가끔 쓰지 않는 것을 가져다 바꾼다
    dealer: { league: 1 },                     // 산수 연맹에 가끔 한 배치가 들어온다
  },
  to: {
    wish: ['내문 사배', '복면 여수사', '여우 요괴', '세가 소저'],
    dealer: ['league'],
    order: ['heir'],                           // 소종주 일파가 아집을 베풀 때 필요하다
    restore: [0, 20],
  },
});

// 영과 두 알、혈영지 한 주：炼丹一重即可，比血煞丹好入门；丹火阵盘、丹引照样加持品相
defineRecipe({
  machine: 'danlu', in: [['spirit_fruit', 2], ['herb_blood', 1]], out: 'zhuyan_dan', tech: ['alchemy', 1], batches: 1,
  desc: '영과 두 알＋혈영지 한 주→주안단(연단 1중)',
});
