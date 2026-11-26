// 货品册：补薄的品类。灵饮、蛊虫、灵宠原先各只有两样，妖族最爱的灵饮只有水和酒；仙门客人能买的珍玩也少。
// 这里补上：两样喝的（茶、원후주）和一样酿的（취선주）、两只现成的蛊、两种新灵宠（灵雀叼消息、灵猫卖给权贵）、两件雅玩、一张保命的符
'use strict';

// ───────────── 灵饮 ─────────────

// 운무 영차：最便宜的灵饮，凡人、散修、仙门弟子天天喝；货郎常备，仙门客人也常拿来换钱
defineItem({
  id: 'tea_cloud', name: '운무 영차', cat: 'yin', w: 1, h: 1, base: 36,
  art: "a small round unglazed clay tea caddy with its lid set aside, filled with curled emerald-green spirit tea leaves, a faint wisp of white mist drifting up from the leaves, a few loose leaves beside it",
  desc: '선산 운무 속에서 따온 영차. 한 주전자 우리면 맑은 향기가 방안에 가득하고, 마시면 귀와 눈이 밝아진다(정신 +12）。돈은 안 되지만 범인, 산수, 선문 제자가 날마다 찾는다.',
  from: {
    supply: [40, -100], bulk: true,
    sell: { xian: 2, ren: 1 },
    gift: ['xian'],
  },
  to: {
    wish: ['유방 검객'],
    dealer: ['league'],
    restore: [0, 12],
  },
});

// 원후주：万魔窟里猿猴把野果藏进树洞自己发酵的酒——拾荒偶得，妖族客人也会拿来卖；호랑이 요괴最好这一口
defineItem({
  id: 'monkey_wine', name: '원후주', cat: 'yin', w: 1, h: 2, base: 150, lux: true,
  art: "a rough dried bottle gourd used as a wine vessel, its mouth plugged with a wad of green leaves, crushed wild berries and fruit pulp crusted around the opening, a drip of amber wine running down its side, rustic and wild",
  desc: '만마굴의 영원이 갖가지 야생 과실을 나무 구멍에 숨겨 스스로 빚어낸 술. 표주박에 담으면 한 통이다. 독한 술에 과실 향이 배어 마시면 온몸에 열이 오른다(체력 +20、정신 +10）。호랑이 요괴가 이걸 제일 좋아한다.',
  from: {
    loot: { beastcave: 1.5 },
    sell: { yao: 1 },
  },
  to: {
    wish: ['호랑이 요괴', '낙패한 산수'],
    restore: [20, 10],
  },
});

// 취선주：灵酒里泡一朵迷魂花，一夜即成——喝了飘飘欲仙一整夜，却不似忘忧散那样离不得；权贵和여우 요괴抢着要
defineItem({
  id: 'drunk_immortal', name: '취선주', cat: 'yin', w: 1, h: 2, base: 320, lux: true,
  art: "a slender pale celadon porcelain wine flask with a red silk tassel tied at its neck, a faint violet floral haze curling out of the open mouth, a few purple flower petals scattered at its base",
  desc: '영주 한 통에 미혼화 한 송이를 담그고 하룻밤 밀봉하면 완성. 입안에는 꽃향기, 마시면 밤새 아득히 신선이 된 듯하다(체력 +10、정신 +30），깨어나도 중독되지 않는다. 소종주의 아회에는 빠질 수 없는 물건이라 여우 요괴는 냄새를 맡고 찾아온다.',
  to: {
    wish: ['여우 요괴', '내문 공자'],
    order: ['heir'],
    restore: [10, 30],
  },
});

// 灵酒坛：영주 한 통＋미혼화 한 송이→취선주（酿酒一重）。花香浸酒，一夜即成，不用另封两夜
defineRecipe({
  machine: 'winejar', in: [['spirit_wine', 1], ['mihun_flower', 1]], out: 'drunk_immortal', tech: ['brew', 1], first: true,
  desc: '영주 한 통＋미혼화 한 송이→취선주(양조 1단계, 하룻밤이면 완성)',
});
MACHINES.winejar.desc += '양조 1단계를 익히면 영주 한 통에 미혼화 한 송이를 담가 하룻밤이면 취선주가 된다.';

// ───────────── 蛊虫 ─────────────

