// 蛊虫精通：养蛊人独门的手艺，别处学不来——养蛊攒经验自动升重。蛊不能当面往人身上放，只能掺进吃食里（加料，见 js/intrigue.js）：
// 谁吃下去谁中蛊——买去转送别人的，中蛊的就是吃的那个人；不懂蛊的人掺进去的只是一只死虫，你自己吃了也什么都不会发生。
// 中蛊的人或听话、或被蛊噬成重伤，蛊要不了人命，跟你动手跌一境、与你打交道也多半不再给你添堵。情蛊一生只认一名女子，她死你也活不成。
// 执法堂的人吃下你的蛊可能察觉；察觉了却没被锁拿，执法堂会换一位新巡查来（见 js/cast/leng_fei.js）
'use strict';

// 升到第 n 重要的累计经验；养蛊的每样活计各记多少
const GU_XP = [0, 0, 60, 180, 400];
const GU_XP_GAIN = { hatch: 2, feed: 1, grown: 6, egg: 3, venom: 2, shed: 10, devour: 4, love: 12 };

const guLv = () => techLv('gumaster');
const guXpNext = () => GU_XP[guLv() + 1];

// 只有养蛊人攒得了经验，攒够自动升重
function guXp(kind, n = 1) {
  if (!S.perks.gumaster || !n) return;
  S.guXp = (S.guXp || 0) + GU_XP_GAIN[kind] * n;
  while (guLv() < TECHS.gumaster.max && S.guXp >= guXpNext()) {
    S.tech.gumaster = guLv() + 1;
    log(`고를 기른 지 오래되어 네 고충 정통이 제${cn(guLv())}중으로 올랐다.`, 'gold');
  }
}

// ───────────── 谁能中情蛊 ─────────────

// 未成年的一概不算：有名有姓的看年纪（或写明 minor），路人看面孔与称呼
function isMinor(p) {
  const d = CAST[p.pid];
  if (d) return d.age != null ? d.age < 18 : !!d.minor;
  return /kid/.test(faceOf(p) || '') || /소년|소녀|아이/.test(p.title || '');
}
const isAdultWoman = p => !!p && sexOf(p) === 'f' && !isMinor(p);

// 执法堂的人：下蛊可能被察觉
const LAWMEN = ['enforcer', 'leng_fei'];
const isLawman = p => LAWMEN.includes(p.pid);

// ───────────── 下蛊：掺进吃食，谁吃谁中 ─────────────

// 手里的蛊：养大的蛊，和情蛊（货品册里那对同心蛊：三重时自己炼，鬼市也有现成的）
const isLoveGu = it => it.id === 'love_gu';
const plantableGu = () => Object.values(S.items).filter(it => HELD(it) && (it.id === 'gu' || isLoveGu(it)) && !it.fake);
const guReach = () => S.cult.lv + (guLv() >= 4 ? 1 : 0);
const isGuLace = kind => kind === 'control' || kind === 'love';

// 能不能把这只蛊掺进吃食：能返回 null，否则返回缘由
function guLaceBlock(add) {
  if (!guLv()) return '너는 고를 모른다. 섞어 넣어봤자 죽은 벌레일 뿐, 누가 먹어도 고에 걸리지 않는다';
  if (isLoveGu(add)) {
    if (guLv() < 3) return '고충 정통 3중이어야 정고를 부릴 수 있다';
    if (S.loveGu) return `정고는 일생에 한 사람만 알아본다. 네 심장의 모고는 이미 ${S.people[S.loveGu].name}을(를) 알아봤다`;
  } else if (guStage(add) > guLv()) return `${itemName(add)}은(는) 너무 흉악하다. 고충 정통 ${cn(guStage(add))}중이어야 부릴 수 있다`;
  return null;
}

// 执法堂的人：吃下你的蛊，种上种不上都可能察觉
const lawSpotOdds = () => clamp(0.4 - 0.06 * guLv(), 0.1, 0.4);

