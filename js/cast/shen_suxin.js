// 沈素心：巷口女郎中。Qwen 3.0 Pro 生态扩展角色；独立样貌与处境。
'use strict';

defineCharacter(ecologyCharacter({
  "id": "shen_suxin",
  "name": "심소심",
  "faction": "ren",
  "sex": "f",
  "title": "골목 어귀 여의원",
  "age": 37,
  "art": "a 37-year-old Chinese woman physician, broad practical face, simple ash-blue cross-collar work robe, pulse cushion and woven medicine basket, practical tied hair",
  "problem": "광부의 각혈이 멎지 않는데 약방은 상자째로만 판다. 소분해서 지어 주고 싶지만 돌릴 돈이 모자란다.",
  "pressure": "약방 점주는 그녀가 금약을 썼다며 환자 명부를 내놓으라 한다.",
  "success": "그녀는 옛 우물가에서 다시 진료를 열고, 외상값은 자기 약상자 밑바닥에 적는다.",
  "failure": "그녀의 약상자는 봉해졌고, 광부들은 다시 비싼 약 줄에 서야 했다.",
  "item": "herb_blood",
  "start_day": 9,
  "cost": 50,
  "clique": "law",
  "healer": { "heals": ["injured", "poisoned"], "fee": 30 }
}));
