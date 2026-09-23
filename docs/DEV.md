# 开发文档 · 灵根演化 · 问道长生

面向想读懂 / 修改 / 扩展这套代码的人。玩家向说明见 [../README.md](../README.md)。

---

## 一、架构总览

### 无构建、无依赖、纯全局命名空间

所有文件都是**普通 `<script>` 标签**按顺序加载，挂在唯一的全局对象 `window.XX` 上：

```
window.XX = {
  U:  { ... },   // 工具函数        （00-util.js）
  D:  { ... },   // 静态数据表      （01-data.js / 01b-content.js / 02b-gen.js / 02c-depth.js）
  G:  { ... },   // 游戏状态 + 逻辑  （02-state.js 起）
  UI: { ... }    // 界面            （09-ui.js / 09b-views.js）
}
```

**加载顺序即依赖顺序**（见 `index.html` 底部）：

```
00-util → 01-data → 01b-content → 02-state → 02b-gen → 02c-depth
        → 03-cultivate → 04-array → 05-alchemy → 06-sect
        → 07-combat → 08-rebirth → 09-ui → 09b-views → 10-main
```

选这个方案的原因：**`file://` 双击就能跑**（ES module 会被 CORS 拦），且无需任何构建步骤。

### 模块职责

| 文件 | 职责 |
|---|---|
| `00-util.js` | 随机、大数格式化（万/亿/兆/京/垓）、**软上限 `U.soft`**、DOM、Toast |
| `01-data.js` | 九灵根 / 十境界 / 分支 / 功法 / 词条池 / 二十四形制 / 十二阵眼 / 灵草矿石 / 星盘 / 天劫 |
| `01b-content.js` | 奇遇事件池（每条约 3 选项，`do(g)` 返回结果文案）、秘境事件、妖兽名录、随机机缘 |
| `02-state.js` | 状态对象、存档、离线结算、灵根演化计算、**属性总计算 `recalc()`** |
| `02b-gen.js` | **机缘生成**：`genTreasure(sig)` + 四个来源签名构造器 + 来历词条 + 区域风土 |
| `02c-depth.js` | 成就 41 条、五行套装、法宝重铸、弟子特性、派遣任务 |
| `03-cultivate.js` | 突破流程 `_advance()`、天劫、金丹品级、飞升、**目标指引 `goals()`**、功能解锁 |
| `04-array.js` | 十二阵眼装嵌、`arrayDetail()`、`embedBest()`、炼器 `forge()` + 灵材烙印继承 |
| `05-alchemy.js` | 炼丹 `alch()`（君臣佐使）、阵法 `builFormation()`（八门九宫天干） |
| `06-sect.js` | 建筑、弟子、宗门产出、探索 `doExplore/doTrial/doGather`、秘境 |
| `07-combat.js` | 回合制战斗状态机、伤害公式、技能、自动/手动 |
| `08-rebirth.js` | 轮回结算、星盘 |
| `09-ui.js` | HUD / 左栏 / 标签栏 / 子页 / 弹窗 / 详情 / 战斗界面 / **事件委托** |
| `09b-views.js` | 各标签页的 HTML 生成函数 |
| `10-main.js` | 主循环、离线弹窗、新手引导、`layoutFix()`、启动 |

---

## 二、状态对象 `G`

`G` 既是**状态容器**也是**逻辑命名空间**。`G.newState()` 给出字段默认值：