// 정고：现成炼好的一对蛊，不必自己养——鬼市有一批，妖族客人偶尔拿来卖；세가 소저、장로 일가暗地里求
defineItem({
  id: 'love_gu', name: '정고', cat: 'gu', w: 1, h: 1, base: 280, lux: true, additive: 'love',
  art: "a pair of tiny crimson and rose-pink gu insects entwined together inside a small open red lacquer box lined with silk, a faint rosy glow around them",
  desc: '암수 한 쌍이 한마음으로 태어난 작은 고. 수컷 고를 음식에 섞으면 그것을 먹은 사람의 마음이 암컷 고를 지닌 사람에게 매인다——평생 단 한 명의 성년 여자만을 주인으로 섬긴다. 그녀가 죽으면 암컷 고를 지닌 사람도 살 수 없다. 고를 기르는 사람은 고충 정통 3단계가 되어야 음식에 섞어 넣을 수 있고, 역시 3단계일 때 미혼화를 금잠에게 먹여 만들어진다. 세가 소저와 장로 일가가 몰래 고가를 부르며 구하고, 귀시도 거절 없이 받는다.',
  from: {
    dealer: { ghost: 1 },
    sell: { yao: 0.4 },
  },
  to: {
    wish: ['세가 소저', '장로 일가'],
    dealer: ['ghost'],
  },
});

// 자모 전음고：母蛊听得见子蛊身边的话——暗桩、细作最要的东西；鬼市出货也收货
defineItem({
  id: 'echo_gu', name: '자모 전음고', cat: 'gu', w: 1, h: 1, base: 200,
  art: "two small matching black glazed porcelain jars, one large and one small, lids off, each holding a slender jade-green gu insect with long antennae, the two insects turned toward each other",
  desc: '크고 작은 두 마리의 고. 새끼 고를 누구 곁에 숨겨두면 어미 고가 그곳의 말을 한 글자도 빠뜨리지 않고 전해주어 십 리를 사이에 두어도 들린다. 첩자와 잠복 조력자가 가장 탐내는 물건이다.',
  from: {
    dealer: { ghost: 1 },
    sell: { mo: 0.4 },
  },
  to: {
    wish: ['복면 여수사', '내문 사배'],
    dealer: ['ghost'],
  },
});

// ───────────── 灵宠 ─────────────

// 전서 영작：吃灵草种、灵果；长到一半后夜里飞出去，偶尔叼回一张写着行情的纸条（每夜至多一张）
defineItem({
  id: 'spirit_sparrow', name: '전서 영작', cat: 'chong', w: 1, h: 1, base: 110,
  art: "a small sparrow-like spirit bird with jade-green and white plumage and bright black eyes, a tiny rolled paper message tied to one leg with red thread, perched alert",
  desc: '영수 우리에서 기른다: 매일 밤 영초 씨앗 한 개나 영과 하나를 쪼아 먹는다. 반쯤 자란 뒤에는 밤에 날아가 담장 아래 대화를 엿듣고, 가끔 시세가 적힌 쪽지를 물어온다(밀보 한 건, 하룻밤에 최대 한 장). 성체 두 마리가 있으면 새끼를 부화시킬 수 있다.',
  from: {
    supply: [125, 0],
    sell: { xian: 0.5, ren: 0.5 },
  },
  to: {
    wish: ['범인 행상'],
  },
});

// 옥면 영묘：吃灵兽饲料、腐骨；不产东西，只管长、配种——小猫卖给权贵，太平年景最值钱
defineItem({
  id: 'jade_cat', name: '옥면 영묘', cat: 'chong', w: 1, h: 1, base: 200, lux: true,
  art: "an elegant white spirit cat sitting gracefully with its tail curled around its paws, a jade-green mask-like marking across its face, luminous jade-green eyes",
  desc: '영수 우리에서 기른다: 매일 밤 영수 사료 한 개나 썩은 뼈를 먹고, 아무것도 생산하지 않으며 그저 곱기만 하다. 성체 두 마리가 있으면 가끔 새끼 고양이 한 배를 낳는다——세가 소저와 내문 공자가 앞다투어 한 마리 데려가려 한다. 태평성대에 가장 값어치가 있다.',
  from: {
    sell: { yao: 0.4, ren: 0.3 },
  },
  to: {
    wish: ['세가 소저', '내문 공자', '장로 일가'],
    order: ['heir'],
  },
});

