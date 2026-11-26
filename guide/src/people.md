# 人物与派系

[返回首页](README.md)

杂役区的每个人都记得你做过的事：来不来、出什么价、肯不肯帮你，看的是他自己的处境和对你的交情。「人物」页能看到每个人与你的往来、各自的命数。

## 四方

{{ T.factions() }}

在一族里的声望越高，这一族的客人来得越多、预算越足、出价越高，你撒谎也越不容易被识破。魔宗声望还管着货郎肯卖什么、前两重秘籍肯卖到哪一重，以及执法堂的关注每夜退得快不快。

## 交情

好感分五档：

{{ T.bands(a => MOOD_NAME[mood(a)]) }}

交情好的人出价更公道、肯替你说话，医者收你的诊金也少（见[伤毒、求医与死亡](health.md)）；仇视你的人会上门找麻烦。

## 送礼

在「人物」页可以给见过面的人送东西或灵石，一天一回。他看重的是东西对他的用处：正是他心心念念的那样（「人物」页写着“所求”），领情最多；手头越紧、越贪的人，越吃这一套。{{! (() => { fresh(); const p = Object.values(S.people).find(p => p.visits !== undefined); p.wish = 'pill_qi'; const it = makeItem('pill_qi', { q: 60 }); const a = giftValue(p, it); p.wish = 'iron_ore'; return a > giftValue(p, it); })() }}

## 善名

如实相告、公道买卖、接济弱者会涨善名；骗人、吞魂、杀人会掉。

{{ T.bands(v => VIRTUE_NAME(v), 0, 100) }}

- **口碑**：老实人的铺子，客人肯多出价；善名到了{{ VIRTUE_NAME(45) }}，每日多来一位客人；你真心帮过（接济、放人、护证……）{{ (() => { fresh(); for (let i = 0; i < 20; i++) { fateMerit(newPerson('ren'), 2); if (patronBonus()) return i + 1; } })() }} 个人以后，他们荐来的熟客再多一位。善名到 {{ (() => { for (let v = 0; v <= 100; v++) { fresh(); S.virtue = v; const a = trustMul(); S.virtue = v + 1; if (trustMul() === a && v > 20) return v; } })() }} 口碑就到顶，再往上只是花钱买名声。
- 善名在外，求上门的人多，卖货的人也敢多要价；善名太盛又没修为撑腰，人人当你软柿子捏。
- **好报**：你帮过的人记着你。多半只是捎件东西、一份消息、几百灵石；偶尔混出了头的人回来报恩——铺契降价、一道护身符（免一次锁拿、驱逐或横死）、破境之物、一件重宝。前提是你自己也够强：到了{{ REALMS[2].name }}，或者势力够大。{{! (() => { fresh(); S.cult.lv = 2; return strongEnough(); })() }}
- **奇遇**：善名在外、又没有恶名的，日子越往后越可能撞上大机缘——同样是铺契降价、护身符、破境之物或重宝。{{! (() => { fresh(); S.virtue = 60; S.day = 80; const r = Math.random; Math.random = () => 0; const a = JSON.stringify([S.flags.deedMul, S.flags.savior || 0, S.cult.xp, Object.keys(S.items).length]); karmaTick(); Math.random = r; return a !== JSON.stringify([S.flags.deedMul, S.flags.savior || 0, S.cult.xp, Object.keys(S.items).length]); })() }}{{! (() => { fresh(); S.virtue = 60; S.day = 80; S.fate.infamy = Math.ceil(fateTolerance()); const r = Math.random; Math.random = () => 0; const a = JSON.stringify([S.flags.deedMul, S.flags.savior || 0, S.cult.xp, Object.keys(S.items).length]); karmaTick(); Math.random = r; return a === JSON.stringify([S.flags.deedMul, S.flags.savior || 0, S.cult.xp, Object.keys(S.items).length]); })() }}

{{ T.trust() }}

## 因果

恶事是一场赌。每做一桩恶事——出卖人、销赃包庇、坑蒙拐骗、害人性命——就欠下一笔孽债，{{ FATE_WAIT[0] }}～{{ FATE_WAIT[1] }} 日后见分晓：**{{ pct(1 - FATE_ODDS) }} 风平浪静，{{ pct(FATE_ODDS) }} 报应上门**。故事里这类选项、举报和要挟的按钮，都写着这一把的赌注；顶栏的「孽」牌点开能看未了的孽债。

