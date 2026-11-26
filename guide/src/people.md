# 인물과 파벌

[홈으로](README.md)

잡역 구역의 모든 사람은 네가 한 일을 기억한다: 찾아오는지, 어떤 값을 부르는지, 너를 도와주는지는 그 사람의 처지와 너와의 호감에 달렸다. 「인물」 페이지에서 사람마다 너와의 왕래와 각자의 운명을 볼 수 있다.

## 네 세력

{{ T.factions() }}

한 족속에서의 명성이 높을수록 그 족속의 손님이 더 많이 오고, 예산도 넉넉하고, 값도 후하게 부르며, 네 거짓말도 잘 들통나지 않는다. 마종 명성은 또한 행상이 무엇을 파는지, 처음 두 중의 비급을 어디까지 파는지, 집법당의 주시가 밤마다 얼마나 빨리 빠지는지를 좌우한다.

## 호감

호감은 다섯 등급으로 나뉜다:

{{ T.bands(a => MOOD_NAME[mood(a)]) }}

호감이 깊은 사람은 값을 더 공정하게 부르고 너를 위해 말해주며, 의원은 진료비도 적게 받는다([상처와 독, 치료와 죽음](health.md) 참고). 적대하는 사람은 찾아와서 문제를 일으킨다.

## 선물

「인물」 페이지에서 만난 적 있는 사람에게 물건이나 영석을 선물할 수 있다. 하루에 한 번. 그가 중시하는 것은 그 물건이 자신에게 쓸모가 있는지다: 마침 그가 애타게 찾던 바로 그것(「인물」 페이지에 "원하는 것"으로 적혀 있다)이라면 가장 크게 고마워한다. 주머니가 빠듯하고 탐욕스러운 사람일수록 이 방법이 잘 먹힌다.{{! (() => { fresh(); const p = Object.values(S.people).find(p => p.visits !== undefined); p.wish = 'pill_qi'; const it = makeItem('pill_qi', { q: 60 }); const a = giftValue(p, it); p.wish = 'iron_ore'; return a > giftValue(p, it); })() }}

## 선명

사실대로 말하고, 공정하게 거래하고, 약자를 거두면 선명이 오른다. 속이고, 영혼을 삼키고, 사람을 죽이면 떨어진다.

{{ T.bands(v => VIRTUE_NAME(v), 0, 100) }}

- **평판**: 정직한 사람의 가게에는 손님이 값을 더 후하게 부른다. 선명이 {{ VIRTUE_NAME(45) }}에 이르면 하루에 손님이 한 명 더 온다. 네가 진심으로 도운(구제, 풀어줌, 증거 보호……) 사람이 {{ (() => { fresh(); for (let i = 0; i < 20; i++) { fateMerit(newPerson('ren'), 2); if (patronBonus()) return i + 1; } })() }}명이 되면, 그들이 소개해주는 단골이 한 명 더 는다. 선명이 {{ (() => { for (let v = 0; v <= 100; v++) { fresh(); S.virtue = v; const a = trustMul(); S.virtue = v + 1; if (trustMul() === a && v > 20) return v; } })() }}이면 평판은 정점이고, 그 위로는 돈으로 명성을 사는 것뿐이다.
- 선명이 알려지면 부탁하러 오는 사람이 많아지고, 파는 사람도 값을 더 높이 부를 배짱이 생긴다. 선명만 지나치게 높고 뒷받침할 수련이 없으면 모두가 너를 만만하게 본다.
- **보답**: 네가 도운 사람은 너를 기억한다. 대개는 물건 한두 가지, 소식 하나, 몇백 영석을 보내오는 정도지만, 가끔 출세한 사람이 돌아와 은혜를 갚는다 — 가게 문서 값 인하, 호신부 한 장(옥살이, 추방, 죽음을 한 번 면함), 파경의 물건, 중보 하나. 전제는 너도 충분히 강해야 한다는 것: {{ REALMS[2].name }}에 이르렀거나 세력이 충분히 커야 한다.{{! (() => { fresh(); S.cult.lv = 2; return strongEnough(); })() }}
- **기연**: 선명이 알려져 있고 악명이 없다면, 날이 갈수록 큰 기연을 만날 가능성이 높아진다 — 역시 가게 문서 인하, 호신부, 파경의 물건, 중보다.{{! (() => { fresh(); S.virtue = 60; S.day = 80; const r = Math.random; Math.random = () => 0; const a = JSON.stringify([S.flags.deedMul, S.flags.savior || 0, S.cult.xp, Object.keys(S.items).length]); karmaTick(); Math.random = r; return a !== JSON.stringify([S.flags.deedMul, S.flags.savior || 0, S.cult.xp, Object.keys(S.items).length]); })() }}{{! (() => { fresh(); S.virtue = 60; S.day = 80; S.fate.infamy = Math.ceil(fateTolerance()); const r = Math.random; Math.random = () => 0; const a = JSON.stringify([S.flags.deedMul, S.flags.savior || 0, S.cult.xp, Object.keys(S.items).length]); karmaTick(); Math.random = r; return a === JSON.stringify([S.flags.deedMul, S.flags.savior || 0, S.cult.xp, Object.keys(S.items).length]); })() }}