```js
G = {
  ver: 2, balance: 2, name: '无名散修',

  // 修为与境界
  node: 0, qi: 0, spirit: 120, heart: 100, karma: 0, dao: null,
  branch: {},          // realmIndex -> 分支名
  jindan: 0,           // 金丹品级 1..9（1 为最佳）

  // 灵根
  roots: { jin:0, mu:0, shui:0, huo:0, tu:0, feng:0, lei:0, guang:0, an:0 },
  harmony: false,      // 相克冲突是否已调和

  // 功法
  techs: {},           // 功法 id -> 参悟等级
  skills: { active:[], passive:[] },   // 功法栏（已装备）
  shards: 0,

  // 法宝与灵阵
  treasures: [], seq: 1,
  slots: [null × 12],                  // 十二阵眼
  equip: { weapon:null, offhand:null, armor:null, crown:null, boots:null, jade:null },

  // 背包
  bag: { herb:{}, ore:{}, pill:{} },
  matAff: {},          // 灵材烙印：{ 材料key: [词条类型…] }
  customPills: [],

  // 宗门
  sect: { lv:1, exp:0, name:'', buildings:{}, disciples:[], missions:[], misDone:0 },

  // 其它
  arrays: {},          // 已布阵法
  buffs: [],           // 限时增益
  flags: {},           // 通用标记（成就用 'achv_<k>'、天启用 'trib_<ri>'）
  stats: { explores, battles, wins, pills, forges, forms, tribulations, tribSuccess, maxQi, playTime },
  seen: { tech:{}, treasure:{}, event:{} },
  unlock: { roots, array, explore, alch, forge, form, sect, rebirth },
  rebirth: { count, points, spent, stars:{}, total, ascends, bestNode, records:[] },
  eventTags: {},       // 奇遇/秘境写入的语义标签 → 下次生成法宝时消耗
  logs: [], last: Date.now()
};
```

**约定**：
- 新增字段**必须同时加进 `G.newState()`**，否则老存档读出来是 `undefined`
- `G.init()` 里有一套**兜底补字段 + 失效引用清理**（阵眼/装备位指向不存在的法宝会被置空）
- 存档版本不符直接在 `G.load()` 里弃档

---

## 三、核心系统实现要点

### 3.1 属性计算（数值制 + 软上限）

`G.gatherBonuses()` 汇总**所有加成源**到一个扁平的 `b` 对象：

```js
// 参与累加的 key
atk def hp spd mix         // ← 数值制：直接相加
crit cdmg dodge cult luck  // ← 少量百分比
alch forg form sect heal herb
all                        // ← 稀有来源：境界分支 / 金丹 / 道 / 星盘 / 套装
tribulation breakthrough
```

来源依次为：境界分支 → 金丹品级 → 功法被动（装备 100% / 未装备 25%）→ 灵阵词条 → 人物装备 → 特殊词条 → 来历词条（同名不叠加）→ 五行套装 → 阵法 → 宗门 → 道 → 限时 buff。

**最后统一过软上限**：

```js
var SOFT = { atk:[1400,0.22], def:[900,0.22], hp:[14000,0.20], spd:[55,0.25], mix:[300,0.25], … };
for (var sk in SOFT){
  if (b[sk] > SOFT[sk][0]) b[sk] = U.soft(b[sk], SOFT[sk][0], SOFT[sk][1]);
}
```

`U.soft(x, knee, rate)`：`knee` 以内原样保留，超出部分只按 `rate` 计入。

**`recalc()` 把它们变成最终属性**：

```js
var Ps   = U.soft(P, 900, 0.25);     // 灵阵灵力
var Peqs = U.soft(Peq, 450, 0.25);   // 装备灵力

var F = { atk:b.atk, def:b.def, hp:b.hp, spd:b.spd };
F.atk += b.mix*1.00 + Ps*0.55 + Peqs*0.45;
F.def += b.mix*0.70 + Ps*0.40 + Peqs*0.34;
F.hp  += b.mix*8.00 + Ps*4.20 + Peqs*3.40;
F.spd += b.mix*0.07 + Ps*0.035+ Peqs*0.030;

var all = 1 + b.all;
st.atk = (baseAtk + F.atk) * all;    // ← 只有这里还是乘算
```

> **设计红线**：战斗四维只走加法。往 `b` 里加新的百分比字段前，先想清楚它会不会复利。

### 3.2 机缘生成（Sig）

统一入口 `G.genTreasure(sig)`，四个来源各构造一份签名：

```js
G.genTreasure(sig)                    // 核心生成器
G.sigFromForge(k1,k2,k3,fire)         // 炼器：材料驱动
G.sigFromEnemy(cfg, region)           // 妖兽 + 区域风土
G.sigFromRegion(region, layer)        // 秘境：层数驱动
G.sigFromOpt(opt)                     // 兼容旧接口（makeTreasure 转调此路）
```

