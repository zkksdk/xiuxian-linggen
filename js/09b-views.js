/* ===========================================================
   09b-views.js  —  各标签页视图
   =========================================================== */
(function(){
var U = XX.U, D = XX.D, G = XX.G, UI = XX.UI;

/* =====================  修炼  ===================== */
UI.view_cultivate = function(){
  var need = G.stepCost();
  var prog = U.clamp(G.qi/need, 0, 1);
  var can = G.qi >= need;
  var pend = (G.pendingBranch !== null) ? 'branch' : (G.pendingTrib !== null ? 'trib' : null);
  var h = '';

  /* ---------- 打坐 ---------- */
  var eta = pend === 'branch' ? '<b class="val">道途未择——点下方「择路」</b>'
          : pend === 'trib'   ? '<b class="neg">天劫将至——点下方「渡劫」</b>'
          : (can ? '<b class="val">修为已足，可以突破。</b>'
                 : '约需 ' + U.fmtTimeShort((need-G.qi)/Math.max(0.001,G.qiRate())) + ' 可满。');
  h += '<div class="card"><h3>打坐 <small>'+D.nodeName(G.node)+'</small></h3>';
  h += '<div class="medit"><div class="halo"><div class="ring"></div><div class="ring2"></div><div class="core"></div></div>' +
       '<div class="info">' +
       '<div class="bar gold"><i id="cbar" style="width:'+(prog*100)+'%"></i></div>' +
       '<div class="bar-txt"><span id="ctxt">'+U.fmt(G.qi)+' / '+U.fmt(need)+'</span><span id="crate">+'+U.fmt(G.qiRate())+' / 秒</span></div>' +
       '<div class="sub" style="margin-top:4px" id="ceta">' + eta + '</div>' +
       '</div></div>';
  h += '<div class="btnrow">' +
       '<button class="primary" id="btnBreak" data-act="break" ' + ((can||pend)?'':'disabled') + '>' +
       (pend==='branch' ? '择 路' : pend==='trib' ? '渡 劫' : '突 破') + '</button>' +
       '</div>';
  h += '<div class="btnrow">' +
       '<button data-act="speedup">加速修炼 ×'+G.speedUpMult()+'（'+U.fmt(G.speedUpCost())+' 灵石 / '+Math.round(G.speedUpDur()/60)+'分钟）</button>' +
       '<button data-act="guide">修行指引</button>' +
       '</div>';
  h += '<div class="sub" style="margin-top:6px">自动突破：'+(G.auto.break?'开':'关')+'　·　灵石 '+U.fmt(G.spirit)+'</div>';
  h += '</div>';

  /* ---------- 当前指引：现在最该做的事 ---------- */
  var goals = G.goals();
  if (goals.length){
    h += '<div class="card tight"><h3>当前指引 <small>不知做什么就看这里</small></h3>';
    var g0 = goals[0];
    h += '<div class="goal-top" data-act="goalGo" data-arg="0">' +
      '<div class="gt">' + g0.t + '<span class="go">前往 ›</span></div>' +
      '<div class="gd">' + g0.d + '</div></div>';
    for (var gi = 1; gi < Math.min(goals.length, 4); gi++){
      var g = goals[gi];
      h += '<div class="goal-row" data-act="goalGo" data-arg="' + gi + '">' +
        '<span class="gn">' + g.t + '</span><span class="gd2">' + g.d + '</span></div>';
    }
    h += '</div>';
  }

  /* ---------- 道途（合并劫兆） ---------- */
  var nextNode = G.node + 1;
  var nri = Math.floor(nextNode / 3);
  var isMax = G.node >= D.MAXNODE;
  var willBranch = !isMax && (nextNode % 3 === 0) && D.REALMS[nri] && D.REALMS[nri].br && !G.branch[nri];
  var willTrib   = !isMax && (nextNode % 3 === 0) && G.needTrib(nri) && !G.flags['trib_'+nri];
  h += '<div class="card tight"><h3>道途 <small>'+(isMax ? '已至渡劫后期' : '下一境 '+D.nodeName(nextNode))+'</small></h3>';
  if (!isMax){
    var note = willBranch ? '<span class="tag cyan">踏入时需择路</span>'
             : (willTrib ? '<span class="tag cinn">踏入时降天劫</span>' : '');
    h += '<div class="kv"><span>下一境</span><b class="val">'+D.nodeName(nextNode)+'　'+note+'</b></div>';
  }
  if (willTrib){
    var tn = G.tribName(nri), tc = G.tribChance(nri);
    h += '<div class="kv"><span>劫名</span><b class="val">'+tn+'</b></div>';
    h += '<div class="kv"><span>预估生还</span><b class="'+(tc>0.6?'pos':'neg')+'">'+U.pct(tc,0)+'</b></div>';
  }
  var brs = [];
  for (var rk in G.branch){
    var bv = G.branch[rk];
    if (bv && brs.indexOf(bv) < 0) brs.push(bv);
  }
  h += '<div class="kv small"><span>已择分支</span><b>'+(brs.length ? brs.join(' · ') : '尚无')+'</b></div>';
  if (G.jindan) h += '<div class="kv small"><span>金丹品级</span><b>'+D.jindanName(G.jindan)+'</b></div>';
  h += '</div>';

  /* ---------- 立道 ---------- */
  if (!G.dao){
    h += '<div class="card tight"><h3>立道</h3>' +
      '<p class="sub">修行之初须先明心——你欲以何证道？此择影响一生。</p>' +
      '<div class="btnrow">' +
      '<button data-act="dao" data-arg="qing">有情道（宗门/回复强）</button>' +
      '<button data-act="dao" data-arg="wu">无情道（修炼快/突破稳）</button>' +
      '</div></div>';
  }

  /* ---------- 功法 ---------- */
  h += UI.techPanelHtml();
  return h;
};

/* 功法面板：状态 / 类型 / 属性 三重筛选 + 一键参悟 */
UI.techPanelHtml = function(){
  var F = UI.techF || (UI.techF = { kind:'all', el:'all', state:'all' });
  var learnedN = Object.keys(G.techs).length;
  var h = '';

  h += '<div class="card"><h3>功法 <small>已悟 '+learnedN+' / '+D.TECHS.length+'　·　碎片 <span class="val">'+G.shards+'</span></small></h3>';
  var sl = G.skillSlots();
  h += '<div class="sub">功法栏：主动 <b class="val">'+G.skills.active.length+'/'+sl.active+'</b>　被动 <b class="val">'+G.skills.passive.length+'/'+sl.passive+'</b>' +
       '<br>已装备的被动全额生效，未装备只按 25%；主动术法必须装备才能带入战斗。</div>';
  h += '<div class="btnrow" style="margin:5px 0 2px">' +
       '<button class="primary" data-act="techAuto">一键参悟</button>' +
       '<button data-act="autoEquipTech">自动配装</button>' +
       '<button data-act="tab" data-arg="character">功法栏</button>' +
       '</div>';

  function chip(group, val, on, label, n, color){
    var st = (color && !on) ? ' style="border-color:'+color+';color:'+color+'"' : '';
    return '<span class="chip'+(on?' on':'')+'"'+st+' data-act="techFilter" data-arg="'+group+':'+val+'">' +
           label + (n!==undefined ? '<span class="n">'+n+'</span>' : '') + '</span>';
  }
  // 只统计「当前属性筛选下」的数量，避免数字互相打架
  function cntBy(fn){
    var n = 0;
    D.TECHS.forEach(function(t){
      if (F.el !== 'all'){
        if (F.el === 'any'){ if (t.el !== 'any') return; }
        else if (t.el !== F.el) return;
      }
      if (fn(t)) n++;
    });
    return n;
  }
  h += '<div class="chipbar"><span class="lbl">状态</span>' +
    chip('state','all','all'===F.state,'全部',D.TECHS.length) +
    chip('state','got','got'===F.state,'已参悟',cntBy(function(t){return (G.techs[t.id]||0)>0;})) +
    chip('state','can','can'===F.state,'可参悟',cntBy(function(t){return (G.techs[t.id]||0)===0 && G.techState(t)!=='lock' && G.techState(t)!=='seal';})) +
    chip('state','lock','lock'===F.state,'未解锁',cntBy(function(t){var s=G.techState(t);return s==='lock'||s==='seal';})) +
    '</div>';
  h += '<div class="chipbar"><span class="lbl">类型</span>' +
    chip('kind','all','all'===F.kind,'全部') +
    chip('kind','active','active'===F.kind,'主动') +
    chip('kind','passive','passive'===F.kind,'被动') +
    chip('kind','sp','sp'===F.kind,'秘传') +
    '</div>';
  h += '<div class="chipbar compact"><span class="lbl">属性</span>' +
    chip('el','all','all'===F.el,'全') +
    chip('el','any','any'===F.el,'通');
  D.ROOTS.forEach(function(r){
    h += chip('el', r.k, F.el===r.k, r.n, undefined, r.c);
  });
  h += '</div>';

  /* 列表 */
  var list = D.TECHS.filter(function(t){
    var lv = G.techs[t.id] || 0;
    var st = G.techState(t);
    if (F.kind === 'active'  && t.kind !== 'active') return false;
    if (F.kind === 'passive' && t.kind !== 'passive') return false;
    if (F.kind === 'sp'      && !t.sp) return false;
    if (F.el !== 'all'){
      if (F.el === 'any'){ if (t.el !== 'any') return false; }
      else if (t.el !== F.el) return false;
    }
    if (F.state === 'got'  && lv === 0) return false;
    if (F.state === 'can'  && !(lv === 0 && (st === 'can' || st === 'poor'))) return false;
    if (F.state === 'lock' && !(st === 'lock' || st === 'seal')) return false;
    return true;
  });
  var rank = { can:0, poor:1, lock:2, seal:2, lv:3, max:4 };
  function rk(t){ var r = rank[G.techState(t)]; return r === undefined ? 9 : r; }
  list.sort(function(a,b){
    var la = G.techs[a.id]||0, lb = G.techs[b.id]||0;
    var ga = la > 0 ? 0 : 1, gb = lb > 0 ? 0 : 1;
    if (ga !== gb) return ga - gb;                 // 已参悟优先
    if (ga === 0) return lb - la;                  // 已参悟内部按等级降序
    var ra = rk(a), rb = rk(b);
    if (ra !== rb) return ra - rb;                 // 可参悟 → 碎片不足 → 未解锁
    return D.RK.indexOf(a.el) - D.RK.indexOf(b.el);
  });

  if (!list.length){
    h += '<div class="empty">此筛选下没有功法</div>';
  }
  list.forEach(function(t){
    var lv = G.techs[t.id] || 0;
    var st = G.techState(t);
    var elN = (t.el === 'any') ? '通用' : D.ROOT[t.el].n;
    var elC = (t.el === 'any') ? '#c9a86a' : D.ROOT[t.el].c;
    var eff = [];
    for (var k in (t.eff||{})){
      var nm = {atk:'攻击',def:'防御',hp:'气血',spd:'速度',crit:'暴击',cdmg:'暴伤',cult:'修炼',heal:'回复',dodge:'闪避',all:'全属性',heart:'道心'}[k]||k;
      eff.push(nm+' +'+Math.round(t.eff[k]*100)+'%');
    }
    var dots = '';
    for (var i=1;i<=D.TECH_LVMAX;i++) dots += '<i class="'+(i<=lv?'f':'')+'"></i>';
    var cost = G.techUpCost(t.id);
    var afford = G.shards >= cost;
    h += '<div class="tech-row'+(lv>0?' got':'')+((st==='lock'||st==='seal')?' lock':'')+'">' +
      '<div class="tm" data-act="detail" data-arg="tech:'+t.id+'">' +
        '<div class="tn">'+t.n +
          ' <span class="tag" style="border-color:'+elC+';color:'+elC+'">'+elN+'</span>' +
          (t.kind === 'active' ? '<span class="tag cinn">主动 '+t.pow.toFixed(2)+'×</span>' : '<span class="tag jade">被动</span>') +
          (t.sp ? '<span class="tag purple">秘传</span>' : '') +
          (lv > 0 ? '<span class="lvbar">'+dots+'</span>' : '') +
        '</div>' +
        '<div class="te">'+(t.desc || '被动增益，常驻生效') + (eff.length ? '　' + eff.join('　') : '') +
          (st === 'lock' ? '　<span class="tag mute">需 '+elN+'灵根 '+t.req+'%</span>' : '') +
          (st === 'seal' ? '　<span class="tag mute">需 '+D.nodeName(G.TECH_SEAL_NODE)+' 以上</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="tb">';
    if (lv > 0){
      var eq = G.isTechEquipped(t.id);
      h += '<button class="sm" data-act="'+(eq?'unequipTech':'equipTech')+'" data-arg="'+t.id+'">'+(eq?'已装备':'装备')+'</button>';
    }
    if (st === 'max') h += '<span class="tag gold">圆满</span>';
    else h += '<button class="'+(lv?'':'primary')+'" data-act="learn" data-arg="'+t.id+'" '+(afford?'':'disabled')+'>' +
              (lv ? '精进' : '参悟') + ' ' + cost + '碎</button>';
    h += '</div></div>';
  });
  h += '</div>';
  return h;
};

/* =====================  人物（装备栏 + 功法栏）  ===================== */
UI.view_character = function(){
  var ed = G.equipDetail();
  var sl = G.skillSlots();
  var h = '';

  /* --- 装备栏 --- */
  h += '<div class="card"><h3>装备栏 <small>装备灵力 '+U.fmt(ed.P)+'　·　'+ed.count+' / '+D.EQ_SLOTS.length+'</small></h3>';
  h += '<div class="eqgrid">';
  D.EQ_SLOTS.forEach(function(s){
    var tid = G.equip ? G.equip[s.k] : null;
    var t = tid ? G.treasureById(tid) : null;
    var fit = t && t.el === s.el;
    h += '<div class="eqcell'+(t?' full':'')+(fit?' fit':'')+'" data-act="eqItem" data-arg="'+s.k+'">' +
      '<div class="en">'+s.n+'</div>' +
      (t
        ? '<div class="et" style="color:'+D.ROOT[t.el].c+'">'+t.name+'</div><div class="eg">'+(t.typeN||'')+' '+D.gradeName(t.g,t.s)+'</div>'
        : '<div class="et" style="opacity:.55;color:'+D.ROOT[s.el].c+'">'+D.ROOT[s.el].n+'属</div><div class="eg">空</div>') +
      '</div>';
  });
  h += '</div>';
  h += '<div class="sub" style="margin-top:6px">点击格子更换。<b class="val">属性契合</b>（法宝与格位同属）→ 灵力 ×1.25、对口词条 ×1.15；' +
       '每格另有对口词条加成（兵器×1.55、护身×1.65…）。</div>';
  h += '</div>';

  if (ed.rows.length){
    h += '<div class="card"><h3>已佩戴</h3>';
    ed.rows.forEach(function(r){
      h += '<div class="tech-row got"><div class="tm">' +
        '<div class="tn">'+r.t.name +
          ' <span class="tag" style="border-color:'+D.ROOT[r.t.el].c+';color:'+D.ROOT[r.t.el].c+'">'+D.ROOT[r.t.el].n+'</span>' +
          ' <span class="tag cyan">'+(r.t.typeN||'法宝')+'</span>' +
          ' <span class="tag gold">'+D.gradeName(r.t.g,r.t.s)+'</span>' +
          ' <span class="tag">'+r.slot.n+'</span>' +
          (r.fit ? '<span class="tag jade">契合</span>' : '') +
        '</div>' +
        '<div class="te">灵力 '+U.fmt(r.p)+'　' + (r.detail.length ? r.detail.join('　') : '（无可用词条）') +
          (D.treasureSlots(r.t).length > 1 ? '　<span class="tag mute">可戴：'+D.treasureSlots(r.t).map(function(x){return D.EQK[x].n;}).join('、')+'</span>' : '') +
        '</div>' +
        '</div><div class="tb"><button class="sm" data-act="unequipItem" data-arg="'+r.slot.k+'">卸下</button></div></div>';
    });
    h += '</div>';
  }

  /* --- 功法栏 --- */
  h += '<div class="card"><h3>功法栏 <small>主动 '+G.skills.active.length+'/'+sl.active+'　·　被动 '+G.skills.passive.length+'/'+sl.passive+'</small></h3>';
  h += '<div class="btnrow" style="margin:0 0 6px">' +
       '<button data-act="autoEquipTech">自动配装</button>' +
       '<button data-act="tab" data-arg="cultivate">去参悟功法</button>' +
       '</div>';
  h += '<div class="sub">已装备的<b class="val">被动</b>全额生效；未装备的只按 25% 生效。<br>' +
       '已装备的<b class="val">主动</b>术法才能带入战斗，未装备无法施展。<br>' +
       '<span class="tag mute">每 '+D.TECH_SLOT_GAIN+' 个境界节点多解锁 1 个主动槽与 1 个被动槽</span></div>';
  ['active','passive'].forEach(function(k){
    var arr = G.skills[k] || [];
    h += '<div class="hr"></div><div class="sub">'+(k === 'active' ? '主动术法（战斗技能）' : '被动心法（常驻增益）')+'</div>';
    arr.forEach(function(id){
      var t = D.TK[id]; if (!t) return;
      var lv = G.techs[id] || 1;
      var eff = [];
      for (var kk in (t.eff||{})){
        var nm = {atk:'攻击',def:'防御',hp:'气血',spd:'速度',crit:'暴击',cdmg:'暴伤',cult:'修炼',heal:'回复',dodge:'闪避',all:'全属性',heart:'道心'}[kk]||kk;
        eff.push(nm+' +'+Math.round(t.eff[kk]*100)+'%');
      }
      h += '<div class="tech-row got"><div class="tm">' +
        '<div class="tn">'+t.n +
          ' <span class="tag" style="border-color:'+D.ROOT[t.el==='any'?'tu':t.el].c+'">'+(t.el==='any'?'通用':D.ROOT[t.el].n)+'</span>' +
          (t.kind === 'active' ? '<span class="tag cinn">主动 '+t.pow.toFixed(2)+'×</span>' : '<span class="tag jade">被动</span>') +
          '<span class="tag gold">参悟 '+lv+' 级</span>' +
        '</div>' +
        '<div class="te">'+(t.desc || '被动增益')+ (eff.length ? '　'+eff.join('　') : '') + '</div>' +
        '</div><div class="tb"><button class="sm" data-act="unequipTech" data-arg="'+id+'">卸下</button></div></div>';
    });
    var free = sl[k] - arr.length;
    if (free > 0){
      h += '<div class="tech-row" style="opacity:.42;border-style:dashed">' +
        '<div class="tm"><div class="tn" style="color:#6f6a5c">空槽 × '+free+'</div>' +
        '<div class="te">'+(k === 'active' ? '装备主动术法后可于战斗中施展' : '装备被动心法可全额生效')+'</div></div></div>';
    }
  });
  h += '</div>';

  /* --- 装备带来的加成明细 --- */
  var rows = [];
  var NAMES = { atk:'攻击', def:'防御', hp:'气血', spd:'速度', crit:'暴击', cdmg:'暴伤', dodge:'闪避',
                cult:'修炼', heal:'回复', alch:'炼丹', forg:'炼器', form:'阵法', sect:'宗门产出',
                luck:'机缘', all:'全属性', heart:'道心', karma:'因果', herb:'灵草' };
  for (var k2 in ed.add){
    if (!ed.add[k2] || Math.abs(ed.add[k2]) < 0.0001) continue;
    rows.push('<div class="kv"><span>'+(NAMES[k2]||k2)+'</span><b class="'+(ed.add[k2]>=0?'pos':'neg')+'">' +
              (ed.add[k2] >= 0 ? '+' : '') + U.pct(ed.add[k2], 1) + '</b></div>');
  }
  h += '<div class="card tight"><h3>装备加成</h3>';
  h += rows.length ? '<div class="statgrid">' + rows.join('') + '</div>' : '<div class="empty">尚未佩戴任何法宝</div>';
  h += '</div>';
  return h;
};

/* =====================  背包  ===================== */
UI.view_bag = function(){
  var F = UI.st.bagTab || 'treasure';
  var h = '';
  var counts = {
    treasure: G.treasures.length,
    herb: Object.keys(G.bag.herb).length,
    ore: Object.keys(G.bag.ore).length,
    pill: G.customPills.length + Object.keys(G.bag.pill).filter(function(k){ return G.bag.pill[k] > 0; }).length
  };
  h += '<div class="chipbar">' +
    '<span class="chip'+(F==='treasure'?' on':'')+'" data-act="bagTab" data-arg="treasure">法宝<span class="n">'+counts.treasure+'</span></span>' +
    '<span class="chip'+(F==='herb'?' on':'')+'" data-act="bagTab" data-arg="herb">灵草<span class="n">'+counts.herb+'</span></span>' +
    '<span class="chip'+(F==='ore'?' on':'')+'" data-act="bagTab" data-arg="ore">矿石<span class="n">'+counts.ore+'</span></span>' +
    '<span class="chip'+(F==='pill'?' on':'')+'" data-act="bagTab" data-arg="pill">丹药<span class="n">'+counts.pill+'</span></span>' +
    '</div>';

  if (F === 'treasure') return h + UI.bagTreasureHtml();
  if (F === 'herb') return h + UI.bagHerbHtml();
  if (F === 'ore') return h + UI.bagOreHtml();
  return h + UI.bagPillHtml();
};

UI.bagTreasureHtml = function(){
  var h = '<div class="card"><h3>法宝 <small>共 '+G.treasures.length+' 件</small></h3>';
  var usedN = 0, idleN = 0;
  var list = G.treasures.slice().sort(function(a,b){ return b.power - a.power; });
  list.forEach(function(t){ if (G.treasureUse(t.id)) usedN++; else idleN++; });
  h += '<div class="kv"><span>已用（随身 / 阵中）</span><b>'+usedN+' 件</b></div>';
  h += '<div class="kv"><span>闲置</span><b class="val">'+idleN+' 件</b></div>';
  if (idleN >= 3) h += '<div class="btnrow" style="margin-top:5px"><button data-act="sellUnused">出售闲置（保留最强的 2 件与锁定件）</button></div>';
  h += '</div>';
  if (!list.length) return h + '<div class="card"><div class="empty">空空如也——去器坊炼制，或探索寻宝</div></div>';

  h += '<div class="card">';
  list.slice(0, 60).forEach(function(t){
    var u = G.treasureUse(t.id);
    var useTag = !u ? '<span class="tag mute">闲置</span>'
      : (u.where === 'equip' ? '<span class="tag jade">随身 · '+u.n+'</span>' : '<span class="tag cyan">阵中 · '+u.n+'</span>');
    h += '<div class="tech-row'+(u?' got':'')+'" data-act="detail" data-arg="tre:'+t.id+'"><div class="tm">' +
      '<div class="tn">'+t.name +
        ' <span class="tag" style="border-color:'+D.ROOT[t.el].c+';color:'+D.ROOT[t.el].c+'">'+D.ROOT[t.el].n+'</span>' +
        ' <span class="tag cyan">'+(t.typeN||'法宝')+'</span>' +
        ' <span class="tag gold">'+D.gradeName(t.g,t.s)+'</span>' + useTag +
        (t.lock ? '<span class="tag cinn">锁定</span>' : '') + '</div>' +
      '<div class="te">灵力 '+U.fmt(t.power)+'　' +
        t.affixes.map(function(a){
          if (a.sp) return '<span class="tag purple">'+a.n+'</span> '+D.affixDesc(a);
          var s = a.n+' '+(a.fmt==='flat'?a.v:'+'+U.pct(a.v,0));
          return a.infuse ? '<span class="tag purple">'+s+'</span>' : s;
        }).join('　') +
        '　<span class="tag mute">可戴：'+D.treasureSlots(t).map(function(x){return D.EQK[x].n;}).join('、')+'</span>' +
      '</div></div><div class="tb">' +
      '<button class="sm" data-act="refine" data-arg="'+t.id+'">精炼</button>' +
      '<button class="sm" data-act="lock" data-arg="'+t.id+'">'+(t.lock?'解锁':'锁定')+'</button>' +
      '<button class="sm danger" data-act="sell" data-arg="'+t.id+'">售出</button>' +
      '</div></div>';
  });
  if (list.length > 60) h += '<div class="sub">……另有 '+(list.length-60)+' 件未列出</div>';
  h += '</div>';
  return h;
};

UI.bagHerbHtml = function(){
  var h = '<div class="card"><h3>灵草 <small>用于炼丹（君臣佐使）</small></h3>';
  var keys = Object.keys(G.bag.herb).filter(function(k){ return G.bag.herb[k] > 0; });
  if (!keys.length) return h + '<div class="empty">没有灵草——宗门灵田或各处采集</div></div>';
  var total = 0; keys.forEach(function(k){ total += G.bag.herb[k]; });
  h += '<div class="kv"><span>合计</span><b>'+total+' 株（'+keys.length+' 种）</b></div>';
  h += '<div class="hr"></div><div class="baggrid">';
  keys.sort(function(a,b){ return D.HK[b].t - D.HK[a].t; });
  keys.forEach(function(k){
    var x = D.HK[k];
    var mk = G.matAffixText(k);
    h += '<div class="bagitem" data-act="detail" data-arg="herb:'+k+'"><div class="bn">'+x.n+' <span class="tag mute">×'+G.bag.herb[k]+'</span></div>' +
      '<div class="bd"><span class="tag" style="border-color:'+D.ROOT[x.el].c+';color:'+D.ROOT[x.el].c+'">'+D.ROOT[x.el].n+'</span> ' +
      '<span class="tag mute">'+x.t+'阶</span><br>'+D.PILLS[x.pill].n +
      (mk ? '<br><span class="tag purple">烙印 '+mk+'</span>' : '') + '</div></div>';
  });
  h += '</div></div>';
  return h;
};

UI.bagOreHtml = function(){
  var h = '<div class="card"><h3>矿石 <small>用于炼器与精炼</small></h3>';
  var keys = Object.keys(G.bag.ore).filter(function(k){ return G.bag.ore[k] > 0; });
  if (!keys.length) return h + '<div class="empty">没有矿石——宗门灵矿或各处采掘</div></div>';
  var total = 0; keys.forEach(function(k){ total += G.bag.ore[k]; });
  h += '<div class="kv"><span>合计</span><b>'+total+' 块（'+keys.length+' 种）</b></div>';
  h += '<div class="hr"></div><div class="baggrid">';
  keys.sort(function(a,b){ return D.OK[b].t - D.OK[a].t; });
  keys.forEach(function(k){
    var x = D.OK[k];
    var mk = G.matAffixText(k);
    h += '<div class="bagitem" data-act="detail" data-arg="ore:'+k+'"><div class="bn">'+x.n+' <span class="tag mute">×'+G.bag.ore[k]+'</span></div>' +
      '<div class="bd"><span class="tag" style="border-color:'+D.ROOT[x.el].c+';color:'+D.ROOT[x.el].c+'">'+D.ROOT[x.el].n+'</span> ' +
      '<span class="tag mute">'+x.t+'阶</span>' +
      (mk ? '<br><span class="tag purple">烙印 '+mk+'</span>' : '') + '</div></div>';
  });
  h += '</div></div>';
  return h;
};

UI.bagPillHtml = function(){
  var h = '<div class="card"><h3>丹药 <small>服用即生效</small></h3>';
  var any = false;
  if (G.customPills.length){
    any = true;
    G.customPills.forEach(function(p){
      h += '<div class="tech-row got" data-act="detail" data-arg="pill:'+p.id+'"><div class="tm">' +
        '<div class="tn">'+p.name + ' <span class="tag" style="border-color:'+D.ROOT[p.el].c+';color:'+D.ROOT[p.el].c+'">'+D.ROOT[p.el].n+'</span>' +
        ' <span class="tag gold">'+D.PILL_QNAME[p.q]+'</span>' +
        ' <span class="tag mute">药力 '+p.power.toFixed(2)+'</span></div>' +
        '<div class="te">'+D.PILLS[p.kind].desc+'　·　君药年份 '+p.year+'</div>' +
        '</div><div class="tb"><button class="sm primary" data-act="usePill" data-arg="'+p.id+'">服用</button></div></div>';
    });
  }
  var pre = Object.keys(G.bag.pill).filter(function(k){ return G.bag.pill[k] > 0; });
  pre.forEach(function(k){
    any = true;
    var p = D.PILL_PRESET[k];
    h += '<div class="tech-row"><div class="tm">' +
      '<div class="tn">'+p.n+' <span class="tag mute">×'+G.bag.pill[k]+'</span></div>' +
      '<div class="te">'+p.desc+'</div></div>' +
      '<div class="tb"><button class="sm primary" data-act="usePresetPill" data-arg="'+k+'">服用</button></div></div>';
  });
  if (!any) h += '<div class="empty">尚无存丹——去丹房炼制</div>';
  h += '</div>';
  return h;
};

/* =====================  灵根  ===================== */
UI.view_roots = function(){
  var h = '';
  h += '<div class="card"><h3>九灵根 <small>活体演化</small></h3>';
  // 雷达
  h += '<canvas id="radar" width="260" height="230" style="width:100%;max-width:300px;display:block;margin:0 auto"></canvas>';
  h += '<div class="roots-grid" style="margin-top:8px">';
  D.ROOTS.forEach(function(r){
    var v = G.roots[r.k]||0;
    h += '<div class="root-line'+(v<=0.5?' dim':'')+'">' +
      '<span class="root-zi" style="border-color:'+r.c+';color:'+r.c+'">'+r.n+'</span>' +
      '<span class="nm">'+(v<=0.5?'未醒':'')+'</span>' +
      '<span class="bb"><i style="width:'+(v)+'%;background:'+r.c+'"></i></span>' +
      '<span class="pv">'+v.toFixed(1)+'%</span>' +
      '</div>';
  });
  h += '</div>';
  h += '<div class="hr"></div>';
  var cnt = G.activeRootCount();
  h += '<div class="kv"><span>灵根数</span><b>'+cnt+' 条'+(G.isChaos()?'（混沌灵根！）':'')+'</b></div>';
  h += '<div class="kv"><span>资质倍率</span><b class="val">×'+G.rootCountMult().toFixed(2)+'</b></div>';
  h += '<div class="kv"><span>灵根总效</span><b class="val">×'+G.rootSpeedMult().toFixed(2)+'</b></div>';
  h += '<div class="sub" style="margin-top:4px">单灵根（天灵根）修炼最速，功法选择却受限；五灵根起步缓慢，然可通学诸法，纯度齐高即可化为<b class="val">混沌灵根</b>。</div>';
  h += '</div>';

  // 共鸣
  var res = G.resonances();
  h += '<div class="card tight"><h3>灵根共鸣 <small>相生双方 ≥80%</small></h3>';
  if (!res.length) h += '<div class="empty">尚无共鸣。令相生两灵根纯度同达 80% 以上即可触发。</div>';
  res.forEach(function(r){
    h += '<div class="list-item"><div class="li-main"><div class="li-t">'+D.ROOT[r.a].n+' ⇌ '+D.ROOT[r.b].n+'</div>' +
      '<div class="li-d">共鸣强度 '+U.pct(r.v,0)+'　·　全属性小幅提升，修炼速度 +'+Math.round(r.v*20)+'%</div></div></div>';
  });
  h += '</div>';

  // 冲突
  var cf = G.conflicts();
  h += '<div class="card tight"><h3>灵根冲突 <small>相克双方 ≥68%</small></h3>';
  if (G.harmony) h += '<div class="sub pos">你已服下双生灵花，水火既济，冲突不再。</div>';
  else if (!cf.length) h += '<div class="empty">灵根和谐，无有冲撞。</div>';
  else {
    cf.forEach(function(c){
      h += '<div class="list-item"><div class="li-main"><div class="li-t neg">'+D.ROOT[c.a].n+' ✕ '+D.ROOT[c.b].n+'</div>' +
        '<div class="li-d">二气相搏，修炼速度 -'+Math.round(c.v*12)+'%，且纯度每日自行消磨。</div></div></div>';
    });
    h += '<div class="sub">化解之法：服<b class="val">洗灵丹</b>（丹房炼制·药性「洗灵」）洗涤其中一条；或于奇遇中寻得调和之物。</div>';
  }
  h += '</div>';

  h += '<div class="card tight"><h3>演化法门</h3><div class="sub">' +
    '· 修炼时，你<b>主灵根</b>纯度缓慢自增<br>' +
    '· 灵阵中每件法宝，都会缓慢同化对应灵根<br>' +
    '· 服食丹药、奇遇抉择、突破境界皆可改变纯度<br>' +
    '· 相克双灵根同时高企会互相消磨——除非调和<br>' +
    '· 五条以上灵根纯度俱达 85% → 觉醒<b class="val">混沌灵根</b>（修炼 ×2.6，且可修一切功法）' +
    '</div></div>';
  return h;
};
UI.roots_after = function(){
  var cv = U.$('#radar'); if (!cv) return;
  var ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height, cx = W/2, cy = H/2+6, R = 78;
  ctx.clearRect(0,0,W,H);
  var n = 9;
  // 网格
  ctx.strokeStyle = 'rgba(201,168,106,.18)'; ctx.lineWidth = 1;
  for (var ring=1; ring<=4; ring++){
    ctx.beginPath();
    for (var i=0;i<=n;i++){
      var a = -Math.PI/2 + i*2*Math.PI/n;
      var r = R*ring/4;
      var x = cx + Math.cos(a)*r, y = cy + Math.sin(a)*r;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
  for (var j=0;j<n;j++){
    var a2 = -Math.PI/2 + j*2*Math.PI/n;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a2)*R, cy+Math.sin(a2)*R); ctx.stroke();
  }
  // 相生连线
  ctx.strokeStyle = 'rgba(127,176,138,.22)';
  for (var s=0;s<n;s++){
    var b = D.ROOTS[s], t2 = D.ROOT[D.SHENG[b.k]];
    if (!t2) continue;
    var a3 = -Math.PI/2 + b.i*2*Math.PI/n, a4 = -Math.PI/2 + t2.i*2*Math.PI/n;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a3)*R*0.9, cy+Math.sin(a3)*R*0.9);
    ctx.lineTo(cx+Math.cos(a4)*R*0.9, cy+Math.sin(a4)*R*0.9);
    ctx.stroke();
  }
  // 数据面
  ctx.beginPath();
  for (var p=0;p<=n;p++){
    var idx = p % n, rt = D.ROOTS[idx];
    var v = (G.roots[rt.k]||0)/100;
    var a5 = -Math.PI/2 + idx*2*Math.PI/n;
    var x2 = cx + Math.cos(a5)*R*v, y2 = cy + Math.sin(a5)*R*v;
    if (p===0) ctx.moveTo(x2,y2); else ctx.lineTo(x2,y2);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(201,168,106,.20)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(231,211,162,.85)'; ctx.lineWidth = 1.6; ctx.stroke();
  // 点 + 标签
  for (var q=0;q<n;q++){
    var rq = D.ROOTS[q], vq = (G.roots[rq.k]||0)/100;
    var a6 = -Math.PI/2 + q*2*Math.PI/n;
    var px = cx + Math.cos(a6)*R*vq, py = cy + Math.sin(a6)*R*vq;
    ctx.beginPath(); ctx.arc(px,py,2.6,0,7); ctx.fillStyle = rq.c; ctx.fill();
    var lx = cx + Math.cos(a6)*(R+18), ly = cy + Math.sin(a6)*(R+18);
    ctx.fillStyle = (G.roots[rq.k]||0)>0.5 ? rq.c : 'rgba(139,133,116,.6)';
    ctx.font = '13px KaiTi, STKaiti, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(rq.n, lx, ly);
  }
};

/* =====================  灵阵  ===================== */
UI.view_array = function(){
  var ad = G.arrayDetail();
  var sum = G.arraySummary();
  var h = '';
  h += '<div class="card"><h3>十二阵眼 <small>灵力 '+U.fmt(ad.total)+'</small></h3>';
  h += '<div class="array-grid">';
  for (var i=0;i<12;i++){
    var nd = D.NODES12[i];
    var tid = G.slots[i];
    var t = tid ? G.treasureById(tid) : null;
    var cls = 'acell' + (t?' full':'') + (UI.st.arraySel===i?' hl':'');
    var gc = nd.el==='any' ? '#e7d3a2' : D.ROOT[nd.el].c;
    h += '<div class="'+cls+'" data-act="arrSel" data-arg="'+i+'">' +
      '<div class="cz">'+nd.z+'</div>';
    if (t){
      h += '<div class="cn" style="color:'+D.ROOT[t.el].c+'">'+t.name+'</div>' +
           '<div class="cg" style="color:'+(t.g>=8?'#e7d3a2':'#b9b09a')+'">'+D.gradeName(t.g,t.s)+'</div>';
    } else {
      h += '<div class="cn" style="color:'+gc+';opacity:.7">'+(nd.el==='any'?'万法':D.ROOT[nd.el].n)+'</div><div class="cg sub">空</div>';
    }
    h += '</div>';
  }
  h += '</div>';
  var sel = D.NODES12[UI.st.arraySel];
  h += '<div class="sub">【'+sel.z+'】'+(sel.el==='any'?'纳万法为一':D.ROOT[sel.el].n+'属')+'　'+sel.desc+'</div>';
  h += '<div class="sub"><span class="tag gold">阵眼不拘形制</span> 剑刀符甲皆可嵌入；若想定向强化人物属性，请去「人物」页佩戴（<b class="val">人物装备位挑剔形制</b>）。</div>';
  h += '<div class="hr"></div>';
  h += '<div class="kv"><span>同属契合</span><b>'+sum.same+' 处</b></div>';
  h += '<div class="kv"><span>相生</span><b>'+sum.sheng+' 处</b></div>';
  h += '<div class="kv"><span>相克</span><b class="'+(sum.ke?'neg':'')+'">'+sum.ke+' 处</b></div>';
  h += '<div class="kv"><span>中宫</span><b>'+sum.wild+' 处</b></div>';
  h += '<div class="kv"><span>相邻阵势</span><b class="'+(sum.adj>=0?'pos':'neg')+'">'+(sum.adj>=0?'+':'')+U.pct(sum.adj,1)+'</b></div>';
  var si = G.setInfo();
  h += '<div class="hr"></div><div class="sub">五行套装　<span class="tag mute">阵眼同属成组</span></div>';
  D.SET_TIERS.forEach(function(t){
    var on = si.bestArr.n >= t.n;
    h += '<div class="kv"><span>'+(on?'<span class="tag jade">已触发</span> ':'')+t.nm+'　<span class="tag mute">同属 '+t.n+' 件</span></span>' +
         '<b class="'+(on?'pos':'mute')+'">全属性 +'+U.pct(t.all,0)+'</b></div>';
  });
  h += '<div class="sub">当前阵眼同属最多 <b class="val">'+(si.bestArr.n||0)+'</b> 件'+(si.bestArr.el?('（'+D.ROOT[si.bestArr.el].n+'）'):'')+'　·　装备位 <b class="val">'+(si.bestEq.n||0)+'</b> 件</div>';
  h += '<div class="btnrow"><button data-act="autoArr">自动布阵</button><button data-act="clearArr">清空阵眼</button></div>';
  h += '</div>';

  // 选中阵眼
  h += '<div class="card"><h3>嵌宝 · '+sel.z+'位</h3>';
  var cur = G.slots[UI.st.arraySel];
  if (cur){
    var ct = G.treasureById(cur);
    h += '<div class="list-item sel"><div class="li-main"><div class="li-t">'+ct.name+' <span class="tag gold">'+D.gradeName(ct.g,ct.s)+'</span></div>' +
      '<div class="li-d">'+UI.affixHtml(ct)+'</div></div>' +
      '<div style="flex:0 0 auto"><button class="sm danger" data-act="unequip" data-arg="'+UI.st.arraySel+'">取下</button></div></div>';
  }
  // 候选
  var usedIds = {};
  G.slots.forEach(function(x){ if (x) usedIds[x] = 1; });
  var cand = G.treasures.filter(function(t){ return !usedIds[t.id]; }).sort(function(a,b){ return b.power - a.power; });
  if (!cand.length) h += '<div class="empty">暂无空闲法宝——去器坊炼制，或在探索中寻得。</div>';
  cand.slice(0, 30).forEach(function(t){
    var rel = (sel.el==='any') ? 'any' : D.rel(t.el, sel.el);
    var fit = rel==='any'?1.20 : rel==='same'?1.28 : (rel==='sheng'||rel==='bei')?1.12 : (rel==='ke'||rel==='beke')?0.78 : 1.0;
    var fitTag = rel==='any'?'<span class="tag gold">中宫 ×1.20</span>' : rel==='same'?'<span class="tag jade">同属 ×1.28</span>' :
      (rel==='sheng'||rel==='bei')?'<span class="tag jade">相生 ×1.12</span>' : (rel==='ke'||rel==='beke')?'<span class="tag cinn">相克 ×0.78</span>' : '<span class="tag mute">无关 ×1.00</span>';
    h += '<div class="list-item"><div class="li-main">' +
      '<div class="li-t">'+t.name+' <span class="tag" style="border-color:'+D.ROOT[t.el].c+';color:'+D.ROOT[t.el].c+'">'+D.ROOT[t.el].n+'</span> <span class="tag cyan">'+(t.typeN||'法宝')+'</span> <span class="tag gold">'+D.gradeName(t.g,t.s)+'</span> '+fitTag+'</div>' +
      '<div class="li-d">'+t.affixes.map(function(a){ return a.sp ? '<span class="tag purple">'+a.n+'</span>' : a.n+' '+ (a.fmt==='flat'? a.v : '+'+U.pct(a.v,0)); }).join('　') +'</div>' +
      '</div><div style="flex:0 0 auto"><button class="sm primary" data-act="equip" data-arg="'+t.id+'">嵌入</button></div></div>';
  });
  h += '</div>';

  // 法宝总览
  h += UI.treasureFootHtml();
  return h;
};

UI.treasureFootHtml = function(){
  var idle = 0, eq = 0, arr = 0;
  G.treasures.forEach(function(t){
    var u = G.treasureUse(t.id);
    if (!u) idle++; else if (u.where === 'equip') eq++; else arr++;
  });
  var h = '<div class="card tight"><h3>法宝总览 <small>共 '+G.treasures.length+' 件</small></h3>';
  h += '<div class="kv"><span>随身佩戴</span><b>'+eq+' 件</b></div>';
  h += '<div class="kv"><span>嵌入阵眼</span><b>'+arr+' 件</b></div>';
  h += '<div class="kv"><span>闲置</span><b class="val">'+idle+' 件</b></div>';
  h += '<div class="btnrow"><button data-act="tab" data-arg="bag">去背包整理</button>' +
       '<button data-act="tab" data-arg="character">去人物佩戴</button></div>';
  h += '</div>';
  return h;
};

/* =====================  炼丹  ===================== */
UI.alchPick = function(arg){
  var a = UI.st.alch;
  if (arg.indexOf('clear:') === 0){
    var slot = arg.slice(6);
    if (slot === 'jun') a.jun = null;
    else if (slot === 'shi') a.shi = null;
    else if (slot.indexOf('chen') === 0) a.chen[parseInt(slot.slice(4),10)] = null;
    else if (slot.indexOf('zuo') === 0) a.zuo[parseInt(slot.slice(3),10)] = null;
    UI.renderView(); return;
  }
  if (G.itemCount('herb', arg) <= 0) return;
  // 依次填入空槽
  if (!a.jun) a.jun = arg;
  else if (!a.chen[0]) a.chen[0] = arg;
  else if (!a.chen[1]) a.chen[1] = arg;
  else if (!a.zuo[0]) a.zuo[0] = arg;
  else if (!a.zuo[1]) a.zuo[1] = arg;
  else if (!a.shi) a.shi = arg;
  else { U.toast('药槽已满'); return; }
  UI.renderView();
};
UI.alchAuto = function(){
  var keys = Object.keys(G.bag.herb).filter(function(k){ return G.bag.herb[k] > 0; });
  if (!keys.length){ U.toast('没有灵草'); return; }
  keys.sort(function(a,b){ return D.HK[b].t - D.HK[a].t; });
  var jun = keys[0];
  var others = keys.filter(function(k){ return k !== jun || G.bag.herb[k] > 1; });
  var sheng = others.filter(function(k){ var r = D.rel(D.HK[k].el, D.HK[jun].el); return r==='sheng'||r==='bei'||r==='same'; });
  var pick = function(i){ return sheng[i] || others[i] || null; };
  UI.st.alch = { jun: jun, chen:[pick(0), pick(1)], zuo:[pick(2), pick(3)], shi: pick(4) };
  UI.renderView();
};
UI.view_alchemy = function(){
  var a = UI.st.alch, pv = G.alchPreview(a);
  var h = '';
  h += '<div class="card"><h3>丹炉 <small>君臣佐使</small></h3>';
  var slots = [
    {k:'jun', n:'君', d:'定药性，一炉之主', key:a.jun},
    {k:'chen0', n:'臣·一', d:'辅君增效', key:a.chen[0]},
    {k:'chen1', n:'臣·二', d:'辅君增效', key:a.chen[1]},
    {k:'zuo0', n:'佐·一', d:'辅佐制毒', key:a.zuo[0]},
    {k:'zuo1', n:'佐·二', d:'辅佐制毒', key:a.zuo[1]},
    {k:'shi', n:'使', d:'引药归经', key:a.shi}
  ];
  slots.forEach(function(s){
    if (s.key){
      var hb = D.HK[s.key];
      var rel = D.rel(hb.el, a.jun ? D.HK[a.jun].el : hb.el);
      var rt = (s.k==='jun') ? '' : ' <span class="tag '+(rel==='sheng'||rel==='bei'?'jade':rel==='same'?'gold':rel==='ke'||rel==='beke'?'cinn':'mute')+'">'+D.relName[rel]+'</span>';
      h += '<div class="list-item sel" data-act="alchPick" data-arg="clear:'+s.k+'"><div class="li-main">' +
        '<div class="li-t">['+s.n+'] '+hb.n+' <span class="tag" style="border-color:'+D.ROOT[hb.el].c+';color:'+D.ROOT[hb.el].c+'">'+D.ROOT[hb.el].n+'</span> '+rt+'</div>' +
        '<div class="li-d">'+hb.t+' 阶 · '+hb.y[0]+'~'+hb.y[1]+'年 · 药性「'+D.PILLS[hb.pill].n+'」　点击取下</div></div></div>';
    } else {
      h += '<div class="list-item"><div class="li-main"><div class="li-t" style="color:#6f6a5c">['+s.n+'] 空</div><div class="li-d">'+s.d+'</div></div></div>';
    }
  });
  h += '<div class="hr"></div>';
  if (pv.ok){
    h += '<div class="kv"><span>药性</span><b class="val">'+D.PILLS[pv.kind].n+'</b>（'+D.PILLS[pv.kind].desc+'）</div>';
    h += '<div class="kv"><span>药力</span><b class="val">'+pv.power.toFixed(2)+'</b></div>';
    h += '<div class="kv"><span>预计品质</span><b class="val">'+D.PILL_QNAME[pv.q]+'</b></div>';
    h += '<div class="hr"></div>';
    h += '<div class="sub">'+pv.steps.join('<br>')+'</div>';
  } else {
    h += '<div class="empty">'+pv.msg+'</div>';
  }
  h += '<div class="btnrow"><button class="primary" data-act="alchDo">开炉炼丹</button>' +
       '<button data-act="alchAuto">智能配伍</button><button data-act="alchClear">清空药槽</button></div>';
  h += '</div>';

  // 成品丹
  h += '<div class="card"><h3>丹药 <small>'+(G.customPills.length + (function(){var c=0;for(var k in G.bag.pill)c+=G.bag.pill[k];return c;})())+' 枚</small></h3>';
  if (G.customPills.length){
    G.customPills.forEach(function(p){
      h += '<div class="list-item"><div class="li-main"><div class="li-t">'+p.name+
        ' <span class="tag" style="border-color:'+D.ROOT[p.el].c+';color:'+D.ROOT[p.el].c+'">'+D.ROOT[p.el].n+'</span>' +
        ' <span class="tag mute">药力 '+p.power.toFixed(2)+'</span></div>' +
        '<div class="li-d">'+D.PILLS[p.kind].desc+'</div></div>' +
        '<div style="flex:0 0 auto"><button class="sm primary" data-act="usePill" data-arg="'+p.id+'">服用</button></div></div>';
    });
  }
  var pre = Object.keys(G.bag.pill).filter(function(k){ return G.bag.pill[k] > 0; });
  pre.forEach(function(k){
    var p = D.PILL_PRESET[k];
    h += '<div class="list-item"><div class="li-main"><div class="li-t">'+p.n+' <span class="tag mute">×'+G.bag.pill[k]+'</span></div>' +
      '<div class="li-d">'+p.desc+'</div></div>' +
      '<div style="flex:0 0 auto"><button class="sm primary" data-act="usePresetPill" data-arg="'+k+'">服用</button></div></div>';
  });
  if (!G.customPills.length && !pre.length) h += '<div class="empty">尚无存丹</div>';
  h += '</div>';

  // 药圃
  h += '<div class="card"><h3>药圃 <small>点击入炉</small></h3>';
  var has = Object.keys(G.bag.herb).filter(function(k){ return G.bag.herb[k] > 0; });
  if (!has.length) h += '<div class="empty">没有灵草——去宗门灵田或各处采集。</div>';
  has.sort(function(a,b){ return D.HK[b].t - D.HK[a].t; });
  has.forEach(function(k){
    var hb = D.HK[k];
    h += '<div class="list-item" data-act="alchPick" data-arg="'+k+'"><div class="li-main">' +
      '<div class="li-t">'+hb.n+' <span class="tag mute">×'+G.bag.herb[k]+'</span> <span class="tag" style="border-color:'+D.ROOT[hb.el].c+';color:'+D.ROOT[hb.el].c+'">'+D.ROOT[hb.el].n+'</span> <span class="tag mute">'+hb.t+'阶</span></div>' +
      '<div class="li-d">'+D.PILLS[hb.pill].n+'　年份 '+hb.y[0]+'~'+hb.y[1]+'</div></div></div>';
  });
  h += '</div>';
  return h;
};

/* =====================  炼器  ===================== */
UI.forgePick = function(arg){
  var f = UI.st.forge;
  if (arg.indexOf('clear:') === 0){ f[arg.slice(6)] = null; UI.renderView(); return; }
  if (G.itemCount('ore', arg) <= 0) return;
  if (!f.k1) f.k1 = arg; else if (!f.k2) f.k2 = arg; else if (!f.k3) f.k3 = arg; else { U.toast('材料槽已满'); return; }
  UI.renderView();
};
UI.forgeAuto = function(){
  var keys = Object.keys(G.bag.ore).filter(function(k){ return G.bag.ore[k] > 0; });
  if (!keys.length){ U.toast('没有矿石'); return; }
  keys.sort(function(a,b){ return D.OK[b].t - D.OK[a].t; });
  var k1 = keys[0];
  var rest = keys.filter(function(k){ return k !== k1 || G.bag.ore[k] > 1; });
  var fit = rest.filter(function(k){ var r = D.rel(D.OK[k].el, D.OK[k1].el); return r==='sheng'||r==='bei'||r==='same'; });
  var k2 = fit[0] || rest[0] || null;
  var fit2 = rest.filter(function(k){ var r = D.rel(D.OK[k].el, D.OK[k1].el); return r==='sheng'||r==='bei'||r==='same'; });
  var k3 = fit2[1] || rest[1] || null;
  UI.st.forge.k1 = k1; UI.st.forge.k2 = k2; UI.st.forge.k3 = k3;
  UI.renderView();
};
UI.view_forge = function(){
  var f = UI.st.forge;
  var pv = G.forgePreview(f.k1, f.k2, f.k3, f.fire);
  var h = '';
  h += '<div class="card"><h3>器坊 <small>五行与火候</small></h3>';
  var slots = [
    {k:'k1', n:'主料', d:'定属性与基础品级'},
    {k:'k2', n:'辅料', d:'增词条、定形制'},
    {k:'k3', n:'引材', d:'引灵入器'}
  ];
  slots.forEach(function(s){
    var key = f[s.k];
    if (key){
      var o = D.OK[key];
      h += '<div class="list-item sel" data-act="forgePick" data-arg="clear:'+s.k+'"><div class="li-main">' +
        '<div class="li-t">['+s.n+'] '+o.n+' <span class="tag" style="border-color:'+D.ROOT[o.el].c+';color:'+D.ROOT[o.el].c+'">'+D.ROOT[o.el].n+'</span> <span class="tag mute">'+o.t+'阶</span></div>' +
        '<div class="li-d">点击取下</div></div></div>';
    } else {
      h += '<div class="list-item"><div class="li-main"><div class="li-t" style="color:#6f6a5c">['+s.n+'] 空</div><div class="li-d">'+s.d+'</div></div></div>';
    }
  });
  h += '<div class="hr"></div><div class="sub">火候</div><div class="btnrow">';
  D.FIRE.forEach(function(fi){
    h += '<button class="'+ (f.fire===fi.k?'primary':'') +'" data-act="forgeFire" data-arg="'+fi.k+'">'+fi.n+'</button>';
  });
  h += '</div><div class="sub">'+D.FIREK[f.fire].desc+'</div><div class="hr"></div>';
  if (pv.ok){
    h += '<div class="kv"><span>属性</span><b style="color:'+D.ROOT[pv.el].c+'">'+D.ROOT[pv.el].n+'</b></div>';
    h += '<div class="kv"><span>五行贯通</span><b class="'+(pv.bonus>0?'pos':pv.bonus<0?'neg':'')+'">'+(pv.bonus>0?'+':'')+pv.bonus.toFixed(2)+'</b></div>';
    h += '<div class="kv"><span>火候</span><b class="'+(pv.fire?'pos':'neg')+'">'+(pv.fire?'相合 +1.0':'不合 +0')+'</b></div>';
    h += '<div class="kv"><span>预计品级</span><b class="val">'+ D.gradeName(U.clamp(Math.floor(G.node/3)+pv.lv,0,11),0) +' 上下</b></div>';
    h += '<div class="sub">'+pv.msg+'</div>';
  } else h += '<div class="empty">'+pv.msg+'</div>';
  // 灵材烙印预览
  if (pv.ok){
    var iv = G.forgeInfusePreview(f.k1, f.k2, f.k3, f.fire);
    if (iv.list.length){
      h += '<div class="hr"></div><div class="sub">灵材烙印（炼成时有概率被成品继承，最多 2 条，数值现算）</div>';
      iv.list.forEach(function(x){
        h += '<div class="kv small"><span>'+x.name+'　<span class="tag mute">来自 '+x.from+' · '+x.tier+'阶</span></span><b class="val">'+Math.round(x.p*100)+'%</b></div>';
      });
    } else if (f.k1 && f.k2 && f.k3){
      h += '<div class="hr"></div><div class="sub">所选材料均无烙印——阶位越高越可能带烙印，用 2~3 阶料试试。</div>';
    }
  }
  h += '<div class="btnrow"><button class="primary" data-act="forgeDo">开炉炼器</button><button data-act="forgeAuto">智能选材</button></div>';
  h += '</div>';

  h += '<div class="card"><h3>矿藏 <small>点击入炉</small></h3>';
  var has = Object.keys(G.bag.ore).filter(function(k){ return G.bag.ore[k] > 0; });
  if (!has.length) h += '<div class="empty">没有矿石——去宗门灵矿或各处采掘。</div>';
  has.sort(function(a,b){ return D.OK[b].t - D.OK[a].t; });
  has.forEach(function(k){
    var o = D.OK[k];
    var mk = G.matAffixText(k);
    h += '<div class="list-item" data-act="forgePick" data-arg="'+k+'"><div class="li-main">' +
      '<div class="li-t">'+o.n+' <span class="tag mute">×'+G.bag.ore[k]+'</span> <span class="tag" style="border-color:'+D.ROOT[o.el].c+';color:'+D.ROOT[o.el].c+'">'+D.ROOT[o.el].n+'</span> <span class="tag mute">'+o.t+'阶</span>' +
      (mk ? '<span class="tag purple">烙印 '+mk+'</span>' : '') + '</div>' +
      (mk ? '<div class="li-d">炼成时有概率把「'+mk+'」继承到成品上，数值按 '+o.t+' 阶现算</div>' : '') +
      '</div></div>';
  });
  h += '</div>';
  h += UI.treasureFootHtml();
  return h;
};

/* =====================  阵法  ===================== */
UI.view_formation = function(){
  var f = UI.st.form;
  var pv = G.formPreview(f.form, f.gong, f.gan);
  var h = '';
  h += '<div class="card"><h3>阵法 <small>奇门遁甲</small></h3>';
  h += '<div class="sub">一、择阵型</div><div class="btnrow">';
  D.FORMS.forEach(function(x){
    h += '<button class="'+(f.form===x.k?'primary':'')+'" data-act="fmForm" data-arg="'+x.k+'">'+x.n+'</button>';
  });
  h += '</div>';
  h += '<div class="sub" style="margin-top:6px">'+D.FORMK[f.form].desc+'</div>';

  h += '<div class="sub" style="margin-top:8px">二、定方位（九宫）</div><div class="btnrow">';
  D.GONG9.forEach(function(x){
    h += '<button class="'+(f.gong===x.k?'primary':'')+'" data-act="fmGong" data-arg="'+x.k+'">'+x.n+'<span class="tag" style="border-color:'+D.ROOT[x.el].c+';color:'+D.ROOT[x.el].c+'">'+D.ROOT[x.el].n+'</span></button>';
  });
  h += '</div>';

  h += '<div class="sub" style="margin-top:8px">三、合天干</div><div class="btnrow">';
  D.GAN10.forEach(function(x){
    h += '<button class="'+(f.gan===x.k?'primary':'')+'" data-act="fmGan" data-arg="'+x.k+'">'+x.n+'<span class="tag" style="border-color:'+D.ROOT[x.el].c+';color:'+D.ROOT[x.el].c+'">'+D.ROOT[x.el].n+'</span></button>';
  });
  h += '</div>';
  h += '<div class="hr"></div>';
  h += '<div class="kv"><span>推演结果</span><b class="'+(pv.ok?'pos':'neg')+'">'+ (pv.ok ? pv.lv + ' 级阵法' : '不成阵') +'</b></div>';
  h += '<div class="kv"><span>耗费灵石</span><b>'+U.fmt(pv.cost)+'</b></div>';
  h += '<div class="kv"><span>阵道造诣</span><b class="val">×'+G.formPower().toFixed(2)+'</b></div>';
  h += '<div class="hr"></div><div class="sub">'+(pv.notes||[]).join('<br>')+'</div>';
  h += '<div class="btnrow"><button class="primary" data-act="fmBuild">布 阵</button></div>';
  h += '</div>';

  h += '<div class="card"><h3>已布之阵</h3>';
  var any = false;
  D.FORMS.forEach(function(x){
    var a = G.arrays[x.k];
    if (!a) return;
    any = true;
    h += '<div class="list-item"><div class="li-main"><div class="li-t">'+x.n+' <span class="tag gold">'+a.lv+' 级</span></div>' +
      '<div class="li-d">'+x.desc.replace('/级','×'+a.lv)+'　（'+D.GK[a.gong].n+' · '+D.GANK[a.gan].n+'）</div></div></div>';
  });
  if (!any) h += '<div class="empty">尚未布下任何阵法</div>';
  h += '</div>';
  return h;
};

/* =====================  宗门  ===================== */
UI.view_sect = function(){
  var h = '';
  h += '<div class="card"><h3>'+G.sect.name+' <small>'+G.sectLevel()+' 级宗门</small></h3>';
  h += '<div class="kv"><span>弟子</span><b>'+G.sect.disciples.length+' / '+G.maxDisciples()+'</b></div>';
  h += '<div class="kv"><span>灵石产出</span><b>'+U.fmt(G.sectSpiritRate())+'/秒</b></div>';
  h += '<div class="kv"><span>灵田产出</span><b>'+G.sectHerbRate().toFixed(2)+' 株/分</b></div>';
  h += '<div class="kv"><span>灵矿产出</span><b>'+G.sectOreRate().toFixed(2)+' 块/分</b></div>';
  h += '<div class="btnrow"><button class="primary" data-act="recruit">招募弟子（'+U.fmt(G.recruitCost())+' 灵石）</button></div>';
  h += '</div>';

  h += '<div class="card"><h3>建筑</h3>';
  D.BUILDINGS.forEach(function(b){
    var lv = G.buildingLv(b.k);
    var can = G.canBuild(b.k);
    var cost = G.buildingCost(b.k);
    var maxed = lv >= G.buildingMax();
    var dis = !can || G.spirit < cost || maxed;
    var staff = G.discipleCountAt(b.k);
    h += '<div class="list-item"><div class="li-main">' +
      '<div class="li-t">'+b.n+' <span class="tag gold">'+(lv?lv+' / '+G.buildingMax()+' 级':'未建')+'</span>' + (maxed?'<span class="tag jade">满级</span>':'') +
      ' <span class="tag" style="border-color:'+D.ROOT[b.el].c+';color:'+D.ROOT[b.el].c+'">'+D.ROOT[b.el].n+'</span>' +
      (staff?'<span class="tag jade">弟子 '+staff+'</span>':'') + '</div>' +
      '<div class="li-d">'+b.desc+(lv?'　当前产出加成 +'+Math.round(G.sectBuildBonus(b.k)*100)+'%':'')+'</div></div>' +
      '<div style="flex:0 0 auto"><button class="sm" data-act="bldUp" data-arg="'+b.k+'" '+(dis?'disabled':'')+'>'+
      (maxed ? '已满级' : (G.canBuild(b.k) ? '升级 '+U.fmt(cost) : '需 '+D.BUILD_REQ[b.k]+' 级宗门'))+'</button></div></div>';
  });
  h += '</div>';

  h += '<div class="card"><h3>门人 <small>'+G.sect.disciples.length+' 人</small></h3>';
  if (!G.sect.disciples.length) h += '<div class="empty">山门寂寥，尚无弟子</div>';
  var busy = {};
  G.missions().forEach(function(m){ m.ids.forEach(function(i){ busy[i] = 1; }); });
  G.sect.disciples.forEach(function(d){
    var assignName = d.assign ? D.BK[d.assign].n : (busy[d.id] ? '<span class="tag cinn">外出任务中</span>' : '自行修炼');
    var tr = (d.traits || []).map(function(tk){ return D.TRAITK[tk] ? '<span class="tag purple">'+D.TRAITK[tk].n+'</span>' : ''; }).join(' ');
    h += '<div class="list-item"><div class="li-main">' +
      '<div class="li-t">'+d.name+' <span class="tag" style="border-color:'+D.ROOT[d.el].c+';color:'+D.ROOT[d.el].c+'">'+D.ROOT[d.el].n+'</span> <span class="tag gold">资质 '+d.talent+'</span> '+tr+'</div>' +
      '<div class="li-d">境界 '+D.nodeName(d.node)+'　任职：'+assignName+'　成长 '+(d.exp||0)+'/100</div></div>' +
      '<div style="flex:0 0 auto"><button class="sm" data-act="assign" data-arg="'+d.id+'" '+(busy[d.id]?'disabled':'')+'>安排</button></div></div>';
  });
  h += '</div>';

  /* ---------- 派遣 ---------- */
  var mis = G.missions();
  h += '<div class="card"><h3>派遣 <small>' + mis.length + ' / ' + G.missionSlots() + '</small></h3>';
  if (mis.length){
    mis.forEach(function(m){
      var md = D.MISK[m.k], left = Math.max(0, Math.round((m.endAt - Date.now())/1000));
      var names = m.ids.map(function(id){
        var d = null; G.sect.disciples.forEach(function(x){ if (x.id === id) d = x; });
        return d ? d.name : '?';
      }).join('、');
      h += '<div class="tech-row got"><div class="tm">' +
        '<div class="tn">' + md.n + ' <span class="tag mute">剩 ' + U.fmtTimeShort(left) + '</span></div>' +
        '<div class="te">前往弟子：' + names + '</div></div></div>';
    });
    h += '<div class="hr"></div>';
  }
  D.MISSIONS.forEach(function(m){
    var ok = mis.length < G.missionSlots();
    h += '<div class="list-item"><div class="li-main">' +
      '<div class="li-t">' + m.n + ' <span class="tag cyan">建议 ' + Math.ceil(m.min/2) + ' 人</span></div>' +
      '<div class="li-d">' + m.d + '　用时约 ' + U.fmtTimeShort(m.dur) + '</div></div>' +
      '<div style="flex:0 0 auto"><button class="sm ' + (ok ? 'primary' : '') + '" data-act="misPick" data-arg="' + m.k + '" ' + (ok ? '' : 'disabled') + '>派遣</button></div></div>';
  });
  h += '<div class="sub">派遣期间弟子无法任职；归来可带回灵材、法宝甚至功法碎片，弟子自身也会成长。</div>';
  h += '</div>';
  return h;
};

/* =====================  探索  ===================== */
UI.view_explore = function(){
  var h = '';
  h += '<div class="card"><h3>大千世界 <small>点选去处，就地出发</small></h3>';
  h += '<div class="region-grid">';
  D.REGIONS.forEach(function(r){
    var lock = !G.unlockedRegion(r);
    var sel = (UI.st.region === r.id) && !lock;
    h += '<div class="region' + (lock?' lock':'') + (sel?' sel':'') + '"' + (sel?' id="regionSel" style="grid-column:1/-1"':'') +
         ' data-act="region" data-arg="'+r.id+'">' +
      '<b>'+r.n + (sel?'<span class="selmark">已选</span>':'') + '</b>' +
      '<span>' + (lock ? '需 '+D.nodeName(r.req) : r.desc) + '<br>★'+r.t+'　'+D.ROOT[r.el].n+'属</span>';
    if (sel){
      var c = G.exploreCost(r);
      var rs = D.REGION_SPEC[r.id] || {};
      h += '<div class="region-acts">' +
        '<div class="rw"><span class="tag gold">风土</span> ' + (rs.when || '寻常之地') +
          '　·　特产形制 <b class="val">' + (rs.type || []).map(function(k){ return D.TTK[k] ? D.TTK[k].n : k; }).join('、') + '</b></div>' +
        '<button class="primary" data-act="explore">游历（奇遇）</button>' +
        '<button data-act="trial">讨伐（斗法）</button>' +
        '<button data-act="gather">采集（灵材）</button>' +
        '<div class="rw">每次耗资约 <b class="val">'+U.fmt(c)+'</b> 灵石　·　游历有 <b class="val">16%</b> 概率撞见秘境之门</div>' +
        '</div>';
    }
    h += '</div>';
  });
  h += '</div></div>';

  if (G.secretActive){
    h += '<div class="card tight"><h3>秘境进行中</h3><div class="sub">已深入 <b class="val">'+G.secretStage+'</b> 层　·　' +
         '<button class="sm" data-act="secret">继续探索</button></div></div>';
  }
  return h;
};
UI.explore_after = function(){
  if (!UI.scrollToSel) return;
  UI.scrollToSel = false;
  var el = U.$('#regionSel');
  if (el && el.scrollIntoView){ try{ el.scrollIntoView({block:'nearest'}); }catch(e){ el.scrollIntoView(); } }
};

/* =====================  轮回  ===================== */
UI.view_rebirth = function(){
  var pv = G.rebirthPreview();
  var h = '';
  h += '<div class="card"><h3>轮回 <small>第 '+((G.rebirth.count||0)+1)+' 世</small></h3>';
  h += '<div class="kv"><span>轮回点</span><b class="val">'+G.rebirth.points+'</b></div>';
  h += '<div class="kv"><span>累计获得</span><b>'+G.rebirth.total+'</b></div>';
  h += '<div class="kv"><span>已转世</span><b>'+G.rebirth.count+' 次（飞升 '+G.rebirth.ascends+' 次）</b></div>';
  h += '<div class="kv"><span>轮回加持</span><b class="val">×'+(G.rebirthMult()).toFixed(2)+' 修为产出</b></div>';
  h += '<div class="hr"></div>';
  h += '<div class="kv"><span>本世结算可得</span><b class="val">'+pv.points+' 点</b></div>';
  h += '<div class="kv"><span>传承法宝</span><b>'+pv.keepTreasure+' 件</b></div>';
  h += '<div class="kv"><span>继承灵石</span><b>'+U.fmt(pv.keepSpirit)+'</b></div>';
  h += '<div class="kv"><span>保留灵根纯度</span><b>'+pv.keepPurity+'%</b></div>';
  h += '<div class="kv"><span>开局境界</span><b>'+D.nodeName(pv.startNode)+'</b></div>';
  h += '<div class="btnrow"><button class="primary" data-act="rebirth">开启轮回</button><button data-act="refund">重置星盘（返还点数）</button></div>';
  h += '</div>';

  h += '<div class="card"><h3>轮回星盘 <small>永久加成</small></h3><div class="star-grid">';
  D.STARS.forEach(function(s){
    var lv = G.starLv(s.k), mx = s.max, cost = G.starCost(s.k);
    var cls = 'star' + (lv>0?' lit':'') + (lv>=mx?' max':'');
    h += '<div class="'+cls+'" data-act="buyStar" data-arg="'+s.k+'">' +
      '<span class="lv">'+lv+'/'+mx+'</span>' +
      '<b>'+s.n+'</b><i>'+s.desc+'</i>' +
      '<div class="sub" style="margin-top:3px">'+(lv>=mx?'已圆满':'点亮需 '+cost+' 点')+'</div>' +
      '</div>';
  });
  h += '</div></div>';

  if (G.rebirth.records && G.rebirth.records.length){
    h += '<div class="card"><h3>轮回录</h3>';
    G.rebirth.records.slice().reverse().forEach(function(r){
      h += '<div class="kv"><span>第 '+r.n+' 世　'+r.node+'</span><b class="val">'+r.pts+' 点</b></div>';
    });
    h += '</div>';
  }
  return h;
};

/* =====================  志录  ===================== */
UI.view_codex = function(){
  var t = UI.st.codexTab;
  var h = '';
  h += '<div class="btnrow" style="margin-bottom:8px">' +
    '<button class="'+(t==='log'?'primary':'')+'" data-act="codexTab" data-arg="log">见闻</button>' +
    '<button class="'+(t==='stat'?'primary':'')+'" data-act="codexTab" data-arg="stat">统计</button>' +
    '<button class="'+(t==='tech'?'primary':'')+'" data-act="codexTab" data-arg="tech">功法</button>' +
    '<button class="'+(t==='affix'?'primary':'')+'" data-act="codexTab" data-arg="affix">词条</button>' +
    '<button class="'+(t==='achv'?'primary':'')+'" data-act="codexTab" data-arg="achv">成就</button>' +
    '<button class="'+(t==='tre'?'primary':'')+'" data-act="codexTab" data-arg="tre">法宝品阶</button>' +
    '</div>';
  if (t === 'log'){
    h += '<div class="card"><h3>见闻录</h3>';
    var logs = G.logs || [];
    logs.forEach(function(l){ h += '<div style="padding:3px 0;border-bottom:1px dashed rgba(201,168,106,.12);font-size:12.5px"><span class="sub">'+l.t+'</span> '+l.m+'</div>'; });
    if (!logs.length) h += '<div class="empty">尚无见闻</div>';
    h += '</div>';
  } else if (t === 'stat'){
    var s = G.stats;
    h += '<div class="card"><h3>修行统计</h3>' +
      '<div class="kv"><span>修行时长</span><b>'+U.fmtTime(s.playTime||0)+'</b></div>' +
      '<div class="kv"><span>历史最高修为</span><b>'+U.fmt(s.maxQi||0)+'</b></div>' +
      '<div class="kv"><span>游历次数</span><b>'+(s.explores||0)+'</b></div>' +
      '<div class="kv"><span>战斗 / 胜</span><b>'+(s.battles||0)+' / '+(s.wins||0)+'</b></div>' +
      '<div class="kv"><span>天劫 / 渡过</span><b>'+(s.tribulations||0)+' / '+(s.tribSuccess||0)+'</b></div>' +
      '<div class="kv"><span>炼丹</span><b>'+(s.pills||0)+' 炉</b></div>' +
      '<div class="kv"><span>炼器</span><b>'+(s.forges||0)+' 件</b></div>' +
      '<div class="kv"><span>布阵</span><b>'+(s.forms||0)+' 次</b></div>' +
      '<div class="kv"><span>历史最高境界</span><b>'+D.nodeName(G.rebirth.bestNode||G.node)+'</b></div>' +
      '</div>';
  } else if (t === 'tech'){
    h += '<div class="card"><h3>功法图鉴</h3>';
    D.TECHS.forEach(function(x){
      var lv = G.techs[x.id];
      h += '<div class="list-item'+(lv?' sel':'')+'"><div class="li-main"><div class="li-t">'+x.n+' '+(lv?'<span class="tag gold">参悟 '+lv+'级</span>':'<span class="tag mute">未悟</span>')+'</div>' +
        '<div class="li-d">'+(x.desc || (x.kind==='passive' ? '被动常驻增益' : '主动术法'))+'　'+(x.el==='any'?'通用':D.ROOT[x.el].n+'属')+'</div></div></div>';
    });
    h += '</div>';
  } else if (t === 'achv'){
    /* ---- 成就 ---- */
    var done = G.achvCount(), tot = D.ACHV.length;
    h += '<div class="card"><h3>成就 <small>' + done + ' / ' + tot + '</small></h3>';
    h += '<div class="bar gold"><i style="width:' + (done / tot * 100).toFixed(1) + '%"></i></div>';
    h += '<div class="sub" style="margin-top:5px">达成可得灵石 / 功法碎片 / 轮回点。<b class="val">成就跨轮回永久保留。</b></div></div>';
    h += '<div class="card">';
    D.ACHV.forEach(function(a){
      var ok = G.achvDone(a.k);
      var r = a.rew || {}, txt = [];
      if (r.spirit) txt.push('灵石 ' + U.fmt(r.spirit));
      if (r.shard) txt.push('碎片 ' + r.shard);
      if (r.point) txt.push('轮回点 ' + r.point);
      h += '<div class="tech-row' + (ok ? ' got' : '') + '"' + (ok ? '' : ' style="opacity:.6"') + '>' +
        '<div class="tm"><div class="tn">' + (ok ? '<span class="tag jade">已达成</span> ' : '') + a.n + '</div>' +
        '<div class="te">' + a.d + (txt.length ? '　<span class="tag gold">' + txt.join(' · ') + '</span>' : '') + '</div></div></div>';
    });
    h += '</div>';
  } else if (t === 'affix'){
    /* ---- 词条图鉴 ---- */
    var owned = {};
    G.treasures.forEach(function(tr){ tr.affixes.forEach(function(x){ owned[x.k] = (owned[x.k]||0) + 1; }); });
    var sps = G.specialAffixes();

    h += '<div class="card"><h3>基础词条 <small>'+D.AFFIX.length+' 条</small></h3>';
    h += '<div class="sub">法宝最多带 6 条；装备位的<b class="val">对口词条</b>另享格位系数（兵器 ×1.55、护身 ×1.65…）。</div><div class="hr"></div>';
    D.AFFIX.forEach(function(a){
      var n = owned[a.k] || 0;
      h += '<div class="kv"><span>'+a.n+'　<span class="tag mute">'+a.desc+'</span>'+(n?'<span class="tag gold">持有 '+n+'</span>':'')+'</span>' +
           '<b>'+(a.fmt==='flat' ? (a.v[0]+' ~ '+a.v[1]) : ('+'+U.pct(a.v[0],0)+' ~ '+U.pct(a.v[1],0)))+'</b></div>';
    });
    h += '</div>';

    h += '<div class="card"><h3>特殊词条 <small>'+D.SPECIAL.length+' 条</small></h3>';
    h += '<div class="sub">稀有词条，<b class="val">嵌入阵眼或随身佩戴都会生效</b>；同名词条不叠加。</div><div class="hr"></div>';
    D.SPECIAL.forEach(function(s){
      var has = false;
      for (var i=0;i<sps.length;i++) if (sps[i].k === s.k) has = true;
      h += '<div class="tech-row'+(has?' got':'')+'"><div class="tm">' +
        '<div class="tn"><span class="tag purple">'+s.n+'</span>' +
        (has ? '<span class="tag jade">已生效</span>' : (owned[s.k] ? '<span class="tag gold">已持有</span>' : '<span class="tag mute">未获得</span>')) +
        '</div>' +
        '<div class="te">'+s.desc+'</div></div></div>';
    });
    h += '</div>';

    h += '<div class="card tight"><h3>生效中的特殊词条</h3>';
    if (!sps.length) h += '<div class="empty">当前没有特殊词条生效</div>';
    else h += '<div>' + sps.map(function(s){ return '<span class="tag purple">'+s.n+'</span>'; }).join('') + '</div>';
    h += '</div>';
  } else {
    h += '<div class="card"><h3>法宝品阶</h3><div class="sub">黄玄地天灵君王皇尊圣帝仙，每级分下中上极，共四十八阶。</div><div class="hr"></div>';
    var seen = G.seen.treasure || {};
    var cnt = Object.keys(seen).length;
    h += '<div class="kv"><span>已见品阶</span><b class="val">'+cnt+' / 48</b></div><div class="hr"></div>';
    var line = '';
    for (var g=0; g<12; g++){
      for (var s2=0; s2<4; s2++){
        var nm = D.gradeName(g,s2);
        var has = seen[nm];
        line += '<span class="tag '+(has?'gold':'mute')+'">'+nm+'</span>';
      }
      line += '<br>';
    }
    h += line + '</div>';
  }
  return h;
};

/* =====================  设置  ===================== */
UI.view_settings = function(){
  var h = '';
  h += '<div class="card"><h3>偏好</h3>';
  h += '<div class="kv"><span>自动突破</span><b><button class="sm" data-act="autotoggle" data-arg="break">'+(G.auto.break?'开':'关')+'</button></b></div>';
  h += '<div class="kv"><span>自动布阵（获得法宝即入阵）</span><b><button class="sm" data-act="autotoggle" data-arg="arrayFill">'+(G.auto.arrayFill?'开':'关')+'</button></b></div>';
  h += '<div class="kv"><span>道号</span><b>'+U.esc(G.name)+'</b></div>';
  h += '</div>';
  h += '<div class="card"><h3>存档</h3>';
  h += '<div class="sub">每 10 秒自动保存一次。存档存放于浏览器 localStorage。</div>';
  h += '<div class="btnrow"><button data-act="save">立即保存</button><button data-act="export">导出</button><button data-act="import">导入</button></div>';
  h += '</div>';
  h += '<div class="card"><h3>重置</h3>';
  h += '<div class="sub">清空一切，从头再来（含星盘与图鉴）。</div>';
  h += '<div class="btnrow"><button class="danger" data-act="reset">重置所有进度</button></div>';
  h += '</div>';
  h += '<div class="card"><h3>诊断</h3>';
  var appH = 0, appPos = '';
  try{ var ae = document.getElementById('app'); appH = Math.round(ae.getBoundingClientRect().height); appPos = getComputedStyle(ae).position; }catch(e){}
  h += '<div class="kv"><span>资源版本</span><b class="val">v'+(XX.VER||'?')+'</b></div>';
  h += '<div class="kv"><span>视口 / 主容器</span><b>'+(window.innerWidth||0)+'×'+(window.innerHeight||0)+'　·　'+appH+'px　'+appPos+'</b></div>';
  h += '<div class="sub">若版本号不是最新，或主容器高度与视口对不上，界面可能出现错位——点下面的按钮强制刷新一次。</div>';
  h += '<div class="btnrow"><button class="primary" data-act="hardrefresh">强制刷新（清缓存）</button></div>';
  h += '</div>';
  h += '<div class="card"><h3>关于</h3><div class="sub">' +
    '《灵根演化 · 问道长生》<br>核心创新：灵根不是标签，而是会随你每一次抉择而<b>终身演化</b>的活体系统。<br>' +
    '功法、丹药、法宝、阵眼、因果、道心——皆在悄悄改写你的灵根。<br><br>' +
    '十二阵眼 · 君臣佐使 · 奇门遁甲 · 宗门经营 · 秘境界支 · 天劫渡厄 · 轮回星盘。' +
    '</div></div>';
  return h;
};
})();
