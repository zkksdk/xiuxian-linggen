/* ===========================================================
   06-sect.js  —  宗门经营 / 大世界探索 / 秘境
   =========================================================== */
(function(){
var U = XX.U, D = XX.D, G = XX.G;

/* =====================  宗门  ===================== */
D.BUILD_REQ = { lingtian:1, lingkuang:1, danfang:2, qifang:2, jiangjing:3, zhentang:3, cangjing:4, shanmen:4 };

G.sectLevel = function(){
  var tot = 0;
  for (var k in D.BK) tot += (G.sect.buildings[k] || 0);
  return 1 + Math.floor(tot / 4);
};
G.buildingLv = function(k){ return G.sect.buildings[k] || 0; };
G.buildingMax = function(){ return 12; };          // 建筑等级上限，防止加成无限滚
G.buildingCost = function(k){
  var b = D.BK[k];
  var lv = G.buildingLv(k);
  return Math.floor(b.cost * Math.pow(b.mult, lv) * (1 + G.sectLevel()*0.10));
};
G.canBuild = function(k){
  return G.sectLevel() >= (D.BUILD_REQ[k] || 1);
};
G.upgradeBuilding = function(k){
  if (!G.canBuild(k)){ XX.UI.toast('宗门等级不足，需 '+D.BUILD_REQ[k]+' 级宗门'); return; }
  if (G.buildingLv(k) >= G.buildingMax()){ XX.UI.toast(D.BK[k].n + ' 已达 12 级上限'); return; }
  var c = G.buildingCost(k);
  if (G.spirit < c){ XX.UI.toast('灵石不足（需 '+U.fmt(c)+'）'); return; }
  G.addSpirit(-c);
  G.sect.buildings[k] = G.buildingLv(k) + 1;
  G.recalc();
  G.log('宗门 <b class="val">'+D.BK[k].n+'</b> 升至 '+G.sect.buildings[k]+' 级');
  XX.UI.toast(D.BK[k].n + ' → ' + G.sect.buildings[k] + ' 级');
};

/* 弟子 */
G.maxDisciples = function(){ return 3 + G.buildingLv('shanmen')*3 + G.sectLevel(); };
G.recruitCost = function(){ return Math.floor(200 * Math.pow(1.45, G.sect.disciples.length) * (1 + G.node*0.25)); };
G.recruit = function(){
  if (G.sect.disciples.length >= G.maxDisciples()){ XX.UI.toast('山门已满，需扩建山门'); return; }
  var c = G.recruitCost();
  if (G.spirit < c){ XX.UI.toast('灵石不足（需 '+U.fmt(c)+'）'); return; }
  G.addSpirit(-c);
  var el = U.pick(D.RK);
  if (D.ROOT[el].rare && !U.chance(0.25)) el = U.pick(D.RK.slice(0,5));
  var talent = U.clamp(Math.round(U.rnd(1, 5) * (1 + G.gatherBonuses().luck*0.4)), 1, 6);
  var d = {
    id: 'D' + Date.now() + Math.floor(Math.random()*100),
    name: U.pick(D.DIS_N) + U.pick(D.DIS_N2),
    el: el, talent: talent, node: Math.max(0, G.node - G.ri(1,4)),
    assign: null,
    traits: (G.rollTraits ? G.rollTraits() : []),
    exp: 0
  };
  G.sect.disciples.push(d);
  var trN = d.traits.map(function(tk){ return D.TRAITK[tk] ? D.TRAITK[tk].n : tk; }).join('、');
  G.log('招收弟子 <b class="val">'+d.name+'</b>（'+D.ROOT[el].n+'灵根·资质 '+talent+(trN ? '·'+trN : '')+'）');
  G.recalc();
  XX.UI.toast('新弟子：' + d.name);
};
G.assignDisciple = function(id, slot){
  var d = null;
  G.sect.disciples.forEach(function(x){ if (x.id === id) d = x; });
  if (!d) return;
  d.assign = slot || null;
  G.recalc();
};
G.discipleCountAt = function(slot){
  return G.sect.disciples.filter(function(d){ return d.assign === slot; }).length;
};
G.sectBuildBonus = function(k){
  var lv = G.buildingLv(k);
  if (!lv) return 0;
  return lv * 0.11 * (1 + G.discipleCountAt(k)*0.16);
};
G.sectCultBonus = function(){
  var b = G.buildingLv('jiangjing') * 0.06 * (1 + G.discipleCountAt('jiangjing')*0.14);
  // 弟子自行修炼 → 反馈给宗门
  G.sect.disciples.forEach(function(d){ if (!d.assign) b += d.talent * 0.005; });
  return b;
};
G.sectSpiritRate = function(){
  var b = G.buildingLv('shanmen')*0.85 + G.buildingLv('cangjing')*0.5;
  // 基础灵石收益：打坐亦能凝聚灵石，随境界增长（避免开局无灵石可用的死锁）
  var base = 0.8 + Math.pow(1.28, G.node) * 0.5;
  return (base + b) * (1 + G.gatherBonuses().sect) * (1 + G.sectLevel()*0.06);
};
G.sectHerbRate = function(){   // 每分钟
  return G.buildingLv('lingtian') * 1.1 * (1 + G.discipleCountAt('lingtian')*0.18) * (1 + G.gatherBonuses().sect + G.gatherBonuses().herb);
};
G.sectOreRate = function(){    // 每分钟
  return G.buildingLv('lingkuang') * 0.85 * (1 + G.discipleCountAt('lingkuang')*0.18) * (1 + G.gatherBonuses().sect);
};

G._herbAcc = 0; G._oreAcc = 0; G._shardAcc = 0;
G.sectTick = function(dt){
  G._herbAcc += G.sectHerbRate() * dt / 60;
  G._oreAcc  += G.sectOreRate()  * dt / 60;
  G._shardAcc += G.buildingLv('cangjing') * dt / 150;   // 藏经阁：每 2.5 分钟凝出一枚功法碎片
  while (G._herbAcc >= 1){ G._herbAcc -= 1; G.addItem('herb', G.randHerbKey(), 1); }
  while (G._oreAcc  >= 1){ G._oreAcc  -= 1; G.addItem('ore',  G.randOreKey(),  1); }
  if (G._shardAcc >= 1){
    var n = Math.floor(G._shardAcc);
    G._shardAcc -= n;
    G.shards += n;
    G.log('藏经阁中参研经卷，得 <b class="val">功法碎片 ×'+n+'</b>');
  }
  // 器坊：挂机时以库存矿石自动炼制法宝（每级每 3 分钟一次）
  var qf = G.buildingLv('qifang');
  if (qf > 0){
    G._forgeAcc = (G._forgeAcc||0) + dt;
    if (G._forgeAcc > 180 / qf){
      G._forgeAcc = 0;
      var oks = Object.keys(G.bag.ore).filter(function(k){ return G.bag.ore[k] > 0; });
      if (oks.length >= 3){
        oks.sort(function(a,b){ return D.OK[b].t - D.OK[a].t; });
        var k1 = oks[0], k2 = oks[1], k3 = oks[2];
        if (k1 === k2 && G.bag.ore[k1] < 2) k2 = oks[2] || k1;
        G.useItem('ore', k1, 1); G.useItem('ore', k2, 1); G.useItem('ore', k3, 1);
        var ft = G.makeTreasure({ el: D.OK[k1].el, lv: -1, sp: 0 });
        G.addTreasure(ft);
        G.log('器坊自动开炉，炼得 <b class="val">'+ft.name+'</b>（'+D.gradeName(ft.g,ft.s)+'）');
      }
    }
  }

  // 弟子自行修炼，缓慢变强
  G._disTimer = (G._disTimer||0) + dt;
  if (G._disTimer > 20){
    G._disTimer = 0;
    G.sect.disciples.forEach(function(d){
      if (!d.assign && d.node < G.node + 3 && U.chance(0.3)) d.node++;
    });
  }
};

/* =====================  探索  ===================== */
G.exploreCost = function(region){
  return Math.floor(50 * Math.pow(1.9, region.t-1) * (1 + G.node*0.12));
};
G.unlockedRegion = function(r){ return G.node >= r.req || G.rebirth.count > 0; };
G.regionById = function(id){
  for (var i=0;i<D.REGIONS.length;i++) if (D.REGIONS[i].id === id) return D.REGIONS[i];
  return D.REGIONS[0];
};

/* 游历：触发奇遇事件 */
G.doExplore = function(regionId){
  var r = G.regionById(regionId);
  var c = G.exploreCost(r);
  if (G.spirit < c){ XX.UI.toast('灵石不足（需 '+U.fmt(c)+'）'); return; }
  G.addSpirit(-c);
  G.stats.explores++;
  if (U.chance(0.16)){ G.startSecretRealm(regionId); return; }
  var pool = D.EVENTS.filter(function(e){ return !e.req || e.req(G); });
  var ev = U.weighted(pool, 'w');
  G.seen.event[ev.n] = 1;
  XX.UI.openEventModal(ev, r);
};

/* 讨伐：与妖兽战斗 */
G.doTrial = function(regionId){
  var r = G.regionById(regionId);
  var c = G.exploreCost(r);
  if (G.spirit < c){ XX.UI.toast('灵石不足（需 '+U.fmt(c)+'）'); return; }
  G.addSpirit(-c);
  var el = r.el;
  var name = (U.chance(0.12) ? U.pick(D.BOSS_N) : U.pick(D.BEAST_P) + U.pick(D.BEAST_N[el]));
  G.startBattle({
    kind:'explore', name: name, el: el, mult: 0.9 + r.t*0.06,
    boss: name.indexOf('·') >= 0,
    region: r
  });
};

/* 采集：稳定资源 */
G.doGather = function(regionId){
  var r = G.regionById(regionId);
  var c = Math.floor(G.exploreCost(r) * 0.5);
  if (G.spirit < c){ XX.UI.toast('灵石不足（需 '+U.fmt(c)+'）'); return; }
  G.addSpirit(-c);
  var tier = U.clamp(Math.round(r.t/3), 1, 3);
  var n = G.ri(1, 3);
  var got = [];
  for (var i=0;i<n;i++){ var k = G.randHerbKey(tier); G.addItem('herb', k, 1); got.push(D.HK[k].n); }
  for (var j=0;j<n;j++){ var k2 = G.randOreKey(tier); G.addItem('ore', k2, 1); got.push(D.OK[k2].n); }
  var sp = Math.floor(60 * Math.pow(1.8, r.t-1));
  G.addSpirit(sp);
  G.log('于 '+r.n+' 采集：'+got.join('、')+'，并得灵石 '+U.fmt(sp));
  XX.UI.toast('采集收获 ' + got.length + ' 份灵材');
};

/* =====================  秘境  ===================== */
G.secretActive = false;
G.secretStage = 0;
G.secretRegion = 'r0';
G.startSecretRealm = function(regionId){
  if (G.secretActive) return;
  G.secretActive = true;
  G.secretStage = 0;
  G.secretRegion = regionId || (XX.UI && XX.UI.st ? XX.UI.st.region : null) || 'r0';
  G.log('<span class="tag gold">秘境</span> 你踏入了一处秘境……', 'sys');
  G.secretStep();
};
G.secretStep = function(){
  if (!G.secretActive) return;
  G.secretStage++;
  if (G.secretStage > 4){ G.endSecretRealm(); return; }
  var pool = D.SECRET_EVENTS.filter(function(e){
    if (e.n === '秘境之主') return G.secretStage >= 4;
    return true;
  });
  var ev = U.pick(pool);
  G.seen.event[ev.n] = 1;
  XX.UI.openEventModal(ev, null, true);
};
G.endSecretRealm = function(early){
  if (!G.secretActive) return;
  var s = G.secretStage;
  G.secretActive = false;
  var q = G.qiRate() * 60 * (1 + s*0.8);
  var sp = 200 * Math.pow(1.9, s-1) * (1 + G.node*0.3);
  G.addQi(q);
  G.addSpirit(Math.floor(sp));
  // 秘境专属法宝：层数越深越好（区域风土 + 层数驱动的机缘签名）
  if (s >= 2){
    var reg = G.regionById(G.secretRegion || 'r0');
    G.addTreasure(G.genTreasure(G.sigFromRegion(reg, s)));
  }
  G.log('秘境探索告一段落：深入 '+s+' 层。修为 +'+U.fmt(q)+'，灵石 +'+U.fmt(Math.floor(sp)));
  XX.UI.toast('秘境结束：深入 ' + s + ' 层');
  XX.UI.renderView && XX.UI.renderView();
};

/* 探索奖励结算钩子（战斗胜利后调用） */
G.onBattleReward = function(cfg){
  var r = cfg.region || D.REGIONS[0];
  var sp = Math.floor(120 * Math.pow(1.85, r.t-1) * (1 + G.node*0.35));
  G.addSpirit(sp);
  var tier = U.clamp(Math.round(r.t/3), 1, 3);
  G.addItem('ore', G.randOreKey(tier), G.ri(1,2));
  // 掉落走「妖兽驱动 + 区域风土」的机缘签名
  if (U.chance(cfg.boss ? 1.0 : 0.24)){
    G.addTreasure(G.genTreasure(G.sigFromEnemy(cfg, r)));
  }
  if (U.chance(0.10)){ G.addTechShard(1); }
  G.karma = U.clamp(G.karma + 2, -100, 100);
  G.log('斩杀 '+ (cfg.name||'妖兽') +'，得灵石 '+U.fmt(sp));
};
})();
