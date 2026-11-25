// 货品册：妖族的谢礼。妖族线人拿来换功勋的四样东西——都是妖族自己炼的、自己褪下的，不是从妖兽身上剥的（那种东西摆出来只会激怒妖族）。
// 外头几乎见不着，偶尔有妖族客人急用钱拿来卖；功勋价按一点约五六十灵石
'use strict';

// 천년 사퇴：蛇族自愿褪下的蜕，入药拔毒——第三样解毒的药，比血灵芝、回气丹贵，但不靠拾荒与货郎
defineItem({
  id: 'snake_slough', name: '천년 사퇴', cat: 'yao', w: 1, h: 2, base: 160,
  art: "a complete shed snakeskin from an ancient jade-green serpent spirit, translucent pale celadon scales with intact diamond pattern and a faint cyan shimmer, loosely coiled on a dark wooden tray",
  desc: '화형한 늙은 뱀 요괴가 벗어놓은 온전한 허물로 비늘 무늬가 고스란하고 푸른빛이 돈다. 가루 내어 먹으면 독을 뽑아내 바로 풀린다. 뱀족은 답례로만 줄 뿐 외인에게는 팔지 않는다.',
  from: {
    sell: { yao: 0.3 },
    merit: { yao: 3 },
  },
  to: {
    wish: ['낙패한 산수'],
    dealer: ['league'],
    cure: ['poisoned'],
  },
});

// 여화주：狐族的信物，太平年景权贵拿来作灯——奢侈珍玩，少宗主一系办雅集要
defineItem({
  id: 'fox_fire', name: '여화주', cat: 'wan', w: 1, h: 1, base: 480, lux: true,
  art: "a small clear glass orb holding a softly flickering ghostly blue-violet foxfire flame inside, resting on a carved dark rosewood stand with a tiny red silk tassel",
  desc: '호족이 수위를 응축한 검푸른 여우불을 유리구슬에 봉했다. 밤에도 꺼지지 않고 뜨겁지 않다. 권귀는 등불로 쓰고 내문 사배는 곳간 바닥에 깔아둔다——호족은 여우불을 주는 것이 너를 자기 사람으로 여긴다는 뜻이라 한다.',
  from: {
    sell: { yao: 0.3 },
    merit: { yao: 8 },
  },
  to: {
    wish: ['세가 소저', '내문 사배'],
    order: ['heir'],
  },
});

// 혈등 연갑：妖族匠人用老噬血藤编的甲——战备法器，开战后战堂订单要、魔宗弟子抢
defineItem({
  id: 'vine_armor', name: '혈등 연갑', cat: 'qi', w: 2, h: 2, base: 620, war: 0.7,
  art: "a supple vest of armor woven from dark crimson ancient blood-vine, tightly braided cords forming overlapping plates, faint red sap gleaming in the grooves, laid flat and slightly folded",
  desc: '만마굴 깊은 곳 천년 서혈등의 오래된 덩굴을 요족 장인이 부드럽게 주물러 엮은 연갑이다. 칼이 뚫기 어렵고 상처에 덩굴 즙이 닿으면 지혈도 된다. 싸움이 나면 마종 제자들이 서로 가지려 한다.',
  from: {
    sell: { yao: 0.2 },
    merit: { yao: 11 },
  },
  to: {
    wish: ['외문 제자'],
    order: ['war'],
  },
});

// 요원단：妖族长老给未化形的小妖固本的内丹——人族服炼也涨修为，仅次于筑基丹；丹房订单要，妖族客人心心念念
defineItem({
  id: 'yao_yuan_dan', name: '요원단', cat: 'dan', w: 1, h: 1, base: 820, war: 0.3,
  art: "a single round elixir pill of deep amber-gold with swirling silver moonlight veins and a faint wild green aura, resting on a broad green leaf beside a few drops of dew",
  desc: '요족 장로가 달빛 정기를 모으고 백초를 배합해 만든 내단으로, 아직 화형하지 못한 어린 요괴의 근본을 다지는 수련용이다. 인간이 먹어도 수위가 오르지만 영기에 야성이 섞여 있어 밤에 산속을 달리는 꿈을 꾸기 쉽다.',
  from: {
    sell: { yao: 0.2 },
    merit: { yao: 14 },
  },
  to: {
    wish: ['여우 요괴', '호랑이 요괴', '뱀 요괴'],
    order: ['dan'],
    cultivate: [80],
  },
});
