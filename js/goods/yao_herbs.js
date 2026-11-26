// 货品册：花妖与蛛精的东西。曼陀罗、거미 독是两种新的“料”，거미줄、수선화 이슬进老设备的配方。
// 来路：曼殊、朱七娘、凌波这三位角色会给；平时鬼市、散修联盟偶有一批，万魔窟外围翻得到，曼陀罗也能自己在妖植盆里种
'use strict';

// ───────────── 曼陀罗：种出来的迷梦花粉 ─────────────

// 만다라화 씨앗：鬼市偷偷卖的妖花种子，种进妖植盆三夜开花，收一罐花粉
defineItem({
  id: 'datura_seed', name: '만다라화 씨앗', cat: 'zhi', w: 1, h: 1, base: 15,
  art: "a small handful of dark spiky datura seed pods, one split open showing black seeds, on a dark wooden tray",
  desc: '난장판 언덕가에서 만다라화가 맺은 가시 열매. 가르면 검은 씨앗이 한 움큼 나온다. 요식 화분에 심으면 사흘 밤이 지나 나팔 모양의 자줏빛 흰 큰꽃이 피고, 꽃술에서 꽃가루 한 통을 거둘 수 있다.',
  from: {
    dealer: { ghost: 2 },
    sell: { yao: 0.4 },
  },
  to: {},
});
YAO_SEEDS.datura_seed = ['datura_pollen', 34];
MACHINES.yaopot.inputs.push('datura_seed');
MACHINES.yaopot.desc += '만다라화 씨앗은 사흘 밤이면 꽃이 피어 꽃가루 한 통을 거둔다.';

// 만다라화 꽃가루：魔宗禁药里最阴的一味——不伤人，叫人在梦里把心事说出来
defineItem({
  id: 'datura_pollen', name: '만다라화 꽃가루', cat: 'zhi', w: 1, h: 1, base: 120, illicit: true, additive: 'dream',
  art: "a small sealed dark purple clay jar with its lid tilted open, fine shimmering pale gold pollen spilling over the rim, a single white-and-violet trumpet-shaped datura flower beside it",
  desc: '만다라화 꽃술에서 거둔 금빛 가루. 단맛이 느글거릴 정도다. 술, 단약, 과실에 섞으면 먹은 사람은 그날 밤 혼수상태로 잠들어 꿈속에서 묻는 말에 무엇이든 대답한다——숨겨둔 신분과 속에 품은 장사꺼리까지 전부 들려준다. 깨어나면 괴상한 꿈을 꿨을 뿐이라 여긴다. 마종 금약.',
  from: {
    dealer: { ghost: 1 },
    sell: { yao: 0.3 },
  },
  to: {
    wish: ['뱀 요괴'],
    dealer: ['ghost'],
  },
});

defineLace('dream', {
  name: '만다라화 꽃가루', verb: '만다라화 꽃가루가 섞인', detect: 0.3,
  desc: '먹은 사람은 그날 밤 혼수상태로 잠들어 꿈속에서는 무엇을 물어도 대답한다: 숨겨둔 신분까지 전부 들을 수 있다. 숨길 게 없는 이도 장사 소식 몇 마디는 중얼거린다. 깨어나면 괴상한 꿈을 꿨을 뿐이라 여긴다.',
  apply: (p, it, name, knew) => {
    p.health = (p.health || 100) - 5;
    if (knew) commitSin('harm', { p, w: 1, what: `만다라화로 ${p.name}에게서 비밀을 캐냈다`, virtue: 2 });
    if (p.secret && !p.secret.known) {
      p.secret.known = true;
      log(`${p.name}네 것을 먹은${name}，그날 밤 혼수상태로 잠들어 꿈속에서 자신이${p.secret.type}。`, 'gold');
    } else {
      makeIntel('market');
      log(`${p.name}네 것을 먹은${name}，꿈속에서 장사 얘기 몇 마디를 중얼거렸고, 너는 그것을 밀보 한 건으로 적어두었다.`, 'gold');
    }
    remember(p, `네 것을 먹은${name}，밤새 괴상한 꿈을 꾸었다.`, 0);
    return {};
  },
  onMe: it => { drain(10, 40); log(`${itemName(it)}에는 만다라화 꽃가루가 섞여 있었다. 너는 한나절 넘게 혼수상태로 잠들었고 깨어나니 머리가 깨질 듯 아팠다. 체력 -10、정신 -40。`, 'loss'); },
});

// ───────────── 蛛精：丝与毒 ─────────────

