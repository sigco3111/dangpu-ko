// 《魔门当铺·来路不明》静态数据：物品、设备、开局、难度、派系、顾客与事件表
'use strict';

// 格子边长：随排版变（见 ui.js fitStage）
let CELL = 40;

const FACTIONS = {
  ren:  { name: '인족', color: '#d9b36a', icon: 'ic_rep_ren',  desc: '범인과 산수. 예산은 넉넉지 않지만 거래는 실속 있다. 가산을 저당 잡히러 자주 온다.' },
  xian: { name: '선문', color: '#8fd3ff', icon: 'ic_rep_xian', desc: '마종에 잠입한 정도 제자. 손이 크지만, 이들과 거래하면 집법당의 주목을 받는다.' },
  mo:   { name: '마종', color: '#e0524a', icon: 'ic_rep_mo',   desc: '혈살종 제자와 집사. 명성이 높으면 순찰이 느슨해지고 물량이 는다.' },
  yao:  { name: '요족', color: '#e8902f', icon: 'ic_rep_yao',  desc: '화형한 요수. 영과와 영주를 좋아하고, 같은 족속의 요단을 파는 자를 가장 증오한다.' },
};

const CATS = {
  dan: '단약', qi: '법기', cai: '영재', yao: '요재', yin: '영음',
  fu: '부록', gu: '고충', wan: '진완', ju: '진구', ji: '비급', za: '잡동사니',
  hun: '혼백', shi: '시괴', zhi: '요식', chong: '영총', xin: '소식',
};

// 各品类吸引的顾客派系权重
const CAT_FACTION = {
  dan: { mo: 4, ren: 3, xian: 1 },
  qi:  { mo: 5, xian: 2, ren: 1 },
  cai: { ren: 3, mo: 3, yao: 1 },
  yao: { mo: 5, ren: 1 },
  yin: { yao: 4, ren: 3, mo: 1 },
  fu:  { mo: 3, ren: 2, xian: 2 },
  gu:  { mo: 3, yao: 2 },
  wan: { xian: 3, mo: 2, ren: 2 },
  ju:  { mo: 3, ren: 2 },
  ji:  { mo: 3, ren: 2, xian: 1 },
  za:  { ren: 3 },
  hun: { mo: 5 },
  shi: { mo: 4, ren: 1 },
  zhi: { yao: 3, ren: 2, mo: 1 },
  chong: { yao: 3, ren: 2, mo: 1 },
  xin: { xian: 2, mo: 2, ren: 1, yao: 1 },
};