{{ T.sins() }}

这是魔门：坑蒙拐骗、卖人求赏是家常便饭，没有天道替谁伸冤，来讨账的只有苦主、他们的亲友和执法堂。开头小恶没人当回事——第 {{ FATE_TOL_DAYS[0] }} 日前，同样分量的恶事要作到第 {{ (() => { fresh(); S.day = FATE_TOL_DAYS[0]; const a = fateStake(1); for (let k = 1; k < 200; k++) { commitSin('fraud', { w: 1 }); if (fateStake(1) >= 2 * a) return k + 1; } })() }} 桩赌注才翻一倍；铺子做大了，盯着你的人就多了，到第 {{ FATE_TOL_DAYS[1] }} 日只要 {{ (() => { fresh(); S.day = FATE_TOL_DAYS[1]; const a = fateStake(1); for (let k = 1; k < 200; k++) { commitSin('fraud', { w: 1 }); if (fateStake(1) >= 2 * a) return k + 1; } })() }} 桩。日子越往后，每一桩的底注也涨得越快。{{! fateTolerance(1) === FATE_TOL[0] && fateTolerance(999) === FATE_TOL[1] }}

报应要赔的本金随你**累计**作的恶越滚越大，日子越往后也越大。以出卖（分量二）为例，若败露要赔：

{{ T.fateStakes(2, [10, 30, 60, 90], 16).split('\n').filter((l, i) => i < 2 || [1, 2, 4, 6, 8, 12, 16].includes(i - 1)).join('\n') }}

- 先掏灵石，不够就抄走最值钱的货；还赔不上就是**爆仓**：被人打成{{ CONDS.injured.grade[1] }}，执法堂关注暴涨——身上本就带伤、关注本就高的，这一下可能要命。{{! (() => { fresh(); S.stones = 0; S.day = 60; S.fate.n = 12; commitSin('harm', { w: 3 }); const r = Math.random; Math.random = () => 0; S.day = 80; fateTick(); Math.random = r; return S.fate.busts === 1 && condSev('me', 'injured') >= 2; })() }}
- **恶名**：每败露一桩，恶名就涨（小恶一点，出卖销赃两点，害命三点），客人跟着压价，最多压 {{ pct((fresh(), S.fate.infamy = 999, infamyDiscount())) }}。开头恶名到 {{ FATE_TOL[0] }} 好报和奇遇不再上门、到 {{ 4 * FATE_TOL[0] }} 每日少来一位客人（托付证据、跪求接济的人也不再上门）、到 {{ 8 * FATE_TOL[0] }} 少来两位；这些门槛随世道收紧，到第 {{ FATE_TOL_DAYS[1] }} 日降到 {{ FATE_TOL[1] }}、{{ 4 * FATE_TOL[1] }}、{{ 8 * FATE_TOL[1] }}。
- **洗手**：隔 {{ FATE_FADE }} 日不作恶，旧孽淡去相当于 {{ FATE_TOL[1] }}～{{ FATE_TOL[0] }} 桩小恶的分量（越往后越少）；有分量的善事每积 {{ FATE_MERIT }} 点善名，也抵去这么多。下一桩恶事的本金跟着回落。
- **怎么拿捏**：开局手头紧时，作一两桩恶事赌注小、赚头大；一路作下去，赌注翻着涨，越往后涨得越凶，五五开的赌局次数多了，总有一把赔不起。只做好人也活得下去，就是慢；最赚的是在两头之间拿捏——缺钱时冒一次险，赌赢了就收手行善，等旧孽淡了再说。

## 四大派系

血煞宗里四股势力。往来多了从陌生变成座上客、心腹，交情够了可以投到门下，换每周的独家买卖——但对头会记恨你。

{{ T.cliques() }}

## 加料

