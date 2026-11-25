// 人物：每位来客都是有名有姓、有记忆、有人生轨迹的人；派系与好感决定说话的语气
'use strict';

// ───────────── 名字与身世 ─────────────

// 名字分男女：m 男、f 女、n 都可
const NAMES = {
  ren:  { sur: '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦许何吕张孔曹',
          m: ['铁柱', '大牛', '长生', '石头', '满仓', '春生', '狗剩', '有福'], f: ['二丫', '秀娘', '小蛮', '翠花', '桂枝', '月娥', '巧儿'], n: ['三', '七', '九'] },
  mo:   { sur: '厉屠阎鬼冷司徒万俟慕容独孤',
          m: ['枭', '煞', '烬', '断魂', '戮', '无涯', '狂刀'], f: ['红绡', '媚娘', '血蝶', '幽兰', '蛇姬', '绯烟'], n: ['寒', '离', '九幽', '血衣'] },
  xian: { sur: '云林沈顾谢苏白萧陆',
          m: ['青崖', '长风', '怀瑾', '玄素', '承影'], f: ['望舒', '听雪', '若兰', '清漪', '素心'], n: ['清和', '若尘', '知微'] },
  yao:  { sur: '胡白黄柳灰',
          m: ['二郎', '老七', '阿蛮', '大虎', '黑山'], f: ['三娘', '小妹', '五姑', '玉娘', '青青'], n: ['九', '十四', '青'] },
};

const BIOS = {
  落魄散修: ['早年也是一方散修，伤了根基，如今靠变卖家当度日。', '据说年轻时跟人争过一处灵脉，输了半条命。'],
  凡人行商: ['走南闯北贩些杂货，算盘打得比谁都精。', '家里还有个病弟弟，赚的钱一半换了药。'],
  杂役少年: ['父母死在魔宗矿上，一个人在杂役区讨生活。', '每天挑水劈柴，夜里偷偷练一套不知哪儿捡来的吐纳法。'],
  游方剑客: ['自称游方剑客，可那身剑意清正得不像魔道中人。', '腰间总有意无意地遮着什么。'],
  蒙面女修: ['从不以真面目示人，出手极阔绰。', '说话滴水不漏，像是在找什么人。'],
  外门弟子: ['血煞宗外门弟子，天天盼着进内门。', '仗着魔宗身份在杂役区横着走。'],
  内门师姐: ['内门弟子，眼界极高，寻常货色入不了她的眼。', '据说师尊是执法堂的长老。'],
  内门师兄: ['内门弟子，眼界极高，寻常货色入不了他的眼。', '据说师尊是执法堂的长老。'],
  蒙面修士: ['从不以真面目示人，出手极阔绰。', '说话滴水不漏，像是在找什么人。'],
  杂役少女: ['父母死在魔宗矿上，一个人在杂役区讨生活。', '每天挑水洗衣，夜里偷偷练一套不知哪儿捡来的吐纳法。'],
  狐妖: ['化形不久的狐妖，鼻子灵得很。', '混在杂役区打听同族的下落。'],
  虎妖: ['山里来的虎妖，力大无穷，脾气也大。', '欠了人情一定要还，欠了仇也一样。'],
  蛇妖: ['阴柔寡言的蛇妖，记性极好。', '对丹药有种说不出的执念。'],
};

function genName(faction, sex = 'm') {
  const n = NAMES[faction];
  return pick([...n.sur]) + pick(Math.random() < 0.25 ? n.n : n[sex]);
}

// ───────────── 面孔与性别 ─────────────

// 泛泛之辈的面孔：每种身份几张脸（底图、_f1、_f2），同一个人始终是同一张
const FACES = 3;
// 底图被故事人物占用的身份，路人只用另画的两张脸，免得撞脸
const STORY_FACES = new Set(['ren_kid', 'ren_merchant', 'xian_defector', 'xian_spy', 'mo_disciple', 'mo_senior', 'yao_fox', 'noble']);
// 每张脸画的是男是女（与 assets/chars 的写实图对应）
const FACE_SEX = {
  steward_sun: 'f', mo_senior: 'f', mo_disciple_f2: 'f', ren_cultivator_f2: 'f', ren_merchant_f2: 'f', xian_defector_f2: 'f',
  xian_spy: 'f', xian_spy_f1: 'f', xian_spy_f2: 'f', yao_fox: 'f', yao_fox_f1: 'f', yao_fox_f2: 'f', yao_tiger_f2: 'f', yao_snake: 'f', noble_f2: 'f',
};
// 同一身份，男女叫法不同
const TITLE_SEX = { 内门师姐: { m: '内门师兄' }, 蒙面女修: { m: '蒙面修士' }, 杂役少年: { f: '杂役少女' } };
const NOBLE_TITLE = { m: ['内门公子', '长老亲眷'], f: ['世家小姐', '长老亲眷'] };