生成顺序：**运气 → 属性 → 品阶 → 形制 → 词条数量（形态）→ 基底词条 → 特殊词条 → 来历词条 → 命名**

```js
// 品阶：以境界为基线，材料/区域小幅加成
baseG = Math.floor(G.node/3) - 0.75 + Math.min((r.t-1)*0.12, 0.9) + (boss ? 0.7 : 0)
baseG += U.ri(-1,1) + Math.floor((luck-1)*3)

// 形态：专精（少而精）/ 均衡 / 繁复（多而散）
shapeMul = shape === 'focus' ? 1.4 : shape === 'dense' ? 0.72 : 1.0

// 基底词条：形制偏好 + 来源偏好，55% 命中偏好
a = (pref.length && U.chance(0.55)) ? U.pick(pref) : U.pick(pool)

// 来历词条：非首领只从候选标签里随机取 1 个判定，避免多标签把概率抬得过高
p = 0.22 + baseG*0.014 + sig.originBonus   // 上限 0.45
```

**来历词条**存成带 `origin:true` 与 `eff/flag` 的词条对象：

```js
{ k:'o_blood', n:'血煞', origin:true, tag:'blood', eff:{atk:0.08}, flag:'killHeal', desc:'…' }
```

`eff` 由 `gatherBonuses()` 统一结算（**同名去重，不叠加**）；`flag` 走 `G.hasOrigin('killHeal')`，在战斗里生效。

### 3.3 灵根演化

```js
G.rootSpeedMult()   // 数量倍率 × 纯度倍率 × 异种加成 ×（混沌 ×2.6）× 冲突惩罚
G.resonances()      // 相生双灵根齐 ≥80%
G.conflicts()       // 相克双灵根齐 ≥68%
G.addPurity(k, d)   // 唯一的纯度修改入口（会重算属性并写日志）
```

纯度随时间演化的三条路径（在 `G.tickCultivate` 里，每 12 秒一次）：
1. 主灵根自然增长
2. 相克双灵根互相消磨
3. **灵阵中每件法宝缓慢同化对应灵根** ← 让配装与灵根形成正反馈

### 3.4 突破与指引

```js
G.checkBreak()   // 自动模式入口（受 G.auto.break 与 G.seen.intro 控制）
G._advance()     // 真正推进：先查当前境界是否已择路 → 再查分支/天劫 → 否则 doBreak
G.tryBreak()     // 手动「突破」按钮，也走 _advance
```

`G._advance()` 里两处拦截会用 `pendingBranch` / `pendingTrib` 挂起，并弹窗；`UI.liveTick()` 每 0.5 秒检查一次「有未决但没弹窗」并自动补开。

`G.goals()` 返回按优先级排序的建议数组，每条 `{p, t, d, tab, act, arg}`。
`UI.goalGo(i)`：有 `act` 就先执行动作，**再统一跳转到 `tab`**。

### 3.5 阵眼 / 装备 / 词条

```js
G.arrayDetail()   // 十二阵眼：灵力 P、阵势加成、词条累加、特殊词条、来历词条
G.equipDetail()   // 六装备位：灵力 Peq、格位系数（兵器×1.55 / 护身×1.65…）、契合加成
G.treasureUse(t)  // 一件法宝当前在哪：{ where:'equip'|'array', n:'护身' }
```

**一件法宝只能出现在一个地方**：`G.equipItem()` 与 `G.equipTreasure()` 都会先把它在别处的占用清掉。

### 3.6 成就 / 套装 / 重铸

```js
D.ACHV = [{ k, n, d, chk(g), rew:{spirit|shard|point} }, …]   // chk 是纯函数
G.checkAchv()          // 主循环每 3 秒扫一次，达成即发奖
G.setInfo()            // 阵眼 + 装备位的属性分布 → 三档套装加成
G.reforge(tid)         // 保留形制/品阶/来历/烙印，只重掷天生词条
```

