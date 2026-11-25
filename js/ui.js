// 界面：渲染、拖放、弹窗与交互流程
'use strict';

const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const icon = (name, cls = 'ic') => `<img class="${cls}" src="${asset('ui', name)}" alt="" draggable="false">`;
const stoneTxt = n => `${icon('ic_stone')}<b>${n}</b>`;
const pct = p => `${Math.round(p * 100)}%`;

let scale = 1;
let tab = 'display';
let sel = null; // 선택된 물건 uid
let modal = null; // 현재 팝업 렌더 함수
let toastTimer = null;

// ───────────── 舞台缩放 ─────────────

// 两种排版：wide（电脑、平板横屏、手机横屏）宽 1280；tall（手机、平板竖屏）宽 480/640。高度随屏幕
let LAYOUT = 'wide', STAGE = { w: 1280, h: 760 };

function fitStage() {
 const ar = innerWidth / innerHeight, before = `${LAYOUT}${CELL}`;
 if (ar < 0.9) {
 LAYOUT = 'tall';
 const w = innerWidth >= 600 ? 640 : 480;
 STAGE = { w, h: clamp(Math.round(w / ar), Math.round(w * 1.3), Math.round(w * 2.3)) };
 CELL = w === 480 ? 36 : 44;
 } else {
 LAYOUT = 'wide';
 STAGE = { w: 1280, h: clamp(Math.round(1280 / ar), 740, 960) };
 CELL = 40;
 }
 scale = Math.min(innerWidth / STAGE.w, innerHeight / STAGE.h);
 const st = $('#stage');
 st.style.width = `${STAGE.w}px`; st.style.height = `${STAGE.h}px`;
 st.style.transform = `scale(${scale})`;
 st.style.left = `${(innerWidth - STAGE.w * scale) / 2}px`;
 st.style.top = `${(innerHeight - STAGE.h * scale) / 2}px`;
 document.body.classList.toggle('tall', LAYOUT === 'tall');
 document.body.classList.toggle('wide', LAYOUT === 'wide');
  // 手机横过来时字太小：提醒竖着拿
 const hint = LAYOUT === 'wide' && innerHeight < 500 && 'ontouchstart' in window;
 let h = $('.rotate-hint');
 if (hint && !h) document.body.insertAdjacentHTML('beforeend', '<div class="rotate-hint">세로 화면이 더 좋다</div>');
 else if (!hint && h) h.remove();
 if (S && !$('#game').classList.contains('hidden')) before !== `${LAYOUT}${CELL}` ? renderAll() : layoutDock();
}

function toast(text, cls = '') {
 const el = $('#toast');
 el.className = `show ${cls}`;
 el.innerHTML = text;
 clearTimeout(toastTimer);
 toastTimer = setTimeout(() => { el.className = ''; }, 2600);
}

// ───────────── 物品与格子 ─────────────

function itemTags(it) {
 const tags = [];
 if (ITEMS[it.id].contra) tags.push(['contra', '선문 금물']);
 if (ITEMS[it.id].illicit) tags.push(['stolen', '마종 금약']);
 if (lacedKnown(it)) tags.push(['laced', it.lacedBy === 'me' ? `몰래${LACE[it.laced].verb}` : `남에게${LACE[it.laced].verb} (걸러냈다)`]);
 if (it.mark) tags.push(['stolen', markVisible(it) ? `원주인의 낙인 · ${cn(it.mark.str)}중` : '남은 신식이 있는 듯하다, 제대로 보이지 않는다']);
 if (it.sealed) tags.push(['laced', `정파 봉인을 붙임 · 솜씨${GRADE_NAMES[it.grade]}`]);
 if (it.bottled) tags.push(['real', '옥정병에 담음']);
 if (restoreOf(seemOf(it))) { const r = restoreOf(seemOf(it)); tags.push(['', `복용 가능: ${r[0] ? `체력+${r[0]} ` : ''}${r[1] ? `정신+${r[1]}` : ''}`]); }
 const cures = Object.entries(CONDS).filter(([, C]) => C.cure.includes(bodyOf(seemOf(it)).id)).map(([, C]) => C.name);
 if (cures.length && it.id !== 'water') tags.push(['', `치료: ${cures.join(' · ')} · ${CURE_TEXT[cureGrades(it)]}`]);
 if (it.forged) tags.push(['laced', `네가 만든 ${it.fake ? '위작' : '하급을 상급으로'} · ${GRADE_NAMES[it.grade]}`]);
 else if (isDressed(it) && knownFlaw(it)) tags.push(['fake', `하급을 상급으로 · 솜씨${GRADE_NAMES[it.grade]}`]);
 else if (dressable(it) && it.seen != null) tags.push(['', `검품함(${LENS_NAMES[it.seen]})`]);
 if (it.fake && knownFlaw(it) && it.grade && !it.forged) tags.push(['', `만듦새 ${GRADE_NAMES[it.grade]}`]);
 if (ITEMS[it.id].additive) tags.push(['laced', `재료로 사용: ${LACE[ITEMS[it.id].additive].name}`]);
 if ((ITEMS[it.id].war || 0) >= 0.5) tags.push(['', '전비']);
 if (it.stolen > 0) tags.push(['stolen', `출처 불명 · 남은 ${it.stolen}일`]);
 if (it.revealed) tags.push(['fake', '위작(간파됨)']);
 else if (it.verdict === 'fake') tags.push(['fake', '네가 위작으로 판정했다']);
 else if (it.verdict === 'real') tags.push(['real', '네가 진품으로 판정했다']);
 else if (ITEMS[it.id].appraise) tags.push(['', '미감정']);
 return tags;
}

function itemStats(it) {
 const rows = [];
 if (hasQuality(it)) {
 if (isDressed(it) && knownFlaw(it)) rows.push(['겉면 품질', `${qualityName(it.sq)} · ${it.sq}`], ['실제 품질', `${qualityName(it.q)} · ${it.q}`]);
 else rows.push(['품질', `${qualityName(shownQ(it))} · ${shownQ(it)}`]);
 }
 if (ITEMS[it.id].tool) rows.push(['감정술', `제${cn(ITEMS[it.id].tool)}중`]);
 if (ITEMS[it.id].book) { const b = ITEMS[it.id].book; rows.push(['현재 경지', `${TECHS[b.tech].name} 제${cn(techLv(b.tech) || 0) || '0'}중`]); }
 if (it.id === 'water') rows.push(['순도', `${it.purity}%`]);
 if (it.id === 'gu') rows.push(['성장', `${it.growth}/100`], ['독성', it.tox], ...(it.eat ? [['삼킴', `${it.eat}마리`]] : []), ['진화', guNext(it)]);
 if (it.id === 'gu_egg' || it.id === 'gu_venom') rows.push(['독성', it.tox]);
 if (it.id === 'spirit_crystal') rows.push(['충전', `${it.charge || 0}/${CRYSTAL_CAP}`]);
 if (isSeed(it) && it.growth) rows.push(['생장', `${it.growth}%`]);
 if (it.id === 'corpse') rows.push(['신선', `앞으로 ${Math.max(0, Math.ceil(it.fresh / seasonOf().rot))}일 보관 가능`]);
 if (it.cost != null) rows.push(['매입가', `${it.cost}`]);
 return rows;
}

function itemTip(it) {
 const d = ITEMS[it.id];
 const v = Math.round(knownValue(it) * priceMul(it.id));
 return `<h4>${esc(itemName(it))}</h4>
 <div class="tip-sub">${CATS[d.cat]} · ${d.w}×${d.h}</div>
 ${pileLine(it)}
 <div class="tip-val">추정가 ${stoneTxt(v)}${Math.abs(priceMul(it.id) - 1) > 0.005 ? `<span class="${priceMul(it.id) > 1 ? 'good' : 'bad'}">시세 ×${priceMul(it.id).toFixed(2)}</span>` : ''}</div>
 ${priceBreakdown(it.id).map(([k, x]) => `<div class="tip-row small muted"><span>· ${k}</span><span>${x > 0 ? '+' : ''}${Math.round(x * 100)}%</span></div>`).join('')}
 ${itemStats(it).map(([k, val]) => `<div class="tip-row"><span>${k}</span><span>${val}</span></div>`).join('')}
 <div class="tags">${itemTags(it).map(([c, t]) => `<span class="tag ${c}">${t}</span>`).join('')}</div>
 <p>${esc(it.info ? it.info.text : d.desc)}</p>`;
}

// 一摞사료：几份、各是什么品相或독성——叠在一起，每份仍记着自己的
function pileLine(it) {
 const pile = stackOf(it);
 if (pile.length < 2) return '';
 const each = pile.map(o => hasQuality(o) ? qualityName(o.q) : o.tox != null ? `독 ${o.tox}` : '').filter(Boolean);
 const kinds = Object.entries(each.reduce((c, k) => (c[k] = (c[k] || 0) + 1, c), {})).map(([k, n]) => `${k}${n > 1 ? `×${n}` : ''}`);
 return `<div class="tip-row small"><span>이 칸에 겹쳐 있다 ${pile.length}개</span><span>${kinds.join(' · ')}</span></div>`;
}

function itemHTML(it, extraCls = '', attrs = '') {
 const d = ITEMS[it.id];
 const badges = [];
 if (ITEMS[it.id].contra) badges.push(`<img class="badge b-tr" src="${asset('ui', 'ic_contraband')}" alt="">`);
 if (it.stolen > 0) badges.push(`<img class="badge b-tl" src="${asset('ui', 'ic_stolen')}" alt="">`);
 if (it.mark && markVisible(it)) badges.push(`<img class="badge b-bl" src="${asset('ui', 'ic_mark')}" alt="">`);
 if (it.sealed) badges.push(`<img class="badge b-br" src="${asset('ui', 'ic_seal')}" alt="">`);
 if (it.revealed || it.verdict === 'fake' || (it.forged && it.fake)) badges.push(`<span class="stamp">위</span>`);
 else if (isDressed(it) && knownFlaw(it)) badges.push(`<span class="stamp dressed">하</span>`);
 if (it.id === 'water') badges.push(`<span class="num">${Math.floor(it.purity)}%</span>`);
 if (it.id === 'gu' && it.growth < 100) badges.push(`<span class="bar"><i style="width:${it.growth}%"></i></span>`);
 if (isSeed(it) && it.growth) badges.push(`<span class="bar"><i style="width:${it.growth}%"></i></span>`);
 if (it.id === 'corpse') badges.push(`<span class="bar rot"><i style="width:${clamp(it.fresh / 6 * 100, 0, 100)}%"></i></span>`);
 if (lacedKnown(it)) badges.push(`<span class="laced-dot" title="${LACE[it.laced].verb}"></span>`);
 if (it.id === 'spirit_crystal') badges.push(`<span class="bar power"><i style="width:${(it.charge || 0) / CRYSTAL_CAP * 100}%"></i></span>`);
 const pile = stackOf(it).length;
 if (pile > 1) badges.push(`<span class="stack-n">×${pile}</span>`);
 if (hasQuality(it) && it.q >= 85) extraCls += ' q-top';
 const style = it.pos && !extraCls.includes('preview') ? `left:${it.pos.x * CELL}px;top:${it.pos.y * CELL}px;` : 'position:relative;';
 return `<div class="item ${sel === it.uid ? 'sel' : ''} ${extraCls}" data-uid="${it.uid}" ${attrs}
 style="${style}width:${d.w * CELL}px;height:${d.h * CELL}px">
 <span class="fallback">${esc(itemName(it))}</span>
 <img src="${asset('items', itemIcon(it))}" alt="" draggable="false" onerror="this.previousElementSibling.style.display='flex'">${badges.join('')}</div>`;
}

function gridHTML(gid, label, cls = '') {
 const g = S.grids[gid];
 if (!g) return '';
 return `<div class="grid-wrap ${cls}">${label ? `<div class="grid-label">${label}</div>` : ''}
 <div class="grid" data-gid="${gid}" style="width:${g.w * CELL}px;height:${g.h * CELL}px;background-size:${CELL}px ${CELL}px">
 ${pileTops(gid).map(it => gid !== 'counter' ? itemHTML(it) : itemHTML(it, `locked ${counterCls(it)}`, tradeCustomer() ? 'data-act="good"' : '')).join('')}</div></div>`;
}

// 사료格里叠成一摞的，只画最上面那件：선택됨的那件，否则最后放上去的那件；拖走的也是它
function pileTops(gid) {
 const list = itemsIn(gid);
 if (!stackCap(gid)) return list;
 const top = {};
 for (const it of list) { const k = `${it.pos.x},${it.pos.y}`; if (!top[k] || top[k].uid !== sel) top[k] = it; }
 return Object.values(top);
}

const tradeCustomer = () => S.customer && ['sell', 'buy'].includes(S.customer.kind);
function counterCls(it) {
 const c = S.customer;
 if (!tradeCustomer()) return '';
 return `${c.item === it.uid ? 'focus' : ''} ${(c.take || []).includes(it.uid) ? 'take' : ''}`;
}

// ───────────── 顶栏 ─────────────

const PHASE_NAME = { morning: '아침 · 개점 전', day: '낮 · 영업 중', night: '밤 · 마감함' };

function renderTopbar() {
 const due = S.grace > 0 ? `<span class="bad">임대료 체납 ${S.rentOwed} · 유예 ${S.grace}일</span>`
 : `임대료 ${rentAmount()} · 제 ${S.rentDue}일(${S.rentDue - S.day}일 뒤)`;
 const plan = powerPlan();
 const deedP = clamp(S.stones / deedPrice() * 100, 0, 100);
 $('#topbar').innerHTML = `
 <div class="tb-day" title="${calendar().yearText}">${icon(S.phase === 'night' ? 'ic_night' : 'ic_day')}<b>제 ${S.day}일</b>
 <span class="tb-cal">${calendar().text}${annualOf() ? ` · <em>${annualOf().name}</em>` : ''}<br>${PHASE_NAME[S.phase]}</span></div>
 ${S.plan && S.plan.inspect && S.plan.tipped && S.plan.day === S.day ? `<div class="tb-cell tipchip" title="${esc(S.plan.tipped)}전해 들은 소문">${icon('ic_heat')}오늘 순찰</div>` : ''}
 <div class="tb-cell dao" data-act="dao" title="수련: 단약과 혼백을 복용한다. 경지 돌파에는 열쇠가 필요하다. 눌러서 본다">${icon('ic_dao')}<span>${realmName()}<br><small>${realm().need ? `${S.cult.xp}/${realm().need}` : '원만'}</small></span></div>
 ${S.fate && (S.fate.n || S.fate.debts.length || S.fate.infamy) ? `<div class="tb-cell fate" data-act="fate-open" title="인과: 눌러서 빚을 본다">업<b>${S.fate.debts.length}</b>${S.fate.infamy ? `<small>악명${S.fate.infamy}</small>` : ''}</div>` : ''}
 <div class="tb-cell" title="선명 ${S.virtue}: 좋은 사람 노릇에 돈이 든다, 선명이 지나치면 호구로 여겨진다. 하지만 네가 도운 사람은, 가끔 돌아와 보답한다">선<b>${VIRTUE_NAME(S.virtue)}</b></div>
 ${condList('me').map(c => CONDS[c.kind] ? `<div class="tb-cell cond" data-act="heal-open" title="${esc(CONDS[c.kind].desc)}눌러 치료를 구함">${c.label}</div>`
 : `<div class="tb-cell cond" title="체력이나 정신이 바닥나면 겨루기와 몸싸움에서 손해를 본다, 거짓말이 들통나기 쉽다">${c.label}</div>`).join('')}
 <div class="tb-cell power" title="잡역 구역에서 네 세력: ${powerParts().map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ')}">세 <b>${playerPower()}</b></div>
 <div class="tb-cell war st${S.world.stage}" title="사방이 긴장한다 ${tension()}: ${warStage().text}">${icon('ic_war')}<span>${warStage().name}</span></div>
 <div class="tb-cell big">${stoneTxt(S.stones)}</div>
 <div class="tb-cell vit" title="체력: 운반, 뒤지기, 화로 열기에는 힘이 필요하다">${icon('ic_stamina')}<span class="meter st"><i style="width:${S.vit.st}%"></i></span><span>${S.vit.st}</span></div>
 <div class="tb-cell vit" title="정신: 감정, 탐사, 부적 그리기, 단약 제련, 흥정은 모두 정신을 소모한다">${icon('ic_spirit')}<span class="meter sp"><i style="width:${S.vit.sp}%"></i></span><span>${S.vit.sp}</span></div>
 <div class="tb-cell rent">${icon('ic_ledger')}<span>${due}</span></div>

 <div class="tb-cell heat" title="집법당 주목: 높을수록 순찰받기 쉽다. 백이 차면 체포된다">${icon('ic_heat')}
 <span class="meter"><i style="width:${S.heat}%"></i></span><span>${S.heat}</span></div>
 <div class="tb-cell" title="가게 문서 ${deedPrice()} 영석">${icon('ic_deed')}<span class="meter gold"><i style="width:${deedP}%"></i></span></div>
 <div class="tb-spacer"></div>
 <button class="btn small ghost" data-act="menu">문서</button>`;
}

// ───────────── 场景与카운터 ─────────────

function speechFor(c) {
 if (!c) {
 if (S.phase === 'morning') return `아침 종이 세 번 울렸다. ${todayText()}${S.market.text}${tipText()}`;
 if (S.phase === 'night') return '핏빛 달이 떠오른 밤, 잡역 구역에 등롱 몇 개만 남았다. 잡동사니를 주우러 갈까, 일찍 쉴까?';
    // 门口自有“请下一位”的牌子，人走光了才提醒去点마감牌
 return S.queue.length ? '' : `오늘의 손님은 다 갔다. ${LAYOUT === 'tall' ? '왼쪽의 「마감」' : '문의 마감 패를 누른다'}, 설령 마감해도. `;
 }
 const it = customerItem();
 const sig = [c.kind, c.told, c.afterAppraisal, it && it.disputed].join('|');
 if (c.lineSig !== sig) { c.line = speechAs(personOf(c), composeLine(c)); c.lineSig = sig; }
 return c.line;
}

// 开铺前收到的巡查风声：原先写在카운터窗口里，现在由晨间独白说出来
function tipText() {
 if (!(S.plan && S.plan.inspect && S.plan.tipped && S.plan.day === S.day)) return '';
 const banned = bannedShown();
 return `${S.plan.tipped}전갈이 왔다: 오늘 집법당이 순찰을 온다(${S.plan.reason}). ${banned.length ? `진열장에 아직 놓여 있다${banned.map(itemName).join(' · ')}!` : ''}문을 열기 전에 금물과 장물을 치워 암격에 숨긴다.`;
}

function composeLine(c) {
 const it = customerItem(), f = c.faction, addr = ADDRESS[f];
 const brought = c.kind === 'buy' && goodsOf().length ? `그리고 이 ${goodsOf().map(itemName).join(' · ')}도 팔고 싶어한다.` : '';
 const peek = c.reporting ? ` (${ta(personOf(c))}네 진열장을 한참 노려보았다, 표정이 좀 이상하다.)` : '';
 if (c.kind === 'inspect') return '집법당 순찰이다! 카운터 안팎이, 전부 열어라. ';
 if (c.kind === 'story') return ` (${c.name}할 말이 있는 듯하다.)`;
 if (c.refuse) return voice(f, 'refuse');
 if (c.offended) return '네 진열장에 우리 일족의 요단, 요피를 내놨다고? 쳇! 이런 가게, 들어오지 않아도 된다. ';
 if (c.kind === 'plea') return greeting(c) + pleaLine(c);
 if (c.kind === 'sell' && it) {
 if (c.afterAppraisal) return c.told === 'fake' ? `위작이라니, 둬봤자 자리만 차지한다. ${it.ask} 영석, ${addr} 받아주시오.`
 : `진품이라니…… ${it.ask} 영석, ${addr} 사시겠소?`;
 if (it.disputed === 'ok') return `아? ……됐다 됐어, 이 ${itemName(it)} ${it.ask} 영석, ${addr} 받아주시오.`;
 if (it.disputed === 'caught') return `그딴 소리 마! 내 ${itemName(it)} 제대로 된 물건이다. ${it.ask} 영석, 한 푼도 깎을 수 없다.`;
 const goods = goodsOf();
 const vars = { item: goods.map(itemName).join(' · '), ask: goods.reduce((s, g) => s + g.ask, 0) };
 let line = goods.some(g => ITEMS[g.id].contra) ? voice(f, 'contra', vars) : lineOf(c, 'sell', vars);
 if (goods.some(g => g.stolen)) line += voice(f, 'stolen');
 if (c.wantId) line += `겸사겸사…… ${ITEMS[c.wantId].name}이 있다면, 나도 ${needCn(c.need || 1)}${needUnit(c)} 필요하오.`;
 return peek + greeting(c) + line;
 }
 if (c.noble) return nobleLine(c);
 if (c.craving) return gx(personOf(c), voice(f, 'crave') + needLine(c));
 if (c.wishId) return greeting(c) + voice(f, c.wishSeen ? 'wish' : 'wishAsk', { item: ITEMS[c.wishId].name });
 if (c.forGift) return greeting(c) + ` (목소리를 낮춰)${addr}, 제가 한 부 준비하겠소${CATS[c.wantCat]}선물한다. 진짜일 필요는 없다 - 충분히 그럴듯하기만 하면, 받는 사람이 모르면 그만이다. 값이야, 당연히 진품 값으로 칠 수 없다. `;
 if (c.wantFake) return greeting(c) + ` (목소리를 낮춰)${addr}, 지난번 그런 “좋은 물건” 또 있나? 진짜처럼 보이는 그런 거 말이야. `;
 if (c.kind === 'buy') return peek + greeting(c) + lineOf(c, c.attracted ? 'attracted' : 'buy', { cat: c.wantId ? ITEMS[c.wantId].name : CATS[c.wantCat] }) + needLine(c) + brought;
 return greeting(c) + voice(f, 'appraise', { item: itemName(it), fee: c.fee });
}

// 掌柜视角：隔着自家카운터望向店门与街面。来客从门口走进来，有的只站在门口、门外
let shown = null; // 지금 자리에 있는 손님: { key, src, stage }
// 刚送走、脸上还带着神情的来客：弹窗开着就一直留在카운터前，弹窗关了再停一会儿才转身走——不然神情갈아 끼운다的那一刻正被弹窗挡着
let parting = null;
const PART_MS = 1300;

const visitorKey = c => c.pid || c.key || c.name;
const sceneArt = name => ART_SET.has(`scene/${name}`);

function renderScene() {
 const c = S.customer;
 const night = S.phase === 'night';
 const front = sceneArt('shop_front');
 $('#scene .bg').src = night ? asset('scene', 'night_street') : front ? asset('scene', 'shop_front') : asset('scene', 'shop_back');
 $('#scene .fg').src = front ? asset('scene', 'counter_top') : asset('scene', 'shop_counter');
 $('#scene .fg').style.display = night ? 'none' : '';
 $('#scene').classList.toggle('realistic', front);
 $('#scene').classList.toggle('night', night);
 const p = $('#portrait');
 if (night || (c && parting && parting.c !== c)) parting = null;
 if (parting && !parting.until && !$('#modal-layer').classList.contains('on')) {
 parting.until = Date.now() + PART_MS;
 setTimeout(renderScene, PART_MS + 20);
 }
 if (parting && parting.until && Date.now() >= parting.until) parting = null;
 const v = c || (parting && parting.c);
 if (v && v.portrait) {
 const src = asset('chars', portraitOf(v)), key = visitorKey(v), st = stageOf(v);
 if (!shown || shown.key !== key) {
      // 新来的：先出现在门口，再走到该站的地方
 p.className = 'st-door arriving';
 p.src = src;
 void p.offsetWidth;
 p.className = `st-${st}`;
 } else {
 if (!p.src.endsWith(src)) p.src = src;
 p.className = `st-${st}`;
 }
 p.style.display = '';
 shown = { key, src, stage: st };
 } else if (shown) {
    // 손님을 보낸다：转身走回门口，消失在街上
 p.className = 'st-door leaving';
 shown = null;
 setTimeout(() => { if (!shown) p.style.display = 'none'; }, 650);
 } else p.style.display = 'none';
  // 门外候着的人：下两位来客的暗影
 const waiting = S.phase === 'day' ? S.queue.slice(0, 2).filter(q => q.portrait) : [];
 $('#crowd').innerHTML = waiting.map((q, i) => `<img class="w${i}" src="${asset('chars', `${q.portrait}~neutral`)}" alt="">`).join('');
 const f = c ? FACTIONS[c.faction] : null;
 $('#nameplate').innerHTML = c ? `${icon(f.icon)}<b>${esc(c.name)}</b><span>${f.name} · ${esc(c.title || '')}</span>
 ${c.wanted ? `<span class="tag stolen">수배 · 상금 ${c.wanted}</span>` : ''}
 ${c.attracted ? `<span class="tag real">진열을 보고 왔다</span>` : ''}
 ${c.savvy != null && c.kind !== 'story' ? `<span class="tag">안색·${demeanor(c)}</span>` : ''}
 ${personTags(c)}` : '';
 $('#nameplate').style.display = c ? '' : 'none';
 renderSpeech(speechFor(c));
  // 点门口문을 열고 손님을 맞는다、请下一位；门上的마감牌白天点得动，客人走光了就亮一亮
 const door = $('#door'), act = S.phase === 'morning' ? 'open' : S.phase === 'day' && !c && S.queue.length ? 'next' : '';
 door.style.display = act ? '' : 'none';
 door.dataset.act = act;
 door.firstChild.textContent = act === 'open' ? '문을 열고 손님을 맞는다' : `다음 손님 · 문 밖 ${S.queue.length}명`;
 const sign = $('#closesign');
 sign.style.display = S.phase === 'day' ? '' : 'none';
 sign.classList.toggle('due', !c && !S.queue.length);
}