// contra：仙门禁物；illicit：魔宗禁药；appraise：可鉴定种类；mod：可装入的设备模组槽
// war：战时涨价的权重（0–1）；lux：太平年间的奢侈品，战时跌价；additive：可加进别的货里的“料”
const ITEMS = {
  scrap_sword:    { name: '부러진 검 고철', cat: 'cai', w: 1, h: 2, base: 12,  desc: '부서진 검과 남은 날. 재용해하면 현철을 얻는다.' },
  iron_ore:       { name: '현철광',   cat: 'cai', w: 1, h: 1, base: 10,  desc: '연기로의 기초 원료. 둘이 정 하나가 된다.' },
  iron_ingot:     { name: '현철 주괴',   cat: 'cai', w: 1, h: 1, base: 46,  war: 0.5, desc: '연기대에서 비검을 만드는 데 필요하다.' },
  water:          { name: '영천수',   cat: 'yin', w: 1, h: 1, base: 0,   war: 0.3, desc: '값어치는 순도에 달렸다. 세령지로 정제할 수 있고 상한은 99.01%.' },
  filter_sand:    { name: '여영사',   cat: 'cai',  w: 1, h: 1, base: 5,   desc: '세령지 소모품. 물 한 병을 정제할 때마다 한 포를 쓴다.' },
  herb_seed:      { name: '영초종',   cat: 'cai', w: 1, h: 1, base: 4,   desc: '약초밭에 심으면 이틀 뒤 응로초나 혈영지가 된다.' },
  herb_dew:       { name: '응로초',   cat: 'cai', w: 1, h: 1, base: 18,  war: 0.3, desc: '회기단의 주재료.' },
  herb_blood:     { name: '혈영지',   cat: 'cai', w: 1, h: 1, base: 40,  war: 0.4, additive: 'tonic', desc: '혈살단과 축기단의 주재료.' },
  yao_core:       { name: '요단',     cat: 'yao', w: 1, h: 1, base: 70,  war: 0.4, desc: '요수가 평생 수행을 응축한 것. 진열하면 요족이 격노한다.' },
  beast_hide:     { name: '요수 가죽',   cat: 'yao', w: 2, h: 2, base: 55,  war: 0.3, desc: '상등 가죽. 마수들이 갑옷을 지어 몸을 지킨다. 진열하면 요족이 격노한다.' },
  bones:          { name: '썩은 뼈',     cat: 'za',  w: 1, h: 1, base: 2,   desc: '고충, 서혈등, 영총의 먹이. 혈문 호부를 그릴 때도 뼛가루를 조금 섞는다.' },
  gu_egg:         { name: '고충 알',     cat: 'gu',  w: 1, h: 1, base: 25,  desc: '고충 항아리에 넣으면 하룻밤에 부화한다.' },
  gu:             { name: '서심고',   cat: 'gu',  w: 1, h: 1, base: 30,  additive: 'control', desc: '밤마다 썩은 뼈 하나를 먹고 자라, 성장이 차면 금잠고가 된다. 독성은 유전한다. 고충 항아리에 봉해 서로 먹게 하면 셋을 삼켜 만독고, 여덟을 삼켜 고왕이 되고 단계마다 값이 오른다. 기르는 이는 이를 먹을 것에 섞어, 먹는 사람마다 고충에 걸리게 한다. 고충을 모르는 이가 넣으면 그냥 죽은 벌레다.' },
  gu_venom:       { name: '고충 독',     cat: 'gu',  w: 1, h: 1, base: 40,  illicit: true, desc: '만독고와 고왕이 뱉은 독침. 작은 자기 병에 담겨 자줏빛으로 빛난다. 독성이 셀수록 비싸다. 귀시는 무조건 사 주고, 비무 전 상대 그릇에 한 방울 떨궈도 된다.' },
  spirit_fruit:   { name: '영과',     cat: 'cai', w: 1, h: 1, base: 12,  lux: true, desc: '요족이 가장 좋아한다. 둘에 누룩 하나면 영주를 담글 수 있다.' },
  yeast:          { name: '누룩',     cat: 'cai', w: 1, h: 1, base: 6,   desc: '술 담글 때 쓴다.' },
  spirit_wine:    { name: '영주',     cat: 'yin', w: 1, h: 2, base: 110, lux: true, desc: '영과로 담가 향기가 반 거리를 흘러간다.' },
  spirit_crystal: { name: '영정',     cat: 'ju',  w: 1, h: 1, base: 60,  war: 0.6, desc: '취령진 진안에 넣어 남는 영력을 저장해 밤에 쓴다.', mod: 'array' },
  broken_bowl:    { name: '금 간 법발',   cat: 'za',  w: 1, h: 1, base: 6,   desc: '누구의 중이 남겼는지 모를 금 간 동발. 법력은 진작 사라졌다. 서금충이 갉아먹기 좋아해 고순 영사 한 줌이 나온다.' },
  pill_qi:        { name: '회기단',   cat: 'dan', w: 1, h: 1, base: 70,  war: 0.8, desc: '기를 돌리고 정신을 기르는 흔한 단약. 먹으면 정신이 번쩍 든다.' },
  pill_blood:     { name: '혈살단',   cat: 'dan', w: 1, h: 1, base: 180, war: 1, desc: '마수 속성 단약. 여기가 깊다.' },
  pill_found:     { name: '축기단',   cat: 'dan', w: 1, h: 1, base: 900, war: 0.3, desc: '축기 성약. 시중에 위작이 몹시 많다.', appraise: 'pill' },
  pill_recipe:    { name: '단방·축기', cat: 'ji', w: 1, h: 1, base: 400, desc: '단로 모듈 칸에 넣으면 축기단을 만들 수 있다.', mod: 'danlu' },
  jade_slip:      { name: '기보 옥간', cat: 'ji',  w: 1, h: 1, base: 260, desc: '연기대 모듈: 현철 주괴 셋으로 제식 비검 하나. 연기 이중이면 신병 배료에 날을 세워 마검을 만드는 기보이기도 하다.', mod: 'forge' },
  sword_std:      { name: '제식 비검', cat: 'qi',  w: 1, h: 3, base: 220, war: 1, desc: '혈살종 외문 제자의 기본 지급 비검.' },
  soul_banner:    { name: '섭혼편',   cat: 'qi',  w: 2, h: 3, base: 950, war: 0.6, desc: '내문의 마기. 편 안에 무수한 잔혼이 갇혀 있다.' },
  xian_sword:     { name: '청소검',   cat: 'qi',  w: 1, h: 3, base: 1400, war: 0.4, desc: '선문의 명검. 마종 경내에 숨겨 두는 것만으로 중죄다.', contra: true },
  xian_talisman:  { name: '태청부',   cat: 'fu',  w: 1, h: 1, base: 130, war: 0.5, desc: '선문 호부. 마수가 만지면 손이 덴다.', contra: true },
  xian_robe:      { name: '선문 도포', cat: 'wan', w: 2, h: 2, base: 300, lux: true, desc: '정도 제자의 제식 도포.', contra: true },
  demon_charm:    { name: '혈문 호부', cat: 'fu',  w: 1, h: 1, base: 55,  war: 0.6, desc: '마종 제자가 지니는 호부.' },
  jade_pendant:   { name: '옛 옥패',   cat: 'wan', w: 1, h: 1, base: 380, lux: true, desc: '전조의 반룡 옥패. 모조품이 넘친다.', appraise: 'jade' },
  bronze_mirror:  { name: '청동 고경', cat: 'wan', w: 2, h: 2, base: 600, lux: true, desc: '상고 여덟 잎 꽃무늬 거울. 요괴의 본모습을 비춘다고 한다.', appraise: 'mirror' },
  scroll_manual:  { name: '찢긴 공법서', cat: 'ji',  w: 1, h: 2, base: 150, lux: true, desc: '이름 모를 공법의 찢긴 쪽. 다 모을 수도 익힐 수도 없다. 산수들은 기연으로 여기고, 권귀들은 서재 장식으로 쓴다.' },
  fire_disk:      { name: '취화진반', cat: 'ju',  w: 1, h: 1, base: 160, desc: '연기로 모듈: 밤마다 화로 수 2→4, 하지만 완성 정 품질이 내려간다.', mod: 'furnace' },
  dan_fire:       { name: '단화진반', cat: 'ju',  w: 1, h: 1, base: 90,  desc: '단로가 새겨진 붉은 구리 진반. 화로 불을 진정시켜 꺼지지 않게 한다. 단로 모듈: 밤마다 한 화로 추가, 완성 단약 품질 +20.', mod: 'danlu' },
  soul_bell:      { name: '섭혼령',   cat: 'qi',  w: 1, h: 1, base: 240, war: 0.5, mod: 'soulfurnace', desc: '흔들면 정신이 아득해진다. 연혼로 모듈 칸에 걸면 혼을 화로로 이끌어 밤마다 한 화로 추가.' },
  soul_wisp:      { name: '유혼',     cat: 'hun', w: 1, h: 1, base: 28,  war: 0.5, desc: '난장 고개를 떠도는 잔혼. 셋이면 혼주 하나를 만들 수 있다.' },
  soul_grudge:    { name: '원혼',     cat: 'hun', w: 1, h: 1, base: 75,  war: 0.7, desc: '억울하게 죽은 이의 원혼. 여기가 몹시 무겁다. 하나만으로도 상품 혼주를 만들 수 있다.' },
  soul_pearl:     { name: '연혼주',   cat: 'hun', w: 1, h: 1, base: 230, war: 1, desc: '혼백으로 만든 구슬. 법기와 철시, 꼭두각시를 움직이는 마도의 원천.' },
  corpse:         { name: '이름 없는 시신',   cat: 'shi', w: 1, h: 2, base: 22,  war: 0.3, desc: '돗자리에 싼 시신. 썩는다. 여름엔 특히 빨리, 다 썩으면 썩은 뼈만 남는다.' },
  iron_corpse:    { name: '철시',     cat: 'shi', w: 1, h: 3, base: 640, war: 1, desc: '연시관에서 만든 철시. 창칼이 안 통하고 명령대로 움직인다.' },
  corpse_poison:  { name: '시독',     cat: 'shi', w: 1, h: 1, base: 45,  illicit: true, additive: 'poison', desc: '연시 때 떨어진 시독. 먹을 것에 섞으면 신선도 못 구한다.' },
  puppet_doll:    { name: '기관 꼭두각시', cat: 'shi', w: 1, h: 3, base: 520, war: 1, desc: '현철을 뼈로, 혼주를 심장으로 한 기관 꼭두각시.' },
  puppet_scroll:  { name: '괴뢰 도보', cat: 'ji',  w: 1, h: 1, base: 320, desc: '꼭두각시대 모듈: 현철 주괴 둘, 혼주 하나로 기관 꼭두각시 하나를 만든다.', mod: 'puppetbench' },
  mihun_seed:     { name: '미혼화 씨', cat: 'zhi', w: 1, h: 1, base: 8,   desc: '요식 화분에 심으면 이틀 뒤 꽃이 핀다.' },
  mihun_flower:   { name: '미혼화',   cat: 'zhi', w: 1, h: 1, base: 32,  desc: '꽃향기가 사람을 아득하게 한다. 두 송이를 단로에 넣으면 망우산이 된다.' },
  wangyou:        { name: '망우산',   cat: 'dan', w: 1, h: 1, base: 95,  illicit: true, additive: 'addict', desc: '먹으면 근심을 잊고, 다시 먹으면 끊을 수 없다. 마종이 명문으로 판매를 금한다.' },
  vine_seed:      { name: '서혈등 종자', cat: 'zhi', w: 1, h: 1, base: 12,  desc: '요식 화분에 심으면 밤마다 썩은 뼈 하나나 시신 하나를 먹고, 사흘 뒤 열매를 맺는다.' },
  vine_fruit:     { name: '혈등과',   cat: 'zhi', w: 1, h: 1, base: 65,  war: 0.8, desc: '피와 살을 양분 삼는 요과. 지혈하고 뼈를 잇는 치상 성약.' },
  broken_relic:   { name: '깨진 법기', cat: 'qi',  w: 1, h: 2, base: 32,  war: 0.3, desc: '옛 전장과 종문 폐허에서 캐낸 깨진 기물. 연기대(기정)에 넣고 현철 주괴 하나를 더해 다시 제련하면 원래보다 좋은 법보가 나올 수도 있다.' },
  waste_pill:     { name: '폐단',     cat: 'dan', w: 1, h: 1, base: 9,   desc: '화로가 터지고 남은 폐단. 약력이 다 흩어지지 않았다. 두 알을 단로에 넣어 다시 제련하면 열에 일곱여덟은 단약이 된다. 보물찾기 쥐가 먹으면 단인을 토해 낸다.' },
  spirit_sand:    { name: '고순 영사', cat: 'cai',  w: 1, h: 1, base: 48,  desc: '서금충이 쇠를 삼켜 만든 것. 세령지에 여영사 대신 넣으면 영액을 무근영수를 넘어 경장옥로까지 씻어 낼 수 있다.' },
  dan_guide:      { name: '단인',     cat: 'ju',  w: 1, h: 1, base: 130, mod: 'danlu', desc: '단로 모듈 칸에 넣는다: 그날 밤 완성 단약 품질 +25, 쓰면 사라진다. 보물찾기 쥐가 폐단을 먹고 가끔 토해 낸다.' },
  beast_feed:     { name: '영수 사료', cat: 'za',  w: 1, h: 1, base: 42,  war: 0.3, desc: '서금충이 썩은 뼈를 소화하고 배출한 사료 덩이. 영수 우리에 넣어 보물찾기 쥐에게 먹이면 한 개가 두 개 몫. 짐승 부리는 산수와 귀시가 사 간다.' },
  treasure_rat:   { name: '보물찾기 쥐',   cat: 'chong', w: 1, h: 1, base: 85,  desc: '영수 우리에 기른다: 밤마다 먹이 한 개(폐단, 썩은 뼈, 영과, 영수 사료)를 먹고, 밖으로 나가 뭔가를 물어 온다. 폐단을 먹으면 가끔 단인을 토하고, 영수 사료를 먹으면 두 배 빨리 자란다. 다 자란 두 마리는 새끼를 낳기도 한다.' },
  gold_bug:       { name: '서금충',   cat: 'chong', w: 1, h: 1, base: 120, desc: '우리에 기른다: 밤마다 현철광 하나나 금 간 동발 하나를 삼켜 고순 영사를 내고, 썩은 뼈를 삼켜 영수 사료를 낸다. 다 자란 두 마리는 알을 낳기도 한다.' },
  fu_paper:       { name: '부적 종이',     cat: 'cai',  w: 1, h: 1, base: 4,   desc: '부적을 그리는 누른 종이.' },
  cinnabar:       { name: '주사',     cat: 'cai', w: 1, h: 1, base: 9,   desc: '부적을 그리는 주사.' },
  fu_jingang:     { name: '금강부',   cat: 'fu',  w: 1, h: 1, base: 70,  war: 1, desc: '비검 한 번의 일격을 막아 주는 호부. 전시에는 누구나 하나씩 가진다.' },
  fu_shehun:      { name: '섭혼부',   cat: 'fu',  w: 1, h: 1, base: 140, war: 0.6, desc: '유혼 하나를 봉한 공벌부. 마수들의 전투 필수품.' },
  zhen_fu:        { name: '취화진부', cat: 'fu',  w: 1, h: 1, base: 75,  mod: ['furnace', 'dihuo', 'danlu', 'forge'], desc: '진법 증익부. 연기로, 연기대, 지화로 또는 단로 모듈 칸에 넣으면 그날 밤 산출이 두 배. 쓰면 타 버린다.' },
  seal_xian:      { name: '정파 봉인부', cat: 'fu', w: 1, h: 1, base: 90, desc: '명문정파의 봉인 부록. 출처가 깨끗한 법기, 진완, 단약, 부록에 붙여 명문 소산으로 위장하면 몸값이 크게 오른다 — 들통나지 않는다면.' },
  jade_bottle:    { name: '옥정병',   cat: 'za',  w: 1, h: 1, base: 10,  desc: '흰옥 잔목 병. 영액은 옥정병에 담겨야 수사들이 비싼 값을 낸다.' },
  xuan_essence:   { name: '현철 정수',   cat: 'cai', w: 1, h: 1, base: 150, war: 0.6, desc: '현철광 여섯(또는 현철 주괴 셋)을 지화로에서 녹여 낸 것. 현철 정수 넷에 밤의 폐관을 더하면 천계 신병 배료를 만들 수 있다.' },
  god_blank:      { name: '신병 배료', cat: 'qi',  w: 1, h: 2, base: 1250, war: 0.8, desc: '천계 신병의 배료. 내문 장로가 직접 찾아와 사 가기를 청한다.' },
  incense:        { name: '안신향',   cat: 'za',  w: 1, h: 1, base: 26,  desc: '작은 안신향 한 화로. 피우면 정신 +40.' },
  lens1:          { name: '동테 조요경', cat: 'qi', w: 1, h: 1, base: 60,   tool: 1, desc: '감정술 일중: 감보대에 올리면 조잡한 위조를 꿰뚫어 본다.' },
  lens2:          { name: '옥수 조요경', cat: 'qi', w: 1, h: 1, base: 380,  tool: 2, desc: '감정술 이중: 흔한 하품 충상품, 방고 수법은 숨을 데가 없다.' },
  lens3:          { name: '조골영경',   cat: 'qi', w: 1, h: 1, base: 950,  tool: 3, desc: '감정술 삼중: 정교한 위작도 골상까지 비춰 낸다.' },
  lens4:          { name: '천목주',     cat: 'qi', w: 1, h: 1, base: 2300, tool: 4, desc: '감정술 사중: 천의무봉의 위조도 앞에서는 빈틈투성이.' },
  bone_flute:     { name: '뼈피리',     cat: 'qi',  w: 1, h: 2, base: 140, war: 0.4, desc: '요괴 뼈로 만들어 작은 귀를 부릴 수 있다.' },
  // 杀人夺宝所得，与由此炼出的重宝
  cult_corpse:    { name: '수사 유체', cat: 'shi', w: 1, h: 2, base: 160, war: 0.4, desc: '수위를 지닌 이가 죽어 남긴 육신. 영기가 흩어지지 않아 썩지 않는다. 연시관에 혼정 하나를 더하면 시왕을 만들 수 있다.' },
  live_soul:      { name: '생혼',     cat: 'hun', w: 1, h: 1, base: 150, war: 0.6, desc: '산 채로 뽑아낸 혼백. 영지가 꺼지지 않았다. 연혼로에 혼주 하나를 더해 혼정으로 만들고, 바로 복용 수련해도 수위가 오른다.' },
  blood_essence:  { name: '정혈',     cat: 'cai', w: 1, h: 1, base: 80,  war: 0.4, desc: '수사의 심장 정혈. 두 개에 요단, 혈영지를 더해 혈영단을 만든다(연단 이중). 복용 수련으로도 수위가 오른다.' },
  soul_crystal:   { name: '혼정',     cat: 'hun', w: 1, h: 1, base: 650, war: 0.8, desc: '생혼과 혼주로 만든 결정. 시왕 만들기와 마검 주조의 혼핵이며, 원영을 두드리는 자량이기도 하다.' },
  corpse_king:    { name: '시왕',     cat: 'shi', w: 1, h: 3, base: 2400, war: 1, desc: '수사 유체에 혼정을 심장으로 해 만든 시왕. 힘이 축기에 맞먹는다. 전당과 귀시에서 천정부지 값을 부른다.' },
  blood_infant:   { name: '혈영단',   cat: 'dan', w: 1, h: 1, base: 1500, war: 0.5, desc: '요단, 정혈, 혈영지로 만든 마단. 먹으면 수위가 급등한다. 축기 수사가 결단하는 열쇠다.' },
  demon_blade:    { name: '섭혼마검', cat: 'qi',  w: 1, h: 3, base: 4200, war: 0.8, desc: '신병 배료에 혼정으로 날을 세우고, 검 안에 생혼이 갇힌다(연기 이중, 기보 옥간 필요). 내문 장로가 직접 찾아와 사 가기를 청한다.' },
  intel:          { name: '밀보',     cat: 'xin', w: 1, h: 1, base: 0,   desc: '쪽지 한 장의 소식. 값어치는 무엇이 적혔는지, 누구 손에 들어갔는지, 시의가 지났는지에 달렸다.' },
};