// 거미줄：比灵蚕丝韧十倍、亮十倍；三卷配三束灵丝就能织一件上好的云锦
defineItem({
  id: 'spider_silk', name: '거미줄', cat: 'cai', w: 1, h: 1, base: 85,
  art: "a neat coiled skein of glittering fine silver spider silk thread, almost translucent and shining like moonlight, wound on a small dark wooden spindle",
  desc: '거미요정이 뿜은 실. 한 가닥으로 무쇠솥 하나를 매달 수 있고 달빛 아래에서 눈부시게 빛난다. 거미줄 세 꾸러미에 영사 세 다발을 맞추면 영잠대에서 훌륭한 운금 법의 한 벌을 짜낼 수 있다.',
  from: {
    loot: { beastcave: 2 },
    dealer: { ghost: 2 },
    sell: { yao: 0.4 },
  },
  to: {
    dealer: ['league'],
    order: ['heir'],
  },
});

// 灵蚕架：거미줄 세 꾸러미、영사 세 다발 → 云锦法衣，比纯灵丝的出品更精（排在纯灵丝那条前头）
defineRecipe({
  machine: 'silkrack', in: [['spider_silk', 3], ['silk', 3]], out: 'cloud_robe', tech: ['plant', 1], q: 15, first: true,
  desc: '거미줄 세 꾸러미＋영사 세 다발→운금 법의(재배 1단계, 품상 +15）',
});

// 거미 독：不要命，叫人手脚发麻——截杀、上擂台之前下一点，事半功倍
defineItem({
  id: 'spider_venom', name: '거미 독', cat: 'yao', w: 1, h: 1, base: 70, illicit: true, additive: 'numb',
  art: "a small stoppered glass vial of thick dark crimson venom with a faint green sheen, beside a curved black spider fang, on a dark cloth",
  desc: '거미정 독주머니에서 짜낸 독액. 음식에 섞으면 먹은 사람은 온몸이 저리고 손발에 힘이 풀려 며칠 동안 겨루기와 싸움에서 크게 밀린다; 다만 독성이 약해 며칠 지나면 저절로 풀린다. 마종 금약.',
  from: {
    loot: { beastcave: 2 },
    dealer: { ghost: 1 },
  },
  to: {
    dealer: ['ghost'],
  },
});

defineLace('numb', {
  name: '거미 독', verb: '거미 독을 탔다', detect: 0.35,
  desc: '먹은 사람은 온몸이 저리고 손발에 힘이 풀려 며칠 동안 겨루기와 싸움에서 밀린다(독성이 약해 며칠이면 저절로 풀리고 치명적이지는 않다). 매복 살인이나 비무대 전에 조금 타두면 적은 수고로 큰 효과를 본다.',
  apply: (p, it, name, knew) => {
    // 只叫人发麻、不叫人送命：已经中着毒的不再加重
    if (!condSev(p, 'poisoned')) addCond(p, 'poisoned', 1, `거미 독이 섞인 것을 먹은${name}`);
    if (knew) commitSin('harm', { p, w: 1, what: `${p.name}에게 거미 독을 탔다`, virtue: 3 });
    remember(p, `네 것을 먹은${name}，며칠 동안 온몸이 저렸다.`, 0);
    return {};
  },
  onMe: it => { if (!condSev('me', 'poisoned')) addCond('me', 'poisoned', 1, `${itemName(it)}속에 거미 독이 든`); },
});

// ───────────── 水仙：花露 ─────────────

// 수선화 이슬：驻颜丹的好引子，也能镇走火入魔
defineItem({
  id: 'narcissus_dew', name: '수선화 이슬', cat: 'cai', w: 1, h: 1, base: 90,
  art: "a slender white jade bottle of clear glistening flower dew, a few white narcissus blossoms with golden cups resting beside it, tiny droplets of water on the petals",
  desc: '수선화 요괴가 새벽에 꽃잎 위에 맺은 이슬. 맑아서 사람 그림자가 비칠 정도다. 단로에 한 병 넣으면 주안단이 한 가마에 두 알 나오고, 마시면 마음이 맑아져 주화입마를 가라앉힐 수 있다.',
  from: {
    dealer: { league: 1 },
    sell: { yao: 0.3 },
  },
  to: {
    wish: ['내문 사배', '세가 소저'],
    dealer: ['league'],
    cure: ['deviation'],
  },
});

// 丹炉：花露一瓶、영과 두 개、혈영지 한 뿌리 → 驻颜丹两颗（排在普通驻颜丹那条前头）
defineRecipe({
  machine: 'danlu', in: [['narcissus_dew', 1], ['spirit_fruit', 2], ['herb_blood', 1]], out: 'zhuyan_dan', qty: 2, tech: ['alchemy', 1], first: true,
  desc: '수선화 이슬 한 병＋영과 두 개＋혈영지 한 뿌리→주안단 두 알(연단 1단계)',
});