{{ T.trust() }}

## 인과

나쁜 짓은 도박이다. 나쁜 일을 한 가지 저지를 때마다 — 사람을 팔아넘기고, 장물을 숨겨주고, 속이고 감쪽같이 빼앗고, 목숨을 해치고 — 억채 하나를 지게 되고, {{ FATE_WAIT[0] }}~{{ FATE_WAIT[1] }}일 뒤에 결과가 드러난다: **{{ pct(1 - FATE_ODDS) }}는 조용히 넘어가고, {{ pct(FATE_ODDS) }}는 응보가 찾아온다**. 이야기 속 이런 선택지, 신고와 협박 버튼에는 이번 판의 판돈이 적혀 있다. 상단 바의 「억」 패를 누르면 갚지 않은 억채를 볼 수 있다.

{{ T.sins() }}

여기는 마문이다: 속임수, 사람을 팔아 포상받기는 밥 먹듯 하는 일이라 하늘의 이치가 누구의 원한을 갚아주지는 않는다. 빚을 받으러 오는 것은 당사자와 그의 친구들, 그리고 집법당뿐이다. 처음의 작은 악은 아무도 신경 쓰지 않는다 — 제 {{ FATE_TOL_DAYS[0] }}일 전에는 같은 무게의 악을 {{ (() => { fresh(); S.day = FATE_TOL_DAYS[0]; const a = fateStake(1); for (let k = 1; k < 200; k++) { commitSin('fraud', { w: 1 }); if (fateStake(1) >= 2 * a) return k + 1; } })() }}가지 저질러야 판돈이 두 배가 된다. 가게가 커지면 너를 지켜보는 눈이 많아져서, 제 {{ FATE_TOL_DAYS[1] }}일에는 {{ (() => { fresh(); S.day = FATE_TOL_DAYS[1]; const a = fateStake(1); for (let k = 1; k < 200; k++) { commitSin('fraud', { w: 1 }); if (fateStake(1) >= 2 * a) return k + 1; } })() }}가지만으로 그렇다. 날이 갈수록 한 건의 기본 판돈도 더 빨리 오른다.{{! fateTolerance(1) === FATE_TOL[0] && fateTolerance(999) === FATE_TOL[1] }}

응보로 물어낼 원금은 네가 **누적해서** 저지른 악이 커질수록, 날이 갈수록 불어난다. 팔아넘기기(무게 2)를 예로 들면 들통났을 때 물어낼 것은:

{{ T.fateStakes(2, [10, 30, 60, 90], 16).split('\n').filter((l, i) => i < 2 || [1, 2, 4, 6, 8, 12, 16].includes(i - 1)).join('\n') }}

