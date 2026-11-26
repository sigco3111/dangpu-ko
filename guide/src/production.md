# 설비와 제조법

[홈으로](README.md)

뒷마당의 설비는 낮에 재료를 넣고 밤에 불을 때운다. 설비마다 매일 밤 영력을 쓰고, 네 체력과 정신도 든다(뒷마당에 고역꾼이 있으면 체력분은 고역꾼이 대신한다).

## 영력

- 영력진은 매일 밤 저절로 {{ ARRAY_BASE_POWER }} 포인트의 영력을 지닌다. [[upgrade:hijack]]을 하면 {{ (() => { fresh(); const a = powerSupply(); S.upgrades.hijack = true; return powerSupply() - a; })() }} 포인트, [[upgrade:vein]]을 하면 {{ (() => { fresh(); const a = powerSupply(); S.upgrades.vein = true; return powerSupply() - a; })() }} 포인트가 더해진다.
- 모자라는 만큼은 영력 칸의 [[item:spirit_crystal]]에서 끌어온다. 한 개에 최대 {{ CRYSTAL_CAP }} 포인트까지 충전된다.
- 영력이 모자란 설비는 그날 밤 멈추므로, 「공방」의 순서에서 급한 것을 앞에 두어라.

## 설비

값은 보통 난도 기준이다(다른 난도는 가산이 붙는다. [시작과 난도](start.md) 참고).

{{ T.machines('normal') }}

## 검증된 제조법

아래 표의 모든 행은 새로 시작한 판에서 실제로 재료를 넣고 불을 때워 얻은 결과다. 재료는 중간 품상 기준, 공법과 폐관의 가산은 계산하지 않았다.

{{ T.recipes([
  ['furnace', [['iron_ore', 2]]],
  ['furnace', [['scrap_sword', 1]]],
  ['forge', [['iron_ingot', 3]], { mods: [['jade_slip', 1]] }],
  ['dihuo', [['iron_ore', 6]]],
  ['danlu', [['herb_dew', 2]]],
  ['danlu', [['herb_blood', 1], ['yao_core', 1]]],
  ['danlu', [['herb_blood', 2], ['yao_core', 1], ['herb_dew', 1]], { mods: [['pill_recipe', 1]] }],
  ['danlu', [['spirit_fruit', 2], ['herb_blood', 1]], { tech: { alchemy: 1 } }],
  ['danlu', [['yao_core', 1], ['blood_essence', 2], ['herb_blood', 1]], { tech: { alchemy: 2 } }],
  ['danlu', [['mihun_flower', 2]]],
  ['pool', [['water', 1, { purity: 60 }], ['filter_sand', 1]]],
  ['pool', [['water', 1, { purity: 98 }], ['spirit_sand', 1]]],
  ['spring', []],
  ['winejar', [['spirit_fruit', 2], ['yeast', 1]], { nights: 2 }],
  ['soulfurnace', [['soul_wisp', 3]]],
  ['soulfurnace', [['soul_grudge', 1]]],
  ['coffin', [['corpse', 1], ['soul_pearl', 1]], { nights: 2 }],
  ['puppetbench', [['iron_ingot', 2], ['soul_pearl', 1]], { mods: [['puppet_scroll', 1]] }],
  ['fudesk', [['fu_paper', 1], ['cinnabar', 1]]],
  ['silkrack', [['silk_seed', 1], ['spirit_fruit', 2]]],
]) }}

기르고 심어서 며칠 밤이 지나야 결과가 나오는 종류도 있다:

- **[[machine:herbbed]]**: [[item:herb_seed]]를 심으면 [[item:herb_blood]]나 [[item:herb_dew]]로 자란다. 봄여름에는 빠르고 겨울에는 느리다([절기와 전황](calendar.md) 참고).
- **[[machine:yaopot]]**: [[item:mihun_seed]]는 [[item:mihun_flower]]로 자란다. [[item:vine_seed]]는 [[item:bones]]나 [[item:corpse]]를 먹여야 자라서 [[item:vine_fruit]]를 맺는다 — 상처에 좋은 약이다.
- **[[machine:gupot]]**: 세 칸이 한 줄이다 — 재료 칸에 [[item:bones]]를 넣고, 고충 칸에서 [[item:gu]]를 기르고 [[item:gu_egg]]를 부화하고, 산물 칸에서 새로 낳은 알과 뱉어낸 [[item:gu_venom]]을 거둔다. 구를 열어두느냐 봉하느냐에 따라 기르는 법이 완전히 달라진다:
  - **열어 두고 먹이기**: 알은 하룻밤이면 부화하고, 어린 고충은 매일 밤 썩은 뼈 하나씩을 먹고 자라 다 자라면 금잠고가 된다. 다 자란 고충 두 마리는 알을 낳을 수 있고, 알은 산물 칸에 떨어지니 부화시키려면 고충 칸으로 옮긴다. 만독고와 고왕도 매일 밤 뼈 하나를 먹고 고독을 뱉는다(만독고는 {{ pct(GU_VENOM[2]) }} 확률, 고왕은 매일 밤).
  - **봉하고 싸우기**: 먹이지도 부화시키지도 않고, 매일 밤 가장 흉포한 한 마리가 가장 약한 한 마리를 삼켜 상대 독성의 {{ pct(GU_DEVOUR_TOX) }}를 빼앗는다. 그가 삼켰던 것까지 제 수에 합산한다. {{ GU_STAGES[2].eat }}마리를 삼키면 **만독고**, {{ GU_STAGES[3].eat }}마리를 삼키면 **고왕**이 되고, 탈바꿈할 때마다 고독 한 몫을 뱉는다. 만독고 두 마리를 길러 한 구에 봉하면 이긴 쪽이 하룻밤에 왕이 된다.
  - 독성 예순의 금잠고는 대략 {{ (fresh(), rawValue(makeItem('gu', { growth: 100, tox: 60 }))) }}의 값어치, 같은 독성의 만독고는 {{ (fresh(), rawValue(makeItem('gu', { growth: 100, tox: 60, eat: GU_STAGES[2].eat }))) }}, 고왕은 {{ (fresh(), rawValue(makeItem('gu', { growth: 100, tox: 60, eat: GU_STAGES[3].eat }))) }}. 어린 고충을 금잠고에게 먹이는 것이 가장 남는 장사다. 고독은 마종 금약으로 귀시에서 사들이고, 뇌대 전에 약으로 쓸 수도 있다.
