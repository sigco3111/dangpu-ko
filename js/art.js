// 鉴定小游戏：鉴定物是一张写实底图，肉眼看真赝一模一样；照妖镜像一盏紫外灯，镜里整件东西泛着幽紫，
// 作伪的痕迹露出原形、发出荧光，镜中有一处发亮，便是赝品。每种作伪手法在图上有固定的一处（at：[x, y, 半径]，按图宽计），
// 补丁图由 tools/art/appraise.py 按 art 描述遮罩改图生成（assets/appraise/<img>_<key>.webp），
// 荧光图由 tools/art/appraise_uv.py 比较补丁与底图生成（<img>_<key>_uv.webp）
'use strict';

const APPRAISE = {
  pill: {
    name: '축기단', img: 'pill',
    traces: [
      { key: 'wax', label: '밀랍 옷에 금 입힘', at: [0.72, 0.60, 0.085],
        text: '싼 단환에 황랍을 입히고 금박을 붙여 금단인 척한다. 조요경으로 비추면 금가죽 갈라진 틈이 들리고 그 아래 잿빛 녹색 약씨가 드러난다.',
        art: 'the gold skin of the pill turns semi-transparent and is revealed to be only a thin sheet of gold leaf laid over a layer of yellow wax; a small crack in the gold leaf curls up at its edge, and through the translucent wax a dull grey-green cheap pill core is visible underneath.' },
      { key: 'carve', label: '나중에 새긴 단문', at: [0.60, 0.43, 0.10],
        text: '진단의 구름 무늬는 단불 속에서 저절로 맺혀 단피와 한몸이다. 모작은 단이 된 뒤 바늘 칼로 새긴 것이라 거울 아래 칼자국에 거스름이 나고 깊이가 고르지 않으며 홈에 금가루가 남아 있다.',
        art: 'the raised cloud relief is revealed to have been scratched in afterwards with a needle knife: sharp V-shaped cut grooves with tiny burrs, uneven depth, small slips where the blade overshot the line, and fine gold powder residue left in the grooves.' },
      { key: 'seam', label: '합형 압제', at: [0.25, 0.33, 0.085],
        text: '한 배치의 가짜 단은 두 반쪽 구리 거푸집으로 찍어 단 몸통 한 바퀴에 가는 합형선과 밀려나온 얇은 테가 남는다. 아무리 갈아도 없어지지 않는다.',
        art: 'a clearly visible mold parting seam cuts straight across this part of the pill, interrupting the cloud relief: a raised thin ridge of squeezed-out flash material along the seam, the cloud pattern slightly misaligned on the two sides of the seam, and coarse sanding scratches across it where someone tried to file it down.' },
      { key: 'glow', label: '형광 가루 가짜 빛', at: [0.50, 0.71, 0.085],
        text: '진단의 영광은 단심에서 배어난다. 모작의 빛은 단좌 안쪽 가장자리에 바른 형석 가루라 거울 아래 빛이 밑에서 오고 가루 알갱이가 하나하나 빛난다.',
        art: 'the warm glow at the foot of the pill is revealed to come from a smear of glowing phosphor mineral powder painted on the inner rim of the gilded stand: individual glowing grains and brush smears on the stand, while the pill surface just above it is dull and lifeless.' },
    ],
  },
  jade: {
    name: '고옥패', img: 'jade',
    traces: [
      { key: 'qin', label: '물들인 가짜 스밈', at: [0.27, 0.60, 0.085],
        text: '진짜 스밈은 흙빛이 옥의 결을 따라 수백 년에 걸쳐 천천히 배어들어 짙은 데서 옅은 데로 간다. 가짜는 안료를 삶고 구워 넣어 거울 아래 색이 표면에 뜨고 금에 고이며 경계가 어색하다.',
        art: 'the brown discoloration in the jade is revealed as artificial dye: the color sits on the surface and is concentrated in hairline cracks as dark lines with hard edges, with tiny pooled dried droplets of dye, and no gradual diffusion into the stone.' },
      { key: 'tool', label: '빠른 연마 급공', at: [0.62, 0.37, 0.09],
        text: '전대 옥기는 손 연마로 조금씩 갈아 선의 깊이에 변화가 있다. 모작은 빠른 연마로 한 번에 밀어내 거울 아래 홈에 고른 나선 자국이 돌고 홈 가에 작은 흠이 벗겨져 있다.',
        art: 'the carving of the dragon head is revealed as cheap machine work: every carved groove is lined with clearly visible fine concentric spiral scratch rings left by a fast spinning grinding wheel, the grooves have identical mechanical depth, and the groove edges are rough with many small white chipped flakes and fresh white grinding powder stuck in the grooves.' },
      { key: 'glue', label: '깨진 곳 접착', at: [0.45, 0.58, 0.07],
        text: '깨진 옥패의 결손을 색을 맞춘 풀로 메웠다. 조요경으로 비추면 풀과 옥의 경계가 뚜렷하고 풀 속에 기포가 맺혀 있다.',
        art: 'the dragon claw is revealed as a repair made of tinted translucent resin instead of jade: a visible fracture line where it joins the jade, small round air bubbles trapped inside the resin, slightly glossier and more yellow than the stone.' },
      { key: 'acid', label: '산으로 낡은 척', at: [0.70, 0.80, 0.085],
        text: '산으로 하얀 껍질을 만들어 계골백인 척한 옥이다. 거울 아래 촘촘한 벌집 자국에 자국 벽이 날카롭고 포장이 없다.',
        art: 'the jade surface is revealed as acid-etched to fake age: a dense honeycomb of tiny round pits, a chalky white powdery crust, fresh sharp-edged pit walls, and no smooth polished patina.' },
    ],
  },
  mirror: {
    name: '청동 고경', img: 'mirror',
    traces: [
      { key: 'rust', label: '풀칠 가짜 녹', at: [0.36, 0.60, 0.08],
        text: '진짜 녹은 구리에서 자라 층층이 굳는다. 가짜 녹은 풀에 동녹 가루를 개어 칠한 것. 조요경이 녹층을 꿰뚫으면 아래 노란 새 구리가 드러난다.',
        art: 'the green patina here is revealed as a fake coating peeling away: a glossy transparent glue film with brush stroke ridges holding green powder, and where it has flaked off, bright shiny new yellow-gold brass metal is clearly exposed underneath, smooth and clean with no corrosion at all, sharply contrasting with the dark old bronze around.' },
      { key: 'knob', label: '나중에 붙인 손잡이', at: [0.59, 0.47, 0.07],
        text: '거울 손잡이는 따로 만들어 붙인 것이다. 거울 아래 손잡이 받침 한 바퀴 잿빛 납땜에 땜 덩어리와 줄 자국이 그대로 남아 있다.',
        art: 'along the right edge of the bronze lion-head knob, where it sits on the flat mirror, a conspicuous thick lumpy bead of bright silver-white tin solder fills the joint, clearly a different metal from the brown bronze: molten drips running onto the mirror surface, coarse file scratches across the solder, and a dark crack line separating the knob from the mirror.' },
      { key: 'lobe', label: '거푸집 주조 보충', at: [0.82, 0.70, 0.10],
        text: '한 조각이 없어 거푸집으로 새로 부어 맞췄다. 거울 아래 이 조각은 무늬가 흐릿하고 모래눈이 가득하며 원래 거울과 사이에 이음새가 있다.',
        art: 'this rim lobe is revealed as a recast replacement: its relief is soft and blurred and covered in tiny sand-casting pinholes, with a thin straight join seam where it meets the original mirror, and the bronze is a slightly different color.' },
      { key: 'chisel', label: '새김칼 보문', at: [0.47, 0.185, 0.07],
        text: '주조 무늬가 닳아 없어지자 새김칼로 다시 깊게 팠다. 거울 아래 칼자국은 V자형이고 홈 바닥에 새 구리의 밝은 빛이 보여 주조 무늬처럼 둥글지 않다.',
        art: 'the key-fret band has been re-cut with a chisel: sharp V-shaped fresh cuts with bright shiny copper at the bottom of the grooves, small chisel stop marks, and crisp unworn edges unlike the soft rounded cast pattern around it.' },
    ],
  },
};