// 掺了蛊的吃食被 p 吃下去。蛊是你亲手掺的、你又懂蛊才种得上；种不上的蛊死在肚里，什么也不会发生。
// 返回 { text, cls } 写进夜里的消息；没种上、或不是你的蛊，返回 {}
function guTakes(p, it, name, knew) {
  if (it.lacedBy !== 'me' || !guLv()) return {};
  const love = it.laced === 'love';
  let text = '', cls = 'good';
  const block = love ? (!isAdultWoman(p) || S.loveGu ? 'skip' : null)
    : p.loveGu || guBound(p) ? 'skip' : npcLevel(p) > guReach() ? 'strong' : null;
  if (!block) {
    if (love) {
      p.loveGu = { day: S.day };
      S.loveGu = p.pid;
      p.aff = 100;
      remember(p, `${name}을(를) 먹고 심장이 갑자기 뜨거워졌다. 이제 눈에는 너뿐이다.`, 0, 'loved');
      if (knew) commitSin('harm', { p, w: 2, what: `${p.name}에게 정고를 심었다`, virtue: 6 });
      text = `${p.name}이(가) 정고가 숨겨진 ${name}을(를) 먹었다. 모고가 네 심장에서 살랑 뛴다. 이제부터 너희는 한 목숨이다.`;
    } else {
      const stage = it.laceStage || 0, gu = GU_STAGES[stage].name;
      p.controlled = { day: S.day, by: 'gu', stage };
      remember(p, `${name}을(를) 먹고 배 속에서 무언가 기어다니는 것 같다.`, 0);
      if (knew) commitSin('harm', { p, w: 1 + Math.min(2, stage), what: `${p.name}에게 ${gu}을(를) 내렸다`, virtue: 3 + 2 * stage });
      text = `${p.name}이(가) ${gu}이(가) 숨겨진 ${name}을(를) 먹고 네 고에 걸렸다.`;
    }
  } else if (block === 'strong') {
    text = `${p.name}이(가) 고가 숨겨진 ${name}을(를) 먹었지만 ${ta(p)}은(는) ${realmName(npcLevel(p))}이라 고가 자리잡지 못하고 배 속에서 죽었다.`;
    cls = 'warn';
  }
  // 执法堂的人：察觉了，关注大涨；没被当场锁拿，过几日执法堂会换一位新巡查来
  if (isLawman(p) && Math.random() < lawSpotOdds()) {
    addHeat(45);
    text = `${text ? text + '\n' : ''}${p.name}이(가) 먹은 것이 이상하다는 걸 알아챘다. 집법당 문서에 네 이름이 올랐다(주목 +45).`;
    cls = 'bad';
    if (p.pid === 'enforcer' && !S.flags.guCaught) S.flags.guCaught = S.day;
    checkHeat();
  }
  return text ? { text, cls } : {};
}

// 不从的下场：蛊噬其心，重伤——只到重伤，要不了命
function guBite(p) {
  const s = condSev(p, 'injured');
  if (s < 2) addCond(p, 'injured', 2 - s, '고충이 심장을 갉아먹음');
  guHold(p);
  return `${p.name}이(가) 이를 악물고 거역하자 심장의 고가 세게 갉았다. ${ta(p)}은(는) 가슴을 움켜쥐고 무릎 꿇어 검은 피를 토했다. 상처가 깊다.`;
}

// ───────────── 中蛊的人 ─────────────

// 蛊要宿主活着：中了你的蛊的人，伤再重也被蛊吊着一口气，压在重伤，不到垂危
function guHold(p) {
  const c = p && p.conds && p.conds.injured;
  if (c && c.sev > 2 && guAnyHost(p)) { c.sev = 2; c.day = S.day; }
}
const guAnyHost = p => !!(p && ((p.controlled && p.controlled.by === 'gu') || p.loveGu));

const guBound = p => !!(p && p.controlled && p.controlled.by === 'gu');
const guAny = p => guBound(p) || !!(p && p.loveGu);

// 与你打交道时，抹掉对你不利的事的几率：情蛊全抹；寻常的蛊看手艺，修为高过你的人压得住一些
function guShield(p) {
  if (!p) return 0;
  if (p.loveGu) return 1;
  if (!guBound(p)) return 0;
  return clamp(0.5 + 0.1 * guLv() - (npcLevel(p) > S.cult.lv ? 0.2 : 0), 0, 0.95);
}
const guShrug = p => guShield(p) > 0 && Math.random() < guShield(p);

// 跟你动手时，中了蛊的人跌一境
const guDrop = p => guAny(p) ? 1 : 0;

// 情蛊的那位见了你，永远是一副脸红心跳的样子（没画好的先用高兴的神态）
function smittenMood(p) {
  return ART_SET.has(`chars/${faceOf(p)}_smitten`) ? 'smitten' : 'pleased';
}

// ───────────── 情蛊同命 ─────────────

// 她死了，你心口的母蛊也跟着死——你也就死了
function loveBondCheck() {
  const p = S.loveGu && S.people[S.loveGu];
  if (!p || S.over || p.status !== 'dead') return;
  S.over = { win: false, cause: 'lovegu', scene: ART_SET.has('scene/end_lovegu') ? 'end_lovegu' : 'end_death', title: '정고 동명',
    text: `${p.name}이(가) 숨을 거두는 순간 네 심장의 모고가 몸을 뒤집더니 다시는 움직이지 않았다. 남강의 옛말이 틀리지 않았다. 정고가 알아보는 것은 한 사람이 아니라 두 목숨이다.`
      + `다음 날 이웃이 전당포 문을 열었을 때 카운터에는 찻잔 두 개가 나란히 놓여 있었다. 하나는 식어빠졌고 하나는 네가 늘 ${ta(p)}에게 남겨두던 것. 검시관은 문서에 사인을 “상사”라 적었고,`
      + `집법당은 무슨 죄목으로 해야 할지 몰라 사건을 “풍월” 난에 넣었고 아직 끝나지 않았다. 네가 ${landlordName()}에게 빚진 그 회차 임대료도 끝내 갚지 못했다.` };
}

// ───────────── 执法堂换人 ─────────────

// 下蛊被执法堂察觉、却没被当场锁拿：过两三日，新巡查到任（冷翡的故事线开场即换人）
const lawSwapDue = () => !!S.flags.guCaught && !S.flags.lawSwap && !S.over && S.day >= S.flags.guCaught + 2;