function faceKey(portrait, face) {
  if (face == null) return portrait;
  const f = STORY_FACES.has(portrait) ? 1 + (face % (FACES - 1)) : face % FACES;
  return f ? `${portrait}_f${f}` : portrait;
}
function faceOf(p) { return !p ? null : p.story || p.official ? p.portrait : faceKey(p.portrait, p.face); }
const sexOf = p => p && p.sex || FACE_SEX[faceOf(p)] || 'm';
const ta = p => sexOf(p) === 'f' ? '她' : '他';

// 文字随性别：说的是某人，就把“他”换成“她”；说话人的自称也随之变
function gx(p, text) { return sexOf(p) === 'f' ? String(text).replace(/他(?!们)/g, '她') : text; }
const SPEECH_SWAP = { f: [['老子', '老娘'], ['婆娘', '当家的'], ['本少爷', '本小姐'], ['本公子', '本小姐']], m: [['本姑娘', '本大爷']] };
function speechAs(p, text) {
  for (const [a, b] of SPEECH_SWAP[sexOf(p)] || []) text = String(text).split(a).join(b);
  return text;
}

// ───────────── 人物档案 ─────────────

function initPeople() {
  S.people = S.people || {};
  S.nextPid = S.nextPid || 1;
  S.story = S.story || {};
  S.flags = Object.assign({ rentMul: 1, deedMul: 1, inspectMul: 1, landlord: 'qian' }, S.flags || {});
  // 旧存档：补上性别，称谓随脸改
  for (const p of Object.values(S.people)) {
    if (p.sex) continue;
    p.sex = FACE_SEX[faceOf(p)] || 'm';
    p.title = (TITLE_SEX[p.title] || {})[p.sex] || p.title;
    if (p.noble && p.sex === 'f' && p.title === '内门公子') p.title = '世家小姐';
    if (p.noble && p.sex === 'm' && p.title === '世家小姐') p.title = '内门公子';
  }
}

function newPerson(faction, opts = {}) {
  const [portrait, title0] = opts.portrait ? [opts.portrait, opts.title] : pick(PORTRAITS[faction]);
  // 先定脸，再按脸定性别、名字与称谓
  let face = opts.portrait && !opts.anyFace ? null : rint(0, FACES - 1);
  // 被角色占用的脸，路人换一张
  for (let k = 0; face != null && k < FACES && RESERVED_FACES.has(faceKey(portrait, face)); k++) face = (face + 1) % FACES;
  const sex = opts.sex || FACE_SEX[faceKey(portrait, face)] || 'm';
  const title = (TITLE_SEX[title0] || {})[sex] || title0;
  const p = {
    pid: opts.pid || `p${S.nextPid++}`, name: opts.name || genName(faction, sex), faction, portrait, title, sex,
    savvy: opts.savvy != null ? opts.savvy : clamp(SAVVY[faction] + rnd(-0.15, 0.2), 0.05, 0.9),
    aff: opts.aff || 0, visits: 0, lastDay: 0, mem: [], life: [], status: 'alive',
    bio: opts.bio || pick(BIOS[title] || ['杂役区的过客。']), budgetMul: 1, story: opts.story || null,
  };
  if (face != null) p.face = face;
  S.people[p.pid] = p;
  initTraits(p);
  return p;
}

const personOf = c => c && c.pid ? S.people[c.pid] : null;