### 3.7 宗门与派遣

```js
G.traitBonus(buildKey)   // 弟子特性对某建筑的加成（同特性取最高）
G.sendMission(mk, ids)   // 派遣：人数越多越快、收获越多
G.missionTick()          // 主循环每 3 秒检查归来
```

派遣时长与收获：

```js
dur  = m.dur * (1 - min(0.45, power*0.02))
mul  = 1 + min(0.8, power*0.02)
```

---

## 四、UI 架构

### 标签页 + 子页

```js
UI.TABS = [
  { k:'cultivate', n:'修炼' },
  { k:'character', n:'人物', u:'roots', subs:[
      { k:'equip', n:'装备',   v:'view_character' },
      { k:'skill', n:'功法栏', v:'view_character' },   // 同一函数内部按子页分支
      { k:'bag',   n:'行囊',   v:'view_bag' }
  ]},
  …
];
UI.LEGACY = { bag:'character:bag', alchemy:'workshop:alch', … };  // 旧键 → 新「标签:子页」
UI.sub = {};   // { 标签key: 子页key }
```

`UI.switchTab(k)` 会先查 `LEGACY`，保证历史链接与指引跳转不失效。

### 事件委托

**所有交互都走一条全局委托**，靠 `data-act` / `data-arg` 分发：

```html
<button data-act="learn" data-arg="jin_a">参悟</button>
```

```js
document.addEventListener('click', function(e){
  var el = e.target;
  while (el && el !== document && !el.dataset.act) el = el.parentNode;
  if (el && el !== document && el.dataset.act) UI.handle(el.dataset.act, el.dataset.arg, el);
});
```

好处：视图整块 `innerHTML` 重绘后**不需要重新绑事件**；按钮天然优先于外层容器（就近匹配）。

### 刷新纪律（重要）

这套代码**踩过 5 次同类型的坑**：函数改了数据但忘了刷新界面 → 玩家看到"点了没反应"。约定：

| 场景 | 必须调用 |
|---|---|
| 改了数据、想让界面同步 | `UI.renderAll()` |
| 从详情弹窗里操作 | `UI.afterDetail(id)`（刷新弹窗或关闭失效弹窗） |
| 服用丹药 | `UI.afterUsePill()`（关闭失效弹窗 + `renderAll`） |
| 战斗外改状态 | `XX.UI.dirtyLog = true` 让右栏日志刷新 |

`UI.tickLive()` 每 0.5 秒做**局部刷新**（修为条、按钮可用性、标签栏红点），避免整页重绘。

### 弹窗体系

```js
UI.modal({ title, sub, body, choices:[{t,d,dis,on}], ok, cancel, onOk, onCancel })
UI.detail(arg)     // arg = "tre:法宝id" | "tech:功法id" | "herb:key" | "ore:key" | "pill:丹id"
```

- 未决抉择弹窗（择路 / 天劫）带 `__pend:true`，**不会被别的弹窗顶掉**（排队等待）
- `UI.repaintFix()` 在渲染后自检内容高度，异常则强制重新合成

---

## 五、扩展指南

### 加一门功法

编辑 `js/01-data.js` 的 `D.TECHS`：

```js
{ id:'huo_x', n:'烈焰掌', el:'huo', req:60, kind:'active', pow:1.8, cd:3, desc:'…', eff:{atk:0.12} }
```

字段：`el`（`'any'` 为通用）、`req`（所需灵根纯度）、`kind`（`active`/`passive`）、`pow`（威力倍率）、`cd`（冷却回合）、`eff`（属性加成）、`sp:true`（秘传，需金丹境）。

UI（筛选 / 排序 / 计数 / 一键参悟）会**自动跟上**，不用改任何界面代码。

### 加一种法宝形制

编辑 `D.TREASURE_TYPES`：

```js
{ k:'bian', n:'鞭', slots:['weapon'], aff:['atk','spd'], w:6 }
```

`slots` 决定能戴哪些装备位，`aff` 是词条偏好，`w` 是抽取权重。
**注意检查各 `slots` 的总权重是否均衡**——曾因「足履」只占 10% 导致经常挑不出可戴的法宝。