const QUALITY_TIERS = [[85, '극품'], [65, '상품'], [35, '중품'], [0, '하품']];

// 作伪的做工：鉴定术重数不低于做工，才看得穿
const GRADE_NAMES = ['', '조잡', '보통', '정교', '천의무봉'];
const LENS_NAMES = ['육안', '동테 조요경', '옥수 조요경', '조골영경', '천목주'];

// 技艺：逐重提升，各到四重——一二重读货郎卖的秘籍；三四重鬼市不卖，拿功勋换，或等机遇：行家登门传艺（TEACHERS）、拾荒偶得（LOCATIONS 的 scrolls）、好人好报。machines 为受其加持的设备
const TECHS = {
  refine:  { name: '연기', icon: 'book_refine',  machines: ['furnace', 'forge'],     max: 4, desc: '연기로·연기대 산출물 중마다 품질 +8. 삼중이면 연기로가 밤마다 한 화로 추가.' },
  alchemy: { name: '연단', icon: 'book_alchemy', machines: ['danlu'],                max: 4, desc: '단로 산출물 중마다 품질 +8. 삼중이면 밤마다 한 화로 추가.' },
  soul:    { name: '연혼', icon: 'book_soul',    machines: ['soulfurnace'],          max: 4, desc: '혼주 중마다 품질 +8. 이중이면 유혼 둘로 혼주가 된다.' },
  corpse:  { name: '연시', icon: 'book_corpse',  machines: ['coffin'],               max: 4, desc: '철시 중마다 품질 +8. 이중이면 하룻밤에 관을 열 수 있다.' },
  puppet:  { name: '꼭두각시', icon: 'book_puppet',  machines: ['puppetbench'],          max: 4, desc: '기관 꼭두각시 중마다 품질 +10.' },
  plant:   { name: '재배', icon: 'book_plant',   machines: ['herbbed', 'yaopot'],    max: 4, desc: '영초와 요식이 중마다 25% 빨리 자라고, 산출 품질 +6.' },
  brew:    { name: '양주', icon: 'book_brew',    machines: ['winejar'],              max: 4, desc: '영주 중마다 품질 +10. 이중이면 하룻밤에 완성.' },
  water:   { name: '세령', icon: 'book_water',   machines: ['pool'],                 max: 4, desc: '중마다 정제가 빨라진다.' },
  forgery: { name: '위조', icon: 'book_forgery', machines: ['forgery'],              max: 4, desc: '중마다 하품을 상품으로 둔갑시키는 솜씨와 모조 솜씨가 좋아진다. 솜씨가 좋을수록 간파하는 이가 줄어든다.' },
  erase:   { name: '지우개', icon: 'book_erase',   machines: [],                       max: 4, desc: '장물에 남은 원래 주인의 신식 낙인을 지운다. 낙인이 몇 중이면 지우개 술도 몇 중이 필요하다. 보물의 주인 낙인은 깊어 사중까지 간다. 깨끗이 지운 장물은 누구도 자취를 쫓아오지 못한다.' },
  talisman:{ name: '부록', icon: 'book_talisman', machines: ['fudesk'],              max: 4, desc: '중마다 한 장 더 그리고 품질 +8. 이중이면 취화진부를, 삼중이면 정파 봉인부를 그린다.' },
  // 养蛊人独门，没有秘籍、没人教、功勋也换不到：养蛊攒经验自动升重（见 js/gu.js）
  gumaster:{ name: '고충 숙련', icon: 'gu_gold', machines: ['gupot'], max: 4, exclusive: true,
             desc: '고충 기르는 이의 독문 솜씨. 다른 데서는 못 배운다. 알 깨우기, 먹이기, 성장, 산란, 독 뱉기, 잡아먹기 모두 경험이 쌓이고, 차면 자동으로 중이 오른다. 중마다 고충이 빨리 자라고 알을 자주 낳으며 자손의 독이 강해진다. 고충을 심을 수 있다 — 몇 중이면 몇 계 고충을 부리고, 수위가 너보다 높지 않은 이에게 심는다(사중이면 한 경지 높은 이에게도 가능). 삼중이면 미혼화를 금잠에게 먹여 정고를 만든다.' },
  beast:   { name: '어수', icon: 'book_beast',   machines: ['pen'],                  max: 4, desc: '중마다 영총이 밤마다 하나 더 먹고 하나 더 내며, 빨리 자라고 산출 품질 +10. 보물찾기 쥐가 물어 오는 것도 더 비싸진다.' },
};