// 记下一件事。kind 用于日后的回忆台词；a 为好感变化
function remember(p, text, a = 0, kind = null) {
  if (!p) return;
  // 中了蛊的人多半不记你的仇；情蛊的那位好感锁在顶上，什么都不往心里去
  if (a < 0 && guShrug(p)) a = 0;
  p.aff = p.loveGu ? 100 : clamp(Math.round(p.aff + a), -100, 100);
  p.mem.push({ d: S.day, t: gx(p, text), a, k: kind });
  if (p.mem.length > 30) p.mem.shift();
}

function lifeNote(p, text) { p.life.push({ d: S.day, t: gx(p, text) }); }

function mood(aff) {
  return aff <= -40 ? 'hostile' : aff <= -10 ? 'cold' : aff < 25 ? 'neutral' : aff < 55 ? 'warm' : 'close';
}
const MOOD_NAME = { hostile: '仇视', cold: '冷淡', neutral: '平平', warm: '友善', close: '亲厚' };

// 选一位熟客或新人。熟客越多、越熟，越常回头
// 某一族里谁会来：按各人的来访意愿挑（见 visitScore），没人想来就是生面孔
function pickPerson(faction) {
  const today = (S.queue || []).map(c => c.pid);
  const regulars = Object.values(S.people).filter(p => (!p.story || castRegular(p)) && !p.official && p.faction === faction && !today.includes(p.pid))
    .map(p => [p, visitScore(p)]).filter(x => x[1] > 0);
  const total = Object.values(S.people).filter(p => !p.story).length;
  if (regulars.length && (total >= 28 || Math.random() < Math.min(0.65, 0.12 * regulars.length))) return weighted(regulars);
  return newPerson(faction);
}

// 来客落座：套用这个人的档案、好感带来的耐心变化与礼物
function seatPerson(c, p) {
  Object.assign(c, { pid: p.pid, name: p.name, portrait: p.portrait, title: p.title, savvy: p.savvy });
  c.budget = Math.round(c.budget * p.budgetMul);
  c.patience = clamp(c.patience + (p.aff >= 30 ? 1 : 0) - (p.aff <= -30 ? 1 : 0), 1, 5);
  c.returning = p.visits > 0;
  c.refuse = p.aff <= -60;
}

function arrivePerson(c) {
  const p = personOf(c);
  if (!p) return;
  p.visits++;
  p.lastDay = S.day;
  // 亲厚的熟客偶尔捎点东西或消息
  if (p.aff >= 55 && !c.refuse && Math.random() < 0.25 && S.day - (p.giftDay || 0) >= 5) {
    p.giftDay = S.day;
    if (Math.random() < 0.5) {
      const id = pick(GIFTS[p.faction]);
      const it = makeItem(id, { q: rint(55, 85) });
      stow(it); c.gift = itemName(it); log(`${p.name}送了你一件${itemName(it)}。`, 'gain');
    } else if (customerTip(c)) {
      c.tip = true;
      log(`${p.name}悄悄提醒你：执法堂的人今天就要来。`, 'gain');
    }
  }
}

const GIFTS = {
  ren: ['herb_dew', 'spirit_fruit', 'iron_ore', 'yeast'],
  mo: ['demon_charm', 'iron_ingot', 'bones'],
  xian: ['pill_qi', 'filter_sand', 'spirit_crystal'],
  yao: ['spirit_fruit', 'herb_blood', 'herb_dew'],
};

// ───────────── 语气 ─────────────

const ADDRESS = { ren: '掌柜的', mo: '开铺的', xian: '店家', yao: '人族小掌柜' };

