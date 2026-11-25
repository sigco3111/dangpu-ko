// 许行针：行脚女医修。Qwen 3.0 Pro 生态扩展角色；独立样貌与处境。
'use strict';

defineCharacter(ecologyCharacter({
  "id": "xu_xingzhen",
  "name": "허행침",
  "faction": "ren",
  "sex": "f",
  "title": "떠도는 여의수(醫修)",
  "age": 49,
  "art": "a 49-year-old Chinese female travelling spiritual physician, lined mature face, faded protective shoulder cape over full-cover travelling robe, needle pouch and medicine gourd, dusty boots, no glamorous styling",
  "problem": "군상(軍傷)의 영력 울결은 너무 오래 끌려, 걷지 못하는 이들의 맥을 풀어 줄 옛 침 재료를 사고 싶어 한다.",
  "pressure": "군의서(軍醫署)는 상병을 꾀병으로 써야 관문을 지날 수 있다 한다.",
  "success": "상병은 통행 증서를 되찾았고, 그녀의 침 주머니에는 깁는 실이 몇 올 더 늘었다.",
  "failure": "꾀병이라는 죄명이 관문에 붙었고, 그녀는 침을 들고 먼 길을 돌아 그들을 보러 갔다.",
  "item": "herb_dew",
  "start_day": 60,
  "cost": 70,
  "clique": "law",
  "healer": { "heals": ["injured", "poisoned", "deviation"], "fee": 45 }
}));
