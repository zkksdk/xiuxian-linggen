/* ===========================================================
   02c-depth.js  —  长线深度系统
   ① 成就里程碑   ② 五行套装   ③ 法宝重铸   ④ 宗门弟子特性与派遣
   =========================================================== */
(function(){
var U = XX.U, D = XX.D, G = XX.G;

/* ===========================================================
   一、成就 / 里程碑
   =========================================================== */
D.ACHV = [
  /* —— 境界 —— */
  { k:'r_ql',  n:'引气入体', d:'突破至 炼气',      chk:function(g){ return g.node >= 3; },  rew:{spirit:300} },
  { k:'r_zj',  n:'道基初成', d:'突破至 筑基',      chk:function(g){ return g.node >= 6; },  rew:{spirit:800, shard:2} },
  { k:'r_jd',  n:'金丹大道', d:'突破至 金丹',      chk:function(g){ return g.node >= 9; },  rew:{spirit:3000, shard:3} },
  { k:'r_yy',  n:'元婴出窍', d:'突破至 元婴',      chk:function(g){ return g.node >= 12; }, rew:{spirit:1e4, shard:3} },
  { k:'r_hs',  n:'神识化神', d:'突破至 化神',      chk:function(g){ return g.node >= 15; }, rew:{spirit:5e4, shard:5} },
  { k:'r_lx',  n:'虚空炼虚', d:'突破至 炼虚',      chk:function(g){ return g.node >= 18; }, rew:{spirit:2e5, shard:5} },
  { k:'r_ht',  n:'天人合体', d:'突破至 合体',      chk:function(g){ return g.node >= 21; }, rew:{spirit:1e6, shard:6} },
  { k:'r_dc',  n:'大乘之境', d:'突破至 大乘',      chk:function(g){ return g.node >= 24; }, rew:{spirit:5e6, shard:8} },
  { k:'r_dj',  n:'逆天渡劫', d:'突破至 渡劫',      chk:function(g){ return g.node >= 27; }, rew:{spirit:2e7, shard:10} },
  { k:'r_fs',  n:'白日飞升', d:'完成一次飞升',      chk:function(g){ return (g.rebirth.ascends||0) > 0; }, rew:{point:30} },

  /* —— 灵根 —— */
  { k:'p_rare', n:'异种觉醒', d:'觉醒任一条异种灵根（风雷光暗）', chk:function(g){ return ['feng','lei','guang','an'].some(function(k){ return g.roots[k] > 0; }); }, rew:{spirit:2000} },
  { k:'p_res',  n:'灵根共鸣', d:'触发一次灵根共鸣',  chk:function(g){ return g.resonances().length > 0; }, rew:{shard:3} },
  { k:'p_pure', n:'纯化之路', d:'任一灵根纯度达 100', chk:function(g){ return Object.keys(g.roots).some(function(k){ return g.roots[k] >= 99.9; }); }, rew:{shard:5} },
  { k:'p_chaos',n:'混沌灵根', d:'觉醒混沌灵根',      chk:function(g){ return g.isChaos(); }, rew:{point:25} },

  /* —— 灵阵与法宝 —— */
  { k:'a_full', n:'十二归一', d:'填满十二阵眼',      chk:function(g){ return g.slots.filter(Boolean).length >= 12; }, rew:{spirit:2e4} },
  { k:'a_imm',  n:'仙品现世', d:'获得一件仙品法宝',   chk:function(g){ return g.treasures.some(function(t){ return t.g >= 11; }); }, rew:{shard:8} },
  { k:'a_lv4',  n:'五行成套', d:'阵眼中同属法宝达 6 件', chk:function(g){ return G.setInfo().bestArr.n >= 6; }, rew:{spirit:5e4, shard:4} },
  { k:'a_full6',n:'六合齐全', d:'六个装备位全部佩戴',  chk:function(g){ return G.equipDetail().count >= 6; }, rew:{spirit:3e4} },

  /* —— 丹器阵 —— */
  { k:'c_pill', n:'初试丹火', d:'炼出第一炉丹',      chk:function(g){ return g.stats.pills >= 1; }, rew:{spirit:300} },
  { k:'c_perf', n:'完美一炉', d:'炼出完美品质丹药',   chk:function(g){ return g.customPills.concat(g.pillLog||[]).some(function(p){ return p.q >= 5; }) || (g.flags.pillPerfect>0); }, rew:{shard:3} },
  { k:'c_50p',  n:'丹道小成', d:'累计炼丹 50 炉',     chk:function(g){ return g.stats.pills >= 50; }, rew:{shard:5, spirit:2e4} },
  { k:'c_1f',   n:'初开器炉', d:'炼出第一件法宝',      chk:function(g){ return g.stats.forges >= 1; }, rew:{spirit:300} },
  { k:'c_50f',  n:'器道小成', d:'累计炼器 50 件',      chk:function(g){ return g.stats.forges >= 50; }, rew:{shard:5, spirit:2e4} },
  { k:'c_form', n:'奇门初窥', d:'布下第一座阵法',      chk:function(g){ return g.stats.forms >= 1; }, rew:{spirit:2000} },
  { k:'c_7form',n:'七阵齐布', d:'同时布下 7 种阵法',   chk:function(g){ return Object.keys(g.arrays||{}).length >= 7; }, rew:{point:10} },

  /* —— 宗门 —— */
  { k:'s_d1',   n:'开山收徒', d:'招收第一名弟子',      chk:function(g){ return g.sect.disciples.length >= 1; }, rew:{spirit:500} },
  { k:'s_d10',  n:'门庭若市', d:'招收 10 名弟子',      chk:function(g){ return g.sect.disciples.length >= 10; }, rew:{spirit:5e4, shard:4} },
  { k:'s_max',  n:'殿堂齐备', d:'任一建筑升至 12 级',   chk:function(g){ var r=false; for (var k in D.BK){ if (g.buildingLv(k) >= 12) r=true; } return r; }, rew:{spirit:1e5} },
  { k:'s_lv10', n:'名门大派', d:'宗门等级达 10',        chk:function(g){ return g.sectLevel() >= 10; }, rew:{point:12} },
  { k:'s_mis',  n:'派遣初成', d:'完成一次宗门派遣',      chk:function(g){ return (g.sect.misDone||0) >= 1; }, rew:{spirit:3000} },
  { k:'s_mis20',n:'百炼成钢', d:'累计完成 20 次派遣',    chk:function(g){ return (g.sect.misDone||0) >= 20; }, rew:{shard:6, point:8} },

  /* —— 探索与战斗 —— */
  { k:'e_all',  n:'踏遍九域', d:'解锁全部九个区域',      chk:function(g){ return D.REGIONS.every(function(r){ return g.unlockedRegion(r); }); }, rew:{point:15} },
  { k:'e_100',  n:'百战之身', d:'累计战斗 100 场',       chk:function(g){ return g.stats.battles >= 100; }, rew:{shard:6} },
  { k:'e_secret',n:'险中求宝',d:'秘境探索达 4 层以上',   chk:function(g){ return (g.stats.deepest||0) >= 4; }, rew:{shard:5} },

  /* —— 轮回 —— */
  { k:'b_1',    n:'一世浮沉', d:'完成第一次轮回',       chk:function(g){ return g.rebirth.count >= 1; }, rew:{point:10} },
  { k:'b_5',    n:'五世修行', d:'轮回 5 次',            chk:function(g){ return g.rebirth.count >= 5; }, rew:{point:30} },
  { k:'b_10',   n:'十世证道', d:'轮回 10 次',           chk:function(g){ return g.rebirth.count >= 10; }, rew:{point:80} },
  { k:'b_star', n:'星盘初明', d:'点亮 8 颗星',           chk:function(g){ var n=0; for (var k in g.rebirth.stars) n += g.rebirth.stars[k]; return n >= 8; }, rew:{point:15} },
  { k:'b_starall',n:'周天圆满',d:'星盘累计点亮 60 级',   chk:function(g){ var n=0; for (var k in g.rebirth.stars) n += g.rebirth.stars[k]; return n >= 60; }, rew:{point:100} },

  /* —— 因果 —— */
  { k:'k_good', n:'积善成德', d:'因果达 +80',           chk:function(g){ return g.karma >= 80; }, rew:{shard:5} },
  { k:'k_bad',  n:'血债累累', d:'因果达 −80',           chk:function(g){ return g.karma <= -80; }, rew:{shard:5} }
];

G.checkAchv = function(){
  var got = 0;
  for (var i = 0; i < D.ACHV.length; i++){
    var a = D.ACHV[i];
    if (G.flags['achv_' + a.k]) continue;
    var ok = false;
    try{ ok = !!a.chk(G); }catch(e){ ok = false; }
    if (!ok) continue;
    G.flags['achv_' + a.k] = 1;
    got++;
    var r = a.rew || {}, txt = [];
    if (r.spirit){ G.addSpirit(r.spirit); txt.push('灵石 +' + U.fmt(r.spirit)); }
    if (r.shard){ G.shards += r.shard; txt.push('碎片 +' + r.shard); }
    if (r.point){ G.rebirth.points += r.point; txt.push('轮回点 +' + r.point); }
    G.log('<span class="tag gold">成就</span> 达成「<b class="val">' + a.n + '</b>」　' + txt.join('　'));
    if (XX.UI && XX.UI.toast) XX.UI.toast('成就达成：' + a.n);
  }
  if (got){ G.recalc(); if (XX.UI) XX.UI.dirtyLog = true; }
  return got;
};
G.achvCount = function(){
  var c = 0;
  D.ACHV.forEach(function(a){ if (G.flags['achv_' + a.k]) c++; });
  return c;
};
G.achvDone = function(k){ return !!G.flags['achv_' + k]; };

/* ===========================================================
   二、五行套装（阵眼 + 装备位 同属成组）
   =========================================================== */
D.SET_TIERS = [
  { n:3, all:0.03, nm:'同气连枝' },
  { n:6, all:0.07, nm:'五行归一' },
  { n:9, all:0.13, nm:'万法朝宗' }
];
G.setInfo = function(){
  var arr = {}, eq = {};
  G.slots.forEach(function(id){ var t = G.treasureById(id); if (t) arr[t.el] = (arr[t.el] || 0) + 1; });
  D.EQ_SLOTS.forEach(function(s){
    var t = G.treasureById(G.equip ? G.equip[s.k] : null);
    if (t) eq[t.el] = (eq[t.el] || 0) + 1;
  });
  function best(m){
    var b = null, mx = 0;
    for (var k in m){ if (m[k] > mx){ mx = m[k]; b = k; } }
    return { el:b, n:mx };
  }
  var A = best(arr), E = best(eq);
  var bonus = 0, names = [];
  D.SET_TIERS.forEach(function(t){
    if (A.n >= t.n){ bonus += t.all; names.push(t.nm); }
    if (E.n >= t.n){ bonus += t.all * 0.7; names.push(t.nm + '·佩'); }
  });
  return { arr:arr, eq:eq, bestArr:A, bestEq:E, bonus:bonus, names:names };
};

/* ===========================================================
   三、法宝重铸（保留形制 / 品阶 / 来历 / 烙印，重掷天生词条）
   =========================================================== */
G.reforgeCost = function(t){
  return {
    spirit: Math.floor(200 * t.power * (1 + G.node * 0.25)),
    ore: 2,
    el: t.el
  };
};
G.reforge = function(tid){
  var t = G.treasureById(tid);
  if (!t) return false;
  var c = G.reforgeCost(t);
  if (G.spirit < c.spirit){ XX.UI.toast('灵石不足（需 ' + U.fmt(c.spirit) + '）'); return false; }
  var avail = 0;
  Object.keys(G.bag.ore).forEach(function(k){ if (D.OK[k] && D.OK[k].el === t.el) avail += G.bag.ore[k]; });
  if (avail < c.ore){ XX.UI.toast('需 ' + c.ore + ' 枚「' + D.ROOT[t.el].n + '」属性矿石'); return false; }
  G.addSpirit(-c.spirit);
  var left = c.ore;
  Object.keys(G.bag.ore).forEach(function(k){
    while (left > 0 && G.bag.ore[k] > 0 && D.OK[k] && D.OK[k].el === t.el){ G.useItem('ore', k, 1); left--; }
  });
  // 保留：来历 / 灵材烙印 / 特殊词条
  var keep = t.affixes.filter(function(a){ return a.origin || a.infuse || a.sp; });
  var nBase = U.clamp(t.affixes.length - keep.length, 1, 6);
  var prefs = (D.TTK[t.type] ? D.TTK[t.type].aff : []);
  var used = {};
  keep.forEach(function(a){ used[a.k] = 1; });
  var nw = [];
  for (var i = 0; i < nBase; i++){
    var pool = D.AFFIX.filter(function(x){ return !used[x.k]; });
    if (!pool.length) break;
    var pref = pool.filter(function(x){ return prefs.indexOf(x.k) >= 0; });
    var a = (pref.length && U.chance(0.6)) ? U.pick(pref) : U.pick(pool);
    used[a.k] = 1;
    var v;
    if (a.fmt === 'flat'){
      v = Math.round(U.rnd(a.v[0], a.v[1]) * (1 + t.g * 0.52) * (1 + t.s * 0.10));
      if (v === 0) v = 1;
    } else {
      v = U.rnd(a.v[0], a.v[1]) * (1 + t.g * 0.16) * (1 + t.s * 0.08);
    }
    nw.push({ k:a.k, n:a.n, v:v, fmt:a.fmt, desc:a.desc });
  }
  t.affixes = keep.concat(nw);
  t.power = D.gv(t.g, t.s) * (1 + t.affixes.length * 0.22);
  G.stats.reforges = (G.stats.reforges || 0) + 1;
  G.recalc();
  G.log('重铸 <b class="val">' + t.name + '</b>，天生词条焕然一新（耗灵石 ' + U.fmt(c.spirit) + '、' + D.ROOT[t.el].n + '属矿石 ' + c.ore + '）');
  return true;
};

/* ===========================================================
   四、宗门深度：弟子特性 + 派遣任务
   =========================================================== */
D.DIS_TRAITS = [
  { k:'farmer',  n:'灵田熟手', d:'派驻灵田时产出翻倍',        build:'lingtian', m:1.0 },
  { k:'miner',   n:'矿脉慧眼', d:'派驻灵矿时产出翻倍',        build:'lingkuang', m:1.0 },
  { k:'alchemist',n:'丹道天才', d:'派驻丹房时炼丹加成翻倍',    build:'danfang',  m:1.0 },
  { k:'smith',   n:'锻器巧手', d:'派驻器坊时炼器加成翻倍',    build:'qifang',   m:1.0 },
  { k:'arrayer', n:'阵法奇才', d:'派驻阵法堂时阵法加成翻倍',  build:'zhentang', m:1.0 },
  { k:'scholar', n:'博闻强识', d:'派驻讲经堂时修炼加成翻倍',  build:'jiangjing',m:1.0 },
  { k:'keeper',  n:'藏经掌书', d:'派驻藏经阁时碎片产出翻倍',  build:'cangjing', m:1.0 },
  { k:'sword',   n:'剑心通明', d:'弟子战力 +60%',             build:null, m:0 },
  { k:'lucky',   n:'福缘深厚', d:'宗门灵石产出 +18%',         build:null, m:0 },
  { k:'teacher', n:'好为人师', d:'全宗门弟子成长 +50%',        build:null, m:0 }
];
D.TRAITK = {};
D.DIS_TRAITS.forEach(function(t){ D.TRAITK[t.k] = t; });

/* 弟子特性加成（同特性不叠加，取最高） */
G.traitBonus = function(buildKey){
  var m = 0;
  (G.sect.disciples || []).forEach(function(d){
    (d.traits || []).forEach(function(tk){
      var tr = D.TRAITK[tk];
      if (!tr || tr.build !== buildKey) return;
      m = Math.max(m, tr.m);
    });
  });
  return m;
};
G.hasTrait = function(tk){
  var has = false;
  (G.sect.disciples || []).forEach(function(d){ if ((d.traits||[]).indexOf(tk) >= 0) has = true; });
  return has;
};
/* 给新弟子随机特性 */
G.rollTraits = function(){
  var out = [];
  var n = U.chance(0.35) ? 2 : 1;
  var pool = D.DIS_TRAITS.slice();
  for (var i = 0; i < n && pool.length; i++){
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].k);
  }
  return out;
};