const VOICE = {
  ren: {
    first: ['掌柜的，头一回来您这儿，多照应着点。', '听隔壁王婶说您这儿公道，俺就来了。'],
    hostile: ['要不是别处没得去，俺才不进你这黑店。', '哼，又是你。'],
    cold: ['掌柜的。', '……来做个买卖，别的不说。'],
    neutral: ['掌柜的，忙着呢？', '掌柜的，又来叨扰了。'],
    warm: ['掌柜的！今儿气色真好。', '哎呀掌柜的，几天不见，想着您呢。'],
    close: ['掌柜的，自家人不说两家话。', '掌柜的，俺娘还念叨您的好呢。'],
    sell: ['这{item}您给瞧瞧，{ask} 灵石，成不？', '家里揭不开锅了，这{item}换 {ask} 灵石，行行好。'],
    buy: ['想寻些{cat}，手头紧，您给个实在价。', '有{cat}没？俺攒了好些日子的灵石。'],
    qty: ['得要{n}才够使。', '要{n}，您给凑凑。'],
    qtyOne: ['{n}就够。'],
    attracted: ['您柜上那{cat}，俺瞅了半天，心痒痒。'],
    appraise: ['这{item}是祖上传下的，您给掌掌眼，是真是假？酬金 {fee} 灵石。'],
    contra: ['（左右张望）这{item}……不知哪来的，{ask} 灵石，您收了吧，俺可不敢留。'],
    stolen: ['来路嘛……您就别多问了。'],
    counterSell: '太贵了掌柜的，{n} 灵石，再多俺真掏不出了。',
    counterBuy: '{n} 灵石，再少俺就亏到家了。',
    leave: '算了算了，俺再去别家问问。',
    refuse: '你这黑心铺子，俺宁可饿死也不跟你做买卖！',
    gift: '自家地里的，给您捎了一件{gift}，别嫌弃。',
    crave: '（他眼窝深陷，手指不停地搓着）掌柜的，那个……忘忧的……还有么？多少钱俺都给。',
    wish: '您柜上那{item}，俺惦记好久了！',
    wishAsk: '掌柜的，您这儿可有{item}？俺惦记好久了。',
    tip: '（压低声音）掌柜的，执法堂的人一会儿就到，您先收拾收拾。',
  },
  mo: {
    first: ['你就是新来的开铺的？老子先看看你这铺子有没有好货。', '哟，杂役区又开了间铺子。'],
    hostile: ['哼，敢在老子面前耍花样的，坟头草都三尺高了。', '又是你这找死的。'],
    cold: ['少废话。', '开铺的，别耽误老子工夫。'],
    neutral: ['开铺的，来笔买卖。', '小子，生意还行？'],
    warm: ['开铺的，你小子还算上道。', '哈，又见面了，今天有什么好东西？'],
    close: ['兄弟，以后在杂役区有人找你麻烦，报老子名号。', '自己人，给个实在价，老子也不亏你。'],
    sell: ['这{item}，{ask} 灵石，爱收不收。', '老子缺灵石，{item}，{ask}，痛快点。'],
    buy: ['有{cat}没？要够劲的，别拿破烂糊弄老子。', '老子要{cat}，有好货就拿出来。'],
    qty: ['要{n}，少了不行。', '老子要{n}。'],
    qtyOne: ['{n}就行。'],
    attracted: ['你柜上那{cat}不错，拿来看看。'],
    appraise: ['这{item}是从一个死人身上摸来的，给老子看看真假，酬金 {fee}。'],
    contra: ['（冷笑）仙门那帮伪君子的{item}，{ask} 灵石，你敢收么？'],
    stolen: ['别问哪来的，问就是捡的。'],
    counterSell: '{n}，再多老子就去抢了。',
    counterBuy: '{n}，少一个子儿老子拆了你的铺子。',
    leave: '呸，浪费老子工夫。',
    refuse: '你也配跟老子做买卖？滚！',
    gift: '前日宰了个不长眼的，这件{gift}赏你了。',
    crave: '（他打了个哈欠，眼泪鼻涕一起流）少废话，那玩意儿，有多少要多少。',
    wish: '你柜上那{item}，老子要了！',
    wishAsk: '开铺的，有没有{item}？老子找了好几家了。',
    tip: '执法堂的人在隔壁街了，你那些见不得人的东西，藏好。',
  },
  xian: {
    first: ['店家，在下初到此地，叨扰了。', '（压低斗笠）店家，借一步说话。'],
    hostile: ['店家的为人，在下已领教过了。', '……若非事急，在下不会再踏入此门。'],
    cold: ['店家。', '只谈买卖，不谈其他。'],
    neutral: ['店家，又来叨扰。', '店家，近来可好？'],
    warm: ['店家是这魔窟里难得的明白人。', '与店家打交道，倒是比与那些魔修省心。'],
    close: ['道友，若有一日正道光复，在下必不忘今日之情。', '道友，此处说话方便么？'],
    sell: ['此物{item}，{ask} 灵石，不必多问来历。', '{item}一件，{ask} 灵石。在下急用。'],
    buy: ['在下想寻些{cat}，价钱好说。', '店家这里可有{cat}？需品相上乘的。'],
    qty: ['需{n}。', '烦请备齐{n}。'],
    qtyOne: ['{n}足矣。'],
    attracted: ['柜上那{cat}，倒有几分灵气。'],
    appraise: ['这{item}来历蹊跷，烦请店家一辨真伪，酬金 {fee} 灵石。'],
    contra: ['（声音极低）此{item}，店家应当识得。{ask} 灵石，此事出我口入你耳。'],
    stolen: ['此物来历，恕在下不便明言。'],
    counterSell: '{n} 灵石，店家莫要欺人太甚。',
    counterBuy: '{n} 灵石，这已是在下的底线。',
    leave: '道不同，不相为谋。告辞。',
    refuse: '店家心术不正，在下羞与为伍。',
    gift: '此{gift}于在下无用，赠与道友。',
    crave: '（他面色灰败，声音发颤）店家……上回那丹，再给在下一些。',
    wish: '店家柜上那件{item}，在下寻访多时，特来相求。',
    wishAsk: '店家这里可有{item}？在下寻访多时了。',
    tip: '道友，执法堂的人往这边来了，还请谨慎。',
  },
  yao: {
    first: ['唔，你这铺子的味道……还行，没有血腥味。', '人族小掌柜，本姑娘头一回来，别耍花样。'],
    hostile: ['你身上那股骗子的臭味，隔着三条街都闻得到。', '要不是急用，吾才不来。'],
    cold: ['哼。', '少套近乎，人族。'],
    neutral: ['小掌柜，又见面啦。', '嗅嗅……今天有新货？'],
    warm: ['小掌柜！吾就知道你今天有好东西。', '你这人族，倒不算太讨厌。'],
    close: ['小掌柜，往后谁敢欺负你，吾咬断他的脖子。', '小掌柜身上的味道，吾记住了，是好人的味道。'],
    sell: ['山里采的{item}，{ask} 灵石，换不换？', '这{item}给你，{ask} 灵石，不许压价！'],
    buy: ['你这里有{cat}么？吾闻着像是有的。', '想要些{cat}，好吃的那种……不对，好用的那种。'],
    qty: ['吾要{n}！', '要{n}，一个都不能少。'],
    qtyOne: ['{n}就好。'],
    attracted: ['你柜上那{cat}，香得很！'],
    appraise: ['这{item}是从人族那里换来的，你帮吾看看，有没有被骗。酬金 {fee}。'],
    contra: ['仙门的{item}，扎手得很，{ask} 灵石，快拿走。'],
    stolen: ['……别问，吾不是偷的，是捡的。'],
    counterSell: '{n}！不能再多了，吾的灵石都是一颗颗攒的。',
    counterBuy: '{n}，再低吾就咬你。',
    leave: '哼，人族果然都一样。',
    refuse: '骗子！吾再也不来了！',
    gift: '山里摘的{gift}，给你。不许说不好吃。',
    crave: '（她的尾巴无精打采地垂着）吾……吾还想要那个香香的东西……',
    wish: '你柜上有{item}！吾老远就闻到了！吾要！',
    wishAsk: '你这里有{item}么？吾找了好久好久。',
    tip: '吾闻到执法堂那帮人的味道了，就在街口，你小心些。',
  },
};