// 竖屏이라면按字幕显示：长了就分段，点一下看下一段；换了一句话从头开始
let talk = { text: '', i: 0 };

function speechParts(text) {
 if (LAYOUT !== 'tall' || !text) return text ? [text] : [];
 const max = Math.max(24, Math.floor(($('#scene').clientWidth - 112) / 18) * 2 - 1); // 18px 글자 두 줄, 끝에 한 칸을 남긴다 ▼
 const out = [];
 const bits = text.match(/[^. ! ? !?…]+(?:[. ! ? !?…]+[」”’) )]*)?/g) || [text];
 bits.flatMap(b => b.length > max ? b.match(/[^, · ; ]+[, · ; ]?/g) : [b]).forEach(b => {
 if (out.length && out[out.length - 1].length + b.length <= max) out[out.length - 1] += b;
 else out.push(b);
 });
 return out;
}

// 对白里的要紧字眼：货名、品类与数目，长的先配
let kwRe = null;
function keywords(html) {
 if (!kwRe) {
 const names = [...new Set([...Object.values(ITEMS).map(d => d.name), ...Object.values(CATS)])].filter(Boolean)
 .sort((a, b) => b.length - a.length).map(n => esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
 kwRe = new RegExp(`${names.join('|')}|\\d+(?:[–-]\\d+)?(?:\\s?영석)?`, 'g');
 }
 return html.replace(kwRe, m => `<b class="kw">${m}</b>`);
}

function renderSpeech(text) {
 if (talk.text !== text) talk = { text, i: 0 };
 const parts = speechParts(text), sp = $('#speech');
 talk.i = Math.min(talk.i, Math.max(0, parts.length - 1));
 const more = talk.i < parts.length - 1;
 sp.innerHTML = parts.length ? keywords(esc(parts[talk.i])) + (more ? '<i class="more">▼</i>' : '') : '';
 if (more) sp.dataset.act = 'speech-more'; else delete sp.dataset.act;
}

function personTags(c) {
 const p = personOf(c);
 if (!p) return '';
 const m = mood(p.aff);
 return `<span class="tag mood-${m}" title="호감 ${p.aff}">${MOOD_NAME[m]}</span>${p.visits > 1 ? `<span class="tag">${p.visits}번째 방문</span>` : '<span class="tag">첫 만남</span>'}`;
}

function patienceHTML(c) {
 return `<span class="patience" title="인내">${'●'.repeat(Math.max(0, c.patience))}${'○'.repeat(Math.max(0, 4 - c.patience))}</span>`;
}

function renderCounter() {
 const el = $('#counter-panel');
 const c = S.customer;
  // 开铺前、카운터前没人时不占窗口：开门、请客、마감都点画面里的门口与牌子
 if (S.phase === 'morning' || (S.phase === 'day' && !c)) { el.innerHTML = ''; return; }
 if (S.phase === 'night') {
 el.innerHTML = `<div class="cp-col wide">
 <h3>밤</h3>
 <p>설비는 네가 입정하는 동안 작동한다, 「작업장」 페이지 순서로 영력을 쓴다, 네 체력과 정신도 소모된다 - 기력이 모자라면 설비가 멈춘다. 쉬면 회복된다. </p>
 <p class="muted small">${S.scavenged ? '오늘 밤은 이미 나갔다.' : `오늘 밤 한 번 외출할 수 있다: 폐품 줍기(뒤질 때마다 ${costText('dig')}), 아니면 귀시로 간다(${costText('market')}${isGhostNight() ? ', 오늘 밤 귀시가 열린다. 물건이 많고 집법당을 건드리지 않는다' : ', 귀시가 아닌 밤, 집법당 주목 +2'}). `}
 ${S.retreat ? '<b class="good">오늘 밤 폐관한다: </b>모든 화로의 산출이 더 좋아진다, 지화로로는 신병 배료를 제련할 수 있다. 쉬면 조금 회복된다. ' : `폐관 (${costText('retreat')}) : 오늘 밤 직접 화로를 지킨다. `}</p>
 </div>
 <div class="cp-actions">
 <button class="btn" data-act="scavenge" ${S.scavenged ? 'disabled' : ''}>${icon('ic_scavenge')}밖에 나가 폐품을 줍는다</button>
 <button class="btn" data-act="market" ${S.scavenged ? 'disabled' : ''}>귀시${isGhostNight() ? '(개장)' : ''}</button>
 <button class="btn ${S.retreat ? 'danger' : ''}" data-act="retreat">${S.retreat ? '폐관을 취소한다' : '폐관'}</button>
 <button class="btn primary big" data-act="sleep">입정하며 쉰다</button></div>`;
 return;
 }
 const f = FACTIONS[c.faction];
 let mid = '', acts = '';
 const pp = personOf(c), secretKnown = pp && pp.secret && pp.secret.known && pp.status === 'alive';
 const intel = !pp || pp.story || pp.official || ['story', 'inspect'].includes(c.kind) ? ''
 : secretKnown ? `<div class="intel">${icon('ic_secret')}<b>${esc(pp.secret.type)}</b>${c.confided ? ` (${ta(pp)}스스로 너에게 털어놓은 것)` : ''}——
 ${CHANNEL_NAME[pp.secret.to]}에 신고하면 상금 약 ${pp.secret.bounty}, ${FACTIONS[pp.secret.to].name} 공훈 ${pp.secret.merit}${channelOpen(pp.secret.to) ? '' : `(아직 연줄이 없다: ${channelHint(pp.secret.to)})`}
 ${c.reportedSecret ? `<span class="intel-acts muted small">몰래 소식을 전했다. ${ta(pp)}이(가) 나가기를 기다린다</span>` : `<span class="intel-acts"><button class="btn tiny danger" data-act="secret-report" title="${esc(sinHint(['betray', 2]))}" ${channelOpen(pp.secret.to) ? '' : 'disabled'}>신고</button>
 <button class="btn tiny" data-act="secret-blackmail" title="${esc(sinHint(['betray', 2]))}">협박한다 ${Math.round(Math.min(0.95, overpowerOdds(pp) + 0.1) * 100)}%</button>
 ${pp.owes ? `<span class="muted small">${ta(pp)}너에게 인정을 빚졌다</span>` : '<button class="btn tiny" data-act="secret-keep">입을 다문다</button>'}</span>`}</div>`
 : !c.probed && !pp.cleared ? `<div class="intel muted small">${icon('ic_secret')}<button class="btn tiny" data-act="probe" title="${costText('probe')}, 간파 약 ${Math.round(probeOdds(pp) * 100)}%">신식 탐지 ${Math.round(probeOdds(pp) * 100)}%</button></div>` : '';
 const dark = pp && !pp.story && ['sell', 'buy', 'plea'].includes(c.kind) && !c.refuse && killable(pp) ? `<div class="intel small">
 ${icon('ic_dao')}<span class="muted">${esc(c.name)}은(는) ${realmName(npcLevel(pp))}, 너는 ${realmName()}이다.</span>
 <button class="btn tiny danger" data-act="kill" ${canKill(pp) ? `disabled title="${esc(canKill(pp))}"` : `title="성공 확률 ${pct(killOdds(pp, false))}, ${costText('kill')}${deathWarn('injured')}"`}>문 닫고 개 패기${canKill(pp) ? '' : ` ${pct(killOdds(pp, false))}`}</button>
 ${canSoulMark(pp) ? '' : `<button class="btn tiny danger" data-act="soulmark">혼인 심기 ${pct(soulMarkOdds(pp))}</button>`}</div>` : '';
 if (c.kind === 'story') {
 const node = storyNode(S.story[c.key]);
 mid = `${customerItem() ? `<div class="cp-item">${gridHTML('counter', '카운터')}<div>` : '<div>'}
 <p><b>${esc(c.name)}</b> 할 말이 있다.</p><p class="muted">${esc(S.story[c.key].summary || '')}</p></div>${customerItem() ? '</div>' : ''}`;
 acts = `<button class="btn primary" data-act="story-talk">대화</button>`;
 } else if (c.refuse) {
 const p = personOf(c);
 mid = `<p>${esc(c.name)}이(가) 너를 기억한다:</p><p class="muted">“${esc((salientMemory(p) || p.mem[p.mem.length - 1] || { t: '……' }).t)}”</p>
 <p class="muted small">호감이 이 지경까지 떨어지면, 상대가 더 이상 너와 거래하지 않으려 한다. </p>`;
 acts = `<button class="btn primary" data-act="dismiss">손님을 보낸다</button>`;
 } else if (c.kind === 'inspect') {
 const e = official('enforcer'), stake = inspectionStake(), price = bribePrice(e, stake);
 const tiers = [...new Set([0.6, 1, 1.6].map(k => Math.max(10, Math.round(price * k / 10) * 10)))];
 mid = `<p>${esc(e.name)}진열장, 창고, 바닥, 노점을 뒤진다. <b>금물</b> · <b>금약</b>과 <b>출처 불명</b>의 물건은 발견되면 몰수에 벌금이다. 암격 속 물건은 찾지 못한다. </p>
 <p class="muted small">그는 너에게서 약 ${stake} 영석의 기름. 규정에도 값이 있다: 충분히 주면, 아무것도 못 본 걸로 한다. 적게 주면, 그는 모욕을 받았다고 느낀다. 
 ${S.flags.enforcerOwned ? '<b class="good">그는 네 사람이다. </b>' : ''}</p>`;
 acts = `<button class="btn primary" data-act="inspect">수사에 협조</button>
 ${tiers.map(n => `<button class="btn small" data-act="bribe" data-n="${n}" ${S.stones < n ? 'disabled' : ''}>손을 씀 ${n}<small>&nbsp;성공 확률 ${Math.round((S.flags.enforcerOwned ? 1 : bribeOdds(e, stake, n)) * 100)}%</small></button>`).join('')}`;
 } else if (c.offended) {
 mid = `<p>${f.name}손님이 진열장의 요족 유물을 본다, 소매를 뿌리며 떠난다. <span class="bad">요족 평판 -3</span></p>`;
 acts = `<button class="btn primary" data-act="dismiss">손님을 보낸다</button>`;
 } else if (c.kind === 'plea') {
 ({ mid, acts } = pleaPanel(c));
 } else if (c.kind === 'sell' || c.kind === 'buy') {
 ({ mid, acts } = tradePanel(c));
 } else {
 mid = `<div class="cp-item">${gridHTML('counter', '카운터')}
 <div><p>감정 의뢰, 수고비 ${stoneTxt(c.fee)}</p><p class="muted">진위를 확인한 뒤 ${ta(personOf(c))}에게 무엇을 말할지는 네가 정한다. 사실대로 말하면 평판을 얻는다;
 진품을 위작이라 한다, 상대는 대개 헐값에 넘긴다 - 하지만 영리한 사람은 속이지 못할 수 있다, 그 자리에서 들통나면 평판이 깎인다, 뒤에 옛 일을 들춰낼 수도 있다. </p></div></div>`;
 acts = `<button class="btn primary" data-act="appraise-commission">${icon('ic_appraise')}조요경으로 감정한다</button>
 <button class="btn ghost" data-act="dismiss">정중히 거절</button>`;
 }
 el.innerHTML = `<div class="cp-col wide">${mid}${intel}${dark}</div><div class="cp-actions">${acts}</div>`;
}

// 求助：구제한다、放贷、고역으로 부린다，或者쫓아낸다
function pleaPanel(c) {
 const amt = c.need * 3, TA = ta(personOf(c));
 const mid = gx(personOf(c), `<p>${esc(c.name)}부탁해: ${esc(c.plea)}. </p>
 <p class="small muted">그를 구제하면, 그가 너를 기억한다. 앞으로 길가에서 소문을 들어주마 - 이 세상, 호의는 대개 돌아오지 않지만, 가끔은 목숨 하나를 건진다.
 돈놀이 이자가 후하다, 못 갚으면 네가 처분한다. 고역으로 부린다, 그가 너를 위해 화로를 때고 물건을 나른다, 죽을 때까지 일한다. </p>`);
 const acts = `<button class="btn small" data-act="plea-help" ${S.stones < c.need ? 'disabled' : ''}>구제한다 ${c.need}</button>
 <button class="btn small" data-act="plea-lend" ${S.stones < amt ? 'disabled' : ''} title="이레 뒤 ${Math.round(amt * 1.5)} 상환">${TA}에게 ${amt} 빌려준다</button>
 <button class="btn small danger" data-act="plea-labor">고역으로 부린다</button>
 <button class="btn ghost small" data-act="plea-away">쫓아낸다</button>`;
 return { mid, acts };
}

// 修为：복용 제련、破境、杀伐的规矩
// 面上看得出的药力：흠을 찾지 못한다的위작、하급을 상급으로的，照它装出来的样子算；吃下去才见真章（见 bodyOf、potency）
const seemOf = it => knownFlaw(it) || !(it.fake || isDressed(it)) ? it : Object.assign({}, it, { fake: false, q: it.sq != null ? it.sq : it.q });

function openDao() {
 const r = realm(), why = canBreak();
 const goods = Object.values(S.items).filter(it => HELD(it) && cultXp(seemOf(it))).sort((a, b) => cultXp(seemOf(b)) - cultXp(seemOf(a)));
 openModal(() => { const pg = pager(goods.filter(it => S.items[it.uid]), 6, 'dao'); modalHTML(`<h3>${icon('ic_dao')}수위 · ${realmName()}</h3>
 <p>${r.need ? `수위 <b>${S.cult.xp}</b> / ${r.need}, ${realmName(S.cult.lv + 1)}(으)로 돌파하려면 <b>${ITEMS[r.key].name}</b> 하나가 더 필요하다열쇠로 쓴다. 성공 확률 약 ${pct(breakOdds())}${S.retreat ? '(오늘 밤 폐관, 15% 추가)' : '(밤에 폐관하면 돌파가 더 안정된다)'}. ` : '너는 이 세계의 끝에 이르렀다.'}</p>
 <p class="small muted">경지가 높을수록, 세력이 클수록 밤에 더 회복하고 거짓말이 덜 들통난다. 수련이 상대보다 높으면, 카운터에서 “문 닫고 개 패기”를 하거나 밤에 길을 가로막아 죽일 수 있다, 그의 물건, 영석, 시신, 혼백을 빼앗는다. 수련 위압이나 혼인을 심어 사람을 복종시킬 수도 있다. 
 혼을 삼키고 피를 마셔도 수련이 오른다, 다만 제련할수록 사람 같지 않아진다. </p>
 <div class="gift-list">${pg.items.map(it => `<div class="gift-row" data-act="cultivate" data-uid="${it.uid}">${itemHTML(Object.assign({}, it, { pos: null }), 'preview mini')}
 <span>${esc(itemName(it))}${it.id === r.key ? '<em class="laced-txt">(경지 돌파의 물건)</em>' : ''}</span><span class="good">수위 +${cultXp(seemOf(it))}</span>${(CULT_XP[it.id] || [])[1] ? '<span class="bad small">음덕 손상</span>' : ''}</div>`).join('') || '<p class="muted">손에 복용할 만한 것이 없다: 단약, 혼백, 요단, 정혈, 경장옥로……</p>'}</div>${pg.nav}
 <div class="h-btns"><button class="btn danger" data-act="breakthrough" ${why ? `disabled title="${esc(why)}"` : ''}>돌파 (${costText('breakthrough')}) </button>
 <button class="btn primary" data-act="modal-close">닫기</button></div>`, 'm-gift'); });
}

// ───────────── 파벌 ─────────────

const OPP_NAME = { order: '주문', auction: '압수 경매', launder: '장물을 공표한다', captive: '포로를 판다', license: '단약을 도매로 산다', supply: '진재 배급', salon: '아집 초대장', tip: '내부 소식' };

function oppHTML(o) {
 const C = CLIQUES[o.cid], left = `<span class="muted small">~에서 제 ${o.until}일까지</span>`;
 const head = `<b style="color:${o.cid === 'law' ? '#8fd3ff' : '#e0524a'}">${C.name}</b> · ${OPP_NAME[o.type]}`;
 if (o.type === 'order' || o.type === 'license') {
 const goods = oppGoods(o);
 const what = o.type === 'order' ? `${ITEMS[o.id].name} ×${o.left}, 개당 약 ${o.unit}(시가 ${marketPrice(o.id)})` : `단약은 시세 ×${o.mul.toFixed(2)}로 산다. 아직 ${o.left}건 받는다`;
 return `<div class="opp">${head} ${left}<p class="small">${what}</p>
 <div class="merit-goods">${goods.slice(0, 6).map(it => `<button class="btn tiny" data-act="opp-deliver" data-key="${o.key}" data-uid="${it.uid}">바친다 ${esc(itemName(it))} ${oppUnit(o, it)}</button>`).join('') || '<span class="muted small">손에 맞는 물건이 없다</span>'}</div></div>`;
 }
 const desc = ({
 auction: () => `압수해온 물건 한 무리(${o.items.map(id => ITEMS[id].name).join(' · ')}), 시가 약 ${o.value}, 한값 ${o.price}. 출처는 깨끗하다.`,
 launder: () => `네 장물에 집법당 감합을 붙여 낙인을 지워준다. 물건 값의 ${Math.round(o.rate * 100)}%를 수고비로 받는다.`,
 captive: () => `선문 포로 한 명, ${o.price} 영석. 처리하면 수사 유태, 생혼, 정혈을 얻는다. (남은 ${o.left}명)`,
 supply: () => `${ITEMS[o.id].name} 배급가로 개당 ${o.unit}(시가 ${marketPrice(o.id)}). 아직 ${o.left}건 있다.`,
 salon: () => `소종주의 아집 초대장: ${o.guests} 권귀가 찾아와 “감상”한다. 그들은 흥청망청하고 거만하며 안목은 평범하다. `,
 tip: () => '소종주 곁의 사람이 귀띔해준다 - 시세 밀보 한 부. ',
 })[o.type]();
 const price = o.type === 'auction' || o.type === 'captive' ? o.price : o.type === 'supply' ? o.unit : 0;
 return `<div class="opp">${head} ${left}<p class="small">${desc}</p>
 <button class="btn tiny" data-act="opp-take" data-key="${o.key}" ${price && S.stones < price ? 'disabled' : ''}>${price ? `${price} 영석` : '받는다'}</button></div>`;
}

function tabClique() {
 const J = S.cliques.joined, s = sel && S.items[sel];
 const offer = s && HELD(s) ? s : null;
 const dirt = offer && offer.id === 'intel' && !intelExpired(offer) && offer.info.kind === 'clique' ? offer : null;
 const rows = Object.entries(CLIQUES).map(([k, C]) => {
 const c = S.cliques[k], t = tierOf(k);
 return `<div class="clique ${J === k ? 'joined' : ''}"><img src="${asset('chars', C.portrait)}" alt="">
 <div class="cq-body"><div><b>${C.name}</b> <span class="muted small">${C.head} · 적대: ${CLIQUES[C.rival].name}</span>
 <span class="tag ${t >= 1 ? 'real' : ''}">${TIER_NAME[t]}</span></div>
 <div class="pc-aff"><span class="small">호감</span><span class="aff-bar"><i class="${c.st >= 0 ? 'pos' : 'neg'}" style="width:${Math.abs(c.st) / 2}%"></i></span><b>${c.st}</b>
 <span class="small">권세</span><span class="meter"><i style="width:${c.pw}%"></i></span><b class="${c.pw <= 30 ? 'bad' : ''}">${Math.round(c.pw)}</b></div>
 <p class="small muted">${C.desc} 중시: ${C.likes.map(x => CATS[x]).join(' · ')}. </p>
 <div class="merit-goods">${[100, 300].map(n => `<button class="btn tiny" data-act="cq-tribute" data-k="${k}" data-n="${n}" ${S.stones < n ? 'disabled' : ''}>효공 ${n}</button>`).join('')}
 ${offer && !dirt ? `<button class="btn tiny" data-act="cq-offer" data-k="${k}">바친다${esc(itemName(offer))} (+${Math.round(cliqueGiftValue(k, offer) / (20 + Math.max(0, c.st) / 2))}) </button>` : ''}
 ${dirt && dirt.info.cid !== k ? `<button class="btn tiny danger" data-act="cq-leak" data-k="${k}" ${CLIQUES[dirt.info.cid].rival === k ? '' : 'disabled title="적대 계파만 원한다"'}>건넨다${esc(itemName(dirt))}</button>` : ''}
 ${!J ? `<button class="btn tiny ${c.st >= 30 ? 'primary' : ''}" data-act="cq-join" data-k="${k}" ${c.st >= 30 ? '' : 'disabled title="호감 30이 되어야 받는다"'}>투항해 의탁</button>` : ''}</div></div></div>`;
 });
 const opps = liveOpps();
 const sub = subtabs('clique', [['four', '사계'], ['opps', `독점 장사${opps.length ? `(${opps.length})` : ''}`]]);
 const pg = pager(sub.cur === 'four' ? rows : opps.map(oppHTML), sub.cur === 'four' ? (LAYOUT === 'tall' ? 2 : 2) : rowsFit(70, 1), `clique-${sub.cur}`);
 return `<div class="clique-tab">${sub.html}
 ${sub.cur === 'four' ? `<p class="small muted">네 세력이 다툰다. 한 계파에 붙어, 남들이 못 얻는 거래를 얻는다. 누구의 문하에 들지, 그가 무너지면 너도 함께 청산당한다. 권세가 20 아래로 떨어지면 숙청된다. ${offer ? '' : '물건 하나를 골라 바칠 수 있다. '}</p>` : ''}
 ${pg.items.join('') || '<p class="muted small">아직 어느 계파도 너에게 기회를 주지 않았다. 호감이 10이 되어야 왕래가 시작된다. </p>'}${pg.nav}</div>`;
}

// 货盘上的货凑得怎样：要的凑了几件、급한 약、덧붙여的、多出来压价的
function trayTally(c, d) {
 const n = r => d.give.filter(g => g.role === r).length, u = needUnit(c), extra = n('extra');
 if (!c.wantCat) return `진열판에 ${ta(personOf(c))}이(가) 산다 ${d.give.length}건`;
 return `진열판에 모았다 <b class="${d.got >= d.need ? 'good' : ''}">${Math.min(d.got, d.need)}/${d.need}</b>`
 + (n('cure') ? `, 급한 약 ${n('cure')} ${u}` : '') + (n('side') ? `, 덧붙여 ${n('side')}종` : '')
 + (extra ? `, <span class="bad">넘친 ${extra}건은 5할만 쳐준다</span>` : '');
}

// 交易盘：他的货在카운터上，你的货摆在货盘上，一并값을 흥정
function tradePanel(c) {
 const it = customerItem(), d = dealOf(c), goods = goodsOf();
 const lo = Math.round(c.budget * 0.85 / 10) * 10, hi = Math.round(c.budget * 1.15 / 10) * 10;
 const taking = it && (c.take || []).includes(it.uid);
 const flawSeen = it && isDressed(it) && (it.seen || 0) >= it.grade;
 const s = sel && S.items[sel], canTray = s && HELD(s) && s.pos.g !== 'tray';
 let info = c.wantCat ? `<p>${c.attracted ? '진열장 안의 것을 노리고' : '원한다'} <b class="cat">${esc(wantText(c))}</b> <b class="need">필요 ${needText(c)}</b>${c.noble ? '' : ', 다른 맞는 것도 덤으로 두어 가지 가져간다(65%만 쳐준다). 넘치는 것은 50%만 쳐준다'}, 예산 약 ${stoneTxt(`${lo}–${hi}`)} ${patienceHTML(c)}</p>`
 : `<p>팔기만 하고 싶다, 아무것도 사지 않는다. ${patienceHTML(c)}</p>`;
 if (c.noble) info += `<p class="small laced-txt">권귀는 눈이 높다: 싼 물건을 초라하다 여긴다. 안목은 별로다. 띄워줄수록 대충 본다.${c.flatter ? `(${c.flatter}번 띄웠다)` : ''}</p>`;
 if (it) {
 info += `<p class="small"><b>${esc(itemName(it))}</b> 개시가 ${stoneTxt(it.ask)} ${taking ? '<span class="tag real">받으려 한다</span>' : ''}
 ${ITEMS[it.id].appraise && !it.told ? '<span class="muted">· 조요경으로 감정할 수 있다, 눈앞에서 위작이라며 깎는다</span>' : ''}</p>`;
 if (dressable(it) && it.seen != null) info += `<p class="small ${flawSeen ? 'bad' : 'muted'}">${flawSeen ? `걸러냈다: 하급을 상급으로, 겉면${it.sq}, 실제로는 ~뿐${it.q}. ` : `네 안목으로는 (${LENS_NAMES[it.seen]}) 흠을 찾지 못한다. `}</p>`;
 }
 if (d.give.length || d.take.length || d.reject.length) info += `<p class="small muted">${trayTally(c, d)}(심리가 약 ${Math.round(d.V)})${d.reject.length ? `, <span class="bad">안 산다: ${d.reject.map(itemName).join(' · ')}</span>` : ''}${d.take.length ? `; 네가 받는다 ${d.take.length}건(개시가 ${d.A})` : ''}. </p>`;
 const mid = `<div class="trade">${goods.length ? gridHTML('counter', `${ta(personOf(c))}의 물건 · 선택`) : ''}${gridHTML('tray', '네 진열판 · 물건을 끌어 올린다')}</div>${info}`;
 const acts = `${it && ITEMS[it.id].appraise && !it.told ? `<button class="btn small" data-act="appraise-counter">${icon('ic_appraise')}조요경</button>` : ''}
 ${it && (dressable(it) || isLaceable(it.id)) && it.seen == null ? `<button class="btn small" data-act="inspect-item">${icon('ic_appraise')}검품</button>` : ''}
 ${it && dressable(it) && !it.disputed ? `<button class="btn small" data-act="dispute-flaw" title="${flawSeen ? '하급 속임을 폭로하고 깎는다' : '흠을 잡아 깎는다'}">${flawSeen ? '폭로한다' : '깎는다'}</button>` : ''}
 ${it ? `<button class="btn small" data-act="take-toggle">${taking ? '안 받는다' : '받는다'}</button>` : ''}
 ${canTray ? `<button class="btn small wide-only" data-act="to-tray">고른 것을 진열판에 올린다</button>` : ''}
 ${c.noble ? `<button class="btn small" data-act="flatter" title="${costText('flatter')}">띄운다</button>` : ''}
 <button class="btn primary" data-act="deal" ${d.give.length || d.take.length ? '' : 'disabled'}>값을 흥정성사</button>
 ${c.wanted ? c.reportedWanted ? `<span class="muted small">몰래 관에 알렸다. ${ta(personOf(c))}이(가) 나가기를 기다린다</span>` : `<button class="btn small danger" data-act="report" title="${esc(sinHint(['betray', 1]))}">몰래 신고 포상${c.wanted}</button>` : ''}
 <button class="btn ghost small" data-act="dismiss">손님을 보낸다</button>`;
 return { mid, acts };
}

// ───────────── 侧栏分页 ─────────────

const TABS = [['display', '진열'], ['workshop', '공방'], ['broker', '행상'], ['people', '인물'], ['clique', '파벌'], ['rep', '시국'], ['ledger', '장부']];
// 竖屏侧栏：五个常用页，其余收进“더 보기”；白天最后一颗是마감
const NAV = [['store', '창고', 'ic_ledger'], ['display', '진열', 'ic_appraise'], ['workshop', '공방', 'ic_power'], ['people', '인물', 'ic_gift'], ['more', '더 보기', 'ic_war']];
const MORE = ['broker', 'clique', 'rep', 'ledger'];
let lastMore = 'broker';

function renderSide() {
 if (LAYOUT === 'wide' && tab === 'store') tab = 'display';
 if (MORE.includes(tab)) lastMore = tab;
 const group = LAYOUT === 'tall' && MORE.includes(tab);
 const list = LAYOUT === 'tall' ? TABS.filter(([id]) => MORE.includes(id)) : TABS;
 $('#tabs').innerHTML = list.map(([id, name]) => `<button class="tab ${tab === id ? 'on' : ''}" data-act="tab" data-tab="${id}">${name}</button>`).join('');
 document.body.classList.toggle('tab-store', tab === 'store');
 document.body.classList.toggle('tab-more', group);
 $('#nav').innerHTML = NAV.map(([id, name, ic]) => `<button class="${tab === id || (id === 'more' && group) ? 'on' : ''}" data-act="tab" data-tab="${id === 'more' ? lastMore : id}">${icon(ic)}${name}</button>`).join('')
 + (S.phase === 'day' ? `<button class="closing ${S.customer || S.queue.length ? '' : 'due'}" data-act="close">${icon('ic_night')}마감</button>` : '');
 if (tab !== 'store') $('#tab-body').innerHTML = { display: tabDisplay, workshop: tabWorkshop, broker: tabBroker, people: tabPeople, clique: tabClique, rep: tabRep, ledger: tabLedger }[tab]();
 layoutDock();
}

// ───────────── 分页与子页签：用横向翻页代替上下滚动 ─────────────

const pages = {}, subs = {};

function pager(list, per, key) {
 const n = Math.max(1, Math.ceil(list.length / per));
 const i = pages[key] = clamp(pages[key] || 0, 0, n - 1);
 const nav = n > 1 ? `<div class="pager"><button class="btn tiny" data-act="page" data-key="${key}" data-d="-1" ${i ? '' : 'disabled'}>‹</button>
 <span>${i + 1} / ${n}</span><button class="btn tiny" data-act="page" data-key="${key}" data-d="1" ${i < n - 1 ? '' : 'disabled'}>›</button></div>` : '';
 return { items: list.slice(i * per, i * per + per), nav };
}

function subtabs(key, list) {
 const cur = subs[key] && list.some(x => x[0] === subs[key]) ? subs[key] : list[0][0];
 subs[key] = cur;
 return { cur, html: `<div class="subtabs">${list.map(([id, name]) => `<button class="${cur === id ? 'on' : ''}" data-act="sub" data-key="${key}" data-id="${id}">${name}</button>`).join('')}</div>` };
}

// 一屏放得下几行：按面板高度估
const rowsFit = (px, per) => Math.max(2, Math.floor((LAYOUT === 'tall' ? STAGE.h * 0.3 : STAGE.h - 430) / px) * per);

function tabDisplay() {
 const fc = forecast();
 const fn = f => `<span style="color:${FACTIONS[f].color}">${FACTIONS[f].name}</span>`;
 return `<div class="display-tab">
 <div>${gridHTML('display', '진열장')}
 <p class="muted small fc-note">진열장에 올린 물건, 마침 그걸 원하는 구매자를 끌지도 모른다, 값도 더 후하게 부른다. 내놓지 않은 것은, 손님이 우연히 물어보길 기다릴 수밖에 없다. 선문 금물, 마종 금약은 내놓지 않는 게 좋다 - 관리가 눈감아주지 않는 한. </p></div>
 <div class="forecast paper">
 <h4>고객층 <span class="muted">예상 ${fc.n}명</span></h4>
 <div class="fc-sec">진열장이 끌어들인 구매자 <b>${pct(fc.pDisp)}</b></div>
 <div class="fc-list">${fc.buyers.length ? fc.buyers.map(b => `<div class="fc-row"><span>구매 요청 · ${CATS[b.cat]}</span><span>${pct(b.p)}</span></div>`).join('')
 : '<div class="fc-row muted">진열장이 비었다, 이름을 듣고 오는 이가 없다</div>'}</div>
 <div class="fc-sec">일반 손님</div>
 <div class="fc-list two">${fc.generic.map(g => `<div class="fc-row"><span>${fn(g.faction)}</span><span>${pct(g.p)}</span></div>`).join('')}</div>
 ${fc.angryYao ? '<div class="fc-warn">진열에 요단이 있다/요수 가죽: 요족 손님이 소매를 뿌리며 떠난다</div>' : ''}
 ${fc.contra ? `<div class="fc-warn">금지품을 진열했다 ${fc.contra} 건: 선문 손님이 마음이 동한다. 관리는${esc(fc.overseer.name)}보면 대개<b>${TOLERANCE_NAME[fc.overseer.t]}</b>, 너와 사이가 나쁜 손님도 신고하러 갈 수 있다</div>` : ''}
 </div></div>`;
}

// 工坊：설비排成卡片，点开一台才摊开它的格子，免得一长串往下翻
let openMid = 'array';

function tabWorkshop() {
 const plan = powerPlan();
 if (openMid !== 'array' && !S.machines.some(m => m.mid === openMid)) openMid = 'array';
 const status = ({ chk, powered }) => !chk.ok ? `<span class="chip warn">${esc(chk.msg)}</span>`
 : powered ? `<span class="chip ok">${esc(chk.msg)}</span>` : '<span class="chip bad">영력 부족</span>';
 const cards = [`<div class="m-card ${openMid === 'array' ? 'on' : ''}" data-act="m-open" data-mid="array"><img src="${asset('machines', 'm_array')}" alt="">
 <div><b>취령진</b><span class="chip ${plan.demand > plan.supply + plan.bank ? 'bad' : 'ok'}">필요 ${plan.demand} / 보유 ${plan.supply + plan.bank}</span></div></div>`]
 .concat(plan.rows.map(r => `<div class="m-card ${openMid === r.m.mid ? 'on' : ''} ${r.m.on ? '' : 'off'}" data-act="m-open" data-mid="${r.m.mid}">
 <img src="${asset('machines', `${MACHINES[r.m.type].icon}~${r.chk.ok && r.powered ? 'running' : 'idle'}`)}" alt=""><div><b>${MACHINES[r.m.type].name}</b>${status(r)}</div></div>`));
 let detail;
 if (openMid === 'array') detail = `<div class="machine array">
 <div class="m-head"><img class="m-icon" src="${asset('machines', 'm_array')}" alt="">
 <div class="m-title"><b>취령진</b><span class="muted">기본 영력 ${plan.supply}${S.upgrades.hijack ? ' (영맥 사설 연결 6 포함)' : ''} · 영정 비축 ${plan.bank}</span></div></div>
 <div class="m-grids">${gridHTML('power', '진안')}</div>
 <div class="m-desc muted small">설비는 카드 순서대로 영력을 쓴다. 기본 영력을 먼저 쓴다, 부족하면 영정에서 끌어쓴다. 남은 기본 영력은 영정에 저장된다(개당 상한 ${CRYSTAL_CAP}). </div></div>`;
 else {
 const r = plan.rows.find(x => x.m.mid === openMid), m = r.m, def = MACHINES[m.type];
 const grids = def.stalls ? stallsHTML(m, r.chk.ok && r.powered) : def.pot ? potHTML(m, r.chk.ok && r.powered) : [
 def.in ? gridHTML(gridOf(m, 'in'), def.inLabel || '입력') : '',
 def.mod ? gridHTML(gridOf(m, 'mod'), def.modLabel || '모듈', 'mod') : '',
 def.out ? gridHTML(gridOf(m, 'out'), def.outLabel || '산출', 'out') : '',
 ].join('');
 const extra = m.type === 'puppet' ? `<div class="m-extra">돈궤 ${stoneTxt(m.cash)} <button class="btn small" data-act="collect" data-mid="${m.mid}" ${m.cash ? '' : 'disabled'}>꺼낸다</button></div>`
 : def.pot ? `<div class="m-extra"><span>${m.seal ? '<b class="bad">독 단지를 봉해 고를 싸운다</b>: 먹이지 않으면 부화하지 않는다, 오늘 밤 가장 흉한 것이 가장 약한 것을 삼킨다' : '<b>독 단지를 열어 먹인다</b>: 어린 고가 뼈를 먹고 자라고, 다 자란 고가 알을 낳는다, 만독고와 고왕이 독을 뱉는다'}</span>
 <button class="btn small" data-act="gu-seal" data-mid="${m.mid}">${m.seal ? '독 단지를 열어 먹인다' : '독 단지를 봉해 고를 싸운다'}</button></div>` : '';
 detail = `<div class="machine ${m.on ? '' : 'off'}">
 <div class="m-head"><img class="m-icon" src="${asset('machines', `${def.icon}~${r.chk.ok && r.powered ? 'running' : 'idle'}`)}" alt="">
 <div class="m-title"><b>${def.name}</b><span class="muted">${icon('ic_power')}${def.power}/밤</span> ${status(r)}</div>
 <div class="m-ctrl">
 <button class="btn tiny" data-act="m-up" data-mid="${m.mid}" title="미리 가동(영력 우선 사용)">↑</button>
 <button class="btn tiny" data-act="m-down" data-mid="${m.mid}" title="가동을 미룬다">↓</button>
 <button class="btn tiny" data-act="m-toggle" data-mid="${m.mid}">${m.on ? '정지' : '가동'}</button>
 <button class="btn tiny ghost" data-act="m-remove" data-mid="${m.mid}" title="철거, 3할 반환">철거</button></div></div>
 <div class="m-grids${def.stalls ? ' stalls' : def.pot ? ' pot' : ''}">${grids}</div>${extra}
 <div class="m-desc muted small" data-act="m-desc">${def.desc}</div></div>`;
 }
 const known = Object.entries(S.forgeKnown).filter(x => x[1]).map(([id, g]) => `${ITEMS[id].name} (${GRADE_NAMES[g]}) `);
 return `<div class="workshop">
 <div class="techs">${Object.entries(TECHS).filter(([k]) => techLv(k)).map(([k, t]) => `<span class="tech on" title="${t.desc}">
 <img src="${asset('items', t.icon)}" alt="">${t.name}<b>${cn(techLv(k))}중</b>${k === 'gumaster' && guXpNext() ? `<small class="muted">${S.guXp || 0}/${guXpNext()}</small>` : ''}</span>`).join('')}
 <span class="muted small">감정술: ${LENS_NAMES[appraiseLevel()]}${known.length ? ` · 모작 가능: ${known.join(' · ')}` : ''}</span></div>
 <div class="m-cards">${cards.join('')}</div>
 ${S.machines.length ? detail : `${detail}<p class="muted">뒤뜰이 텅 비었다. 「행상」에서 설비를 구입하자. </p>`}</div>`;
}

const STALLS_PER_PAGE = { tall: 1, wide: 2 };
// 灵兽圈：一栏一行，사료 → 영령。사료对口、今夜설비转得起来，箭头才亮着往영령那边流；否则暗着不动
function stallsHTML(m, running) {
 const def = MACHINES[m.type], n = stallCount(m);
 const rows = [...Array(n).keys()].map(i => {
 const st = stallState(m, i), g = stallGrids(m, i), live = st.matched && running;
 const what = st.species ? `${ITEMS[st.species].name} ×${st.pets}` : '빈 칸';
 const why = !st.species ? '영령 한 마리를 넣는다' : !st.fit ? `맞는 사료가 없다: ${ITEMS[st.species].name}이(가) 먹는 것: ${petMenu(st.species).map(id => ITEMS[id].name).join(' · ')}`
 : !m.on ? '설비가 멈췄다' : !running ? '영력 부족, 오늘 밤은 돌리지 않는다' : `오늘 밤 먹이 ${Math.min(st.fit, st.need)}/${st.need}개`;
 return `<div class="stall ${live ? 'live' : ''}">
 <div class="stall-head"><b>수란 ${cn(i + 1)}</b><span>${what}</span><span class="${live ? 'ok' : 'muted'}">${esc(why)}</span></div>
 <div class="stall-row">${gridHTML(g.feed, '', 'feed')}
 <div class="flow-to"><div class="stall-flow ${live ? 'on' : ''}" title="${esc(why)}"><i></i><i></i><i></i></div>
 ${gridHTML(g.pen, '', 'pen')}</div></div></div>`;
 });
 const more = n < def.stallMax
 ? `<button class="btn small" data-act="buy-stall" data-mid="${m.mid}" ${S.stones >= stallPrice(m) ? '' : 'disabled'}>수란을 늘린다 (${stoneTxt(stallPrice(m))}) </button>`
 : '<span class="muted small">수란이 최대로 늘어났다</span>';
  // 一屏放不下四栏：竖屏一栏一页、电脑两栏一页横着翻，翻页钮挤在“兽栏 n/4”那一行，不另占一行
 const pg = pager(rows, STALLS_PER_PAGE[LAYOUT], `stalls-${m.mid}`);
  // 列头“영령”对准영령格：사료格宽 + 箭头宽（与 .stall-flow 一致）+ 栏的内边距
 const flowW = LAYOUT === 'tall' ? 20 : 56, padW = LAYOUT === 'tall' ? 4 : 6;
 return `<div class="stall-list"><div class="stall-cols muted small"><span style="width:${def.stallSize * CELL + flowW + padW}px">사료</span><span>영령</span></div>${pg.items.join('')}
 <div class="stall-foot"><span class="muted small">수란 ${n}/${def.stallMax}</span>${pg.nav}${more}</div></div>
 ${gridHTML(gridOf(m, 'out'), def.outLabel || '산출', 'out')}`;
}

// 蛊盅：原料 → 蛊虫 → 产物，三栏一行；今夜转得起来，箭头才亮着流
function potHTML(m, running) {
 const def = MACHINES[m.type], flow = on => `<div class="stall-flow ${on ? 'on' : ''}" style="height:${S.grids[gridOf(m, 'pot')].h * CELL}px"><i></i><i></i><i></i></div>`;
 return `<div class="pot-row">${gridHTML(gridOf(m, 'in'), def.inLabel, 'feed')}
 <div class="flow-to">${flow(running && !m.seal)}${gridHTML(gridOf(m, 'pot'), def.potLabel, `pen${m.seal ? ' sealed' : ''}`)}</div>
 <div class="flow-to">${flow(running)}${gridHTML(gridOf(m, 'out'), def.outLabel, 'out')}</div></div>`;
}

// 功勋页的비급只摆你眼下读得懂的那一重，免得一排书挤满窗口
const meritShown = id => !ITEMS[id].book || ITEMS[id].book.lv === techLv(ITEMS[id].book.tech) + 1;
function tabBroker() {
 const goods = S.supply.map((e, i) => `<div class="shop-row">
 <img src="${asset('items', e.id === 'water' ? 'water_murky' : e.id)}" alt=""><b>${ITEMS[e.id].name}</b>
 <span class="muted">${CATS[ITEMS[e.id].cat]} · 남은 ${e.stock}</span>${stoneTxt(e.price)}
 <button class="btn small" data-act="buy-supply" data-i="${i}" ${e.stock && S.stones >= e.price ? '' : 'disabled'}>산다</button></div>`);
 const locked = SUPPLY.filter(s => S.rep.mo < s[2]).map(s => `${ITEMS[s[0]].name}(마종 평판 ${s[2]})`);
 const machines = Object.entries(MACHINES).map(([type, d]) => `<div class="shop-row">
 <img src="${asset('machines', d.icon)}" alt=""><b>${d.name}</b><span class="muted">${icon('ic_power')}${d.power}/밤</span>${stoneTxt(machinePrice(type))}
 <button class="btn small" data-act="buy-machine" data-type="${type}" ${S.stones >= machinePrice(type) ? '' : 'disabled'}>구입</button></div>`);
 const ups = UPGRADES.filter(u => !u.need || S.upgrades[u.need]).map(u => `<div class="shop-row">
 <b>${u.name}</b><span class="muted grow">${u.desc}</span>
 ${S.upgrades[u.id] ? '<span class="chip ok">보유</span>' : `${stoneTxt(u.price)}<button class="btn small" data-act="buy-upgrade" data-id="${u.id}" ${S.stones >= u.price ? '' : 'disabled'}>장만</button>`}</div>`);
 const sub = subtabs('broker', [['goods', '물품'], ['machines', '설비'], ['books', '비급'], ['intel', '소식'], ['ups', '가게'], ['merit', '공훈']]);
 const books = BOOKS.filter(([, tech, lv, , rep]) => lv === techLv(tech) + 1 && (lv > BOOK_SHOP_MAX || S.rep.mo >= rep)).map(([id, tech, lv, price]) => {
 const head = `<div class="shop-row"><img src="${asset('items', ITEMS[id].icon)}" alt=""><b>${ITEMS[id].name}</b>
 <span class="muted">${TECHS[tech].name} 제${cn(lv)}중</span>`;
    // 三四重不卖：告诉你去哪儿换、谁肯教
 if (lv > BOOK_SHOP_MAX) {
 const [f, list] = Object.entries(MERIT_SHOP).find(([, l]) => l.some(([x]) => x === id)), cost = list.find(([x]) => x === id)[1];
 const who = TEACHERS[tech].who.map(pid => CAST[pid] ? CAST[pid].name : pid).join(' · ');
 return `${head}<span class="muted small grow">안 판다. ${CHANNEL_NAME[f]} ${cost} 공훈으로 바꾼다. 아니면 기회를 기다린다: ${who}과(와) 친해지거나, 사람이 찾아와 기예를 전할 때까지, 폐품 줍기로도 가끔 나온다</span></div>`;
 }
 const p = Math.round(price * (1 + diff().markup) * warStage().supply);
 return `${head}${stoneTxt(p)}
 <button class="btn small" data-act="buy-book" data-id="${id}" data-p="${p}" ${S.stones >= p ? '' : 'disabled'}>산다</button></div>`;
 });
 const intel = intelShop().map((k, i) => {
 const p = Math.round(INTEL_PRICE[k] * (1 + diff().markup));
 return `<div class="shop-row"><img src="${asset('items', 'intel')}" alt=""><b>${{ market: '시세 밀보', treasure: '장보도', clique: '파벌 내막' }[k]}</b>
 <span class="muted small">사야 무슨 내용인지 안다</span>${stoneTxt(p)}<button class="btn small" data-act="buy-intel" data-i="${i}" ${S.stones >= p ? '' : 'disabled'}>산다</button></div>`;
 });
 const merit = Object.keys(MERIT_SHOP).map(f => `<div class="merit-row">
 <b style="color:${FACTIONS[f].color}">${CHANNEL_NAME[f]}</b><span class="muted small">${FACTIONS[f].name} 공훈 ${S.merit[f]}${channelOpen(f) ? '' : ` · 연줄 없음(${channelHint(f)})`}</span>
 <div class="merit-goods">${MERIT_SHOP[f].map(([id, cost], i) => meritShown(id) ? `<button class="btn tiny" data-act="redeem" data-f="${f}" data-i="${i}"
 ${channelOpen(f) && S.merit[f] >= cost ? '' : 'disabled'} title="${esc(ITEMS[id].desc)}"><img src="${asset('items', ITEMS[id].icon || id)}" alt="">${ITEMS[id].name} ${cost}</button>` : '').join('')}</div></div>`);
 const rows = { goods, machines, books, intel, ups, merit }[sub.cur];
 const pg = pager(rows, sub.cur === 'merit' ? 4 : rowsFit(40, 1), `broker-${sub.cur}`);
 return `<div class="broker">
 <div class="broker-head"><img src="${asset('chars', 'broker')}" alt=""><p>“손님, 무엇을 찾으시오? 귀시에 못 사는 것은 없소……못 낼 값만 있을 뿐. ”<br>
 <span class="muted small">마종 평판이 높을수록, 값이 낮을수록, 물건이 다양할수록. 창고 물건을 고른 뒤, 그걸 깎아서 나에게 팔아도 된다. </span></p></div>
 ${sub.html}${pg.items.join('') || '<p class="muted small">없다. </p>'}${pg.nav}
 ${sub.cur === 'goods' && locked.length ? `<p class="muted small">아직 납품하지 않았다: ${locked.join(' · ')}</p>` : ''}</div>`;
}

function tabRep() {
 const st = warStage(), t = tension(), cal = calendar(), na = nextAnnual();
 const rels = Object.entries(RELATIONS).map(([k, r]) => `<div class="rel-row" title="${r.desc}"><span>${r.name}</span>
 <span class="meter wide"><i style="width:${S.world.rel[k]}%"></i></span><b>${Math.round(S.world.rel[k])}</b></div>`).join('');
 const cats = Object.keys(CATS).map(cat => {
 const sample = Object.keys(ITEMS).filter(id => ITEMS[id].cat === cat).sort((a, b) => (ITEMS[b].war || 0) - (ITEMS[a].war || 0))[0];
 const k = priceMul(sample);
 return [cat, k, sample];
 }).sort((a, b) => b[1] - a[1]);
 const news = S.world.news.slice(-5).reverse().map(n => `<li class="${n.cls}"><span class="muted">제${n.d}일</span> ${esc(n.t)}</li>`).join('');
 const sub = subtabs('rep', [['world', '대세'], ['market', '시세와 역법'], ['power', '세력'], ['rep', '평판']]);
 const body = {
 world: () => `<div class="world-head paper"><div><h4>${icon('ic_war')}천하 대세 · <span class="stage st${S.world.stage}">${st.name}</span></h4>
 <p class="small">${st.text}</p>
 <div class="stage-track">${WAR_STAGES.map((w, i) => `<span class="${i <= S.world.stage ? 'on' : ''}" style="left:${w.at}%">${w.name}</span>`).join('')}
 <i style="width:${t}%"></i></div>
 <p class="small muted">사방이 긴장한다 ${t}/100 · 손님 형편 ×${st.econ} · 행상 매입가 ×${st.supply}${st.levy ? ` · 전시 기부금 매주 ${levyAmount()}` : ''}</p></div>
 <div class="rels">${rels}</div></div>
 <h4>세상사</h4><ul class="log">${news || '<li class="muted">아직 큰일이 없다</li>'}</ul>`,
 market: () => `<div class="world-cols">
 <div><h4>역법</h4><p class="small">${cal.yearText} · ${cal.text}</p><p class="small muted">${seasonOf().text}</p>
 <p class="small muted">${weekdayOf().text}${annualOf() ? `<br><b>${annualOf().name}</b>: ${annualOf().text}` : `<br>${na.d} 이후${na.a.name}`}</p></div>
 <div><h4>시세</h4><table class="quotes">${cats.map(([cat, k, sample]) => `<tr title="${ITEMS[sample].name}을(를) 예로"><td>${CATS[cat]}</td>
 <td class="${k > 1.02 ? 'good' : k < 0.98 ? 'bad' : ''}">${k > 1.02 ? '▲' : k < 0.98 ? '▼' : '—'} ×${k.toFixed(2)}</td></tr>`).join('')}</table></div></div>`,
 power: () => `<h4>세력 · ${playerPower()}</h4><div class="power-parts">${powerParts().map(([k, v]) => `<span class="${v > 0 ? 'good' : 'bad'}">${k} ${v > 0 ? '+' : ''}${v}</span>`).join('')}</div>
 <p class="small muted">너에게 손해 본 사람, 대부분 상황을 본다: 네 세력이 크면, 그들은 분을 삼킨다. 네 세력이 약하면, 그들이 항의하고 보복한다. 친분이 깊은 이는, 너를 더 봐준다. </p>
 <h4>${icon('ic_merit')}공훈</h4><div class="power-parts">${Object.keys(S.merit).map(f => `<span>${FACTIONS[f].name} ${S.merit[f]}</span>`).join('')}</div>
 <h4>선명 · ${VIRTUE_NAME(S.virtue)}(${S.virtue})</h4>
 <p class="small muted">사실대로 말하고, 공정하게 거래하고, 약자를 도우면 선명이 오른다, 하지만 이 세상은 이치를 따지지 않는다: 정직한 사람이 연 가게가, 파는 사람이 더 많이 부를 수 있다, 선명만 높고 수련이 받쳐주지 않으면, 모두 너를 만만하게 본다(세력 -${softPenalty()}). 
 다만 네가 도운 사람은 너를 기억한다 - 아주 드물게, 그 보답은 네 목숨을 살릴 만큼 크다.${S.flags.savior ? `<b class="good">네 손에 호신부 ${S.flags.savior}장이 있다.</b>` : ''}</p>`,
 rep: () => repSection(),
 }[sub.cur]();
 return `<div class="world-tab">${sub.html}${body}</div>`;
}

function repSection() {
 const bars = Object.entries(FACTIONS).map(([k, f]) => {
 const v = S.rep[k];
 return `<div class="rep-col">
 <img src="${asset('ui', f.icon)}" alt=""><b style="color:${f.color}">${f.name}</b>
 <div class="rep-bar"><i class="${v >= 0 ? 'pos' : 'neg'}" style="${v >= 0 ? `bottom:50%;height:${v / 2}%` : `top:50%;height:${-v / 2}%`};background:${f.color}"></i><span class="mid"></span></div>
 <span class="rep-v">${v > 0 ? '+' : ''}${v}</span><p class="small muted">${f.desc}</p></div>`;
 }).join('');
 return `<div class="rep-tab"><div class="rep-cols">${bars}</div>
 <div class="heat-box">${icon('ic_heat')}<b>집법당 주목 ${S.heat}/100</b><span class="meter wide"><i style="width:${S.heat}%"></i></span>
 <p class="small muted">선문과의 거래, 금물 매매, 금물 진열, 영맥 사설 연결은 모두 주목을 부른다. 주목이 높을수록, 자주 순찰받는다, 백이 차면 체포된다. 매일 밤 조금씩 줄어든다, 마종 평판이 높을수록 빨리 사라진다. </p></div></div>`;
}

function tabLedger() {
 const days = S.stats.days.slice(-4).reverse().map(d => `<tr><td>제 ${d.day}일</td><td class="good">+${d.income}</td><td class="bad">-${d.expense}</td><td>${d.stones}</td></tr>`).join('');
 const lg = pager(S.log.slice().reverse(), rowsFit(22, 1) - 8, 'log');
 const logs = lg.items.map(l => `<li class="${l.cls}"><span class="muted">제${l.day}일</span> ${esc(l.text)}</li>`).join('');
 const canDeed = S.stones >= deedPrice() && S.phase !== 'day';
 return `<div class="ledger">
 <div class="ledger-top paper">
 <div><h4>${icon('ic_ledger')}임대 계약</h4>
 <p>${S.grace > 0 ? `<span class="bad">임대료 체납 ${S.rentOwed} 영석, 유예 ${S.grace}일</span>` : `다음 회차 ${rentAmount()} 영석, 제 ${S.rentDue}일 만기`}</p>
 <p class="muted small">이레마다 낸다, 회차마다 3할 가까이 오른다. </p>
 <button class="btn small" data-act="pay-rent" ${S.stones >= (S.grace ? S.rentOwed : rentAmount()) ? '' : 'disabled'}>${S.grace ? '추가 납부' : '미리 낸다'}</button></div>
 <div><h4>${icon('ic_deed')}가게 문서</h4>
 <p>${deedPrice()} 영석 · 보유 ${Math.floor(clamp(S.stones / deedPrice() * 100, 0, 100))}%</p>
 <p class="muted small">재고로는 현금을 대신 못 한다, 영석만 받는다. </p>
 <button class="btn small primary" data-act="buy-deed" ${canDeed ? '' : 'disabled'}>가게 문서를 산다</button></div>
 <div><h4>자산</h4><p>현금 ${S.stones}</p><p class="muted">물건 포함 추정 ${netWorth()}</p></div></div>
 <table class="days"><tr><th>일</th><th>수입</th><th>지출</th><th>잔액</th></tr>${days || '<tr><td colspan="4" class="muted">아직 기록이 없다</td></tr>'}</table>
 <ul class="log">${logs}</ul>${lg.nav}</div>`;
}

// ───────────── 库房 ─────────────

// 선택됨一件货能做的事：挪去别处（触屏上代替拖拽）与各种处置
function selActions(s, inCard = false) {
 const g = s.pos.g, out = [];
 const mv = (gid, label) => { if (S.grids[gid] && g !== gid && !rejectReason(gid, s) && findSpot(gid, s)) out.push(`<button class="btn tiny" data-act="move-to" data-g="${gid}">${label}</button>`); };
  // 사료格能叠：同一处아직 있다同种的，多给一个“全넣는다去”
 const mvAll = (gid, label) => {
 if (!stackCap(gid) || !S.grids[gid] || g === gid || rejectReason(gid, s) || !findSpot(gid, s)) return;
 const n = itemsIn(g).filter(o => o.id === s.id).length;
 if (n > 1) out.push(`<button class="btn tiny" data-act="move-all" data-g="${gid}" title="${label}: 같은 곳의 ${n}개, 한 칸에 겹친다">전부 ×${n}</button>`);
 };
 if (tradeOpen()) mv('tray', '진열판에 올린다');
 mv('display', '진열에 올린다');
 if (!['store', 'floor'].includes(g)) mv('store', '창고로 거둔다');
 if (stackOf(s).length > 1) out.push(`<button class="btn tiny" data-act="unpile" title="이 칸에 겹친 것 ${stackOf(s).length} 개를 모두 창고로 거뒀다, 각각 한 칸씩, 품질은 그대로">통째로 거둔다 ×${stackOf(s).length}</button>`);
 if (g === 'hand') mv('floor', '바닥에 놓는다');
 mv('hidden', '암격에 숨긴다');
  // 灵晶：嵌进취령진의 진안；진안满了，就和里面最空的一块对调（手机上진안在工坊页，拖不过去）
 if (s.id === 'spirit_crystal' && g !== 'power') {
 const low = weakestCrystal();
 if (findSpot('power', s)) mv('power', '진안에 끼운다');
 else if (low && (low.charge || 0) < (s.charge || 0)) out.push(`<button class="btn tiny" data-act="power-swap">진안에서 가장 빈 한 개를 교체(충전 ${low.charge || 0}) </button>`);
 }
 S.machines.filter(m => MACHINES[m.type].in).slice(0, 12).forEach(m => { if (out.length < 7) { mv(gridOf(m, 'in'), `넣는다${MACHINES[m.type].name}`); mvAll(gridOf(m, 'in'), `넣는다${MACHINES[m.type].name}`); } });
  // 蛊、蛊卵넣는다蛊盅的蛊虫格
 S.machines.filter(m => MACHINES[m.type].pot).forEach(m => mv(gridOf(m, 'pot'), `${MACHINES[m.type].name}에 넣어 기른다`));
  // 灵兽圈：영령넣는다同种或空的栏；사료只喂吃它的那几栏
 S.machines.filter(m => MACHINES[m.type].stalls).forEach(m => [...Array(stallCount(m)).keys()].forEach(i => {
 if (out.length >= 7) return;
 const sp = stallSpecies(m, i), g = stallGrids(m, i);
 if (isPet(s)) mv(g.pen, `수란에 넣는다${cn(i + 1)}`);
 else if (sp && petMenu(sp).includes(s.id)) { mv(g.feed, `수란 ${cn(i + 1)}에 먹인다(${ITEMS[sp].name})`); mvAll(g.feed, `수란 ${cn(i + 1)}에 먹인다`); }
 }));
 S.machines.filter(m => MACHINES[m.type].mod && modAccepts(s, m.type)).forEach(m => mv(gridOf(m, 'mod'), `담는다${MACHINES[m.type].name}`));
 if (ITEMS[s.id].appraise) out.push(`<button class="btn tiny" data-act="appraise-own">${icon('ic_appraise')}감정</button>`);
 if (canLace(s) && additives().length) out.push(`<button class="btn tiny" data-act="lace">${icon('ic_lace')}재료 섞기</button>`);
 if (ITEMS[s.id].book) out.push('<button class="btn tiny" data-act="read-book">탐독</button>');
 const seem = seemOf(s);
 if (restoreOf(seem) || cureBy(seem)) out.push(`<button class="btn tiny" data-act="consume">복용${cureBy(seem) ? `(치료: ${CONDS[cureBy(seem)].name})` : ''}</button>`);
 if (cultXp(seem)) out.push(`<button class="btn tiny" data-act="cultivate" data-uid="${s.uid}">복용 제련 +${cultXp(seem)}</button>`);
 if (canBottle(s)) out.push('<button class="btn tiny" data-act="bottle">병에 담는다</button>');
 if (s.mark && markVisible(s)) out.push(`<button class="btn tiny" data-act="erase" ${canErase(s) ? '' : `disabled title="낙인 지우기술 ${cn(s.mark.str)}중 필요"`}>낙인 지우기(${costText('erase', s.mark.str)})</button>`);
 if (canSeal(s)) out.push('<button class="btn tiny" data-act="seal">봉인 부착</button>');
 if ((dressable(s) || isLaceable(s.id)) && !s.forged && s.lacedBy !== 'me' && !s.lacedSeen) out.push('<button class="btn tiny" data-act="inspect-own">검품</button>');
 if (knownFlaw(s) && !s.forged && (s.fake ? COUNTERFEITS[s.id] : isDressed(s))) out.push('<button class="btn tiny" data-act="study">뜯어서 연구한다</button>');
  // 验出了别人掺的料：吃下这个亏、贱행상에게 판다、当好货转手骗人（값을 흥정时照常卖）、或者拆开学他的手法
 if (s.laced && s.lacedSeen && s.lacedBy !== 'me' && !laceSkill(s.laced)) out.push(`<button class="btn tiny" data-act="study">수법 배우기(${LACE[s.laced].name} 섞는 법)</button>`);
 out.push(`<button class="btn tiny" data-act="sell-broker">행상에게 판다 ${brokerPrice(s)}</button>`);
 if (inCard) out.push('<button class="btn tiny ghost" data-act="trash-sel">버린다</button>');
 return out.join('');
}

const selectable = s => s && s.pos && !['counter', 'basket'].includes(s.pos.g);
const weakestCrystal = () => itemsIn('power').reduce((m, it) => !m || (it.charge || 0) < (m.charge || 0) ? it : m, null);

function renderStorage() {
 const s = sel && S.items[sel];
 const canSell = selectable(s) && LAYOUT === 'wide';
 $('#storage').innerHTML = `
 <div class="st-head"><b>창고</b>
 ${canSell ? `<span class="st-sel">선택됨 <b>${esc(itemName(s))}</b>${selActions(s)}</span>`
 : `<span class="muted small">${LAYOUT === 'tall' ? '물건을 눌러 상세와 조작을 본다, 누른 채 끌어 옮긴다' : '끌어서 정리. 눌러서 보기와 판매'}</span>`}
 <button class="btn tiny" data-act="tidy" title="큰 것부터 놓는다, 바닥의 물건은 되도록 창고에 넣는다">정리</button>
 <span class="st-tool" title="감보대: 조요경을 올린다, 네 감정술을 결정한다">${gridHTML('tool', '', 'mod')}<small>${LENS_NAMES[appraiseLevel()]}</small></span>
 <span class="trash" data-drop="trash" title="여기로 끌어다 버린다">버림</span></div>
 ${handItems().length ? `<div class="st-hand">${gridHTML('hand', '손에 든 것: 가게에 넣을 곳이 없다. 빈 곳으로 끌어다 놓는다, 눌러서 복용, 진열, 설비에 넣기, 판매, 버려서 자리를 마련한다. 정리해야 다음 일을 할 수 있다')}</div>` : ''}
 <div class="st-body ${storeFit.cls || 'beside-row'}">${gridHTML('store', '')}
 <div class="st-side">${gridHTML('floor', '바닥(밤에 도둑 든다)')}${S.grids.hidden ? gridHTML('hidden', '속층 암격', 'stash') : ''}</div></div>`;
 fitStorage();
}

// 地上与暗格摆在哪：库房旁边横排、旁边竖排、库房下面横排，挑横向不撑出、又最矮的那种。
// 排法只随屏幕和格子尺寸变，记下来，同样的尺寸不再量
const storeFit = { key: null, cls: null };
function fitStorage() {
 const st = $('#storage'), body = st && st.querySelector('.st-body');
 const key = [LAYOUT, CELL, ...['store', 'floor', 'hidden'].map(g => S.grids[g] ? `${S.grids[g].w}x${S.grids[g].h}` : '-')].join(' ');
 if (!body || !st.clientWidth || storeFit.key === key) return;
 let best = null;
 for (const cls of ['beside-row', 'beside-col', 'below-row']) {
 body.className = `st-body ${cls}`;
 const over = st.scrollWidth > st.clientWidth + 1, h = st.scrollHeight;
 if (!best || (!over && (best.over || h < best.h))) best = { cls, over, h };
 }
 body.className = `st-body ${best.cls}`;
 Object.assign(storeFit, { key, cls: best.cls });
}

// 触屏点一件货：立刻弹出详情卡，能做的事也在卡上；点别处收起并取消선택됨
let peek = null; // 상세 카드의 물건 uid
let touchy = false; // 마지막으로 누른 게 손가락인지

function renderCard() {
 const it = peek && S.items[peek], el = $('#itemcard');
 if (!it || (selectable(it) && sel !== it.uid)) { peek = null; el.innerHTML = ''; return; }
 const take = it.pos && it.pos.g === 'counter' && tradeCustomer() && S.customer.item === it.uid
 ? `<button class="btn tiny" data-act="take-toggle">${(S.customer.take || []).includes(it.uid) ? '안 받는다' : '받는다'}</button>` : '';
 el.innerHTML = `${itemTip(it)}<div class="ic-acts">${selectable(it) ? selActions(it, true) : take}</div>`;
}

// ───────────── 竖屏窗口：当前分页靠左、카운터靠右，宽窄高矮随内容，放不下就左右互相压住 ─────────────

let front = 'main'; // 겹칠 때 위에 놓이는 창: counter(카운터)/ main (창고 또는 현재 페이지)
const DOCK_PEEK = 56; // 눌린 창은 적어도 이만큼 보여야 한다, 잘 눌러 맞힌다

function layoutDock() {
 const cw = $('#counter-panel'), mw = tab === 'store' ? $('#storage') : $('#side');
 const wins = [cw, $('#side'), $('#storage')];
 if (LAYOUT !== 'tall') {
 wins.forEach(w => { w.style.maxHeight = w.style.maxWidth = ''; w.classList.remove('front'); });
 $('#dock').style.height = $('#dock').style.marginLeft = '';
 return;
 }
 const g = $('#game'), dock = $('#dock'), solo = !cw.childElementCount, nav = $('#nav');
 g.style.setProperty('--top-h', `${$('#topbar').offsetHeight}px`);
 const sh = $('#scene').clientHeight, cap = Math.round(sh * 0.5), free = sh - nav.offsetTop - nav.offsetHeight - 6;
 const fit = left => {
 dock.style.marginLeft = `${left}px`;
 const room = dock.clientWidth - 8 - (solo ? 0 : DOCK_PEEK);
 [cw, mw].forEach(w => { w.style.maxHeight = `${cap}px`; w.style.maxWidth = `${room}px`; });
 return Math.max(mw.offsetHeight, solo ? 0 : cw.offsetHeight);
 };
 let h = fit(0);
 if (h > free) h = fit(nav.offsetWidth);
 dock.style.height = `${h}px`;
 g.style.setProperty('--dock-h', `${h}px`);
 cw.classList.toggle('front', front === 'counter');
 mw.classList.toggle('front', front !== 'counter' || solo);
}

function raise(win) {
 if (front === win) return;
 front = win;
 layoutDock();
}

// 点到被压住的窗口：翻到上面来；덧붙여记下是手指还是鼠标
document.addEventListener('pointerdown', e => {
 touchy = e.pointerType !== 'mouse';
 const w = LAYOUT === 'tall' && e.target.closest && e.target.closest('#dock .win');
 if (w) raise(w.dataset.win);
}, true);

let handSeen = 0; // 지난번 다시 그릴 때 손에 물건 몇 점이 있었다

function renderAll() {
 if (!S) return;
 layoutHand();
 const held = handItems().length;
 if (held > handSeen) { toast('가게에 놓을 곳이 없다, 넘치는 물건은 일단 손에 든다', 'bad'); tab = 'store'; front = 'main'; }
 handSeen = held;
 renderTopbar(); renderScene(); renderCounter(); renderSide(); renderStorage(); renderCard();
 if (modal) modal();
  // 몰래 신고한다的人出了门：赏金送到
 if (NOTICES.length) { const n = NOTICES.splice(0); toast(n.map(x => x.text.split('\n').join('<br>')).join('<br>'), n.some(x => x.cls === 'bad') ? 'bad' : 'good'); }
}

// ───────────── 弹窗 ─────────────

function openModal(fn) { modal = fn; fn(); }
function closeModal() { modal = null; $('#modal-layer').innerHTML = ''; $('#modal-layer').className = ''; }
function modalHTML(html, cls = '') { $('#modal-layer').className = 'on'; $('#modal-layer').innerHTML = `<div class="modal paper ${cls}">${html}</div>`; }

// 소매를 뿌리침的机会小的时候差一点都要紧：一成以下精确到千分
const leavePct = p => p > 0 && p < 0.1 ? `${(Math.floor(p * 1000) / 10).toFixed(1)}%` : pct(p);

function oddsBar(o) {
 return `<div class="odds"><i class="a" style="width:${o.accept * 100}%"></i><i class="c" style="width:${o.counter * 100}%"></i><i class="l" style="width:${o.leave * 100}%"></i></div>
 <div class="odds-txt"><span class="good">성사 ${pct(o.accept)}</span><span>흥정 ${pct(o.counter)}</span><span class="bad">소매를 뿌리침 ${leavePct(o.leave)}</span></div>`;
}

// 货盘上每件货在这笔买卖里算什么
const ROLE_TXT = { cure: '급함', want: '딱 맞음', side: '덧붙여', extra: '넘침' };
const ROLE_CLS = { cure: 'good', want: 'good', side: 'muted', extra: 'bad' };

// 값을 흥정：货盘上的货卖给他、카운터上点中的货받는다来，谈一个总价
function openDeal() {
 const c = S.customer;
 const h = { counter: null, result: null };
 let d = dealOf(c);
 const range = () => dealRange(c, d);
  // 滑杆先停在“小赚”：他几乎不会翻脸的최고价
 const safe = () => dealPresets(c, d, range())[2][1];
 h.net = safe();
 const TA = ta(personOf(c));
 const netTxt = n => n >= 0 ? `${TA}이(가) 너에게 <b>${n}</b>` : `네가 ${TA}에게 <b>${-n}</b>`;
 const giveRow = g => {
 const it = g.it, canLie = knownFlaw(it) && !c.wantFake;
 return `<div class="d-row">${itemHTML(Object.assign({}, it, { pos: null }), 'preview mini')}<span>${esc(itemName(it))}
 <small class="${ROLE_CLS[g.role]}">${ROLE_TXT[g.role]}</small></span><span class="muted">${g.role === 'extra' ? '깎아서 산다' : '심리가'} ${Math.round(g.v)}</span>
 ${canLie ? `<span class="d-claim"><label class="${claimOf(c, it) !== 'honest' ? 'on' : ''}" data-act="d-claim" data-uid="${it.uid}" data-v="genuine">진품이라 한다</label><label class="${claimOf(c, it) === 'honest' ? 'on' : ''}" data-act="d-claim" data-uid="${it.uid}" data-v="honest">실정을 알린다</label></span>` : ''}</div>`;
 };
 let gp, tp;
 const render = () => {
 const [lo, hi] = range();
 let body;
 if (h.result) body = `<div class="h-result ${h.result.cls}">${c.portrait ? `<img class="h-face" src="${asset('chars', portraitOf(c))}" alt="">` : ''}<span>${h.result.text}</span></div><div class="h-btns"><button class="btn primary" data-act="haggle-close">좋아</button></div>`;
 else if (h.counter != null) body = `<div class="h-result">“${voice(c.faction, h.counter >= 0 ? 'counterSell' : 'counterBuy', { n: Math.abs(h.counter) })}”<br><small> (${netTxt(h.counter)}) </small></div>
 <div class="h-btns"><button class="btn primary" data-act="h-accept">받아들인다</button>
 <button class="btn" data-act="h-again" ${c.patience > 0 ? '' : 'disabled'}>다시 흥정</button>
 <button class="btn ghost" data-act="h-quit">그만둔다</button></div>`;
 else body = `<div class="h-presets">${dealPresets(c, d, [lo, hi]).map(([n, v]) => `<button class="btn small" data-act="h-preset" data-v="${v}">${n} ${v}</button>`).join('')}</div>
 <div class="h-slider"><input type="range" id="h-range" min="${lo}" max="${hi}" value="${clamp(h.net, lo, hi)}"><b id="h-price">${netTxt(h.net)}</b></div>
 <div id="h-odds">${oddsBar(dealOdds(c, d, h.net))}</div>
 <div class="h-btns"><span class="muted small">한 번 부를 때마다 ${costText('haggle', dealEffort(d))}</span><button class="btn primary" data-act="h-offer">부른 값</button><button class="btn ghost" data-act="haggle-close">더 생각한다</button></div>`;
 modalHTML(`<h3>값을 흥정 · ${esc(c.name)} <span class="muted small">${FACTIONS[c.faction].name} ${patienceHTML(c)}</span></h3>
 <div class="deal"><div class="d-col"><h4>${TA}에게 판다</h4>${(gp = pager(d.give, 4, 'deal-give')).items.map(giveRow).join('') || '<p class="muted small">진열판에 그가 원하는 게 없다.</p>'}${gp.nav}
 ${d.reject.length ? `<p class="muted small">${TA}이(가) 안 산다: ${d.reject.map(itemName).join(' · ')}</p>` : ''}</div>
 <div class="d-col"><h4>${TA}에게서 받는다</h4>${(tp = pager(d.take, 4, 'deal-take')).items.map(t => `<div class="d-row">${itemHTML(Object.assign({}, t.it, { pos: null }), 'preview mini')}<span>${esc(itemName(t.it))}</span>
 <span class="muted">개시가 ${t.a} · 네 추정 ${Math.round(knownValue(t.it) * priceMul(t.it.id))}</span></div>`).join('') || '<p class="muted small">그의 물건은 받지 않는다.</p>'}${tp.nav}</div></div>
 ${c.wantCat ? `<div class="tip-row"><span>${TA}이(가) 원한다: ${needText(c)}</span><span>${trayTally(c, d)}</span></div>` : ''}
 ${compliant(c) ? `<div class="tip-row laced-txt"><span>${TA}은(는) 네 뜻에 따른다</span><span>어떤 값을 불러도 인정한다, 다만 돈주머니에 없는 건 낼 수 없다</span></div>` : ''}
 <div class="tip-row"><span>${TA}마음속 공정 차액</span><span>${netTxt(d.N0)}</span></div>
 ${d.give.length ? `<div class="tip-row"><span>상대 예산</span><span>약 ${Math.round(c.budget * 0.85 / 10) * 10}–${Math.round(c.budget * 1.15 / 10) * 10}${d.N0 > c.budget * PURSE_OFFER ? '<span class="bad">, 공정한 값을 못 낸다</span>' : ''}</span></div>` : ''}
 <hr>${body}`, 'm-deal');
 const r = $('#h-range');
 if (r) r.oninput = () => { h.net = +r.value; $('#h-price').innerHTML = netTxt(h.net); $('#h-odds').innerHTML = oddsBar(dealOdds(c, d, h.net)); };
 };
 const ready = net => {
 if (net < 0 && S.stones < -net) { toast('영석이 모자란다', 'bad'); return false; }
 return true;
 };
 const finish = net => {
 const out = settleDeal(c, d, net);
 h.result = out.caught === 'stolen' ? { cls: 'bad', text: '상대가 물건 속에서 같은 문파의 도난품을 알아봤다, 그 자리에서 가져간다, 나머지 거래도 하지 않는다! ' }
 : out.caught === 'laced' ? { cls: 'bad', text: `“네가 이 안에 손을 댔다! ”${esc(c.name)}물건을 카운터에 내던졌다, 떠나갔다. 이 일은 이대로 끝나지 않는다. ` }
 : { cls: 'good', text: `성사! ${out.sold.length ? `판 ${out.sold.join(' · ')}, 수입 ${out.income}` : ''}${out.sold.length && out.bought.length ? '; ' : ''}${out.bought.length ? `산 ${out.bought.join(' · ')}, 지출 ${out.paid}` : ''}.` };
 if (sel && !S.items[sel]) sel = null;
    // 被你狠宰了一刀还是买了：心里不痛快
 const k = (net - d.N0) / d.scale;
 feel(c, out.caught ? 'angry' : compliant(c) ? null : k > 0.2 ? 'angry' : k > 0.12 ? null : 'pleased');
 dismissCustomer(false);
 };
 const respond = () => {
 if (!ready(h.net)) return;
    // 네가 정한다摆布的人看出货不对也不敢声张
 const caught = !compliant(c) && dealInspect(c, d);
 if (caught) {
 h.result = { cls: 'bad', text: `“${esc(itemName(caught))}(으)로 나를 속여?” 상대가 한눈에 간파하고 소매를 뿌리며 떠났다.` };
 feel(c, 'angry');
 dismissCustomer(false);
 return;
 }
 const out = roll(dealOdds(c, d, h.net));
 if (out === 'accept') finish(h.net);
 else if (out === 'counter') { if (!compliant(c)) c.patience--; h.counter = dealCounter(c, d, h.net); }
 else { h.result = { cls: 'bad', text: `“${voice(c.faction, 'leave')}”상대가 돌아서서 갔다. ` }; feel(c, 'angry'); dismissCustomer(true); }
 };
 modal = render;
 render();
 HANDLERS['d-claim'] = el => { S.items[el.dataset.uid].claim = el.dataset.v; d = dealOf(c); h.net = safe(); render(); };
 HANDLERS['h-preset'] = el => { h.net = +el.dataset.v; render(); };
 HANDLERS['h-offer'] = () => tiredOr('haggle', () => { respond(); render(); renderAll(); }, dealEffort(d));
 HANDLERS['h-accept'] = () => { if (!ready(h.counter)) return; finish(h.counter); h.counter = null; render(); renderAll(); };
 HANDLERS['h-again'] = () => { h.net = h.counter; h.counter = null; render(); };
 HANDLERS['h-quit'] = () => { h.counter = null; h.result = { cls: 'bad', text: '흥정이 깨졌다. 상대가 풀이 죽어 떠났다.' }; feel(c, 'angry'); dismissCustomer(true); render(); renderAll(); };
}

// 来客此刻的神情：갈아 끼운다表情（null 为不变）；随后被送走的，带着这副神情在카운터前留一会儿
function feel(c, mood) { if (c) { if (mood) c.mood = mood; parting = { c }; renderScene(); } }

// 감정：mode 'commission' 委托、'counter' 看顾客的货、'own' 看自己的货。
// 台上只摆这一件；照妖镜像一盏紫外灯，作伪的痕迹在镜里发出荧光
function openAppraise(mode, uid) {
 const it = S.items[uid], kind = ITEMS[it.id].appraise, spec = APPRAISE[kind];
 const lv = appraiseLevel(), zoom = 1.6 + 0.4 * lv;
 const seen = visibleFeats(it, lv);
 const c = S.customer;
  // 照妖镜：手指（鼠标）按在镜柄上，镜片在指尖上方，不被手指挡住；松手镜子留在原处。
  // 拖动时镜子随手平移；松手后镜柄摆向台心一侧（镜片在台左时柄朝右下，在台右时朝左下），下回按住也够得着台边
 const V = LAYOUT === 'tall' ? Math.min(STAGE.w - 56, 440) : 380, g = Math.round(V * 0.2);
 const TILT = 28 * Math.PI / 180, tiltAt = lx => TILT * (2 * clamp(lx / V, 0, 1) - 1);
 let pos = [V * 0.45, V * 0.4], grip = 2.4 * g, tilt = tiltAt(pos[0]);
 const loupe = `<div class="lens" id="ap-lens" style="--g:${g}px">
 <div class="lens-in${lv ? ' uv' : ''}"><div id="lens-content" style="width:${V * zoom}px;height:${V * zoom}px">${appraiseImg(kind, seen, it.flip, lv > 0)}</div></div>
 <div class="lens-arm" id="lens-arm">
 <img src="assets/appraise/loupe.webp" alt="" draggable="false" style="left:${-LOUPE.cx * g}px;top:${-LOUPE.cy * g}px;width:${LOUPE.w * g}px">
 <div class="lens-grip" style="top:${1.25 * g}px;height:${(LOUPE.end - 1.25) * g}px"></div></div></div>`;
 const buttons = () => {
 if (mode === 'own') return `<button class="btn" data-act="ap-real">진품으로 판정</button><button class="btn danger" data-act="ap-fake">위작으로 판정</button>
 <button class="btn ghost" data-act="modal-close">내려놓는다</button>`;
 if (mode === 'story') return `<button class="btn" data-act="ap-mark-real">알고 있다: 진품</button><button class="btn danger" data-act="ap-mark-fake">알고 있다: 위작</button>
 <button class="btn ghost" data-act="story-reopen">내려놓는다</button>`;
 if (mode === 'commission') return `<button class="btn" data-act="ap-real">${ta(personOf(c))}에게 말한다: 진품</button><button class="btn danger" data-act="ap-fake">${ta(personOf(c))}에게 말한다: 위작</button>
 <button class="btn ghost" data-act="modal-close">더 생각한다</button>`;
 return `${it.told ? '' : `<button class="btn danger" data-act="ap-dispute">위작이라 지적하고 깎는다</button>`}
 <button class="btn ghost" data-act="modal-close">태연하다</button>`;
 };
 const render = () => {
 modalHTML(`<h3>${icon('ic_appraise')}조요경 · ${spec.name}</h3>
 <div class="appraise">
 <div class="ap-stage" id="ap-stage" style="width:${V}px;height:${V}px">
 <div class="ap-view">${appraiseImg(kind, [], it.flip)}</div>${loupe}</div>
 <div class="viewer">
 <p class="ap-tip">${lv ? '거울 손잡이를 눌러 조요경을 움직여 물건 전체를 비춰본다. 거울 아래가 온통 검보랏빛이면 위조한 부분이<b class="uv-txt">형광을 낸다</b>. 진품은 온통 한 빛이고 빛나는 곳이 한 곳도 없다.'
 : '감보대에 조요경이 없다, 손에 든 건 돋보기 하나뿐: 무늬는 잘 보인다, 위조를 비추지 못한다. '}</p>
 <p class="muted small">네 감정술: <b>${LENS_NAMES[lv]}</b>(제${cn(lv) || '0'}중) - 그것보다 솜씨가 좋은 위작은 빛나지 않는다. </p>
 ${mode === 'own' || mode === 'story' ? '' : talkHTML(c)}
 <div class="h-btns">${buttons()}</div></div></div>`, 'm-appraise');
 const stage = $('#ap-stage'), lens = $('#ap-lens'), arm = $('#lens-arm'), content = $('#lens-content');
 const place = () => {
 lens.style.left = `${pos[0]}px`; lens.style.top = `${pos[1]}px`;
 arm.style.transform = `rotate(${tilt}rad)`;
 content.style.transform = `translate(${1.02 * g - pos[0] * zoom}px, ${1.02 * g - pos[1] * zoom}px)`;
 };
    // 指下是镜柄上离镜心 grip 远的一点：由指尖反推镜心
 const at = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale]; };
 const follow = e => {
 const [x, y] = at(e);
 pos = [clamp(x + grip * Math.sin(tilt), 0, V), clamp(y - grip * Math.cos(tilt), 0, V)];
 place();
 };
    // 按在镜柄上：从按住的那一点起拖；按在台面上：镜子挪过来，让镜柄落在指下
 let drag = null;
 stage.onpointerdown = e => {
 const [x, y] = at(e);
 grip = e.target.closest('.lens-grip') ? clamp(Math.hypot(x - pos[0], y - pos[1]), 1.5 * g, LOUPE.end * g) : 2.4 * g;
 drag = e.pointerId;
 try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 합성 이벤트에는 진짜 포인터가 없다 */ }
 follow(e); e.preventDefault();
 };
 stage.onpointermove = e => { if (drag === e.pointerId || (drag == null && e.pointerType === 'mouse')) follow(e); };
 stage.onpointerup = stage.onpointercancel = e => { if (drag === e.pointerId) { drag = null; tilt = tiltAt(pos[0]); place(); } };
 place();
 };
 const verdict = fake => {
 if (mode === 'own') { it.verdict = fake ? 'fake' : 'real'; closeModal(); renderAll(); return; }
 const fee = c.fee, res = finishAppraisal(c, fake);
 modal = null;
 if (res.caught) {
 modalHTML(`<h3>들통났다</h3><p>${esc(c.name)}냉소했다: “누구를 속이려고?” 소매를 뿌리며 떠났다. 수고비를 한 푼도 못 받았다.
 <span class="bad">${FACTIONS[c.faction].name}평판 -6</span></p>
 <div class="h-btns"><button class="btn primary" data-act="ap-done">손님을 보낸다</button></div>`);
 } else {
 const offer = !res.ask ? '' : fake ? `<p>“위작이라니, 둬봤자 자리만 차지한다. <b>${res.ask}</b> 영석, 주인장이 받아주시오? ”</p>`
 : `<p>“알고 보니 진품……주인장이 뜻이 있으면, <b>${res.ask}</b> 영석에 너에게 넘긴다. ”</p>`;
 modalHTML(`<h3>감정 완료</h3><p>${esc(c.name)}에게 말했다: 이것은 <b>${fake ? '위작' : '진품'}</b>. 상대가 믿고 수고비 ${fee} 영석을 냈다.</p>${offer}
 <div class="h-btns">${res.ask ? `<button class="btn primary" data-act="ap-buyback">회수(흥정)</button>` : ''}
 <button class="btn ${res.ask ? 'ghost' : 'primary'}" data-act="ap-done">${res.ask ? '안 받고 손님을 보낸다' : '손님을 보낸다'}</button></div>`);
 }
 renderAll();
 };
 modal = render;
 render();
 HANDLERS['ap-real'] = () => verdict(false);
 HANDLERS['ap-fake'] = () => verdict(true);
 HANDLERS['ap-mark-real'] = () => { it.verdict = 'real'; HANDLERS['story-reopen'](); };
 HANDLERS['ap-mark-fake'] = () => { it.verdict = 'fake'; HANDLERS['story-reopen'](); };
 HANDLERS['ap-dispute'] = () => {
 const { caught } = disputeAsFake(c);
 feel(c, caught ? 'angry' : 'afraid');
 closeModal();
 if (caught && c.patience <= 0) { dismissCustomer(false); toast(`${c.name}네 술수를 간파했다, 소매를 뿌리며 떠난다`, 'bad'); }
 else if (caught) toast(`들통났다! ${FACTIONS[c.faction].name} 평판 -6, 상대가 도리어 값을 올렸다`, 'bad');
 else toast(`상대가 믿었다, 개시가를 낮췄다 ${customerItem().ask} 영석`, 'good');
 renderAll();
 };
}

