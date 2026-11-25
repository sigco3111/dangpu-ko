// 人物：每位来客都是有名有姓、有记忆、有人生轨迹的人；派系与好感决定说话的语气
'use strict';

// ───────────── 名字与身世 ─────────────

// 名字分男女：m 男、f 女、n 都可
const NAMES = {
  ren:  { sur: '조전손리주오정왕풍진저위장심한양주진허하여장공조',
          m: ['철주', '대우', '장생', '석두', '만창', '춘생', '구잔', '유복'], f: ['이아', '수랑', '소만', '취화', '계지', '월아', '교아'], n: ['삼', '칠', '구'] },
  mo:   { sur: '려도염귀냉사도만기모용독고',
          m: ['효', '살', '신', '단혼', '륵', '무애', '광도'], f: ['홍초', '미랑', '혈접', '유란', '사희', '비연'], n: ['한', '리', '구유', '혈의'] },
  xian: { sur: '운임심고사소백소육',
          m: ['청애', '장풍', '회근', '현소', '승영'], f: ['망서', '청설', '약란', '청의', '소심'], n: ['청화', '약진', '지미'] },
  yao:  { sur: '호백황류회',
          m: ['이랑', '노칠', '아만', '대호', '흑산'], f: ['삼랑', '소매', '오고', '옥랑', '청청'], n: ['구', '십사', '청'] },
};