// 记忆回响：熟客会提起你当初做过的事
const MEMLINES = {
  lied:      { ren: '上回您说那东西是假的……后来俺找人一看，是真的。', mo: '上回你小子敢骗老子，这笔账还没算。', xian: '店家上回的“鉴定”，在下事后另请高明看过了。', yao: '你上回骗了吾，吾的鼻子记得。' },
  honest:    { ren: '上回您实话实说，俺记着呢。', mo: '上回你没糊弄老子，算你识相。', xian: '店家上回据实以告，在下佩服。', yao: '上次你没骗吾，所以吾又来啦。' },
  cheap:     { ren: '上回您让了价，俺回去跟婆娘念叨了好几天。', mo: '上回那价钱，够意思。', xian: '店家上回让利，这份情在下记下了。', yao: '上次好便宜！今天也要便宜！' },
  gouged:    { ren: '上回那价……俺回去算了算，可亏惨了。', mo: '上回你宰老子那一刀，老子还记着。', xian: '店家上回的价钱，在下不敢恭维。', yao: '上次你多收了吾好多灵石，哼。' },
  lowballed: { ren: '上回您压价压得俺心口疼。', mo: '上回你压老子的价，胆子不小。', xian: '上回店家的收价，未免太狠。', yao: '上次你给吾的灵石好少……' },
  fair:      { ren: '上回您给的价公道，俺这回还找您。', mo: '上回你给的价还行。', xian: '上回店家出价公允。', yao: '上次你给的灵石不少，吾很满意。' },
  fakeSold:  { ren: '你卖俺的东西是假的！俺的血汗钱啊！', mo: '敢卖假货给老子，你是第一个。', xian: '店家以赝品欺人，在下记下了。', yao: '你卖给吾的是假货！骗子！' },
  pillHelped:{ ren: '多亏您那颗丹药，俺这把老骨头又活过来了！', mo: '你那颗丹药够劲，老子破境了！', xian: '承蒙店家丹药，在下修为又进一层。', yao: '你的丹药好厉害，吾的尾巴又多长了一截！' },
  helped:    { ren: '您的大恩，俺一辈子记着。', mo: '老子欠你一个人情。', xian: '道友援手之恩，没齿难忘。', yao: '你帮过吾，吾记得。' },
  hooked:    { ren: '掌柜的，上回那东西……还有么？俺夜里睡不着，就想着它。', mo: '上回那玩意儿够劲，再来点。', xian: '店家上回的丹……在下近来时时想起。', yao: '上次那个香香的东西，吾还想要……' },
  bribed:    { ren: '掌柜的上回的心意，俺记着呢。', mo: '上回的孝敬，老子收到了。', xian: '店家上回的厚礼，在下愧领了。', yao: '你上次给的灵石，吾都藏在窝里了。' },
  poisoned:  { ren: '你往东西里下了什么？你想害死俺！', mo: '敢在老子的东西里动手脚，你活腻了。', xian: '店家在货里做的手脚，在下都知道了。', yao: '你在吾吃的东西里下毒！' },
  swallowed: { ren: '……掌柜的，上回的事，俺不提了。', mo: '哼，上回的账，老子先记着。', xian: '店家的手段，在下领教了。', yao: '吾打不过你……但吾记得。' },
  profitFake:{ ren: '掌柜的，上回那货转手赚了不少，还有么？', mo: '上回那假货好使，再来几件。', xian: '店家上回的“好货”，在下用得顺手。', yao: '上次那个假东西，吾骗了好多人族！还要！' },
  betrayed:  { ren: '你……你竟然把俺卖了。', mo: '出卖老子的人，都死了。', xian: '你出卖了在下。', yao: '叛徒！' },
};