凡是能吃能喝、对人有好处的——补气力、涨修为、治伤毒的丹药、灵饮、灵果、草药、入药的妖材——都可以偷偷掺东西，外表看不出分别，照常卖或送出去。眼下能掺的有：{{ Object.keys(ITEMS).filter(isLaceable).map(id => ref('item', id)).join('、') }}。魂魄、精血、妖丹这类吞魂饮血的东西，点的香，本身就是料的，都掺不了。

{{! Object.keys(ITEMS).filter(id => restoreOf(makeItem(id, { q: 50, purity: 99.95 })) || CULT_XP[id] || Object.values(CONDS).some(c => c.cure.includes(id))).every(id => isLaceable(id) || ['dan', 'yin', 'zhi'].indexOf(ITEMS[id].cat) < 0 || JUNK.includes(id) || ITEMS[id].additive) }}

{{! Object.keys(ITEMS).filter(isLaceable).every(id => { const it = makeItem(id, { q: 50, purity: 99.95 }); return !ITEMS[id].additive && ITEMS[id].cat !== 'gu' && (restoreOf(it) || cultXp(it) || id === 'water' || Object.values(CONDS).some(c => c.cure.includes(id))); }) }}

掺得进料的只有能服用的东西；拿来掺的料本身——尸毒、蛛毒、忘忧散、蛊虫、情蛊这些——掺不了别的料。赝品、以次充好的照样掺得进去：看的是这一样东西能不能吃，不看真假。{{! (() => { fresh(); const f = giveItem('pill_found', { fake: true }), d = giveItem('pill_qi', { q: 30 }); dressUp(d, 1); return canLace(f) && canLace(d) && ['corpse_poison', 'spider_venom', 'wangyou', 'gu', 'love_gu', 'gu_venom'].every(id => !isLaceable(id)); })() }}

{{ T.laces() }}

对方越精明、越不信你，越可能识破；识破了就是一桩事端，苦主会上门讨说法。

**料要吃下去才发作。** 买去、收下的人当面没识破，就揣回去：多半自己吃了，也可能转送给同族的人（买来送礼的一定送出去）——谁吃下去，料就在谁身上发作。你亲手掺的货转了手，夜里会听说落到了谁肚里。{{! (() => { fresh(); const p = newPerson('ren'); p.savvy = 0; const r0 = Math.random; Math.random = () => 0.99; const t = giveItem('pill_qi'); laceWith(t, giveItem('corpse_poison')); const h = p.health; applyLace(p, t, 'sale'); const before = p.health === h; S.day += 5; eatStash(p); Math.random = r0; return before && p.health < h; })() }}

**市面上也有别人掺好了的货，还有赝品。** 鬼市的丹药灵酒约 {{ pct(sim(4000, () => !!marketLace('pill_qi', {}, 0.2).laced)) }} 掺过料、古玩一半是赝品；魔宗客人拿来卖的约 {{ pct(sim(4000, () => !!marketLace('pill_qi', {}, 0.15).laced)) }}，货郎的也偶有。掺的多是忘忧散，也有尸毒、噬心蛊。外表看不出，**验货**才验得出——手法有一到三重，照妖镜够好、或者你自己学过这一味的手法，才闻得出来。{{! (() => { fresh(); const a = makeItem('pill_qi', { laced: 'addict', laceGrade: 3 }); quickInspect(a); const no = !a.lacedSeen; S.laceKnown = { addict: 1 }; quickInspect(a); return no && a.lacedSeen; })() }}

收到这样的货，怎么办由你：

