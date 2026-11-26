# 노획, 수위와 뇌대

[홈으로](README.md)

## 노획

파장 후에는 밖에 나가 노획을 할 수 있다. 하룻밤에 한 곳. 한 번 뒤질 때마다 체력과 정신이 들고, 위험을 만날 확률은 뒤질수록 높아진다. 위험을 만나면 그 자리에서 끝나고, 상처나 중독, 돈을 잃거나 집법당을 부를 수 있다. 상처를 입은 채 뒤지면 더 힘이 들고 사고도 잦다([상처와 독, 치료와 죽음](health.md) 참고).

{{ T.locations() }}

나온 물건의 품상은 들쭉날쭉하고, 감정 무늬가 붙은 것(단약, 옥패, 옛 거울)은 대개 가짜다. 내놓기 전에 반드시 감정하자.

## 수위

단약과 영혼을 복용해 수련하면 수위가 오른다. 수위가 충분히 쌓이면 파경의 물건을 들고 관문을 돌파한다.

{{ T.realms() }}

복용할 수 있는 것:

{{ T.cultXp() }}

- "선명 손상"이라 적힌 것은 사물이다. 한 번 복용할 때마다 선명이 조금씩 떨어진다.
- 관문 돌파의 성공률: 수위가 막 충분해졌을 때 약 {{ pct((fresh(), S.cult.xp = REALMS[1].need, breakOdds())) }}. 폐관 중이면 더 높고, 수위를 더 쌓을수록 더 높아진다. 상처와 중독은 발목을 잡는다. 돌파에 실패하면 수위가 깎이고 [[cond:deviation]]에 걸린다.{{! (() => { fresh(); S.cult.xp = REALMS[1].need; const a = breakOdds(); S.retreat = true; const b = breakOdds(); S.retreat = false; addCond('me', 'injured', 1); return b > a && breakOdds() < a; })() }}
- **파경의 물건은 진품이어야 하고 충분해야 한다**: 위작이나 하급 둔갑품도 삼킬 수는 있다(위작의 약력은 안에 든 한 가지뿐이라, 가짜 축기단을 먹으면 회기단이 나온다). 하지만 관문은 열리지 않는다. 문제를 알아챈 것은 돌파에 쓸 수 없고, 알아채지 못한 것은 돌파 때 헛되이 소모되지만, 관문은 열리지 않아도 수위는 깎이지 않는다. 진품이 손에 있으면 돌파는 진품부터 쓴다.{{! (() => { fresh(); S.cult.xp = REALMS[1].need; const f = giveItem('pill_found', { fake: true }); const xp = cultXp(f) > 0 && cultXp(f) < cultXp(makeItem('pill_found')); const r0 = Math.random; Math.random = () => 0.001; const r = breakthrough(); Math.random = r0; const failed = !r.ok && S.cult.lv === 1 && S.cult.xp === REALMS[1].need && !condSev('me', 'deviation'); giveItem('pill_found', { fake: true, revealed: true }); const blocked = !!canBreak(); fresh(); S.cult.lv = 2; S.cult.xp = REALMS[2].need; const d = giveItem('blood_infant', { q: 30 }); dressUp(d, 2); Math.random = () => 0.001; const r2 = breakthrough(); Math.random = r0; return xp && failed && blocked && !r2.ok && S.cult.lv === 2; })() }}
- 경지가 상대보다 높아야 사람에게 손을 쓸 수 있다(문 걸고 덮치기, 밤길 매복).{{! (() => { fresh(); const p = Object.values(S.people).find(p => killable(p) && npcLevel(p) >= S.cult.lv); return !p || !!canKill(p); })() }}

## 뇌대

{{ TOURNEY_EVERY }}일마다 외문 소규모 비무가 열리고, 해 끝에는 종문 대비가 있다. 전당 집사가 며칠 전에 찾아와 누가 오르는지, 어떤 상처와 독을 지니고 있는지 알려준다. 출전하거나, 돈을 걸거나, 상대에게 약을 먹이거나, 가지 않을 수도 있다.

{{ T.tourney() }}

- 상처와 중독을 안고 오르면 이기기 어렵고, [[cond:injured]]가 삼중에 이르면 다시 맞을 때 목숨을 잃는다([상처와 독, 치료와 죽음](health.md) 참고).
- 이기면 영석과 상품 외에 마종 명성과 공훈, 전당의 호감도 오른다.