// 照妖镜图（assets/appraise/loupe.webp）的量度，以镜片半径为 1：图宽高、镜片圆心、镜片圆心到柄尾
const LOUPE = { w: 2.657, h: 6.248, cx: 1.326, cy: 1.353, end: 4.895 };

// 生成一件可鉴定物的破绽：真品没有；赝品用了 1–2 种手法。
// 每处破绽有“隐蔽度”，最隐蔽的一处等于做工；鉴定术不到这一重，照妖镜里也看不出来。flip：摆放朝向
function rollFeats(kind, fake, grade = 1) {
  const spec = APPRAISE[kind], feats = {}, subtle = {};
  if (fake) {
    const keys = spec.traces.map(t => t.key).sort(() => Math.random() - 0.5);
    const n = grade >= 3 ? 1 : Math.random() < 0.6 ? 1 : 2;
    keys.slice(0, n).forEach((k, i) => {
      feats[k] = 1;
      subtle[k] = i === 0 ? grade : 1 + Math.floor(Math.random() * grade);
    });
  }
  return { feats, subtle, flip: Math.random() < 0.5 };
}

// 旧存档里的鉴定物记的是矢量图时代的特征，按真伪与做工重掷一次
function ensureFeats(it) {
  const kind = ITEMS[it.id].appraise, keys = APPRAISE[kind].traces.map(t => t.key);
  if (it.feats && Object.keys(it.feats).every(k => keys.includes(k)) && it.flip != null) return;
  Object.assign(it, rollFeats(kind, !!it.fake, it.grade || 1));
}

// 以某一重鉴定术在照妖镜里看到的破绽：[{ key }]。看不穿的不在其列；够得着的一律照得清清楚楚
function visibleFeats(it, lv) {
  ensureFeats(it);
  return Object.keys(it.feats).filter(k => (it.subtle[k] || 1) <= lv).map(k => ({ key: k }));
}

// 鉴定物的画面：底图，加上照妖镜里才显出的破绽（seen 为空即肉眼所见）。
// uv：照妖镜里的样子——整件压成紫外灯下的幽紫，破绽处叠一层荧光、外面一圈光晕，一明一暗地闪
function appraiseImg(kind, seen = [], flip = false, uv = false) {
  const spec = APPRAISE[kind], src = n => `assets/appraise/${n}.webp`;
  const traces = seen.map(({ key }) => {
    const [x, y, r] = spec.traces.find(t => t.key === key).at;
    const box = `left:${((x - r) * 100).toFixed(2)}%;top:${((y - r) * 100).toFixed(2)}%;width:${(r * 200).toFixed(2)}%`;
    const patch = `<img class="ap-trace" src="${src(`${spec.img}_${key}`)}" alt="" draggable="false" style="${box}">`;
    if (!uv) return patch;
    return `${patch}<i class="ap-halo" style="${box}"></i><img class="ap-uv" src="${src(`${spec.img}_${key}_uv`)}" alt="" draggable="false" style="${box}">`;
  }).join('');
  return `<div class="ap-img${flip ? ' flip' : ''}${uv ? ' uv' : ''}"><img src="${src(spec.img)}" alt="" draggable="false">${traces}</div>`;
}