- **吃个亏**：丢了，或者贱卖给货郎（他一闻就知道，只给一成价）；不知道就自己服下的，忘忧散耗你精神，尸毒让你{{ CONDS.poisoned.grade[1] }}，别人的蛊得运功逼出来、伤你一重（不会中蛊）。
- **转手骗人**：当好货照常卖出去。不知情时卖出去不算你作恶，只是替人背锅——可对方识破了照样找你；明知还卖，就是你的孽债。{{! (() => { fresh(); const p = newPerson('ren'); p.savvy = 0; const r0 = Math.random; Math.random = () => 0.99; const q = newPerson('ren'); q.savvy = 0; applyLace(p, makeItem('pill_qi', { laced: 'poison' }), 'sale'); applyLace(q, makeItem('pill_qi', { laced: 'poison', lacedSeen: true }), 'sale'); S.day += 5; eatStash(p); const n1 = S.fate.debts.length; eatStash(q); Math.random = r0; return n1 === 0 && S.fate.debts.length === 1; })() }}
- **学了变本加厉**：把验出来的掺料货拆开辨味，学会那一味的手法；赝品、以次充好的货也一样能拆开学仿造、作伪。学会了手脚更干净（被识破的机会大约少一半），忘忧散一次能让人上两重瘾。偏门的门道（见下面的“打听门道”）也教这些手艺。{{! (() => { fresh(); const p = newPerson('ren'); p.savvy = 0.6; const t = makeItem('pill_qi'); t.laced = 'poison'; t.lacedBy = 'me'; const a = laceDetectChance(p, t); S.laceKnown = { poison: 1 }; return laceDetectChance(p, t) < a * 0.6; })() }}

## 让人听话

凭这几样能差遣人：{{ T.levers() }}。被控的人可以上贡、替你盯执法堂、打探消息，房东、管事、巡查等人还有各自的“方便”。每次差遣都可能被识破。

## 下蛊

只有[[start:gu]]会下蛊，靠的是独门的[[tech:gumaster]]：没有秘籍、没人教、功勋也换不到，养蛊（孵卵、喂养、长成、产卵、吐毒、相食）攒经验，攒够自动升重。每重蛊长得快、产卵勤、子代更毒。

蛊不能当面往人身上放，只能**加料**：把蛊掺进能吃能喝的货里，卖出去或送出去，**谁吃下去谁中蛊**。买去、收下的人转送了别人，中蛊的就是那个人。不懂蛊的人掺不进去——蛊在外行手里只是一只死虫；你自己吃了也什么都不会发生。{{! (() => { fresh(); const t = giveItem('pill_qi'); const no = !!laceWith(t, giveItem('gu', { growth: 100, tox: 40 })) && !t.laced; fresh('normal', 'gu'); S.cult.lv = 2; const p = newPerson('ren'), q = newPerson('ren'); const r0 = Math.random; Math.random = () => 0.99; const a = giveItem('pill_qi'); laceWith(a, giveItem('gu', { growth: 100, tox: 40 })); applyLace(p, a, 'sale'); const before = guBound(p); S.day += 5; eatStash(p); const b = giveItem('pill_qi'); laceWith(b, giveItem('gu', { growth: 100, tox: 40 })); applyLace(q, b, 'sale', true); const n = eatStash(q); const me = giveItem('pill_qi'); laceWith(me, giveItem('gu', { growth: 100, tox: 40 })); const st = S.vit.st; consume(me); Math.random = r0; return no && !before && guBound(p) && !guBound(q) && !q.stash.length && n.some(x => x.text.includes('건네줬고')) && !condSev('me', 'injured'); })() }}