// 说出감정结论前的察言观色
function talkHTML(c) {
 return `<div class="ap-talk"><span>${esc(c.name)} · 안색<b>${demeanor(c)}</b></span>
 <span>말이 사실과 다르면, 그 자리에서 들통날 확률 약 <b class="bad">${pct(lieDetectChance(c))}</b></span></div>`;
}

function showReport(rep) {
 openModal(() => modalHTML(`<h3>${icon('ic_night')}야간 보고 · 제 ${S.day - 1}일 밤</h3>
 <div class="report">${rep.map(r => `<div class="rp-row ${r.cls || ''}">
 <img src="${asset(r.icon.startsWith('m_') ? 'machines' : 'ui', r.icon)}" alt=""><b>${r.title}</b><span>${esc(r.text)}</span></div>`).join('')}</div>
 <div class="h-btns"><button class="btn primary" data-act="report-ok">제 ${S.day}일을 맞는다</button></div>`, 'm-report'));
}

function showLandlord() {
 const owed = S.grace > 0, sun = S.flags.landlord === 'sun';
 const qianMood = mood(S.people.qian ? S.people.qian.aff : 0);
 const line = sun
 ? owed ? `“임대료 체납 <b>${S.rentOwed}</b> 영석. 종문 규정이다, 이틀 유예한다. 이틀 뒤에도 못 내면, 규정대로 가게를 거둔다.” 그녀가 장부에 한 줄 적었다, “나는 한 푼도 더 받지 않아, 한 푼도 덜 받지 않는다. ”`
 : `“임대료 완납. 다음 회차 <b>${rentAmount()}</b> 영석, 제 ${S.rentDue}일.” 그녀가 고개도 들지 않고 말했다. “장부는 깨끗하군. 더 말할 필요 없다.”`
 : owed ? `“어머, 못 내겠다고? 종문 규정이야. 이틀 유예, 원금에 벌금을 얹어 <b>${S.rentOwed}</b> 영석. 이틀 뒤에도 못 내놓으면…… 후후, 이 가게의 주인이 바뀐다.”`
 : qianMood === 'close' || qianMood === 'warm' ? `“우리 사이에, 임대료는 받았다. 다음 <b>${rentAmount()}</b> 영석, 제 ${S.rentDue}일에 가지러 온다.” 그가 싱글벙글하며 너를 두드렸다, “좋은 일 있으면 늙은 전을 생각해줘.”`
 : qianMood === 'hostile' || qianMood === 'cold' ? `“임대료는 받았다.” 그가 겉으로만 웃었다, “다음은 <b>${rentAmount()}</b> 영석, 제 ${S.rentDue}일. 젊은이, 잡역 구역의 가게를 아무나 빌릴 수 있는 게 아니다.”`
 : `“임대료는 받았다. 다음은 <b>${rentAmount()}</b> 영석, 제 ${S.rentDue}일에 가지러 온다. 잡역 구역의 가게는, 그런데 해마다 몸값이 오른다니까. ”`;
 openModal(() => modalHTML(`<div class="npc-talk"><img src="${asset('chars', landlordPerson().portrait)}" alt="">
 <div><h3>${landlordName()}</h3><p>${line}</p>
 <p class="muted small">가게 문서를 사들이고 싶다? ${deedPrice()} 영석, 한 푼도 깎을 수 없다. </p>
 <div class="h-btns"><button class="btn primary" data-act="modal-close">알겠다</button></div></div></div>`, 'm-npc'));
}