- **[[machine:pen]]**: [[item:treasure_rat]]를 기르면 밤에 물건을 물어 오고, [[item:gold_bug]]를 기르면 고철을 삼키고 [[item:spirit_sand]]를 뱉는다. [[item:beast_feed]]를 먹이면 빨리 자란다.
- 우리의 사료 칸, 고충 구의 재료 칸에서 같은 종류의 사료는 한 칸에 쌓이고 한 칸에 최대 {{ MACHINES.pen.feedStack }}몫이다. 쌓인 몫마다 품상은 따로 기록되고, 먼저 넣은 것부터 먹으며, 꺼낼 때도 각각 그대로다.
- **[[machine:forgery]]**: 물건을 "오래된 좋은 것처럼" 손질하거나 견본을 보고 방조한다(먼저 익혀야 한다. 아래 공법 참고).
- **[[machine:puppet]]**: 밤에 너를 대신해 노점을 펴고 물건을 판다. 돈은 돈통에 들어온다.

## 공법과 비급

공법은 한 중 오를 때마다 해당 설비의 결과물이 좋아지고, 어떤 것은 한 화로가 더 는다. 모두 제사중까지 닦는다. 비급은 순서대로 읽어야 한다. 첫째, 둘째 중은 행상에게서 사고, 마종 명성이 충분해야 다음 중을 팔아준다. 셋째, 넷째 중은 귀시에서 팔지 않고 공훈이나 기연으로 얻는다:

- **공훈 교환**: 행상의 "공훈" 페이지에서 해당 쪽의 공훈으로 비급을 바꾼다(네가 지금 읽을 수 있는 그 중만 내놓는다).
- **명인의 전수**: 표에 실린 명인과 호감이 충분하고(삼중 호감 {{ G.TEACH_AFF[0] }}, 사중 {{ G.TEACH_AFF[1] }}), 그 자신의 일도 마무리되면 며칠 뒤 손수 베낀 책을 품에 품고 찾아온다. 책값의 {{ G.TEACH_FEE * 100 }}%를 수업료로 바치거나, 고맙다는 인사만 하고도 그 자리에서 배운다. 아직 앞의 중을 배우지 못했으면 오지 않고, 이미 다른 데서 배웠으면 그만둔다. 바쁘면 다른 날 다시 오라고 할 수 있다.
- **노획 중 우연한 획득**: 무언가를 한 건 뒤질 때마다 {{ G.SCROLL_FIND * 100 }}% 확률로 마침 네게 모자란 고중 비급 한 권이다 — 그 장소에 있는 몇 과목만 나온다: {{ G.LOCATIONS.map(l => `${l.name}(${l.scrolls.map(t => G.TECHS[t].name).join(', ')})`).join(', ') }}.
- **착한 일의 보답**: 도운 사람이 출세해서 보내오는 두터운 답례 속에 네게 모자란 비급 한 권이 들어 있을 수도 있다.

중보(바닥값 {{ G.DEEP_MARK_BASE }} 이상)는 원주인의 낙인이 깊어 사중까지 이를 수 있고, 낙인 지우기 사중이어야 지울 수 있다.

{{ T.techs() }}

## 폐관

파장 후에 **폐관**할 수 있다: 그날 밤 네가 직접 화로 곁을 지켜 [[machine:dihuo]]로 [[item:xuan_essence]]를 녹여 [[item:god_blank]]을 만들 수 있고, 모든 화로의 결과물이 더 정교해지며 수위도 오른다. 대가로 체력과 정신의 회복이 적다.{{! (() => { const a = T.craft('dihuo', [['xuan_essence', 4]], { retreat: true }); return a.out.some(([id]) => id === 'god_blank'); })() }}
