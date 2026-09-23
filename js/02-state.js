/* ===========================================================
   02-state.js  —  游戏状态 / 存档 / 离线结算 / 灵根演化计算
   =========================================================== */
(function(){
var U = XX.U, D = XX.D;

var SAVE_KEY = 'xx_linggen_save_v1';

/* 预设丹药（事件掉落用） */
D.PILL_PRESET = {
  cq_qi:    {k:'cq_qi',    n:'下品聚气丹', kind:'qi',    q:1, desc:'服用得修为'},
  cq_break: {k:'cq_break', n:'下品破障丹', kind:'break', q:1, desc:'提升突破成功率'},
  cq_heal:  {k:'cq_heal',  n:'下品回春丹', kind:'heal',  q:1, desc:'回复气血道心'},
  cq_body:  {k:'cq_body',  n:'下品淬体丹', kind:'body',  q:1, desc:'永久提升根基'},
  cq_cult:  {k:'cq_cult',  n:'下品悟道丹', kind:'cult',  q:1, desc:'限时提升修炼'},
  cq_wash:  {k:'cq_wash',  n:'下品洗灵丹', kind:'wash',  q:1, desc:'洗涤灵根'}
};

var G = XX.G = {};

/* 便捷别名：事件与各模块脚本会以 g.rnd / g.ri / g.pick 调用 */
G.rnd = U.rnd; G.ri = U.ri; G.pick = U.pick; G.chance = U.chance;

/* ============ 新档 ============ */
G.newState = function(){
  return {
    ver: 2,
    balance: 2,          // 数值版本：用于提示旧档「升级太快」的曲线变更
    name: '无名散修',
    node: 0, qi: 0, spirit: 120,
    heart: 100, karma: 0, dao: null,
    roots: {},                       // 灵根纯度 0..100
    harmony: false,                  // 相克冲突是否已调和
    techs: {},                       // 功法 id -> 参悟等级
    shards: 0,                       // 功法碎片
    treasures: [],                   // 法宝
    seq: 1,                          // 法宝 id 序列
    slots: [null,null,null,null,null,null,null,null,null,null,null,null], // 12 阵眼
    equip: { weapon:null, offhand:null, armor:null, crown:null, boots:null, jade:null }, // 人物装备位
    skills: { active:[], passive:[] },   // 功法栏（已装备的功法 id）
    bag: { herb:{}, ore:{}, pill:{} },
    matAff: {},                      // 灵材烙印：{ 材料key: [词条类型...] }
    customPills: [],                 // 炼出的成品丹
    sect: { lv:1, exp:0, name:'无名小宗', buildings:{}, disciples:[] },
    arrays: {},                      // 已布阵法 {type:{lv,power}}
    buffs: [],                       // {k, v, name, until}
    flags: {},                       // 各类布尔标记
    atkPermanent: 0, hpPermanent: 0,
    perm: { atk:0, hp:0, def:0, cult:0 },
    branch: {},                      // realmIndex -> branchName
    jindan: 0,                       // 金丹品级 1..9（1 最佳）
    rebirth: { count:0, points:0, spent:0, stars:{}, total:0, ascends:0, bestNode:0 },
    auto: { break:true, usePill:true, sell:false, arrayFill:false },
    stats: { explores:0, battles:0, wins:0, pills:0, forges:0, forms:0, tribulations:0, tribSuccess:0, maxQi:0, playTime:0 },
    seen: { tech:{}, treasure:{}, event:{} },
    unlock: { roots:false, array:false, explore:false, alch:false, forge:false, form:false, sect:false, rebirth:false },
    pendingBranch: null, pendingTrib: null,
    logs: [], _wound: 0,
    guide: 0,
    last: Date.now()
  };
};

/* ============ 初始化 ============ */
G.init = function(){
  var loaded = G.load();
  if (!loaded){ G.newGame(); }
  // 兼容补字段（旧档缺字段时补齐，避免半残存档导致崩溃）
  var base = G.newState();
  for (var k in base){ if (G[k] === undefined) G[k] = base[k]; }
  var subs = ['unlock','stats','auto','seen','bag','rebirth','perm','flags','branch','roots'];
  subs.forEach(function(k){
    if (!G[k] || typeof G[k] !== 'object') G[k] = base[k];
  });
  ['unlock','stats','auto','seen','bag','rebirth','flags','branch','roots','arrays','techs','sect'].forEach(function(k){
    if (!G[k] || typeof G[k] !== 'object') return;
    var b = base[k];
    if (!b || typeof b !== 'object') return;
    for (var kk in b){ if (G[k][kk] === undefined) G[k][kk] = b[kk]; }
  });
  if (!G.slots || G.slots.length !== 12) G.slots = [null,null,null,null,null,null,null,null,null,null,null,null];
  if (!Array.isArray(G.buffs)) G.buffs = [];
  if (!Array.isArray(G.treasures)) G.treasures = [];
  if (!Array.isArray(G.customPills)) G.customPills = [];
  if (!Array.isArray(G.logs)) G.logs = [];
  if (typeof G.node !== 'number') G.node = 0;
  if (typeof G.qi !== 'number') G.qi = 0;
  if (typeof G.spirit !== 'number') G.spirit = 0;
  if (typeof G.heart !== 'number') G.heart = 100;
  if (G.logs === undefined) G.logs = [];
  if (!G.matAff || typeof G.matAff !== 'object') G.matAff = {};
  if (G.pendingBranch === undefined) G.pendingBranch = null;
  if (G.pendingTrib === undefined) G.pendingTrib = null;
  if (typeof G.log !== 'function') G.log = G._logImpl;   // 旧档可能把 log 存成了数组
  // 清理失效引用（旧档 / 异常数据）：阵眼与装备位指向不存在的法宝
  var liveIds = {};
  G.treasures.forEach(function(tr){ if (tr && tr.id) liveIds[tr.id] = 1; });
  for (var si=0; si<12; si++) if (G.slots[si] && !liveIds[G.slots[si]]) G.slots[si] = null;
  if (G.equip) for (var ek in G.equip) if (G.equip[ek] && !liveIds[G.equip[ek]]) G.equip[ek] = null;
  // 功法栏清理：移除未参悟的条目
  if (G.skills){
    ['active','passive'].forEach(function(k){
      if (!Array.isArray(G.skills[k])) G.skills[k] = [];
      G.skills[k] = G.skills[k].filter(function(id){ return id && G.techs[id]; });
    });
  }
  // 修复旧档被污染的词条数值（独立函数，可单独调用与测试）
  var fixedN = G.repairTreasures();
  if (fixedN && G.log) G.log('修复了 <b class="val">'+fixedN+'</b> 条异常词条数值');
  G.syncUnlock();
  G.recalc();
};

/* 修复旧档被污染的词条数值：
   ① flat 词条掷出 0（完全无效果）
   ② 因「福缘滚雪球」bug 而超标的数值
   ③ 缺 desc 字段（旧档按表补齐）
   返回修复条数 */
G.repairTreasures = function(){
  var n = 0;
  (G.treasures || []).forEach(function(tr){
    (tr.affixes || []).forEach(function(a){
      var d = D.AFK[a.k];
      if (!d) return;
      if (a.fmt === 'flat'){
        if (a.v === 0){
          a.v = (d.v[0] < 0 && d.v[1] > 0) ? (U.chance(0.5) ? 1 : -1) : (d.v[0] >= 0 ? 1 : -1);
          n++;
        }
      } else {
        var cap = d.v[1] * 6.2;                 // 合法上限（满品阶 + 满星盘）
        if (a.v > cap){ a.v = cap * U.rnd(0.88, 0.99); n++; }
      }
      if (!a.desc){ a.desc = D.affixDesc(a); if (a.desc) n++; }
    });
  });
  return n;
};

G.newGame = function(keepRebirth){
  var rb = keepRebirth && G.rebirth ? G.rebirth : null;
  var techs = keepRebirth ? G.techs : null;
  var stats = keepRebirth ? G.stats : null;
  var seen  = keepRebirth ? G.seen  : null;
  var nm    = G.name || '无名散修';

  var st = G.newState();
  Object.keys(st).forEach(function(k){ G[k] = st[k]; });
  G.name = nm;
  if (rb)    { G.rebirth = rb; }
  if (techs) { G.techs = techs; }
  if (stats) { G.stats = stats; }
  if (seen)  { G.seen = seen; }
  G.rollInitialRoots();
  G.applyRebirthStart();
  G.recalc();
  G.syncUnlock();
};

/* 初始灵根：1~3 条（星盘"先觉"与太初之星可加） */
G.rollInitialRoots = function(){
  G.roots = {};
  D.RK.forEach(function(k){ G.roots[k] = 0; });
  var cnt = G.ri(1,3);
  var stars = G.rebirth.stars || {};
  if (stars.purity) cnt = Math.min(4, cnt);           // 灵根之星略微倾向多灵根
  var pool = U.shuffle(D.RK.slice(0,5));              // 初始只出五行，异种靠演化
  for (var i=0;i<cnt;i++){
    G.roots[pool[i]] = G.ri(28, 62) + (stars.purity||0)*7;
  }
  if (stars.none) {  // 太初之星：开局带一异种
    var rk = U.pick(['feng','lei','guang','an']);
    G.roots[rk] = Math.max(G.roots[rk]||0, 18);
  }
  G.clampRoots();
};

/* ============ 灵根基础计算 ============ */
G.clampRoots = function(){
  D.RK.forEach(function(k){ G.roots[k] = U.clamp(Math.round(G.roots[k]*10)/10, 0, 100); });
};
G.rootKeys = function(){
  return D.RK.filter(function(k){ return (G.roots[k]||0) > 0.5; });
};
G.activeRootCount = function(){ return G.rootKeys().length; };
G.mainRoot = function(){
  var ks = G.rootKeys();
  if (!ks.length) return 'tu';
  return ks.sort(function(a,b){ return (G.roots[b]||0) - (G.roots[a]||0); })[0];
};
G.addPurity = function(k, d){
  if (!k || !D.ROOT[k]) return;
  var before = G.roots[k] || 0;
  var gain = d;
  // 因果之星：负面变化减半
  if (d < 0 && (G.rebirth.stars.karma||0) > 0) gain = d * Math.pow(0.5, G.rebirth.stars.karma);
  G.roots[k] = U.clamp(before + gain, 0, 100);
  G.clampRoots();
  if (before <= 0.5 && G.roots[k] > 0.5) G.log('你觉醒了 <b class="val">'+D.ROOT[k].n+'灵根</b>！');
  G.recalc();
};

/* 灵根相克冲突检测 */
G.conflicts = function(){
  if (G.harmony) return [];
  var out = [];
  D.CONFLICTS.forEach(function(p){
    var a = G.roots[p[0]]||0, b = G.roots[p[1]]||0;
    if (a >= 68 && b >= 68) out.push({a:p[0], b:p[1], v: Math.min(a,b)/100});
  });
  return out;
};
/* 灵根共鸣（相生且双双 80+） */
G.resonances = function(){
  var out = [];
  D.RK.forEach(function(a){
    var b = D.SHENG[a];
    if (!b) return;
    var va = G.roots[a]||0, vb = G.roots[b]||0;
    if (va >= 80 && vb >= 80) out.push({a:a, b:b, v:(va+vb)/200});
  });
  return out;
};

/* 灵根数量 → 修炼速度倍率 */
G.rootCountMult = function(){
  var n = G.activeRootCount();
  var t = {0:1, 1:2.40, 2:1.75, 3:1.35, 4:1.10, 5:0.92, 6:0.84, 7:0.78, 8:0.72, 9:0.66};
  return t[n] || 0.66;
};
G.isChaos = function(){
  var ks = G.rootKeys();
  if (ks.length < 5) return false;
  for (var i=0;i<ks.length;i++){ if ((G.roots[ks[i]]||0) < 85) return false; }
  return true;
};
/* 总灵根效率 */
G.rootSpeedMult = function(){
  var sum = 0;
  D.RK.forEach(function(k){ sum += (G.roots[k]||0); });
  var purityMult = 0.40 + sum/100 * 0.90;
  var m = G.rootCountMult() * purityMult;
  if (G.isChaos()) m *= 2.6;
  // 异种灵根额外加成（罕见但强）
  var rare = 0;
  ['feng','lei','guang','an'].forEach(function(k){ rare += (G.roots[k]||0)/100; });
  m *= (1 + rare*0.25);
  // 相克冲突惩罚
  var cf = G.conflicts();
  cf.forEach(function(c){ m *= (1 - 0.12 * c.v); });
  return m;
};

/* ============ 灵材烙印 ============
   材料只存「词条类型」，数值在炼器时按 类型 + 阶位 + 品质 现算。 */
G.matAffix = function(key){
  if (!G.matAff) G.matAff = {};
  if (G.matAff[key]) return G.matAff[key];
  var m = (D.OK && D.OK[key]) || (D.HK && D.HK[key]);
  var out = [];
  if (m){
    var n = D.matAffixCount(m.t);
    var pool = D.MAT_AFFIX_POOL.slice();
    for (var i = 0; i < n && pool.length; i++){
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
  }
  G.matAff[key] = out;
  return out;
};
G.matAffixText = function(key){
  var ks = G.matAffix(key);
  if (!ks.length) return '';
  return ks.map(function(k){ return D.AFK[k] ? D.AFK[k].n : k; }).join('、');
};

/* ============ 人物装备（6 格） ============ */
/* 与十二阵眼共用同一批法宝：此处定向强化人物属性 */
G.equipDetail = function(){
  var add = { atk:0, def:0, hp:0, spd:0, crit:0, cdmg:0, dodge:0, cult:0, heal:0, alch:0,
              forg:0, form:0, sect:0, luck:0, all:0, heart:0, karma:0, herb:0,
              tribulation:0, breakthrough:0, mix:0 };
  var P = 0, count = 0, rows = [], sps = [], origins = [];
  D.EQ_SLOTS.forEach(function(s){
    var tid = G.equip ? G.equip[s.k] : null;
    if (!tid) return;
    var t = G.treasureById(tid);
    if (!t){ if (G.equip) G.equip[s.k] = null; return; }
    var elFit = (t.el === s.el);
    var p = t.power * (elFit ? 1.25 : 1.0);
    P += p; count++;
    var detail = [];
    t.affixes.forEach(function(a){
      if (a.origin){ origins.push(a); detail.push('<span class="tag gold">'+a.n+'</span>'); return; }
      if (a.sp){ sps.push(a); detail.push('<span class="tag purple">'+a.n+'</span>'); return; }
      var m = (s.aff.indexOf(a.k) >= 0) ? s.mult : 1.0;
      m *= (elFit ? 1.15 : 1.0);
      if (add[a.k] !== undefined) add[a.k] += a.v * m;
      detail.push(a.n + ' ' + (a.fmt === 'flat' ? ((a.v*m > 0 ? '+' : '') + Math.round(a.v*m)) : '+' + U.pct(a.v*m, 1)));
    });
    rows.push({ slot:s, t:t, fit: elFit, p: p, detail: detail });
  });
  // 装备灵力转化为人物的肉身根基
  add.hp  += P * 0.0045;
  add.atk += P * 0.0030;
  add.def += P * 0.0026;
  return { P: P, count: count, add: add, rows: rows, sps: sps, origins: origins };
};

/* 玩家当前生效的特殊词条（阵眼 + 随身，去重合并） */
G.specialAffixes = function(){
  var out = [], seen = {};
  function take(list){ (list || []).forEach(function(s){ if (!seen[s.k]){ seen[s.k] = 1; out.push(s); } }); }
  take(G.arrayDetail().sps);
  take(G.equipDetail().sps);
  return out;
};
G.hasSpecial = function(k){
  if (G._spSet && G._spSet[k]) return true;
  return G.specialAffixes().some(function(s){ return s.k === k; });
};

/* 来历词条：阵眼 + 随身，去重合并 */
G.originAffixes = function(){
  var out = [], seen = {};
  function take(list){ (list || []).forEach(function(o){ if (!seen[o.k]){ seen[o.k] = 1; out.push(o); } }); }
  try{ take(G.arrayDetail().origins); }catch(e){}
  try{ take(G.equipDetail().origins); }catch(e){}
  return out;
};
/* 来历印记（killHeal / backlash / shardSave …） */
G.hasOrigin = function(flag){
  if (G._orSet && G._orSet[flag]) return true;
  return G.originAffixes().some(function(o){ return o.flag === flag; });
};

G.equipItem = function(slot, tid){
  if (!D.EQK[slot]) return false;
  var t = G.treasureById(tid); if (!t) return false;
  if (!D.canWear(t, slot)){
    var ok = D.treasureSlots(t).map(function(k){ return D.EQK[k].n; }).join(' / ');
    XX.UI.toast((t.typeN || '法宝') + ' 只能戴在：' + ok);
    return false;
  }
  // 一件法宝只能出现在一个地方
  for (var i=0;i<12;i++) if (G.slots[i] === tid) G.slots[i] = null;
  D.EQ_SLOTS.forEach(function(s){ if (G.equip[s.k] === tid) G.equip[s.k] = null; });
  G.equip[slot] = tid;
  var fit = (t.el === D.EQK[slot].el);
  G.log('佩戴 <b class="val">'+t.name+'</b> 于 <b class="val">'+D.EQK[slot].n+'</b>' + (fit ? '（属性契合，效果大增）' : ''));
  G.recalc();
  return true;
};
G.unequipItem = function(slot){
  if (!D.EQK[slot]) return;
  G.equip[slot] = null;
  G.recalc();
};
/* 把一件法宝嵌进当前最合适的空阵眼 */
G.embedBest = function(tid){
  var t = G.treasureById(tid); if (!t) return false;
  var best = -1, bestScore = -1;
  for (var i = 0; i < 12; i++){
    if (G.slots[i]) continue;
    var nd = D.NODES12[i];
    var rel = (nd.el === 'any') ? 'any' : D.rel(t.el, nd.el);
    var fit = rel === 'any' ? 1.20 : rel === 'same' ? 1.28 : (rel === 'sheng' || rel === 'bei') ? 1.12 : (rel === 'ke' || rel === 'beke') ? 0.78 : 1.0;
    var extra = 0;
    D.NODE_ADJ[i].forEach(function(nb){
      if (!G.slots[nb]) return;
      var tb = G.treasureById(G.slots[nb]); if (!tb) return;
      var r = D.rel(t.el, tb.el);
      if (r === 'sheng' || r === 'bei') extra += 0.07;
      else if (r === 'same') extra += 0.035;
      else if (r === 'ke' || r === 'beke') extra -= 0.07;
    });
    var sc = t.power * fit * (1 + extra);
    if (sc > bestScore){ bestScore = sc; best = i; }
  }
  if (best < 0){ XX.UI.toast('十二阵眼已满，先取下一件'); return false; }
  G.equipTreasure(best, tid);
  XX.UI.toast(t.name + ' → ' + D.NODES12[best].z + '位');
  return true;
};
/* 一件法宝目前用在哪 */
G.treasureUse = function(tid){
  if (G.equip) for (var k in G.equip) if (G.equip[k] === tid) return { where:'equip', slot:k, n:D.EQK[k].n };
  for (var i=0;i<12;i++) if (G.slots[i] === tid) return { where:'array', slot:i, n:D.NODES12[i].z+'位' };
  return null;
};

/* ============ 功法栏 ============ */
G.skillSlots = function(){ return D.techSlots(G.node); };
G.isTechEquipped = function(id){
  if (!G.skills) return false;
  return G.skills.active.indexOf(id) >= 0 || G.skills.passive.indexOf(id) >= 0;
};
G.equipTech = function(id){
  var t = D.TK[id]; if (!t) return false;
  if (!G.techs[id]){ XX.UI.toast('尚未参悟此功法'); return false; }
  if (G.isTechEquipped(id)) return false;
  var key = (t.kind === 'active') ? 'active' : 'passive';
  var max = G.skillSlots()[key];
  if (G.skills[key].length >= max){
    XX.UI.toast((key === 'active' ? '主动' : '被动') + '功法栏已满（' + max + ' 格），先卸下一个');
    return false;
  }
  G.skills[key].push(id);
  G.log('装备功法 <b class="val">'+t.n+'</b>（'+(key==='active'?'主动':'被动')+'）');
  G.recalc();
  return true;
};
G.unequipTech = function(id){
  if (!G.skills) return;
  ['active','passive'].forEach(function(k){
    var i = G.skills[k].indexOf(id);
    if (i >= 0) G.skills[k].splice(i,1);
  });
  G.recalc();
};
/* 自动配装：按效果强度挑选 */
G.autoEquipTech = function(){
  var st = G.skillSlots();
  var learned = Object.keys(G.techs);
  function score(id){
    var t = D.TK[id], lv = G.techs[id] || 1;
    var s = 0;
    for (var k in (t.eff||{})) s += t.eff[k] * 100;
    if (t.kind === 'active') s = (t.pow || 1) * 40 + s;
    return s * (1 + (lv-1)*0.12);
  }
  G.skills = { active:[], passive:[] };
  var pool = learned.slice().sort(function(a,b){ return score(b) - score(a); });
  pool.forEach(function(id){
    var t = D.TK[id]; if (!t) return;
    var key = (t.kind === 'active') ? 'active' : 'passive';
    if (G.skills[key].length < st[key]) G.skills[key].push(id);
  });
  G.recalc();
  return G.skills.active.length + G.skills.passive.length;
};

G.makeTreasure = function(opt){
  opt = opt || {};
  // 注意：不能把「装备上的福缘」也算进 luck，否则会滚雪球
  //（福缘词条 → 提高 luck → luck 又参与词条数值生成 → 福缘更大）
  var gearLuck = 0;
  try { gearLuck = U.clamp(G.gatherBonuses().luck || 0, 0, 0.35); } catch(e){ gearLuck = 0; }
  var luck = 1 + (G.rebirth.stars.luck || 0) * 0.08 + gearLuck;
  // 属性：优先玩家自身灵根
  var el = opt.el;
  if (!el){
    var ks = G.rootKeys();
    var w = ks.map(function(k){ return {k:k, w: Math.pow((G.roots[k]||0)+8, 1.3)*Math.pow(1.16, G.node/3)}; });
    // 异种权重降低
    w.forEach(function(o){ if (D.ROOT[o.k].rare) o.w *= 0.35; });
    el = U.weighted(w, 'w').k;
  }
  // 品级：以境界为主，材料/机缘为辅（不是乘法叠加，避免早期就出仙品）
  var baseG = Math.floor(G.node/3) + U.clamp(opt.lv||0, -1, 3);
  if (opt.lucky) baseG += 2;
  baseG += G.ri(-1, 1);
  baseG += Math.floor((G.rebirth.count||0) * 0.5);
  baseG += Math.floor((luck - 1) * 3);
  baseG = U.clamp(baseG, 0, 11);
  var sub = U.clamp(Math.floor(Math.random()*4 * (0.55 + (luck-1)*0.5)), 0, 3);

  var afCount = 1 + Math.floor(baseG/3) + (sub>=2 ? 1 : 0);
  if (opt.affix) afCount += opt.affix;
  afCount = U.clamp(afCount, 1, 6);

  // 先定形制（决定能戴哪里），再按形制偏好抽词条
  var tt = opt.type ? (D.TTK[opt.type] || U.weighted(D.TREASURE_TYPES, 'w')) : U.weighted(D.TREASURE_TYPES, 'w');
  if (opt.preferType && D.TTK[opt.preferType] && U.chance(0.55)) tt = D.TTK[opt.preferType];

  var affixes = [];
  var used = {};
  for (var i=0;i<afCount;i++){
    var pool = D.AFFIX.filter(function(x){ return !used[x.k]; });
    if (!pool.length) break;
    var pref = pool.filter(function(x){ return tt.aff.indexOf(x.k) >= 0; });
    var a = (pref.length && U.chance(0.72)) ? U.pick(pref) : U.pick(pool);
    used[a.k] = 1;
    var v = U.rnd(a.v[0], a.v[1]) * (1 + baseG*0.16) * (1 + sub*0.08) * luck;
    if (a.fmt === 'flat'){
      v = Math.round(U.rnd(a.v[0], a.v[1]));
      if (v === 0) v = (a.v[0] < 0 && a.v[1] > 0) ? (U.chance(0.5) ? 1 : -1) : (a.v[0] >= 0 ? 1 : -1);
    }
    affixes.push({ k:a.k, n:a.n, v:v, fmt:a.fmt, desc:a.desc });
  }
  // 特殊词条
  var spP = 0.05 + baseG*0.018 + (opt.sp||0);
  if (U.chance(spP * luck)){
    var sp = U.pick(D.SPECIAL);
    affixes.push({ k:sp.k, n:sp.n, sp:true, v:0, desc:sp.desc });
  }
  var names = D.TREASURE_N[el] || D.TREASURE_N.tu;
  var nm = U.pick(names) + tt.n;
  var t = {
    id: 'T' + (G.seq++),
    name: nm, el: el, g: baseG, s: sub,
    type: tt.k, typeN: tt.n, slots: tt.slots.slice(),
    affixes: affixes,
    power: D.gv(baseG, sub) * (1 + affixes.length*0.22),
    lock: false
  };
  G.seen.treasure[D.gradeName(baseG, sub)] = 1;
  return t;
};
G.addTreasure = function(t){
  if (!t) return;
  G.treasures.push(t);
  G.log('获得法宝 <b class="val">'+t.name+'</b> <span class="tag gold">'+D.gradeName(t.g,t.s)+'</span> ['+D.ROOT[t.el].n+']');
  if (G.auto.arrayFill) G.autoFillArray();
};
G.bestTreasure = function(){
  var b = null;
  G.treasures.forEach(function(t){ if (!b || t.power > b.power) b = t; });
  return b;
};
G.treasureById = function(id){
  for (var i=0;i<G.treasures.length;i++) if (G.treasures[i].id === id) return G.treasures[i];
  return null;
};

/* ============ 灵阵计算 ============ */
G.arrayDetail = function(){
  var P = 0, cultAdd = 0, statAdd = {atk:0,def:0,hp:0,spd:0,crit:0,cdmg:0,dodge:0,heal:0,alch:0,forg:0,form:0,sect:0,luck:0,all:0,heart:0,karma:0,tribulation:0,breakthrough:0,herb:0,mix:0};
  var sps = [], origins = [];
  var nodeFit = [];
  for (var i=0;i<12;i++){
    var t = G.treasureById(G.slots[i]);
    var nd = D.NODES12[i];
    if (!t){ nodeFit.push(0); continue; }
    var rel = (nd.el === 'any') ? 'any' : D.rel(t.el, nd.el);
    var fit = 1.0;
    if (rel === 'any') fit = 1.20;
    else if (rel === 'same') fit = 1.28;
    else if (rel === 'sheng' || rel === 'bei') fit = 1.12;
    else if (rel === 'ke' || rel === 'beke') fit = 0.78;
    nodeFit.push(fit);
    P += t.power * fit;
    t.affixes.forEach(function(a){
      if (a.origin){ origins.push(a); return; }        // 来历词条在 gatherBonuses 里统一去重结算
      if (a.sp){ sps.push(a); return; }
      if (a.k === 'cult') cultAdd += a.v;
      else if (a.k === 'all'){ statAdd.all += a.v; }
      else if (statAdd[a.k] !== undefined) statAdd[a.k] += a.v;
    });
  }
  // 相邻阵势
  var adjBonus = 0, adjCount = 0;
  for (var a=0;a<12;a++){
    if (!G.slots[a]) continue;
    var ta = G.treasureById(G.slots[a]);
    if (!ta){ G.slots[a] = null; continue; }      // 失效引用自愈
    D.NODE_ADJ[a].forEach(function(b){
      if (b < a || !G.slots[b]) return;
      var tb = G.treasureById(G.slots[b]);
      if (!tb){ G.slots[b] = null; return; }      // 失效引用自愈
      var r = D.rel(ta.el, tb.el);
      adjCount++;
      if (r === 'sheng' || r === 'bei') adjBonus += 0.07;
      else if (r === 'same') adjBonus += 0.035;
      else if (r === 'ke' || r === 'beke') adjBonus -= 0.07;
    });
  }
  var mult = 1 + adjBonus + (G.rebirth.stars.array||0)*0.10 + G.formArrayBonus();
  var total = P * mult;
  return { P: P, fit: nodeFit, mult: mult, adj: adjBonus, adjCount: adjCount, total: total, cultAdd: cultAdd, statAdd: statAdd, sps: sps, origins: origins };
};
G.arrayPower = function(){ return G.arrayDetail().total; };
G.formArrayBonus = function(){
  var a = G.arrays || {};
  var b = 0;
  if (a.juling) b += 0.10 * (a.juling.lv||1);
  if (a.shalu)  b += 0.06 * (a.shalu.lv||1);
  return b;
};
G.autoFillArray = function(){
  // 自动把最强法宝填入最合适的空阵眼
  var used = {};
  G.slots.forEach(function(id){ if (id) used[id] = 1; });
  var free = [];
  for (var i=0;i<12;i++) if (!G.slots[i]) free.push(i);
  var pool = G.treasures.filter(function(t){ return !used[t.id] && !t.lock; }).sort(function(a,b){ return b.power - a.power; });
  for (var p=0; p<pool.length && free.length; p++){
    var t = pool[p], best = -1, bestScore = -1;
    free.forEach(function(fi){
      var nd = D.NODES12[fi];
      var rel = (nd.el === 'any') ? 'any' : D.rel(t.el, nd.el);
      var sc = t.power * (rel==='any'?1.20:rel==='same'?1.28:(rel==='sheng'||rel==='bei')?1.12:(rel==='ke'||rel==='beke')?0.78:1.0);
      if (sc > bestScore){ bestScore = sc; best = fi; }
    });
    G.slots[best] = t.id;
    free.splice(free.indexOf(best),1);
  }
};

/* ============ 加成汇总（分支 + 功法 + 词条 + 星盘 + buff） ============ */
G.gatherBonuses = function(){
  var b = { atk:0, def:0, hp:0, spd:0, crit:0, cdmg:0, dodge:0, cult:0, heal:0, alch:0, forg:0, form:0, sect:0, luck:0, all:0, heart:0, karma:0, herb:0, breakthrough:0, tribulation:0, mix:0 };
  function add(o, m){
    if (!o) return; m = m===undefined?1:m;
    for (var k in o){ if (b[k] !== undefined && typeof o[k] === 'number') b[k] += o[k]*m; }
  }
  // 境界分支
  for (var rk in G.branch){
    var br = D.BRANCHES[G.branch[rk]];
    if (br) add(br.eff, 1);
  }
  // 金丹品级加成
  if (G.node >= 9 && G.jindan > 0){
    var jb = (9 - G.jindan) * 0.035;   // 一品 +28%
    b.all += jb;
  }
  // 功法（被动）：装备在功法栏的 100% 生效；未装备的按 25% 生效（参悟即有所得）
  for (var id in G.techs){
    var t = D.TK[id]; if (!t) continue;
    if (t.kind !== 'passive') continue;
    var lvm = 1 + (G.techs[id]-1)*0.12;
    add(t.eff, lvm * (G.isTechEquipped(id) ? 1 : 0.25));
  }
  // 灵阵词条
  var ad = G.arrayDetail();
  add(ad.statAdd, 1);
  // 人物装备（6 格）
  var ed = G.equipDetail();
  add(ed.add, 1);
  // 特殊词条：阵眼与随身合并去重（供战斗与修炼读取）
  var spSet = {};
  (ad.sps || []).forEach(function(s){ spSet[s.k] = 1; });
  (ed.sps || []).forEach(function(s){ spSet[s.k] = 1; });
  G._spSet = spSet;
  if (spSet.dao) b.cult += 0.25;            // 太上忘情：修炼速度 +25%
  // 来历词条的印记（供战斗/参悟读取）
  var orSet = {}, orList = [], orSeen = {};
  function takeOrigin(list){
    (list || []).forEach(function(o){
      if (orSeen[o.k]) return;                  // 同一种来历只算一次，不叠加
      orSeen[o.k] = 1;
      orList.push(o);
      if (o.flag) orSet[o.flag] = 1;
      if (o.eff) for (var ek in o.eff){
        if (ek === 'cult') b.cult += o.eff[ek];
        else if (b[ek] !== undefined) b[ek] += o.eff[ek];
      }
    });
  }
  takeOrigin(ad.origins);
  takeOrigin(ed.origins);
  G._orSet = orSet;
  G._orList = orList;
  // 五行套装（阵眼 / 装备位 同属成组）
  if (G.setInfo){ var si = G.setInfo(); if (si && si.bonus) b.all += si.bonus; }
  // 生命/攻击永久加成
  b.hp += G.hpPermanent; b.atk += G.atkPermanent;
  // 星盘
  var s = G.rebirth.stars || {};
  b.cult += (s.speed||0)*0.15;
  b.atk  += (s.power||0)*0.15;
  b.def  += (s.guard||0)*0.14; b.hp += (s.guard||0)*0.14;
  b.alch += (s.alchemy||0)*0.10;
  b.forg += (s.forge||0)*0.10;
  b.form += (s.array||0)*0.10;
  b.sect += (s.sect||0)*0.18;
  b.luck += (s.luck||0)*0.08;
  b.tribulation += (s.tribu||0)*0.08 + (s.karma||0)*0.06;
  b.breakthrough += (s.heart||0)*0.05;
  // 阵法
  if (G.formEff) add(G.formEff(), 1);
  // 宗门讲经堂
  if (G.sectCultBonus) b.cult += G.sectCultBonus();
  // 道
  if (G.dao && D.DAOS[G.dao]) add(D.DAOS[G.dao].eff, 1);
  // 限时 buff
  G.buffs.forEach(function(bf){ if (b[bf.k] !== undefined) b[bf.k] += bf.v; });
  // —— 软上限：压住后期百分比加成的线性膨胀 ——
  var SOFT = {
    atk:[1400,0.22], def:[900,0.22], hp:[14000,0.20], spd:[55,0.25], mix:[300,0.25],
    crit:[0.45,0.25], cdmg:[1.6,0.25], dodge:[0.5,0.25],
    cult:[1.2,0.30], luck:[0.6,0.25], heal:[0.8,0.25], alch:[0.8,0.25],
    forg:[0.8,0.25], form:[0.8,0.25], sect:[1.0,0.25], herb:[0.6,0.25],
    breakthrough:[0.4,0.25], tribulation:[0.4,0.25], all:[0.7,0.18]
  };
  for (var sk in SOFT){
    if (b[sk] === undefined) continue;
    if (b[sk] > SOFT[sk][0]) b[sk] = U.soft(b[sk], SOFT[sk][0], SOFT[sk][1]);
  }
  return b;
};
G.addBuff = function(k, v, sec, name){
  G.buffs = G.buffs.filter(function(b){ return !(b.k===k && b.name===name); });
  G.buffs.push({ k:k, v:v, name:name||k, until: Date.now() + sec*1000 });
};
G.tickBuffs = function(){
  var now = Date.now(), ch = false;
  G.buffs = G.buffs.filter(function(b){
    if (b.until <= now){ ch = true; return false; }
    return true;
  });
  return ch;
};

/* ============ 主计算：人物属性 ============ */
G.recalc = function(){
  var b = G.gatherBonuses();
  var all = 1 + b.all;
  var ad = G.arrayDetail();
  var ed = G.equipDetail();
  var P = ad.total, Peq = ed.P;

  var baseHp  = 120 + 62 * G.node;
  var baseAtk = 9 + 3.4 * G.node;
  var baseDef = 4 + 1.7 * G.node;
  var baseSpd = 10 + 0.8 * G.node;

  var Ps   = U.soft(P, 900, 0.25);      // 灵阵灵力软上限
  var Peqs = U.soft(Peq, 450, 0.25);    // 装备灵力软上限

  /* 战斗四维走「数值制」——词条、装备、灵力全部换算成定值再相加，
     只有境界分支 / 金丹 / 道 / 星盘这类稀有来源才用一点点百分比（乘在最后）。 */
  var F = { atk: b.atk, def: b.def, hp: b.hp, spd: b.spd };
  F.atk += b.mix * 1.00 + Ps * 0.55 + Peqs * 0.45;
  F.def += b.mix * 0.70 + Ps * 0.40 + Peqs * 0.34;
  F.hp  += b.mix * 8.00 + Ps * 4.20 + Peqs * 3.40;
  F.spd += b.mix * 0.07 + Ps * 0.035 + Peqs * 0.030;

  var st = {
    hp:  Math.floor((baseHp  + F.hp)  * all),
    atk: (baseAtk + F.atk) * all,
    def: (baseDef + F.def) * all,
    spd: (baseSpd + F.spd),
    crit: U.clamp(0.05 + b.crit, 0, 0.85),
    cdmg: 1.5 + b.cdmg,
    dodge: U.clamp(0.02 + b.dodge, 0, 0.6),
    hit: 0.96,
    heal: b.heal
  };
  st.maxhp = st.hp;
  // 战力
  st.power = Math.floor(st.atk*3 + st.def*2 + st.hp*0.12 + st.spd*2 + st.crit*400 + st.cdmg*80);

  G.der = {
    b: b, array: ad, equip: ed, P: P, Peq: Peq,
    st: st,
    realmMult: Math.pow(1.28, G.node),
    rootMult: G.rootSpeedMult(),
    elem: G.mainRoot()
  };
  G.der.cultMul = G.der.realmMult * G.der.rootMult * (1 + b.cult) * (1 + Ps*0.0015 + ad.cultAdd);
  return G.der;
};

/* 每秒修为 */
G.qiRate = function(){
  if (!G.der) G.recalc();
  var d = G.der;
  var sectB = G.sectCultBonus();
  var q = 1 * d.cultMul * (1 + sectB) * G.rebirthMult();
  if (G.isChaos()) q *= 1.5;
  return q;
};
/* 突破所需修为：前若干节点轻快，之后追加陡度（避免过早满级）
   参数可在调试面板中扫描：G.REQ_BASE / G.REQ_KNEE / G.REQ_ADD / G.EARLY */
G.REQ_BASE = 200;    // 基准系数
G.REQ_KNEE = 6;      // 从第几节点开始追加陡度
G.REQ_ADD  = 1.062;  // 追加陡度
G.EARLY    = 0.26;   // 淬体~炼气阶段的消耗折扣（线性回到 1.0，保证开局手感）
G.qiNeed = function(node){
  node = (node === undefined) ? G.node : node;
  var v = G.REQ_BASE * Math.pow(1.58, node);
  if (node > G.REQ_KNEE) v *= Math.pow(G.REQ_ADD, node - G.REQ_KNEE);
  if (node < G.REQ_KNEE) v *= (G.EARLY + (1 - G.EARLY) * node / G.REQ_KNEE);
  return v;
};
/* 轮回的全局加速：每转世一世 +30%，飞升一次 +15% */
G.rebirthMult = function(){
  return 1 + (G.rebirth.count || 0) * 0.30 + (G.rebirth.ascends || 0) * 0.15;
};
G.qiProgress = function(){ return U.clamp(G.qi / G.qiNeed(), 0, 1); };

/* ============ 资源 ============ */
G.addQi = function(n){
  if (n <= 0) return;
  G.qi += n;
  if (G.qi > G.stats.maxQi) G.stats.maxQi = G.qi;
  if (G.auto.break) G.checkBreak();
};
G.addSpirit = function(n){
  G.spirit = Math.max(0, G.spirit + n);
};
G.addItem = function(kind, key, n){
  if (!key || !n) return;
  var bag = G.bag[kind];
  bag[key] = (bag[key]||0) + n;
};
G.itemCount = function(kind, key){ return (G.bag[kind][key]||0); };
G.useItem = function(kind, key, n){
  n = n||1;
  if ((G.bag[kind][key]||0) < n) return false;
  G.bag[kind][key] -= n;
  if (G.bag[kind][key] <= 0) delete G.bag[kind][key];
  return true;
};
G.randHerbKey = function(tier){
  var pool = D.HERBS.filter(function(h){ return tier ? h.t === tier : true; });
  if (!pool.length) pool = D.HERBS;
  return U.pick(pool).k;
};
G.randOreKey = function(tier){
  var pool = D.ORES.filter(function(o){ return tier ? o.t === tier : true; });
  if (!pool.length) pool = D.ORES;
  return U.pick(pool).k;
};
G.hurt = function(frac){
  // 正数受伤（影响下次战斗的初始气血），负数视为疗伤
  G._wound = U.clamp((G._wound||0) + frac, 0, 0.85);
};
G.heal = function(frac){
  G._wound = U.clamp((G._wound||0) - frac, 0, 0.9);
};
G.addKarma = function(n){
  var half = (G.rebirth.stars.karma||0);
  if (n < 0 && half) n = n * Math.pow(0.5, half);
  G.karma = U.clamp(G.karma + n, -100, 100);
};
G.addHeart = function(n){
  G.heart = U.clamp(G.heart + n, 0, G.maxHeart());
};
G.maxHeart = function(){ return 100 + (G.rebirth.stars.heart||0)*10 + (G.flags.bigHeart?20:0); };
G.addTechShard = function(n){
  G.shards += (n||1);
  G.log('获得 <b class="val">功法碎片 ×'+(n||1)+'</b>');
};
G.learnTech = function(id){
  var t = D.TK[id]; if (!t) return false;
  if (G.techs[id]) return false;
  G.techs[id] = 1;
  G.seen.tech[id] = 1;
  G.log('参悟功法 <b class="val">'+t.n+'</b>');
  G.recalc();
  return true;
};
/* 参悟/精进所需碎片：基础 1（特殊功法 3）× 目标等级 */
G.techUpCost = function(id){
  var t = D.TK[id]; if (!t) return 999;
  var lv = G.techs[id] || 0;
  var base = (t.sp ? 3 : 1) * (lv + 1);
  if (G.hasOrigin && G.hasOrigin('shardSave')) base = Math.max(1, base - 1);   // 太古之印
  return base;
};
/* 该功法当前是否满足参悟条件
   max 圆满 / lv 可精进 / can 可参悟 / poor 碎片不足 / lock 灵根未达 / seal 境界未达 */
G.TECH_SEAL_NODE = 9;                      // 秘传功法需金丹境（节点 9）
G.techState = function(t){
  var lv = G.techs[t.id] || 0;
  if (lv >= D.TECH_LVMAX) return 'max';
  if (t.sp && lv === 0 && G.node < G.TECH_SEAL_NODE) return 'seal';
  if (lv === 0 && t.el !== 'any' && (G.roots[t.el] || 0) < t.req) return 'lock';
  if (G.shards < G.techUpCost(t.id)) return 'poor';
  return lv > 0 ? 'lv' : 'can';
};
/* 一键参悟：优先补齐未参悟者，其次匀给等级最低者 */
G.autoLearn = function(){
  var learned = 0, spent = 0, guard = 0;
  while (guard++ < 80){
    var cand = null;
    D.TECHS.forEach(function(t){
      var lv = G.techs[t.id] || 0;
      if (lv >= D.TECH_LVMAX) return;
      if (lv === 0 && t.el !== 'any' && (G.roots[t.el] || 0) < t.req) return;
      var c = G.techUpCost(t.id);
      if (G.shards - spent < c) return;
      if (lv === 0 && t.sp && G.node < G.TECH_SEAL_NODE) return;
      if (!cand) { cand = { id:t.id, lv:lv, c:c, sp:t.sp?1:0 }; return; }
      var better = (lv === 0 && cand.lv !== 0) ||
                   (lv === cand.lv && c < cand.c) ||
                   (lv === 0 && cand.lv === 0 && c < cand.c);
      if (better) cand = { id:t.id, lv:lv, c:c, sp:t.sp?1:0 };
    });
    if (!cand) break;
    spent += cand.c;
    if (!cand.lv){ G.learnTech(cand.id); learned++; }
    else { G.techs[cand.id] = cand.lv + 1; }
  }
  G.shards -= spent;
  if (spent > 0){
    G.recalc();
    G.log('参悟功法：新悟 <b class="val">'+learned+'</b> 门，耗碎片 '+spent);
  }
  return { learned: learned, spent: spent };
};
G.hasBranch = function(name){
  for (var k in G.branch) if (G.branch[k] === name) return true;
  return false;
};
G.alchPower = function(){ return 1 + G.gatherBonuses().alch + G.sectBuildBonus('danfang'); };
G.forgePower = function(){ return 1 + G.gatherBonuses().forg + G.sectBuildBonus('qifang'); };
G.formPower = function(){ return 1 + G.gatherBonuses().form + G.sectBuildBonus('zhentang'); };
G.rollChance = function(p){
  var l = 1 + G.gatherBonuses().luck + (G.rebirth.stars.fortune||0)*0.08;
  return Math.random() < U.clamp(p, 0, 0.98);
};
G.rollExplore = function(p, okMsg, failMsg){
  if (G.rollChance(p)){ if (okMsg) G.log(okMsg); return okMsg || '成功'; }
  if (failMsg) G.log(failMsg);
  return failMsg || '失败';
};

/* ============ 日志 ============ */
function logImpl(msg, cls){
  var t = new Date();
  var hh = ('0'+t.getHours()).slice(-2) + ':' + ('0'+t.getMinutes()).slice(-2) + ':' + ('0'+t.getSeconds()).slice(-2);
  G.logs = G.logs || [];
  G.logs.unshift({ t: hh, m: msg, c: cls || '' });
  if (G.logs.length > 80) G.logs.length = 80;
  if (XX.UI && XX.UI.dirtyLog !== undefined) XX.UI.dirtyLog = true;
}
G.log = logImpl;
G._logImpl = logImpl;

/* ============ 存档 ============ */
G.serialize = function(){
  var d = {};
  var skip = { der:1, logs:1, _wound:1 };
  for (var k in G){
    if (typeof G[k] === 'function') continue;
    if (skip[k]) continue;
    d[k] = G[k];
  }
  d.last = Date.now();
  return d;
};
G.save = function(){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify(G.serialize()));
    G._lastSave = Date.now();
    return true;
  }catch(e){ console.warn('存档失败', e); return false; }
};
G.load = function(){
  try{
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    var d = JSON.parse(raw);
    if (!d || d.ver !== 2) return false;       // 版本不符一律弃档
    for (var k in d) G[k] = d[k];
    return true;
  }catch(e){ console.warn('读档失败', e); return false; }
};
G.hardReset = function(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  var nm = G.name;
  G.newGame();
  G.name = nm;
  G.rollInitialRoots();
  G.recalc();
  G.syncUnlock();
  G.seen.intro = 1;      // 同会话内重置不再走新手弹窗，但需放行自动突破
};

/* ============ 离线结算 ============ */
G.offlineReport = null;
G.settleOffline = function(){
  var now = Date.now();
  var dt = Math.max(0, (now - (G.last || now)) / 1000);
  if (dt < 20) return;
  var cap = 12 * 3600;
  var eff = Math.min(dt, cap);
  G.recalc();
  var rate = G.qiRate();
  var qi = rate * eff * 0.5;                       // 离线 50%
  var sp = G.sectSpiritRate() * eff * 0.6;
  var hb = {}, or = {};
  var hrate = G.sectHerbRate() * eff * 0.5;
  var orate = G.sectOreRate() * eff * 0.5;
  for (var i=0;i<Math.min(hrate, 400);i++){ var k=G.randHerbKey(); hb[k]=(hb[k]||0)+1; }
  for (var j=0;j<Math.min(orate, 400);j++){ var k2=G.randOreKey(); or[k2]=(or[k2]||0)+1; }

  var nodeBefore = G.node;
  G.qi += qi;
  G.spirit += sp;
  for (var k3 in hb) G.addItem('herb', k3, hb[k3]);
  for (var k4 in or) G.addItem('ore', k4, or[k4]);
  // 离线也会尝试突破（不触发天劫）
  var ups = 0;
  while (G.qi >= G.qiNeed() && G.node < D.MAXNODE){
    var r = Math.floor(G.node/3);
    var next = G.node + 1;
    if (next % 3 === 0 && !G.branch[r] ) break;      // 需要选择分支，暂停
    if (next % 3 === 0 && D.REALMS[Math.floor(next/3)] && !G.flags['trib_'+next]) break; // 需渡劫
    G.qi -= G.qiNeed(); G.node = next; ups++;
  }
  G.recalc();
  G.offlineReport = { dt: dt, eff: eff, qi: qi, sp: sp, herb: hb, ore: or, ups: ups, nodeBefore: nodeBefore };
};
})();