// 秘籍：[id, 技艺, 第几重, 价钱, 魔宗声望要求, 名字, 附带的仿造之法]
// 货郎只卖到第 BOOK_SHOP_MAX 重；再往上的价钱只定书的身价，换法见 market.js 的 MERIT_SHOP 与下面的 TEACHERS
const BOOK_SHOP_MAX = 2;
const BOOKS = [
  ['bk_refine1', 'refine', 1, 180, -100, '연기 요결'], ['bk_refine2', 'refine', 2, 420, 0, '연기 비요'], ['bk_refine3', 'refine', 3, 900, 15, '백련 진해'], ['bk_refine4', 'refine', 4, 1500, 25, '기도 통현'],
  ['bk_alchemy1', 'alchemy', 1, 200, -100, '단도 입문'], ['bk_alchemy2', 'alchemy', 2, 480, 0, '단경'], ['bk_alchemy3', 'alchemy', 3, 1000, 15, '구전단서'], ['bk_alchemy4', 'alchemy', 4, 1600, 25, '태상 단결'],
  ['bk_soul1', 'soul', 1, 220, 5, '연혼결·상'], ['bk_soul2', 'soul', 2, 520, 15, '연혼결·하'], ['bk_soul3', 'soul', 3, 1100, 25, '섭혼 진경'], ['bk_soul4', 'soul', 4, 1700, 35, '만혼귀종'],
  ['bk_corpse1', 'corpse', 1, 240, 5, '양시경'], ['bk_corpse2', 'corpse', 2, 560, 15, '연시 대법'], ['bk_corpse3', 'corpse', 3, 1150, 25, '시해 비록'], ['bk_corpse4', 'corpse', 4, 1800, 35, '불화골경'],
  ['bk_puppet1', 'puppet', 1, 260, 0, '기관술'], ['bk_puppet2', 'puppet', 2, 600, 15, '언사 비록'], ['bk_puppet3', 'puppet', 3, 1250, 25, '천기변'], ['bk_puppet4', 'puppet', 4, 1900, 35, '천공 괴뢰보'],
  ['bk_plant1', 'plant', 1, 150, -100, '백초경'], ['bk_plant2', 'plant', 2, 380, 0, '요식지'], ['bk_plant3', 'plant', 3, 800, 15, '신농 유편'], ['bk_plant4', 'plant', 4, 1300, 25, '초목 통령록'],
  ['bk_brew1', 'brew', 1, 120, -100, '주보'], ['bk_brew2', 'brew', 2, 320, 0, '선양 비방'], ['bk_brew3', 'brew', 3, 680, 15, '백화양경'], ['bk_brew4', 'brew', 4, 1100, 25, '두강 유방'],
  ['bk_water1', 'water', 1, 140, -100, '세령법'], ['bk_water2', 'water', 2, 340, 0, '정수 진결'], ['bk_water3', 'water', 3, 720, 15, '옥로 진해'], ['bk_water4', 'water', 4, 1150, 25, '상선약수 편'],
  ['bk_forgery1', 'forgery', 1, 200, -100, '하품을 상품처럼 편'], ['bk_forgery2', 'forgery', 2, 450, 10, '방고 비록', ['jade_pendant', 'bronze_mirror']],
  ['bk_forgery3', 'forgery', 3, 800, 20, '단형 역용술', ['pill_found']], ['bk_forgery4', 'forgery', 4, 1400, 35, '천의무봉'],
  ['bk_erase1', 'erase', 1, 260, 0, '세인결·초'], ['bk_erase2', 'erase', 2, 600, 10, '세인결·중'], ['bk_erase3', 'erase', 3, 1100, 25, '세인결·상'], ['bk_erase4', 'erase', 4, 1700, 35, '무흔결'],
  ['bk_talisman1', 'talisman', 1, 160, -100, '부록 입문'], ['bk_talisman2', 'talisman', 2, 420, 0, '진부 요략'], ['bk_talisman3', 'talisman', 3, 900, 10, '정일 부경'], ['bk_talisman4', 'talisman', 4, 1450, 25, '천서 부록'],
  ['bk_beast1', 'beast', 1, 180, -100, '길들이기 경'], ['bk_beast2', 'beast', 2, 450, 0, '만충보'], ['bk_beast3', 'beast', 3, 950, 15, '어령 진경'], ['bk_beast4', 'beast', 4, 1500, 25, '만수조종'],
];
BOOKS.forEach(([id, tech, lv, price, , name, teach]) => {
  ITEMS[id] = { name: `《${name}》`, cat: 'ji', w: 1, h: 1, base: Math.round(price * 0.7), icon: TECHS[tech].icon, book: { tech, lv, teach },
    desc: `${TECHS[tech].name} 제${'1234'[lv - 1]}중 비급. 읽으면 ${TECHS[tech].name} 기예가 제${'1234'[lv - 1]}중으로 오른다(먼저 앞의 중을 익혀야 함).${teach ? `부록 모조법: ${teach.map(t => ITEMS[t].name).join('·')}.` : ''}${lv > BOOK_SHOP_MAX ? '귀시에서는 팔지 않음: 공훈으로 바꾸거나 기연을 기다려야 함 — 전문가 전수, 줍기, 선행의 보답.' : ''}` };
});

