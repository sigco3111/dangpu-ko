# 상처와 독, 치료와 죽음

[홈으로](README.md)

## 세 가지 상태

{{ T.conds() }}

- **걸리는 경로**: 노획 중 사고, 사람과의 다툼, 뇌대 참패, 골목에서 맞고 독을 먹음, 관문 돌파 실패.
- **영향**: 겨루기, 싸움, 노획에서 손해를 본다. [[cond:injured]]는 밤의 회복량을 줄이고, [[cond:poisoned]]는 매일 밤 체력과 정신을 갉아먹으며, [[cond:deviation]]은 수위가 오르지 않고 돌파가 반드시 실패하며 거짓말이 잘 들통나게 한다.
- 체력이나 정신이 바닥나면 [[cond:exhausted]]가 된다. 겨루기에서 손해를 보지만 하룻밤 쉬면 낫는다.

## 죽을 수 있다

- [[cond:injured]] 삼중({{ CONDS.injured.grade[2] }}), [[cond:poisoned]] 삼중({{ CONDS.poisoned.grade[2] }}일 때 매일 밤 숨이 넘어갈 기회가 생긴다. 삼중에서 한 중이 더해지면 그 자리에서 죽는다.{{! (() => { fresh(); S.flags.savior = 0; addCond('me', 'injured', 3); addCond('me', 'injured', 1); return S.over && S.over.title === '중상으로 사망'; })() }}
- 치료하지 않고 버티기만 한다면: {{ CONDS.injured.grade[2] }}이 스스로 가라앉을 때까지({{ CONDS.injured.heal * 3 }}일 밤) 버티는 동안 약 **{{ pct(T.probe.deathRate('injured', 3, CONDS.injured.heal * 3)) }}**는 넘기지 못한다. {{ CONDS.poisoned.grade[2] }}는 저절로 낫지 않고, {{ CONDS.poisoned.worsen * 5 }}일 밤을 버티면 약 **{{ pct(T.probe.deathRate('poisoned', 3, CONDS.poisoned.worsen * 5)) }}**가 독발 사망한다.
- 위험한 선택지는 중상·위독 상태에서 결과를 명시한다("다시 다치면 위독해진다", "다시 다치면 반드시 죽는다"). 확인하고 눌러라.
- 호신부가 있으면 귀문관 앞에서 끌려나와 이중으로 내려온다.{{! (() => { fresh(); S.flags.savior = 1; addCond('me', 'injured', 3); addCond('me', 'injured', 1); return !S.over && condSev('me', 'injured') === 2 && S.flags.savior === 0; })() }}

## 치료하는 법

상단 바의 상처·독을 누르면 **구의**가 열린다: 손에 있는 맞는 약(바로 복용)과, 알고 지내는 의원이 나열된다.

### 손에 있는 약

{{ Object.entries(CONDS).map(([k, c]) => `**${c.name}**: ${c.cure.map(id => ref('item', id)).join(', ')}`).join('; ') }}.

약력은 품질을 따른다: **하품**(품질 {{ CURE_GRADES[1][0] }} 미만)은 한 중만 덜고, **중품**은 두 중을 덜고, **상품**(품질 {{ CURE_GRADES[0][0] }} 이상)은 뿌리를 뽑는다 — 위독한 상처에는 하품 약을 세 알 연거푸 먹어야 한다. 하급 둔갑품은 실제 품질로 계산한다.{{! (() => { fresh(); addCond('me', 'injured', 3); consume(makeItem('vine_fruit', { q: 20 })); const a = condSev('me', 'injured'); consume(makeItem('vine_fruit', { q: 50 })); const b = condSev('me', 'injured'); addCond('me', 'injured', 3); consume(makeItem('vine_fruit', { q: 70 })); return a === 2 && b === 0 && condSev('me', 'injured') === 0; })() }}{{ CONDS.deviation.name }}에는 순도가 충분히 높은 영수가 필요하다(세령지에서 씻어낸 것).{{! (() => { fresh(); addCond('me', 'deviation', 1); return cureBy(makeItem('water', { purity: 98 })) == null && cureBy(makeItem('water', { purity: 99.5 })) === 'deviation'; })() }}

[[item:vine_fruit]]는 [[machine:yaopot]]로 기르고, [[item:pill_blood]]와 [[item:pill_qi]]는 [[machine:danlu]]로 녹이고, [[item:herb_blood]]는 [[machine:herbbed]]에서 기른다. 행상과 귀시에도 자주 나온다([설비와 제조법](production.md), [경영](shop.md) 참고). 몸을 던지는 모험 전에 한두 가지 챙겨두는 게 좋다.

### 의원

의술을 아는 사람과 한 번 만나면(네 가게에 온 뒤) 「인물」 페이지에서 그에게 **진료를 청할** 수 있고, 상단 바의 상처·독에서 바로 찾아갈 수도 있다. 아는 의원이 없으면 손에 있는 약이나 요양뿐이다.

{{ T.healers() }}

진료비는 네 몸의 고칠 수 있는 상처·독의 총 중수로 계산하고, 호감이 깊을수록 싸지며, 탐욕스러운 자는 더 받는다. 의원 본인을 적으로 돌린 경우(호감이 적대까지 떨어짐)에만 진료를 거절당하고, 평판의 좋고 나쁨은 연좌하지 않는다.{{! (() => { fresh(); const id = 'shen_suxin'; startStory(id, id, 'meet', 99); const p = S.people[id]; p.visits = 1; p.aff = 0; addCond('me', 'injured', 2); S.fate.infamy = 10; const ok = !healBlock(p); p.aff = -60; return ok && !!healBlock(p); })() }}{{ CONDS.injured.grade[2] }}을 예로 들면:

{{ T.healFees(Object.keys(CAST).filter(k => CAST[k].healer)) }}

## 인물도 다치고, 아프고, 죽는다

- 인물에게 팔거나 준 진짜 약(위작이 아니고 해로운 것을 섞지 않은 것)은 그 자리에서 그 사람의 맞는 상처·독을 고친다. 몇 중을 고치는지도 품질을 따른다. 상처나 중독을 안고 찾아오는 사람은 대개 약을 사러 오는 것이다. 「인물」 페이지의 카드에 누가 다쳤는지 표시되고, 눌러서 손에 맞는 약이 있으면 「치료해준다」가 뜬다.{{! (() => { fresh(); const p = Object.values(S.people)[0]; addCond(p, 'injured', 2); npcCure(p, makeItem('vine_fruit', { q: 60 })); return !condSev(p, 'injured'); })() }}
- 중독이 발작한 인물은 스스로 의원을 찾아가고, 찾지 못하면 독발 사망한다. {{ CONDS.injured.grade[2] }}인 사람도 매일 밤 상세 불치로 죽을 기회가 있다.
- 중독된 사람은 끊으면 한동안 시달리다가 끊어내지만, 계속 공급해주면 계속 쇠약해진다.