// ───────────── 故事对话 ─────────────

let storyDone = null; // 대화가 끝난 뒤의 행선지(낮에는 손님 배웅 / 밤에 계속 입정한다)

function openStory(key, onDone) {
 const st = S.story[key], node = storyNode(st), p = storyPerson(st);
 const c = S.customer && S.customer.key === key ? S.customer : storyVisitor(key);
 storyDone = onDone;
 const f = FACTIONS[c.faction];
 const chs = node.choices(st, p);
 const it = customerItem();
  // 泛泛之辈的故事模板里，“他”指的就是这个人，随性别改；有名有姓的故事各自写好了
 const G = GENERIC_STORY.has(st.tpl) && p ? t => gx(p, t) : t => t;
 openModal(() => modalHTML(`<div class="story">
 <div class="st-portrait"><img src="${asset('chars', portraitOf(c))}" alt=""></div>
 <div class="st-body">
 <h3>${icon(f.icon)}${esc(c.name)}<span class="muted">${esc(c.title || '')}</span>${p && !node.who ? personTags({ pid: p.pid }) : ''}</h3>
 <div class="st-text">${G(node.text(st, p)).split('\n').map(t => `<p>${esc(t)}</p>`).join('')}</div>
 ${it ? `<div class="st-item">${itemHTML(Object.assign({}, it, { pos: null }), 'preview')}<span class="muted">${esc(itemName(it))}</span>
 ${ITEMS[it.id].appraise ? `<button class="btn small" data-act="story-appraise">${icon('ic_appraise')}조요경으로 자세히 본다</button>` : ''}</div>` : ''}
 <div class="st-choices">${chs.map((ch, i) => {
 const why = choiceState(ch, st, p);
 return `<button class="btn st-choice" data-act="story-choose" data-i="${i}" ${why ? `disabled title="${esc(why)}"` : ''}>
 <span>${esc(G(ch.label))}</span>${ch.hint || why || ch.sin ? `<small>${esc(G(why || [ch.hint, ch.sin && sinHint(ch.sin)].filter(Boolean).join('; ')))}</small>` : ''}</button>`;
 }).join('')}</div></div></div>`, 'm-story'));
 HANDLERS['story-choose'] = el => {
 const pv = personOf(c) || p;
 const before = { stones: S.stones, heat: S.heat, rep: Object.assign({}, S.rep), aff: pv ? pv.aff : null };
 const res = resolveChoice(key, +el.dataset.i);
 if (res.mood) c.mood = res.mood;
 if (S.customer === c) feel(c, null);
 modal = null;
 modalHTML(`<div class="story">
 <div class="st-portrait"><img src="${asset('chars', storyResultPortrait(key, c))}" alt=""></div>
 <div class="st-body"><h3>${icon(f.icon)}${esc(c.name)}</h3>
 <div class="st-text">${G(res.text || '').split('\n').map(t => `<p>${esc(t)}</p>`).join('')}</div>
 <div class="st-delta">${deltaHTML(before, pv)}</div>
 <div class="h-btns"><button class="btn primary" data-act="story-done">계속</button></div></div></div>`, 'm-story');
 renderTopbar();
 };
 HANDLERS['story-appraise'] = () => openAppraise('story', it.uid);
 HANDLERS['story-reopen'] = () => openStory(key, onDone);
}