function fill(tpl, vars) { return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : ''); }

function voice(faction, key, vars = {}) {
  const v = VOICE[faction] && VOICE[faction][key];
  if (!v) return '';
  return fill(Array.isArray(v) ? pick(v) : v, vars);
}

// 熟客最在意的一段记忆（好感变化最大的近事）
function salientMemory(p) {
  const recent = p.mem.filter(m => m.k && MEMLINES[m.k] && S.day - m.d <= 20);
  if (!recent.length) return null;
  return recent.reduce((a, b) => Math.abs(b.a) >= Math.abs(a.a) ? b : a);
}

// 组织一位来客的开场白
function greeting(c) {
  const p = personOf(c);
  if (!p) return '';
  if (c.refuse) return voice(c.faction, 'refuse');
  const parts = [];
  if (!c.returning) parts.push(lineOf(c, 'first'));
  else {
    parts.push(lineOf(c, mood(p.aff)));
    const m = salientMemory(p);
    if (m && Math.random() < 0.7) parts.push(MEMLINES[m.k][c.faction]);
  }
  if (c.gift) parts.push(voice(c.faction, 'gift', { gift: c.gift }));
  // 看得出来的状态
  if (condSev(p, 'injured')) parts.push(gx(p, pick(['（他一条胳膊吊在胸前，脸色发白。）', '（他走路一瘸一拐，衣襟上还有没洗净的血迹。）'])));
  else if (condList(p).some(x => x.kind === 'poisoned')) parts.push(gx(p, '（他嘴唇发紫，说两句就要喘一口气。）'));
  if (c.tip) parts.push(voice(c.faction, 'tip'));
  return speechAs(p, parts.filter(Boolean).join(''));
}

