# 经营

[返回首页](README.md)

## 一天怎么过

1. **清晨**：收租日先收租；货郎、行情、鬼市的货一早换过。
2. **白天开门迎客**：客人来买、来卖、来请你鉴定。一位客人一次能连着谈几样货。
3. **打烊**：夜里可以去拾荒、去鬼市，也可以闭关。
4. **夜里**：设备按「工坊」的顺序耗灵力运转；你入定歇息，体力精神恢复。

## 租金

- 头一期在第 {{ T.probe.firstRentDay() }} 日收，之后每 {{ T.probe.rentEvery() }} 日收一期，一期比一期高。寻常难度下：

{{ T.rents(10) }}

- 到期时手里的灵石够就自动交掉。交不上，欠款涨到 {{ T.probe.rentGrace().mul }} 倍，宽限 {{ T.probe.rentGrace().days }} 日；宽限期满还交不上，就被扫地出门。{{! (() => { fresh(); S.stones = 0; S.flags.savior = 0; S.day = S.rentDue; rentCheck(); for (let i = 0; i < 9 && !S.over; i++) { S.day++; rentCheck(); } return S.over && S.over.title === '내쫓김'; })() }}
- 房东可能换人，租金也可能被故事改动（帮钱执事销赃能换折扣，得罪了人租金会涨）。

## 客流与陈列

- 每天大约来 **{{ T.probe.customers() }}** 位客人。[[upgrade:sign]]多招一位{{! (() => { const a = T.probe.customers(); fresh(); itemsIn('display').forEach(destroyItem); S.upgrades.sign = true; return customerCount() === a + 1; })() }}，陈列柜里摆的货越值钱，来的人也越多。
- **陈列柜决定来什么人**：摆一件货，就有 {{ pct(displayPull(1)) }} 的客人冲着它来，摆得越多越高，最多 {{ pct(displayPull(99)) }}。冲着货来的人更有耐心、预算更足、肯多出价。
- 什么货招什么族的人，见[货物图鉴](items.md)的分类；各族喜好见[人物与派系](people.md)。
- [[item:yao_core]]、[[item:beast_hide]]摆出来会得罪妖族。仙门禁物、魔宗禁药摆出来会招执法堂（见[执法堂与巡查](law.md)）。

## 议价与鉴定

- 顾客出价看货的底价、当下行情、你在他那一族的声望、他对你的交情、难度的出价倍率。开价太狠，他会还价或拂袖而去，界面上标着成交、还价、拂袖三种可能。
- **他要几件**写在来意里。丹药、灵饮、符箓、灵材这类用了就没的，常要两三件，最多 {{ wantNeedMax('consume') }} 件；铁匠、丹师、符师、养蛊师这些手艺人常来买本行的料，最多要 {{ wantNeedMax('craft') }} 件；法器、珍玩这类经用的，多半一件、至多 {{ wantNeedMax('gear') }} 件；心心念念的、冲着陈列柜来的、找药治伤的只要一件。对口但不是他专程要的，只出 {{ pct(SIDE_BUY) }}，至多捎 {{ SIDE_MAX }} 样。件数凑够以后再往货盘上摆，多出的他只当囤货压价收下，出 {{ pct(EXTRA_BUY) }}，不会低于货郎的收价。{{! wantNeedMax('gear') === 2 && EXTRA_BUY < SIDE_BUY }}
- **总价不会超过他钱袋里的钱**。价钱过了钱袋的 {{ pct(PURSE_EASY) }}，他越来越舍不得；钱不够时，他最多还到钱袋的 {{ pct(PURSE_OFFER) }}。
- **急需的东西不太计较价钱**：带伤、中毒的人见了对症的药，伤病每重一层多出 {{ pct(CURE_MUL) }}；心心念念的东西、瘾头上来的那一口也一样，开高了也不容易拂袖。急着脱手赃物、违禁品的卖家，被通缉、走投无路的，也顾不上讨价。
- **由你摆布的人**——中了你的蛊、识海里种着你的魂印、情蛊认了你——开什么价都认，只是掏不出钱袋里没有的；货有毛病也不敢当面揭穿。
- **四档自动报价**按眼前这位客人现算：让利、公道照他心里的公道价；小赚是他拂袖不到百分之一的最高价，狠宰是十个里约一个甩手走人的价，都不超过他掏得出的钱。耐心越少，同样的价越容易惹他翻脸；价钱每挪一枚灵石，三种可能也只挪一点点。{{! PRESET_SAFE < 0.01 && PRESET_BOLD >= 0.08 && PRESET_BOLD <= 0.1 }}
- 收货时卖家也在撒谎：残次货、赝品、赃物都会被说成好货。**鉴定**（用照妖镜）能看穿品相和真假；镜子越好看得越深。
- 替人鉴定收鉴定费；[[upgrade:master]]让鉴定费翻倍，说谎也更不容易被识破。
- 赝品可以当真货卖，也可以照实说。买家眼力够就可能当场看穿，或者回去以后才发现，上门找你算账。

## 体力与精神

几乎每件事都耗体力与精神，夜里入定歇息恢复。闭关的夜里恢复得少，带伤的夜里也恢复得少。

一夜好眠大约回体力 {{ (fresh(), S.vit.st = 0, S.vit.sp = 0, restNight(), S.vit.st) }}、精神 {{ S.vit.sp }}；修一间[[upgrade:quiet]]能多回 {{ (() => { fresh(); S.upgrades.quiet = true; S.vit.st = 0; restNight(); const a = S.vit.st; fresh(); S.vit.st = 0; restNight(); return a - S.vit.st; })() }}。

{{ T.actions() }}

服下能补气力的东西（品质越好补得越多：药力 ×(0.6 + 品质/125)，中品足量，品质 15 的 ×{{ potency({ id: 'pill_qi', q: 15 }) }}，品质 95 的 ×{{ potency({ id: 'pill_qi', q: 95 }) }}；以次充好的按真实品质算）：

{{ T.restores() }}

## 货郎

货郎每天换一批货。下面是底价，实际价钱还要算上难度加价、当天行情、战事，魔宗声望高能打折；有些货要魔宗声望够了才肯卖。

{{ T.supply() }}

货郎也收你的货，只给估值的 {{ pct((() => { fresh(); const it = makeItem('iron_ingot', { q: 60 }); autoPlace(it); const v = trueValue(it), before = S.stones; sellToBroker(it); return (S.stones - before) / v; })(), 0) }} 左右，图个省事。设备拆了只退 {{ pct((() => { fresh(); const m = addMachine('furnace'), before = S.stones; removeMachine(m); return (S.stones - before) / MACHINES.furnace.price; })()) }} 的价钱。

## 扩建

{{ T.upgrades() }}

## 鬼市与批发

打烊后可以去这三处整批进货、出货。每逢**{{ (() => { fresh(); for (let d = 1; d <= WEEK_LEN; d++) { S.day = d; if (isGhostNight()) return weekdayOf(d).name; } })() }}**，鬼市的货更多，去了也不招执法堂。

{{ T.dealers() }}

宗门批发处要魔宗声望够了，或者在魔宗攒下功勋，才肯跟你做生意。
