/* ===========================================================
   02b-gen.js  —  法宝「机缘生成」系统（Sig 驱动）
   -----------------------------------------------------------
   理念：法宝不该被"抽"出来，而该被"长"出来 —— 怎么来的，就长什么样。
   每一件法宝都带一段「来历」，来历决定它的属性、形制、词条与专属印记。

   统一输入 = 机缘签名 Sig：
     { source, el, elMix, tier, typeBias, affBias, tags,
       shape, luck, boss, namePrefix, originBonus, consumeTags }
   =========================================================== */
(function(){
var U = XX.U, D = XX.D, G = XX.G;

/* ---------------- 来历词条（Origin） ----------------
   三层词条的第三层：由 Sig.tags 决定，专属、强力、不在普通池中出现 */
D.ORIGIN = [
  { tag:'blood',      n:'血煞', eff:{atk:0.08},                    flag:'killHeal',  desc:'攻击 +8%，致命一击回复 8% 气血' },
  { tag:'ancient',    n:'太古', eff:{all:0.05},                    flag:'shardSave', desc:'全属性 +5%，参悟功法碎片 -1' },
  { tag:'shadow',     n:'幽冥', eff:{crit:0.05, cult:0.10},                          desc:'暴击 +5%，修炼速度 +10%' },
  { tag:'thunder',    n:'雷罚', eff:{cdmg:0.14},                   flag:'backlash',  desc:'暴伤 +14%，受击时 10% 反伤' },
  { tag:'beast',      n:'兽魂', eff:{hp:0.09, atk:0.05},                             desc:'气血 +9%，攻击 +5%' },
  { tag:'sect',       n:'宗门', eff:{sect:0.13},                                     desc:'宗门产出 +13%' },
  { tag:'karma_good', n:'善缘', eff:{luck:0.10, tribulation:0.05},                   desc:'机缘 +10%，天劫威力 -5%' },
  { tag:'karma_bad',  n:'血债', eff:{atk:0.12, cult:-0.03},                          desc:'攻击 +12%，修炼 -3%' },
  { tag:'defile',     n:'渎神', eff:{all:0.06},                                      desc:'全属性 +6%（因果蒙尘）' },
  { tag:'craft',      n:'天工', eff:{alch:0.09, forg:0.09, form:0.09},               desc:'炼丹 / 炼器 / 阵法 +9%' },
  { tag:'secret',     n:'玄机', eff:{all:0.05, luck:0.09},                           desc:'全属性 +5%，机缘 +9%' },
  { tag:'pure',       n:'太清', eff:{all:0.06},                                      desc:'全属性 +6%' }
];
D.ORIGIN_TAG = {};
D.ORIGIN.forEach(function(o){ D.ORIGIN_TAG[o.tag] = o; });

/* ---------------- 区域风土（关卡驱动） ---------------- */
D.REGION_SPEC = {
  r0: { type:['pei','yu','zan'],       aff:['cult','heal'], tag:'pure',       when:'品阶下限更高，照顾新手' },
  r1: { type:['xue','lv','qi'],        aff:['spd','luck'],  tag:'shadow',     when:'速度类词条概率提升' },
  r2: { type:['jian','dao','ding'],    aff:['atk','cdmg'],  tag:'blood',      when:'火属法宝品阶 +1' },
  r3: { type:['jing','zhu','pei'],     aff:['heal','cult'], tag:'pure',       when:'水系法宝必带回复词条' },
  r4: { type:['guan','zan','jia'],     aff:['hp','def'],    tag:'beast',      when:'词条数量 +1（材料丰饶）' },
  r5: { type:['qiang','gong','zhong'], aff:['crit','cdmg'], tag:'thunder',    when:'易出「雷罚」来历' },
  r6: { type:['fan','fu','yin'],       aff:['form','forg'], tag:'ancient',    when:'出宝概率最高' },
  r7: { type:['deng','huan','ta'],     aff:['luck','heal'], tag:'defile',     when:'器强力，却带代价' },
  r8: { type:['ta','jing','ding'],     aff:['all'],         tag:'secret',     when:'全局最佳，极稀有' }
};

/* ---------------- 妖兽形制倾向（敌人驱动） ---------------- */
D.BEAST_SPEC = {
  jin:  { type:['jian','dao','jia'],     tag:'pure',       beast:'金甲之类' },
  mu:   { type:['guan','zan','fu'],      tag:'beast',      beast:'草木精怪' },
  shui: { type:['jing','zhu','pei'],     tag:'pure',       beast:'蛟鲛水族' },
  huo:  { type:['jian','ding','deng'],   tag:'blood',      beast:'炎兽火禽' },
  tu:   { type:['jia','pao','zhong'],    tag:'beast',      beast:'岩魔傀儡' },
  feng: { type:['xue','lv','huan'],      tag:'shadow',     beast:'风隼无形' },
  lei:  { type:['qiang','gong','zhong'], tag:'thunder',    beast:'雷兽天罚' },
  guang:{ type:['jing','zhu','ta'],      tag:'karma_good', beast:'祥瑞灵兽' },
  an:   { type:['fan','deng','fu'],      tag:'karma_bad',  beast:'鬼修夜叉' }
};

/* 首领必带的本命来历 */
D.BOSS_TAG = ['ancient','secret','defile','blood','thunder'];

/* ---------------- 命名前缀 ---------------- */
D.NAME_PRE = {
  blood:'血河', ancient:'太古', shadow:'幽影', thunder:'紫雷', beast:'万兽',
  sect:'云台',  karma_good:'灵犀', karma_bad:'血煞', defile:'渎神', craft:'天工',
  secret:'玄机', pure:'太清',
  r0:'青云', r1:'黑风', r2:'赤炎', r3:'寒潭', r4:'万兽',
  r5:'紫雷', r6:'上古', r7:'黄泉', r8:'九霄'
};

/* ---------------- 事件标签（叙事驱动） ----------------
   奇遇/秘境里的抉择会往这里写入标签，下一次生成法宝时被消耗 */
G.eventTags = {};
G.tagNext = function(tag, n){
  if (!D.ORIGIN_TAG[tag]) return;
  if (!G.eventTags) G.eventTags = {};
  G.eventTags[tag] = (G.eventTags[tag] || 0) + (n || 1);
};
G.pendingTagsText = function(){
  var out = [];
  for (var k in (G.eventTags || {})){
    var o = D.ORIGIN_TAG[k];
    if (o) out.push(o.n + '×' + G.eventTags[k]);
  }
  return out.join(' ');
};

/* ==================== 核心生成器 ==================== */
G.genTreasure = function(sig){
  sig = sig || {};

  /* 0. 运气（装备提供的运气钳到 +35%，避免「福缘滚雪球」） */
  var gearLuck = 0;
  try{ gearLuck = U.clamp(G.gatherBonuses().luck || 0, 0, 0.35); }catch(e){ gearLuck = 0; }
  var luck = (sig.luck || 1) * (1 + (G.rebirth.stars.luck || 0) * 0.08 + gearLuck);

  /* 1. 属性 */
  var el = sig.el;
  if (!el){
    if (sig.elMix && Object.keys(sig.elMix).length){
      el = U.weighted(Object.keys(sig.elMix).map(function(k){ return { k:k, w: sig.elMix[k] }; }), 'w').k;
    } else {
      var ks = G.rootKeys();
      el = U.weighted(ks.map(function(k){ return { k:k, w: Math.pow((G.roots[k]||0)+8, 1.3) }; }), 'w').k;
    }
  }
  if (!D.ROOT[el]) el = 'tu';

  /* 2. 品阶 */
  var baseG = (sig.tier !== undefined) ? sig.tier : Math.floor(G.node/3);
  baseG += U.ri(-1, 1);
  baseG += Math.floor((G.rebirth.count || 0) * 0.5);
  baseG += Math.floor((luck - 1) * 3);
  if (sig.minGrade !== undefined) baseG = Math.max(baseG, sig.minGrade);
  baseG = U.clamp(Math.round(baseG), 0, 11);
  var sub = U.clamp(Math.floor(Math.random()*4 * (0.55 + (luck-1)*0.5)), 0, 3);

  /* 3. 形制 */
  var tt = null;
  if (sig.typeBias){
    var cand = Object.keys(sig.typeBias).filter(function(k){ return D.TTK[k]; });
    if (cand.length) tt = D.TTK[U.weighted(cand.map(function(k){ return { k:k, w:sig.typeBias[k] }; }), 'w').k];
  }
  if (sig.type && D.TTK[sig.type]) tt = D.TTK[sig.type];
  if (!tt) tt = U.weighted(D.TREASURE_TYPES, 'w');

  /* 4. 形态：专精（少而精）/ 均衡 / 繁复（多而散） */
  var shape = sig.shape || 'balance';
  var nAff = shape === 'focus' ? U.ri(1,2) : shape === 'dense' ? U.ri(4,5) : U.ri(2,3);
  nAff += Math.floor(baseG / 4);
  if (sig.affix) nAff += sig.affix;
  nAff = U.clamp(nAff, 1, 6);
  var shapeMul = shape === 'focus' ? 1.4 : shape === 'dense' ? 0.72 : 1.0;

  /* 5. 基底词条：形制偏好 + 来源偏好 */
  var prefs = tt.aff.slice();
  if (sig.affBias) Object.keys(sig.affBias).forEach(function(k){ prefs.push(k); });
  var affixes = [], used = {}, i, a;
  for (i = 0; i < nAff; i++){
    var pool = D.AFFIX.filter(function(x){ return !used[x.k]; });
    if (!pool.length) break;
    var pref = pool.filter(function(x){ return prefs.indexOf(x.k) >= 0; });
    a = (pref.length && U.chance(0.55)) ? U.pick(pref) : U.pick(pool);
    used[a.k] = 1;
    var v;
    if (a.fmt === 'flat'){
      v = Math.round(U.rnd(a.v[0], a.v[1]) * (1 + baseG * 0.52) * (1 + sub * 0.10) * shapeMul * (1 + (luck - 1) * 0.4));
      if (v === 0) v = (a.v[0] < 0 && a.v[1] > 0) ? (U.chance(0.5) ? 1 : -1) : (a.v[0] >= 0 ? 1 : -1);
    } else {
      v = U.rnd(a.v[0], a.v[1]) * (1 + baseG * 0.16) * (1 + sub * 0.08) * luck * shapeMul;
    }
    affixes.push({ k:a.k, n:a.n, v:v, fmt:a.fmt, desc:a.desc });
  }

  /* 6. 特殊词条 */
  if (U.chance((0.05 + baseG*0.018 + (sig.sp || 0)) * luck)){
    var sp = U.pick(D.SPECIAL);
    affixes.push({ k:sp.k, n:sp.n, sp:true, v:0, desc:sp.desc });
  }

  /* 7. 来历词条（核心） */
  var tags = (sig.tags || []).slice();
  if (sig.consumeTags && G.eventTags){          // 消耗奇遇/秘境写入的标签
    var consumed = 0;
    Object.keys(G.eventTags).forEach(function(tg){
      if (G.eventTags[tg] > 0 && tags.indexOf(tg) < 0){
        tags.push(tg);
        consumed++;
        G.eventTags[tg]--;
        if (G.eventTags[tg] <= 0) delete G.eventTags[tg];
      }
    });
    if (consumed) sig.originBonus = (sig.originBonus || 0) + 0.3;   // 玩家抉择 → 更高概率烙下来历
  }
  if (sig.boss && U.chance(0.85)) tags.push(U.pick(D.BOSS_TAG));

  var origins = [], seenTag = {};
  var maxOrigin = sig.boss ? 2 : 1;
  // 非首领只从候选标签里随机取 1 个来判定，避免多标签把概率抬得过高
  var cand = [];
  tags.forEach(function(tg){
    if (seenTag[tg]) return;
    seenTag[tg] = 1;
    if (D.ORIGIN_TAG[tg]) cand.push(tg);
  });
  if (!sig.boss) cand = U.shuffle(cand).slice(0, 1);
  cand.forEach(function(tg){
    if (origins.length >= maxOrigin) return;
    var o = D.ORIGIN_TAG[tg];
    var p = 0.22 + baseG * 0.014 + (sig.originBonus || 0);
    if (!U.chance(U.clamp(p, 0, 0.45))) return;
    origins.push(o);
    affixes.push({ k:'o_' + o.tag, n:o.n, origin:true, tag:o.tag, eff:o.eff, flag:o.flag, v:0, desc:o.desc });
  });

  /* 8. 命名：[前缀·来历/地名] + [词缀] + [形制] */
  var names = D.TREASURE_N[el] || D.TREASURE_N.tu;
  var nm = U.pick(names) + tt.n;
  var pre = sig.namePrefix || (origins.length ? (D.NAME_PRE[origins[0].tag] || '') : '');
  if (pre) nm = pre + '·' + nm;

  var t = {
    id: 'T' + (G.seq++),
    name: nm, el: el, g: baseG, s: sub,
    type: tt.k, typeN: tt.n, slots: tt.slots.slice(),
    affixes: affixes,
    power: D.gv(baseG, sub) * (1 + affixes.length * 0.22),
    lock: false,
    src: sig.source || '',
    tags: Object.keys(seenTag)
  };
  G.seen.treasure[D.gradeName(baseG, sub)] = 1;
  return t;
};

/* ==================== 各来源的签名构造 ==================== */

/* 炼器：材料驱动 */
G.sigFromForge = function(k1, k2, k3, fireK){
  var o1 = D.OK[k1], o2 = D.OK[k2], o3 = D.OK[k3];
  if (!o1) return { source:'forge' };
  var sig = {
    source: 'forge',
    el: o1.el,
    elMix: {},
    tier: Math.floor(G.node/3) - 0.2 + (o1.t - 1) * 0.25,
    typeBias: {},
    affBias: {},
    tags: [],
    shape: fireK === 'wu' ? 'focus' : fireK === 'wen' ? 'dense' : 'balance'
  };
  sig.elMix[o1.el] = 0.62;
  sig.elMix[o2.el] = (sig.elMix[o2.el] || 0) + 0.20;
  sig.elMix[o3.el] = (sig.elMix[o3.el] || 0) + 0.18;

  // 辅料定形制
  var AUX = { jin:['jian','dao'], mu:['guan','zan','pei'], shui:['jing','zhu'],
              huo:['jian','ding'], tu:['jia','pao','zhong'], feng:['xue','lv'],
              lei:['qiang','gong'], guang:['jing','ta'], an:['fan','deng','fu'] };
  (AUX[o2.el] || []).forEach(function(k, i){ sig.typeBias[k] = (sig.typeBias[k]||0) + (4 - i*1.5); });
  (AUX[o3.el] || []).forEach(function(k, i){ sig.typeBias[k] = (sig.typeBias[k]||0) + (2 - i*0.8); });

  // 引材定词条倾向
  (AUX[o3.el] || []).forEach(function(){});
  var AFFB = { jin:{atk:2, crit:1}, mu:{cult:2, hp:1}, shui:{heal:2, def:1},
               huo:{atk:2, cdmg:1.5}, tu:{hp:2, def:1.5}, feng:{spd:2, dodge:1.5},
               lei:{crit:2, cdmg:2}, guang:{heal:2, luck:1.5}, an:{atk:2, cult:1} };
  [o1, o2, o3].forEach(function(o, i){
    var m = AFFB[o.el] || {};
    for (var k in m) sig.affBias[k] = (sig.affBias[k]||0) + m[k] * (i === 0 ? 1 : i === 1 ? 0.7 : 0.5);
  });

  // 材料关系：同属 / 相生 / 相克
  var rel12 = D.rel(o1.el, o2.el), rel13 = D.rel(o1.el, o3.el), rel23 = D.rel(o2.el, o3.el);
  var rels = [rel12, rel13, rel23];
  var shengN = rels.filter(function(r){ return r === 'sheng' || r === 'bei'; }).length;
  var keN = rels.filter(function(r){ return r === 'ke' || r === 'beke'; }).length;
  var sameN = rels.filter(function(r){ return r === 'same'; }).length;
  if (sameN >= 2){ sig.tags.push('pure'); sig.originBonus = (sig.originBonus||0) + 0.12; }
  if (shengN >= 2){ sig.affix = (sig.affix||0) + 1; }                 // 连环相生：多一条词条
  if (keN >= 1){                                                       // 逆炼：品阶 -1，但必带来历
    sig.tier -= 1;
    sig.originBonus = (sig.originBonus||0) + 0.5;
    sig.tags.push('blood');
  }
  sig.rel = { shengN:shengN, keN:keN, sameN:sameN };
  return sig;
};

/* 妖兽掉落：敌人驱动 + 区域风土 */
G.sigFromEnemy = function(cfg, region){
  cfg = cfg || {};
  var r = region || D.REGIONS[0];
  var el = cfg.el || r.el;
  var bs = D.BEAST_SPEC[el] || {};
  var rs = D.REGION_SPEC[r.id] || {};
  var sig = {
    source: 'drop',
    el: el,
    tier: Math.floor(G.node/3) - 0.75 + Math.min((r.t - 1) * 0.12, 0.9) + (cfg.boss ? 0.7 : 0),
    typeBias: {}, affBias: {}, tags: [],
    boss: !!cfg.boss,
    consumeTags: true,
    namePrefix: cfg.boss ? (D.NAME_PRE[rs.tag] || D.NAME_PRE[r.id] || '') : (D.NAME_PRE[r.id] || '')
  };
  (bs.type || []).forEach(function(k, i){ sig.typeBias[k] = (sig.typeBias[k]||0) + (4 - i*1.2); });
  (rs.type || []).forEach(function(k, i){ sig.typeBias[k] = (sig.typeBias[k]||0) + (2.5 - i*0.9); });
  (rs.aff  || []).forEach(function(k, i){ sig.affBias[k]  = (sig.affBias[k] ||0) + (3 - i*1.2); });
  if (bs.tag) sig.tags.push(bs.tag);
  if (rs.tag) sig.tags.push(rs.tag);

  /* 区域特产机制 */
  if (r.id === 'r0') sig.minGrade = Math.max(0, Math.floor(G.node/3) - 1);   // 青云：保底
  if (r.id === 'r2' && el === 'huo') sig.tier += 1;                          // 赤炎：火属 +1
  if (r.id === 'r3' && el === 'shui') sig.affBias.heal = 6;                  // 寒潭：必带回复
  if (r.id === 'r4') sig.affix = (sig.affix||0) + 1;                         // 万兽：词条 +1
  if (r.id === 'r6') sig.originBonus = (sig.originBonus||0) + 0.15;          // 遗迹：出宝更优
  if (r.id === 'r8'){ sig.tier += 1; sig.originBonus = (sig.originBonus||0) + 0.2; }
  return sig;
};

/* 秘境：层数与抉择驱动 */
G.sigFromRegion = function(region, layer){
  layer = layer || 0;
  var s = G.sigFromEnemy({}, region);
  s.source = 'secret';
  s.tier += layer * 0.55;
  s.luck = 1 + layer * 0.08;
  s.originBonus = (s.originBonus || 0) + layer * 0.06;
  s.tags.push('secret');
  s.namePrefix = D.NAME_PRE['secret'];
  return s;
};

/* 兼容旧接口：{el, lv, lucky, affix, sp, type, preferType, consumeTags, source} */
G.sigFromOpt = function(opt){
  opt = opt || {};
  var s = { source: opt.source || 'generic' };
  if (opt.tags) s.tags = opt.tags.slice();
  else s.tags = [];
  if (opt.el) s.el = opt.el;
  if (opt.lv !== undefined) s.tier = Math.max(0, Math.floor(G.node/3) + opt.lv);
  if (opt.type && D.TTK[opt.type]) s.type = opt.type;
  if (opt.preferType && D.TTK[opt.preferType]){ s.typeBias = {}; s.typeBias[opt.preferType] = 1; }
  if (opt.affix) s.affix = opt.affix;
  if (opt.sp) s.sp = opt.sp;
  if (opt.lucky) s.luck = 1.35;
  if (opt.shape) s.shape = opt.shape;
  if (opt.namePrefix) s.namePrefix = opt.namePrefix;
  if (opt.boss) s.boss = true;
  if (opt.originBonus) s.originBonus = opt.originBonus;
  s.consumeTags = !!opt.consumeTags || (s.source !== 'forge' && s.source !== 'generic');
  return s;
};

/* ==================== 兼容层 ====================
   旧调用一律转成 Sig 走新生成器 */
G.makeTreasure = function(opt){
  return G.genTreasure(G.sigFromOpt(opt || {}));
};
})();
