/* ===========================================================
   09-ui.js  —  界面框架：HUD / 标签 / 弹窗 / 战斗界面 / 事件委托
   =========================================================== */
(function(){
var U = XX.U, D = XX.D, G = XX.G;
var UI = XX.UI = {};

UI.tab = 'cultivate';
UI.st = {
  arraySel: 0,
  alch: { jun:null, chen:[null,null], zuo:[null,null], shi:null },
  forge: { k1:null, k2:null, k3:null, fire:'wen' },
  form: { form:'juling', gong:'zhong', gan:'jia' },
  region: 'r0',
  codexTab: 'log',
  pendingModal: null
};
UI.battleLogDirty = false;
UI.dirtyLog = false;

UI.TABS = [
  /* 第一行：主循环 */
  { k:'cultivate', n:'修炼' },
  { k:'character', n:'人物', u:'roots' },
  { k:'bag',       n:'背包', u:'roots' },
  { k:'array',     n:'灵阵', u:'array' },
  { k:'roots',     n:'灵根', u:'roots' },
  { k:'explore',   n:'探索', u:'explore' },
  { k:'rebirth',   n:'轮回', u:'rebirth' },
  /* 第二行：辅助 */
  { k:'alchemy',   n:'丹房', u:'alch' },
  { k:'forge',     n:'器坊', u:'forge' },
  { k:'formation', n:'阵法', u:'form' },
  { k:'sect',      n:'宗门', u:'sect' },
  { k:'codex',     n:'志录' },
  { k:'settings',  n:'设置' }
];

/* =====================  初始化  ===================== */
UI.init = function(){
  UI.$hud = U.$('#hud');
  UI.$colL = U.$('#colL');
  UI.$colR = U.$('#colR');
  UI.$view = U.$('#view');
  UI.$tabs = U.$('#tabs');
  UI.$modal = U.$('#modal-layer');
  UI.$battle = U.$('#battle');
  UI.$toasts = U.$('#toasts');

  document.addEventListener('click', function(e){
    var el = e.target;
    while (el && el !== document && !el.dataset.act) el = el.parentNode;
    if (el && el !== document && el.dataset.act){
      e.preventDefault();
      UI.handle(el.dataset.act, el.dataset.arg, el);
    }
  });
  // 战斗按钮按住加速
  document.addEventListener('mousedown', function(e){
    var el = e.target;
    while (el && el !== document && !el.dataset.hold) el = el.parentNode;
    if (el && el !== document){ XX.G.battleHold = true; }
  });
  document.addEventListener('mouseup', function(){ XX.G.battleHold = false; });
  document.addEventListener('touchstart', function(e){
    var el = e.target;
    while (el && el !== document && !el.dataset.hold) el = el.parentNode;
    if (el && el !== document){ XX.G.battleHold = true; }
  }, {passive:true});
  document.addEventListener('touchend', function(){ XX.G.battleHold = false; });

  UI.renderTabs();
  UI.renderAll();
};

UI.renderAll = function(){
  UI.renderHUD(); UI.renderLeft(); UI.renderRight(); UI.renderTabs(); UI.renderView();
};

/* =====================  事件分发  ===================== */
UI.handle = function(act, arg, el){
  var G2 = XX.G;
  switch(act){
    case 'tab':     UI.switchTab(arg); break;
    case 'break':   G2.tryBreak(); break;
    case 'speedup': G2.speedUp(); break;
    case 'dao':     G2.chooseDao(arg); break;
    case 'learn':   UI.learnTech(arg); break;
    case 'techFilter': UI.techFilterSet(arg); break;
    case 'techAuto':   UI.techAuto(); break;
    case 'usePill': G2.usePill(arg); break;
    case 'usePresetPill': G2.usePresetPill(arg); break;

    case 'goalGo': UI.goalGo(arg); break;
    case 'misPick': UI.openMissionPick(arg); break;
    case 'reforge': if (G2.reforge(arg)) UI.afterDetail(arg); else UI.renderAll(); break;

    /* 详情弹窗 */
    case 'detail':   UI.detail(arg); break;
    case 'eqDirect': {
      var sp = String(arg).split(':');
      if (G2.equipItem(sp[0], sp[1])) UI.afterDetail(sp[1]);
      else UI.renderAll();
      break;
    }
    case 'embed': if (G2.embedBest(arg)) UI.afterDetail(arg); else UI.renderAll(); break;
    case 'techDetail': UI.detailTech(arg); break;
    case 'matDetail': { var mp = String(arg).split(':'); UI.detailMat(mp[0], mp[1]); break; }

    /* 人物装备 / 功法栏 / 背包 */
    case 'eqItem':    UI.openEquipPick(arg); break;
    case 'eqSet':     G2.equipItem(UI.st.pendingModal, arg); UI.closeModal(); UI.renderAll(); break;
    case 'unequipItem': G2.unequipItem(arg); UI.renderAll(); break;
    case 'equipTech':   G2.equipTech(arg); UI.renderAll(); break;
    case 'unequipTech': G2.unequipTech(arg); UI.renderAll(); break;
    case 'autoEquipTech': G2.autoEquipTech(); UI.renderAll(); U.toast('已按效果自动配装'); break;
    case 'bagTab':    UI.st.bagTab = arg; UI.renderView(); break;
    case 'sellUnused':UI.sellUnused(); break;

    /* 灵阵 */
    case 'arrSel':  UI.st.arraySel = parseInt(arg,10); UI.renderView(); break;
    case 'equip':   G2.equipTreasure(UI.st.arraySel, arg); UI.renderAll(); break;
    case 'unequip': G2.unequip(parseInt(arg,10)); UI.renderAll(); break;
    case 'autoArr': G2.autoFillArray(); UI.renderAll(); break;
    case 'clearArr':G2.clearArray(); UI.renderAll(); break;
    case 'sell':    G2.sellTreasure(arg); UI.closeModal(); UI.renderAll(); break;
    case 'lock':    UI.toggleLock(arg); UI.afterDetail(arg); break;
    case 'refine':  G2.refine(arg); UI.afterDetail(arg); break;

    /* 炼丹 */
    case 'alchPick': UI.alchPick(arg); break;
    case 'alchClear': UI.st.alch = {jun:null,chen:[null,null],zuo:[null,null],shi:null}; UI.renderView(); break;
    case 'alchDo':   G2.alch(UI.st.alch); UI.renderView(); break;
    case 'alchAuto': UI.alchAuto(); break;

    /* 炼器 */
    case 'forgePick': UI.forgePick(arg); break;
    case 'forgeFire': UI.st.forge.fire = arg; UI.renderView(); break;
    case 'forgeDo':   G2.forge(UI.st.forge.k1, UI.st.forge.k2, UI.st.forge.k3, UI.st.forge.fire); UI.renderView(); break;
    case 'forgeAuto': UI.forgeAuto(); break;

    /* 阵法 */
    case 'fmForm': UI.st.form.form = arg; UI.renderView(); break;
    case 'fmGong': UI.st.form.gong = arg; UI.renderView(); break;
    case 'fmGan':  UI.st.form.gan = arg; UI.renderView(); break;
    case 'fmBuild': G2.builFormation(UI.st.form.form, UI.st.form.gong, UI.st.form.gan); UI.renderAll(); break;

    /* 宗门 */
    case 'bldUp':  G2.upgradeBuilding(arg); UI.renderAll(); break;
    case 'recruit':G2.recruit(); UI.renderAll(); break;
    case 'assign': UI.openAssign(arg); break;
    case 'assignSet': G2.assignDisciple(UI.st.pendingModal, arg); UI.closeModal(); UI.renderAll(); break;

    /* 探索 */
    case 'region': {
      var rr = XX.D.regionById ? null : null;
      var reg = null;
      (XX.D.REGIONS || []).forEach(function(x){ if (x.id === arg) reg = x; });
      if (reg && !G2.unlockedRegion(reg)){ U.toast('此地凶险，需修至 ' + XX.D.nodeName(reg.req)); break; }
      if (UI.st.region !== arg){ UI.st.region = arg; UI.scrollToSel = true; }
      UI.renderView();
      break;
    }
    case 'explore':G2.doExplore(UI.st.region); UI.renderAll(); break;
    case 'trial':  G2.doTrial(UI.st.region); UI.renderAll(); break;
    case 'gather': G2.doGather(UI.st.region); UI.renderAll(); break;
    case 'secret': if (G2.secretActive) G2.secretStep(); else G2.startSecretRealm(); break;

    /* 轮回 */
    case 'buyStar':G2.buyStar(arg); UI.renderView(); break;
    case 'refund': G2.refundStars(); UI.renderView(); break;
    case 'rebirth':UI.openRebirth(); break;

    /* 志录 / 设置 */
    case 'codexTab': UI.st.codexTab = arg; UI.renderView(); break;
    case 'autotoggle': UI.toggleAuto(arg); break;
    case 'save': G2.save(); U.toast('已保存'); break;
    case 'hardrefresh': UI.hardRefresh(); break;
    case 'export': UI.exportSave(); break;
    case 'import': UI.importSave(); break;
    case 'reset':  UI.confirmReset(); break;
    case 'guide':  UI.showGuide(); break;

    /* 弹窗 */
    case 'modalClose': UI.modalClose(); break;
    case 'modalChoice': UI.pickChoice(parseInt(arg,10)); break;
    case 'pickBranch': UI.pickBranch(arg); break;
    case 'modalOk': UI.modalOk(); break;

    /* 战斗 */
    case 'batSkill': G2.battleManual(parseInt(arg,10)); break;
    case 'batAuto':  G2.battleToggleAuto(); break;
    case 'batSpeed': G2.battleSetSpeed(parseInt(arg,10)); break;
    case 'batFlee':  G2.battleFlee(); break;
    default: break;
  }
};

/* =====================  标签栏  ===================== */
UI.switchTab = function(k){
  var def = null;
  UI.TABS.forEach(function(t){ if (t.k === k) def = t; });
  if (def && def.u && !G.unlock[def.u]){
    var hint = { roots:'境界再进一层', array:'境界再进一层', explore:'修至炼气', alch:'修至炼气',
                 forge:'修至筑基', form:'修至筑基', sect:'修至筑基', rebirth:'修至筑基' };
    U.toast('此路尚未开启——' + (hint[def.u] || '继续修行'));
    return;
  }
  UI.tab = k;
  UI.renderTabs(); UI.renderView();
};
UI.renderTabs = function(){
  var h = '';
  UI.TABS.forEach(function(t){
    var locked = t.u && !G.unlock[t.u];
    var b = locked ? '' : UI.tabBadge(t.k);
    h += '<div class="tab' + (UI.tab===t.k?' on':'') + (locked?' locked':'') + '" data-act="tab" data-arg="'+t.k+'">' +
         t.n + (b ? '<i class="badge'+(b==='gold'?' gold':'')+'"></i>' : '') + '</div>';  });
  UI.$tabs.innerHTML = h;
};

/* 标签页红点提示：告诉玩家「那边有东西可做」
   红点=cinn（需处理）　金点=gold（有机会） */
UI.tabBadge = function(k){
  try{
    switch(k){
      case 'cultivate':
        if (G.pendingBranch !== null || G.pendingTrib !== null) return 'cinn';
        if (!G.auto.break && G.qi >= G.stepCost()) return 'cinn';
        return '';
      case 'character': {
        var sl = G.skillSlots();
        var free = (sl.active - G.skills.active.length) + (sl.passive - G.skills.passive.length);
        if (free <= 0) return '';
        for (var id in G.techs){ if (!G.isTechEquipped(id)) return 'gold'; }
        return '';
      }
      case 'array': {
        var free2 = 0;
        G.slots.forEach(function(x){ if (!x) free2++; });
        if (!free2) return '';
        var idle2 = 0;
        G.treasures.forEach(function(t){ if (!G.treasureUse(t.id)) idle2++; });
        return idle2 > 0 ? 'gold' : '';
      }
      case 'explore':
        return G.secretActive ? 'cinn' : '';
      case 'rebirth': {
        var cheap = 99999;
        D.STARS.forEach(function(s){ if (G.starLv(s.k) < s.max){ var c = G.starCost(s.k); if (c < cheap) cheap = c; } });
        return G.rebirth.points >= cheap ? 'gold' : '';
      }
      default: return '';
    }
  }catch(e){ return ''; }
};

/* =====================  HUD  ===================== */
UI.renderHUD = function(){
  var st = G.der ? G.der.st : {power:0};
  var need = G.stepCost();
  var prog = U.clamp(G.qi / need, 0, 1);
  var nm = D.nodeName(G.node);
  var rootChips = '';
  G.rootKeys().forEach(function(k){
    var v = G.roots[k];
    rootChips += '<span class="root-chip" style="border-color:'+D.ROOT[k].c+';color:'+D.ROOT[k].c+'">'+D.ROOT[k].n+
                 '<em>'+Math.round(v)+'</em></span>';
  });
  if (G.isChaos()) rootChips += '<span class="root-chip" style="border-color:#e7d3a2;color:#e7d3a2">混沌</span>';
  var buffs = '';
  G.buffs.forEach(function(b){
    var left = Math.max(0, Math.round((b.until - Date.now())/1000));
    buffs += '<span class="tag purple">'+b.name+' '+U.fmtTimeShort(left)+'</span>';
  });
  UI.$hud.innerHTML =
    '<div class="hud-row">' +
      '<span class="hud-name">'+U.esc(G.name)+'</span>' +
      '<span class="hud-realm">'+nm+(G.jindan?' · '+D.jindanName(G.jindan)+'丹':'')+'</span>' +
      '<span class="hud-chip">灵石 <b>'+U.fmt(G.spirit)+'</b></span>' +
      '<span class="hud-chip">道心 <b>'+Math.round(G.heart)+'/'+G.maxHeart()+'</b></span>' +
      '<span class="hud-chip">因果 <b class="'+(G.karma>=0?'pos':'neg')+'">'+(G.karma>0?'+':'')+Math.round(G.karma)+'</b></span>' +
      '<span class="hud-chip">战力 <b>'+U.fmt(st.power)+'</b></span>' +
      '<span class="hud-chip">'+(G.dao?D.DAOS[G.dao].n:'未立道')+'</span>' +
    '</div>' +
    '<div class="hud-row" style="margin-top:4px">' +
      '<div class="hud-bar gold"><i style="width:'+(prog*100).toFixed(2)+'%"></i><span>'+(prog>=1?'可突破！':(prog*100).toFixed(1)+'%')+'</span></div>' +
      '<span class="rate"> +'+U.fmt(G.qiRate())+'/秒</span>' +
      '<span class="hud-chip">'+U.fmt(G.qi)+' / '+U.fmt(need)+'</span>' +
    '</div>' +
    '<div class="hud-row" style="margin-top:3px">' +
      '<div class="hud-roots">'+rootChips+'</div>' +
      '<div style="flex:1"></div>'+ buffs +
    '</div>';
  UI.dirty = false;
};

/* =====================  左栏  ===================== */
UI.renderLeft = function(){
  var st = G.der ? G.der.st : {};
  var b = G.gatherBonuses();
  var ad = G.arrayDetail();
  var h = '';
  h += '<div class="card tight"><h3>道体 <small>'+D.realmOf(G.node).n+'</small></h3><div class="statgrid">' +
    '<div class="kv"><span>战力</span><b>'+U.fmt(st.power||0)+'</b></div>' +
    '<div class="kv"><span>气血</span><b>'+U.fmt(st.hp||0)+'</b></div>' +
    '<div class="kv"><span>攻击</span><b>'+(st.atk||0).toFixed(1)+'</b></div>' +
    '<div class="kv"><span>防御</span><b>'+(st.def||0).toFixed(1)+'</b></div>' +
    '<div class="kv"><span>速度</span><b>'+(st.spd||0).toFixed(1)+'</b></div>' +
    '<div class="kv"><span>暴击 / 暴伤</span><b>'+U.pct(st.crit||0,1)+' / '+(st.cdmg||1.5).toFixed(2)+'</b></div>' +
    '<div class="kv"><span>闪避</span><b>'+U.pct(st.dodge||0,1)+'</b></div>' +
    '</div></div>';
  h += '<div class="card tight"><h3>加持</h3><div class="statgrid">' +
    '<div class="kv"><span>修炼速度</span><b>×'+(G.der?G.der.cultMul.toFixed(2):'1')+'</b></div>' +
    '<div class="kv"><span>灵阵灵力</span><b>'+U.fmt(ad.total)+'</b></div>' +
    '<div class="kv"><span>阵势加成</span><b class="'+(ad.adj>=0?'pos':'neg')+'">'+(ad.adj>=0?'+':'')+U.pct(ad.adj,1)+'</b></div>' +
    '<div class="kv"><span>宗门产出</span><b class="'+(b.sect>=0?'pos':'neg')+'">'+(b.sect>=0?'+':'')+U.pct(b.sect,0)+'</b></div>' +
    '<div class="kv"><span>机缘</span><b>+'+U.pct(b.luck,0)+'</b></div>' +
    '<div class="kv"><span>突破/渡劫</span><b class="pos">+'+U.pct(b.breakthrough,0)+'</b></div>' +
    '</div></div>';
  // 分支
  var brs = '';
  for (var rk in G.branch){ if (G.branch[rk]) brs += '<span class="tag gold">'+G.branch[rk]+'</span>'; }
  h += '<div class="card tight"><h3>道途</h3><div>'+(brs||'<span class="sub">尚未择路</span>')+'</div>' +
       '<div class="kv small"><span>功法参悟</span><b>'+Object.keys(G.techs).length+' 门</b></div>' +
       '<div class="kv small"><span>功法碎片</span><b>'+G.shards+'</b></div>' +
       '<div class="kv small"><span>法宝</span><b>'+G.treasures.length+' 件</b></div>' +
       '<div class="kv small"><span>转世</span><b>第 '+((G.rebirth.count||0)+1)+' 世</b></div>' +
       '</div>';
  UI.$colL.innerHTML = h;
};

/* =====================  右栏  ===================== */
UI.renderRight = function(){
  var s = G.sect;
  var herbN = 0, oreN = 0;
  for (var k in G.bag.herb) herbN += G.bag.herb[k];
  for (var k2 in G.bag.ore) oreN += G.bag.ore[k2];
  var h = '';
  h += '<div class="card tight"><h3>资材</h3>' +
    '<div class="kv"><span>灵石</span><b>'+U.fmt(G.spirit)+'</b></div>' +
    '<div class="kv"><span>灵石产出</span><b>'+U.fmt(G.sectSpiritRate())+'/秒</b></div>' +
    '<div class="kv"><span>灵草</span><b>'+herbN+' 株</b></div>' +
    '<div class="kv"><span>矿石</span><b>'+oreN+' 块</b></div>' +
    '<div class="kv"><span>成品丹</span><b>'+G.customPills.length+' 枚</b></div>' +
    '<div class="hr"></div>' +
    '<div class="kv small"><span>宗门</span><b>'+s.name+' Lv'+G.sectLevel()+'</b></div>' +
    '<div class="kv small"><span>弟子</span><b>'+s.disciples.length+'/'+G.maxDisciples()+'</b></div>' +
    '</div>';
  // 日志
  var logs = G.logs || [];
  h += '<div class="card tight"><h3>见闻 <small>近 40 条</small></h3><div style="max-height:340px;overflow-y:auto;font-size:12px;line-height:1.6">';
  if (!logs.length) h += '<div class="empty">尚无见闻</div>';
  logs.slice(0,40).forEach(function(l){
    h += '<div style="padding:2px 0;border-bottom:1px dashed rgba(201,168,106,.10)"><span class="sub">'+l.t+'</span> '+l.m+'</div>';
  });
  h += '</div></div>';
  UI.$colR.innerHTML = h;
  UI.dirtyLog = false;
};

/* =====================  中间视图  ===================== */
UI.renderView = function(){
  var fn = UI['view_'+UI.tab];
  if (!fn){ UI.$view.innerHTML = '<div class="empty">此路未开</div>'; return; }
  UI.$view.innerHTML = fn.call(UI);
  if (UI[UI.tab+'_after']) UI[UI.tab+'_after']();
};

/* =====================  提示条  ===================== */
UI.toast = function(msg){ U.toast(msg); };

/* =====================  弹窗  ===================== */
UI._modalCb = null;
UI._queue = [];
UI.modal = function(o){
  o = o || {};
  // 未决的「择路 / 天劫」弹窗不能被别的弹窗顶掉 —— 否则突破会被卡死
  if (!o.__pend && UI._modalCb && UI._modalCb.__pend && UI.$modal.classList.contains('on')){
    UI._queue.push(o);
    return;
  }
  var h = '<div class="modal"><h2>'+ (o.title||'') + (o.sub?'<small>'+o.sub+'</small>':'') +'</h2>';
  if (o.body) h += '<div class="mbody">'+(o.body)+'</div>';
  if (o.choices && o.choices.length){
    h += '<div style="margin-top:10px">';
    o.choices.forEach(function(c,i){
      h += '<div class="choice'+(c.dis?' dis':'')+'" data-act="modalChoice" data-arg="'+i+'"><div class="ct">'+c.t+'</div>'+(c.d?'<div class="cd">'+c.d+'</div>':'')+'</div>';
    });
    h += '</div>';
  }
  h += '<div class="mfoot">';
  if (o.cancel) h += '<button data-act="modalClose">'+o.cancel+'</button>';
  h += '<button class="primary" data-act="modalOk">'+(o.ok||'知道了')+'</button></div></div>';
  UI.$modal.innerHTML = h;
  UI.$modal.classList.add('on');
  UI._modalCb = o;
  UI.repaintFix();
};

/* 部分 Android WebView 会把弹窗子节点漏绘（只画出标题）。
   渲染后自检一次内容区高度，异常则强制重新合成。 */
UI.repaintFix = function(){
  requestAnimationFrame(function(){
    var box = UI.$modal.querySelector('.modal');
    if (!box) return;
    var body = box.querySelector('.mbody');
    var broken = (box.getBoundingClientRect().height < 30) ||
                 (body && body.textContent.trim().length > 0 && body.getBoundingClientRect().height < 4);
    if (!broken) return;
    box.style.display = 'none';
    void box.offsetHeight;          // 强制回流
    box.style.display = '';
    void box.offsetHeight;
    setTimeout(function(){
      if (box.parentNode && box.getBoundingClientRect().height < 30){
        var h = UI.$modal.innerHTML;  // 仍异常：整体重置一次
        UI.$modal.innerHTML = '';
        void UI.$modal.offsetHeight;
        UI.$modal.innerHTML = h;
      }
    }, 260);
  });
};
UI.closeModal = function(){
  UI.$modal.classList.remove('on');
  UI.$modal.innerHTML = '';
  UI._modalCb = null;
  // 有排队中的弹窗就接上
  if (UI._queue.length){
    var nx = UI._queue.shift();
    setTimeout(function(){ UI.modal(nx); }, 80);
  }
};
UI.modalClose = function(){
  var cb = UI._modalCb;
  UI.closeModal();
  if (cb && cb.onCancel) cb.onCancel();
};
UI.modalOk = function(){
  var cb = UI._modalCb;
  UI.closeModal();
  if (cb && cb.onOk) cb.onOk();
};
UI.pickChoice = function(i){
  var cb = UI._modalCb;
  if (!cb || !cb.choices) return;
  var c = cb.choices[i];
  if (!c || c.dis) return;
  UI.closeModal();
  if (c.on) c.on();
};
/* 择定道途分支（用事件委托，避免弹窗重绘后点击失效） */
UI._branchRi = null;
UI.pickBranch = function(b){
  var ri = UI._branchRi;
  if (ri === null || ri === undefined || !D.BRANCHES[b]) return;
  G.branch[ri] = b;
  G.pendingBranch = null;
  G.auto.break = true;
  G.log('你择定 <b class="val">'+b+'</b> 之路——'+ D.BRANCHES[b].desc);
  G.recalc();
  UI.closeModal();
  UI.renderAll();
  G.checkBreak();
};

/* =====================  奇遇事件弹窗  ===================== */
UI.openEventModal = function(ev, region, isSecret){
  var opts = ev.opts.slice();
  var choices = opts.map(function(o){
    var dis = false, note = o.d || '';
    if (o.req && !o.req(G)){ dis = true; note = (note?note+' · ':'') + '条件不足'; }
    if (o.cost && o.cost.spirit && G.spirit < o.cost.spirit){ dis = true; note = (note?note+' · ':'') + '灵石不足（需 '+U.fmt(o.cost.spirit)+'）'; }
    if (o.cost && o.cost.form && G.formPower() < 1 + o.cost.form/100){ dis = true; note = (note?note+' · ':'') + '阵道不足'; }
    return {
      t: o.t, d: note, dis: dis,
      on: function(){
        var res = '';
        try { res = o.do(G) || ''; } catch(e){ res = '（事有蹊跷……）'; console.warn(e); }
        if (res) G.log('<span class="tag gold">奇遇</span> ' + res);
        UI.renderAll();
        if (G.secretActive && !G.battle) setTimeout(function(){ G.secretStep(); }, 420);
      }
    };
  });
  UI.modal({
    title: (isSecret ? '秘境 · ' : '') + ev.n,
    sub: region ? region.n : (isSecret ? '深入秘境第 ' + (G.secretStage) + ' 层' : '机缘所至'),
    body: '<p>' + ev.txt + '</p>',
    choices: choices,
    ok: '静观其变',
    cancel: G.secretActive ? '退出秘境' : null,
    onOk: function(){ if (G.secretActive) G.endSecretRealm(true); UI.renderAll(); }
  });
};

/* =====================  分支选择弹窗  ===================== */
UI.openBranchModal = function(ri){
  var r = D.REALMS[ri];
  var list = r.br || [];
  var body = '<p>你已立于 <b class="val">'+r.n+'</b> 门前，须择一条路走下去。此择将伴你此生。</p><div class="branch-grid">';
  list.forEach(function(b){
    var br = D.BRANCHES[b] || {desc:'',eff:{}};
    var eff = [];
    for (var k in br.eff){
      var v = br.eff[k];
      var nm = {atk:'攻击',def:'防御',hp:'气血',spd:'速度',crit:'暴击',cdmg:'暴伤',cult:'修炼',heal:'回复',alch:'炼丹',forge:'炼器',form:'阵法',sect:'宗门',luck:'机缘',all:'全属性',heart:'道心',karmaGood:'善缘',karmaBad:'魔道',herb:'灵草',tribulation:'渡劫',breakthrough:'突破',spd2:''}[k]||k;
      if (typeof v === 'number') eff.push(nm + (Math.abs(v)<1 ? ' '+(v>0?'+':'')+Math.round(v*100)+'%' : ' '+(v>0?'+':'')+v));
    }
    body += '<div class="branch" data-act="pickBranch" data-arg="'+b+'"><b>'+b+'</b><span>'+br.desc+'<br>' + eff.join('　') + '</span></div>';
  });
  body += '</div>';
  UI._branchRi = ri;
  UI.modal({
    __pend: true,
    title: '抉择 · ' + r.n,
    sub: '每一个大境界，都是一次分岔',
    body: body,
    cancel: '暂且不决',
    ok: '凝神静气',
    onOk: function(){ G.pendingBranch = null; G.auto.break = false; UI.toast('你选择暂不决断，突破已停（可点「择路」重开）'); UI.renderAll(); },
    onCancel: function(){ G.pendingBranch = null; G.auto.break = false; UI.renderAll(); }
  });
};

/* =====================  天劫弹窗  ===================== */
UI.openTribModal = function(ri){
  var nm = G.tribName(ri);
  var ch = G.tribChance(ri);
  var r = D.REALMS[ri];
  UI.modal({
    __pend: true,
    title: '天劫 · ' + nm,
    sub: '踏入 ' + r.n + '，天地不容',
    body: '<p>劫云自四方汇聚，压得你几乎喘不过气。</p>' +
          '<div class="kv"><span>预估生还</span><b class="'+(ch>0.6?'pos':'neg')+'">'+U.pct(ch,0)+'</b></div>' +
          '<div class="kv"><span>因果</span><b>'+(G.karma>0?'善缘 '+Math.round(G.karma):G.karma<0?'恶业 '+Math.round(Math.abs(G.karma)):'无')+'</b></div>' +
          '<div class="kv"><span>道心</span><b>'+Math.round(G.heart)+' / '+G.maxHeart()+'</b></div>' +
          '<p class="sub">渡劫失败将境界跌落、修为尽散、道心受损。</p>',
    cancel: '压制修为（推迟）',
    ok: '迎劫！',
    onOk: function(){ G.startTribulation(ri); },
    onCancel: function(){ G.pendingTrib = null; G.auto.break = false; UI.toast('你暂且压制修为，欲渡劫请手动点「突破」'); UI.renderAll(); }
  });
};

/* =====================  选择灵根  ===================== */
UI.askRoot = function(title, cb, onCancel){
  var ks = G.rootKeys();
  UI.modal({
    title: title,
    body: '<p class="sub">点击选择一条灵根。选好后丹药才会消耗。</p>',
    choices: ks.map(function(k){
      return { t: D.ROOT[k].n + '灵根', d: '当前纯度 ' + G.roots[k].toFixed(1), on: function(){ cb(k); UI.renderAll(); } };
    }),
    ok: '取消',
    onOk: function(){ if (onCancel) onCancel(); }
  });
};

/* =====================  战斗界面  ===================== */
UI.openBattle = function(){
  UI.$battle.classList.remove('hidden');
  UI.renderBattle();
};
UI.closeBattle = function(){ UI.$battle.classList.add('hidden'); UI.$battle.innerHTML = ''; };

UI.renderBattle = function(){
  var B = G.battle; if (!B) return;
  var a = B.ally, f = B.foe;
  var ap = U.clamp(a.hp/a.maxhp,0,1), fp = U.clamp(f.hp/f.maxhp,0,1);
  var h = '<div class="bat-wrap">';
  h += '<div class="bat-title">'+(B.cfg.kind==='tribulation'?'天 劫':(B.cfg.kind==='ascend'?'飞 升 之 劫':'斗 法'))+'</div>';
  h += '<div class="bat-top">' +
       '<span class="tag '+(B.auto?'jade':'gold')+'">'+(B.auto?'自动':'手动')+'</span>' +
       '<span class="tag">回合 '+B.turn+'</span>' +
       '<span class="tag" style="border-color:'+D.elColor(a.el)+';color:'+D.elColor(a.el)+'">'+D.elName(a.el)+'</span>' +
       '<span class="tag" style="border-color:'+D.elColor(f.el)+';color:'+D.elColor(f.el)+'">'+D.elName(f.el)+'</span>' +
       '</div>';
  h += '<div class="bat-fighters">';
  h += '<div class="bat-side"><div class="bn">'+U.esc(a.name)+(a.buff.t>0?' <span class="tag jade">加持</span>':'')+'</div>' +
       '<div class="bat-hp own"><i style="width:'+(ap*100)+'%"></i><span>'+U.fmt(a.hp)+' / '+U.fmt(a.maxhp)+'</span></div>' +
       '<div class="sub">攻 '+(a.atk).toFixed(1)+'　防 '+(a.def).toFixed(1)+'　速 '+(a.spd).toFixed(1)+'</div></div>';
  h += '<div class="bat-vs">VS</div>';
  h += '<div class="bat-side" style="text-align:right"><div class="bn">'+U.esc(f.name)+(f.boss?' <span class="tag cinn">首领</span>':'')+'</div>' +
       '<div class="bat-hp foe"><i style="width:'+(fp*100)+'%"></i><span>'+U.fmt(f.hp)+' / '+U.fmt(f.maxhp)+'</span></div>' +
       '<div class="sub">攻 '+(f.atk).toFixed(1)+'　防 '+(f.def).toFixed(1)+'　速 '+(f.spd).toFixed(1)+'</div></div>';
  h += '</div>';
  h += '<div class="bat-log" id="batlog">';
  B.log.slice(-60).forEach(function(l){ h += '<div class="'+l.c+'">'+l.t+'</div>'; });
  h += '</div>';
  // 技能
  h += '<div class="bat-skills">';
  a.skills.forEach(function(s,i){
    var dis = (s.cur>0) || !B.waiting && !B.auto;
    h += '<button class="'+(s.cur>0?'':'primary')+'" data-act="batSkill" data-arg="'+i+'" '+(s.cur>0?'disabled':'')+'>' +
         s.n + (s.cur>0 ? ' <span class="tag mute">'+s.cur+'</span>' : ' <span class="tag mute">'+(s.pow||1).toFixed(1)+'×</span>') + '</button>';
  });
  h += '</div>';
  h += '<div class="btnrow" style="justify-content:space-between">';
  h += '<button data-act="batAuto">'+(B.auto?'切手动':'切自动')+'</button>';
  h += '<span><button data-act="batSpeed" data-arg="1">×1</button> <button data-act="batSpeed" data-arg="2">×2</button> <button data-act="batSpeed" data-arg="4">×4</button> ' +
       '<button data-hold="1">按住加速</button></span>';
  if (B.cfg.kind !== 'tribulation' && B.cfg.kind !== 'ascend') h += '<button class="danger" data-act="batFlee">遁走</button>';
  h += '</div>';
  h += '</div>';
  UI.$battle.innerHTML = h;
  var lg = U.$('#batlog');
  if (lg) lg.scrollTop = lg.scrollHeight;
  UI.battleLogDirty = false;
};

/* =====================  结果弹窗  ===================== */
UI.alchResult = function(pill, pv){
  UI.modal({
    title: '丹成',
    sub: '君臣佐使，各安其位',
    body: '<p style="text-align:center;font-size:22px;color:#e7d3a2;letter-spacing:4px;margin:8px 0">'+pill.name+'</p>' +
          '<div class="kv"><span>药力</span><b>'+pill.power.toFixed(2)+'</b></div>' +
          '<div class="kv"><span>药性</span><b>'+D.PILLS[pill.kind].n+'</b></div>' +
          '<div class="hr"></div>' +
          '<div class="sub">'+pv.steps.join('<br>')+'</div>',
    ok: '收丹'
  });
};
UI.forgeResult = function(t, pv){
  UI.modal({
    title: '器成',
    sub: '火候既足，宝光自生',
    body: '<p style="text-align:center;font-size:20px;color:#e7d3a2;letter-spacing:3px;margin:8px 0">'+t.name+'</p>' +
          '<p style="text-align:center"><span class="tag gold">'+D.gradeName(t.g,t.s)+'</span> ' +
          '<span class="tag cyan">'+(t.typeN||'法宝')+'</span> ' +
          '<span class="tag" style="border-color:'+D.ROOT[t.el].c+';color:'+D.ROOT[t.el].c+'">'+D.ROOT[t.el].n+'</span></p>' +
          '<p style="text-align:center" class="sub">可戴于：'+D.treasureSlots(t).map(function(k){ return D.EQK[k].n; }).join('、')+'</p>' +
          (pv && pv.infuse && pv.infuse.got.length
            ? '<p style="text-align:center"><span class="tag purple">灵材烙印 ×'+pv.infuse.got.length+'</span> <span class="sub">（'+pv.infuse.from.join('、')+'）</span></p>'
            : '') +
          '<div class="hr"></div>' + UI.affixHtml(t),
    ok: '收入囊中'
  });
};
UI.affixHtml = function(t){
  var base = '', inf = '', org = '';
  t.affixes.forEach(function(a){
    var d = D.affixDesc(a);
    var line;
    if (a.origin){
      line = '<div class="kv"><span><span class="tag gold">'+a.n+'</span></span><b class="val">'+d+'</b></div>';
    } else if (a.sp){
      line = '<div class="kv"><span><span class="tag purple">'+a.n+'</span></span><b class="val">'+d+'</b></div>';
    } else {
      var val = (a.fmt === 'flat') ? ((a.v > 0 ? '+' : '') + a.v) : ('+' + U.pct(a.v, 1));
      line = '<div class="kv"><span>'+a.n+(d ? '　<span class="tag mute">'+d+'</span>' : '')+'</span><b>'+val+'</b></div>';
    }
    if (a.origin) org += line;
    else if (a.infuse) inf += line;
    else base += line;
  });
  var h = '';
  if (org)  h += '<div class="sub">来历　<span class="tag mute">由这件法宝的出处烙下</span></div>' + org;
  if (base) h += (h ? '<div class="hr"></div>' : '') + '<div class="sub">天生词条</div>' + base;
  if (inf)  h += '<div class="hr"></div><div class="sub">灵材烙印　<span class="tag mute">自材料继承，不占天生名额</span></div>' + inf;
  return h || '<div class="empty">无词条</div>';
};

/* =====================  其他交互  ===================== */
UI.learnTech = function(id){
  var t = D.TK[id]; if (!t) return;
  var lv = G.techs[id] || 0;
  if (lv >= D.TECH_LVMAX){ XX.UI.toast(t.n + ' 已至圆满（'+D.TECH_LVMAX+' 级）'); return; }
  if (lv === 0 && t.sp && G.node < G.TECH_SEAL_NODE){
    XX.UI.toast('秘传功法需修至 ' + D.nodeName(G.TECH_SEAL_NODE) + ' 以上方可参悟');
    return;
  }
  if (lv === 0 && t.el !== 'any' && (G.roots[t.el] || 0) < t.req){
    XX.UI.toast(D.ROOT[t.el].n + '灵根纯度需达 ' + t.req + '%');
    return;
  }
  var cost = G.techUpCost(id);
  if (G.shards < cost){ XX.UI.toast('功法碎片不足（需 ' + cost + '）'); return; }
  G.shards -= cost;
  if (!lv){
    G.learnTech(id);
    XX.UI.toast('参悟 ' + t.n);
  } else {
    G.techs[id] = lv + 1;
    G.log('功法 <b class="val">'+t.n+'</b> 精进至参悟 '+G.techs[id]+' 级');
    XX.UI.toast(t.n + ' → 参悟 ' + G.techs[id] + ' 级');
  }
  G.recalc();
  UI.renderAll();
};
UI.techFilterSet = function(arg){
  var p = String(arg).split(':');
  UI.techF = UI.techF || { kind:'all', el:'all', state:'all' };
  UI.techF[p[0]] = p[1];
  UI.renderView();
};
UI.techAuto = function(){
  var r = G.autoLearn();
  if (!r.spent){ U.toast('没有可参悟的功法（碎片不足或灵根未达）'); return; }
  UI.renderAll();
  UI.modal({
    title:'参悟',
    sub:'碎片尽数化入识海',
    body:'<div class="kv"><span>新悟功法</span><b class="val">'+r.learned+' 门</b></div>' +
         '<div class="kv"><span>耗碎片</span><b>'+r.spent+'</b></div>' +
         '<div class="kv"><span>余碎片</span><b>'+G.shards+'</b></div>' +
         '<div class="sub" style="margin-top:6px">已参悟 '+Object.keys(G.techs).length+' / '+D.TECHS.length+' 门</div>',
    ok:'收心'
  });
};
UI.toggleLock = function(id){
  var t = G.treasureById(id); if (!t) return;
  t.lock = !t.lock;
  UI.renderAll();
};
UI.toggleAuto = function(k){
  G.auto[k] = !G.auto[k];
  UI.renderView();
};
/* 选择要佩戴的法宝（只列出形制合适的） */
UI.openEquipPick = function(slot){
  var s = D.EQK[slot]; if (!s) return;
  UI.st.pendingModal = slot;
  var used = {};
  if (G.equip) for (var k in G.equip) if (G.equip[k]) used[G.equip[k]] = 1;
  G.slots.forEach(function(x){ if (x) used[x] = 1; });
  var all = G.treasures.filter(function(t){ return !used[t.id]; });
  var cand = all.filter(function(t){ return D.canWear(t, slot); });
  var blocked = all.length - cand.length;

  function score(t){
    var fit = (t.el === s.el) ? 1.25 : 1.0;
    var aff = 0;
    t.affixes.forEach(function(a){ if (!a.sp && s.aff.indexOf(a.k) >= 0) aff += (a.v||0) * 12; });
    return (t.power + aff) * fit;
  }
  cand.sort(function(a,b){ return score(b) - score(a); });
  var choices = cand.slice(0, 15).map(function(t){
    var fit = (t.el === s.el);
    var aff = [];
    t.affixes.forEach(function(a){ if (!a.sp && s.aff.indexOf(a.k) >= 0) aff.push(a.n); });
    return {
      t: t.name + '　<span class="tag gold">'+D.gradeName(t.g, t.s)+'</span> <span class="tag cyan">'+(t.typeN||'法宝')+'</span>',
      d: '['+D.ROOT[t.el].n+'] 灵力 '+U.fmt(t.power) + (fit ? '　·　<b class="val">属性契合 ×1.25</b>' : '') +
         (aff.length ? '　·　对口：'+aff.join('、') : '') +
         (D.treasureSlots(t).length > 1 ? '　·　亦可在：' + D.treasureSlots(t).filter(function(x){return x!==slot;}).map(function(x){return D.EQK[x].n;}).join('、') : ''),
      on: function(){ G.equipItem(slot, t.id); UI.renderAll(); }
    };
  });
  if (!choices.length){
    choices = [{
      t: '没有可戴在此位的法宝',
      d: blocked > 0 ? ('有 '+blocked+' 件形制不合（'+s.n+'位需：' + D.TREASURE_TYPES.filter(function(x){return x.slots.indexOf(slot)>=0;}).map(function(x){return x.n;}).join('、') + '）') 
                     : '去器坊炼制，或在探索中寻得',
      dis: true, on: function(){}
    }];
  }
  UI.modal({
    title: '选择 · ' + s.n,
    sub: s.desc + '　·　主属性 ' + D.ROOT[s.el].n + '（同属 +25%）',
    body: '<div class="sub">此位可戴形制：<b class="val">' +
      D.TREASURE_TYPES.filter(function(x){ return x.slots.indexOf(slot) >= 0; }).map(function(x){ return x.n; }).join('、') +
      '</b>　·　其余形制可嵌入灵阵阵眼' + (blocked > 0 ? '（另有 '+blocked+' 件形制不合）' : '') + '</div>',
    choices: choices,
    ok: '取消'
  });
};

/* 批量出售：未被使用的法宝（保留锁定的） */
UI.sellUnused = function(){
  var used = {};
  if (G.equip) for (var k in G.equip) if (G.equip[k]) used[G.equip[k]] = 1;
  G.slots.forEach(function(x){ if (x) used[x] = 1; });
  var targets = G.treasures.filter(function(t){ return !used[t.id] && !t.lock; });
  if (!targets.length){ U.toast('没有可出售的闲置法宝'); return; }
  // 保留最强的 2 件
  targets.sort(function(a,b){ return b.power - a.power; });
  targets = targets.slice(2);
  if (!targets.length){ U.toast('闲置法宝不足 3 件，先留着吧'); return; }
  var total = 0;
  targets.forEach(function(t){
    total += Math.floor(40 * t.power * (1 + G.node*0.3));
    G.treasures = G.treasures.filter(function(x){ return x.id !== t.id; });
  });
  G.addSpirit(total);
  G.log('售出闲置法宝 '+targets.length+' 件，得灵石 '+U.fmt(total));
  UI.renderAll();
  U.toast('售出 '+targets.length+' 件，得灵石 '+U.fmt(total));
};

/* =====================  统一详情弹窗  ===================== */
/* 用法：data-act="detail" data-arg="tre:法宝id" | "tech:功法id" | "herb:灵草key" | "ore:矿石key" | "pill:丹id" */
UI.detail = function(arg){
  var p = String(arg).split(':');
  var kind = p[0], id = p.slice(1).join(':');
  if (kind === 'tre')  return UI.detailTreasure(id);
  if (kind === 'tech') return UI.detailTech(id);
  if (kind === 'herb') return UI.detailMat('herb', id);
  if (kind === 'ore')  return UI.detailMat('ore', id);
  if (kind === 'pill') return UI.detailPill(id);
};
/* 动作后若详情弹窗开着就刷新它 */
UI.afterDetail = function(id){
  UI.renderAll();
  if (UI.$modal.classList.contains('on') && G.treasureById(id)) UI.detailTreasure(id);
};
/* 派遣任务：逐个选弟子（够人数自动出发） */
UI.openMissionPick = function(mk){
  var m = D.MISK[mk]; if (!m) return;
  var need = Math.ceil(m.min / 2);
  var busy = {};
  G.missions().forEach(function(x){ x.ids.forEach(function(i){ busy[i] = 1; }); });
  var sel = (UI._misPick && UI._misPick[mk]) || [];
  var free = (G.sect.disciples || []).filter(function(d){ return !busy[d.id] && sel.indexOf(d.id) < 0; });
  if (!free.length){
    U.toast(sel.length ? '没有更多空闲弟子了' : '没有空闲弟子');
    return;
  }
  var choices = free.map(function(d){
    var tr = (d.traits || []).map(function(tk){ return D.TRAITK[tk] ? D.TRAITK[tk].n : tk; }).join('、');
    return {
      t: d.name + '　资质 ' + d.talent,
      d: '境界 ' + D.nodeName(d.node) + (tr ? '　·　' + tr : ''),
      on: function(){
        UI._misPick = UI._misPick || {};
        UI._misPick[mk] = (UI._misPick[mk] || []).concat([d.id]);
        var cur = UI._misPick[mk];
        if (cur.length >= need){
          G.sendMission(mk, cur);
          UI._misPick[mk] = [];
          UI.closeModal();
          UI.renderAll();
        } else {
          UI.toast('已选 ' + cur.length + ' / ' + need + ' 人');
          UI.openMissionPick(mk);
        }
      }
    };
  });
  choices.push({ t: '就此出发（' + sel.length + ' 人）', d: sel.length ? '人少耗时更久，收获也更少' : '至少先选 1 人',
    dis: sel.length === 0,
    on: function(){ G.sendMission(mk, sel); UI._misPick[mk] = []; UI.closeModal(); UI.renderAll(); } });
  UI.modal({
    title: '派遣 · ' + m.n,
    sub: m.d + '　·　建议 ' + need + ' 人　·　约 ' + U.fmtTimeShort(m.dur),
    body: '<div class="sub">已选 <b class="val">' + sel.length + ' / ' + need + '</b> 人。人多则更快、收获更多，归来时弟子会成长。</div>',
    choices: choices,
    ok: '取消',
    onOk: function(){ UI._misPick = {}; }
  });
};

/* 服用丹药后：丹药已被消耗，刷新界面并关掉失效的详情弹窗 */
UI.afterUsePill = function(){
  if (UI.$modal.classList.contains('on')) UI.closeModal();
  UI.renderAll();
  UI.renderTabs();
};

/* 点击「当前指引」：执行对应动作、或跳到对应标签页 */
UI.goalGo = function(i){
  var g = G.goals()[parseInt(i, 10)];
  if (!g) return;
  if (g.act) UI.handle(g.act, g.arg, null);
  else UI.switchTab(g.tab);
  UI.renderAll();
};

UI.detailTreasure = function(id){
  var t = G.treasureById(id);
  if (!t){ UI.closeModal(); return; }
  var use = G.treasureUse(id);
  var sl = D.treasureSlots(t);
  var SRC = { forge:'器坊炼制', drop:'妖兽掉落', secret:'秘境所得', generic:'机缘所得', event:'奇遇所得' };
  var body = '';
  body += '<p style="text-align:center;font-size:19px;color:#e7d3a2;letter-spacing:2px;margin:2px 0 6px">'+t.name+'</p>';
  body += '<p style="text-align:center"><span class="tag cyan">'+t.typeN+'</span> <span class="tag" style="border-color:'+D.ROOT[t.el].c+';color:'+D.ROOT[t.el].c+'">'+D.ROOT[t.el].n+'属</span> <span class="tag gold">'+D.gradeName(t.g,t.s)+'</span>'+(t.lock?' <span class="tag cinn">已锁定</span>':'')+'</p>';
  body += '<div class="hr"></div>';
  body += '<div class="kv"><span>灵力</span><b class="val">'+U.fmt(t.power)+'</b></div>';
  body += '<div class="kv"><span>可戴格位</span><b>'+sl.map(function(k){ return D.EQK[k].n; }).join('、')+'</b></div>';
  body += '<div class="kv"><span>当前去处</span><b>'+(use ? (use.where === 'equip' ? '随身 · '+use.n : '阵中 · '+use.n) : '<span class="tag mute">闲置</span>')+'</b></div>';
  if (t.src && SRC[t.src]) body += '<div class="kv"><span>来历</span><b>'+SRC[t.src]+'</b></div>';
  body += '<div class="hr"></div>' + UI.affixHtml(t);
  body += '<div class="hr"></div><div class="sub">操作</div>';
  body += '<div class="btnrow">';
  sl.forEach(function(k){
    var cur = (G.equip[k] === id);
    body += '<button class="'+(cur ? '' : 'primary')+'" data-act="eqDirect" data-arg="'+k+':'+id+'" '+(cur ? 'disabled' : '')+'>'+(cur ? '已戴·'+D.EQK[k].n : '戴于'+D.EQK[k].n)+'</button>';
  });
  body += '</div><div class="btnrow">';
  body += '<button data-act="embed" data-arg="'+id+'">嵌入最佳阵眼</button>';
  var rc = G.reforgeCost(t);
  body += '<button data-act="reforge" data-arg="'+id+'">重铸词条（'+U.fmt(rc.spirit)+' 灵石 + '+rc.ore+' '+D.ROOT[t.el].n+'矿）</button>';
  body += '<button data-act="refine" data-arg="'+id+'">精炼</button>';
  body += '<button data-act="lock" data-arg="'+id+'">'+(t.lock ? '解锁' : '锁定')+'</button>';
  body += '<button class="danger" data-act="sell" data-arg="'+id+'">售出</button>';
  body += '</div>';
  UI.modal({ title: '法宝详情', ok: '关闭', body: body });
};

UI.detailTech = function(id){
  var t = D.TK[id]; if (!t) return;
  var lv = G.techs[id] || 0;
  var eq = G.isTechEquipped(id);
  var cost = G.techUpCost(id);
  var st = G.techState(t);
  var body = '';
  body += '<p style="text-align:center;font-size:19px;color:#e7d3a2;letter-spacing:2px;margin:2px 0 6px">'+t.n+'</p>';
  body += '<p style="text-align:center">' +
    (t.kind === 'active' ? '<span class="tag cinn">主动术法</span>' : '<span class="tag jade">被动心法</span>') +
    ' <span class="tag" style="border-color:'+D.ROOT[t.el === 'any' ? 'tu' : t.el].c+';color:'+D.ROOT[t.el === 'any' ? 'tu' : t.el].c+'">'+(t.el === 'any' ? '通用' : D.ROOT[t.el].n+'属')+'</span>' +
    (t.sp ? ' <span class="tag purple">秘传</span>' : '') + '</p>';
  body += '<div class="hr"></div>';
  body += '<div class="kv"><span>参悟等级</span><b class="val">'+lv+' / '+D.TECH_LVMAX+'</b></div>';
  if (t.kind === 'active') body += '<div class="kv"><span>威力 / 冷却</span><b>'+(t.pow * (1 + Math.max(0,lv-1)*0.14)).toFixed(2)+'× / '+t.cd+' 回合</b></div>';
  if (t.el !== 'any') body += '<div class="kv"><span>参悟门槛</span><b>'+D.ROOT[t.el].n+'灵根 '+t.req+'%（现 '+Math.round(G.roots[t.el]||0)+'%）</b></div>';
  if (t.sp) body += '<div class="kv"><span>境界门槛</span><b>'+D.nodeName(G.TECH_SEAL_NODE)+' 以上</b></div>';
  body += '<div class="kv"><span>状态</span><b>' + (eq ? '<span class="tag jade">已装备</span>' : (lv > 0 ? '<span class="tag gold">未装备 · 被动仅 25% 生效</span>' : '<span class="tag mute">未参悟</span>')) + '</b></div>';
  body += '<div class="hr"></div><div class="sub">'+t.desc+'</div>';
  var eff = [];
  for (var k in (t.eff||{})){
    var nm = {atk:'攻击',def:'防御',hp:'气血',spd:'速度',crit:'暴击',cdmg:'暴伤',cult:'修炼',heal:'回复',dodge:'闪避',all:'全属性',heart:'道心'}[k]||k;
    var lvm = 1 + Math.max(0, lv-1) * 0.12;
    eff.push('<div class="kv"><span>'+nm+'</span><b class="val">+'+ (t.eff[k] < 1 ? (t.eff[k]*lvm*100).toFixed(1)+'%' : (t.eff[k]*lvm).toFixed(0)) + (lv ? '' : ' <span class="tag mute">（当前未参悟，不生效）</span>') + '</b></div>');
  }
  body += eff.join('') || '<div class="sub">无直接属性加成</div>';
  if (lv > 0 && lv < D.TECH_LVMAX) body += '<div class="sub">下一级效果 +12%</div>';
  body += '<div class="hr"></div>';
  if (G.skills.active.indexOf(id) >= 0 || G.skills.passive.indexOf(id) >= 0){
    body += '<div class="btnrow"><button class="primary" data-act="unequipTech" data-arg="'+id+'">卸下功法栏</button>';
  } else {
    body += '<div class="btnrow"><button class="primary" data-act="equipTech" data-arg="'+id+'" '+(lv ? '' : 'disabled')+'>装入功法栏</button>';
  }
  if (st !== 'max'){
    var afford = G.shards >= cost;
    body += '<button data-act="learn" data-arg="'+id+'" '+(afford ? '' : 'disabled')+'>'+(lv ? '精进' : '参悟')+'（'+cost+' 碎片）</button>';
  } else {
    body += '<span class="tag gold">已至圆满</span>';
  }
  body += '<button data-act="tab" data-arg="character">去功法栏</button></div>';
  UI.modal({ title: '功法详情', ok: '关闭', body: body });
};

UI.detailMat = function(kind, key){
  var m = (kind === 'herb') ? D.HK[key] : D.OK[key];
  if (!m){ UI.closeModal(); return; }
  var mk = G.matAffix(key);
  var n = G.itemCount(kind, key);
  var body = '';
  body += '<p style="text-align:center;font-size:19px;color:#e7d3a2;letter-spacing:2px;margin:2px 0 6px">'+m.n+'</p>';
  body += '<p style="text-align:center"><span class="tag" style="border-color:'+D.ROOT[m.el].c+';color:'+D.ROOT[m.el].c+'">'+D.ROOT[m.el].n+'属</span> <span class="tag gold">'+m.t+' 阶</span> <span class="tag mute">持有 ×'+n+'</span></p>';
  body += '<div class="hr"></div>';
  if (kind === 'herb'){
    body += '<div class="kv"><span>药性</span><b class="val">'+D.PILLS[m.pill].n+'</b></div>';
    body += '<div class="kv"><span>药性说明</span><b>'+D.PILLS[m.pill].desc+'</b></div>';
    body += '<div class="kv"><span>年份范围</span><b>'+m.y[0]+' ~ '+m.y[1]+' 年</b></div>';
    body += '<div class="sub" style="margin-top:5px">炼丹时放入「君」槽决定丹药类型；放入臣/佐/使则按五行生克决定药力。</div>';
  } else {
    body += '<div class="kv"><span>用途</span><b>器坊炼器 / 精炼法宝</b></div>';
    body += '<div class="sub" style="margin-top:5px">炼器时：主料定属性、辅料定形制、引材定词条倾向。</div>';
  }
  body += '<div class="hr"></div><div class="sub">灵材烙印</div>';
  if (mk.length){
    mk.forEach(function(k){
      var a = D.AFK[k]; if (!a) return;
      var lo = D.rollMatAffix(k, m.t, 1), hi = D.rollMatAffix(k, m.t, 2.2);
      body += '<div class="kv"><span><span class="tag purple">'+a.n+'</span>　'+a.desc+'</span><b>' +
        (a.fmt === 'flat' ? ('+'+U.fmt(lo)+' ~ +'+U.fmt(hi)) : ('+'+U.pct(lo,1)+' ~ +'+U.pct(hi,1))) + '</b></div>';
    });
    body += '<div class="sub">炼器时按概率继承到成品上（不占天生词条名额），<b class="val">数值在炼成那一刻现算</b>——同一块料每次结果都不同。</div>';
  } else {
    body += '<div class="sub">此料无烙印（1 阶材料约一半无烙印）。阶位越高越可能带烙印。</div>';
  }
  body += '<div class="btnrow"><button data-act="tab" data-arg="'+(kind === 'herb' ? 'alchemy' : 'forge')+'">去'+(kind === 'herb' ? '丹房' : '器坊')+'</button></div>';
  UI.modal({ title: kind === 'herb' ? '灵草详情' : '矿石详情', ok: '关闭', body: body });
};

UI.detailPill = function(id){
  var p = null, preset = null;
  for (var i=0;i<G.customPills.length;i++) if (G.customPills[i].id === id) p = G.customPills[i];
  if (!p) preset = D.PILL_PRESET[id];
  if (!p && !preset){ UI.closeModal(); return; }
  var body = '';
  if (p){
    body += '<p style="text-align:center;font-size:19px;color:#e7d3a2;letter-spacing:2px;margin:2px 0 6px">'+p.name+'</p>';
    body += '<p style="text-align:center"><span class="tag gold">'+D.PILL_QNAME[p.q]+'</span> <span class="tag" style="border-color:'+D.ROOT[p.el].c+';color:'+D.ROOT[p.el].c+'">'+D.ROOT[p.el].n+'属</span></p>';
    body += '<div class="hr"></div>';
    body += '<div class="kv"><span>药性</span><b class="val">'+D.PILLS[p.kind].n+'</b></div>';
    body += '<div class="kv"><span>药力</span><b>'+p.power.toFixed(2)+'</b></div>';
    body += '<div class="kv"><span>君药年份</span><b>'+p.year+' 年</b></div>';
    body += '<div class="hr"></div><div class="sub">'+D.PILLS[p.kind].desc+'</div>';
    if (p.kind === 'qi') body += '<div class="kv"><span>服用可获修为</span><b class="val">约当层 '+(10 + 8*p.q)+'%</b></div>';
    body += '<div class="btnrow"><button class="primary" data-act="usePill" data-arg="'+p.id+'">服用</button></div>';
  } else {
    body += '<p style="text-align:center;font-size:19px;color:#e7d3a2;margin:2px 0 6px">'+preset.n+'</p>';
    body += '<div class="hr"></div><div class="kv"><span>效果</span><b class="val">'+preset.desc+'</b></div>';
    body += '<div class="kv"><span>持有</span><b>'+G.itemCount('pill', id)+' 枚</b></div>';
    body += '<div class="btnrow"><button class="primary" data-act="usePresetPill" data-arg="'+id+'">服用</button></div>';
  }
  UI.modal({ title: '丹药详情', ok: '关闭', body: body });
};

UI.openAssign = function(id){  UI.st.pendingModal = id;
  var choices = [{ t:'闲置（自行修炼）', d:'缓慢提升自身境界', on: function(){ G.assignDisciple(id, null); UI.renderAll(); } }];
  D.BUILDINGS.forEach(function(b){
    if (!G.buildingLv(b.k)) return;
    choices.push({ t:'派驻 '+b.n, d:'提升'+b.n+'产出 18%', on: function(){ G.assignDisciple(id, b.k); UI.renderAll(); } });
  });
  UI.modal({ title:'安排弟子', sub:'人各有其位', choices:choices, ok:'取消' });
};
UI.openRebirth = function(){
  var pv = G.rebirthPreview();
  UI.modal({
    title: '轮回',
    sub: '一世浮沉，皆为道粮',
    body: '<div class="kv"><span>当前境界</span><b>'+D.nodeName(G.node)+'</b></div>' +
          '<div class="kv"><span>可得轮回点</span><b class="val">'+pv.points+'</b></div>' +
          '<div class="kv"><span>现有轮回点</span><b class="val">'+G.rebirth.points+'（已转世 '+G.rebirth.count+' 次）</b></div>' +
          '<div class="hr"></div>' +
          '<div class="kv"><span>保留法宝</span><b>'+pv.keepTreasure+' 件</b></div>' +
          '<div class="kv"><span>继承灵石</span><b>'+U.fmt(pv.keepSpirit)+'</b></div>' +
          '<div class="kv"><span>保留灵根纯度</span><b>'+pv.keepPurity+'%</b></div>' +
          '<div class="kv"><span>开局境界</span><b>'+D.nodeName(pv.startNode)+'</b></div>' +
          '<div class="hr"></div>' +
          '<p class="sub">轮回后：境界、修为、灵石、宗门、灵草矿石、法宝阵位全部归零；<br>功法参悟、星盘、图鉴与统计永久保留。世界难度略增，收获亦更丰。</p>',
    cancel: '再等等',
    ok: '转世重修',
    onOk: function(){ G.doRebirth(false); }
  });
};
UI.confirmReset = function(){
  UI.modal({
    title: '重置一切',
    sub: '慎之，慎之',
    body: '<p>此举将<b class="neg">清空全部进度</b>——包括轮回星盘、功法参悟与图鉴。</p><p class="sub">若只是想重开一世，请使用「轮回」。</p>',
    cancel: '取消',
    ok: '确认清空',
    onOk: function(){
      G.hardReset();
      UI.renderAll();
      U.toast('一切归零');
      setTimeout(function(){ if (!G.branch[0]) UI.openBranchModal(0); }, 420);
    }
  });
};
UI.exportSave = function(){
  var s = JSON.stringify(G.serialize());
  var b64 = btoa(unescape(encodeURIComponent(s)));
  UI.modal({
    title:'导出存档',
    sub:'复制下方文本妥善保管',
    body:'<textarea style="width:100%;height:150px;background:#0b0d0a;color:#b9b09a;border:1px solid rgba(201,168,106,.3);border-radius:6px;font-size:11px">'+b64+'</textarea>',
    ok:'关闭'
  });
};
UI.importSave = function(){
  UI.modal({
    title:'导入存档',
    sub:'粘贴存档文本',
    body:'<textarea id="impbox" style="width:100%;height:130px;background:#0b0d0a;color:#b9b09a;border:1px solid rgba(201,168,106,.3);border-radius:6px;font-size:11px"></textarea>',
    cancel:'取消', ok:'导入',
    onOk: function(){
      var v = U.$('#impbox'); v = v ? v.value.trim() : '';
      if (!v) return;
      try{
        var s = decodeURIComponent(escape(atob(v)));
        var d = JSON.parse(s);
        for (var k in d) G[k] = d[k];
        G.recalc(); G.syncUnlock(); UI.renderAll();
        U.toast('导入成功');
      }catch(e){ U.toast('存档格式有误'); }
    }
  });
};
/* 强制刷新：带时间戳重新请求，绕开一切缓存 */
UI.hardRefresh = function(){
  try{
    var p = location.pathname + '?r=' + Date.now();
    location.href = p;
  }catch(e){ location.reload(); }
};

UI.showGuide = function(){  UI.modal({
    title:'修行指引',
    body:'<p><b class="val">一、打坐</b>　修为自动增长，满了即可突破。突破大境界时须择一条「道途分支」。</p>' +
         '<p><b class="val">二、灵根</b>　你身上九种灵根会随行为<b>永久演化</b>——用火系功法、吃火属丹药、把火属法宝嵌进阵眼，火灵根纯度都会涨。相生双灵根齐齐过 80% 会<b>共鸣</b>；相克双灵根齐齐过高会<b>冲突</b>，削你修炼速度。</p>' +
         '<p><b class="val">三、灵阵</b>　十二个阵眼各有五行归属。法宝与阵眼同属 → ×1.28；相生 → ×1.12；相克 → ×0.78。相邻阵眼之间还有阵势加成，值得慢慢推敲。</p>' +
         '<p><b class="val">四、丹器阵</b>　炼丹讲君臣佐使，炼器讲五行与火候，阵法要算九宫与天干之生克。三者都能反哺修行。</p>' +
         '<p><b class="val">五、轮回</b>　修至瓶颈便可转世，结算「轮回点」点亮星盘，获得永久加成。</p>',
    ok:'明白了'
  });
};
})();