// 传艺：三四重的机遇之一。肯教的行家（谁先与你亲厚、自己那桩事也了了，谁来）与他压着手抄时说的话（三重、四重各一句）
const TEACH_AFF = [55, 80];   // 三重、四重各要多少好感
const TEACHERS = {
  refine:   { who: ['duan_yinghuo', 'li_duangang', 'lu_tiechui'], lines: ['화로 솜씨는 하나 가르칠 때마다 밥줄이 하나 준다. 하지만 넌 나를 후하게 대했다 — 보고 나면 태우고, 내가 준 것이라 하지 마라.',
    '종문의 신병은 전부 이 솜씨로 만들고, 완성되면 장로의 이름으로 기록한다. 네가 배우면 앞으로 만드는 것은 네 이름으로 남을 것이다.'] },
  alchemy:  { who: ['ye_danping', 'mu_qingdan', 'lu_pinxiang'], lines: ['단방에서 이 두루마리는 적전에게만 보인다. 적전은 이걸로 주안단을 지어 장로 부인에게 판다. 네가 배워서 제대로 된 것이라도 지어 봐라.',
    '구전 뒤에도 한 전이 더 있다. 단방은 장로의 독문이라지만, 사실 내가 삼십 년을 대신 지어 준 것이다.'] },
  soul:     { who: ['gui_dengpo', 'dugu_que'], lines: ['혼이라는 건, 만들 때 말을 들어선 안 된다. 오래 들으면 만들기가 아까워진다 — 그러면 장사를 못 한다.',
    '마지막 이 중은 많은 혼을 하나로 만드는 것이다. 종문은 이를 \'귀종\'이라 부르고, 나는 입 막기라 부른다.'] },
  corpse:   { who: ['yan_fengjiu'], lines: ['시신에도 성질이 있다. 근락을 따라 움직이면 기꺼이 일을 해 준다. 산 사람보다 말을 잘 듣는다.',
    '이 중까지 만들면 죽은 이의 친어머니도 못 알아본다 — 그래서 집법당이 이렇게 좋아한다.'] },
  puppet:   { who: ['hui_qiaosuo', 'wan_xiaomu'], lines: ['관절은 사람보다 살아 움직이게 달아야 손님이 돈을 낸다. 누구를 다치게 했든 그건 잘못 단 사람의 일이다.',
    '꼭두각시가 이 지경이면 스스로도 사람인 줄 안다. 알게 하지 마라.'] },
  plant:    { who: ['tao_yunhe', 'he_baizhi'], lines: ['초목은 주인을 가리지 않는다. 물을 주면 자란다. 가게 단골보다 의리가 있다.',
    '이 중의 구결은 조부의 씨앗 함에서 베낀 것 — 종문이 약초밭은 거둬 갔지만 마음에 새긴 것은 못 가져갔다.'] },
  brew:     { who: ['yue_chan', 'zhu_shanye'], lines: ['술은 오래 묻히는 것, 말은 상대가 취한 뒤에 듣는 것 — 이 가게에서 둘 다 쓸모 있다.',
    '이 항아리의 처방, 마셔 본 이들은 선양이라 한다. 사실 하나만 더 넣었다: 참을성. 그리고 미혼화 조금.'] },
  water:    { who: ['ling_bo', 'ao_xunlan'], lines: ['물이 맑은가는 물이 아니라 거르는 사람이 공을 들이는가에 달렸다. 네 물은 아직 한 끗 모자란다.',
    '상류에서 물을 막고 나서야 하류는 깨끗한 물 한 병의 값을 안다. 이 솜씨는 그 물을 더 비싸게 파는 법이다.'] },
  forgery:  { who: ['qian_shiqi'], lines: ['나는 평생 물건을 감정해 눈만 스쳐도 진가를 안다 — 그래서 가짜를 어떻게 만들어야 안 들통나는지도 가장 잘 안다.',
    '이 마지막 한 수는 누구에게도 가르친 적 없다. 너에게 가르치면, 앞으로 내가 감정해 낼 가짜의 절반은 네가 만든 것일 게다.'] },
  erase:    { who: ['hui_qiaosuo', 'gui_dengpo'], lines: ['신식 낙인도 자물쇠. 자물쇠면 열쇠가 있다. 이 솜씨는 본래 주인 잃은 이의 자물쇠를 열어 주던 것인데, 나중에 찾아온 이는 대개 주인이 아니었다.',
    '가장 깊은 낙인은 보물의 원래 주인이 남긴 것이다. 그걸 지우면 이 물건의 내력에서 한 사람을 지우는 것과 같다. 정말 배우겠는가? — 좋아, 배우는 것이다.'] },
  talisman: { who: ['fu_shoumo', 'mo_yanqing'], lines: ['명문정파의 입신의 근본 — 솔직히 말해, 부적을 명문처럼 그리는 법을 가르치는 것이다. 네 가게에 쓸모가 있다.',
    '천서의 부적은 천인만 그릴 수 있다고 종문은 말한다. 나는 평생 그리면서 늘 천인의 이름을 붙였다.'] },
  beast:    { who: ['wen_lingqi', 'tu_baigu'], lines: ['짐승이 사람 마음을 제일 잘 안다: 먹이는 이를 주인으로 안다. 사람도 같다. 다만 잊는 게 빠를 뿐.',
    '영수각의 길들이기란, 솔직히 굶긴 뒤 구해 주는 것이다. 이 중이 가르치는 것은 딱 알맞게 구하는 법이다.'] },
};

// 仿造：放样品于作伪台模组格，按配方消耗原料，造出同款赝品
const COUNTERFEITS = {
  jade_pendant:  { use: [['bones', 1], ['water', 1]], text: '뼈 바탕에 색을 입히고 용무늬를 눌러 새김' },
  bronze_mirror: { use: [['scrap_sword', 1], ['bones', 1]], text: '고철을 재용해하고 무늬를 새로 주조해 동녹을 만듦' },
  pill_found:    { use: [['pill_qi', 1], ['herb_dew', 1]], text: '회기단에 금을 입히고 단문을 새김' },
};