const GENERIC_STORY = new Set(['grudge', 'scandal', 'tracker', 'legacy']);

// 结果里可能换了样貌（如老乞丐恢复修为）
function storyResultPortrait(key, c) {
 const p = storyPerson(S.story[key]);
 return `${p && c.pid === p.pid ? p.portrait : c.portrait}~${moodOf(c, personOf(c))}`;
}

// 一次抉择带来的变化
function deltaHTML(before, p) {
 const out = [];
 const d = S.stones - before.stones;
 if (d) out.push(`<span class="${d > 0 ? 'good' : 'bad'}">영석 ${d > 0 ? '+' : ''}${d}</span>`);
 if (S.heat !== before.heat) out.push(`<span class="${S.heat > before.heat ? 'bad' : 'good'}">집법당 주목 ${S.heat > before.heat ? '+' : ''}${S.heat - before.heat}</span>`);
 for (const k in FACTIONS) {
 const r = S.rep[k] - before.rep[k];
 if (r) out.push(`<span class="${r > 0 ? 'good' : 'bad'}">${FACTIONS[k].name} 평판 ${r > 0 ? '+' : ''}${r}</span>`);
 }
 if (p && before.aff != null && p.aff !== before.aff) out.push(`<span class="${p.aff > before.aff ? 'good' : 'bad'}">${esc(p.name)} 호감 ${p.aff > before.aff ? '+' : ''}${p.aff - before.aff}</span>`);
 return out.join('');
}

// ───────────── 人物 ─────────────

const STATUS_NAME = { alive: '살아 있음', gone: '떠났다', dead: '작고', jailed: '옥살이' };

function knownPeople() {
 return Object.values(S.people).filter(p => p.visits || p.mem.length || p.life.length)
 .sort((a, b) => (!!b.story - !!a.story) || (b.lastDay - a.lastDay) || (b.visits - a.visits));
}

function tabPeople() {
 const list = knownPeople();
 if (!list.length) return '<p class="muted">아직 아는 사람이 없다. 문을 열고 손님을 맞이하자. </p>';
 const pg = pager(list, LAYOUT === 'tall' ? 4 : 6, 'people');
 return `<div class="people">${pg.items.map(p => {
 const m = mood(p.aff), f = FACTIONS[p.faction];
 const st = p.story && S.story[p.story];
 const last = [...p.mem, ...p.life].sort((a, b) => b.d - a.d)[0];
 return `<div class="pcard ${p.status}" data-act="person" data-pid="${p.pid}">
 <div class="pc-face"><img src="${asset('chars', personFace(p))}" alt=""></div>
 <div class="pc-info"><div><b>${esc(p.name)}</b> <span class="muted small">${esc(p.title || '')}</span>
 ${p.story && !p.official ? '<span class="tag gold">사연 있음</span>' : ''}${p.official ? '<span class="tag">관원</span>' : ''}${p.status !== 'alive' ? `<span class="tag fake">${STATUS_NAME[p.status]}</span>` : ''}
 ${p.status === 'alive' && p.addict ? '<span class="tag fake">중독</span>' : ''}${p.status === 'alive' && guBound(p) ? '<span class="tag laced">고에 걸림</span>' : ''}${p.status === 'alive' && p.soulBound ? '<span class="tag laced">통제됨</span>' : ''}${p.status === 'alive' && p.loveGu ? '<span class="tag love">정고</span>' : ''}${p.status === 'alive' && p.wish ? `<span class="tag real">원함 ${ITEMS[p.wish].name}</span>` : ''}
 ${p.status === 'alive' ? condList(p).filter(c => CONDS[c.kind]).map(c => `<span class="tag fake">${c.label}</span>`).join('') : ''}${isHealer(p) && p.status === 'alive' ? '<span class="tag real">의술을 앎</span>' : ''}</div>
 <div class="pc-aff"><span style="color:${f.color}">${f.name}</span><span class="aff-bar"><i class="${p.aff >= 0 ? 'pos' : 'neg'}" style="width:${Math.abs(p.aff) / 2}%"></i></span>
 <span class="mood-${m}">${MOOD_NAME[m]}</span></div>
 <div class="muted small pc-last">${st && st.summary ? esc(st.summary) : last ? `제${last.d}일 · ${esc(last.t)}` : esc(p.bio)}</div></div></div>`;
 }).join('')}</div>${pg.nav}`;
}