- 먼저 영석을 뜯기고, 모자라면 가장 값나가는 물건을 빼앗긴다. 그래도 못 갚으면 **파탄**: 두들겨 맞아 {{ CONDS.injured.grade[1] }}이 되고 집법당 주시가 급등한다 — 원래 상처를 입었거나 주시가 높던 사람은 이 한 번에 목숨을 잃을 수 있다.{{! (() => { fresh(); S.stones = 0; S.day = 60; S.fate.n = 12; commitSin('harm', { w: 3 }); const r = Math.random; Math.random = () => 0; S.day = 80; fateTick(); Math.random = r; return S.fate.busts === 1 && condSev('me', 'injured') >= 2; })() }}
- **악명**: 한 건이 들통날 때마다 악명이 오른다(작은 악 1점, 팔아넘기기·장물 2점, 목숨 3점). 손님이 덩달아 값을 깎고 최대 {{ pct((fresh(), S.fate.infamy = 999, infamyDiscount())) }}까지 깎는다. 처음에 악명이 {{ FATE_TOL[0] }}이 되면 보답과 기연이 찾아오지 않고, {{ 4 * FATE_TOL[0] }}이 되면 하루 손님이 한 명 줄고(증거를 맡기거나 구제를 애걸하는 사람도 더는 오지 않는다), {{ 8 * FATE_TOL[0] }}이 되면 두 명이 준다. 이 문턱은 세태가 험해지며 낮아져서 제 {{ FATE_TOL_DAYS[1] }}일에는 {{ FATE_TOL[1] }}, {{ 4 * FATE_TOL[1] }}, {{ 8 * FATE_TOL[1] }}로 내려간다.
- **손 씻기**: {{ FATE_FADE }}일 동안 악을 저지르지 않으면 지난 억채가 작은 악 {{ FATE_TOL[1] }}~{{ FATE_TOL[0] }}가지 분량만큼 옅어진다(뒤로 갈수록 적어진다). 무게 있는 선행으로 선명을 {{ FATE_MERIT }}점 쌓을 때마다 같은 만큼 갚아진다. 다음 악행의 원금도 따라서 내려간다.
- **조절하는 법**: 시작할 때 돈이 빠듯하면 악행 한두 가지는 판돈이 작고 벌이가 크다. 계속 저지르면 판돈이 배로 불고 뒤로 갈수록 더 가파르다. 반반의 도박을 여러 번 하다 보면 언젠가 갚지 못하는 판이 온다. 착한 사람만으로도 살아남을 수 있다, 다만 느릴 뿐. 가장 남는 것은 둘 사이에서 조절하는 것 — 돈이 모자랄 때 한 번 모험하고, 이기면 손을 씻고 선행을 하며, 지난 억채가 옅어지기를 기다린다.

## 네 파벌

혈살종 안의 네 세력. 왕래가 쌓이면 낯선 이에서 객으로, 심복으로 나아가고, 호감이 충분하면 그 문하에 들어가 매주의 독점 거래를 얻을 수 있다 — 대신 적대 세력은 너를 원망한다.

{{ T.cliques() }}

## 첨가

먹거나 마실 수 있고 사람에게 이로운 것 — 기력을 보하고, 수련을 돕고, 상처·독을 고치는 단약, 영음, 영과, 약초, 약재가 되는 요재 — 에는 무엇이든 몰래 섞을 수 있다. 겉으로는 구별되지 않고 그대로 팔거나 선물할 수 있다. 지금 섞을 수 있는 것: {{ Object.keys(ITEMS).filter(isLaceable).map(id => ref('item', id)).join(', ') }}. 영혼, 정혈, 요단처럼 영혼과 피를 삼키는 것, 피우는 향, 그 자체가 재료인 것에는 섞을 수 없다.