// 设备：in/out/mod 为格子尺寸；power 为每夜灵力消耗；inputs 为输入格可放的物品（null 表示不限）
// overflow：产出格满时溢出到地上，否则停产
const MACHINES = {
  furnace: { name: '연기로', icon: 'm_furnace', price: 450, power: 3, in: [2, 2], out: [2, 2], mod: [1, 1],
             inputs: ['iron_ore', 'scrap_sword', 'broken_relic'], overflow: true, feedStack: 10,
             desc: '현철광 둘이나 부서진 검 하나로 현철 주괴 하나를 녹인다. 밤마다 두 화로. 산출 칸이 차면 바닥에 넘친다. 재료와 산물은 같은 종류끼리 겹쳐지고 한 칸에 최대 열 개.' },
  forge:   { name: '연기대', icon: 'm_forge', price: 900, power: 3, in: [3, 2], out: [2, 3], mod: [1, 1],
             inputs: ['iron_ingot', 'broken_relic', 'god_blank', 'soul_crystal', 'scrap_sword', 'iron_ore'], overflow: true, feedStack: 10,
             desc: '모듈 칸에 기보 옥간을 두면 현철 주괴 셋으로 제식 비검 하나를 밤마다 한 자루 만든다. 연기 이중이면 신병 배료에 혼정을 더해 섭혼마검을 만든다. 기정으로도 쓴다: 깨진 법기에 현철 주괴 하나(또는 부서진 검 하나, 현철광 둘)를 더해 다시 제련, 밤마다 두 개. 재료와 산물은 같은 종류끼리 겹쳐지고 한 칸에 최대 열 개.' },
  danlu:   { name: '연단로', icon: 'm_danlu', price: 800, power: 4, in: [2, 2], out: [2, 2], mod: [2, 1], feedStack: 10,
             inputs: ['herb_dew', 'herb_blood', 'yao_core', 'mihun_flower', 'waste_pill', 'blood_essence'],
             desc: '응로초 둘→회기단. 혈영지+요단→혈살단. 미혼화 둘→망우산. 모듈 칸에 단방이 있으면 혈영지 둘+요단+응로초→축기단. 연단 이중이면 요단+정혈 둘+혈영지→혈영단. 폐단 둘도 재련할 수 있다(단인이 있으면 반드시 성공). 재료와 산물은 같은 종류끼리 겹쳐지고 한 칸에 최대 열 개.' },
  pool:    { name: '세령지', icon: 'm_pool', price: 350, power: 2, in: [3, 2], out: [3, 1], feedStack: 10,
             inputs: ['water', 'filter_sand', 'spirit_sand'],
             desc: '밤마다 최대 영천수 네 병을 씻는다. 한 병에 여영사 한 포(순도 99.01%에 근접) 또는 고순 영사 한 포(99.9%를 넘어 경장옥로까지). 재료와 산물은 같은 종류끼리 겹쳐지고 한 칸에 최대 열 개.' },
  spring:  { name: '취령 샘', icon: 'm_spring', price: 350, power: 2, out: [3, 1], overflow: true,
             desc: '밤마다 탁한 영수 세 병이 솟는다(영석 광맥 계약이 있으면 네 병). 산출 칸이 차면 바닥에 넘친다.' },
  herbbed: { name: '약초밭', icon: 'm_herbbed', price: 300, power: 1, in: [3, 2], out: [3, 1],
             inputs: ['herb_seed'],
             desc: '영초종은 밤마다 절반씩 자라 이틀이면 여물어 산출 칸으로 옮긴다.' },
  gupot:   { name: '고충 항아리', icon: 'm_gupot', price: 400, power: 1, in: [2, 2], pot: [3, 2], out: [3, 1], inLabel: '재료', potLabel: '고충', outLabel: '산물',
             inputs: ['bones', 'mihun_flower'], habitat: ['gu', 'gu_egg'], feedStack: 10,
             desc: '재료 칸에 썩은 뼈를 넣고(같은 종류끼리 겹침, 한 칸 최대 열 개), 고충 칸에 고충을 기르고, 산물 칸에서 고충 알과 고충 독을 거둔다. 항아리를 열어 먹이기: 어린 고충은 밤마다 뼈 하나를 먹고, 다 자라면 금잠고가 된다. 다 자란 두 마리는 알을 낳기도 하고 자손은 독성을 잇거나 강해진다. 만독고와 고왕은 밤마다 뼈 하나를 먹고 고충 독을 토한다. 항아리를 봉해 싸우기: 먹이지 않고 알도 깨지 않으며, 밤마다 가장 사나운 한 마리가 가장 약한 한 마리를 삼켜 독성과 도행을 빼앗는다 — 셋을 삼키면 만독고, 여덟을 삼키면 고왕. 탈피할 때마다 고충 독을 하나 토한다. 고충 숙련 삼중이면 재료 칸에 미혼화를 두고, 항아리를 여는 밤 금잠고 한 마리가 그것을 먹어 정고 한 쌍이 되어 산물 칸에 떨어진다.' },
  winejar: { name: '영주 항아리', icon: 'm_winejar', price: 200, power: 0, in: [2, 2], out: [2, 2],
             inputs: ['spirit_fruit', 'yeast'],
             desc: '영과 둘에 누룩 하나. 항아리를 봉한 지 이틀이면 영주가 된다. 영력을 쓰지 않는다.' },
  soulfurnace: { name: '연혼로', icon: 'm_soulfurnace', price: 700, power: 3, in: [3, 1], out: [2, 1], mod: [1, 1], feedStack: 10,
             inputs: ['soul_wisp', 'soul_grudge', 'live_soul', 'soul_pearl'],
             desc: '유혼 셋이나 원혼 하나로 혼주 하나를 만든다. 생혼 하나에 혼주 하나면 혼정. 모듈 칸에 섭혼령을 두면 밤마다 한 화로 추가. 재료와 산물은 같은 종류끼리 겹쳐지고 한 칸에 최대 열 개.' },
  coffin:  { name: '연시관', icon: 'm_coffin', price: 800, power: 3, in: [2, 2], out: [2, 3],
             inputs: ['corpse', 'soul_pearl', 'cult_corpse', 'soul_crystal'],
             desc: '시신 하나에 혼주 하나, 관을 봉한 지 이틀이면 철시가 되고 시독 한 병이 떨어진다. 수사 유체에 혼정 하나면 시왕이 된다.' },
  puppetbench: { name: '꼭두각시대', icon: 'm_puppetbench', price: 900, power: 4, in: [3, 1], out: [1, 3], mod: [1, 1],
             inputs: ['iron_ingot', 'soul_pearl'], overflow: true, feedStack: 10,
             desc: '모듈 칸에 괴뢰 도보를 두면 현철 주괴 둘, 혼주 하나로 기관 꼭두각시 하나. 꼭두각시는 같은 종류끼리 겹쳐지고 한 칸에 최대 열 개.' },
  yaopot:  { name: '요식 화분', icon: 'm_yaopot', price: 350, power: 1, in: [2, 2], out: [3, 1],
             inputs: ['mihun_seed', 'vine_seed', 'bones', 'corpse'],
             desc: '미혼화 씨는 이틀 뒤 꽃이 핀다. 서혈등은 밤마다 썩은 뼈 하나(시신 하나면 사흘치)를 먹고 사흘 뒤 혈등과를 맺는다.' },
  dihuo:   { name: '지화로', icon: 'm_dihuo', price: 1200, power: 5, in: [4, 3], out: [2, 2], mod: [1, 1], modLabel: '진부',
             inputs: ['iron_ore', 'iron_ingot', 'xuan_essence'], overflow: true, feedStack: 10,
             desc: '현철광 여섯(또는 현철 주괴 셋)으로 현철 정수 하나를 녹인다. 밤마다 두 화로(진부면 두 배). 그날 밤 폐관하면 현철 정수 넷이 천계 신병 배료 하나가 된다. 재료와 산물은 같은 종류끼리 겹쳐지고 한 칸에 최대 열 개.' },
  pen:     { name: '영수 우리', icon: 'm_pen', price: 450, power: 1, out: [4, 2], outLabel: '산물',
             stalls: 1, stallMax: 4, stallSize: 4, stallPrice: 180, feedStack: 10,
             inputs: ['broken_bowl', 'iron_ore', 'bones', 'waste_pill', 'spirit_fruit', 'beast_feed'],
             desc: '우리마다 한 줄: 왼쪽 네 칸엔 사료(같은 종류끼리 겹침, 한 칸 최대 열 개), 오른쪽 네 칸엔 영총. 한 줄엔 한 종류만 기르고, 맞는 사료가 있어야 먹는다. 더 기르려면 우리를 늘린다(최대 네 줄). 서금충은 현철광과 금 간 동발을 삼켜 영사를 내고, 썩은 뼈를 삼켜 영수 사료를 낸다. 보물찾기 쥐는 폐단, 썩은 뼈, 영과, 영수 사료를 먹고 밤에 나가 물건을 물어 온다. 먹고 나온 것은 산물 칸에 떨어진다.' },
  fudesk:  { name: '부적 책상', icon: 'm_fudesk', price: 300, power: 0, in: [3, 2], out: [3, 2], feedStack: 10,
             inputs: ['fu_paper', 'cinnabar', 'soul_wisp', 'bones', 'spirit_crystal', 'xian_talisman'],
             desc: '부적 종이+주사→금강부. 거기에 유혼→섭혼부, 썩은 뼈→혈문 호부. 부록 이중이면 영정을 더해→취화진부. 부록 삼중이면 태청부를 더해→정파 봉인부 두 장. 밤마다 1+부록 중 수만큼 그린다. 재료와 산물은 같은 종류끼리 겹쳐지고 한 칸에 최대 열 개.' },
  forgery: { name: '위조대', icon: 'm_forgery', price: 500, power: 2, in: [3, 3], out: [4, 3], mod: [2, 2], modLabel: '견본',
             inputs: null,
             desc: '견본을 두지 않으면 입력 칸의 물건을 \'하품을 상품처럼\' 만든다 — 낡게 만들고 색을 입혀 품질이 높아 보이게 한다. 모듈 칸에 위작이나 진품 하나를 견본으로 두면, 아는 모조법대로 같은 위작을 만든다(위조술을 익혀야 함). 밤마다 두 개.' },
  puppet:  { name: '꼭두각시 노점', icon: 'm_puppet', price: 600, power: 1, in: [4, 3], inLabel: '진열대',
             inputs: null,
             desc: '폐점 후 꼭두각시가 밤에 판매하고, 대금은 돈함에 쌓이며 직접 꺼내야 한다.' },
};

const ARRAY_BASE_POWER = 6;
const CRYSTAL_CAP = 12;

const DIFFICULTIES = [
  { id: 'cozy',   name: '한산', rent: 0.7, deed: 9000,  markup: 0.0,  sell: 1.1,  inspect: 0.6, desc: '세가 싸고, 보부상은 덤을 안 붙이며, 순찰이 드물다.' },
  { id: 'normal', name: '보통', rent: 1.0, deed: 12000, markup: 0.15, sell: 1.0,  inspect: 1.0, desc: '혈살종 잡역 구역의 일상.' },
  { id: 'hard',   name: '험난', rent: 1.3, deed: 15000, markup: 0.25, sell: 0.92, inspect: 1.3, desc: '세가 비싸고, 손님은 영리하며, 집법당이 부지런하다.' },
  { id: 'doom',   name: '마겁', rent: 1.6, deed: 18000, markup: 0.35, sell: 0.85, inspect: 1.6, desc: '한 걸음만 잘못 디뎌도 만겁을 돌이킬 수 없다.' },
];

