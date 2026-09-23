/* ===========================================================
   08-rebirth.js  —  轮回 / 星盘 / 多周目
   =========================================================== */
(function(){
var U = XX.U, D = XX.D, G = XX.G;

/* 结算轮回点 */
G.calcRebirthPoints = function(){
  var sum = 0;
  D.RK.forEach(function(k){ sum += (G.roots[k]||0); });
  var maxG = 0;
  G.treasures.forEach(function(t){ if (t.g > maxG) maxG = t.g; });
  G.slots.forEach(function(id){ if (id){ var t = G.treasureById(id); if (t && t.g > maxG) maxG = t.g; } });
  var res = G.resonances().length;
  var pts = 0;
  pts += (G.rebirth.bestNode || G.node) * 0.55;
  pts += sum / 45;
  pts += G.sectLevel() * 1.2;
  pts += maxG * 1.5;
  pts += res * 2.0;
  pts += G.isChaos() ? 8 : 0;
  pts += Object.keys(G.techs).length * 0.8;
  pts += (G.stats.wins||0) * 0.05;
  pts += (G.jindan ? (10 - G.jindan) * 1.2 : 0);
  pts += (G.rebirth.ascends||0) * 5;
  return Math.max(1, Math.floor(pts));
};

G.rebirthPreview = function(){
  var stars = G.rebirth.stars || {};
  var keepT = Math.min(stars.keep||0, G.treasures.length);
  var keepSp = Math.floor(G.spirit * (stars.spirit||0) * 0.20);
  var startNode = Math.min((stars.start||0)*2, 12);
  return {
    points: G.calcRebirthPoints(),
    total: G.rebirth.points,
    count: G.rebirth.count,
    keepTreasure: keepT,
    keepSpirit: keepSp,
    startNode: startNode,
    keepPurity: (stars.rootkeep||0) * 15
  };
};

/* 购买星位 */
G.starLv = function(k){ return (G.rebirth.stars[k]||0); };
G.starMaxLv = function(k){
  for (var i=0;i<D.STARS.length;i++) if (D.STARS[i].k === k) return D.STARS[i].max;
  return 1;
};
G.starCost = function(k){
  var st = null;
  for (var i=0;i<D.STARS.length;i++) if (D.STARS[i].k === k) st = D.STARS[i];
  if (!st) return 9999;
  return Math.ceil(st.cost * (1 + G.starLv(k) * 0.85));
};
G.buyStar = function(k){
  var lv = G.starLv(k), mx = G.starMaxLv(k);
  if (lv >= mx){ XX.UI.toast('此星已至圆满'); return; }
  var c = G.starCost(k);
  if (G.rebirth.points < c){ XX.UI.toast('轮回点不足（需 '+c+'）'); return; }
  G.rebirth.points -= c;
  G.rebirth.stars[k] = lv + 1;
  G.recalc();
  var nm = '';
  for (var i=0;i<D.STARS.length;i++) if (D.STARS[i].k === k) nm = D.STARS[i].n;
  G.log('点亮星位 <b class="val">'+nm+'</b>（'+G.rebirth.stars[k]+'/'+mx+'）');
  XX.UI.toast(nm + ' → ' + G.rebirth.stars[k] + ' 级');
};
G.refundStars = function(){
  var spent = 0;
  for (var k in G.rebirth.stars){
    var lv = G.rebirth.stars[k];
    for (var i=0;i<lv;i++) spent += Math.ceil((D.STARS.filter(function(s){return s.k===k;})[0]||{cost:3}).cost * (1 + i*0.85));
  }
  if (!spent) return;
  G.rebirth.points += spent;
  G.rebirth.stars = {};
  G.recalc();
  XX.UI.toast('已返还 ' + spent + ' 轮回点');
};

/* 轮回开局加成 */
G.applyRebirthStart = function(){
  var stars = G.rebirth.stars || {};
  var sn = Math.min((stars.start||0)*2, 12);
  if (sn > G.node) G.node = sn;
  // 已越过的境界不再重复触发天劫；略过的分支自动择定
  var ri = Math.floor(G.node/3);
  for (var i=0;i<=ri;i++) G.flags['trib_'+i] = 1;
  var passed = ri - (G.node % 3 === 0 ? 1 : 0);
  for (var j=0;j<=passed;j++){
    if (D.REALMS[j].br && !G.branch[j]) G.branch[j] = D.REALMS[j].br[0];
  }
  G.qi = 0;
};

/* 执行轮回 */
G.doRebirth = function(force){
  if (!force && G.node < 6){
    XX.UI.modal({
      title:'轮回未到时候',
      body:'<p>你的修为尚浅，此刻轮回所得甚微。</p><p class="sub">建议至少修至 <b class="val">筑基</b> 之后再启轮回。</p>',
      ok:'再想想'
    });
    return;
  }
  var pv = G.rebirthPreview();
  var stars = G.rebirth.stars || {};

  // 捕获要保留的东西
  var keepTechs = U.clone(G.techs);
  // 至少保留最强的 1 件本命法宝，星盘「传承之星」可叠加
  var keepTreasures = G.treasures.slice().sort(function(a,b){ return b.power - a.power; }).slice(0, Math.max(1, stars.keep||0));
  var keepSpirit = Math.max(120, Math.floor(G.spirit * (stars.spirit||0) * 0.20));
  var oldRoots = U.clone(G.roots);
  var oldName = G.name;
  var oldDao = G.dao;

  // 记录
  G.rebirth.points += pv.points;
  G.rebirth.total += pv.points;
  G.rebirth.count += 1;
  G.rebirth.records = G.rebirth.records || [];
  G.rebirth.records.push({
    n: G.rebirth.count, node: D.nodeName(G.node), pts: pv.points,
    time: Date.now(), roots: oldRoots, jindan: G.jindan
  });
  if (G.rebirth.records.length > 30) G.rebirth.records.shift();

  var pts = pv.points;
  var keepRB = U.clone(G.rebirth);

  G.newGame(true);
  G.rebirth = keepRB;
  G.name = oldName;
  G.techs = keepTechs;
  G.treasures = keepTreasures;
  G.spirit = keepSpirit;
  G.dao = oldDao;
  G.pendingBranch = null;
  G.pendingTrib = null;

  // 本命之星：保留部分灵根纯度
  var kp = (stars.rootkeep||0) * 0.15;
  if (kp > 0){
    D.RK.forEach(function(k){
      G.roots[k] = Math.max(G.roots[k]||0, (oldRoots[k]||0) * kp);
    });
  }
  G.applyRebirthStart();
  G.clampRoots();
  G.recalc();
  G.syncUnlock();
  G.seen.rebirths = (G.seen.rebirths||0) + 1;

  G.log('—— <b class="val">轮回第 '+G.rebirth.count+' 世</b> ——　结算得轮回点 '+pts, 'sys');
  XX.UI.modal({
    title:'轮回 · 第 ' + G.rebirth.count + ' 世',
    sub:'一世浮沉，皆为道粮',
    body:'<p>你于忘川之上回望前尘，一切修为化作点点星光。</p>' +
         '<p><b class="val">获得轮回点：'+pts+'</b>（共 '+G.rebirth.points+'）</p>' +
         (keepTreasures.length ? '<p class="sub">传承法宝 ×'+keepTreasures.length+' 随你入轮回。</p>' : '') +
         (keepSpirit ? '<p class="sub">继承灵石 '+U.fmt(keepSpirit)+'。</p>' : '') +
         (kp>0 ? '<p class="sub">灵根纯度保留 '+Math.round(kp*100)+'%。</p>' : '') +
         (pv.startNode ? '<p class="sub">先觉之力：开局即为 <b class="val">'+D.nodeName(pv.startNode)+'</b>。</p>' : ''),
    ok:'转世重修',
    onOk:function(){ XX.UI.renderAll(); }
  });
  XX.UI.renderAll();
};
})();