function openPerson(pid) {
 const p = S.people[pid], m = mood(p.aff), f = FACTIONS[p.faction];
 const st = p.story && S.story[p.story];
 const rows = [...p.mem.map(e => ({ ...e, type: 'mem' })), ...p.life.map(e => ({ ...e, type: 'life' }))].sort((a, b) => a.d - b.d);
 openModal(() => { const pg = pager(rows.slice().reverse(), LAYOUT === 'tall' ? 4 : 6, `mem-${pid}`); modalHTML(`<div class="story">
 <div class="st-portrait"><img src="${asset('chars', personFace(p))}" alt=""></div>
 <div class="st-body"><h3>${icon(f.icon)}${esc(p.name)}<span class="muted">${esc(p.title || '')} · ${STATUS_NAME[p.status]}</span></h3>
 <p class="muted">${esc(p.bio)}</p>
 <p>호감 <b class="mood-${m}">${p.aff}(${MOOD_NAME[m]})</b> · 왔다 갔다 ${p.visits} 회 · 안색${demeanor(p)}</p>
 <p class="p-traits">${personTraits(p)}</p>
 ${st && st.summary ? `<p class="st-sum">${esc(st.summary)}</p>` : ''}
 ${p.status === 'alive' ? personActions(p) : ''}
 ${p.status === 'alive' && p.visits > 0 ? loreHTML(p) : ''}
 <ul class="timeline">${rows.length ? pg.items.map(r => `<li class="${r.type}"><span class="muted">제${r.d}일</span>${esc(r.t)}
 ${r.a ? `<span class="${r.a > 0 ? 'good' : 'bad'}">${r.a > 0 ? '+' : ''}${r.a}</span>` : ''}</li>`).join('') : '<li class="muted">아직 왕래가 없다</li>'}</ul>${pg.nav}
 <div class="h-btns"><button class="btn primary" data-act="modal-close">닫기</button></div></div></div>`, 'm-story'); });
}

// 요령을 캐낸다：他像是懂哪些行当的门道、肯不肯说、要价多少
function loreHTML(p) {
 const tips = loreKnown(p).filter(t => !loreLearned(t.id));
 if (!tips.length) return loreKnown(p).length ? '<p class="small muted">그가 아는 요령은 너도 다 안다. </p>' : '';
 const asked = p.loreDay === S.day;
 return `<div class="p-lore"><b>요령을 캐낸다</b>${asked ? '<span class="muted small"> (오늘은 이미 알아봤다)</span>' : `<span class="muted small"> (${costText('talk')}; 하루 한 번)</span>`}
 ${tips.map(t => { const o = loreOffer(p, t);
 const tag = `${t.topic}<em class="muted">·${LORE_TIER[t.tier]}${t.evil ? '·편법' : ''}</em>`;
 if (o.kind === 'refuse') return `<div class="lore-row"><span>${tag}</span><span class="muted small">${esc(o.why)}</span></div>`;
 return `<div class="lore-row"><span>${tag}</span><button class="btn tiny${o.kind === 'sell' ? ' danger' : ''}" data-act="ask-lore" data-pid="${p.pid}" data-id="${t.id}" ${asked ? 'disabled' : ''}>${o.kind === 'sell' ? `${o.price} 영석으로 가르침을 청한다` : '가르침을 청한다'}</button></div>`;
 }).join('')}</div>`
 .replace(/他/g, ta(p));
}

// 见闻录：打听来的门道
function openLoreBook() {
 const got = Object.entries(S.lore || {}).sort((a, b) => a[1].day - b[1].day);
 modalHTML(`<h3>${icon('ic_ledger')}견문록</h3>
 <p class="muted small">잡역 구역의 온갖 사람들에게서 캐낸 요령. 누가 어느 바닥을 아는지, 얼마나 친한지, 말해줄지 말지, 모두 「인물」 페이지에서 본다. </p>
 <ul class="timeline">${got.length ? got.map(([id, x]) => { const t = loreTip(id); return t ? `<li><span class="muted">제${x.day}일 · ${esc(x.from)}</span><b>${t.topic}</b>${esc(t.text)}</li>` : ''; }).join('') : '<li class="muted">아직 알아낸 게 없다.</li>'}</ul>
 <div class="h-btns"><button class="btn primary" data-act="modal-close">닫기</button></div>`, 'm-gift');
}

function personTraits(p) {
 const t = [];
 for (const c of condList(p)) t.push(`<b class="bad" title="비무 -${c.combat}">${c.label}</b>`);
 t.push(`<span title="체박">체박 ${Math.max(0, Math.round(p.health))}</span>`);
 t.push(`<span>형편 ${p.budgetMul >= 1.3 ? '넉넉' : p.budgetMul < 0.6 ? '쪼들림' : '보통'}</span>`);
 t.push(`<span>탐욕 ${p.greed > 0.65 ? '큼' : p.greed < 0.35 ? '적음' : '보통'}</span>`);
 t.push(`<span title="네 세력 ${playerPower()}">세력 ${npcPower(p)}</span>`, `<span title="너는 ${realmName()}">경지·${realmName(npcLevel(p))}</span>`, `<span>안목 ${['전무', '천박', '보통', '노련', '독랄'][p.eye || 0]}</span>`);
 if (p.noble) t.push('<span class="laced-txt">권귀 · 체면을 중시</span>');
 if (isWeak(p)) t.push('<span class="muted">약자</span>');
 if (p.informant) t.push('<span class="good">네 눈과 귀</span>');
 if (p.owed >= 2) t.push('<span class="good">너에게 인정을 빚졌다</span>');
 if (p.soulBound) t.push('<span class="laced-txt">통제됨: 식해에 네 혼인이 심어져 네 뜻을 거역하기 어렵다</span>');
 if (p.wantsFakes) t.push('<span class="laced-txt">가짜를 받아 되파는 걸 좋아한다</span>');
 if (p.official || p.integrity > 0.5) t.push(`<span>규칙 준수 ${p.integrity > 0.7 ? '극도로 엄격' : p.integrity > 0.4 ? '엄격' : '느슨'}</span>`);
 if (p.wish) t.push(`<span class="good">원하는 것: ${ITEMS[p.wish].name}</span>`);
 if (isHealer(p)) t.push(`<span class="good">의술을 안다: 치료${CAST[p.pid].healer.heals.map(k => CONDS[k].name).join(' · ')}</span>`);
 if (p.desperate) t.push('<span class="bad">갈 곳이 없다</span>');
 if (p.addict) t.push(`<span class="bad">중독 ${p.addict}</span>`);
 if (guBound(p)) t.push(`<span class="laced-txt">고에 걸림: 네 것을 먹었다${GU_STAGES[p.controlled.stage || 0].name}, 거역하면 고가 심장을 갉아먹는다</span>`);
 if (p.loveGu) t.push(`<span class="love-txt">네 정고에 걸렸다: ${ta(p)}그가 죽으면 너도 못 산다</span>`);
 return t.join('');
}

function personActions(p) {
 const out = [];
 if (canGift(p)) out.push(`<button class="btn small" data-act="gift-open" data-pid="${p.pid}">${icon('ic_gift')}선물한다</button>`,
 ...[50, 150, 400].map(n => `<button class="btn small" data-act="gift-stones" data-pid="${p.pid}" data-n="${n}" ${S.stones < n ? 'disabled' : ''}>영석 ${n}개 선물</button>`));
 else if (p.giftedDay === S.day) out.push('<span class="muted small">오늘은 이미 선물했다</span>');
 if (p.secret && p.secret.known && !p.secret.filed) out.push(`<button class="btn small" data-act="file-secret" data-pid="${p.pid}">${icon('ic_secret')}밀보로 적는다</button>`);
 if (isHealer(p) && p.status === 'alive') out.push(healButton(p));
 if (p.status === 'alive') out.push(...treatButtons(p));
 if (guBound(p)) out.push(`<button class="btn small ghost" data-act="uncontrol" data-pid="${p.pid}">고를 푼다</button>`);
 if (p.indentured) out.push(`<span class="small bad">네 뒤뜰에서 고역을 한다</span><button class="btn small" data-act="release" data-pid="${p.pid}">${ta(p)}을(를) 놓아준다</button>`);
 if (S.phase === 'night' && killable(p) && p.pid !== 'beggar') {
 const why = canKill(p);
 out.push(`<button class="btn small danger" data-act="ambush" data-pid="${p.pid}" ${why || S.scavenged ? `disabled title="${esc(why || '오늘 밤은 이미 외출했다')}"` : ''}>밤에 길을 막아 죽인다${why ? '' : ` (성공 확률 ${pct(killOdds(p, true))}) `}</button>`);
 }
 const l = loanOf(p);
 const debt = l && l.defaulted ? `<div class="p-lever"><b class="bad">너에게 빚짐 ${l.owe} 영석을 못 갚으면</b>
 <button class="btn tiny danger" data-act="debt" data-pid="${p.pid}" data-how="mine">광산으로 판다</button>
 <button class="btn tiny danger" data-act="debt" data-pid="${p.pid}" data-how="labor">고역으로 부린다</button>
 <button class="btn tiny" data-act="debt" data-pid="${p.pid}" data-how="extend">이레 유예(이자에 이자)</button>
 <button class="btn tiny" data-act="debt" data-pid="${p.pid}" data-how="forgive">일필휘지로 지운다</button></div>`
 : l ? `<p class="small muted">너에게 빚짐 ${l.owe} 영석, 제 ${l.due}일 만기.</p>` : '';
 const levers = leversOf(p).map(k => {
 const L = LEVERS[k];
 return `<div class="p-lever"><span class="laced-txt">근거: ${L.name}</span><span class="muted small">성공 확률 ${pct(L.odds(p))} · ${esc(gx(p, L.note(p)))}</span>
 ${commandList(p, k).map(c => `<button class="btn tiny danger" data-act="command" data-pid="${p.pid}" data-id="${c.id}" data-lever="${k}" ${c.ready ? '' : `disabled title="${c.why}"`}>${esc(c.label)}${c.ready ? '' : ` (${c.why}) `}</button>`).join('')}</div>`;
 }).join('');
 return (out.length ? `<div class="p-actions">${out.join('')}</div>` : '') + debt + levers;
}

// 진료 요청：懂医术的人总有这颗按钮，用不了就把缘由写在旁边（手机上없다悬停提示）
function healButton(p) {
 const why = healBlock(p), can = healable(p).length, fee = can ? healFee(p) : null;
 return `<button class="btn small" data-act="seek-heal" data-pid="${p.pid}" ${why ? 'disabled' : ''}>${icon('ic_stamina')}진료 요청${!can ? '' : fee == null ? ' (치료하지 않겠다)' : ` (${fee} 영석) `}</button>${why ? `<span class="muted small">${esc(why)}</span>` : ''}`;
}

// 替他治伤毒：就是把对症的药준다他（与선물한다同一回事，一天只送一回）；手里없다就说缺什么。
// 掺进来的尸毒不在此列，药治不了
function treatButtons(p) {
 const kinds = Object.keys(CONDS).filter(k => condSev(p, k));
 if (!kinds.length) return [];
 const TA = ta(p), med = Object.values(S.items).find(it => HELD(it) && cureBy(it, p) && !knownFlaw(it) && it.lacedBy !== 'me');
 if (!med) return [`<span class="small muted">${TA}은(는) ${kinds.map(k => CONDS[k].name).join(' · ')}에 걸려 있다. ${[...new Set(kinds.flatMap(k => CONDS[k].cure))].map(id => ITEMS[id].name).join(' · ')}(으)로 고칠 수 있다</span>`];
 const why = canGift(p) ? '' : '오늘은 이미 물건을 보냈다';
 return [`<button class="btn small" data-act="treat" data-pid="${p.pid}" data-uid="${med.uid}" ${why ? 'disabled' : ''}>${icon('ic_stamina')}${esc(itemName(med))}(으)로 ${TA}의 ${CONDS[cureBy(med, p)].name}을(를) 고친다</button>${why ? `<span class="muted small">${why}</span>` : ''}`];
}

// 因果：갚지 못한 빚、下一桩恶事的赌注、악명带来的损失
function openFate() {
 const F = S.fate;
 modalHTML(`<h3>${icon('ic_heat')}인과</h3>
 <p>악행 하나마다 빚 하나씩 진다, 며칠 뒤 판가름 난다: 절반은 무사히, 절반은 보복이 찾아온다. 보복에 물어야 할 원금은 네가 저지른 악행만큼 불어난다, 배상하지 못하면 사람들이 쳐들어오고, 물건을 압수당하고, 집법당을 부른다. 
 선행이 옛 빚을 흐린다, 한동안 악행을 저지르지 않으면, 빚도 서서히 옅어진다. </p>
 <p>너는 모두 <b>${F.total}</b>건의 악행을 저질렀다: <span class="good">${F.buried} 건은 캐묻는 이가 없다</span>, <span class="bad">${F.erupted} 건은 보복을 당했다${F.busts ? `(${F.busts}회 배상 불가)` : ''}</span>. </p>
 <p>지금 다시 작은 악행 하나를 저지르면, 들통나면 약 ~을 배상 <b>${fateStake(1)}</b> 영석. 배신, 장물 판매는 약 <b>${fateStake(2)}</b>; 사람 목숨을 해치면 약 <b>${fateStake(3)}</b>. </p>
 ${F.infamy ? `<p class="bad">악명 ${F.infamy}: ${[fateCustomerLoss() ? `날마다 손님 ${fateCustomerLoss()}명 감소` : '', `손님이 깎는다 ${Math.round(infamyDiscount() * 100)}%`,
 fateTrusted() ? '' : '더는 맡기거나 도움을 청하는 이가 없다', fateClean() ? '' : '보답은 좀처럼 오지 않는다'].filter(Boolean).join('; ')}. </p>` : ''}
 <h4>갚지 못한 빚</h4>
 <ul class="timeline">${F.debts.length ? F.debts.map(d => `<li><span class="muted">제${d.day}일</span>${esc(d.what || SINS[d.kind].name)}<span class="bad">들통나면 배상 ${d.stake}</span>
 <span class="muted">${d.due <= S.day + 1 ? '바로 이 이틀 안에' : `약 ${d.due - S.day}일 이내`}</span></li>`).join('') : '<li class="muted">미수금이 없다</li>'}</ul>
 <div class="h-btns"><button class="btn primary" data-act="modal-close">닫기</button></div>`, 'm-gift');
}

// 치료를 구함：点顶栏的伤毒打开。손에 든 약、아는 의원；一个医者也不认得，就只能靠药
function openHeal() {
 if (!Object.keys(S.conds).length) { closeModal(); return; }
 const meds = cureItems(), docs = healers().filter(p => healable(p).length);
 const cureNames = Object.entries(CONDS).filter(([k]) => condSev('me', k))
 .map(([k, C]) => `${C.name}: ${C.cure.map(id => ITEMS[id].name).join(' · ')}`).join('; ');
 modalHTML(`<h3>${icon('ic_stamina')}치료를 구함</h3>
 <p class="bad">${condText('me')}</p>
 <h4>손에 든 약</h4>
 <div class="gift-list">${meds.length ? meds.map(it => `<div class="gift-row">
 ${itemHTML(Object.assign({}, it, { pos: null }), 'preview mini')}<span>${esc(itemName(it))}</span>
 <span class="good">치료: ${CONDS[cureBy(it)].name}</span><button class="btn small" data-act="heal-use" data-uid="${it.uid}">복용한다</button></div>`).join('')
 : `<p class="muted small">손에 맞는 약이 없다 (${cureNames}). </p>`}</div>
 <h4>아는 의원</h4>
 <div class="gift-list">${docs.length ? docs.map(p => `<div class="gift-row">
 <img class="heal-face" src="${asset('chars', personFace(p))}" alt=""><span>${esc(p.name)}<em class="muted small"> ${esc(p.title)} · ${MOOD_NAME[mood(p.aff)]}</em>
 <br><small>고칠 수 있는 것: ${healable(p).map(k => CONDS[k].name).join(' · ')}</small></span>${healButton(p)}</div>`).join('')
 : `<p class="muted small">${healers().length ? '아는 의원도 네 병은 고치지 못한다. ' : '아직 의술을 아는 사람을 알지 못한다, 가진 약에만 의지할 수 있다. 가벼운 상처와 미약한 독은 며칠 요양하면 낫지만, 독이 퍼진 이상은 치료하지 않으면 악화된다. '}</p>`}</div>
 <div class="h-btns"><button class="btn primary" data-act="modal-close">닫기</button></div>`, 'm-gift m-heal');
}

function openGift(pid) {
 const p = S.people[pid];
 const items = Object.values(S.items).filter(it => HELD(it)).sort((a, b) => giftValue(p, b) - giftValue(p, a));
 openModal(() => { const pg = pager(items.filter(it => S.items[it.uid]), 6, `gift-${pid}`); modalHTML(`<h3>${icon('ic_gift')}선물한다 · ${esc(p.name)}</h3>
 <p class="muted small">${ta(p)}이(가) 중시하는 건 자기 쓸모다. ${p.wish ? `가장 원하는 것: <b>${ITEMS[p.wish].name}</b>; ` : ''}${p.addict ? '망우산을 끊지 못한다; ' : ''}그의 형편과 탐욕의 정도도 본다. 재료를 섞은 물건은 내보내면 네 마음대로 못 한다.</p>
 <div class="gift-list">${items.length ? pg.items.map(it => `<div class="gift-row" data-act="gift-give" data-pid="${pid}" data-uid="${it.uid}">
 ${itemHTML(Object.assign({}, it, { pos: null }), 'preview mini')}<span>${esc(itemName(it))}${lacedKnown(it) ? `<em class="laced-txt"> (${LACE[it.laced].verb}) </em>` : ''}</span>
 <span class="good">호감 약 +${giftAff(p, giftValue(p, it)) + (p.wish === it.id ? 10 : 0)}</span>
 ${lacedKnown(it) && LACE[it.laced].detect ? `<span class="bad small">간파 ${Math.round(laceDetectChance(p, it) * 100)}%</span>` : ''}</div>`).join('') : '<p class="muted">손에 줄 만한 것이 없다. </p>'}</div>${pg.nav}
 <div class="h-btns"><button class="btn ghost" data-act="person" data-pid="${pid}">돌아가기</button></div>`, 'm-gift'); });
}

function openLace() {
 const it = S.items[sel];
 openModal(() => modalHTML(`<h3>${icon('ic_lace')}재료 섞기 · ${esc(itemName(it))}</h3>
 <p class="muted small">재료를 섞은 물건은 겉으로는 구분이 안 된다, 평소대로 값을 매기고 팔거나 선물한다. 재료는 먹어야 발작한다. 사거나 받은 사람이 품에 넣어가면 자기가 먹거나 다른 사람에게 돌린다. 누가 먹든 그가 피해를 입는다. 물건을 받을 때 영리한 사람은 그 자리에서 간파한다.</p>
 <div class="lace-list">${additives().map(a => {
 const L = LACE[ITEMS[a.id].additive], why = laceBlock(it, a);
 return `<div class="lace-row"><div class="lace-ic">${itemHTML(Object.assign({}, a, { pos: null }), 'preview mini')}</div>
 <div><b>${esc(itemName(a))}</b> → ${L.verb}<p class="small">${L.desc}</p>
 <p class="small muted">${L.detect ? `들통날 기본 확률 ${Math.round(L.detect * 100)}%, 상대가 영리할수록, 너를 믿지 않을수록 간파하기 쉽다${a.id === 'gu' ? '; 고가 독할수록 숨기 쉽다' : ''}. ` : '무해, 들통날 걱정이 없다. '}</p>
 ${why ? `<p class="small bad">${esc(why)}</p>` : ''}</div>
 <button class="btn small ${L.detect ? 'danger' : ''}" data-act="lace-do" data-uid="${a.uid}" ${why ? 'disabled' : ''}>${L.verb.replace('了', '')}</button></div>`;
 }).join('')}</div>
 <div class="h-btns"><button class="btn ghost" data-act="modal-close">그만둔다</button></div>`, 'm-lace'));
}

// 精力不够就做不了
function tiredOr(key, fn, mult = 1) {
 const err = exert(key, mult);
 if (err) { toast(err, 'bad'); return; }
 renderTopbar();
 fn();
}

function showIntel(r) {
 openModal(() => modalHTML(`<h3>${icon('ic_secret')}천기</h3><div class="h-result ${r.cls || ''}">${r.text.split('\n').join('<br>')}</div>
 <div class="h-btns"><button class="btn primary" data-act="modal-close">좋아</button></div>`));
}

function openMarket(key) {
 const d = DEALERS[key];
 if (d.need && !d.need()) key = 'ghost';
 const dd = DEALERS[key], st = dealerStock(key);
 const tabs = Object.entries(DEALERS).map(([k, x]) => `<button class="tab ${k === key ? 'on' : ''}" data-act="mk-tab" data-k="${k}" ${x.need && !x.need() ? 'disabled title="마종 평판 15 또는 마종 공훈 5 필요"' : ''}>${x.name}</button>`).join('');
 const offers = st.offers.map((o, i) => {
 const unit = dealerBuyPrice(key, o.id), mk = Math.round(rawValue({ id: o.id, q: 60 }) * priceMul(o.id));
 return `<div class="shop-row" title="시가 약 ${mk}/건"><img src="${asset('items', ITEMS[o.id].icon || (o.id === 'water' ? 'water_murky' : o.id))}" alt=""><b>${ITEMS[o.id].name}</b>
 <span class="muted small">${o.lot}건×${o.lots}배치 · 시가 ${mk}</span>${stoneTxt(unit)}
 <button class="btn small" data-act="mk-buy" data-k="${key}" data-i="${i}" ${o.lots > 0 && S.stones >= unit * o.lot ? '' : 'disabled'}>한 배치 매입 ${unit * o.lot}</button></div>`;
 }).join('');
 const goods = sellable(key);
 const wants = st.wants.filter(w => w.left > 0).map(w => ITEMS[w.id].name + ` (${w.left}) `).join(' · ');
 const sells = goods.map(it => `<div class="shop-row">${itemHTML(Object.assign({}, it, { pos: null }), 'preview mini')}<b>${esc(itemName(it))}</b>
 <span class="muted small">${it.stolen > 0 ? '장물 · ' : ''}${isFlawed(it) && knownFlaw(it) ? '문제 있음 · ' : ''}</span>${stoneTxt(dealerSellPrice(key, it))}
 <button class="btn small" data-act="mk-sell" data-k="${key}" data-uid="${it.uid}">처분</button></div>`).join('');
 openModal(() => modalHTML(`<div class="market">
 <div class="mk-head"><img src="${asset('scene', 'ghost_market')}" alt=""><div class="mk-who"><img src="${asset('chars', dd.portrait)}" alt="">
 <div><h3>${dd.name}</h3><p class="small">${dd.desc}</p>
 <p class="small muted">${isGhostNight() ? '오늘 밤 귀시가 열린다, 물건이 많다. ' : ''}${st.mod < 1 ? '너는 오늘 밤 좋은 값을 받아냈다. ' : st.mod > 1 ? '상대가 너를 경계한다, 값이 1할 비싸다. ' : ''}</p>
 <button class="btn small" data-act="mk-talk" data-k="${key}" ${st.talked ? 'disabled' : ''}>말솜씨 승부(${costText('talk')})</button></div></div></div>
 <nav class="mk-tabs">${tabs}</nav>
 <div class="mk-cols"><div><h4>상품 매입</h4>${offers}</div>
 <div><h4>처분</h4><p class="muted small">산다: ${wants || '오늘 밤은 그만 받는다'}</p>${sells || '<p class="muted small">네 손에 그가 원하는 물건이 없다.</p>'}</div></div>
 <div class="h-btns"><button class="btn primary" data-act="mk-leave">가게로</button></div></div>`, 'm-market'));
}

function showInspectResult(res) {
 const e = official('enforcer');
 openModal(() => modalHTML(`<div class="npc-talk"><img src="${asset('chars', e.portrait)}" alt="">
 <div><h3>${esc(e.name)} · 집법당 순찰</h3>${res.ignored ? '<p>그가 진열장 앞에 잠시 섰다. 눈이 네 물건을 훑고 지나갔고, 아무것도 못 본 척한다. “……좋아, 깨끗하군. ”</p>'
 : res.bribed ? '<p>“……오늘 이 가게는, 깨끗하다. ”</p>'
 : res.found.length ? `<p>“${res.found.map(esc).join(' · ')} 찾아냈다! 몰수하고 벌금 ${res.fine} 영석. 다음에 또 저지르면 목을 들고 오라고. ”</p>`
 : '<p>“흥, 사정을 아는군.” 순찰이 한 바퀴 뒤지고 빈손으로 떠났다.</p>'}
 <div class="h-btns"><button class="btn primary" data-act="inspect-done">순찰을 보낸다</button></div></div></div>`, 'm-npc'));
}

function openScavengeSelect() {
 openModal(() => modalHTML(`<h3>${icon('ic_scavenge')}밖에 나가 폐품을 줍는다</h3><div class="locs">
 ${allLocations().map(l => `<div class="loc" data-act="scav-go" data-id="${l.id}"><img src="${asset('scene', l.bg)}" alt="">
 <b>${l.name}</b><p class="small">${l.desc}</p><p class="muted small">뒤질 수 있다 ${l.tries}회 · 처음 위험 ${pct(l.danger)}${l.hazard.cond ? ` · 위험 가능: ${CONDS[l.hazard.cond[0]].name}<b class="bad">${deathWarn(l.hazard.cond[0])}</b>` : ''}</p></div>`).join('')}</div>
 ${condText('me') ? `<p class="bad small">${condText('me')}상처와 독을 안고 뒤진다, 힘이 더 들고 사고가 나기 쉽다. </p>` : ''}
 <div class="h-btns"><button class="btn ghost" data-act="modal-close">그만둔다</button></div>`, 'm-locs'));
}

