// 共用四节点分支骨架；每位角色独有的处境、胁迫与结局保存在 js/cast/<id>.js。
'use strict';

// 每位角色登场时的处境：按 id 定，同一个人每局一样——有人带伤而来，有人被下了毒，多数人安然无恙
function ecologyArrival(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ['injured', 'poisoned', null, null, null][h % 5];
}

function ecologyCharacter(d) {
  const he = d.sex === 'f' ? '그녀' : '그';
  const arrival = ecologyArrival(d.id);
  // 夜里施压的人有多硬：施压的派系越凶，越难对付
  const enforcerDc = { law: 46, war: 44, dan: 38, heir: 36 }[d.clique] || 40;
  const address = { ren: '주인장', yao: '인족 주인장', mo: '가게 주인', xian: '점주' }[d.faction];
  const itemTitle = ITEMS[d.item].name;
  const supported = st => st.flags.backed || st.flags.tradeHelp;
  const close = (st, p, ending, text, summary) => {
    st.flags.outcome = ending;
    lifeNote(p, summary);
    return { text, end: true, summary: `${d.name}：${summary}` };
  };
  // 身边有没有治伤毒的东西
  const healItemFor = p => condSev(p, 'injured') ? ownItem(it => ['vine_fruit', 'pill_blood'].includes(it.id) && !it.fake && !it.laced)
    : ownItem(it => ['herb_blood', 'pill_qi'].includes(it.id) && !it.fake && !it.laced);
  const expose = (st, p) => {
    earn(160, `${d.name}의 증거를 팔았다.`); shiftSt(d.clique, 8);
    remember(p, '독립 증거물을 압박하는 쪽에 팔았다.', -60, 'betrayed'); st.flags.sold = true;
    return { text: '증거를 산 사람은 이름을 남기지 않고 딱 맞는 영석만 두고 갔다. 다음 사람이 오면 너는 빈 함밖에 내밀 수 없다.', go: ['aftermath', [3, 5]], summary: `너는 ${d.name}의 증거를 팔았다.` };
  };
  return {
    // 立绘默认百炼 Qwen 画；个别重画过的写 artProvider: 'gpt'，走 cast.mjs art 的 GPT 流程（ecologyBatch 不变：并行上限照算）
    portrait: d.id, ecologyBatch: 'qwen3pro55', artProvider: 'bailian', artModel: 'qwen-image-3.0-pro', ...d,
    bio: `${d.age}세, ${d.title}. ${d.problem}`, intro: `${d.name}이(가) 가져온 것은 보통 저당이 아니다: ${d.problem}`,
    savvy: d.age < 18 ? 0.3 : 0.55, power: d.age < 18 ? 10 : d.faction === 'mo' ? 36 : 26, eye: 2,
    traits: { greed: 0.35, integrity: 0.65, caution: 0.7, wish: d.item, budgetMul: d.age < 18 ? 0.65 : 1 },
    // 登场日按原定先后压缩到第 6–38 日，让一局六十日内大多见得到；至多五个扩展故事并行；底图未安装者不提前登场；恶名在外的铺子没人来托付
    start: { day: Math.max(6, Math.round(d.start_day * 0.6)), node: 'meet', chance: 0.5,
      cond: () => ART_SET.has(`chars/${d.id}`) && fateTrusted() && Object.values(S.story)
        .filter(st => !st.done && CAST[st.tpl] && CAST[st.tpl].ecologyBatch === 'qwen3pro55').length < 5 },
    regular: true,
    lines: {
      first: `${address}, 나는 ${d.name}이오. ${d.title} 일을 하는 사람이오. 먼저 ${itemTitle}을(를) 묻고 싶소.`,
      neutral: `${address}, 오늘 ${itemTitle}은(는) 어떤 상태요?`,
      warm: `지난번 일은 기억하고 있소. ${address}, 이번엔 값을 솔직히 말해주시오.`, close: '여러 문턱을 넘어보니 여기만이 앉아서 사실대로 말할 수 있는 곳이오.',
      cold: '물건 얘기만 하시오. 지난일은 잠시 접어두고.', hostile: '이번에는 숫자를 똑바로 적으시오. 지난 장부를 되풀이하지 말도록.',
      buy: '{cat}을(를) 좀 사려 하오. 당장 일에 쓸 것이지 보기 좋으라고 사는 게 아니오.', sell: '이 {item}, 부르는 값은 {ask} 영석이오. 상태를 보고 나서 답을 주시오.',
    },
    on: {
      start: (st, p) => { if (arrival) addCond(p, arrival, 1, arrival === 'injured' ? '압박하는 자에게 맞았다' : '누군가 음식에 약을 탔다'); },
      sold: (st, p, it, price) => {
        if (st.done || st.flags.tradeHelp || it.id !== d.item || it.fake || it.laced) return;
        if (price <= knownValue(it)*priceMul(it.id)) {
          st.flags.tradeHelp = true;
          remember(p, '분쟁이 끝나기 전, 급히 쓸 물건을 공정한 값에 넘겨주었다.', 8, 'fair');
        }
      },
      death: (st, p) => {
        if (st.done) return;
        st.done = true; st.flags.outcome = 'death'; st.summary = `${d.name}은(는) 분쟁이 끝나는 것을 보지 못했다.`;
        log(`${d.name}이(가) 남긴 그 일에는 다시는 증거를 찾는 이가 없었다.`, 'loss');
      },
    },
    nodes: {
      meet: {
        when: 'day',
        text: (st, p) => `${d.name}은(는) 품의 물건을 카운터 모퉁이에 살짝 내려놓고 서둘러 값을 부르지 않았다.${condList(p).length ? `\n${he}는 ${condSev(p, 'injured') ? '한쪽 팔을 걸고 있었고 소매에서 피가 배어 나왔다' : '입술이 새파랬고 두 마디만 하면 멈춰 서서 숨을 몰아쉬었다'} — ${condText(p).replace(/[.]$/, '')}.` : ''}\n${d.problem}\n"${address}, ${d.cost} 영석을 빌려주거나 ${itemTitle} 하나를 구해주시오. 마음에 걸리면 먼저 증거물을 맡겨두고, 장부가 맞는지 보고 나서 얘기해도 되오."`,
        choices: (st, p) => [
          // 他身上带着伤毒：先治人，再谈事
          ...(condList(p).length ? [{ label: `먼저 ${he}의 ${condSev(p, 'injured') ? '부상' : '독'}을 치료한다`,
            hint: `${condSev(p, 'injured') ? '혈등과 또는 혈살단' : '혈영지 또는 회기단'} 하나를 쓴다; 호감 +12; ${he}는 뒷일을 버틸 수 있다`,
            req: () => !!healItemFor(p) || `손에 ${condSev(p, 'injured') ? '혈등과, 혈살단' : '혈영지, 회기단'}이(가) 없다`, run: () => {
              takeItem(healItemFor(p)); cureCond(p, 'injured'); cureCond(p, 'poisoned'); goodDeed(p, 1);
              remember(p, '먼저 그의 상처와 독을 치료한 뒤에야 이야기를 들었다.', 12, 'helped'); st.flags.healed = true;
              return { text: `${he}는 한숨 돌리고 말했다: "내일 다시 와서 일의 처음부터 말씀드리겠소."`, go: ['meet', 1] };
            } }] : []),
          { label: '재료비와 심부름 값을 대신 낸다', hint: `-${d.cost}영석; 선명 +2; 호감 +15`, req: needStones(d.cost), run: () => {
            spend(d.cost, `${d.name}의 자금 회전을 대신 댔다.`); goodDeed(p, 2); remember(p, '먼저 회전 자금을 대신 댔다.', 15, 'helped');
            st.flags.backed = true;
            return { text: `${he}는 액수를 하나하나 증거물 뒷면에 적었다: "이 돈을 공짜로 쓰게 할 수는 없소."`, go: ['pressure', [2, 4]], summary: `너는 ${d.name}의 회전 자금을 대신 냈다.` };
          } },
          { label: `${itemTitle} 하나를 급한 대로 준다`, hint: `진품 ${itemTitle} 하나를 잃는다; 선명 +2; 호감 +15`,
            req: () => !!ownItem(it => it.id === d.item && !it.fake && !it.laced) || `쓸 만한 진품 ${itemTitle}이(가) 없다`,
            run: () => {
              takeItem(ownItem(it => it.id === d.item && !it.fake && !it.laced));
              goodDeed(p, 2); remember(p, '급하게 쓸 진품 하나를 내주었다.', 15, 'helped'); st.flags.backed = true;
              return { text: `${he}는 봉인을 확인하고 나서야 물건을 받았고, 증거물을 남겨두었다.`, go: ['pressure', [2, 4]] };
            } },
          { label: '돈은 보지 않고 증거물만 맡아 대조한다', hint: '영석이 들지 않는다; 호감 +3; 이후에도 증언 위험은 남는다', run: () => {
            st.flags.examined = true; remember(p, '돈을 먼저 내지는 않았지만 이 일의 증거는 맡아주었다.', 3);
            return { text: `너는 증거물을 받았지만 ${he}의 말뿐인 보증은 받지 않았다.`, go: ['pressure', [3, 5]] };
          } },
          { label: '이 일은 받지 않는다', hint: '영석이 들지 않는다; 호감 -5; 이 이야기 종료', run: () => {
            remember(p, '이 분쟁을 받아들이지 않았다.', -5);
            return close(st, p, 'declined', `${d.name}은(는) 물건을 챙겨 돌아갔다. ${d.failure}`, `너는 끼어들지 않았고, ${d.failure}`);
          } },
        ],
      },
      pressure: {
        when: 'night',
        text: st => `밤이 깊자 ${d.name}은(는) 불 켜진 거리 어귀를 돌아 뒷문을 두드렸다.\n${d.pressure}\n${supported(st) ? '네가 댄 돈이 이미 쓰였고, 상대는 그 때문에 네 가게 이름까지 물었다.' : '증거물은 카운터 밑에 눌러둔 채이고 상대는 이미 거리를 돌며 캐묻기 시작했다.'}\n"${address}, 증거물을 여기 두는 건 나를 돕는 일이기도 하고, 당신에게 일을 만드는 일이기도 하오."`,
        choices: (st, p) => [
          { label: '부본 증거 두 부를 만들어 독립 근거를 남긴다', hint: '-20영석; 주시 +5; 호감 +10; 심리 계속', req: needStones(20), run: () => {
            spend(20, `${d.name}을(를) 위해 근거 두 부를 남겼다.`); addHeat(5); st.flags.copied = true;
            remember(p, '심문받을 위험을 무릅쓰고 증거물의 근거를 남겼다.', 10, 'helped');
            return { text: '한 부는 물건 칸에, 한 부는 옛 장부에 묶어두었다. 날이 밝기 전, 조사하는 자가 과연 찾아왔다.', go: ['hearing', [2, 3]] };
          } },
          { label: '나가서 캐묻는 자들을 쫓아버린다', hint: `성공률 약 ${Math.round(trialOdds(enforcerDc) * 100)}%(${condText('me') || '너의 상태는 아직 괜찮다'}); 성공하면 증언 위험이 없어지고, 실패하면 부상을 입고 증거물을 빼앗긴다${deathWarn('injured')}`, run: () => {
            const t = trial('me', enforcerDc);
            if (t.ok) {
              addHeat(6); shiftSt(d.clique, -5); st.flags.public = true; st.flags.fought = true;
              remember(p, '압박하는 자들이 찾아오자 밖으로 나가 쫓아버렸다.', 18, 'helped');
              return { text: `너는 빗장을 들고 뒷문으로 나섰다. 골목에서 한바탕 소란이 울리고, 캐묻던 자들은 얼굴을 감싸고 달아나 다시 오지 않았다.\n${d.name}은(는) 문 안에서 듣고 있다가 한참 말을 잇지 못했다.`, go: ['aftermath', [2, 4]] };
            }
            addCond('me', 'injured', t.margin < -15 ? 2 : 1, '뒷골목에서 캐묻는 자들과 몸싸움을 벌였다'); addHeat(8);
            st.flags.sold = true; st.flags.robbed = true;
            remember(p, '증거물을 지키려 했지만 싸움에서 져 빼앗겼다.', -10);
            return { text: `문을 나서자마자 몽둥이를 얻어맞았다. ${condText('me')}\n일어나 보니 증거물은 이미 뒤져 가져간 뒤였다.`, go: ['aftermath', [3, 5]] };
          } },
          { label: '원래 증거를 압박하는 쪽에 판다', sin: ['betray', 2], hint: '+160영석; 호감 -60; 파벌 호감 +8; 뒷일이 남는다', run: () => expose(st, p) },
          { label: '증거물을 돌려주고 다시는 끼어들지 않는다', hint: '더는 돈이 들지 않는다; 호감 -8; 계속 증언할 기회를 잃는다', run: () => {
            remember(p, '소문이 험악해지자 증거물을 돌려주었다.', -8);
            return close(st, p, 'withdrawn', `${d.name}은(는) 증거물을 옷 속에 도로 밀어 넣었다. ${d.failure}`, `너는 캐묻기가 닥치기 전에 손을 뗐고, ${d.failure}`);
          } },
        ],
      },
      hearing: {
        when: 'day', who: () => ({ name: '집법당 계약 심사 서리', portrait: 'mo_enforcer', title: '계약 심사관', faction: 'mo' }),
        text: () => `철가면을 쓴 서리가 영수증 두 장을 펼쳤다: "${d.name}의 일은 양쪽 말이 다르다. 근거가 있으면 처음에 어떻게 썼고 나중에 어떻게 고쳤는지 밝혀라."\n${d.pressure}\n그는 종이 귀퉁이를 눌렀다: "이건 내가 공도를 세우는 문제가 아니라, 네가 가게 이름을 증거 뒤에 쓸 생각이 있느냐의 문제다."`,
        choices: (st, p) => [
          { label: '독립 감정인을 불러 가게 이름으로 증언한다', hint: `-40영석; 주시 +5; 압박 파벌 호감 -6; 증거 보존${hasCond('me', 'poisoned') || condSev('me', 'deviation') || hasCond('me', 'exhausted') ? '; 너의 마음이 어지러워 서리가 믿지 않을 수 있다' : ''}`, req: needStones(40), run: () => {
            spend(40, `${d.name}을(를) 위해 독립 감정인을 불렀다.`); addHeat(5); shiftSt(d.clique, -6);
            // 心神不宁的证人，说话前后不一
            if (lieCaught(0.15)) {
              st.flags.compromise = true;
              return { text: `말하던 도중 ${hasCond('me', 'poisoned') ? '독기가 치솟아 눈앞이 캄캄해졌고' : '정신이 아찔해졌고'} 앞뒤가 맞지 않았다. 서리가 눈을 들어 너를 봤다: "주인장의 기억이 그리 좋지 않은 모양이군."\n감정인은 고쳐진 곳의 절반만 표시해 일이 완전히 뒤집히지 못했다.`, go: ['aftermath', [3, 5]] };
            }
            st.flags.public = true;
            return { text: '감정인이 근거 두 부를 대조해 고쳐진 곳을 표시했다. 네 가게 이름도 종이 끝에 적혔다.', go: ['aftermath', [3, 5]] };
          } },
          { label: '돈으로 보증을 서고 옛 장부는 덮는다', hint: '-100영석; 압박 파벌 호감 +3; 눈앞만 지키고 옛 장부는 파헤치지 않는다', req: needStones(100), run: () => {
            spend(100, `${d.name}을(를) 위해 화해 보증금을 냈다.`); shiftSt(d.clique, 3); st.flags.compromise = true;
            return { text: '서리는 돈을 받고 새 계약에서 이번 추궁을 지웠다. 옛 계약은 폐기되지 않은 채 잠시 찬장 밑으로 들어갔다.', go: ['aftermath', [2, 4]] };
          } },
          { label: '근거를 넘기고 협조 포상을 받는다', sin: ['betray', 2], hint: '+160영석; 호감 -60; 압박 파벌 호감 +8', run: () => expose(st, p) },
        ],
      },
      aftermath: {
        when: 'night',
        text: st => st.flags.robbed ? `${d.failure}\n${d.name}은(는) 네 상처를 보러 와 문간에 오래 서 있었다: "나 때문에 그 몽둥이를 맞았는데, 증거마저 없어졌군요."`
          : st.flags.sold ? `${d.failure}\n${d.name}은(는) 밤에 원래 증거를 가지러 왔다가 빈 함 곁에 손을 멈췄다: "돈은 치렀군요. 그럼 내 일은요?"`
          : st.flags.public ? `${d.success}\n${d.name}은(는) 검증받은 부본을 가져와, 원래 증거를 앞으로 누구에게 맡길지 네게 정해달라 했다.`
            : `${d.name}은(는) 새 계약을 가져와 보여주었다. 눈앞의 추궁은 멈췄지만 옛 장부의 글자는 여전히 읽힌다.\n"이번을 피했다고 일이 끝난 건 아니오."`,
        choices: (st, p) => st.flags.robbed ? [
          { label: '...', hint: `${he}는 네가 대신 맞은 그 몽둥이를 기억한다`, run: () => {
            remember(p, '그를 위해 몽둥이를 맞았지만 증거는 지키지 못했다.', 15);
            return close(st, p, 'robbed', `${d.failure}\n${d.name}은(는) 너를 탓하지 않았지만 다시는 그 일을 꺼내지 않았다.`, `너는 ${d.name}을(를) 위해 싸웠지만 져서 증거를 빼앗겼다. ${d.failure}`);
          } },
        ] : st.flags.sold ? [
          { label: '원래 증거를 되찾지 않고 이 거래를 인정한다', hint: '동족 명성 -5; 주시 +4; 상대는 떠나고 다시 거래하러 오지 않는다', run: () => {
            adjustRep(d.faction, -5); addHeat(4); p.status = 'gone';
            return close(st, p, 'betrayed', `${d.failure}\n${d.name}은(는) 빈 함을 닫고 다시는 값을 부르지도, 찾아오지도 않았다.`, `증거는 네가 팔았다. ${d.failure}`);
          } },
          { label: '200영석을 더 내 옛 근거 한 부를 되찾는다', hint: '-200영석; 주시 +8; 호감은 5만 회복; 증거를 판 기억은 사라지지 않는다', req: needStones(200), run: () => {
            spend(200, `${d.name}을(를) 위해 옛 근거를 되찾았다.`); addHeat(8); remember(p, '증거를 판 뒤 돈을 내 근거 한 부를 되찾았다.', 5);
            return close(st, p, 'repaired_betrayal', `${d.name}은(는) 되찾은 종이를 거두며 말했다: "옛 장부는 그대로요. 오늘은 넘기지 않을 뿐이오."`, '너는 증거를 팔았다가 한 부를 되찾았지만 손해와 원한은 사라지지 않았다.');
          } },
        ] : [
          { label: '원래 증거를 본인에게 돌려주고 보관료는 받지 않는다', hint: st.flags.compromise ? '선명 +2; 동족 명성 +2; 호감 +12; 분쟁을 잠시 미룰 뿐' : '선명 +2; 동족 명성 +4; 호감 +22; 신세를 지게 된다', run: () => {
            goodDeed(p, 2); adjustRep(d.faction, st.flags.compromise ? 2 : 4);
            remember(p, '원래 증거를 돌려주며 도움을 청한 이에게 보관료를 더 받지 않았다.', st.flags.compromise ? 12 : 22, 'helped');
            if (st.flags.compromise) return close(st, p, 'truce', `${d.name}은(는) 새 계약과 옛 증거를 챙기며 말했다: "오늘을 넘기고 나서 다음을 얘기하시오."`, '너는 임시 화해를 이끌었지만 옛 장부는 남았다.');
            p.owes = true;
            return close(st, p, 'protected', `${d.success}\n${he}는 원래 증거를 가져가며 앞으로도 찾아올 이유를 남겼다.`, d.success);
          } },
          { label: '부본을 남기고 본인 동의 아래 오래 귀와 눈이 되어준다', hint: '축기 또는 충분한 세력 필요; 선명 +2; 동족 명성 +4; 호감 +22; 중보 보장 없음',
            req: () => (strongEnough() && !!st.flags.public) || '축기 또는 충분한 세력이 필요하고, 증거를 공개 검증했어야 한다', run: () => {
              p.informant = true; p.owes = true; goodDeed(p, 2); adjustRep(d.faction, 4);
              remember(p, '분쟁이 끝난 뒤 본인과 이 바닥 소문을 주고받기로 약속했다.', 22, 'helped');
              let extra = '';
              if (strongEnough() && supported(st) && Math.random() < 0.35) {
                extra = makeIntel('market') ? '이 바닥 시세 한 장이 창고로 들어왔다.' : '시세 종이를 둘 곳이 없어 말로만 전했다.';
              }
              return close(st, p, 'informant', `${d.success}\n${d.name}은(는) 앞으로 이 바닥 소문을 가져오기로 했다. ${extra}`, `분쟁이 끝났고 ${d.name}은(는) 이 바닥의 귀와 눈이 되었다.`);
            } },
        ],
      },
    },
  };
}