// 开局：machines 为初始设备，items 为 [id, 数量, 额外属性]
const STARTS = [
  { id: 'apprentice', name: '잡역 도제', tag: '추천', stones: 320,
    desc: '늙은 점장이 실종되기 전 네게 남긴 가게. 연기로 하나, 잡동사니 몇 가지. 뭐든 해 볼 수 있다.',
    machines: ['furnace'],
    items: [['iron_ore', 4], ['scrap_sword', 2], ['herb_dew', 2], ['pill_qi', 1], ['demon_charm', 1], ['water', 2, { purity: 58 }]] },
  { id: 'water', name: '영천수 장수', stones: 220,
    desc: '뒤뜰에 샘 하나와 세령지가 있다. 탁한 물을 무구한 영천으로 씻어 내는 게 가장 믿음직한 생계다.',
    machines: ['spring', 'pool'],
    items: [['filter_sand', 6], ['water', 3, { purity: 52 }]] },
  { id: 'fence', name: '장물 처리꾼', stones: 380,
    desc: '업계에서는 네가 \'출처 불명\' 물건을 받는다고 다 안다. 장물은 시선이 금방 지나가고, 지우개 솜씨를 익혔으며, 손에 정파 봉인부 두 장이 있다. 집법당이 너를 주시한다.',
    perks: { fence: true, hidden: true }, rep: { mo: 10 }, heat: 15, tech: { erase: 1 },
    items: [['soul_bell', 1, { stolen: 3 }], ['sword_std', 1, { stolen: 2 }], ['xian_talisman', 1], ['seal_xian', 2]] },
  { id: 'alchemist', name: '단방 약동', stones: 160,
    desc: '단방에서 솜씨를 몇 수 훔쳐 배웠다. 낡은 단로 하나, 약초밭 한 뙈기, 씨앗 몇 알.',
    machines: ['danlu', 'herbbed'],
    items: [['herb_seed', 4], ['herb_dew', 2], ['herb_blood', 1]] },
  { id: 'gu', name: '고충 기르는 이', stones: 160,
    desc: '남강에서 온 고충 기르는 이. 고충 항아리에 서심고 두 마리. 요족이 너를 꽤 탐탁지 않게 여긴다. 독문 고충 숙련은 다른 데서 못 배운다: 고충을 기르며 실력이 늘고, 실력이 차면 먹을 것에 고충을 섞어 사람에게 먹인다 — 먹은 이는 말을 듣거나 고충에 뜯겨 중상을 입는다. 삼중까지 익히면 한평생 한 사람만 알아보는 정고도 만든다.',
    machines: ['gupot'], rep: { yao: -8 }, perks: { gumaster: true }, tech: { gumaster: 1 },
    items: [['gu', 2, { growth: 30 }], ['bones', 6]] },
  { id: 'corpse', name: '연시장', stones: 140,
    desc: '상서의 시신 몰이 집안 출신. 몰다 보니 업을 바꿨다: 이제 시신을 고향에 보내는 대신 시신으로 철시를 만들고 유혼으로 혼주를 만든다. 연시관 하나, 연혼로 하나. 마종은 너를 기재로 보고, 범인은 너를 피해 돌아간다.',
    machines: ['coffin', 'soulfurnace'], rep: { mo: 8, ren: -10 },
    items: [['corpse', 1, { fresh: 6 }], ['soul_wisp', 3], ['soul_pearl', 1]] },
  { id: 'digger', name: '줍는 나그네', stones: 120, perks: { digger: true },
    desc: '늘 옛 전장과 종문 폐허에서 파먹고 산다. 눈썰미와 손놀림이 빨라 줍기마다 두 번 더 뒤진다. 낡은 기정(연기대) 하나, 금 간 단로 하나로 캐낸 깨진 기물과 폐단을 다시 제련한다 — 깨진 기물은 주운 부서진 검과 현철광으로 메우니 연기로가 필요 없다. 진안에는 영정 하나를 더 박았다.',
    machines: ['forge', 'danlu'], crystals: 1,   // 炼器台加炼丹炉要 6 点灵力，正好吃满聚灵阵；多一块充满的灵晶垫着
    items: [['broken_relic', 2], ['waste_pill', 4], ['iron_ingot', 3]] },
  { id: 'tamer', name: '육수사', stones: 180,
    desc: '두 칸짜리 영수 우리. 한 칸엔 보물찾기 쥐, 한 칸엔 서금충. 이것이 네 전 재산이다. 폐재료와 썩은 뼈를 먹여 키워라. 보물찾기 쥐는 밤에 물건을 물어 오고, 서금충은 쇠를 삼켜 영사를 토하고 썩은 뼈를 영수 사료로 바꾼다. 다 자란 두 마리가 짝지으면 새끼도 낳는다.',
    machines: ['pen'], tech: { beast: 1 },
    items: [['bones', 4], ['broken_bowl', 2]],
    into: [['pen', 'b0', 'treasure_rat', 2, { growth: 60 }], ['pen', 'b1', 'gold_bug', 2, { growth: 60 }]] },
  { id: 'talisman', name: '부적 그리는 선생', stones: 200,
    desc: '낙패한 부사. 부적 책상 하나, 좋은 글씨. 종이와 주사는 싸지만 그려낸 부적은 폭리다.',
    machines: ['fudesk'], tech: { talisman: 1 },
    items: [['fu_paper', 8], ['cinnabar', 8], ['incense', 2]] },
  { id: 'smith', name: '연기장', stones: 260,
    desc: '연기방 출신 장인. 화로 하나 대 하나, 기보 옥간 하나. 화로에서는 현철을 녹이고 대에서는 비검을 만든다. 현철이 네 손에서 몇 곱절이 된다.',
    machines: ['furnace', 'forge'], tech: { refine: 1 },
    items: [['iron_ore', 6], ['iron_ingot', 2]],
    into: [['forge', 'mod', 'jade_slip', 1, {}]] },
  { id: 'nothing', name: '무일푼', stones: 30,
    desc: '빈 가게 한 칸과 낡은 취령진 하나뿐. 도전용 시작.',
    items: [] },
];

// 货郎常备货品：[id, 基础单价, 需要的魔宗声望]
const SUPPLY = [
  ['iron_ore', 13, -100], ['filter_sand', 6, -100], ['herb_seed', 5, -100], ['bones', 2, -100],
  ['yeast', 7, -100], ['spirit_fruit', 14, -100], ['gu_egg', 30, -100], ['spirit_crystal', 70, -100],
  ['mihun_seed', 10, -100], ['corpse', 30, 0], ['soul_wisp', 38, 5], ['vine_seed', 16, 5],
  ['lens2', 420, 0], ['lens3', 1050, 15], ['lens4', 2500, 30],
  ['fu_paper', 5, -100], ['cinnabar', 11, -100], ['jade_bottle', 12, -100], ['incense', 30, -100],
  ['treasure_rat', 95, -100], ['gold_bug', 135, 0],
  ['dan_fire', 100, 0], ['fire_disk', 180, 0], ['jade_slip', 300, 10], ['pill_recipe', 450, 25], ['puppet_scroll', 360, 20],
];

const UPGRADES = [
  { id: 'store1',  name: '창고 넓히기',   price: 350,  desc: '저장 선반이 10×6으로 넓어진다.' },
  { id: 'store2',  name: '창고 더 넓히기',   price: 900,  desc: '저장 선반이 12×7로 넓어진다.', need: 'store1' },
  { id: 'display', name: '자단 진열장', price: 500,  desc: '진열장이 6×4로 넓어져 더 많은 물건을 놓아 손님을 끈다.' },
  { id: 'hidden',  name: '이중 은닉 칸',   price: 600,  desc: '2×3 은닉 칸 하나. 세로 세 칸짜리 긴 물건도 숨길 수 있고, 집법당 순찰에도 발견되지 않는다.' },
  { id: 'sign',    name: '금 도금 간판',   price: 700,  desc: '매일 손님이 한 명 더 온다.' },
  { id: 'hijack',  name: '영맥 무단 연결',   price: 400,  desc: '밤마다 영력 +6. 하지만 밤마다 10% 확률로 들켜 집법당 주목 +10.' },
  { id: 'master',  name: '감보 심득',   price: 650,  desc: '감정 의뢰 보수 두 배. 진위를 말할 때 더 믿음을 준다.' },
  { id: 'vein',    name: '영석 광맥 계약', price: 1200, desc: '영석 광맥 한 구간을 통으로 빌린다: 밤마다 영력 +10, 매일 아침 현철광 넷이 오고, 취령 샘에서 물 한 병이 더 나온다.' },
  { id: 'quiet',   name: '정실',       price: 450,  desc: '뒤뜰에 조용한 방을 하나 마련: 밤마다 체력과 정신을 20 더 회복.' },
];

// 市况：cats 为品类价格修正
const MARKET_EVENTS = [
  { text: '잡역 구역은 평온하다.', cats: {} },
  { text: '외문 소시합이 다가와 제자들이 법기를 앞다퉈 산다.', cats: { qi: 0.3 } },
  { text: '단회가 열려 단약 시세가 오른다.', cats: { dan: 0.25 } },
  { text: '요조가 물러나 요재가 넘친다.', cats: { yao: -0.25 } },
  { text: '영천이 마른다는 소문이 돌아 영음이 귀해진다.', cats: { yin: 0.35 } },
  { text: '선문의 포위 토벌이 임박해 집법당이 순찰을 강화한다.', cats: { fu: 0.2 }, heat: 1.6 },
  { text: '연기방에 재료가 모자라 영재 매입가가 오른다.', cats: { cai: 0.25 } },
  { text: '귀시에 외지인이 와 진완이 잘 팔린다.', cats: { wan: 0.3 } },
  { text: '만고곡에서 고충을 사들이는 이가 있다.', cats: { gu: 0.4 } },
];