// 来客说的话：角色有自己的口头禅就用自己的
function lineOf(c, key, vars) { return castLine(personOf(c), key, vars) || voice(c.faction, key, vars);
}

// ───────────── 买卖与鉴定留下的记忆 ─────────────

function noteSale(c, it, price, x) {
  const p = personOf(c);
  if (!p) return;
  const name = itemName(it);
  if (x < 0.9) { remember(p, `你以 ${price} 灵石的好价钱卖给他${name}。`, 6, 'cheap'); goodDeed(p, 1); }
  else if (x > 1.3) remember(p, `你以 ${price} 灵石的高价卖给他${name}。`, -6, 'gouged');
  else remember(p, `从你这儿买了${name}（${price} 灵石）。`, 2);
  npcCure(p, it);
  if (p.addict && it.id === 'wangyou') p.lastFix = S.day;
  // 丹药可能改变他的命数
  if (['pill_qi', 'pill_blood', 'pill_found'].includes(it.id)) p.boost = { id: it.id, fake: !!it.fake, q: it.q, day: S.day };
  else if (it.fake) p.boughtFake = { id: it.id, day: S.day, name };
}

function notePurchase(c, it, offer) {
  const p = personOf(c);
  if (!p) return;
  const name = itemName(it);
  if (offer >= it.ask) { remember(p, `你照价 ${offer} 灵石收了他的${name}。`, 5, 'fair'); goodDeed(p, 1); }
  else if (offer < it.ask * 0.6) remember(p, `你把他的${name}压到 ${offer} 灵石才收。`, -7, 'lowballed');
  else remember(p, `你收了他的${name}（${offer} 灵石）。`, 1);
}

function noteClaim(c, honest, caught, claimFake) {
  const p = personOf(c);
  if (!p) return;
  const what = claimFake ? '赝品' : '真品';
  if (caught) {
    remember(p, `你说他的东西是${what}，被他当场识破。`, -20, 'lied');
    p.savvy = clamp(p.savvy + 0.2, 0, 0.95);
  } else if (honest) { remember(p, `你如实告诉他，那是${what}。`, 5, 'honest'); goodDeed(p, 1); }
  else remember(p, `你告诉他那是${what}——他信了。`, 0);
}

function noteGrudge(g) {
  const p = g.pid && S.people[g.pid];
  if (!p) return;
  remember(p, `另请高明一看，才知你当初关于${g.item}的说法不实。`, -15, 'lied');
  p.savvy = clamp(p.savvy + 0.2, 0, 0.95);
}

// ───────────── 人生轨迹 ─────────────

// effect: title / budget（倍率）/ status
const LIFE = {
  ren: [
    { id: 'rise', w: 2, title: '筑基修士', budget: 2, text: '{n}闭关三月，竟真筑基成功了。' },
    { id: 'rich', w: 2, budget: 1.6, text: '{n}在矿上挖到一块好料，发了笔小财。' },
    { id: 'robbed', w: 2, budget: 0.5, text: '{n}夜里遭了劫，家当被抢去大半。' },
    { id: 'die', w: 1, status: 'dead', text: '{n}染了尸疫，没熬过这个冬天。' },
    { id: 'leave', w: 1, status: 'gone', text: '{n}受不了魔宗盘剥，连夜逃出了杂役区。' },
  ],
  mo: [
    { id: 'rise', w: 2, title: '内门弟子', budget: 2, text: '{n}在宗门小比中夺魁，晋升内门。' },
    { id: 'die', w: 2, status: 'dead', text: '{n}随宗门出征，战死在仙魔战场上。' },
    { id: 'punish', w: 2, budget: 0.6, text: '{n}犯了门规，被罚去矿上做苦役。' },
    { id: 'rich', w: 1, budget: 1.5, text: '{n}劫了一支商队，最近手头阔绰。' },
  ],
  xian: [
    { id: 'jail', w: 2, status: 'dead', text: '{n}身份败露，被执法堂锁拿，下落不明。' },
    { id: 'rise', w: 2, budget: 1.6, text: '{n}潜伏有成，似乎接上了更高的线。' },
    { id: 'leave', w: 1, status: 'gone', text: '{n}被召回仙门，再没出现过。' },
  ],
  yao: [
    { id: 'rise', w: 2, title: null, budget: 1.6, text: '{n}化形精进，修为大涨。' },
    { id: 'die', w: 1, status: 'dead', text: '{n}被猎妖人围杀，妖丹不知去向。' },
    { id: 'leave', w: 2, status: 'gone', text: '{n}回了妖域，说是族里出了事。' },
  ],
};