{{! Object.keys(ITEMS).filter(id => restoreOf(makeItem(id, { q: 50, purity: 99.95 })) || CULT_XP[id] || Object.values(CONDS).some(c => c.cure.includes(id))).every(id => isLaceable(id) || ['dan', 'yin', 'zhi'].indexOf(ITEMS[id].cat) < 0 || JUNK.includes(id) || ITEMS[id].additive) }}

{{! Object.keys(ITEMS).filter(isLaceable).every(id => { const it = makeItem(id, { q: 50, purity: 99.95 }); return !ITEMS[id].additive && ITEMS[id].cat !== 'gu' && (restoreOf(it) || cultXp(it) || id === 'water' || Object.values(CONDS).some(c => c.cure.includes(id))); }) }}

재료를 섞을 수 있는 것은 복용할 수 있는 것뿐이고, 섞는 재료 자체 — 시독, 거미 독, 망우산, 고충, 정고 같은 것 — 에는 다른 재료를 섞을 수 없다. 위작, 하급 둔갑품에도 똑같이 섞을 수 있다: 보는 것은 그것을 먹을 수 있느냐이지 진짜냐 가짜냐가 아니다.{{! (() => { fresh(); const f = giveItem('pill_found', { fake: true }), d = giveItem('pill_qi', { q: 30 }); dressUp(d, 1); return canLace(f) && canLace(d) && ['corpse_poison', 'spider_venom', 'wangyou', 'gu', 'love_gu', 'gu_venom'].every(id => !isLaceable(id)); })() }}

{{ T.laces() }}

상대가 영리할수록, 너를 덜 믿을수록 들통날 가능성이 크다. 들통나면 한 건의 사건이 되어 당사자가 찾아와 따진다.

**재료는 먹어야 발작한다.** 사 가거나 받은 사람이 그 자리에서 알아채지 못하면 품에 품고 돌아간다: 대개는 직접 먹지만, 같은 족속에게 건네줄 수도 있다(선물로 산 것은 반드시 건넨다) — 누가 먹든 그 사람에게서 발작한다. 네가 손수 섞은 물건이 손을 거치면, 밤에 누구의 배 속에 들어갔는지 소문으로 듣게 된다.{{! (() => { fresh(); const p = newPerson('ren'); p.savvy = 0; const r0 = Math.random; Math.random = () => 0.99; const t = giveItem('pill_qi'); laceWith(t, giveItem('corpse_poison')); const h = p.health; applyLace(p, t, 'sale'); const before = p.health === h; S.day += 5; eatStash(p); Math.random = r0; return before && p.health < h; })() }}

**세간에도 남이 섞어둔 물건과 위작이 돌아다닌다.** 귀시의 단약·영주는 약 {{ pct(sim(4000, () => !!marketLace('pill_qi', {}, 0.2).laced)) }}가 섞인 것이고 골동품의 절반은 위작이다. 마종 손님이 팔러 오는 것은 약 {{ pct(sim(4000, () => !!marketLace('pill_qi', {}, 0.15).laced)) }}에 섞여 있고, 행상의 물건에도 가끔 있다. 대개는 망우산이고 시독, 서심고도 있다. 겉으로는 알 수 없고 **검품**해야만 가려낼 수 있다 — 수법에 일중부터 삼중까지 있어서, 조요경이 충분히 좋거나 네가 그 재료의 수법을 배워야 냄새를 맡아낼 수 있다.{{! (() => { fresh(); const a = makeItem('pill_qi', { laced: 'addict', laceGrade: 3 }); quickInspect(a); const no = !a.lacedSeen; S.laceKnown = { addict: 1 }; quickInspect(a); return no && a.lacedSeen; })() }}

이런 물건을 받았을 때 어떻게 할지는 네가 정한다:

- **손해 보기**: 버리거나, 행상에게 헐값에 판다(그는 맡아보면 안다. 1할 값만 준다). 모르고 직접 먹으면 망우산은 네 정신을 갉고, 시독은 {{ CONDS.poisoned.grade[1] }}에 이르게 하고, 남의 고충은 운기로 뽑아내야 하며 한 중의 상처를 입는다(고에 걸리지는 않는다).
- **돌려서 속이기**: 좋은 물건처럼 그대로 판다. 모르고 판 것은 네 악행으로 셈하지 않고 남의 책임을 뒤집어쓰는 것뿐 — 하지만 상대가 알아채면 똑같이 너를 찾아온다. 알고도 팔면 그것은 네 억채다.{{! (() => { fresh(); const p = newPerson('ren'); p.savvy = 0; const r0 = Math.random; Math.random = () => 0.99; const q = newPerson('ren'); q.savvy = 0; applyLace(p, makeItem('pill_qi', { laced: 'poison' }), 'sale'); applyLace(q, makeItem('pill_qi', { laced: 'poison', lacedSeen: true }), 'sale'); S.day += 5; eatStash(p); const n1 = S.fate.debts.length; eatStash(q); Math.random = r0; return n1 === 0 && S.fate.debts.length === 1; })() }}
- **배워서 더하기**: 가려낸 첨가물을 뜯어 맛을 분별해 그 재료의 수법을 배운다. 위작, 하급 둔갑품도 똑같이 뜯어 방조와 위작 만들기를 배운다. 배우고 나면 손놀림이 더 깔끔해져서(들통날 기회가 대략 절반으로 준다) 망우산 한 번에 이중의 중독까지 심을 수 있다. 뒷길의 이야기(아래 "방법 묻기" 참고)도 이런 솜씨를 가르친다.{{! (() => { fresh(); const p = newPerson('ren'); p.savvy = 0.6; const t = giveItem('pill_qi'); t.laced = 'poison'; t.lacedBy = 'me'; const a = laceDetectChance(p, t); S.laceKnown = { poison: 1 }; return laceDetectChance(p, t) < a * 0.6; })() }}

## 사람을 부리기

이 몇 가지로 사람을 부릴 수 있다: {{ T.levers() }}. 부림을 받는 사람은 공물을 바치거나, 너를 대신해 집법당을 감시하거나, 소문을 알아봐 준다. 집주인, 집사, 순찰 같은 이들에게는 각자의 "편의"가 있다. 부릴 때마다 들통날 수 있다.

## 고충 심기

고충을 다룰 수 있는 것은 [[start:gu]]뿐이고, 그 바탕은 일문의 [[tech:gumaster]]다: 비급도 없고, 가르쳐주는 이도 없고, 공훈으로도 바꿀 수 없다. 고충을 기르며(알 부화, 먹이기, 성장, 산란, 독 토하기, 서로 잡아먹기) 경험이 쌓이고, 충분히 쌓이면 저절로 중이 오른다. 중이 오를수록 고충이 빨리 자라고, 알을 자주 낳고, 자식 대가 더 독해진다.

고충은 사람에게 직접 놓을 수 없고 **첨가**뿐이다: 고충을 먹고 마실 수 있는 물건에 섞어 팔거나 선물한다. **먹는 사람이 고에 걸린다.** 사 간 사람, 받은 사람이 남에게 건네주면 고에 걸리는 것은 건네받은 그 사람이다. 고충을 모르는 사람은 섞을 수 없다 — 문외한의 손에서 고충은 죽은 벌레일 뿐이다. 네가 직접 먹어도 아무 일도 없다.{{! (() => { fresh(); const t = giveItem('pill_qi'); const no = !!laceWith(t, giveItem('gu', { growth: 100, tox: 40 })) && !t.laced; fresh('normal', 'gu'); S.cult.lv = 2; const p = newPerson('ren'), q = newPerson('ren'); const r0 = Math.random; Math.random = () => 0.99; const a = giveItem('pill_qi'); laceWith(a, giveItem('gu', { growth: 100, tox: 40 })); applyLace(p, a, 'sale'); const before = guBound(p); S.day += 5; eatStash(p); const b = giveItem('pill_qi'); laceWith(b, giveItem('gu', { growth: 100, tox: 40 })); applyLace(q, b, 'sale', true); const n = eatStash(q); const me = giveItem('pill_qi'); laceWith(me, giveItem('gu', { growth: 100, tox: 40 })); const st = S.vit.st; consume(me); Math.random = r0; return no && !before && guBound(p) && !guBound(q) && !q.stash.length && n.some(x => x.text.includes('건네줬고')) && !condSev('me', 'injured'); })() }}

