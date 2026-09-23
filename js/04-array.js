/* ===========================================================
   04-array.js  —  灵阵构筑（12 阵眼） + 炼器
   =========================================================== */
(function(){
var U = XX.U, D = XX.D, G = XX.G;

/* ============ 灵阵：装 / 卸 ============ */
G.equipTreasure = function(nodeIdx, tid){
  var t = G.treasureById(tid);
  if (!t) return;
  // 一件法宝只能出现在一个地方：先卸下它在别处的占用
  for (var i=0;i<12;i++) if (G.slots[i] === tid) G.slots[i] = null;
  if (G.equip) D.EQ_SLOTS.forEach(function(s){ if (G.equip[s.k] === tid) G.equip[s.k] = null; });
  G.slots[nodeIdx] = tid;
  var nd = D.NODES12[nodeIdx];
  var rel = (nd.el === 'any') ? 'any' : D.rel(t.el, nd.el);
  var tip = { any:'中宫纳万法，事半功倍', same:'同属相合，如虎添翼', sheng:'相生为助', bei:'相生为助', ke:'相克，效力大减', beke:'受克，效力大减', '':'五行无关，平平无奇' }[rel];
  G.log('法宝 <b class="val">'+t.name+'</b> 嵌入 <b class="val">'+nd.z+'</b> 位——'+tip);
  G.recalc();
};
G.unequip = function(nodeIdx){
  G.slots[nodeIdx] = null;
  G.recalc();
};
G.sellTreasure = function(tid){
  var t = G.treasureById(tid);
  if (!t) return;
  var val = Math.floor(40 * t.power * (1 + G.node*0.3));
  G.treasures = G.treasures.filter(function(x){ return x.id !== tid; });
  for (var i=0;i<12;i++) if (G.slots[i] === tid) G.slots[i] = null;
  G.addSpirit(val);
  G.log('售出法宝 <b class="val">'+t.name+'</b>，得灵石 '+U.fmt(val));
  G.recalc();
};
/* 一键最优镶嵌 */
G.autoFillArray = function(){
  var used = {};
  G.slots.forEach(function(id){ if (id) used[id] = 1; });
  var free = [];
  for (var i=0;i<12;i++) if (!G.slots[i]) free.push(i);
  var pool = G.treasures.filter(function(t){ return !used[t.id] && !t.lock; }).sort(function(a,b){ return b.power - a.power; });
  for (var p=0; p<pool.length && free.length; p++){
    var t = pool[p], best = free[0], bestScore = -1;
    free.forEach(function(fi){
      var nd = D.NODES12[fi];
      var rel = (nd.el === 'any') ? 'any' : D.rel(t.el, nd.el);
      var fit = rel==='any'?1.20 : rel==='same'?1.28 : (rel==='sheng'||rel==='bei')?1.12 : (rel==='ke'||rel==='beke')?0.78 : 1.0;
      // 相邻加成
      var extra = 0;
      D.NODE_ADJ[fi].forEach(function(nb){
        if (!G.slots[nb]) return;
        var tb = G.treasureById(G.slots[nb]); if (!tb) return;
        var r = D.rel(t.el, tb.el);
        if (r==='sheng'||r==='bei') extra += 0.07; else if (r==='same') extra += 0.035; else if (r==='ke'||r==='beke') extra -= 0.07;
      });
      var sc = t.power * fit * (1+extra);
      if (sc > bestScore){ bestScore = sc; best = fi; }
    });
    G.slots[best] = t.id;
    free.splice(free.indexOf(best),1);
  }
  G.recalc();
  XX.UI.toast('已按五行推演自动布阵');
};
G.clearArray = function(){
  for (var i=0;i<12;i++) G.slots[i] = null;
  G.recalc();
};
/* 阵势评估文本 */
G.arraySummary = function(){
  var ad = G.arrayDetail();
  var filled = G.slots.filter(function(x){ return !!x; }).length;
  var same = 0, sheng = 0, ke = 0, wild = 0;
  for (var i=0;i<12;i++){
    if (!G.slots[i]) continue;
    var t = G.treasureById(G.slots[i]); if (!t) continue;
    var nd = D.NODES12[i];
    if (nd.el === 'any'){ wild++; continue; }
    var r = D.rel(t.el, nd.el);
    if (r === 'same') same++;
    else if (r === 'sheng' || r === 'bei') sheng++;
    else if (r === 'ke' || r === 'beke') ke++;
  }
  return { filled:filled, same:same, sheng:sheng, ke:ke, wild:wild, adj:ad.adj, mult:ad.mult, P:ad.total };
};

/* ============ 炼器 ============ */
D.FIRE = [
  { k:'wen',   n:'文火',   els:['mu','shui','tu'],      desc:'温养慢炼，成器精纯（木/水/土 亲和）' },
  { k:'wu',    n:'武火',   els:['huo','jin','lei'],     desc:'猛火急煅，锋锐逼人（火/金/雷 亲和）' },
  { k:'wenwu', n:'文武火', els:['feng','guang','an'],   desc:'刚柔并济，可出奇宝（风/光/暗 亲和）' }
];
D.FIREK = {};
D.FIRE.forEach(function(f){ D.FIREK[f.k] = f; });

G.forgePreview = function(k1,k2,k3,fireK){
  var out = { rel:[], bonus:0, fire:0, lv:0, el:null, ok:false, msg:'' };
  if (!k1 || !k2 || !k3){ out.msg = '需选择主料、辅料与引材'; return out; }
  var o1 = D.OK[k1], o2 = D.OK[k2], o3 = D.OK[k3];
  if (!o1||!o2||!o3){ out.msg = '材料错误'; return out; }
  out.el = o1.el;
  var pairs = [[o1,o2],[o1,o3],[o2,o3]];
  var bonus = 0;
  pairs.forEach(function(p){
    var r = D.rel(p[0].el, p[1].el);
    out.rel.push({ a:p[0].el, b:p[1].el, r:r });
    if (r==='sheng'||r==='bei') bonus += 1.1;
    else if (r==='same') bonus += 0.6;
    else if (r==='ke'||r==='beke') bonus -= 0.8;
  });
  out.bonus = bonus;
  var f = D.FIREK[fireK];
  out.fire = f && f.els.indexOf(o1.el) >= 0 ? 1 : 0;
  var tierBonus = (o1.t-1)*0.95 + (o2.t-1)*0.55 + (o3.t-1)*0.40;
  out.lv = Math.round(bonus*0.85 + out.fire + tierBonus + (G.forgePower()-1));
  out.ok = true;
  out.msg = (out.fire ? '火候相合！' : '火候不合，事倍功半。') + (bonus>1.5?'　五行贯通，宝光内蕴。':bonus<0?'　五行相冲，恐难成形。':'');
  return out;
};

/* 灵材烙印继承：材料只提供「词条类型」，数值在此刻按 类型+阶位+品质 现算
   继承来的词条不占「天生词条」的名额，最多额外 2 条 */
G.infuseForge = function(t, mats, pv){
  var quality = 1 + (pv.fire ? 0.25 : 0) + (G.forgePower() - 1) * 0.3 + (pv.bonus > 1.2 ? 0.15 : 0);
  var baseP = 0.26 + (pv.fire ? 0.13 : 0) + G.buildingLv('qifang') * 0.018 + (G.rebirth.stars.luck || 0) * 0.02;
  var got = [], from = [], chanceInfo = [];
  mats.forEach(function(k){
    var o = D.OK[k]; if (!o) return;
    var p = U.clamp(baseP + o.t * 0.045, 0, 0.78);
    var types = G.matAffix(k);
    chanceInfo.push({ n:o.n, t:o.t, types:types, p:p });
    types.forEach(function(typeKey){
      if (got.length >= 2) return;
      if (got.indexOf(typeKey) >= 0) return;
      if (t.affixes.some(function(a){ return a.k === typeKey; })) return;
      if (!U.chance(p)) return;
      var v = D.rollMatAffix(typeKey, o.t, quality);
      if (v === null) return;
      var a = D.AFK[typeKey];
      got.push(typeKey);
      from.push(o.n);
      t.affixes.push({ k:typeKey, n:a.n, v:v, fmt:a.fmt, desc:a.desc, infuse:true, from:o.n });
    });
  });
  if (got.length) t.power = D.gv(t.g, t.s) * (1 + t.affixes.length * 0.22);
  return { got: got, from: from, info: chanceInfo };
};

G.forge = function(k1,k2,k3,fireK){
  var pv = G.forgePreview(k1,k2,k3,fireK);
  if (!pv.ok){ XX.UI.toast(pv.msg); return null; }
  if (!G.useItem('ore',k1,1) || !G.useItem('ore',k2,1) || !G.useItem('ore',k3,1)){
    XX.UI.toast('材料不足'); return null;
  }
  G.stats.forges++;
  var extraAffix = pv.bonus > 1.8 ? 1 : 0;
  var sig = G.sigFromForge(k1, k2, k3, fireK);      // 机缘签名：材料驱动
  sig.tier = Math.max(0, (sig.tier || 0) + Math.max(-1, pv.lv) * 0.30);
  sig.affix = (sig.affix || 0) + extraAffix;
  sig.sp = pv.fire * 0.09;
  var t = G.genTreasure(sig);
  pv.sig = sig;
  pv.infuse = G.infuseForge(t, [k1,k2,k3], pv);      // 灵材烙印继承
  G.addTreasure(t);
  var q = D.gradeName(t.g, t.s);
  XX.UI.toast('炼成 ' + t.name + '（' + q + '）' + (pv.infuse.got.length ? ' 继承烙印 '+pv.infuse.got.length+' 条' : ''));
  XX.UI && XX.UI.forgeResult && XX.UI.forgeResult(t, pv);
  return t;
};

/* 预览：这批料大概能继承几条 */
G.forgeInfusePreview = function(k1,k2,k3,fireK){
  var pv = G.forgePreview(k1,k2,k3,fireK);
  if (!pv.ok) return { n:0, list:[] };
  var baseP = 0.27 + (pv.fire ? 0.13 : 0) + G.buildingLv('qifang') * 0.018 + (G.rebirth.stars.luck || 0) * 0.02;
  var list = [], seen = {};
  [k1,k2,k3].forEach(function(k){
    var o = D.OK[k]; if (!o) return;
    var p = U.clamp(baseP + o.t * 0.045, 0, 0.78);
    G.matAffix(k).forEach(function(tp){
      if (seen[tp]) return;
      seen[tp] = 1;
      list.push({ type:tp, name: D.AFK[tp] ? D.AFK[tp].n : tp, tier:o.t, p:p, from:o.n });
    });
  });
  list.sort(function(a,b){ return b.p - a.p; });
  return { n: Math.min(2, list.length), list: list.slice(0, 4) };
};

/* 精炼：消耗同属性矿石提升法宝 */
G.refineCost = function(t){ return { ore: 2, spirit: Math.floor(80 * t.power * (1 + G.node*0.2)) }; };
G.refine = function(tid){
  var t = G.treasureById(tid); if (!t) return;
  var c = G.refineCost(t);
  if (G.spirit < c.spirit){ XX.UI.toast('灵石不足（需 '+U.fmt(c.spirit)+'）'); return; }
  // 找两枚同属性矿石
  var cands = Object.keys(G.bag.ore).filter(function(k){ return D.OK[k] && D.OK[k].el === t.el && G.bag.ore[k] >= 1; });
  var need = 2, avail = 0;
  cands.forEach(function(k){ avail += G.bag.ore[k]; });
  if (avail < need){ XX.UI.toast('需 2 枚 '+D.ROOT[t.el].n+' 属性矿石'); return; }
  G.addSpirit(-c.spirit);
  var left = need;
  cands.forEach(function(k){ while (left>0 && G.bag.ore[k] > 0){ G.useItem('ore',k,1); left--; } });
  if (t.s < 3){ t.s += 1; }
  else if (t.g < 11){ t.g += 1; t.s = 0; }
  else { XX.UI.toast('已至仙品极位，无法再精炼'); }
  t.power = D.gv(t.g, t.s) * (1 + t.affixes.length*0.22);
  G.log('精炼 <b class="val">'+t.name+'</b> → <span class="tag gold">'+D.gradeName(t.g,t.s)+'</span>');
  G.recalc();
  XX.UI.toast('精炼成功：' + D.gradeName(t.g,t.s));
};
})();