PET_FOOD.spirit_sparrow = ['herb_seed', 'spirit_fruit'];
PET_FOOD.jade_cat = ['beast_feed', 'bones'];
// 灵雀：每夜所有灵雀合起来至多叼回一张纸条；御兽之术越高，叼回来的越勤
PET_YIELD.spirit_sparrow = () => {
  if (S.sparrowDay === S.day) return null;
  S.sparrowDay = S.day;
  if (Math.random() >= 0.15 + 0.05 * techLv('beast')) return null;
  return makeIntel('market') ? '영작이 쪽지 한 장을 물어왔다(밀보)' : null;
};
PET_YIELD.jade_cat = () => null;
// 灵猫一窝难得：添丁的机会只有寻宝鼠的四成
PET_BREED.jade_cat = 0.12;
MACHINES.pen.inputs.push('herb_seed');
MACHINES.pen.desc += '전서 영작은 영초 씨앗과 영과를 쪼아 먹고 밤에 가끔 밀보를 물어오며, 옥면 영묘는 영수 사료와 썩은 뼈를 먹고 자라고 번식만 한다.';

// ───────────── 珍玩 ─────────────

// 초미 고금：宗门废墟里偶尔挖得出，落难的仙门弟子也会拿来典当——权贵与仙门客人都认这种雅物
defineItem({
  id: 'jiaowei_qin', name: '초미 고금', cat: 'wan', w: 1, h: 3, base: 650, lux: true,
  art: "an antique seven-string guqin zither standing upright and seen straight on from the front, its whole flat soundboard face visible with all seven pale silk strings running down its full length and a row of small mother-of-pearl inlay dots beside them, gently waisted outline, dark lacquered paulownia wood with fine crackle patina, the bottom tail end charred black by old fire",
  desc: '거문고 꼬릿단 한 자락이 시꺼멓게 탄 것은 예년에 불길 속에서 건져낸 오래된 오동나무이기 때문이다. 줄을 한 번 튕기면 여운이 반나절 동안 들보에 감돈다. 세가 소저와 유방 검객이 모두 알아보는 고아한 물건이라 소종주도 아회를 열 때 한 대 걸어놓는다.',
  from: {
    loot: { ruins: 0.7 },
    sell: { xian: 0.8 },
  },
  to: {
    wish: ['세가 소저', '유방 검객'],
    order: ['heir'],
  },
});

// 교주：鲛人泣泪所化——妖族客人手里才有，妖族线人也拿它换功勋；仙门女修、权贵都爱
defineItem({
  id: 'jiao_pearl', name: '교주', cat: 'wan', w: 1, h: 1, base: 360, lux: true,
  art: "a single large luminous pearl with a soft blue-green inner glow resting in a small open seashell, a few drops of seawater beside it",
  desc: '남해 교인이 흘린 눈물이 굳은 구슬. 밤에 스스로 빛나고 만지면 서늘하다. 요족이 신물로 삼는 귀물로 바깥에서는 보기 어렵다. 복면 여수사와 세가 소저가 모두 좋아한다.',
  from: {
    sell: { yao: 0.6 },
    merit: { yao: 6 },
  },
  to: {
    wish: ['복면 여수사', '세가 소저'],
    order: ['heir'],
  },
});

// ───────────── 符箓 ─────────────

// 둔토부：拾荒遇险时自动燃尽、带你钻地脱身（库房里备着一张就算），省下伤病与罚钱；散修联盟有卖，符案也画得出
defineItem({
  id: 'fu_dundi', name: '둔토부', cat: 'fu', w: 1, h: 1, base: 85, war: 0.5,
  art: "a yellow paper talisman painted with earth-brown cinnabar runes in the shape of a mountain sigil, a few grains of dark soil and iron grit clinging to it, its lower edge sinking into a small mound of earth",
  desc: '현철 모래에 주사를 개어 그린 둔토부. 창고에 한 장 챙겨두면 나가서 폐품을 주울 때 몸에 지니게 된다: 위험을 만나면 부적이 타들어가며 사람은 흙속으로 파고들고, 다시 고개를 내밀 때는 이미 삼 리 밖——다치지도 벌받지도 않지만, 이번 일은 여기까지다.',
  from: {
    dealer: { league: 2 },
  },
  to: {
    wish: ['낙패한 산수'],
    dealer: ['league'],
  },
});

// 符案：부적 종이＋주사＋현철광→둔토부（符箓一重），一夜两张
defineRecipe({
  machine: 'fudesk', in: [['fu_paper', 1], ['cinnabar', 1], ['iron_ore', 1]], out: 'fu_dundi', tech: ['talisman', 1], batches: 2,
  desc: '부적 종이＋주사＋현철광→둔토부(부록 1단계, 매일 밤 두 장)',
});
MACHINES.fudesk.desc += '부록 1단계에서 현철광을 더하면→둔토부.';