### 加一条成就

编辑 `js/02c-depth.js` 的 `D.ACHV`：

```js
{ k:'x_demo', n:'成就名', d:'达成条件描述', chk:function(g){ return g.node >= 10; }, rew:{spirit:5000, shard:3, point:5} }
```

`chk` 是纯函数，越简单越好；存储走 `G.flags['achv_'+k]`，**跨轮回自动保留**。

### 加一个奇遇事件

编辑 `js/01b-content.js` 的 `D.EVENTS`：

```js
E.push({ n:'事件名', w:8, txt:'描述……', opts:[
  { t:'选项一', d:'副标题', cost:{spirit:100}, req:function(g){ return g.node >= 5; },
    do:function(g){ g.addSpirit(-100); g.karma += 10; g.tagNext('karma_good', 2); return '结果文案'; } },
  …
]});
```

`do(g)` 返回的字符串会写进日志。想让它影响后续法宝，就调 `g.tagNext(tag, n)`。

### 加一个宗门建筑

编辑 `D.BUILDINGS` 并在 `js/06-sect.js` 的 `D.BUILD_REQ` 里登记解锁等级。
若想让它被弟子特性加成，在 `D.DIS_TRAITS` 里加一条 `{ build:'<建筑key>' }`。

### 加一个机制加成字段

1. 在 `D.AFFIX` 里用这个 key 定义词条
2. **同时**把它加进三个累加器容器：`arrayDetail` 的 `statAdd`、`equipDetail` 的 `add`、`gatherBonuses` 的 `b`
   ——漏掉任何一处都会被**静默吞掉**（踩过两次）
3. 在 `recalc()` 里决定它是走数值还是百分比

---

## 六、测试方法

没有测试框架，全靠**在浏览器里跑断言脚本**（推荐用内置浏览器的 console / minis 的 `execute_js`）。

```js
// 逐文件语法体检（不需要 node）
var files = ['00-util.js','01-data.js', /* … */];
files.forEach(function(f){
  var x = new XMLHttpRequest(); x.open('GET','js/'+f,false); x.send();
  try { new Function(x.responseText); console.log('✓', f); }
  catch(e){ console.log('✗', f, e.message); }
});

// 全页面渲染体检
UI.TABS.forEach(function(t){
  (t.subs || [{k:null}]).forEach(function(s){
    UI.tab = t.k; if (s.k) UI.sub[t.k] = s.k;
    UI.renderView();
    var h = document.getElementById('view').innerHTML;
    if (h.indexOf('undefined') >= 0 || h.indexOf('NaN') >= 0) console.log('✗', t.n, s.n);
  });
});

// 长跑（含自动突破 / 天劫 / 战斗）
for (var s = 0; s < 3600; s++){
  G.tickCultivate(1);
  if (G.pendingBranch !== null){ G.branch[G.pendingBranch] = D.REALMS[G.pendingBranch].br[0]; G.pendingBranch = null; }
  if (G.pendingTrib !== null){ G.flags['trib_'+G.pendingTrib] = 1; G.pendingTrib = null; G.doBreak(); }
  if (G.battle && !G.battle.over){ /* 快进战斗 */ }
}
```

**要同时断言数据层和 DOM 层**——只测数据会漏掉一半 bug（「改了数据没刷新界面」这类只能靠对比 DOM 抓到）。

---

## 七、踩坑清单

### Android WebView

| 坑 | 对策 |
|---|---|
| `vh` / `dvh` 被算成 0 → 整个 flex 高度链断裂 | 全项目**禁用视口单位**，`#app` 用 `position:fixed` + 四边偏移 |
| `backdrop-filter` 提升合成层 → 子节点漏绘 | 全项目**禁用毛玻璃** |
| `transform` 动画 → 漏绘 / 常驻占用合成器 | 动画只用 `opacity` |
| `.modal{max-height:88vh}` 被算成极小值 → 弹窗只剩标题 | 弹窗不用 `max-height`，改「外层滚动 + `margin:auto`」 |
| `inset:0` | 一律写 `top/left/right/bottom` |