function renderScavenge() {
 const sc = S.scav, loc = allLocations().find(l => l.id === sc.loc), o = scavOdds();
 const pend = pendingScavItem();
 modalHTML(`<h3>${icon('ic_scavenge')}${loc.name}</h3>
 <div class="scav"><div class="scav-bg"><img src="${asset('scene', loc.bg)}" alt="">
 <div class="scav-stats"><span>남은 ${sc.tries}회</span><span class="good">발견 ${pct(loc.find)}</span><span class="bad">위험에 처함 ${pct(o.danger)}</span></div></div>
 <div class="scav-side">
 ${gridHTML('basket', '바구니')}
 ${pend && !pend.pos ? `<div class="grid-label">손에(바구니에 넣기, 아니면 버린다)</div><div class="hand">${itemHTML(pend)}</div>` : ''}
 <ul class="log">${sc.lines.slice(-6).reverse().map(l => `<li class="${l.cls || ''}">${esc(l.text)}</li>`).join('')}</ul>
 <div class="h-btns">
 <button class="btn primary" data-act="scav-search" ${sc.tries > 0 && !sc.ended && !(pend && !pend.pos) ? '' : 'disabled'}>뒤진다</button>
 <button class="btn" data-act="scav-home">가게로</button>
 <span class="trash" data-drop="trash">버림</span></div></div></div>`, 'm-scav');
}

function showEnding() {
 const st = S.stats, d = diff(), start = STARTS.find(s => s.id === S.start);
 clearSave();
 openModal(() => modalHTML(`<div class="ending ${S.over.win ? 'win' : 'lose'}${S.over.scene ? ' has-scene' : ''}">
 ${S.over.scene ? `<img class="end-scene" src="${asset('scene', S.over.scene)}" alt="" onerror="this.remove()">` : ''}
 <img class="seal" src="${asset('ui', S.over.win ? 'ic_deed' : 'seal')}" alt="">
 <h2>${S.over.title}</h2><p>${S.over.text}</p>
 <div class="stats">
 <div><span>시작</span><b>${start.name} · ${d.name}</b></div>
 <div><span>버틴 날</span><b>${S.day}일</b></div>
 <div><span>총수입</span><b>${st.income}</b></div>
 <div><span>거래 건수</span><b>${st.sales}</b></div>
 <div><span>자산 평가</span><b>${netWorth()}</b></div>
 <div><span>감정 의뢰</span><b>${st.appraisals}</b></div>
 <div><span>순찰 조우</span><b>${st.inspections}</b></div>
 <div><span>경지 · 선명</span><b>${realmName()} · ${VIRTUE_NAME(S.virtue)}</b></div>
 <div><span>손에 묻은 목숨</span><b>${st.kills || 0}</b></div>
 <div><span>뒷배</span><b>${S.cliques.joined ? CLIQUES[S.cliques.joined].name : '—'}</b></div>
 <div><span>최고 한 건</span><b>${st.bestSale ? `${st.bestSale.name} ${st.bestSale.price}(제${st.bestSale.day}일)` : '—'}</b></div>
 <div><span>최고의 되팔기</span><b>${st.bestFlip ? `${st.bestFlip.name}: ${st.bestFlip.cost}→${st.bestFlip.price}` : '—'}</b></div>
 </div>
 ${profileHTML()}
 <div class="h-btns"><button class="btn primary" data-act="to-title">산문으로 돌아간다</button></div></div>`, 'm-ending'));
}

// ───────────── 结局画像 ─────────────

let PF = null; // 끝날 때 계산된 초상, 그림에서 눌러 꺼낸다

function profileHTML() {
 const sc = traitScores(), arc = archetype(sc), pts = wealthSeries();
 PF = { sc, pts };
 const top = sc.indexOf(arc.top);
 return `<div class="pf-sec">
 <h4>주인장 초상</h4>
 <div class="pf">
 <div class="pf-chart">${radarSVG(sc, top)}<div class="pf-read" id="pf-read">${traitRead(sc[top])}</div></div>
 <div class="pf-text">
 <b class="pf-name">${arc.name}</b>${arc.also ? `<span class="muted small">　얼마간 겸한다${arc.also.name}</span>` : ''}
 <p>${arc.text}</p>
 <ul class="pf-list">${sc.map((t, i) => `<li data-pf="${i}" class="${i === top ? 'on' : ''}"><span>${t.name}</span><b>${t.v}</b><small>${esc(t.basis)}</small></li>`).join('')}</ul>
 </div></div>
 <div class="pf">
 ${pts.length > 1 ? `<div class="pf-wealth"><h4>자산 추이</h4>${wealthSVG(pts)}<div class="pf-read" id="wl-read">${wealthRead(pts)}</div>
 <details class="wl-table"><summary>일별 명세</summary><table><tr><th>일</th><th>수입</th><th>지출</th><th>잔액</th></tr>
 ${S.stats.days.map(d => `<tr><td>제 ${d.day}일</td><td>+${d.income}</td><td>-${d.expense}</td><td>${d.stones}</td></tr>`).join('')}</table></details></div>` : ''}
 <div class="pf-text"><h4>다음 판</h4>
 <ul class="pf-tips">${nextTips(sc).map(t => `<li><b>${t.head}</b>${esc(t.text)}</li>`).join('')}</ul></div></div></div>`;
}

const traitRead = t => `<b>${t.name} ${t.v}</b> · ${esc(t.basis)}`;

