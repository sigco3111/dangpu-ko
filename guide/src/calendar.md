# 절기와 전황

[홈으로](README.md)

한 주는 {{ WEEK_LEN }}일, 한 계절은 {{ SEASON_LEN }}일, 한 해는 {{ YEAR_LEN }}일이다. 시세는 요일, 계절, 명절, 전황을 따라 오르내리고, 상단 바의 달력과 매일 아침의 절기 소식이 오늘 무엇이 잘 팔리는지 알려준다.

## 요일

{{ T.weekdays() }}

## 계절

{{ T.seasons() }}

영초가 [[machine:herbbed]]에서 자라는 속도, [[item:corpse]]가 [[item:bones]]로 썩어가는 속도는 계절에 따라 달라진다.

## 명절

{{ T.annual() }}

## 전황

인, 선, 마, 요 네 세력의 관계가 점점 험악해진다. 긴장도가 고비를 넘으면 다음 단계로 들어가고, 오르기만 할 뿐 내려가지 않는다.{{! WAR_STAGES.every((w, i) => !i || w.at > WAR_STAGES[i - 1].at) }}

{{ T.wars() }}

- 전시에는 단약, 법기, 부적, 영혼, 시괴, 요식 같은 전비품이 점점 귀해지고, 진완 같은 사치품은 점점 값이 떨어진다.{{! (() => WAR_CATS.length > 0 && WAR_STAGES[WAR_STAGES.length - 1].war > WAR_STAGES[0].war)() }}
- 싸움이 격해질수록 순찰은 잦아지고 행상의 매입가는 오른다. 후반에는 오는 손님도 줄어들고, 종문이 주 단위로 징수해 간다.
- [[loc:battlefield]]은 개전 뒤에 더 많은 전장 유물이 나온다([노획, 수위와 뇌대](adventure.md) 참고).
