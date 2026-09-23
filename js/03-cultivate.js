/* ===========================================================
   03-cultivate.js  —  修炼 / 突破 / 天劫 / 金丹品级 / 飞升
   =========================================================== */
(function(){
var U = XX.U, D = XX.D, G = XX.G;

/* 突破到下一节点的消耗（node 29 为飞升所需） */
G.stepCost = function(){
  var c = G.qiNeed(G.node);
  if (G.node >= D.MAXNODE) return c * 2;      // 飞升
  return c;
};

/* 分支选择 / 天劫是否待处理 */
G.pendingBranch = null;
G.pendingTrib = null;

/* 该 realm 序号是否需要天劫（金丹及以后） */
G.needTrib = function(ri){ return ri >= 3; };

/* 自动/手动突破检查（自动模式） */
G.checkBreak = function(){
  if (!G.seen.intro) return false;              // 新手引导未完成前不自动推进
  if (G.pendingBranch !== null || G.pendingTrib !== null) return false;
  if (!G.auto.break) return false;              // 关闭自动突破时完全交由玩家
  return G._advance(true);
};

/* 推进突破流程：分支/天劫会被拦下，其余直接突破 */
G._advance = function(showModal){
  // 当前所在的大境界若尚未择路，先行择路（含开局）
  var curRi = Math.floor(G.node / 3);
  if (D.REALMS[curRi] && D.REALMS[curRi].br && !G.branch[curRi]){
    G.pendingBranch = curRi;
    if (showModal && XX.UI.openBranchModal) XX.UI.openBranchModal(curRi);
    return true;
  }
  var guard = 0;
  while (G.qi >= G.stepCost() && G.node < D.MAXNODE && guard++ < 60){
    var next = G.node + 1;
    if (next % 3 === 0){
      var ri = next / 3;
      if (D.REALMS[ri].br && !G.branch[ri]){
        G.pendingBranch = ri;
        if (showModal && XX.UI.openBranchModal) XX.UI.openBranchModal(ri);
        return true;
      }
      if (G.needTrib(ri) && !G.flags['trib_'+ri]){
        G.pendingTrib = ri;
        if (showModal && XX.UI.openTribModal) XX.UI.openTribModal(ri);
        return true;
      }
    }
    G.doBreak();
  }
  // 飞升判定
  if (G.node >= D.MAXNODE && G.qi >= G.stepCost() && !G.flags.ascending && !G.flags.ascended){
    G.startAscend();
  }
  return false;
};

G.doBreak = function(){
  var cost = G.stepCost();
  if (G.qi < cost) return false;
  G.qi -= cost;
  G.node += 1;
  G.heart = Math.min(G.maxHeart(), G.heart + 2);
  if (G.node > (G.rebirth.bestNode||0)) G.rebirth.bestNode = G.node;

  var nm = D.nodeName(G.node);
  var txt = U.pick(D.BREAK_TEXT);
  G.log('<b class="val">突破！</b> 你已臻至 <b class="val">'+nm+'</b>。'+txt, 'brk');
  XX.UI && XX.UI.toast && XX.UI.toast('突破 → ' + nm);
  XX.UI && XX.UI.fxBreak && XX.UI.fxBreak();

  // 进入新大境界
  if (G.node % 3 === 0){
    var ri = G.node / 3;
    var r = D.REALMS[ri];
    G.log('—— 你踏入了 <b class="val">'+r.n+'</b> 之境：'+r.d+' ——');
    // 金丹品级
    if (r.n === '金丹') G.rollJindan();
    // 灵根自然演化：境界越高，主灵根越纯
    var main = G.mainRoot();
    G.addPurity(main, 2 + ri);
    if (ri >= 4 && U.chance(0.25)) { var ks=['feng','lei','guang','an']; var k=U.pick(ks); if(!G.roots[k]) G.addPurity(k, 5); }
  }
  G.syncUnlock();
  G.recalc();
  return true;
};

/* 手动突破按钮 */
G.tryBreak = function(){
  // 有未决的择路 / 天劫：点它就是重新打开那个选择面板（不再死路）
  if (G.pendingBranch !== null){ XX.UI.openBranchModal(G.pendingBranch); return false; }
  if (G.pendingTrib !== null){ XX.UI.openTribModal(G.pendingTrib); return false; }
  if (G.qi < G.stepCost()){
    XX.UI.toast('修为不足，尚需 ' + U.fmt(G.stepCost() - G.qi) + ' 修为');
    return false;
  }
  G.auto.break = true;                       // 手动突破视为重新开启自动
  return G._advance(true);
};

/* ============ 金丹品级 ============ */
G.rollJindan = function(){
  G.jindan = U.clamp(G.jindan, 0, 9);
  if (G.jindan > 0) return;
  var ks = G.rootKeys();
  var avg = 0;
  ks.forEach(function(k){ avg += G.roots[k]; });
  avg = ks.length ? avg/ks.length : 30;
  var score = 0
    + U.clamp(avg/100, 0, 1) * 0.32
    + U.clamp(G.heart / G.maxHeart(), 0, 1) * 0.22
    + (1 - Math.abs(G.karma)/100) * 0.16
    + U.clamp(G.resonances().length * 0.35, 0, 0.14)
    + U.clamp(Object.keys(G.techs).length / 10, 0, 0.10)
    + U.clamp(G.arrayPower()/60, 0, 0.06);
  var g = D.jindanGrade(score);
  G.jindan = g;
  var nm = D.jindanName(g);
  G.log('金丹凝成——<b class="val">'+nm+'金丹</b>！品级越高，日后潜力越广。', 'brk');
  XX.UI && XX.UI.modal({
    title:'金丹凝成',
    sub:'一炉丹成，道途自此分明',
    body:'<p style="text-align:center;font-size:26px;color:#e7d3a2;letter-spacing:6px;margin:10px 0">' + nm + '金丹</p>' +
      '<p class="sub" style="text-align:center">综合灵根纯度、道心、因果、共鸣与功法定品。<br>一品为极，九品为末。品级影响此后所有属性（每品约 3.5%）。</p>',
    ok:'承接天命'
  });
  G.flags['jindan_' + ('i'+g)] = 1;
};

/* ============ 天劫 ============ */
G.tribTypes = function(ri){
  var base = [];
  D.TRIBULATIONS.forEach(function(t){
    var w = t.w;
    if (t.n === '心魔劫') w *= (G.karma < -20 ? 3 : (G.karma > 20 ? 0.4 : 1));
    if (t.n === '九天玄劫') w *= (ri >= 8 ? 2 : 0.3);
    base.push({ k:t.n, w:w });
  });
  return base;
};
G.tribName = function(ri){ return U.weighted(G.tribTypes(ri), 'w').k; };
G.tribChance = function(ri){
  // 预估成功率（用于展示）
  var b = G.gatherBonuses();
  var base = 0.86 - ri * 0.055;
  base += G.heart / 400;
  base -= Math.abs(G.karma) / 500;
  base += b.tribulation;
  base += (G.dao === 'wu' ? 0.06 : 0);
  return U.clamp(base, 0.15, 0.97);
};
G.startTribulation = function(ri){
  var nm = G.tribName(ri);
  var el = (nm.indexOf('雷')>=0 ? 'lei' : nm.indexOf('火')>=0 ? 'huo' : nm.indexOf('风')>=0 ? 'feng' : 'an');
  G.flags['trib_'+ri] = 1;
  G.stats.tribulations++;
  G.pendingTrib = null;
  G.log('天劫将至——<b class="val">'+nm+'</b>！', 'sys');
  G.startBattle({
    kind:'tribulation',
    name: nm,
    el: el,
    mult: 0.95 + ri * 0.16 - G.gatherBonuses().tribulation * 0.9,
    boss: true,
    onWin: function(){
      G.stats.tribSuccess++;
      G.heart = Math.min(G.maxHeart(), G.heart + 10);
      G.log('你硬撼天劫而不倒，道心愈坚！<span class="tag jade">道心 +10</span>', 'sys');
      G.doBreak();
    },
    onLose: function(){
      G.node = Math.max(0, G.node - 1);
      G.qi = 0;
      G.heart = Math.max(0, G.heart - 15);
      G.log('天劫加身，你自云端跌落——境界跌落至 <b class="val">'+D.nodeName(G.node)+'</b>，道心受损。', 'bad');
      G.recalc();
    }
  });
};

/* ============ 飞升 ============ */
G.startAscend = function(){
  if (G.flags.ascending || G.flags.ascended) return;
  G.flags.ascending = 1;
  var ri = 9;
  G.log('九天之上雷云汇聚——<b class="val">九天玄劫</b> 降下！渡过此劫，便可飞升。', 'sys');
  G.startBattle({
    kind:'ascend', name:'九天玄劫 · 天罚', el:'lei',
    mult: 1.25 + (G.rebirth.count||0)*0.10, boss:true,
    onWin: function(){
      G.flags.ascending = 0;
      G.flags.ascended = 1;
      G.rebirth.ascends = (G.rebirth.ascends||0) + 1;
      var pts = G.calcRebirthPoints() + 25;
      G.log('雷云散尽，天门洞开——<b class="val">你飞升了！</b>', 'sys');
      XX.UI.modal({
        title:'飞升',
        sub:'一朝脱去凡俗骨，从此人间无故人',
        body:'<p>你在天光中回头看了一眼这片山河。<br>此世修为已至极处，唯余轮回可续。</p>' +
             '<p class="sub">本次飞升额外获得 <b class="val">轮回点 +25</b>。<br>系统将引导你进入轮回。</p>',
        ok:'踏入轮回',
        onOk:function(){ G.rebirth.ascends = (G.rebirth.ascends||0); G.doRebirth(true); }
      });
    },
    onLose: function(){
      G.flags.ascending = 0;
      G.node = Math.max(0, G.node - 1);
      G.qi = 0;
      G.heart = Math.max(0, G.heart - 20);
      G.log('飞升失败！你自九霄坠落，浑身骨骼欲裂。', 'bad');
      G.recalc();
    }
  });
};

/* ============ 加速修炼 ============ */
/* 倍率随境界提升，让后期卡关时仍有主动操作空间 */
G.speedUpMult = function(){ return 3 + Math.floor(G.node / 5); };       // ×3 ~ ×8
G.speedUpDur  = function(){ return 300; };                              // 秒
G.speedUpCost = function(){
  return Math.floor(120 * Math.pow(1.5, G.node/3) * (1 + (G.rebirth.count||0)*0.8));
};
G.speedUp = function(){
  var c = G.speedUpCost(), m = G.speedUpMult();
  if (G.spirit < c){ XX.UI.toast('灵石不足（需 '+U.fmt(c)+'）'); return; }
  G.addSpirit(-c);
  G.addBuff('cult', m - 1, G.speedUpDur(), '丹药催功');
  G.log('你以灵石催动灵力，修炼速度 ×'+m+'。<span class="tag purple">持续 '+Math.round(G.speedUpDur()/60)+' 分钟</span>');
};

/* ============ 道 ============ */
G.chooseDao = function(d){
  G.dao = d;
  G.heart = U.clamp(G.heart + (d==='wu' ? -10 : 5), 0, G.maxHeart());
  G.log('你立下道誓——<b class="val">'+D.DAOS[d].n+'</b>。'+D.DAOS[d].desc);
  G.recalc();
};

/* ============ 当前指引：扫描状态，给出「现在最该做的事」 ============ */
G.goals = function(){
  var out = [];
  function push(p, t, d, tab, act, arg){ out.push({ p:p, t:t, d:d, tab:tab, act:act, arg:arg }); }

  /* —— 阻塞进度的事，优先级最高 —— */
  if (G.pendingBranch !== null)
    push(100, '择定道途分支', '修为已足，需先选择「' + D.REALMS[G.pendingBranch].n + '」的修行方向', 'cultivate', 'break');
  if (G.pendingTrib !== null)
    push(99, '迎接天劫', G.tribName(G.pendingTrib) + ' 将至，渡劫成功方可继续', 'cultivate', 'break');
  if (!G.dao)
    push(90, '立下道誓', '选择有情道或无情道——此择影响一生', 'cultivate');
  if (G.qi >= G.stepCost())
    push(85, '突破境界', '修为已满，可突破至「' + D.nodeName(Math.min(G.node + 1, D.MAXNODE)) + '」', 'cultivate', 'break');

  /* —— 提升实力的机会 —— */
  if (G.secretActive)
    push(76, '继续探索秘境', '已深入 ' + G.secretStage + ' 层，越深越好', 'explore', 'secret');

  var freeSlots = 0; G.slots.forEach(function(x){ if (!x) freeSlots++; });
  var idle = 0; G.treasures.forEach(function(t){ if (!G.treasureUse(t.id)) idle++; });
  if (freeSlots && idle)
    push(72, '镶嵌法宝', '有 ' + freeSlots + ' 个空阵眼、' + idle + ' 件闲置法宝', 'array', 'autoArr');

  var sl = G.skillSlots();
  var freeSkill = (sl.active - G.skills.active.length) + (sl.passive - G.skills.passive.length);
  var unEq = 0; for (var id in G.techs){ if (!G.isTechEquipped(id)) unEq++; }
  if (freeSkill > 0 && unEq > 0)
    push(70, '装备功法', '功法栏还有 ' + freeSkill + ' 个空位，' + unEq + ' 门已参悟的功法待装入', 'character', 'autoEquipTech');

  if (G.shards >= 1)
    push(66, '参悟功法', '有 ' + G.shards + ' 枚功法碎片可用', 'cultivate', 'techAuto');

  var cheap = 99999;
  D.STARS.forEach(function(s){ if (G.starLv(s.k) < s.max){ var c = G.starCost(s.k); if (c < cheap) cheap = c; } });
  if (G.rebirth.points >= cheap)
    push(62, '点亮轮回星盘', '轮回点充足，可换取永久加成', 'rebirth');

  /* —— 建设与生产 —— */
  for (var bk in D.BK){
    if (G.canBuild(bk) && G.buildingLv(bk) < G.buildingMax() && G.spirit >= G.buildingCost(bk)){
      push(56, '扩建宗门', '灵石充足，可升级「' + D.BK[bk].n + '」', 'sect'); break;
    }
  }
  var herbN = 0; for (var hk in G.bag.herb) herbN += G.bag.herb[hk];
  if (herbN >= 6) push(50, '开炉炼丹', '药圃已有 ' + herbN + ' 株灵草', 'alchemy');
  var oreN = 0; for (var ok in G.bag.ore) oreN += G.bag.ore[ok];
  if (oreN >= 3) push(48, '开炉炼器', '矿藏已有 ' + oreN + ' 块矿石', 'forge');

  /* —— 长线方向 —— */
  if (!G.secretActive) push(38, '出门游历', '探索可得灵材、法宝与奇遇', 'explore');
  if (G.node >= 15) push(34, '考虑轮回', '修至瓶颈便可转世，换永久加成、下世更快', 'rebirth');
  if (Object.keys(G.techs).length === 0) push(30, '参悟第一门功法', '功法能显著提升战力与修炼', 'cultivate');

  /* —— 兜底 —— */
  if (!out.length) push(10, '打坐修炼', '修为自动增长，静待突破即可', 'cultivate');

  out.sort(function(a, b){ return b.p - a.p; });
  return out;
};

/* ============ 功能解锁 ============ */
G.syncUnlock = function(){
  var n = G.node, t = G.stats.playTime || 0;
  G.unlock = {
    roots:  n >= 1 || t > 60,
    array:  n >= 1 || t > 100,
    explore:n >= 2 || t > 150,
    alch:   n >= 2 || t > 200,
    forge:  n >= 3 || t > 260,
    form:   n >= 4 || t > 320,
    sect:   n >= 4 || t > 360,
    rebirth:n >= 6 || t > 600
  };
};

/* ============ 每帧修炼 ============ */
G._idleTimer = 0;
G.tickCultivate = function(dt){
  G.stats.playTime = (G.stats.playTime||0) + dt;
  var rate = G.qiRate();
  G.qi += rate * dt;
  if (G.qi > G.stats.maxQi) G.stats.maxQi = G.qi;

  // 灵石自然增长（藏经阁/山门）
  var sp = G.sectSpiritRate();
  if (sp > 0) G.spirit += sp * dt;

  // 灵根随修炼缓慢演化
  G._rootTimer = (G._rootTimer||0) + dt;
  if (G._rootTimer > 12){
    G._rootTimer = 0;
    var main = G.mainRoot();
    var gain = 0.25 + G.node*0.02;
    G.addPurity(main, gain);
    // 冲突时相克双灵根互相消耗
    G.conflicts().forEach(function(c){
      G.roots[c.a] = Math.max(0, G.roots[c.a] - 0.35);
      G.roots[c.b] = Math.max(0, G.roots[c.b] - 0.35);
    });
    // 灵阵中的法宝属性会缓慢同化灵根
    var elSet = {};
    G.slots.forEach(function(id){ if (id){ var t=G.treasureById(id); if(t) elSet[t.el]=(elSet[t.el]||0)+1; } });
    for (var e in elSet){ G.addPurity(e, 0.12*elSet[e]); }
  }

  // 宗门生产
  G.sectTick(dt);

  // 随机机缘
  G._idleTimer += dt;
  if (G._idleTimer > 25){
    G._idleTimer = 0;
    var p = 0.06 * (1 + G.gatherBonuses().luck) * (1 + (G.rebirth.stars.fortune||0)*0.08);
    if (U.chance(p)) G.triggerIdleEvent();
  }

  // 成就 / 宗门派遣（每 3 秒检一次）
  G._achvTimer = (G._achvTimer || 0) + dt;
  if (G._achvTimer > 3){
    G._achvTimer = 0;
    if (G.checkAchv) G.checkAchv();
    if (G.missionTick) G.missionTick();
  }

  G.checkBreak();
};

G.triggerIdleEvent = function(){
  var pool = D.IDLE_EVENTS.filter(function(e){ return !e.cond || e.cond(G); });
  var ev = U.weighted(pool, 'w');
  G.triggeredIdle = ev.n;
  var msg = ev.do(G);
  if (msg) G.log('<span class="tag gold">机缘</span> ' + msg);
};
})();