- **섞을 수 있음**: 몇 중이면 몇 단계의 고충을 다룬다 — 일중은 서심고, 금잠고를, 이중은 만독고를, 삼중은 고왕을 섞을 수 있다.
- **심어짐**: 먹은 사람의 수련이 너보다 높지 않고({{ cn(TECHS.gumaster.max) }}중이면 너보다 한 경지 위의 사람까지), 몸에 고충이 없어야 고가 자리 잡는다. 자리 잡지 못한 고는 배 속에서 죽는다. 받을 때 상대가 영리할수록, 너를 덜 믿을수록 알아채기 쉽고, 고가 독할수록 더 숨는다.{{! (() => { fresh('normal', 'gu'); S.tech.gumaster = 3; const p = newPerson('ren'); p.savvy = 0.6; const a = giveItem('pill_qi'), b = giveItem('pill_qi'); laceWith(a, giveItem('gu', { growth: 0, tox: 10 })); laceWith(b, giveItem('gu', { growth: 100, tox: 60 })); return laceDetectChance(p, b) < laceDetectChance(p, a); })() }}
- **고에 걸린 사람**: "{{ LEVERS.gu.name }}"으로 부린다. 따르지 않으면 고가 심장을 갉아 {{ CONDS.injured.grade[1] }}까지 다친다 — 고는 목숨을 앗지는 못한다. 너와 다툴 때는 한 경지가 떨어진다. 너와 일할 때 원한을 품거나, 네 재료를 알아채거나, 사건을 내거나, 보복하는 일은 대개 고가 눌러버린다(일중에 약 {{ pct(0.6) }}, 중마다 1할씩 더). 그들은 너를 보고도 웃지 못한다.{{! (() => { fresh('normal', 'gu'); S.cult.lv = 2; const p = newPerson('ren'); p.visits = 1; const r0 = Math.random; Math.random = () => 0.99; const t = giveItem('pill_qi'); laceWith(t, giveItem('gu', { growth: 100, tox: 40 })); applyLace(p, t, 'gift'); S.day += 5; eatStash(p); Math.random = () => 0.999; S.day++; runCommand(p, 'tribute', 'gu'); S.day++; runCommand(p, 'scout', 'gu'); Math.random = r0; return guBound(p) && condSev(p, 'injured') === 2 && cultGap(p) === 2 - (npcLevel(p) - 1); })() }}
- **정고**: 삼중일 때 고충 구의 재료 칸에 [[item:mihun_flower]]를 두면, 구를 연 그날 밤 금잠고 한 마리가 그것을 먹고 한 쌍의 [[item:love_gu]]로 갈무리되어 산물 칸에 떨어진다(귀시에도 가끔 완성품이 나온다). 똑같이 먹을 것에 섞는다: 어른 여자가 먹으면 {{ '그녀' }}의 호감이 꼭대기에 고정되고 너와의 일에 조금의 해도 없다. 남자나 아이가 먹으면 고가 인정하지 않고 배 속에서 헛되이 죽는다. 정고는 일생에 한 사람만 인정하고, 주인을 인정한 뒤에는 다시 섞을 수 없다. 그러나 암고는 네 가슴에 있다: {{ '그녀' }}가 죽으면 너도 살 수 없다.{{! (() => { fresh('normal', 'gu'); S.cult.lv = 2; S.tech.gumaster = 3; const m = newPerson('xian', { sex: 'm' }), p = newPerson('xian', { sex: 'f', portrait: 'xian_spy' }); const r0 = Math.random; Math.random = () => 0.99; const a = giveItem('pill_qi'); laceWith(a, giveItem('love_gu')); applyLace(m, a, 'gift'); S.day += 5; eatStash(m); const man = !m.loveGu && !S.loveGu; const b = giveItem('pill_qi'); laceWith(b, giveItem('love_gu')); applyLace(p, b, 'gift'); S.day += 5; eatStash(p); const again = !!laceWith(giveItem('pill_qi'), giveItem('love_gu')); Math.random = r0; remember(p, '_', -80); const locked = p.aff === 100; die(p, '_'); return man && again && locked && S.over && S.over.cause === 'lovegu'; })() }}
- **집법당 사람**: 집법당 사람이 네 고를 먹으면, 자리 잡든 못 잡든 눈치챌 수 있고 주시가 단번에 크게 오른다. 결과는…… 직접 해봐라.
- **고에 걸림, 부림 받음, 정고는 서로 다른 것이다**: 고에 걸렸다는 것은 네 고를 먹었다는 것이고 고가 심장을 갉을까 두려워 따르는 것이다. 부림 받음은 식해에 혼인이 심어져 정신이 네게 흔들리는 것이고, 정고는 마음이 너에게 걸리는 것이다. 「인물」 페이지 카드에 각각 「고에 걸림」「부림 받음」「정고」로 표시된다.

