/* ===========================================================
   00-util.js  —  通用工具
   =========================================================== */
var XX = window.XX || {};
window.XX = XX;

/* 从脚本 URL 里读出资源版本号，便于排查「跑的是不是新版」 */
XX.VER = (function(){
  try{
    var s = document.querySelector('script[src*="00-util"]');
    var m = s && s.src.match(/[?&]v=(\w+)/);
    return m ? m[1] : '0';
  }catch(e){ return '0'; }
})();

XX.U = {
  /* 随机 */
  rnd: function(a, b){ return a + Math.random() * (b - a); },
  ri:  function(a, b){ return Math.floor(a + Math.random() * (b - a + 1)); },
  pick:function(arr){ return arr[Math.floor(Math.random() * arr.length)]; },
  chance: function(p){ return Math.random() < p; },
  shuffle: function(a){ a = a.slice(); for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;} return a; },
  clamp: function(v, a, b){ return v < a ? a : (v > b ? b : v); },
  lerp: function(a,b,t){ return a + (b-a)*t; },

  /* 大数格式化：万/亿/兆/京/垓 */
  fmt: function(n){
    if (n === undefined || n === null || isNaN(n)) return '0';
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + XX.U.fmt(-n);
    if (n < 10000) return n < 10 ? (Math.round(n*10)/10).toString() : Math.floor(n).toString();
    var units = [[1e20,'垓'],[1e16,'京'],[1e12,'兆'],[1e8,'亿'],[1e4,'万']];
    for (var i=0;i<units.length;i++){
      var v = units[i][0], u = units[i][1];
      if (n >= v){
        var x = n / v;
        return (x>=1000 ? x.toFixed(0) : x>=100 ? x.toFixed(1) : x.toFixed(2)) + u;
      }
    }
    return Math.floor(n).toString();
  },
  /* 百分比 */
  pct: function(x, d){ return (x*100).toFixed(d===undefined?1:d) + '%'; },
  signed: function(x, d){ var s = (x>=0?'+':''); return s + (Math.abs(x)<1? (x*100).toFixed(d===undefined?1:d)+'%' : XX.U.fmt(x)); },

  /* 时间 */
  fmtTime: function(sec){
    sec = Math.max(0, Math.floor(sec));
    var d = Math.floor(sec/86400), h = Math.floor(sec%86400/3600), m = Math.floor(sec%3600/60), s = sec%60;
    var out = [];
    if (d) out.push(d+'天');
    if (h) out.push(h+'时');
    if (m) out.push(m+'分');
    if (!d && !h) out.push(s+'秒');
    return out.join('');
  },
  fmtTimeShort: function(sec){
    sec = Math.max(0, Math.floor(sec));
    if (sec < 60) return sec + '秒';
    if (sec < 3600) return Math.floor(sec/60) + '分' + (sec%60) + '秒';
    return Math.floor(sec/3600) + '时' + Math.floor(sec%3600/60) + '分';
  },

  /* 生辰八字式日期 */
  gz: function(){
    var GAN = '甲乙丙丁戊己庚辛壬癸', ZHI = '子丑寅卯辰巳午未申酉戌亥';
    var t = new Date();
    var gi = (t.getFullYear() - 4) % 10, zi = (t.getFullYear() - 4) % 12;
    return GAN[(gi+10)%10] + ZHI[(zi+12)%12] + '年';
  },

  /* DOM */
  $:  function(s, r){ return (r||document).querySelector(s); },
  $$: function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); },
  esc: function(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); },
  el: function(tag, cls, html){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  },

  /* 提示条 */
  toast: function(msg, ms){
    var box = XX.U.$('#toasts'); if (!box) return;
    var t = XX.U.el('div','toast', msg);
    box.appendChild(t);
    setTimeout(function(){ t.classList.add('out'); setTimeout(function(){ t.remove(); }, 320); }, ms || 2000);
  },

  /* 加权抽取: list=[{w:..}], key 为权重字段名 */
  weighted: function(list, wkey){
    wkey = wkey || 'w';
    var tot = 0, i;
    for (i=0;i<list.length;i++) tot += (list[i][wkey] || 0);
    if (tot <= 0) return list[0];
    var r = Math.random() * tot;
    for (i=0;i<list.length;i++){ r -= (list[i][wkey]||0); if (r <= 0) return list[i]; }
    return list[list.length-1];
  },

  /* 软上限：knee 以内原样保留，超出部分只按 rate 计入。
     用于压住后期百分比加成的线性膨胀。 */
  soft: function(x, knee, rate){
    if (x <= knee) return x;
    return knee + (x - knee) * (rate === undefined ? 0.22 : rate);
  },

  /* 深拷贝（纯数据） */
  clone: function(o){ return JSON.parse(JSON.stringify(o)); }
};