const BIOS = {
  '낙패한 산수': ['한때는 한 지방의 산수. 근기를 다쳐 지금은 가산을 팔아 연명한다.', '젊을 때 영맥 하나를 두고 다투다 목숨 반을 잃었다 한다.'],
  '범인 행상': ['천하를 돌며 잡화를 판다. 주판은 누구보다 빠르다.', '집엔 아픈 동생이 있어 버는 돈의 반이 약값이다.'],
  '잡역 소년': ['부모는 마종 광산에서 죽고, 혼자 잡역 구역에서 입에 풀칠한다.', '낮에는 물 긷고 장작을 패고, 밤에는 어디선가 주운 토납법을 몰래 익힌다.'],
  '유방 검객': ['스스로 유방 검객이라 하지만, 그 검기는 맑고 바라 마도 사람 같지 않다.', '허리춤에 슬쩍슬쩍 무언가를 가린다.'],
  '복면 여수사': ['본모습을 보인 적 없고, 손이 몹시 크다.', '말에 새는 구석이 없다. 누군가를 찾는 것 같다.'],
  '외문 제자': ['혈살종 외문 제자. 날마다 내문 들어가기를 바란다.', '마종 신분을 믿고 잡역 구역에서 온통 뽐낸다.'],
  '내문 사배': ['내문 제자. 안목이 높아 웬만한 물건은 눈에 차지 않는다.', '사존이 집법당 장로라 한다.'],
  '내문 사형': ['내문 제자. 안목이 높아 웬만한 물건은 눈에 차지 않는다.', '사존이 집법당 장로라 한다.'],
  '복면 수사': ['본모습을 보인 적 없고, 손이 몹시 크다.', '말에 새는 구석이 없다. 누군가를 찾는 것 같다.'],
  '잡역 소녀': ['부모는 마종 광산에서 죽고, 혼자 잡역 구역에서 입에 풀칠한다.', '낮에는 물 긷고 빨래하고, 밤에는 어디선가 주운 토납법을 몰래 익힌다.'],
  '여우 요괴': ['화형한 지 얼마 안 된 여우 요괴. 코가 몹시 밝다.', '잡역 구역에 섞여 같은 족속의 행방을 수소문한다.'],
  '호랑이 요괴': ['산에서 온 호랑이 요괴. 힘이 장사요, 성미도 크다.', '빚진 은혜는 반드시 갚는다. 원한도 마찬가지다.'],
  '뱀 요괴': ['음유하고 과묵한 뱀 요괴. 기억력이 몹시 좋다.', '단약에 말 못 할 집착이 있다.'],
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
const TITLE_SEX = { 内门师姐: { m: '내문 사형' }, 蒙面女修: { m: '복면 수사' }, 杂役少年: { f: '잡역 소녀' } };
const NOBLE_TITLE = { m: ['내문 공자', '장로 일가'], f: ['세가 소저', '장로 일가'] };

function faceKey(portrait, face) {
  if (face == null) return portrait;
  const f = STORY_FACES.has(portrait) ? 1 + (face % (FACES - 1)) : face % FACES;
  return f ? `${portrait}_f${f}` : portrait;
}
function faceOf(p) { return !p ? null : p.story || p.official ? p.portrait : faceKey(p.portrait, p.face); }
const sexOf = p => p && p.sex || FACE_SEX[faceOf(p)] || 'm';
const ta = p => sexOf(p) === 'f' ? '그녀' : '그';

// 文字随性别：说的是某人，就把“他”换成“她”；说话人的自称也随之变
function gx(p, text) { return sexOf(p) === 'f' ? String(text).replace(/그의/g, '그녀의').replace(/그는/g, '그녀는').replace(/그가/g, '그녀가') : text; }
const SPEECH_SWAP = { f: [['나', '이 몸'], ['파랑', '가게 어른'], ['이 도련님', '이 아가씨'], ['이 공자', '이 아가씨']], m: [['이 아가씨', '이 대감']] };
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
    if (p.noble && p.sex === 'f' && p.title === '내문 공자') p.title = '세가 소저';
    if (p.noble && p.sex === 'm' && p.title === '세가 소저') p.title = '내문 공자';
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
    bio: opts.bio || pick(BIOS[title] || ['잡역 구역을 스치는 나그네.']), budgetMul: 1, story: opts.story || null,
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
const MOOD_NAME = { hostile: '원한', cold: '냉담', neutral: '평평', warm: '우호', close: '친밀' };

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
      stow(it); c.gift = itemName(it); log(`${p.name}이(가) 너에게 ${itemName(it)}을(를) 하나 주었다.`, 'gain');
    } else if (customerTip(c)) {
      c.tip = true;
      log(`${p.name}이(가) 조용히 알려 준다: 집법당 사람들이 오늘 온다.`, 'gain');
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

const ADDRESS = { ren: '점장', mo: '가게 주인', xian: '점장', yao: '인족 꼬마 점장' };

const VOICE = {
  ren: {
    first: ['점장, 처음 왔습니다. 잘 부탁드려요.', '옆집 왕 아주머니가 여기가 공정하다 해서 왔습니다.'],
    hostile: ['갈 데가 없어서 왔지, 아니면 이런 암점에는 안 온다.', '흥, 또 너냐.'],
    cold: ['점장.', '……장사나 하자. 다른 말은 말고.'],
    neutral: ['점장, 바쁘세요?', '점장, 또 폐를 끼치러 왔습니다.'],
    warm: ['점장! 오늘 안색이 참 좋으세요.', '아이고 점장, 며칠 만이에요. 보고 싶었습니다.'],
    close: ['점장, 우리끼리인데 겉말은 맙시다.', '점장, 우리 어머니가 아직도 은혜를 입에 올리세요.'],
    sell: ['이 {item} 좀 봐 주십시오. {ask} 영석. 되겠습니까?', '집에 끼니가 끊겼습니다. 이 {item}, {ask} 영석에 사 주십시오. 선처를.'],
    buy: ['{cat}을(를) 찾는데, 주머니가 가벼워요. 실속 있게 봐 주십시오.', '{cat} 있어요? 며칠씩 영석을 모았습니다.'],
    qty: ['{n}은(은) 있어야 쓸 만하오.', '{n}. 좀 맞춰 주십시오.'],
    qtyOne: ['{n}이면 족하오.'],
    attracted: ['진열대의 그 {cat}, 한참 보니 몹시 갖고 싶습니다.'],
    appraise: ['이 {item}은(는) 조상 대대로 물려온 겁니다. 감정해 주십시오. 진짜입니까, 가짜입니까? 사례금 {fee} 영석.'],
    contra: ['(두리번거리며) 이 {item}…… 어디서 났는지 몰라요. {ask} 영석. 받아 주세요. 갖고 있긴 겁납니다.'],
    stolen: ['출처야…… 그만 물으십시오.'],
    counterSell: '너무 비싸요 점장. {n} 영석. 더는 정말 못 내겠습니다.',
    counterBuy: '{n} 영석. 더 깎으면 나는 밑지고 만다.',
    leave: '됐다 됐어, 다른 데 알아보지.',
    refuse: '이 검은속 가게, 굶어 죽어도 너와는 장사 안 한다!',
    gift: '우리 밭에서 난 거예요. {gift} 하나 가져왔으니, 마다 마세요.',
    crave: '(그는 눈두덩이 움푹 꺼지고 손가락을 쉼 없이 비빈다) 점장, 그…… 근심 잊는…… 더 있어요? 얼마든 줄게요.',
    wish: '진열대의 그 {item}, 오래 탐냈습니다!',
    wishAsk: '점장, 여기 {item} 있어요? 오래 탐냈습니다.',
    tip: '(목소리를 낮추며) 점장, 집법당 사람들이 곧 와요. 먼저 정리하세요.',
  },
  mo: {
    first: ['네가 새로 온 가게 주인이냐? 좋은 물건이 있나부터 보자.', '오, 잡역 구역에 또 가게가 생겼네.'],
    hostile: ['흥, 내 앞에서 잔재주 부린 놈들 무덤에는 풀이 삼 척이나 자랐다.', '또 너냐, 이 죽고 싶은 놈.'],
    cold: ['잔말 말아라.', '가게 주인, 내 시간 뺏지 마라.'],
    neutral: ['가게 주인, 장사 좀 하자.', '이봐, 장사는 좀 되나?'],
    warm: ['가게 주인, 너 그래도 제법이구나.', '하, 또 만났군. 오늘 좋은 물건 있나?'],
    close: ['형제여, 앞으로 잡역 구역에서 누가 시비 걸면 내 이름을 대라.', '우리끼리 아닌가. 실속 있게 봐라. 나도 널 손해 보게는 안 한다.'],
    sell: ['이 {item}, {ask} 영석. 받든지 말든지.', '영석이 급하다. {item}, {ask}. 깔끔하게 가자.'],
    buy: ['{cat} 있나? 제대로 된 걸로. 잡동사니로 속이지 마라.', '{cat}이(가) 필요하다. 좋은 물건 있으면 내놔라.'],
    qty: ['{n}. 모자라면 안 돼.', '{n} 달라.'],
    qtyOne: ['{n}이면 되오.'],
    attracted: ['진열대의 그 {cat}, 괜찮아 보이네. 내놔 봐.'],
    appraise: ['이 {item}은(는) 죽은 자에게서 거둔 것이다. 진가를 봐라. 사례금 {fee}.'],
    contra: ['(냉소) 선문 그 위선자들의 {item}, {ask} 영석. 받을 배짱 있나?'],
    stolen: ['어디서 났냐고 묻지 마라. 주운 거다.'],
    counterSell: '{n}. 더 주라면 나는 차라리 빼앗겠다.',
    counterBuy: '{n}. 한 푼이라도 모자라면 내가 네 가게를 부순다.',
    leave: '퉤, 괜히 시간만 썼군.',
    refuse: '네까짓 게 나와 장사를 해? 꺼져!',
    gift: '그제 눈치 없는 놈을 잡았다. 이 {gift}, 너에게 내린다.',
    crave: '(그는 하품을 하며 눈물 콧물을 함께 흘린다) 잔말 말고, 그 물건, 있는 대로 다 줘.',
    wish: '진열대의 그 {item}, 내가 가진다!',
    wishAsk: '가게 주인, {item} 있나? 몇 집을 돌았다.',
    tip: '집법당 놈들이 옆 거리야. 남에게 못 보여 줄 것들은 잘 숨겨 둬.',
  },
  xian: {
    first: ['점장, 처음 온 사람이오. 폐를 끼치오.', '(삿갓을 눌러쓰며) 점장, 잠깐 조용히 말 좀.'],
    hostile: ['점장의 인물됨, 이미 겪어 봤소.', '……다급한 일이 아니었다면, 나는 이 문을 다시 들어서지 않았을 것이오.'],
    cold: ['점장.', '장사 얘기만 하오. 다른 말은 사양이오.'],
    neutral: ['점장, 또 폐를 끼치러 왔소.', '점장, 요즘 어떻게 지내시오?'],
    warm: ['점장은 이 마굴에서 드문 분별 있는 사람이오.', '점장과 거래하는 게 그 마수들과보다 속이 편하오.'],
    close: ['도우, 언젠가 정도가 다시 서면, 오늘의 정을 잊지 않겠소.', '도우, 여기서 말해도 괜찮겠소?'],
    sell: ['이 물건 {item}, {ask} 영석. 내력은 묻지 마시오.', '{item} 하나, {ask} 영석. 급히 쓸 데가 있소.'],
    buy: ['{cat}을(를) 좀 찾고 있소. 값은 잘 맞춰 드리오.', '여기 {cat} 있소? 품상이 좋은 것이 필요하오.'],
    qty: ['{n}이(가) 필요하오.', '{n}을(를) 마련해 주시겠소.'],
    qtyOne: ['{n}이면 족하오.'],
    attracted: ['진열대의 그 {cat}, 제법 영기가 있구나.'],
    appraise: ['이 {item}은(는) 내력이 수상하오. 점장이 진위를 가려 주시오. 사례금 {fee} 영석.'],
    contra: ['(몹시 낮은 목소리) 이 {item}, 점장이라면 알아볼 것이오. {ask} 영석. 이 일은 내 입에서 나와 네 귀로만.'],
    stolen: ['이 물건의 내력은, 밝히기 곤란하오.'],
    counterSell: '{n} 영석. 점장, 너무 사람을 얕보지 마시오.',
    counterBuy: '{n} 영석. 이것이 나의 마지노선이오.',
    leave: '길이 다르면 함께 꾀하지 않는 법. 물러가오.',
    refuse: '속이 바르지 못한 점장과는 어울리기 부끄럽소.',
    gift: '이 {gift}은(는) 내게 쓸모없으니, 도우에게 드리오.',
    crave: '(그는 낯빛이 잿빛이고 목소리가 떨린다) 점장…… 지난번 그 단약, 좀 더 주시오.',
    wish: '점장 진열대의 그 {item}, 오래 찾다가 일부러 부탁하러 왔소.',
    wishAsk: '여기 {item} 있소? 오래 찾아다녔소.',
    tip: '도우, 집법당 사람들이 이쪽으로 온다. 조심하시오.',
  },
  yao: {
    first: ['음, 네 가게 냄새…… 나쁘지 않아. 피비린내가 없네.', '인족 꼬마 점장. 나는 처음 왔으니, 잔재주 부리지 마라.'],
    hostile: ['네 몸의 사기꾼 냄새, 세 거리 건너에서도 맡히겠다.', '급하지 않았으면 오지 않았어.'],
    cold: ['흥.', '친한 척 말아라, 인족.'],
    neutral: ['꼬마 점장, 또 만났네.', '킁킁…… 오늘 새 물건 있어?'],
    warm: ['꼬마 점장! 오늘 좋은 물건이 있을 줄 알았어.', '너, 인족치고는 그리 밉지 않구나.'],
    close: ['꼬마 점장, 앞으로 누가 괴롭히면 내가 그의 목을 물어뜯어 주지.', '꼬마 점장의 냄새, 기억했다. 좋은 사람 냄새야.'],
    sell: ['산에서 캔 {item}. {ask} 영석. 바꿀래?', '이 {item} 준다. {ask} 영석. 깎기 없기!'],
    buy: ['여기 {cat} 있어? 냄새가 나는 것 같은데.', '{cat}이(가) 갖고 싶어. 맛있는 거…… 아니, 쓸 만한 거.'],
    qty: ['{n} 내놔!', '{n}. 하나도 모자라면 안 된다.'],
    qtyOne: ['{n}이면 좋겠소.'],
    attracted: ['진열대의 그 {cat}, 향기가 좋아!'],
    appraise: ['이 {item}은(는) 인족과 바꾼 거야. 속은 건지 봐 줘. 사례금 {fee}.'],
    contra: ['선문의 {item}. 손이 데는 물건이오. {ask} 영석, 빨리 가져가시오.'],
    stolen: ['……묻지 마라. 훔친 게 아니라 주운 것이다.'],
    counterSell: '{n}! 더는 못 준다. 내 영석은 한 알 한 알 모은 것이다.',
    counterBuy: '{n}. 더 낮추면 내가 물겠다.',
    leave: '흥, 인족은 역시 다 똑같아.',
    refuse: '사기꾼! 다시는 안 와!',
    gift: '산에서 딴 {gift}. 준다. 맛없다 하기 없기.',
    crave: '(그녀의 꼬리가 힘없이 늘어져 있다) 나…… 그 향기 나는 거 또 갖고 싶어……',
    wish: '진열대에 {item}이(가) 있지! 멀리서부터 냄새가 났어! 나 줘!',
    wishAsk: '여기 {item} 있어? 아주 오래 찾았어.',
    tip: '집법당 놈들 냄새가 나. 바로 저 거리 입구야. 조심해.',
  },
};

// 记忆回响：熟客会提起你当初做过的事
const MEMLINES = {
  lied:      { ren: '지난번에 가짜라 하셨지만…… 나중에 남에게 보이니 진짜였습니다.', mo: '지난번에 감히 나를 속인 것, 그 계산은 아직 안 끝났다.', xian: '지난번 점장의 \'감정\', 나중에 다른 고수에게 보였소.', yao: '지난번에 속였지. 내 코는 기억한다.' },
  honest:    { ren: '지난번에 사실대로 말해 주신 것, 기억하고 있습니다.', mo: '지난번에 나를 속이지 않았지. 분수를 아는군.', xian: '지난번 사실대로 알려 준 점장, 감복했소.', yao: '지난번에 속이지 않아서, 또 왔다.' },
  cheap:     { ren: '지난번에 값을 깎아 주셔서 집사람에게 며칠을 자랑했습니다.', mo: '지난번 그 값어치, 의리 있었습니다.', xian: '지난번 값을 깎아 준 은혜, 새겨 두었소.', yao: '지난번엔 쌌지! 오늘도 싸게 줘!' },
  gouged:    { ren: '지난번 그 값…… 돌아가 계산해 보니 완전히 밑졌습니다.', mo: '지난번에 나에게 바가지 씌운 것, 아직 기억한다.', xian: '지난번 점장의 값, 칭찬하기 어렵소.', yao: '지난번에 영석을 한참 많이 받았지. 흥.' },
  lowballed: { ren: '지난번에 값을 깎는 바람에 가슴이 아팠습니다.', mo: '지난번에 나한테 값을 깎다니, 배짱도 좋군.', xian: '지난번 점장의 매입가는 너무 모질었소.', yao: '지난번에 준 영석은 너무 적었어……' },
  fair:      { ren: '지난번 값이 공정해서 이번에도 찾아왔습니다.', mo: '지난번에 준 값은 괜찮았다.', xian: '지난번 점장의 값은 공정했소.', yao: '지난번에 준 영석이 적지 않아, 마음에 들었다.' },
  fakeSold:  { ren: '네가 판 것이 가짜였어! 내 피땀 돈을!', mo: '감히 나에게 가짜를 팔다니, 네가 처음이다.', xian: '위작으로 사람을 속인 점장, 새겨 두겠소.', yao: '네가 판 것은 가짜야! 사기꾼!' },
  pillHelped:{ ren: '그 단약 덕에 이 늙은 뼈가 다시 살았습니다!', mo: '네 그 단약이 좋았어. 내가 경지를 깼다!', xian: '점장의 단약 덕에 수위가 한층 올랐소.', yao: '네 단약이 대단해, 내 꼬리가 한 뼘 더 자랐어!' },
  helped:    { ren: '그 은혜, 평생 새기겠습니다.', mo: '네게 신세 하나 졌다.', xian: '도우의 구원 은혜, 평생 잊지 않겠소.', yao: '네가 도와준 것, 기억한다.' },
  hooked:    { ren: '점장, 지난번 그것…… 더 있어요? 밤에 잠도 못 자고 그것만 생각납니다.', mo: '지난번 그 물건, 질이 좋았다. 더 주오.', xian: '지난번 점장의 단약…… 요즘도 문득문득 생각나오.', yao: '지난번 그 향기 나는 것, 또 갖고 싶어……' },
  bribed:    { ren: '지난번 점장의 마음씀, 새기고 있습니다.', mo: '지난번 바친 것, 잘 받았다.', xian: '지난번 점장의 후한 선물, 송구스럽게 받았소.', yao: '지난번에 준 영석, 전부 굴에 숨겨 두었다.' },
  poisoned:  { ren: '물건에 뭘 넣은 거냐? 나를 죽일 셈이냐!', mo: '감히 내 물건에 손을 대다니, 삶이 지겨웠나 보군.', xian: '물건에 해 둔 손속, 전부 알았소.', yao: '내가 먹은 것에 독을 탔지!' },
  swallowed: { ren: '……점장, 지난번 일은 내가 입 닫고 있겠다.', mo: '흥, 지난번 계산은 내가 기억해 두지.', xian: '점장의 수법, 겪어 봤소.', yao: '네게는 안 된다…… 하지만 기억해 두겠다.' },
  profitFake:{ ren: '점장, 지난번 물건 되팔아 꽤 벌었어요. 더 있나요?', mo: '지난번 그 가짜가 잘 먹혔다. 몇 개 더 주오.', xian: '지난번 점장의 \'좋은 물건\', 잘 쓰고 있소.', yao: '지난번 그 가짜로 인족을 많이 속였다! 또 줘!' },
  betrayed:  { ren: '너…… 네가 나를 팔아넘긴 거냐.', mo: '나를 판 놈들은, 다 죽었다.', xian: '네가 나를 팔았구나.', yao: '배신자!' },
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
  if (condSev(p, 'injured')) parts.push(gx(p, pick(['(그는 한쪽 팔을 가슴에 매달고, 안색이 창백하다.)', '(그는 절뚝이며 걷고, 옷자락엔 덜 씻긴 핏자국이 있다.)'])));
  else if (condList(p).some(x => x.kind === 'poisoned')) parts.push(gx(p, '(그는 입술이 파랗고, 두 마디마다 숨을 고른다.)'));
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
  if (x < 0.9) { remember(p, `좋은 값 ${price} 영석에 그에게 ${name}을(를) 팔았다.`, 6, 'cheap'); goodDeed(p, 1); }
  else if (x > 1.3) remember(p, `높은 값 ${price} 영석에 그에게 ${name}을(를) 팔았다.`, -6, 'gouged');
  else remember(p, `너에게서 ${name}을(를) 샀다(${price} 영석).`, 2);
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
  if (offer >= it.ask) { remember(p, `제값 ${offer} 영석에 그의 ${name}을(를) 받았다.`, 5, 'fair'); goodDeed(p, 1); }
  else if (offer < it.ask * 0.6) remember(p, `그의 ${name}을(를) ${offer} 영석으로 깎아서 받았다.`, -7, 'lowballed');
  else remember(p, `그의 ${name}을(를) 받았다(${offer} 영석).`, 1);
}

function noteClaim(c, honest, caught, claimFake) {
  const p = personOf(c);
  if (!p) return;
  const what = claimFake ? '위작' : '진품';
  if (caught) {
    remember(p, `그의 물건이 ${what}이라고 했다가, 자리에서 들통났다.`, -20, 'lied');
    p.savvy = clamp(p.savvy + 0.2, 0, 0.95);
  } else if (honest) { remember(p, `사실대로, 그것이 ${what}이라고 말했다.`, 5, 'honest'); goodDeed(p, 1); }
  else remember(p, `그것이 ${what}이라고 말했고 — 그는 믿었다.`, 0);
}

function noteGrudge(g) {
  const p = g.pid && S.people[g.pid];
  if (!p) return;
  remember(p, `다른 고수에게 보이고 나서야, 네가 ${g.item}에 대해 한 말이 사실이 아님을 알았다.`, -15, 'lied');
  p.savvy = clamp(p.savvy + 0.2, 0, 0.95);
}

// ───────────── 人生轨迹 ─────────────

// effect: title / budget（倍率）/ status
const LIFE = {
  ren: [
    { id: 'rise', w: 2, title: '축기 수사', budget: 2, text: '{n}. 석 달 폐관하더니 정말 축기에 성공했다.' },
    { id: 'rich', w: 2, budget: 1.6, text: '{n}. 광산에서 좋은 광물을 캐 푼돈을 벌었다.' },
    { id: 'robbed', w: 2, budget: 0.5, text: '{n}. 밤에 강도를 만나 가산의 태반을 빼앗겼다.' },
    { id: 'die', w: 1, status: 'dead', text: '{n}. 시역에 걸려 이 겨울을 넘기지 못했다.' },
    { id: 'leave', w: 1, status: 'gone', text: '{n}. 마종의 착취를 견디지 못하고 밤중에 잡역 구역을 빠져나갔다.' },
  ],
  mo: [
    { id: 'rise', w: 2, title: '내문 제자', budget: 2, text: '{n}. 종문 소시합에서 우승해 내문으로 올랐다.' },
    { id: 'die', w: 2, status: 'dead', text: '{n}. 종문을 따라 출정해 선마 전장에서 전사했다.' },
    { id: 'punish', w: 2, budget: 0.6, text: '{n}. 문규를 어겨 광산 고역으로 떨어졌다.' },
    { id: 'rich', w: 1, budget: 1.5, text: '{n}. 상단 하나를 털어 요즘 손이 넉넉하다.' },
  ],
  xian: [
    { id: 'jail', w: 2, status: 'dead', text: '{n}. 신분이 탄로 나 집법당에 잡혀 갔고 행방불명이다.' },
    { id: 'rise', w: 2, budget: 1.6, text: '{n}. 잠복이 결실을 봐 더 높은 줄에 닿은 모양이다.' },
    { id: 'leave', w: 1, status: 'gone', text: '{n}. 선문으로 소환된 뒤 다시는 나타나지 않았다.' },
  ],
  yao: [
    { id: 'rise', w: 2, title: null, budget: 1.6, text: '{n}. 화형이 진일보해 수위가 크게 올랐다.' },
    { id: 'die', w: 1, status: 'dead', text: '{n}. 요괴 사냥꾼에게 포위 살해당해 요단의 행방을 모른다.' },
    { id: 'leave', w: 2, status: 'gone', text: '{n}. 족속에 일이 생겼다며 요역으로 돌아갔다.' },
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
        const t = p.status === 'dead' ? `${p.name}이(가) 가짜 축기단을 먹고 주화입마에 빠져 경맥이 끊어져 죽었다.` : `${p.name}이(가) 가짜 축기단을 먹고 주화입마에 빠져 수위가 전부 무너졌다.`;
        lifeNote(p, t);
        remember(p, '네가 판 가짜 단약을 먹고 주화입마에 빠졌다.', -60, 'fakeSold');
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
        remember(p, `네가 판 ${ITEMS[b.id].name}을(를) 먹고 수위가 크게 올랐다.`, 20, 'pillHelped');
        news.push({ text: `${t}. 네가 판 ${ITEMS[b.id].name} 덕이라 한다.`, cls: 'ok' });
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