- **掺得进去**：几重驾驭几阶蛊——一重掺得了噬心蛊、金蚕蛊，二重万毒蛊，三重蛊王。
- **种得上**：吃下去的人修为不高于你（{{ cn(TECHS.gumaster.max) }}重时可到高你一境的人）、身上还没有蛊，蛊才种得上；种不上的蛊死在肚里。收货时对方越精明、越不信你越容易识破，蛊越毒越隐蔽。{{! (() => { fresh('normal', 'gu'); S.tech.gumaster = 3; const p = newPerson('ren'); p.savvy = 0.6; const a = giveItem('pill_qi'), b = giveItem('pill_qi'); laceWith(a, giveItem('gu', { growth: 0, tox: 10 })); laceWith(b, giveItem('gu', { growth: 100, tox: 60 })); return laceDetectChance(p, b) < laceDetectChance(p, a); })() }}
- **中了蛊的人**：凭“{{ LEVERS.gu.name }}”差遣，不从就蛊噬其心、伤到{{ CONDS.injured.grade[1] }}——蛊要不了人命。跟你动手时跌一境；与你打交道时，记你的仇、识破你的料、闹出事端、报复你，多半都被蛊压下去（一重约 {{ pct(0.6) }}，每重多一成）。他们见了你也笑不出来。{{! (() => { fresh('normal', 'gu'); S.cult.lv = 2; const p = newPerson('ren'); p.visits = 1; const r0 = Math.random; Math.random = () => 0.99; const t = giveItem('pill_qi'); laceWith(t, giveItem('gu', { growth: 100, tox: 40 })); applyLace(p, t, 'gift'); S.day += 5; eatStash(p); Math.random = () => 0.999; S.day++; runCommand(p, 'tribute', 'gu'); S.day++; runCommand(p, 'scout', 'gu'); Math.random = r0; return guBound(p) && condSev(p, 'injured') === 2 && cultGap(p) === 2 - (npcLevel(p) - 1); })() }}
- **情蛊**：三重时，在蛊盅原料格放[[item:mihun_flower]]，开盅那夜一只金蚕蛊吃了它，炼成一对[[item:love_gu]]落进产物格（鬼市偶尔也有现成的）。同样掺进吃食里：成年女子吃下去，{{ '她' }}的好感锁在顶上，与你打交道再没有半点坏处；男子、孩子吃了，蛊不认，白白死在肚里。情蛊一生只认一人，认了主就再也掺不进去。可母蛊在你心口：{{ '她' }}死了，你也活不成。{{! (() => { fresh('normal', 'gu'); S.cult.lv = 2; S.tech.gumaster = 3; const m = newPerson('xian', { sex: 'm' }), p = newPerson('xian', { sex: 'f', portrait: 'xian_spy' }); const r0 = Math.random; Math.random = () => 0.99; const a = giveItem('pill_qi'); laceWith(a, giveItem('love_gu')); applyLace(m, a, 'gift'); S.day += 5; eatStash(m); const man = !m.loveGu && !S.loveGu; const b = giveItem('pill_qi'); laceWith(b, giveItem('love_gu')); applyLace(p, b, 'gift'); S.day += 5; eatStash(p); const again = !!laceWith(giveItem('pill_qi'), giveItem('love_gu')); Math.random = r0; remember(p, '_', -80); const locked = p.aff === 100; die(p, '_'); return man && again && locked && S.over && S.over.cause === 'lovegu'; })() }}
- **执法堂的人**：执法堂的人吃下你的蛊，种上种不上都可能察觉，关注一下子涨一大截。后果……自己去试。
- **中蛊、受控、情蛊是三回事**：中蛊是吃下了你的蛊，怕蛊噬心才听你的；受控是识海里种了魂印，神志受你摆布；情蛊是心系于你。「人物」页的卡片上分别标「中蛊」「受控」「情蛊」。

## 打听门道

杂役区的人各自懂些门道：丹师、郎中懂丹方和治伤，铁匠懂炉火，混混、销赃的懂偏门生意，老人、僧道懂因果，行商懂行情和货源。见过一面的人，「人物」页里列着他像是懂哪些行当的门道（只露行当，不露内容），可以一条条请教；一天跟同一个人只能打听一回，费些精神。打听来的记在「卷宗」的见闻录里。门道一共 {{ loreAll().length }} 条，内容由游戏数据现编，和这份攻略一样与程序对得上。{{! loreAll().every(t => !/undefined|NaN/.test(t.text) && LORE_TIER[t.tier]) }}

- **肯不肯说**看三样：世道（难度越高人越嘴紧）、这条门道值多少（{{ Object.values(LORE_TIER).join(' / ') }}，偏门生意另加一截）、他对你的交情。仇视你的一个字也不说。
- **花钱买**：交情不够时，只有{{ LORE_TIER.high }}的和偏门的门道肯卖，要价看他贪不贪、你们差多少交情；守规矩的人给钱也不卖害人的门道，混混、销赃的不在乎。{{! (() => { fresh(); const p = S.people.thug; p.aff = 0; return loreOffer(p, { tier: 'low', evil: false, id: '_' }).kind !== 'sell' && loreOffer(p, { tier: 'high', evil: true, id: '_' }).kind === 'sell'; })() }}

以一位贪念中等、不怎么守规矩的行商为例：

{{ T.lore() }}

## 有名有姓的人

除了开局就在杂役区的几位，下面这些人会陆续登场（登场日是大约，要碰上机缘）：

{{ T.cast() }}
