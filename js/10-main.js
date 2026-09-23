/* ===========================================================
   10-main.js  —  启动 / 主循环 / 离线结算 / 新手引导
   =========================================================== */
(function(){
var U = XX.U, D = XX.D, G = XX.G, UI = XX.UI;

/* =====================  错误兜底  ===================== */
/* window.onerror 的真正捕获写在 index.html 头部的内联脚本里
   （早于所有脚本，连 10-main.js 自身的语法错误都能接住）。
   这里只补一个 Promise 异常的兜底。 */
window.addEventListener('unhandledrejection', function(e){
  try{
    var bar = document.getElementById('errbar');
    if (!bar) return;
    bar.classList.remove('hidden');
    bar.innerHTML += '<div>⚠ Promise: ' + ((e.reason && e.reason.message) ? e.reason.message : e.reason) + '</div>';
  }catch(_){}
});

/* =====================  主循环  ===================== */
var last = 0, saveAcc = 0, hudAcc = 0, liveAcc = 0, running = false;

function step(dt){
  G.tickCultivate(dt);
  if (G.battle && !G.battle.over) G.battleTick(dt);
  if (G.tickBuffs()) { /* buff 过期 */ }

  hudAcc += dt;
  if (hudAcc >= 0.25){
    hudAcc = 0;
    UI.renderHUD();
    UI.renderLeft();
    if (UI.dirtyLog) UI.renderRight();
  }
  if (G.battle && UI.battleLogDirty) UI.renderBattle();

  liveAcc += dt;
  if (liveAcc >= 0.5){
    liveAcc = 0;
    UI.liveTick();
  }

  saveAcc += dt;
  if (saveAcc >= 10){ saveAcc = 0; G.save(); }
}

function frame(ts){
  if (!last) last = ts;
  var dt = (ts - last) / 1000;
  last = ts;
  if (dt < 0) dt = 0;
  if (dt > 1.2) dt = 1.2;         // 防止切后台回来一次性暴冲
  if (running){
    step(dt);
  }
  requestAnimationFrame(frame);
}

/* 视图内动态字段的局部刷新（避免整页重绘） */
UI._emptySince = 0;
UI.liveTick = function(){
  var el = U.$('#cbar');
  var pend = (G.pendingBranch !== null) ? 'branch' : (G.pendingTrib !== null ? 'trib' : null);
  if (el){
    var need = G.stepCost();
    var p = U.clamp(G.qi/need, 0, 1);
    el.style.width = (p*100).toFixed(2) + '%';
    var t = U.$('#ctxt'); if (t) t.textContent = U.fmt(G.qi) + ' / ' + U.fmt(need);
    var r = U.$('#crate'); if (r) r.textContent = '+' + U.fmt(G.qiRate()) + ' / 秒';
    var e2 = U.$('#ceta');
    if (e2){
      var msg = pend === 'branch' ? '<b class="val">道途未择——点下方「择路」</b>'
              : pend === 'trib'   ? '<b class="neg">天劫将至——点下方「渡劫」</b>'
              : (p >= 1 ? '<b class="val">修为已足，可以突破。</b>'
                        : '约需 ' + U.fmtTimeShort((need-G.qi)/Math.max(0.001,G.qiRate())) + ' 可满。');
      if (e2.innerHTML !== msg) e2.innerHTML = msg;
    }
  }
  var bb = U.$('#btnBreak');
  if (bb){
    var ok = pend ? true : (G.qi >= G.stepCost());
    if (bb.disabled !== !ok) bb.disabled = !ok;
    var want = pend === 'branch' ? '择 路' : pend === 'trib' ? '渡 劫' : '突 破';
    if (bb.textContent !== want) bb.textContent = want;
  }

  // 未决的抉择若没有弹窗在显示（被别的弹窗顶掉了），自动补开一次，避免卡死突破
  if (!pend){ UI._emptySince = 0; }
  else if (UI.$modal.classList.contains('on')){ UI._emptySince = 0; }
  else {
    if (!UI._emptySince) UI._emptySince = Date.now();
    else if (Date.now() - UI._emptySince > 900 && !G.secretActive){
      UI._emptySince = 0;
      if (G.pendingBranch !== null) UI.openBranchModal(G.pendingBranch);
      else UI.openTribModal(G.pendingTrib);
    }
  }

  var spn = U.$('#spiritHud');
  if (spn) spn.textContent = U.fmt(G.spirit);

  // 标签栏红点每 2 秒刷新一次
  UI._tabTick = (UI._tabTick || 0) + 1;
  if (UI._tabTick % 4 === 0) UI.renderTabs();
};

/* =====================  离线结算弹窗  ===================== */
function showOffline(rep){
  var lines = '';
  lines += '<div class="kv"><span>离线时长</span><b>' + U.fmtTime(rep.dt) + '</b></div>';
  if (rep.eff < rep.dt) lines += '<div class="sub">（超出 12 小时的部分不予结算）</div>';
  lines += '<div class="kv"><span>修为</span><b class="val">+' + U.fmt(rep.qi) + '</b></div>';
  lines += '<div class="kv"><span>灵石</span><b class="val">+' + U.fmt(rep.sp) + '</b></div>';
  var hb = [], ob = [], hn = 0, on = 0;
  for (var k in rep.herb){ hn += rep.herb[k]; if (hb.length < 5) hb.push(D.HK[k].n + '×' + rep.herb[k]); }
  for (var k2 in rep.ore){ on += rep.ore[k2]; if (ob.length < 5) ob.push(D.OK[k2].n + '×' + rep.ore[k2]); }
  if (hn) lines += '<div class="kv"><span>灵草</span><b>共 ' + hn + ' 株</b></div><div class="sub" style="margin-bottom:4px">' + hb.join('、') + (hn > 5 ? ' 等' : '') + '</div>';
  if (on) lines += '<div class="kv"><span>矿石</span><b>共 ' + on + ' 块</b></div><div class="sub" style="margin-bottom:4px">' + ob.join('、') + (on > 5 ? ' 等' : '') + '</div>';
  if (rep.ups) lines += '<div class="kv"><span>境界</span><b class="val">自行突破 ' + rep.ups + ' 次 → ' + D.nodeName(G.node) + '</b></div>';
  lines += '<div class="hr"></div><div class="sub">离线期间修为积累为在线的 <b>50%</b>，宗门产出 60%。</div>';
  UI.modal({
    title: '归来',
    sub: '你自入定中醒来',
    body: lines,
    ok: '收下'
  });
}

/* =====================  新手引导  ===================== */
function firstTime(){
  UI.modal({
    title: '灵根演化 · 问道长生',
    sub: '你不是在选一个天赋，你是在养一株活物',
    body:
      '<p>你自凡人起步，体内九道灵根沉睡着。</p>' +
      '<p>与世上诸法不同——你的灵根<b class="val">不会固定</b>。你修的火系功法、服下的丹药、嵌进阵眼的法宝、在奇遇里做的每一个选择，都会悄悄改写它们。</p>' +
      '<p>相生双灵根齐齐过 80%，会<b class="val">共鸣</b>；相克双灵根齐齐过高，会<b class="neg">冲突</b>，削你修炼速度，直到你寻到调和之法。</p>' +
      '<p>五条以上灵根纯度俱达 85%，你会觉醒<b class="val">混沌灵根</b>。</p>' +
      '<div class="hr"></div>' +
      '<p class="sub">修为会自动增长。每踏入一个大境界，你要择一条道途分支。<br>修至瓶颈便可轮回转世，点亮星盘获得永久加成。</p>',
    ok: '入道',
    onOk: function(){
      G.seen.intro = 1;
      setTimeout(function(){
        if (!G.branch[0]) UI.openBranchModal(0);
      }, 320);
    }
  });
}

/* =====================  布局兜底  ===================== */
/* 有些 WebView 会把视口单位（vh/dvh）算成 0，导致整个 flex 高度链塌陷。
   这里在启动 / 尺寸变化时测一次，发现异常就直接给 #app 定死像素高度。 */
function layoutFix(){
  var app = U.$('#app');
  if (!app) return;
  var h = window.innerHeight || document.documentElement.clientHeight || 0;
  if (!h || h < 200) return;
  var cur = app.getBoundingClientRect().height;
  if (cur < h * 0.7){
    app.style.position = 'fixed';
    app.style.top = '0';
    app.style.left = '0';
    app.style.right = '0';
    app.style.bottom = 'auto';
    app.style.height = h + 'px';
  }
}

/* =====================  启动  ===================== */
function boot(){
  // 1) 载入 / 新建
  var isNew = false, hadSave = false;
  try{
    hadSave = !!localStorage.getItem('xx_linggen_save_v1');
    if (!localStorage.getItem('xx_linggen_seen_v2')){ isNew = true; localStorage.setItem('xx_linggen_seen_v2', '1'); }
  }catch(e){}
  G.init();

  // 2) 首次进入：立道之名
  UI.init();

  // 3) 离线结算
  G.settleOffline();
  var rep = G.offlineReport;
  G.offlineReport = null;

  // 3.5) 布局兜底（防止视口单位失效导致整体塌陷）
  layoutFix();
  setTimeout(layoutFix, 60);
  setTimeout(layoutFix, 400);

  // 4) 起循环
  running = true;
  requestAnimationFrame(frame);

  // 5) 收尾
  var bootEl = U.$('#boot');
  setTimeout(function(){
    if (bootEl) bootEl.classList.add('off');
    setTimeout(function(){ if (bootEl) bootEl.remove(); }, 700);
  }, 260);

  setTimeout(function(){
    if (isNew) firstTime();
    else {
      G.seen.intro = 1;
      if (hadSave && G.balance !== 2){ rebalanceNotice(); return; }
      if (rep && rep.dt > 60) showOffline(rep);
    }
  }, 700);
}

/* 数值重调提示：旧档按新曲线会显得「卡住」，让玩家自己决定 */
function rebalanceNotice(){
  G.balance = 2;
  UI.modal({
    title: '数值已重调',
    sub: '境界推进节奏大幅放缓',
    body:
      '<p>你反馈的「升级太快」已处理 —— 难度曲线重做：</p>' +
      '<div class="kv"><span>首周目（纯挂机）</span><b class="val">约 10 小时</b></div>' +
      '<div class="kv"><span>首周目（主动经营）</span><b class="val">约 4 ~ 6 小时</b></div>' +
      '<div class="kv"><span>轮回加速</span><b class="val">每世 +30%，第 2 世约快一倍</b></div>' +
      '<div class="hr"></div>' +
      '<p class="sub">旧存档的境界进度仍可继续，但按新公式所需修为更高，短时间内会显得「卡住」。<br>' +
      '推荐重新开始以完整感受新曲线（会一并清空轮回星盘与图鉴）。</p>',
    cancel: '保留当前进度',
    ok: '重新开始',
    onOk: function(){
      G.hardReset();
      UI.renderAll();
      U.toast('已按新曲线重新开始');
      setTimeout(function(){ if (!G.branch[0]) UI.openBranchModal(0); }, 420);
    }
  });
}

/* =====================  事件绑定  ===================== */
window.addEventListener('beforeunload', function(){ G.save(); });
document.addEventListener('visibilitychange', function(){
  if (document.hidden){ G.save(); running = false; }
  else { last = 0; running = true; G.recalc(); }
});
window.addEventListener('resize', function(){
  layoutFix();
  if (UI.tab === 'roots') UI.renderView();
});
window.addEventListener('orientationchange', function(){ setTimeout(layoutFix, 200); });

/* =====================  开发者面板（?dev=1） ===================== */
if (location.search.indexOf('dev=1') >= 0){
  window.__dev = {
    G: XX.G, D: XX.D, UI: XX.UI,
    speed: function(x){ window.__devMult = x; },
    qi: function(n){ G.addQi(n||G.stepCost()*10); },
    spirit: function(n){ G.addSpirit(n||100000); },
    node: function(n){ G.node = U.clamp(n,0,29); G.recalc(); UI.renderAll(); },
    items: function(n){ n=n||20; for(var i=0;i<n;i++){ G.addItem('herb',G.randHerbKey(),1); G.addItem('ore',G.randOreKey(),1);} },
    treasure: function(n){ n=n||5; for(var i=0;i<n;i++) G.addTreasure(G.makeTreasure({lv:i%3})); UI.renderAll(); },
    battle: function(mult){ G.startBattle({kind:'explore', name:'测试妖王', el:'huo', mult:mult||1, boss:true, region:D.REGIONS[4]}); },
    secret: function(){ G.startSecretRealm(); },
    rebirth: function(){ G.doRebirth(true); },
    points: function(n){ G.rebirth.points += (n||50); UI.renderView(); },
    all: function(){
      G.addSpirit(1e6); for (var i=0;i<30;i++){ G.addItem('herb',G.randHerbKey(),3); G.addItem('ore',G.randOreKey(),3); }
      for (var j=0;j<8;j++) G.addTreasure(G.makeTreasure({lv:2}));
      G.shards += 20; G.recalc(); UI.renderAll();
    },
    fast: function(sec){
      // 快进模拟 sec 秒的修炼
      var chunk = 0.5, t = 0;
      while (t < sec){ G.tickCultivate(chunk); t += chunk; }
      UI.renderAll();
    }
  };
  console.log('[dev] __dev 可用：speed/qi/spirit/node/items/treasure/battle/fast/all');
}

/* =====================  GO  ===================== */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