## 방법 묻기

잡역 구역 사람들은 저마다 조금씩 아는 바가 있다: 단사와 의원은 단약 처방과 상처 고치는 법을, 대장장이는 화로를, 건달과 장물아비는 뒷길 장사를, 노인과 승려·도사는 인과를, 행상은 시세와 물건 출처를 안다. 한 번 만난 사람은 「인물」 페이지에 그가 어떤 업의 이야기를 알 것 같은지 나열된다(업만 보이고 내용은 보이지 않는다). 하나하나 물어볼 수 있다. 같은 사람에게는 하루에 한 번만 물을 수 있고 정신이 조금 든다. 들은 것은 「권종」의 견문록에 기록된다. 이야기는 모두 {{ loreAll().length }}가지이고, 내용은 게임 데이터로 즉석에서 엮어 이 공략과 마찬가지로 프로그램과 일치한다.{{! loreAll().every(t => !/undefined|NaN/.test(t.text) && LORE_TIER[t.tier]) }}

- **말해주는지**는 세 가지를 본다: 세태(난도가 높을수록 입이 무겁다), 그 이야기의 값어치({{ Object.values(LORE_TIER).join(' / ') }}, 뒷길 장사는 여기에 한 몫 더), 너와의 호감. 적대하는 사람은 한 마디도 해주지 않는다.
- **돈으로 사기**: 호감이 모자랄 때는 {{ LORE_TIER.high }}과 뒷길 이야기만 판다. 부르는 값은 그의 탐욕과 너희 사이의 호감 차이를 따른다. 규칙을 지키는 사람은 돈을 줘도 남을 해치는 이야기는 팔지 않고, 건달과 장물아비는 신경 쓰지 않는다.{{! (() => { fresh(); const p = S.people.thug; p.aff = 0; return loreOffer(p, { tier: 'low', evil: false, id: '_' }).kind !== 'sell' && loreOffer(p, { tier: 'high', evil: true, id: '_' }).kind === 'sell'; })() }}

탐욕이 중간이고 규칙을 그리 지키지 않는 행상 하나를 예로 들면:

{{ T.lore() }}

## 이름 있는 사람들

처음부터 잡역 구역에 있는 몇 사람 외에, 아래 사람들이 차례로 등장한다(등장일은 대략이며 기연을 만나야 한다):

{{ T.cast() }}