D.MISSIONS = [
  { k:'m_herb', n:'采药之行', d:'遣弟子入山采药',      min:2, dur:180,  rew:{ herb:10 } },
  { k:'m_ore',  n:'探矿之旅', d:'深入矿脉开采灵矿',    min:4, dur:240,  rew:{ ore:8 } },
  { k:'m_hunt', n:'猎杀妖患', d:'清剿作乱妖兽换取赏金', min:6, dur:300,  rew:{ spirit:1.0 } },
  { k:'m_ruin', n:'废墟寻宝', d:'探索上古废墟，或有所得', min:9, dur:420, rew:{ spirit:1.6, treasure:1 } },
  { k:'m_secret',n:'险地探秘', d:'九死一生，回报极厚', min:14, dur:600, rew:{ spirit:3.0, treasure:1, shard:2 } }
];
D.MISK = {};
D.MISSIONS.forEach(function(m){ D.MISK[m.k] = m; });

G.missionSlots = function(){ return 1 + Math.floor(G.sectLevel() / 3); };
G.missions = function(){
  if (!G.sect.missions) G.sect.missions = [];
  return G.sect.missions;
};
G.sendMission = function(mk, ids){
  var m = D.MISK[mk];
  if (!m) return false;
  if (ids.length < 1){ XX.UI.toast('至少派 1 名弟子'); return false; }
  if (ids.length < Math.ceil(m.min / 2)){ XX.UI.toast('「' + m.n + '」建议派遣 ' + Math.ceil(m.min/2) + ' 名以上弟子'); }
  var list = G.missions();
  if (list.length >= G.missionSlots()){ XX.UI.toast('派遣名额已满（' + G.missionSlots() + '）'); return false; }
  var busy = {};
  list.forEach(function(x){ x.ids.forEach(function(i){ busy[i] = 1; }); });
  for (var i = 0; i < ids.length; i++){ if (busy[ids[i]]){ XX.UI.toast('有弟子已在任务中'); return false; } }
  var power = 0;
  ids.forEach(function(id){
    var d = null;
    G.sect.disciples.forEach(function(x){ if (x.id === id) d = x; });
    if (d) power += (d.talent || 1) * 2 + (d.node || 0) * 0.6 + ((d.traits||[]).indexOf('sword') >= 0 ? 3 : 0);
  });
  var dur = Math.max(60, m.dur * (1 - Math.min(0.45, power * 0.02)));
  list.push({ k:mk, ids:ids.slice(), endAt: Date.now() + dur * 1000, power:power });
  G.log('<span class="tag gold">宗门</span> 派遣弟子执行「' + m.n + '」，约 ' + U.fmtTimeShort(dur) + ' 后归来');
  return true;
};
G.missionTick = function(){
  var list = G.missions(), done = [];
  var now = Date.now();
  for (var i = list.length - 1; i >= 0; i--){
    if (list[i].endAt <= now){ done.push(list[i]); list.splice(i, 1); }
  }
  done.forEach(function(mi){
    var m = D.MISK[mi.k], r = m.rew, txt = [];
    var mul = 1 + Math.min(0.8, mi.power * 0.02);
    if (r.herb){ var n = Math.round(r.herb * mul); for (var j=0;j<n;j++) G.addItem('herb', G.randHerbKey(U.ri(1,3)), 1); txt.push('灵草 ×' + n); }
    if (r.ore){ var n2 = Math.round(r.ore * mul); for (var j2=0;j2<n2;j2++) G.addItem('ore', G.randOreKey(U.ri(1,3)), 1); txt.push('矿石 ×' + n2); }
    if (r.spirit){ var s = Math.floor(600 * r.spirit * (1 + G.node * 0.4) * mul); G.addSpirit(s); txt.push('灵石 ' + U.fmt(s)); }
    if (r.shard){ G.shards += r.shard; txt.push('碎片 ×' + r.shard); }
    if (r.treasure){ for (var t2=0;t2<r.treasure;t2++) G.addTreasure(G.genTreasure({ source:'sect', boss: U.chance(0.4) })); txt.push('法宝 ×' + r.treasure); }
    // 弟子成长
    mi.ids.forEach(function(id){
      G.sect.disciples.forEach(function(d){
        if (d.id !== id) return;
        d.exp = (d.exp || 0) + 12;
        if (d.exp >= 100){ d.exp -= 100; d.talent = Math.min(6, (d.talent||1) + (U.chance(0.3) ? 1 : 0)); }
        if (U.chance(0.5) && d.node < G.node + 2) d.node++;
      });
    });
    G.sect.misDone = (G.sect.misDone || 0) + 1;
    G.log('<span class="tag gold">宗门</span> 「' + m.n + '」归来：' + txt.join('、'));
    if (XX.UI && XX.UI.toast) XX.UI.toast(m.n + ' 归来：' + txt.join('、'));
  });
  return done.length;
};

/* 建筑产出补上弟子特性 */
G.traitBuildBonus = function(k){
  return 1 + G.traitBonus(k);
};
})();