function applyLife(p, ev) {
  if (ev.title) p.title = ev.title;
  if (ev.budget) p.budgetMul = Math.round(p.budgetMul * ev.budget * 100) / 100;
  if (ev.status) p.status = ev.status;
  const text = fill(ev.text, { n: p.name });
  lifeNote(p, text);
  return text;
}

// 每夜推演熟客的命数，返回给夜间报告的传闻
// 状态太差，出头的事成不了
const riseBlocked = p => condPenalty(p) >= 14 && Math.random() < 0.85;

function lifeTick() {
  const news = [];
  for (const p of Object.values(S.people)) {
    if (p.story || p.official || p.status !== 'alive' || !p.visits) continue;
    // 吃了你卖的丹药
    if (p.boost && S.day - p.boost.day >= 1) {
      const b = p.boost;
      delete p.boost;
      if (b.fake) {
        p.status = Math.random() < 0.5 ? 'dead' : 'alive';
        p.budgetMul *= 0.3;
        const t = p.status === 'dead' ? `${p.name}服下假筑基丹，走火入魔，经脉寸断而亡。` : `${p.name}服下假筑基丹，走火入魔，修为尽废。`;
        lifeNote(p, t);
        remember(p, '服了你卖的假丹，走火入魔。', -60, 'fakeSold');
        news.push({ text: t, cls: 'bad' });
        startScandal(p, 'fakepill');
      } else if (riseBlocked(p)) {
        // 丹是真丹，人却带着伤毒——冲关不成，丹力白费
        const t = `${p.name}이(가) 네가 판 ${ITEMS[b.id].name}을(를) 먹고 관문을 두드렸지만, ${condList(p).map(c => c.label).join('·')} 탓에 뚫지 못했다.`;
        lifeNote(p, t);
        news.push({ text: t, cls: 'warn' });
      } else if (Math.random() < (b.id === 'pill_found' ? 0.85 : 0.35) * (0.6 + b.q / 200)) {
        const ev = LIFE[p.faction].find(e => e.id === 'rise');
        const t = applyLife(p, ev);
        remember(p, `服了你卖的${ITEMS[b.id].name}，修为大进。`, 20, 'pillHelped');
        news.push({ text: `${t}据说多亏了你卖的${ITEMS[b.id].name}。`, cls: 'ok' });
      }
      continue;
    }
    if (Math.random() > 0.035) continue;
    const ev = weighted(LIFE[p.faction].map(e => [e, e.w]));
    // 出头的机会落在带伤、中毒、病弱的人身上，多半是败下阵来
    if (ev.id === 'rise' && riseBlocked(p)) {
      const t = `${p.name}${condList(p).map(c => c.label).join('·')}. 무리해서 출세의 기회를 노렸다가 패하고 돌아왔다.`;
      lifeNote(p, t); addCond(p, 'injured', 1); p.budgetMul = Math.max(0.3, p.budgetMul * 0.8);
      news.push({ text: t, cls: 'warn' });
      continue;
    }
    if (['robbed', 'punish'].includes(ev.id)) addCond(p, 'injured', 1);
    const t = applyLife(p, ev);
    news.push({ text: t, cls: ev.status ? 'warn' : '' });
    if (ev.status === 'dead' && p.aff >= 40) queueLegacy(p);
  }
  return news.slice(0, 4);
}

// 生前与你交好的人，家人送来遗物
function queueLegacy(p) {
  startStory(`leg_${p.pid}`, 'legacy', 'gift', rint(1, 3), { pid: p.pid });
}