### minis 内置浏览器

| 坑 | 对策 |
|---|---|
| **`fetch()` 读不到本地文件**（相对/绝对都失败） | 用**同步 `XMLHttpRequest`**；`fetch` 只用于外部 HTTPS API |
| `js/*.js` 被缓存，改完不生效 | 给 `<script src>` 加 `?v=N`，每次改完**必须 bump** |
| 已经打开的页面用旧缓存（即使 `?v` 相同） | 改完源码要**再 bump 一次并重新导航** |
| 截图偶发拍到合成层漏绘的瞬态帧（整屏模糊 / 弹窗不在帧内） | **连截两张**即可区分「代码 bug」与「渲染 bug」 |
| `execute_js` 会自己开新标签页 | 截图时显式传 `tab_id` |

### 沙箱（PRoot）

| 坑 | 对策 |
|---|---|
| `ls` / `grep` / `cp` / `mkdir` / `rm` 高频 segfault | 写文件用 `file_write`；删文件用 **`busybox rm -f`**（`rm` 稳定崩、`unlink` 返回 182 也没用） |
| 长命令链基本必崩 | 拆成单条命令；减少进程数是唯一解 |
| `sed -i` 崩 | 用 `file_edit` 代替 |

### 代码层面

| 坑 | 说明 |
|---|---|
| **`file_edit` 替换「注释 + 函数头」锚点** | `new_string` 必须把函数头补回去，否则函数体变孤儿 → `Unexpected token`。**踩过 3 次** |
| **新增词条 key 忘了加进累加器** | 会被静默吞掉。三个容器都要加：`statAdd` / `add` / `b` |
| **`rank[state] \|\| 9`** | `rank['can']` 是 `0`，被 `\|\|` 吞成 9 → 排序全乱。**数字 0 别用 `\|\|` 兜底** |
| **`file_read` 看密钥文件** | 会把值读进对话。确认文件存在只能 `test -f` / `test -s` |
| **改了数据没刷新界面** | 见上文「刷新纪律」，**踩过 5 次** |
| **`G.makeTreasure()` 不会自动入包** | 它只创建对象；要塞进背包得自己 `G.addTreasure()` 或 `G.treasures.push()` |
| **测试时用捕获的旧数组做 `indexOf`** | `G.goals()` 每次返回**新对象**，`indexOf` 永远失败；要用下标 |

---

## 八、部署

线上地址：**https://zkksdk.github.io/xiuxian-linggen/**（GitHub Pages，分支 `main`，目录 `/`）

沙箱里 `wget` 的 HTTPS 是坏的、`curl`/`git` 都没有，所以走 **浏览器 + GitHub REST API**：

```bash
# 1. 把 PAT 写成一个页面脚本（值不进对话）
printf "window.__TOK = '%s';\n" "$GITHUB_TOKEN" > tools/tok.js

# 2. 用浏览器打开 tools/push.html —— 它会自动：
#    · 校验令牌 / 建仓（已存在则跳过）
#    · 逐个 PUT /repos/{owner}/{repo}/contents/<path>（先 GET 取 sha，有则带 sha 更新）
#    · 开启 Pages
#    · 回读 git/trees 校验文件数

# 3. 推完立刻删除（用 busybox）
busybox rm -f tools/tok.js
```

`tools/push.html` 里两处关键实现：

```js
// ① 读本地文件必须用同步 XHR（fetch 在 minis:// 下读不到）
function readLocal(path){
  var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(null);
  if (x.status !== 200 && x.status !== 0) throw new Error('HTTP ' + x.status);
  return x.responseText;
}

// ② 令牌脚本动态加载（带时间戳），否则浏览器会把曾经 404 的路径缓存住
s.src = 'tok.js?t=' + Date.now();
```

**注意**：`GITHUB_TOKEN` 是敏感凭据，别用 `file_read` 打开 `tok.js`，也别 `echo` 它。
如果令牌曾以任何形式泄露到对话/日志里，**请到 GitHub 撤销重建**。
