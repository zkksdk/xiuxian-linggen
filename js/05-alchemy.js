/* ===========================================================
   05-alchemy.js  —  炼丹（君臣佐使）/ 阵法（奇门遁甲）
   =========================================================== */
(function(){
var U = XX.U, D = XX.D, G = XX.G;

/* =====================  炼丹  ===================== */
D.PILL_QNAME = ['','下品','中品','上品','极品','完美'];

/* 丹药槽位：君 ×1 / 臣 ×2 / 佐 ×2 / 使 ×1 */
G.alchPreview = function(comp){
  var out = { ok:false, power:0, q:1, kind:null, el:null, year:0, steps:[], msg:'' };
  var jun = comp.jun ? D.HK[comp.jun] : null;
  if (!jun){ out.msg = '尚无君药——君臣佐使，君为药主'; return out; }
  var chen = (comp.chen||[]).filter(Boolean).map(function(k){ return D.HK[k]; }).filter(Boolean);
  var zuo  = (comp.zuo ||[]).filter(Boolean).map(function(k){ return D.HK[k]; }).filter(Boolean);
  var shi  = comp.shi ? D.HK[comp.shi] : null;

  out.kind = jun.pill;
  out.el = jun.el;
  var year = U.rnd(jun.y[0], jun.y[1]);
  out.year = Math.round(year);

  var power = jun.t * 3.0 + year/22;
  var step = [];
  step.push('君药 <b class="val">'+jun.n+'</b>（'+D.ROOT[jun.el].n+'·'+jun.t+'阶·'+out.year+'年）定其性为「'+D.PILLS[jun.pill].n+'」');

  // 臣：主增益
  var cm = 0;
  chen.forEach(function(h){
    var r = D.rel(h.el, jun.el);
    var add = r==='same'?0.28 : (r==='sheng'||r==='bei')?0.38 : (r==='ke'||r==='beke')?-0.32 : 0.06;
    cm += add;
    step.push('臣药 '+h.n+'（'+D.relName[r]+'）'+(add>0?'增益':'减损')+' '+Math.abs(Math.round(add*100))+'%');
  });
  // 佐：辅助且解毒
  var zm = 0;
  zuo.forEach(function(h){
    var r = D.rel(h.el, jun.el);
    var add = (r==='same'?0.18 : (r==='sheng'||r==='bei')?0.24 : (r==='ke'||r==='beke')?-0.18 : 0.05);
    zm += add;
    step.push('佐药 '+h.n+'（'+D.relName[r]+'）'+(add>0?'增益':'减损')+' '+Math.abs(Math.round(add*100))+'%');
  });
  // 使：引导
  var sm = 0;
  if (shi){
    var r2 = D.rel(shi.el, jun.el);
    sm = (r2==='same'?0.22 : (r2==='sheng'||r2==='bei')?0.30 : (r2==='ke'||r2==='beke')?-0.20 : 0.05);
    step.push('使药 '+shi.n+'（'+D.relName[r2]+'）引药归经，'+(sm>0?'增效':'减效')+' '+Math.abs(Math.round(sm*100))+'%');
  } else {
    step.push('无使药引经，药力难以直达。');
  }
  var mul = (1 + cm) * (1 + zm*0.7) * (1 + sm);
  if (mul < 0.2) mul = 0.2;
  power *= mul * G.alchPower();
  out.power = power;
  // 品质：综合「君药阶数 + 年份 + 配伍增益 + 丹道造诣」
  var score = (jun.t - 1) * 2
            + Math.min(year, 200) / 60
            + (mul - 1) * 2.2
            + (G.alchPower() - 1) * 2;
  out.score = score;
  var q = 1;
  if (score >= 1.6) q = 2;
  if (score >= 3.2) q = 3;
  if (score >= 5.0) q = 4;
  if (score >= 7.4) q = 5;
  out.q = U.clamp(q, 1, 5);
  out.steps = step;
  out.ok = true;
  return out;
};

G.alch = function(comp){
  var pv = G.alchPreview(comp);
  if (!pv.ok){ XX.UI.toast(pv.msg); return null; }
  // 校验材料
  var need = {};
  ['jun'].forEach(function(s){ if (comp[s]) need[comp[s]] = (need[comp[s]]||0)+1; });
  ['chen','zuo'].forEach(function(s){ (comp[s]||[]).forEach(function(k){ if(k) need[k]=(need[k]||0)+1; }); });
  if (comp.shi) need[comp.shi] = (need[comp.shi]||0)+1;
  for (var k in need){ if (G.itemCount('herb', k) < need[k]){ XX.UI.toast('灵草不足：'+D.HK[k].n); return null; } }
  for (var k2 in need) G.useItem('herb', k2, need[k2]);

  G.stats.pills++;
  var pill = {
    id: 'P' + Date.now() + Math.floor(Math.random()*1000),
    name: D.PILL_QNAME[pv.q] + D.PILLS[pv.kind].n,
    kind: pv.kind, q: pv.q, power: pv.power, el: pv.el, year: pv.year
  };
  G.customPills.push(pill);
  G.log('炼成 <b class="val">'+pill.name+'</b>（药力 '+pv.power.toFixed(2)+'）');
  XX.UI && XX.UI.alchResult && XX.UI.alchResult(pill, pv);
  return pill;
};

/* 服用成品丹 */
G.usePill = function(pillId, arg){
  var idx = -1;
  for (var i=0;i<G.customPills.length;i++) if (G.customPills[i].id === pillId) idx = i;
  if (idx < 0) return;
  var p = G.customPills[idx];
  var q = p.q;
  var msg = '';
  if (p.kind === 'qi'){
    var amt = G.stepCost() * (0.10 + 0.08*q);
    G.qi += amt;
    msg = '修为 +<b class="val">'+U.fmt(amt)+'</b>（约当层 '+Math.round((0.10+0.08*q)*100)+'%）';
  } else if (p.kind === 'break'){
    G.addBuff('atk', 0.10*q, 420, '破障丹'); G.addBuff('def', 0.10*q, 420, '破障丹');
    G.flags.pillBreak = 1;
    msg = '药力灌体，战力大涨（攻防 +'+Math.round(10*q)+'%，7分钟）';
  } else if (p.kind === 'heal'){
    G.heart = Math.min(G.maxHeart(), G.heart + 10*q);
    G._wound = 0;
    msg = '道心 +'+ (10*q) +'，伤势尽复';
  } else if (p.kind === 'wash'){
    var target = arg;
    if (!target){
      XX.UI.askRoot('洗灵丹 · 请选择要洗涤的灵根', function(k){ G.usePill(pillId, k); },
        function(){ XX.UI.toast('未选择灵根，丹药未服下'); });
      return;
    }
    G.addPurity(target, -(3 + 2.5*q));
    msg = D.ROOT[target].n + '灵根纯度下降 ' + (3+2.5*q).toFixed(1);
  } else if (p.kind === 'body'){
    G.hpPermanent += 0.015*q; G.atkPermanent += 0.008*q;
    msg = '根基永久提升：气血 +'+Math.round(1.5*q)+'%，攻击 +'+(0.8*q).toFixed(1)+'%';
  } else if (p.kind === 'cult'){
    G.addBuff('cult', 0.30*q, 300, '悟道丹');
    msg = '修炼速度 +'+Math.round(30*q)+'%（5分钟）';
  }
  G.customPills.splice(idx,1);
  G.recalc();
  G.log('服下 <b class="val">'+p.name+'</b>：'+msg);
  XX.UI.toast(msg.replace(/<[^>]+>/g,''));
  if (XX.UI.afterUsePill) XX.UI.afterUsePill();     // 刷新界面并关掉已失效的详情弹窗
};

/* 服用预设丹（事件掉落） */
G.usePresetPill = function(key, n){
  n = n||1;
  var p = D.PILL_PRESET[key]; if (!p) return;
  if (!G.useItem('pill', key, n)) return;
  var msg = '';
  if (p.kind === 'qi'){ var amt = G.stepCost()*0.16*n; G.qi += amt; msg = '修为 +'+U.fmt(amt); }
  else if (p.kind === 'break'){ G.addBuff('atk',0.08*n,300,'破障丹'); msg='战力小涨'; }
  else if (p.kind === 'heal'){ G.heart = Math.min(G.maxHeart(), G.heart+6*n); msg='道心 +'+(6*n); }
  else if (p.kind === 'body'){ G.hpPermanent += 0.008*n; msg='气血永久 +'+(0.8*n).toFixed(1)+'%'; }
  else if (p.kind === 'cult'){ G.addBuff('cult',0.25*n,240,'悟道丹'); msg='修炼 +'+Math.round(25*n)+'%（4分钟）'; }
  else if (p.kind === 'wash'){ var t = G.mainRoot(); G.addPurity(t, -2*n); msg = D.ROOT[t].n+'灵根 -'+(2*n); }
  G.recalc();
  G.log('服下 '+p.n+'：'+msg);
  XX.UI.toast(msg);
  if (XX.UI.afterUsePill) XX.UI.afterUsePill();
};

/* =====================  阵法  ===================== */
D.MEN8 = [
  {k:'xiu', n:'休门', el:'shui', desc:'休养生息，增益修炼'},
  {k:'sheng',n:'生门', el:'mu',  desc:'生机勃发，增益产出'},
  {k:'shang',n:'伤门', el:'jin', desc:'杀伐之门，增益攻击'},
  {k:'du',  n:'杜门', el:'tu',   desc:'闭藏固守，增益防御'},
  {k:'jing',n:'景门', el:'huo',  desc:'光明之象，增益机缘'},
  {k:'si',  n:'死门', el:'an',   desc:'绝灭之门，威能极强亦是极险'},
  {k:'jing2',n:'惊门',el:'lei',  desc:'惊变之象，暴击大涨'},
  {k:'kai', n:'开门', el:'guang',desc:'通达四方，全属性增益'}
];
D.MK = {}; D.MEN8.forEach(function(m){ D.MK[m.k] = m; });

D.GONG9 = [
  {k:'qian', n:'乾宫', el:'jin',  z:'西北'},
  {k:'kan',  n:'坎宫', el:'shui', z:'正北'},
  {k:'gen',  n:'艮宫', el:'tu',   z:'东北'},
  {k:'zhen', n:'震宫', el:'mu',   z:'正东'},
  {k:'xun',  n:'巽宫', el:'feng', z:'东南'},
  {k:'li',   n:'离宫', el:'huo',  z:'正南'},
  {k:'kun',  n:'坤宫', el:'tu',   z:'西南'},
  {k:'dui',  n:'兑宫', el:'jin',  z:'正西'},
  {k:'zhong',n:'中宫', el:'tu',   z:'中央'}
];
D.GK = {}; D.GONG9.forEach(function(g){ D.GK[g.k] = g; });

D.GAN10 = [
  {k:'jia', n:'甲', el:'mu'}, {k:'yi',  n:'乙', el:'mu'},
  {k:'bing',n:'丙', el:'huo'},{k:'ding',n:'丁', el:'huo'},
  {k:'wu',  n:'戊', el:'tu'}, {k:'ji',  n:'己', el:'tu'},
  {k:'geng',n:'庚', el:'jin'},{k:'xin', n:'辛', el:'jin'},
  {k:'ren', n:'壬', el:'shui'},{k:'gui', n:'癸', el:'shui'}
];
D.GANK = {}; D.GAN10.forEach(function(g){ D.GANK[g.k] = g; });

D.FORMS = [
  {k:'juling', n:'聚灵阵', el:'mu',   base:1.00, eff:{cult:0.25}, desc:'修炼速度 +25%/级'},
  {k:'hushan', n:'护山阵', el:'tu',   base:0.95, eff:{def:0.14, hp:0.10}, desc:'防御气血 +14%/级'},
  {k:'shalu',  n:'杀阵',   el:'jin',  base:0.95, eff:{atk:0.18}, desc:'攻击 +18%/级'},
  {k:'mizhen', n:'迷阵',   el:'shui', base:0.95, eff:{luck:0.14}, desc:'机缘 +14%/级'},
  {k:'jubao',  n:'聚宝阵', el:'huo',  base:0.95, eff:{sect:0.22}, desc:'宗门产出 +22%/级'},
  {k:'shizhen',n:'锁妖阵', el:'lei',  base:0.90, eff:{all:0.05}, desc:'全属性 +5%/级'},
  {k:'wuxing', n:'五行大阵',el:'any', base:0.80, eff:{all:0.08}, desc:'全属性 +8%/级（极难）'}
];
D.FORMK = {}; D.FORMS.forEach(function(f){ D.FORMK[f.k] = f; });

/* 推演 */
G.formPreview = function(formK, gongK, ganK){
  var o = { ok:false, score:0, lv:0, rate:'', msg:'', cost:0 };
  var f = D.FORMK[formK], g = D.GK[gongK], gn = D.GANK[ganK];
  if (!f||!g||!gn) return o;
  var sc = f.base;
  var notes = [];
  // 宫 与 干
  var r1 = D.rel(g.el, gn.el);
  if (r1 === 'same'){ sc += 0.25; notes.push('宫干同属，气机相合 +25%'); }
  else if (r1 === 'sheng' || r1 === 'bei'){ sc += 0.45; notes.push('宫干相生，如虎添翼 +45%'); }
  else if (r1 === 'ke' || r1 === 'beke'){ sc -= 0.35; notes.push('宫干相克，气机相冲 -35%'); }
  else notes.push('宫干无关，平平 +0%');
  // 阵 与 宫
  if (f.el === 'any'){ sc -= 0.10; notes.push('五行大阵，无所依凭 -10%'); }
  else {
    var r2 = D.rel(f.el, g.el);
    if (r2 === 'same'){ sc += 0.30; notes.push('阵宫同属，根基稳固 +30%'); }
    else if (r2 === 'sheng' || r2 === 'bei'){ sc += 0.20; notes.push('阵宫相生，运转顺畅 +20%'); }
    else if (r2 === 'ke' || r2 === 'beke'){ sc -= 0.25; notes.push('阵宫相克，阵纹难成 -25%'); }
  }
  sc += (G.formPower() - 1) * 0.6;
  sc += U.rnd(-0.06, 0.06);
  o.score = sc;
  o.notes = notes;
  o.cost = Math.floor(300 * Math.pow(1.6, G.node/3));
  if (sc < 0.85){ o.ok = false; o.msg = '推演不谐，天地之气驳杂，恐难成阵。'; o.lv = 0; }
  else {
    o.lv = U.clamp(Math.round(sc * 2.6), 1, 5);
    o.ok = true;
    o.msg = '推演成功，可成 ' + o.lv + ' 级阵法。';
  }
  return o;
};
G.builFormation = function(formK, gongK, ganK){
  var pv = G.formPreview(formK, gongK, ganK);
  if (!pv.ok){ XX.UI.toast(pv.msg); return; }
  if (G.spirit < pv.cost){ XX.UI.toast('灵石不足（需 '+U.fmt(pv.cost)+'）'); return; }
  G.addSpirit(-pv.cost);
  G.stats.forms++;
  var f = D.FORMK[formK];
  var cur = G.arrays[formK];
  if (cur && cur.lv >= pv.lv){ XX.UI.toast('现有阵法（'+cur.lv+'级）不弱于此阵，无需更换'); return; }
  G.arrays[formK] = { lv: pv.lv, power: pv.score, gong: gongK, gan: ganK, el:f.el };
  G.log('布下 <b class="val">'+f.n+'</b>（'+pv.lv+'级）——'+f.desc.replace('/级','×'+pv.lv));
  G.recalc();
  XX.UI.toast('布阵成功：' + f.n + ' ' + pv.lv + '级');
};
G.formEff = function(){
  var out = { atk:0, def:0, hp:0, cult:0, luck:0, sect:0, all:0 };
  for (var k in G.arrays){
    var f = D.FORMK[k]; if (!f) continue;
    var lv = G.arrays[k].lv || 1;
    for (var e in out) if (f.eff[e]) out[e] += f.eff[e] * lv;
  }
  return out;
};
})();