// 顾客出售的货品池：[id, 权重, 额外属性生成器标记]
const SELL_POOLS = {
  ren:  [['scrap_sword', 4], ['iron_ore', 4], ['broken_bowl', 3], ['herb_dew', 3], ['spirit_fruit', 3], ['water', 3],
         ['jade_pendant', 2], ['scroll_manual', 2], ['bones', 2], ['yeast', 2], ['herb_seed', 2], ['corpse', 1]],
  mo:   [['demon_charm', 4], ['soul_bell', 2], ['bone_flute', 2], ['sword_std', 3], ['pill_blood', 2], ['yao_core', 3],
         ['beast_hide', 2], ['bronze_mirror', 1], ['soul_banner', 1], ['gu', 2], ['iron_ingot', 2],
         ['soul_wisp', 3], ['soul_grudge', 1], ['corpse', 2], ['soul_pearl', 1], ['wangyou', 1]],
  xian: [['xian_sword', 2], ['xian_talisman', 4], ['xian_robe', 2], ['pill_qi', 3], ['pill_found', 3], ['jade_pendant', 2]],
  yao:  [['herb_blood', 3], ['herb_dew', 3], ['spirit_fruit', 3], ['spirit_crystal', 2], ['gu_egg', 2], ['iron_ore', 2],
         ['bronze_mirror', 1], ['mihun_flower', 2], ['mihun_seed', 1], ['vine_seed', 1], ['vine_fruit', 1]],
};

// 顾客想买的品类权重
const BUY_WANTS = {
  ren:  { yin: 4, dan: 3, cai: 3, za: 1, wan: 1, zhi: 1, chong: 0.5, xin: 0.5, ji: 0.6, ju: 0.4 },
  mo:   { qi: 4, dan: 4, yao: 3, fu: 2, gu: 2, cai: 1, hun: 2, shi: 2, yin: 2, xin: 0.8, ji: 0.6, ju: 1 },
  xian: { wan: 3, dan: 3, qi: 2, fu: 1, zhi: 1, yin: 3, xin: 1.2 },
  yao:  { yin: 6, cai: 2, gu: 1, zhi: 2, chong: 1, xin: 0.4 },
};

// 顾客识破谎言的基础能力：凡人好骗，仙门弟子见多识广
const SAVVY = { ren: 0.2, yao: 0.3, mo: 0.4, xian: 0.55 };

const FACTION_BUDGET = { ren: [40, 260], mo: [80, 900], xian: [150, 1500], yao: [40, 400] };

const PORTRAITS = {
  ren:  [['ren_cultivator', '낙패한 산수'], ['ren_merchant', '범인 행상'], ['ren_kid', '잡역 소년']],
  xian: [['xian_defector', '유방 검객'], ['xian_spy', '복면 여수사']],
  mo:   [['mo_disciple', '외문 제자'], ['mo_senior', '내문 사배']],
  yao:  [['yao_fox', '여우 요괴'], ['yao_tiger', '호랑이 요괴'], ['yao_snake', '뱀 요괴']],
};


// 拾荒地点：loot 为 [id, 权重]，danger 为每次翻找的基础遇险率
// scrolls：拾荒时偶尔翻出你正缺的那一重秘籍（三四重），每找到一件东西有 SCROLL_FIND 的机会是它
const SCROLL_FIND = 0.03;
const LOCATIONS = [
  { id: 'ruins', name: '종문 폐허', bg: 'loc_ruins', tries: 9, find: 0.7, danger: 0.08,
    desc: '혈살종에 멸문당한 옛 종파의 유적. 깨진 기물, 폐단, 단방 찢긴 쪽이 잔해 아래 묻혀 있고, 가끔 다 흩어지지 않은 호산 금제도 남아 있다.',
    loot: [['broken_relic', 8], ['waste_pill', 7], ['iron_ore', 3], ['scroll_manual', 2], ['spirit_crystal', 1.2], ['jade_pendant', 1],
           ['jade_slip', 0.4], ['puppet_scroll', 0.3], ['pill_recipe', 0.2], ['bronze_mirror', 0.5]],
    scrolls: ['refine', 'alchemy', 'talisman', 'water', 'forgery'],
    hazard: { text: '남아 있던 호산 금제를 건드려 검기에 소매 반이 날아갔다. 상처를 기르느라 영석을 좀 썼다.', cost: 25, cond: ['injured', 1], end: true } },
  { id: 'battlefield', name: '옛 전장', bg: 'loc_battlefield', tries: 8, find: 0.72, danger: 0.12,
    desc: '상고 선마대전의 유적. 깨진 기물과 폐단이 그을린 흙 아래 묻혀 있다. 지금 전화가 다시 타올라 새 시신과 원혼이 날로 는다. 순찰 도는 선문 검수들도 마찬가지다.',
    loot: [['broken_relic', 7], ['waste_pill', 5], ['scrap_sword', 4], ['soul_wisp', 3], ['demon_charm', 2], ['pill_qi', 0.8], ['soul_grudge', 0.6], ['blood_essence', 0.8], ['xian_talisman', 0.4]],
    warLoot: [['corpse', 6], ['soul_wisp', 3], ['soul_grudge', 2], ['sword_std', 1.2], ['xian_talisman', 1], ['xian_sword', 0.25]],
    scrolls: ['soul', 'refine', 'talisman'],
    hazard: { text: '검광 하나가 하늘에서 떨어졌다. 너는 구르며 잡역 구역으로 도망쳐 돌아왔고, 등에는 피줄기가 남았다.', cost: 35, heat: 4, cond: ['injured', 2], end: true } },
  { id: 'scrapyard', name: '연기방 폐품장', bg: 'loc_scrapyard', tries: 6, find: 0.7, danger: 0.06,
    desc: '부서진 검과 낡은 갑옷이 산처럼 쌓이고, 잘못 만든 법기도 여기 버린다. 파수꾼에게 들키면 집법당의 주목을 받는다.',
    loot: [['scrap_sword', 8], ['iron_ore', 6], ['broken_relic', 4], ['broken_bowl', 3], ['iron_ingot', 2], ['sword_std', 1], ['fire_disk', 0.4], ['puppet_scroll', 0.2]],
    scrolls: ['refine', 'puppet'],
    hazard: { text: '파수꾼이 등불을 들고 순찰을 오자 너는 허둥지둥 담을 넘어 도망쳤다.', heat: 8, end: true } },
  { id: 'graveyard', name: '난장 고개', bg: 'loc_graveyard', tries: 6, find: 0.65, danger: 0.1,
    desc: '흰 뼈와 도깨비불 사이에 가끔 묻혀 있던 오래된 물건. 시기가 몸을 상한다.',
    loot: [['bones', 10], ['broken_bowl', 3], ['demon_charm', 3], ['jade_pendant', 1.5], ['soul_bell', 1], ['bone_flute', 1], ['scroll_manual', 1],
           ['corpse', 4], ['soul_wisp', 4], ['soul_grudge', 0.6]],
    scrolls: ['corpse', 'soul', 'erase'],
    hazard: { text: '시기가 몸을 파고들어 피를 토하며 가게로 돌아왔다. 약을 사느라 영석을 좀 썼다.', cost: 15, cond: ['poisoned', 1], end: true } },
  { id: 'beastcave', name: '만마굴 외곽', bg: 'loc_beastcave', tries: 5, find: 0.6, danger: 0.14,
    desc: '요수 출몰지. 요재와 영초가 풍부하다. 요단을 가져가면 요족의 원한을 산다.',
    loot: [['herb_blood', 4], ['herb_dew', 4], ['beast_hide', 2], ['yao_core', 1.5], ['gu_egg', 2], ['spirit_crystal', 1.5], ['spirit_fruit', 3],
           ['mihun_seed', 2], ['vine_seed', 1.5], ['mihun_flower', 1]],
    scrolls: ['beast', 'plant', 'brew'],
    hazard: { text: '동굴 속 거대한 눈이 뜨이고 발톱 하나가 너를 뒤집었다. 상처를 기르느라 영석을 꽤 썼다.', cost: 20, cond: ['injured', 2], end: true } },
];

// 战事开启后才能去的地方（暂无，古战场常开）
const WAR_LOCATIONS = [];

const BASKET = [4, 3];