// 蛛网图：七样脾性一圈，四道等分环；点顶点或名字看依据
function radarSVG(sc, on) {
 const R = 84, n = sc.length;
 const at = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [+(Math.cos(a) * r).toFixed(1), +(Math.sin(a) * r).toFixed(1)]; };
 const ring = f => sc.map((_, i) => at(i, R * f).join(',')).join(' ');
 const pts = sc.map((t, i) => at(i, R * t.v / 100));
 return `<svg class="radar" viewBox="-132 -112 264 226" role="img" aria-label="${sc.map(t => `${t.name}${t.v}`).join(', ')}">
 ${[0.25, 0.5, 0.75, 1].map(f => `<polygon class="rd-grid" points="${ring(f)}"/>`).join('')}
 ${sc.map((_, i) => { const [x, y] = at(i, R); return `<line class="rd-grid" x1="0" y1="0" x2="${x}" y2="${y}"/>`; }).join('')}
 <polygon class="rd-area" points="${pts.map(p => p.join(',')).join(' ')}"/>
 ${sc.map((t, i) => {
 const [x, y] = at(i, R + 17), anchor = x > 4 ? 'start' : x < -4 ? 'end' : 'middle';
 return `<text class="rd-label" data-pf="${i}" x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle">${t.name}</text>`;
 }).join('')}
 ${pts.map(([x, y], i) => `<circle class="rd-dot" cx="${x}" cy="${y}" r="4"/><circle class="rd-hit ${i === on ? 'on' : ''}" data-pf="${i}" cx="${x}" cy="${y}" r="13"/>`).join('')}
 </svg>`;
}

// 자산 추이：每夜的영석，标出최고与마무리；按住或悬停看某一日
const WL = { w: 320, h: 132, l: 40, r: 66, t: 16, b: 20 };

function wealthScale(pts) {
 const hi = Math.max(1, ...pts.map(p => p.v)), lo = Math.min(0, ...pts.map(p => p.v));
 const mag = 10 ** Math.floor(Math.log10(hi / 2)), step = [1, 2, 5, 10].map(m => m * mag).find(s => s * 2 >= hi);
 const top = step * 2, d0 = pts[0].day, d1 = pts[pts.length - 1].day;
 return {
 ticks: [0, step, top],
 x: day => WL.l + (day - d0) / Math.max(1, d1 - d0) * (WL.w - WL.l - WL.r),
 y: v => WL.t + (1 - (v - lo) / (top - lo)) * (WL.h - WL.t - WL.b),
 };
}

function wealthSVG(pts) {
 const s = wealthScale(pts), last = pts[pts.length - 1];
 const hi = pts.reduce((m, p) => p.v > m.v ? p : m, pts[0]);
 const line = pts.map((p, i) => `${i ? 'L' : 'M'}${s.x(p.day).toFixed(1)},${s.y(p.v).toFixed(1)}`).join('');
 const base = s.y(0).toFixed(1);
 return `<svg class="wealth" viewBox="0 0 ${WL.w} ${WL.h}" role="img" aria-label="자산 추이: 최고 ${hi.v} 영석(제 ${hi.day}일), 마무리 ${last.v} 영석">
 ${s.ticks.map(v => `<line class="rd-grid" x1="${WL.l}" x2="${WL.w - WL.r}" y1="${s.y(v)}" y2="${s.y(v)}"/><text class="wl-tick" x="${WL.l - 6}" y="${s.y(v)}" text-anchor="end" dominant-baseline="middle">${v}</text>`).join('')}
 <text class="wl-tick" x="${WL.l}" y="${WL.h - 4}">제 ${pts[0].day}일</text>
 <text class="wl-tick" x="${WL.w - WL.r}" y="${WL.h - 4}" text-anchor="end">제 ${last.day}일</text>
 <path class="wl-area" d="${line}L${s.x(last.day).toFixed(1)},${base}L${s.x(pts[0].day).toFixed(1)},${base}Z"/>
 <path class="wl-line" d="${line}"/>
 ${hi !== last ? `<text class="wl-note" x="${s.x(hi.day)}" y="${s.y(hi.v) - 7}" text-anchor="middle">최고 ${hi.v}</text>` : ''}
 <circle class="rd-dot" cx="${s.x(last.day)}" cy="${s.y(last.v)}" r="4"/>
 <text class="wl-note" x="${s.x(last.day) + 8}" y="${s.y(last.v)}" dominant-baseline="middle">마무리 ${last.v}</text>
 <line class="wl-cross" id="wl-cross" y1="${WL.t}" y2="${WL.h - WL.b}"/><circle class="rd-dot wl-cross" id="wl-dot" r="4"/>
 <rect class="wl-hit" x="${WL.l}" y="0" width="${WL.w - WL.l - WL.r}" height="${WL.h}"/>
 </svg>`;
}

function wealthRead(pts, p) {
 if (p) return `<b>제 ${p.day}일</b> · 영석 ${p.v}`;
 const hi = pts.reduce((m, q) => q.v > m.v ? q : m, pts[0]);
 return `최고 <b>${hi.v}</b>(제 ${hi.day}일) · 끝 <b>${pts[pts.length - 1].v}</b>`;
}

// 点选蛛网图的顶点、名字或下面那一行：亮起这一样，读出依据
function pfPick(e) {
 const el = PF && e.target.closest && e.target.closest('.pf [data-pf]');
 if (!el) return;
 const i = +el.dataset.pf;
 document.querySelectorAll('.pf [data-pf].on').forEach(x => x.classList.remove('on'));
 document.querySelectorAll(`.pf li[data-pf="${i}"], .pf .rd-hit[data-pf="${i}"]`).forEach(x => x.classList.add('on'));
 $('#pf-read').innerHTML = traitRead(PF.sc[i]);
}

// 자산 추이上按住或悬停：十字线落到最近的那一日；移开就收起
function wlTrack(e) {
 const cross = $('#wl-cross');
 if (!PF || !cross) return;
 const hit = e.target.closest && e.target.closest('.wealth'), dot = $('#wl-dot');
 if (!hit) { cross.classList.remove('on'); dot.classList.remove('on'); $('#wl-read').innerHTML = wealthRead(PF.pts); return; }
 const r = hit.getBoundingClientRect(), s = wealthScale(PF.pts), x = (e.clientX - r.left) / r.width * WL.w;
 const p = PF.pts.reduce((m, q) => Math.abs(s.x(q.day) - x) < Math.abs(s.x(m.day) - x) ? q : m, PF.pts[0]);
 cross.setAttribute('x1', s.x(p.day)); cross.setAttribute('x2', s.x(p.day));
 dot.setAttribute('cx', s.x(p.day)); dot.setAttribute('cy', s.y(p.v));
 cross.classList.add('on'); dot.classList.add('on');
 $('#wl-read').innerHTML = wealthRead(PF.pts, p);
}

document.addEventListener('pointerover', pfPick);
document.addEventListener('pointerdown', e => { pfPick(e); wlTrack(e); });
document.addEventListener('pointermove', wlTrack);

// 结束检查：任何操作后若游戏结束则弹出结局
function checkOver() {
 if (S && S.over && !$('.m-ending')) { showEnding(); return true; }
 return false;
}

// ───────────── 标题与开局 ─────────────

function showTitle() {
 S = null;
 $('#game').classList.add('hidden');
 $('#title-screen').classList.remove('hidden');
 closeModal();
 $('#title-screen').innerHTML = `<img class="title-bg" src="${asset('scene', 'title_bg')}" alt="">
 <div class="title-box"><h1>마문 전당포</h1><h2>· 출처 불명 ·</h2>
 <p>인, 선, 마, 요 네 세력이 다툰다. 너는 혈살종 잡역 구역에 전당포를 열었다. <br>임대료가 계속 오른다 - 가게 문서를 사기 전까지, 집법당에 끌려가지 마. </p>
 <div class="title-btns">${hasSave() ? '<button class="btn primary big" data-act="continue">이어하기</button>' : ''}
 <button class="btn big ${hasSave() ? '' : 'primary'}" data-act="new">새 판을 시작한다</button></div></div>`;
}

function showSetup() {
 const pickd = { diff: 'normal', start: 'apprentice' };
 const render = () => modalHTML(`<h3>새 판 시작</h3>
 <h4>세도</h4><div class="cards">${DIFFICULTIES.map(d => `<div class="card ${pickd.diff === d.id ? 'on' : ''}" data-act="set-diff" data-id="${d.id}">
 <b>${d.name}</b><p class="small">${d.desc}</p><p class="muted small">가게 문서 ${d.deed} · 임대료 ×${d.rent}</p></div>`).join('')}</div>
 <h4>출신</h4><div class="cards starts">${STARTS.map(s => `<div class="card ${pickd.start === s.id ? 'on' : ''}" data-act="set-start" data-id="${s.id}">
 <b>${s.name}${s.tag ? `<span class="tag real">${s.tag}</span>` : ''}</b><p class="small">${s.desc}</p>
 <p class="muted small">시작 수 ${s.stones} 영석${(s.machines || []).length ? ' · ' + s.machines.map(m => MACHINES[m].name).join(' · ') : ''}</p></div>`).join('')}</div>
 <div class="h-btns"><button class="btn ghost" data-act="modal-close">돌아가기</button><button class="btn primary" data-act="start">입국</button></div>`, 'm-setup');
 openModal(render);
 HANDLERS['set-diff'] = el => { pickd.diff = el.dataset.id; render(); };
 HANDLERS['set-start'] = el => { pickd.start = el.dataset.id; render(); };
 HANDLERS.start = () => { newGame(pickd.diff, pickd.start); enterGame(); showIntro(); };
}

function showIntro() {
 openModal(() => modalHTML(`<div class="npc-talk"><img src="${asset('chars', 'landlord')}" alt="">
 <div><h3>전 집사</h3>
 <p>“새로 온 주인장? 규칙은 그대로다: 가게는 종문의 것, 임대료는 이레마다 거둔다, 회차마다 오른다. 모으면 <b>${deedPrice()}</b> 영석, 가게 문서가 네 것이다. ”</p>
 <p>“그리고 - 선문 물건은 건드리지 마, 집법당의 눈은 혈월보다 밝다. 요족 놈들은 짐승이야……네가 알아서 판단해. ”</p>
 <p class="muted small">안내: 아이템을 끌어 칸을 정리하세요. 진열장이 손님 흐름을 결정합니다. 밤에는 설비가 「작업장」 순서로 영력을 소모하며 작동합니다. 아무 물건 위에 마우스를 올리면 상세 정보를 봅니다. <br>
 잡역 구역의 모든 사람은 네가 한 일을 기억합니다. 「인물」 페이지에서 너와의 왕래와 각자의 운명을 볼 수 있습니다. </p>
 <div class="h-btns"><button class="btn primary" data-act="modal-close">열쇠를 받는다</button></div></div></div>`, 'm-npc'));
}

function enterGame() {
 $('#title-screen').classList.add('hidden');
 $('#game').classList.remove('hidden');
 sel = null; tab = 'display';
 closeModal();
 renderAll();
}

// ───────────── 动作分发 ─────────────

// 손에 아직 넣을 곳 없는 물건을 들고 있다：先腾地方再往下走，把库房翻出来给你收拾
function handBusy() {
 if (!handItems().length) return false;
 toast('손에 아직 넣을 곳 없는 물건을 들고 있다, 먼저 자리를 만든다', 'bad');
 tab = 'store'; front = 'main'; renderAll();
 return true;
}

const machineById = el => S.machines.find(m => m.mid === +el.dataset.mid);

const HANDLERS = {
 tab: el => { tab = el.dataset.tab; front = 'main'; renderSide(); },
 'speech-more': () => { talk.i++; renderSpeech(talk.text); },
 'm-desc': el => el.classList.toggle('open'),
 page: el => { pages[el.dataset.key] = (pages[el.dataset.key] || 0) + +el.dataset.d; modal ? modal() : renderSide(); },
 sub: el => { subs[el.dataset.key] = el.dataset.id; modal ? modal() : renderSide(); },
 new: () => showSetup(),
 continue: () => { load(); enterGame(); },
 'to-title': () => showTitle(),
 'modal-close': () => { closeModal(); renderAll(); },
 menu: () => openModal(() => modalHTML(`<h3>문서</h3><p>진행 상황은 매일 아침 자동 저장된다.</p>
 <div class="h-btns"><button class="btn" data-act="lore-book">견문록(${Object.keys(S.lore || {}).length})</button><button class="btn" data-act="save-quit">저장하고 산문으로</button><button class="btn ghost" data-act="modal-close">경영을 계속한다</button></div>`)),
 'save-quit': () => { save(); showTitle(); },
 open: () => { if (handBusy()) return; openShop(); closeModal(); HANDLERS.next(); },
 next: () => {
 if (handBusy()) return;
 const c = nextCustomer();
 if (!c) toast('오늘은 손님이 없다');
 if (c && c.kind === 'story') { renderAll(); HANDLERS['story-talk'](); return; }
 if (c && c.kind === 'sell' && c.wanted) toast(`이 사람은 수배범이다, 현상금 ${c.wanted} 영석`, 'bad');
    // 竖屏：来客谈买卖时，下方直接摊开库房，方便把货放上货盘
 if (LAYOUT === 'tall' && c && ['buy', 'sell'].includes(c.kind)) tab = 'store';
 front = 'counter';
 renderAll();
 },
 close: () => {
 if (handBusy()) return;
 if (S.customer) { toast('카운터 앞에 손님이 있다, 먼저 사람을 보낸다'); return; }
 if (S.queue.length && !confirm(`문 밖에 손님이 ${S.queue.length}명 있는데, 지금 마감할까?`)) return;
 closeShop(); tab = 'workshop'; front = 'counter'; renderAll();
 },
 dismiss: () => { dismissCustomer(false); renderAll(); },
 deal: () => openDeal(),
 good: el => { const uid = +el.dataset.uid; S.customer.item = uid; if (touchy) peek = peek === uid ? null : uid; renderAll(); },
 'take-toggle': () => { toggleTake(S.customer, S.customer.item); renderAll(); },
 'to-tray': () => {
 const it = S.items[sel], spot = findSpot('tray', it);
 if (!spot) { toast('진열판에 놓을 곳이 없다', 'bad'); return; }
 toTray(it, spot.x, spot.y); renderAll();
 },
 flatter: () => tiredOr('flatter', () => { const r = flatter(S.customer); feel(S.customer, r.ok ? 'pleased' : 'angry'); toast(r.text, r.ok ? 'good' : 'bad'); renderAll(); }),
 'haggle-close': () => { closeModal(); renderAll(); checkOver(); },
 report: () => { reportWanted(S.customer); renderAll(); toast(`너는 아는 척하지 않고 사람을 시켜 집법당에 알렸다. 장사는 계속한다. ${ta(personOf(S.customer))}이(가) 나가면 상금은 알아서 온다`, 'warn'); },
 'appraise-counter': () => tiredOr('appraise', () => openAppraise('counter', S.customer.item)),
 'appraise-commission': () => tiredOr('appraise', () => openAppraise('commission', S.customer.item)),
 'appraise-own': () => tiredOr('appraise', () => openAppraise('own', sel)),
 'inspect-own': () => tiredOr('inspect', () => HANDLERS['inspect-own-go']()),
 'inspect-own-go': () => {
 const it = S.items[sel], r = quickInspect(it);
 toast(r.laced ? `걸러냈다: ${itemName(it)}에 남이 ${LACE[r.laced].verb}를 해뒀다! 이 손해를 삼키고, 헐값에 팔거나, 좋은 물건인 척 되팔거나, 아니면 뜯어서 그의 수법을 배운다. 네가 정한다.`
 : r.found ? `걸러냈다: ${itemName(it)}은(는) 하급을 상급으로 둔갑시켰다. 겉은 ${it.sq}, 실제로는 ${it.q}뿐!` : `네 안목으로는(${LENS_NAMES[r.lv]}) ${itemName(it)}의 흠을 찾지 못했다.`, r.found || r.laced ? 'bad' : '');
 renderAll();
 },
 'inspect-item': () => tiredOr('inspect', () => HANDLERS['inspect-item-go']()),
 'inspect-item-go': () => {
 const it = customerItem(), r = quickInspect(it);
 toast(r.laced ? `이 물건에 남이 ${LACE[r.laced].verb}를 해뒀다!` : r.found ? `하급을 상급으로! 겉은 ${it.sq}, 실제로는 ${it.q}뿐.` : `네 안목으로는(${LENS_NAMES[r.lv]}), 흠을 찾지 못했다.`, r.found || r.laced ? 'bad' : '');
 renderAll();
 },
 'dispute-flaw': () => tiredOr('dispute', () => HANDLERS['dispute-go']()),
 'dispute-go': () => {
 const c = S.customer, r = disputeFlaw(c);
 feel(c, r.angry || r.caught ? 'angry' : 'afraid');
 if (r.angry || r.caught) {
 toast(r.angry ? `${c.name}화가 나서 소리쳤다: “무슨 뜻이야? ”` : `${c.name}네가 잡은 흠을 하나하나 반박했다. `, 'bad');
 if (c.patience <= 0) dismissCustomer(false);
 } else toast(r.bluff ? `${c.name}네 말에 찔려, 3할을 깎아줬다. ` : `${c.name}인정했다, 개시가를 낮췄다 ${customerItem().ask}. `, 'good');
 renderAll();
 },
 consume: () => { const err = consume(S.items[sel]); if (err) toast(err, 'bad'); else sel = null; renderAll(); },
 bottle: () => { const err = bottle(S.items[sel]); toast(err || '옥정병에 담았다, 수사들이 좋은 값을 쳐줄 것이다. ', err ? 'bad' : 'good'); renderAll(); },
 erase: () => { const err = eraseMark(S.items[sel]); toast(err || '낙인을 지웠다, 출처가 이제 깨끗하다. ', err ? 'bad' : 'good'); renderAll(); },
 seal: () => { const it = S.items[sel], err = sealItem(it); toast(err || `${itemName(it)}정파 봉인을 붙였다 - 안목이 모자란 사람은, 명문 정품으로만 여긴다. `, err ? 'bad' : 'good'); renderAll(); },
 retreat: () => { const err = toggleRetreat(); if (err) toast(err, 'bad'); renderAll(); },
 market: () => { if (handBusy()) return; const err = visitMarket(); if (err) { toast(err, 'bad'); return; } openMarket('ghost'); renderTopbar(); },
 'mk-tab': el => openMarket(el.dataset.k),
 'mk-buy': el => { const err = buyLot(el.dataset.k, +el.dataset.i); if (err) toast(err, 'bad'); openMarket(el.dataset.k); renderAll(); },
 'mk-sell': el => { const r = sellToDealer(el.dataset.k, S.items[el.dataset.uid]); if (r.err) toast(r.err, 'bad'); else toast(`처분했다. ${r.price} 영석 획득`, 'good'); openMarket(el.dataset.k); renderAll(); },
 'mk-talk': el => { const r = talkDealer(el.dataset.k); toast(r.err || r.text, r.err || !r.ok ? 'bad' : 'good'); openMarket(el.dataset.k); renderTopbar(); },
 'mk-leave': () => { closeModal(); renderAll(); },
 redeem: el => { const err = redeemMerit(el.dataset.f, +el.dataset.i); toast(err || '교환 성공, 창고에 넣었다', err ? 'bad' : 'good'); renderAll(); },
 probe: () => { const r = probe(S.customer); if (r.err) toast(r.err, 'bad'); else showIntel(r); renderAll(); },
 'secret-report': () => { const r = reportSecret(S.customer); if (r.err) toast(r.err, 'bad'); else showIntel(r); renderAll(); },
 'secret-blackmail': () => { const c = S.customer, r = blackmail(c); feel(c, r.cls === 'good' ? 'afraid' : 'angry'); showIntel(r); renderAll(); checkOver(); },
 'secret-keep': () => { showIntel(keepSecret(S.customer)); renderAll(); },
 'read-book': () => { const it = S.items[sel], err = readBook(it); if (err) toast(err, 'bad'); else { sel = null; toast('다 읽었다.', 'good'); } renderAll(); },
 study: () => { const it = S.items[sel], err = studyFake(it); if (err) toast(err, 'bad'); else { if (!S.items[sel]) sel = null; toast('네가 요령을 알아냈다. ', 'good'); } renderAll(); },
 'buy-book': el => {
 const p = +el.dataset.p;
 if (S.stones < p || ITEMS[el.dataset.id].book.lv > BOOK_SHOP_MAX) return;
 const it = giveItem(el.dataset.id);
 if (it) { spend(p, `${itemName(it)}을(를) 샀다.`); toast(`${itemName(it)}을(를) 창고에 넣었다. 고르면 탐독할 수 있다`, 'good'); }
 renderAll();
 },
 'ap-done': () => { dismissCustomer(false); closeModal(); renderAll(); },
 'ap-buyback': () => { S.customer.take = [S.customer.item]; openDeal(); },
 inspect: () => { const r = runInspection(0); showInspectResult(r); },
 bribe: el => { const r = runInspection(+el.dataset.n); showInspectResult(r); },
 'inspect-done': () => { dismissCustomer(false); closeModal(); renderAll(); checkOver(); },
 scavenge: () => { if (!handBusy()) openScavengeSelect(); },
 'scav-go': el => { startScavenge(el.dataset.id); openModal(renderScavenge); },
 'scav-search': () => {
 const r = scavSearch();
 if (r && r.hazard) toast(r.hazard.text, 'bad');
 if (r && r.escaped) toast('둔지부가 타자마자, 너는 위험한 곳에서 빠져나왔다', '');
 if (r && r.tired) toast(r.tired, 'bad');
 if (checkOver()) return;
 renderScavenge(); renderTopbar();
 },
 'scav-home': () => { endScavenge(); closeModal(); renderAll(); checkOver(); },
 sleep: () => {
 if (handBusy()) return;
 const night = dueStories('night')[0];
 if (night) { openStory(night, () => HANDLERS.sleep()); return; }
 const rep = nightResolve();
 sel = null;
 renderAll();
 if (checkOver()) return;
 showReport(rep);
 },
 'story-talk': () => openStory(S.customer.key, () => { dismissCustomer(false); renderAll(); }),
 'story-done': () => {
 closeModal(); renderAll();
 if (checkOver()) return;
 const done = storyDone; storyDone = null;
 if (done) done();
 },
 person: el => openPerson(el.dataset.pid),
 dao: () => openDao(),
 cultivate: el => {
 const it = S.items[el.dataset.uid];
 if (it.id === realm().key && !(flawedKey(it) && knownFlaw(it)) && !confirm(`${itemName(it)}네 경지 돌파의 열쇠다, 정말 바로 복용할까? `)) return;
 const err = cultivate(it); if (err) toast(err, 'bad'); else if (!S.items[sel]) sel = null; if (modal) openDao(); renderAll(); },
 breakthrough: () => { const r = breakthrough(); if (r.err) { toast(r.err, 'bad'); return; } closeModal(); showIntel({ text: r.text, cls: r.ok ? 'good' : 'bad' }); renderAll(); },
 kill: () => {
 const c = S.customer, p = personOf(c);
 if (!confirm(`${p.name}에게 손을 쓸까? 죽이고 빼앗는다. 음덕을 해치고, 들키면 큰 화다.`)) return;
 feel(c, 'afraid');
 const r = killPerson(p, 'counter');
 if (r.err) { toast(r.err, 'bad'); return; }
    // 得手了就不会再从门口走出去；逃掉的才带着惊惶站一会儿
 if (r.ok) { parting = null; shown = null; $('#portrait').style.display = 'none'; }
 if (sel && !S.items[sel]) sel = null;
 showIntel({ text: r.text, cls: r.ok ? 'good' : 'bad' }); renderAll(); checkOver();
 },
 ambush: el => {
 const p = S.people[el.dataset.pid];
 if (!confirm(`오늘 밤 길을 막아 죽인다${p.name}? `)) return;
 const r = killPerson(p, 'night');
 if (r.err) { toast(r.err, 'bad'); return; }
 showIntel({ text: r.text, cls: r.ok ? 'good' : 'bad' }); renderAll(); checkOver();
 },
 soulmark: () => { const r = soulMark(personOf(S.customer)); if (r.err) toast(r.err, 'bad'); else showIntel({ text: r.text, cls: r.ok ? 'good' : 'bad' }); renderAll(); checkOver(); },
 'file-secret': el => { const it = makeIntel('secret', { p: S.people[el.dataset.pid] }); toast(`한 부로 적어냈다${itemName(it)}, 창고에 넣는다`, 'good'); openPerson(el.dataset.pid); renderAll(); },
 release: el => { release(S.people[el.dataset.pid]); openPerson(el.dataset.pid); renderAll(); },
 debt: el => { const p = S.people[el.dataset.pid]; toast(collectDebt(p, el.dataset.how)); openPerson(p.pid); renderAll(); },
 'plea-help': () => { const p = personOf(S.customer), err = helpWeak(S.customer); if (err) toast(err, 'bad'); else toast(`${ta(p)}이(가) 절을 하고 거듭 감사하며 떠났다`, 'good'); renderAll(); },
 'plea-lend': () => { const err = lendTo(S.customer); if (err) toast(err, 'bad'); renderAll(); },
 'plea-labor': () => { const p = personOf(S.customer); indenture(p); toast(`${p.name}네 뒤뜰에 들어왔다, 앞으로 너를 위해 화로를 때고 물건을 나른다`); renderAll(); },
 'plea-away': () => { turnAway(S.customer); renderAll(); },
 'cq-tribute': el => { const err = cliqueTribute(el.dataset.k, +el.dataset.n); if (err) toast(err, 'bad'); renderAll(); },
 'cq-offer': el => { const r = cliqueOffer(el.dataset.k, S.items[sel]); sel = null; toast(r.text, r.bad ? 'bad' : 'good'); renderAll(); },
 'cq-join': el => { const err = joinClique(el.dataset.k); toast(err || `너는 ~에 투자했다${CLIQUES[el.dataset.k].head}문하`, err ? 'bad' : 'good'); renderAll(); },
 'cq-leak': el => { const err = leakDirt(S.items[sel], el.dataset.k); if (err) toast(err, 'bad'); else { sel = null; toast(`${CLIQUES[el.dataset.k].head}이(가) 내막을 받아들였다. 눈에 광이 난다`, 'good'); } renderAll(); },
 'opp-deliver': el => { const r = deliverOpp(findOpp(el.dataset.key), S.items[el.dataset.uid]); if (sel && !S.items[sel]) sel = null; toast(r.text, r.bad ? 'bad' : 'good'); renderAll(); },
 'opp-take': el => { const r = takeOpp(findOpp(el.dataset.key)); toast(r.err || r.text, r.err ? 'bad' : 'good'); renderAll(); },
 'power-swap': () => {
 const it = S.items[sel], low = weakestCrystal(), at = it.pos;
 placeItem(it, 'power', low.pos.x, low.pos.y); placeItem(low, at.g, at.x, at.y);
 toast(`영정을 진안에 끼운다, 교체한 그 개(충전 ${low.charge || 0}) 원래 자리에 놓았다`, 'good');
 sel = peek = null; renderAll();
 },
 'move-to': el => {
 const it = S.items[sel], gid = el.dataset.g, sp = findSpot(gid, it);
 if (!sp) { toast('놓을 곳이 없다', 'bad'); return; }
 placeMoved(it, gid, sp.x, sp.y); sel = peek = null; renderAll();
 },
  // 같은 곳의同种货一并넣는다사료格：一份一份叠，叠满了另起一格，放不下的留在原处
 'move-all': el => {
 const it = S.items[sel], gid = el.dataset.g, list = itemsIn(it.pos.g).filter(o => o.id === it.id);
 let n = 0;
 for (const o of [it, ...list.filter(o => o !== it)]) { const sp = findSpot(gid, o); if (!sp) break; placeMoved(o, gid, sp.x, sp.y); n++; }
 toast(n < list.length ? `${n}개를 넣었다. 아직 ${list.length - n}개가 안 들어간다` : `${itemName(it)} ${n}개를 모두 넣었다`, n < list.length ? 'bad' : 'good');
 sel = peek = null; renderAll();
 },
  // 整摞取出：每份各占库房一格，품질은 그대로；库房满了放地上，再满就留在原处
 unpile: () => {
 const pile = stackOf(S.items[sel]);
 let n = 0;
 for (const o of pile) { const gid = ['store', 'floor'].find(x => findSpot(x, o)); if (!gid) break; const sp = findSpot(gid, o); placeMoved(o, gid, sp.x, sp.y); n++; }
 toast(n < pile.length ? `${n}개를 꺼냈다. 창고와 바닥이 모두 가득 찼다. 남은 ${pile.length - n}개` : `${n} 개를 모두 거둬들였다`, n < pile.length ? 'bad' : 'good');
 sel = peek = null; renderAll();
 },
 tidy: () => { if (!tidy()) toast('이미 빽빽하게 놓았다, 더 자리가 필요하면 팔거나 버려야 한다', 'bad'); renderAll(); },
 'trash-sel': () => { const it = S.items[sel]; if (knownValue(it) > 30 && !confirm(`${itemName(it)}을(를) 버릴까?`)) return; destroyItem(it); sel = null; renderAll(); },
 'buy-intel': el => { const err = buyIntel(+el.dataset.i); toast(err || '밀보가 창고에 들어갔다, 마우스를 올리면 내용을 본다', err ? 'bad' : 'good'); renderAll(); },
 'gift-open': el => openGift(el.dataset.pid),
 'heal-open': () => openModal(openHeal),
 'lore-book': () => openModal(openLoreBook),
 'ask-lore': el => {
 const p = S.people[el.dataset.pid], o = loreOffer(p, loreTip(el.dataset.id));
 if (o.kind === 'sell' && o.price > 150 && !confirm(`${o.price} 영석을 내고 ${p.name}에게 가르침을 청할까?`)) return;
 const r = askLore(p, el.dataset.id, o.kind === 'sell');
 if (r.err) toast(r.err, 'bad'); else if (r.text) { showIntel({ text: r.text, cls: 'good' }); }
 renderAll();
 },
 'fate-open': () => openModal(openFate),
 'heal-use': el => {
 const it = S.items[el.dataset.uid], err = consume(it);
 if (err) toast(err, 'bad'); else if (sel === it.uid) sel = null;
 renderAll();
 },
 'seek-heal': el => {
 const r = seekHealer(S.people[el.dataset.pid]);
 toast(r.err || r.text, r.err ? 'bad' : 'good'); renderAll();
 },
 treat: el => {
 const p = S.people[el.dataset.pid], it = S.items[el.dataset.uid], k = cureBy(it, p), name = itemName(it);
 if (sel === it.uid) sel = null;
 const sev0 = condSev(p, k), r = giveGift(p, it), left = condSev(p, k);
 toast(r.caught ? `${p.name}약에 손을 댄 걸 알아챘다! ` : left >= sev0 ? `${p.name}복용한다${name}, 나아지지 않는다`
 : left ? `${p.name}이(가) ${name}을(를) 복용했다. ${CONDS[k].name}이(가) ${CONDS[k].grade[left - 1]}(으)로 줄었다(호감 +${r.gain})` : `${p.name}이(가) ${name}을(를) 복용했다. ${CONDS[k].name}이(가) 나았다(호감 +${r.gain})`, r.caught || left >= sev0 ? 'bad' : left ? 'warn' : 'good');
 openPerson(p.pid); renderAll();
 },
 'gift-give': el => {
 const p = S.people[el.dataset.pid], it = S.items[el.dataset.uid];
 if (knownValue(it) > 300 && !confirm(`${itemName(it)}을(를) ${p.name}에게 줄까?`)) return;
 const r = giveGift(p, it);
 if (sel === it.uid) sel = null;
 toast(r.caught ? `${p.name}이(가) 선물에 손을 댄 걸 알아챘다!` : `${p.name}이(가) 받았다. 호감 +${r.gain}`, r.caught ? 'bad' : 'good');
 openPerson(p.pid); renderAll();
 },
 'gift-stones': el => {
 const p = S.people[el.dataset.pid], gain = giveStones(p, +el.dataset.n);
 toast(`${p.name}이(가) 영석을 받았다. 호감 +${gain}`, 'good'); openPerson(p.pid); renderAll();
 },
 command: el => {
 const p = S.people[el.dataset.pid], r = runCommand(p, el.dataset.id, el.dataset.lever);
 toast(gx(p, r.text), r.exposed ? 'bad' : 'good'); openPerson(p.pid); renderAll(); checkOver();
 },
 uncontrol: el => { releaseControl(S.people[el.dataset.pid]); openPerson(el.dataset.pid); renderAll(); },
 lace: () => openLace(),
 'lace-do': el => { const err = laceWith(S.items[sel], S.items[el.dataset.uid]); if (err) { toast(err, 'bad'); return; } closeModal(); renderAll(); toast('재료는 넣었다. 밖에서 보면, 아무것도 알아볼 수 없다. '); },
 'report-ok': () => {
 closeModal();
 if (S.landlordVisit) { S.landlordVisit = false; showLandlord(); }
 tab = 'display';
 renderAll();
 },
 'm-open': el => { openMid = el.dataset.mid === 'array' ? 'array' : +el.dataset.mid; renderSide(); },
 'm-up': el => { moveMachine(machineById(el), -1); renderAll(); },
 'm-down': el => { moveMachine(machineById(el), 1); renderAll(); },
 'm-toggle': el => { const m = machineById(el); m.on = !m.on; renderAll(); },
 'm-remove': el => {
 const m = machineById(el);
 if (confirm(`철거${MACHINES[m.type].name}? 3할의 헌 자재 값만 돌려받는다. `)) { removeMachine(m); renderAll(); }
 },
 collect: el => { collectPuppetCash(machineById(el)); renderAll(); },
 'buy-supply': el => { const err = buySupply(S.supply[+el.dataset.i]); if (err) toast(err, 'bad'); renderAll(); },
 'gu-seal': el => { const m = machineById(el); m.seal = !m.seal; toast(m.seal ? '독 단지를 봉한다: 오늘 밤부터 고충이 서로 잡아먹는다, 가장 흉한 것이 가장 약한 것을 삼켰다' : '독 단지를 연다: 평소대로 먹인다', m.seal ? 'bad' : ''); renderAll(); },
 'buy-stall': el => { const m = S.machines.find(x => x.mid === +el.dataset.mid), err = buyStall(m); toast(err || `${MACHINES[m.type].name}한 칸을 늘렸다`, err ? 'bad' : 'good'); renderAll(); },
 'buy-machine': el => { const err = buyMachine(el.dataset.type); if (err) toast(err, 'bad'); else { tab = 'workshop'; toast('설비가 뒤뜰에 설치됐다', 'good'); } renderAll(); },
 'buy-upgrade': el => { const err = buyUpgrade(el.dataset.id); if (err) toast(err, 'bad'); renderAll(); },
 'sell-broker': () => {
 const it = S.items[sel];
 if (knownValue(it) > 150 && !confirm(`4할로 깎아 행상에게 판다, 확인? `)) return;
 sellToBroker(it); sel = null; renderAll();
 },
 'pay-rent': () => { payRentEarly(); renderAll(); },
 'buy-deed': () => { if (buyDeed()) { renderAll(); checkOver(); } },
};

document.addEventListener('click', e => {
 const el = e.target.closest('[data-act]');
 if (!el || el.disabled) return;
 const fn = HANDLERS[el.dataset.act];
 if (fn) fn(el);
  // 卡上的按钮打开了弹窗：卡收起，免得压在弹窗上
 if (S && peek && modal && el.closest('#itemcard')) peek = null;
 if (S) renderCard();
});

// ───────────── 拖放 ─────────────

let drag = null;

function gridAt(x, y) {
 const el = document.elementFromPoint(x, y);
 return el && (el.closest('[data-gid]') || el.closest('[data-drop]'));
}

document.addEventListener('pointerdown', e => {
 const el = e.target.closest('.item[data-uid]');
 if (!el || e.button !== 0 || el.classList.contains('locked') || el.classList.contains('preview')) return;
 const it = S.items[el.dataset.uid];
 if (!it) return;
 const r = el.getBoundingClientRect(), cell = CELL * scale;
 drag = { it, el, sx: e.clientX, sy: e.clientY, started: false, tab0: tab, front0: front,
 offX: Math.min(ITEMS[it.id].w - 1, Math.floor((e.clientX - r.left) / cell)),
 offY: Math.min(ITEMS[it.id].h - 1, Math.floor((e.clientY - r.top) / cell)) };
 e.preventDefault();
});

document.addEventListener('pointermove', e => {
 if (!drag) { moveTip(e); return; }
 const cell = CELL * scale, d = ITEMS[drag.it.id];
 if (!drag.started) {
 if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
 drag.started = true;
 hideTip();
 if (peek) { peek = null; renderCard(); }
 drag.ghost = document.createElement('div');
 drag.ghost.className = 'drag-ghost';
 drag.ghost.style.width = `${d.w * cell}px`;
 drag.ghost.style.height = `${d.h * cell}px`;
 drag.ghost.innerHTML = `<img src="${asset('items', itemIcon(drag.it))}" alt="">`;
 document.body.appendChild(drag.ghost);
 drag.el.classList.add('dragging');
 }
 drag.ghost.style.left = `${e.clientX - (drag.offX + 0.5) * cell}px`;
 drag.ghost.style.top = `${e.clientY - (drag.offY + 0.5) * cell}px`;
 dragHover(e.clientX, e.clientY);
 document.querySelectorAll('.drop-hint').forEach(h => h.remove());
 document.querySelectorAll('.trash.hot').forEach(h => h.classList.remove('hot'));
 drag.target = null;
 const tgt = gridAt(e.clientX, e.clientY);
 if (!tgt) return;
 if (tgt.dataset.drop === 'trash') { tgt.classList.add('hot'); drag.target = { trash: true }; return; }
 const gid = tgt.dataset.gid, r = tgt.getBoundingClientRect();
 const x = Math.floor((e.clientX - r.left) / cell) - drag.offX, y = Math.floor((e.clientY - r.top) / cell) - drag.offY;
 const why = rejectReason(gid, drag.it);
 const ok = !why && fits(gid, drag.it, x, y);
 const hint = document.createElement('div');
 hint.className = `drop-hint ${ok ? 'ok' : 'bad'}`;
 hint.style.cssText = `left:${x * CELL}px;top:${y * CELL}px;width:${d.w * CELL}px;height:${d.h * CELL}px`;
 tgt.appendChild(hint);
 drag.target = { gid, x, y, ok, why };
});

document.addEventListener('pointerup', () => {
 if (!drag) return;
 const d = drag, { it, started, target } = d;
 document.querySelectorAll('.drop-hint').forEach(h => h.remove());
 clearTimeout(hoverAt && hoverAt.timer); hoverAt = null;
 drag = null;
 dragEnd = Date.now();
 if (!started) {
    // 触屏：再点一下正开着详情的货才收起；鼠标照旧点一下선택됨、再点取消
 d.el.classList.remove('dragging');
 sel = (touchy ? peek : sel) === it.uid ? null : it.uid;
 if (touchy) peek = sel;
 renderAll(); return;
 }
 if (!target || !(target.trash || target.ok)) { cancelDrag(d); return; }
 d.ghost.remove();
 d.el.classList.remove('dragging');
 if (target.trash) {
 if (knownValue(it) > 30 && !confirm(`${itemName(it)}을(를) 버릴까?`)) { renderAll(); return; }
 if (S.scav && S.scav.pending === it.uid) S.scav.pending = null;
 destroyItem(it);
 if (sel === it.uid) sel = null;
 } else placeMoved(it, target.gid, target.x, target.y);
 renderAll();
});

// 松手处放不下：当作没拖过——货飞回原处，途中翻上来的窗口、切过的分页也还原
function cancelDrag(d) {
 if (d.target && d.target.why) toast(d.target.why, 'bad');
 front = d.front0;
 const r = d.el.isConnected && tab === d.tab0 && d.el.getBoundingClientRect();
 tab = d.tab0;
 if (!r) { d.ghost.remove(); renderAll(); return; }
 layoutDock();
 d.ghost.style.transition = 'left .18s ease-out, top .18s ease-out';
 d.ghost.style.left = `${r.left}px`; d.ghost.style.top = `${r.top}px`;
 setTimeout(() => { d.ghost.remove(); d.el.classList.remove('dragging'); }, 190);
}

// 拖着货经过被压住的窗口，稍停就翻上来；经过分页按钮，稍停就切过去
let hoverAt = null, dragEnd = 0;
function dragHover(x, y) {
 const el = document.elementFromPoint(x, y);
 const w = LAYOUT === 'tall' && el && el.closest('#dock .win:not(.front)');
 const tb = !w && el && el.closest('[data-act="tab"]');
 const key = w ? `win:${w.dataset.win}` : tb && tb.dataset.tab !== tab ? `tab:${tb.dataset.tab}` : null;
 if (hoverAt && hoverAt.key === key) return;
 clearTimeout(hoverAt && hoverAt.timer);
 hoverAt = key && { key, timer: setTimeout(() => {
 hoverAt = null;
 if (w) raise(w.dataset.win);
 else { tab = tb.dataset.tab; front = 'main'; renderSide(); }
 }, w ? 150 : 400) };
}

// 拖完、点完货松手后的那下点击不算数：货已重绘，免得落到空处被当成“点空处取消선택됨”
document.addEventListener('click', e => { if (Date.now() - dragEnd < 300) { dragEnd = 0; e.stopPropagation(); e.preventDefault(); } }, true);

// 挪货：拖放与点按共用
function placeMoved(it, gid, x, y) {
 const from = it.pos && it.pos.g;
 if (gid === 'tray') toTray(it, x, y);
 else { delete it.from; placeItem(it, gid, x, y); }
 if (S.scav && S.scav.pending === it.uid) S.scav.pending = null;
 if (gid === 'display' && from !== 'display' && isBanned(it)) {
 const t = tolerance(landlordPerson());
 toast(`${itemName(it)}금지품이다. 관리가${landlordPerson().name}보면 대개${TOLERANCE_NAME[t]}. `, t === 'ignore' ? '' : 'bad');
 }
 if (from === 'tool' || gid === 'tool') {
 peak('lens', appraiseLevel());
 const found = recheckStock();
 toast(found.length ? `${LENS_NAMES[appraiseLevel()]}(으)로 갈아 끼우고 창고를 다시 살폈다: ${found.join(' · ')} 문제 있음!` : `감보대에 ${LENS_NAMES[appraiseLevel()]}을(를) 올려놓았다`, found.length ? 'bad' : '');
 }
}

// 点空格子、画面等없다按钮的地方：收起详情卡、取消선택됨。点到别的按钮只收卡，선택됨留给那个按钮用（如바친다）
document.addEventListener('click', e => {
 if (!S || !(sel || peek) || e.target.closest('#itemcard, .item, #modal-layer')) return;
 if (e.target.closest('[data-act]')) { peek = null; renderCard(); return; }
 sel = peek = null; renderAll();
});

// ───────────── 悬停提示 ─────────────

function moveTip(e) {
 if (e.pointerType && e.pointerType !== 'mouse') return;
 const el = e.target.closest && e.target.closest('.item[data-uid]');
 const tip = $('#tooltip');
 if (!el || !S || !S.items[el.dataset.uid]) { hideTip(); return; }
 const it = S.items[el.dataset.uid];
 if (tip.dataset.uid !== String(it.uid)) { tip.innerHTML = itemTip(it); tip.dataset.uid = it.uid; }
 tip.style.display = 'block';
 const w = tip.offsetWidth, h = tip.offsetHeight;
 let x = e.clientX + 18, y = e.clientY + 14;
 if (x + w > innerWidth - 8) x = e.clientX - w - 18;
 if (y + h > innerHeight - 8) y = innerHeight - h - 8;
 tip.style.left = `${x}px`; tip.style.top = `${y}px`;
}

function hideTip() { const t = $('#tooltip'); t.style.display = 'none'; t.dataset.uid = ''; }

window.addEventListener('resize', fitStage);
window.addEventListener('DOMContentLoaded', () => { fitStage(); showTitle(); });
