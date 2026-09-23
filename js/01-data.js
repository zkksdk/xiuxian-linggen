/* ===========================================================
   01-data.js  —  全部静态数据表
   =========================================================== */
(function(){
var U = XX.U;
var D = XX.D = {};

/* ---------------- 九灵根 ---------------- */
D.ROOTS = [
  {k:'jin',  n:'金', c:'#c9a227', desc:'锋锐肃杀，攻伐第一'},
  {k:'mu',   n:'木', c:'#5f9e63', desc:'生发不息，滋养万物'},
  {k:'shui', n:'水', c:'#4f86b8', desc:'润下不争，绵长悠远'},
  {k:'huo',  n:'火', c:'#c2603f', desc:'炎上炽烈，焚尽一切'},
  {k:'tu',   n:'土', c:'#a8895a', desc:'厚德载物，坚如磐石'},
  {k:'feng', n:'风', c:'#59a99b', desc:'无拘无束，来去无踪', rare:true},
  {k:'lei',  n:'雷', c:'#7d6cc0', desc:'天威煌煌，破邪诛恶', rare:true},
  {k:'guang',n:'光', c:'#c9a145', desc:'照破万象，净化诸邪', rare:true},
  {k:'an',   n:'暗', c:'#5a5080', desc:'吞噬一切，万法归寂', rare:true}
];
D.RK = D.ROOTS.map(function(r){ return r.k; });
D.ROOT = {};
D.ROOTS.forEach(function(r,i){ D.ROOT[r.k] = r; r.i = i; });
/* 属性名/色（兼容 "wuxing" 五行转化 这一虚拟属性） */
D.elName  = function(k){ return k === 'wuxing' ? '五行转化' : (D.ROOT[k] ? D.ROOT[k].n : '无'); };
D.elColor = function(k){ return k === 'wuxing' ? '#e7d3a2' : (D.ROOT[k] ? D.ROOT[k].c : '#8b8574'); };

/* 相生：X 生 Y  /  相克：X 克 Y */
D.SHENG = { jin:'shui', shui:'mu', mu:'huo', huo:'tu', tu:'jin', feng:'lei', lei:'guang', guang:'an', an:'feng' };
D.KE    = { jin:'mu',   mu:'tu',   tu:'shui', shui:'huo', huo:'jin', guang:'an', an:'guang', lei:'feng', feng:'lei' };
/* 相克对立对（用于冲突检测） */
D.CONFLICTS = [['jin','mu'],['mu','tu'],['tu','shui'],['shui','huo'],['huo','jin'],['guang','an'],['lei','feng']];

/* 关系判定：返回 'sheng'(a生b) / 'bei'(b生a) / 'ke'(a克b) / 'beke'(b克a) / 'same' / '' */
D.rel = function(a, b){
  if (!a || !b) return '';
  if (a === b) return 'same';
  if (D.SHENG[a] === b) return 'sheng';
  if (D.SHENG[b] === a) return 'bei';
  if (D.KE[a] === b) return 'ke';
  if (D.KE[b] === a) return 'beke';
  return '';
};
D.relName = { sheng:'相生', bei:'相生', ke:'相克', beke:'受克', same:'同属', '':'无关' };

/* ---------------- 境界体系 ---------------- */
D.REALMS = [
  {n:'淬体', d:'凡人之躯，初感灵气',   br:['体修','气修']},
  {n:'炼气', d:'引气入体，可施法术',   br:['剑修','符修','丹修']},
  {n:'筑基', d:'道基初成，寿元延长',   br:['正道筑基','魔道筑基']},
  {n:'金丹', d:'凝结金丹，实力质变',   br:null},
  {n:'元婴', d:'元婴出窍，离体作战',   br:['战斗元婴','辅助元婴','探索元婴']},
  {n:'化神', d:'神识覆盖，感悟天地',   br:['五行法则','时空法则','因果法则']},
  {n:'炼虚', d:'虚空之力，开辟洞天',   br:['灵田洞天','丹火洞天','兵戈洞天']},
  {n:'合体', d:'天人合一，大能之境',   br:null},
  {n:'大乘', d:'修仙巅峰，准备飞升',   br:null},
  {n:'渡劫', d:'天劫考验，成败在此',   br:null}
];
D.STAGES = ['前期','中期','后期'];
D.MAXNODE = 29;                       // 0..29 共 30 个节点
D.realmOf = function(node){ return D.REALMS[Math.floor(node/3)]; };
D.nodeName = function(node){
  var r = D.realmOf(node);
  return r.n + D.STAGES[node % 3];
};

/* 突破分支效果表 */
D.BRANCHES = {
  '体修':   {desc:'肉身强横，气血如龙', eff:{hp:0.45, def:0.30, atk:0.08}, tag:'jade'},
  '气修':   {desc:'灵气亲和，吐纳如潮', eff:{cult:0.30, atk:0.18}, tag:'cyan'},
  '剑修':   {desc:'一剑破万法，攻伐无双', eff:{atk:0.35, crit:0.06}, tag:'cinn'},
  '符修':   {desc:'符箓随身，变化万端', eff:{all:0.10, cult:0.12}, tag:'gold'},
  '丹修':   {desc:'丹道通神，药力绵长', eff:{alch:0.35, cult:0.15, heal:0.30}, tag:'jade'},
  '正道筑基':{desc:'根基稳固，道心坚凝', eff:{cult:0.18, heart:15, karmaGood:1}, tag:'gold'},
  '魔道筑基':{desc:'以魔证道，进境极速', eff:{cult:0.45, atk:0.25, heart:-12, karmaBad:1}, tag:'cinn'},
  '战斗元婴':{desc:'元婴执剑，战意滔天', eff:{atk:0.30, crit:0.05, cdmg:0.25}, tag:'cinn'},
  '辅助元婴':{desc:'元婴护身，万法不侵', eff:{def:0.35, hp:0.25, heal:0.35}, tag:'jade'},
  '探索元婴':{desc:'元婴游历，机缘自来', eff:{luck:0.40, spd:0.15}, tag:'cyan'},
  '五行法则':{desc:'参悟五行，生生不息', eff:{all:0.16}, tag:'gold'},
  '时空法则':{desc:'掌控时空，无往不利', eff:{spd:0.35, cult:0.35}, tag:'purple'},
  '因果法则':{desc:'了断因果，天劫不侵', eff:{tribulation:0.35, cult:0.20}, tag:'cyan'},
  '灵田洞天':{desc:'洞天灵田，药材自生', eff:{herb:0.6, cult:0.15}, tag:'jade'},
  '丹火洞天':{desc:'洞天丹火，百炼成丹', eff:{alch:0.5, forge:0.3}, tag:'cinn'},
  '兵戈洞天':{desc:'洞天兵戈，杀伐之地', eff:{atk:0.35, def:0.15}, tag:'cinn'}
};

/* 金丹品级（1 品最佳） */
D.JINDAN = ['九品','八品','七品','六品','五品','四品','三品','二品','一品'];
D.jindanName = function(g){ return D.JINDAN[9 - U.clamp(g || 1, 1, 9)]; };
D.jindanGrade = function(score){ // score 0..1 越高越好
  var g = 9 - Math.floor(U.clamp(score,0,1) * 9);   // 1..9
  return U.clamp(g, 1, 9);
};

/* ---------------- 功法（术法） ---------------- */
/* kind: passive 被动 / active 主动技 */
D.TECHS = [
  /* 金 */
  {id:'jin_a', n:'庚金剑气', el:'jin', req:15, kind:'active', pow:1.45, cd:2, desc:'凝金气为剑，斩落敌手', eff:{atk:0.10}},
  {id:'jin_p', n:'金刚不坏', el:'jin', req:35, kind:'passive', eff:{def:0.14, hp:0.10}},
  /* 木 */
  {id:'mu_a',  n:'春生诀',   el:'mu',  req:15, kind:'active', pow:0.9, cd:3, heal:0.28, desc:'万物回春，回复气血', eff:{heal:0.10}},
  {id:'mu_p',  n:'长生养元', el:'mu',  req:35, kind:'passive', eff:{cult:0.14, hp:0.12}},
  /* 水 */
  {id:'shui_a',n:'玄水缚',   el:'shui',req:15, kind:'active', pow:1.25, cd:3, debuff:{atk:-0.20, t:3}, desc:'水缚其身，削弱攻势', eff:{def:0.06}},
  {id:'shui_p',n:'润下不争', el:'shui',req:35, kind:'passive', eff:{cult:0.16, def:0.08}},
  /* 火 */
  {id:'huo_a', n:'焚天业火', el:'huo', req:15, kind:'active', pow:1.75, cd:3, desc:'业火焚天，灼烧神魂', eff:{atk:0.08}},
  {id:'huo_p', n:'炎上之势', el:'huo', req:35, kind:'passive', eff:{atk:0.18, crit:0.03}},
  /* 土 */
  {id:'tu_a',  n:'厚土壁',   el:'tu',  req:15, kind:'active', pow:0.7, cd:4, buff:{def:0.60, t:3}, desc:'凝土成壁，坚不可摧', eff:{def:0.08}},
  {id:'tu_p',  n:'坤元载物', el:'tu',  req:35, kind:'passive', eff:{hp:0.22, def:0.10}},
  /* 风 */
  {id:'feng_a',n:'裂风斩',   el:'feng',req:20, kind:'active', pow:1.35, cd:2, desc:'风刃无形，快若流光', eff:{spd:0.08}},
  {id:'feng_p',n:'御风而行', el:'feng',req:40, kind:'passive', eff:{spd:0.22, dodge:0.05}},
  /* 雷 */
  {id:'lei_a', n:'九霄雷印', el:'lei', req:20, kind:'active', pow:1.95, cd:4, desc:'引天雷加身，破邪诛恶', eff:{atk:0.08}},
  {id:'lei_p', n:'雷音淬体', el:'lei', req:40, kind:'passive', eff:{atk:0.16, spd:0.10}},
  /* 光 */
  {id:'guang_a',n:'大日金轮',el:'guang',req:20, kind:'active', pow:1.55, cd:3, heal:0.18, desc:'金轮普照，疗伤净邪', eff:{heal:0.10}},
  {id:'guang_p',n:'曦光护体',el:'guang',req:40, kind:'passive', eff:{def:0.16, heart:8}},
  /* 暗 */
  {id:'an_a',  n:'噬魂阴火', el:'an',  req:20, kind:'active', pow:1.65, cd:3, drain:0.35, desc:'阴火噬魂，汲取生机', eff:{atk:0.06}},
  {id:'an_p',  n:'幽冥无相', el:'an',  req:40, kind:'passive', eff:{crit:0.06, cdmg:0.20}},
  /* 特殊（奇遇/轮回获得） */
  {id:'sp_taixu', n:'太虚御剑术', el:'any', req:0, sp:true, kind:'active', pow:2.30, cd:3, desc:'御剑千里，取敌首级', eff:{atk:0.15}},
  {id:'sp_bujie', n:'不灭金身',   el:'any', req:0, sp:true, kind:'passive', eff:{hp:0.30, def:0.18}},
  {id:'sp_hundun',n:'混沌一气',   el:'any', req:0, sp:true, kind:'passive', eff:{all:0.14, cult:0.30}},
  {id:'sp_wuxing',n:'五行归元',   el:'any', req:0, sp:true, kind:'passive', eff:{all:0.12}},
  {id:'sp_zhanxian',n:'斩仙飞刀', el:'any', req:0, sp:true, kind:'active', pow:3.10, cd:6, desc:'一斩之下，仙人亦殒', eff:{crit:0.08}},
  {id:'sp_changchun',n:'长春不老功', el:'any', req:0, sp:true, kind:'passive', eff:{cult:0.40, heal:0.30}}
];
D.TK = {};
D.TECHS.forEach(function(t){ D.TK[t.id] = t; });
/* 参悟等级效果：每级 +12% 效果，最高 5 级 */
D.TECH_LVMAX = 5;

/* ---------------- 法宝品级 ---------------- */
D.GRADES = ['黄','玄','地','天','灵','君','王','皇','尊','圣','帝','仙'];
D.SUBS = ['下','中','上','极'];
D.gradeName = function(g, s){ return D.GRADES[g] + D.SUBS[s]; };
/* 品级灵力系数 */
D.gv = function(g, s){
  return Math.pow(1.34, g) * (1 + s * 0.14);
};

/* ---------------- 法宝词条池 ----------------
   设计原则：战斗四维（攻/防/血/速）用**数值**，不做百分比叠乘，避免后期膨胀；
   只有暴击/暴伤/闪避这类"本身就是比例"的属性，以及丹器阵等机制加成，才用少量百分比。 */
D.AFFIX = [
  {k:'atk',  n:'锋锐', v:[10,26],      fmt:'flat', desc:'攻击'},
  {k:'def',  n:'坚壁', v:[7,17],       fmt:'flat', desc:'防御'},
  {k:'hp',   n:'厚土', v:[140,340],    fmt:'flat', desc:'气血'},
  {k:'spd',  n:'轻灵', v:[0.7,1.8],    fmt:'flat', desc:'速度'},
  {k:'mix',  n:'混元', v:[6,16],       fmt:'flat', desc:'全属性'},
  {k:'crit', n:'洞玄', v:[0.008,0.022],fmt:'pct',  desc:'暴击'},
  {k:'cdmg', n:'裂天', v:[0.03,0.075], fmt:'pct',  desc:'暴伤'},
  {k:'dodge',n:'化影', v:[0.005,0.014],fmt:'pct',  desc:'闪避'},
  {k:'cult', n:'通玄', v:[0.02,0.05],  fmt:'pct',  desc:'修炼'},
  {k:'luck', n:'福缘', v:[0.01,0.03],  fmt:'pct',  desc:'机缘'},
  {k:'alch', n:'丹心', v:[0.02,0.05],  fmt:'pct',  desc:'炼丹'},
  {k:'forg', n:'匠心', v:[0.02,0.05],  fmt:'pct',  desc:'炼器'},
  {k:'form', n:'阵理', v:[0.02,0.05],  fmt:'pct',  desc:'阵法'},
  {k:'sect', n:'山门', v:[0.02,0.05],  fmt:'pct',  desc:'宗门'},
  {k:'heal', n:'生生', v:[0.02,0.06],  fmt:'pct',  desc:'回复'},
  {k:'karma',n:'因果', v:[-6,6],       fmt:'flat', desc:'因果'},
  {k:'heart',n:'道心', v:[2,6],        fmt:'flat', desc:'道心'}
];
D.AFK = {};
D.AFFIX.forEach(function(a){ D.AFK[a.k] = a; });

/* 词条释义（优先取实例自带，其次回表查；兼容旧存档缺字段的情况） */
D.affixDesc = function(a){
  if (!a) return '';
  if (a.desc) return a.desc;
  if (a.sp && D.SPK[a.k]) return D.SPK[a.k].desc;
  if (D.AFK[a.k]) return D.AFK[a.k].desc;
  return '';
};

/* 稀有/特殊词条（炼器时低概率出现） */D.SPECIAL = [
  {k:'wuxing', n:'五行转化', desc:'将自身属性视为克制对方', rare:1},
  {k:'drain',  n:'吞噬',     desc:'造成伤害的 15% 转为气血', rare:1.2},
  {k:'thorn',  n:'反噬',     desc:'受击反弹 25% 伤害', rare:1.2},
  {k:'double', n:'叠浪',     desc:'18% 概率再行动一次', rare:0.8},
  {k:'burst',  n:'破军',     desc:'对方气血高于 60% 时伤害 +45%', rare:1},
  {k:'grow',   n:'生生不息', desc:'每回合攻击 +4%，可叠加', rare:0.8},
  {k:'seal',   n:'镇魂',     desc:'攻击附带 12% 眩晕（跳过对方一回合）', rare:0.8},
  {k:'dao',    n:'太上忘情', desc:'修炼速度 +25%', rare:1}
];
D.SPK = {};
D.SPECIAL.forEach(function(s){ D.SPK[s.k] = s; });

/* ---------------- 灵材烙印 ----------------
   材料只记两件事：**词条类型** + **物品品阶**，数值在「使用时」现算。
   这样同一块料每次炼出来的数值都不同，而类型是确定的。 */
D.MAT_AFFIX_POOL = ['atk','def','hp','spd','crit','cdmg','cult','luck','alch','forg','form','sect','heal','dodge'];

/* 按阶位决定烙印条数：1阶 0~1 条、2阶 1 条、3阶 1~2 条 */
D.matAffixCount = function(tier){
  if (tier <= 1) return Math.random() < 0.45 ? 1 : 0;
  if (tier === 2) return 1;
  return Math.random() < 0.55 ? 2 : 1;
};

/* 按「词条类型 + 阶位 + 品质」现算数值 */
D.tierMult = [0.5, 0.9, 1.5, 2.2];      // 阶位倍率
D.rollMatAffix = function(typeKey, tier, quality){
  var a = D.AFK[typeKey];
  if (!a) return null;
  var tm = D.tierMult[U.clamp((tier|0) - 1, 0, 3)];
  var v = U.rnd(a.v[0], a.v[1]) * tm * U.clamp(quality === undefined ? 1 : quality, 0.5, 2.2);
  if (a.fmt === 'flat') v = Math.round(v);
  return v;
};

/* 法宝名生成素材 */
D.TREASURE_N = {
  jin:['斩月','庚金','太白','断岳','霜寒','孤锋'],
  mu:['青藤','长生','碧落','万叶','回春','建木'],
  shui:['寒潭','玄水','沧浪','幽泉','润灵','北海'],
  huo:['赤炎','焚天','离火','九阳','业火','朱焰'],
  tu:['厚土','坤元','山河','磐石','息壤','镇岳'],
  feng:['裂风','逍遥','青萍','无相','凌虚','追云'],
  lei:['紫电','九霄','雷狱','天威','惊蛰','罚罪'],
  guang:['曦光','大日','金轮','明镜','普照','琉璃'],
  an:['幽冥','噬魂','黄泉','无月','夜昙','寂灭']
};

/* 法宝形制：决定它能戴在哪个装备位（阵眼不拘形制，装备位挑剔形制）
   aff 为该形制偏好的词条——炼出「剑」更容易带攻伐词条，「甲」更容易带护体词条 */
D.TREASURE_TYPES = [
  { k:'jian', n:'剑', slots:['weapon'],            aff:['atk','crit','cdmg'],  w:11 },
  { k:'dao',  n:'刀', slots:['weapon'],            aff:['atk','cdmg'],         w:9  },
  { k:'qiang',n:'枪', slots:['weapon'],            aff:['atk','spd'],          w:7  },
  { k:'gong', n:'弓', slots:['weapon'],            aff:['crit','spd'],         w:6  },
  { k:'yin',  n:'印', slots:['weapon','offhand'],  aff:['all','atk'],          w:7  },
  { k:'fu',   n:'符', slots:['offhand'],           aff:['alch','form','cult'], w:9  },
  { k:'fan',  n:'幡', slots:['offhand'],           aff:['cult','def'],         w:8  },
  { k:'qi',   n:'旗', slots:['offhand'],           aff:['sect','all'],         w:6  },
  { k:'jing', n:'镜', slots:['offhand','crown'],   aff:['luck','dodge'],       w:6  },
  { k:'jia',  n:'甲', slots:['armor'],             aff:['hp','def'],           w:10 },
  { k:'pao',  n:'袍', slots:['armor'],             aff:['hp','cult'],          w:8  },
  { k:'ding', n:'鼎', slots:['armor','offhand'],   aff:['alch','hp'],          w:5  },
  { k:'zhong',n:'钟', slots:['armor','jade'],      aff:['hp','def'],           w:5  },
  { k:'guan', n:'冠', slots:['crown'],             aff:['cult','heart'],       w:9  },
  { k:'zan',  n:'簪', slots:['crown'],             aff:['cult','crit'],        w:6  },
  { k:'zhu',  n:'珠', slots:['crown','jade'],      aff:['all','hp'],           w:7  },
  { k:'xue',  n:'靴', slots:['boots'],             aff:['spd','dodge'],        w:10 },
  { k:'lv',   n:'履', slots:['boots'],             aff:['spd','luck'],         w:9  },
  { k:'huan', n:'环', slots:['boots','jade'],      aff:['spd','luck'],         w:8  },
  { k:'pei',  n:'佩', slots:['jade'],              aff:['luck','heart'],       w:9  },
  { k:'yu',   n:'玉', slots:['jade'],              aff:['all','sect'],         w:7  },
  { k:'deng', n:'灯', slots:['jade','offhand'],    aff:['luck','heal'],        w:5  },
  { k:'yin2', n:'印', slots:['offhand'],           aff:['form','alch'],        w:6  },
  /* 六合塔：重宝，六处皆可佩，但极罕见 */
  { k:'ta',   n:'塔', slots:['weapon','offhand','armor','crown','boots','jade'], aff:['all'], w:1 }
];
D.TTK = {};
D.TREASURE_TYPES.forEach(function(t){ D.TTK[t.k] = t; });

/* 某件法宝能否戴进某个装备位（无 slots 字段的旧法宝视为通用） */
D.ALL_EQ_SLOTS = ['weapon','offhand','armor','crown','boots','jade'];
D.treasureSlots = function(t){
  if (!t) return [];
  if (t.slots && t.slots.length) return t.slots;
  if (t.type && D.TTK[t.type]) return D.TTK[t.type].slots;
  return D.ALL_EQ_SLOTS.slice();          // 兼容旧存档
};
D.canWear = function(t, slot){ return D.treasureSlots(t).indexOf(slot) >= 0; };

/* ---------------- 十二阵眼（3×4） ---------------- */
D.NODES12 = [
  {i:0,  z:'乾',  el:'jin',  x:0, y:0, desc:'天行健，刚健中正'},
  {i:1,  z:'兑',  el:'jin',  x:1, y:0, desc:'泽润万物，和悦相生'},
  {i:2,  z:'离',  el:'huo',  x:2, y:0, desc:'明两作离，光明炽盛'},
  {i:3,  z:'震',  el:'mu',   x:3, y:0, desc:'雷出地奋，生发之始'},
  {i:4,  z:'坎',  el:'shui', x:0, y:1, desc:'习坎入险，至柔克刚'},
  {i:5,  z:'巽',  el:'feng', x:1, y:1, desc:'随风巽入，无孔不入'},
  {i:6,  z:'艮',  el:'tu',   x:2, y:1, desc:'艮山止步，稳重不迁'},
  {i:7,  z:'坤',  el:'tu',   x:3, y:1, desc:'地势坤厚，载物无疆'},
  {i:8,  z:'中宫',el:'any',  x:0, y:2, desc:'太极中央，纳万法为一', wild:true},
  {i:9,  z:'雷枢',el:'lei',  x:1, y:2, desc:'雷霆之枢，天威所聚'},
  {i:10, z:'光台',el:'guang',x:2, y:2, desc:'光明之台，照破迷障'},
  {i:11, z:'暗渊',el:'an',   x:3, y:2, desc:'幽暗之渊，吞噬万有'}
];
/* 相邻关系（正交） */
D.NODE_ADJ = (function(){
  var out = {};
  for (var i=0;i<12;i++) out[i] = [];
  for (var a=0;a<12;a++){
    for (var b=a+1;b<12;b++){
      var A = D.NODES12[a], B = D.NODES12[b];
      if (Math.abs(A.x-B.x) + Math.abs(A.y-B.y) === 1){ out[a].push(b); out[b].push(a); }
    }
  }
  return out;
})();

/* ---------------- 人物装备位（6 格） ----------------
   与十二阵眼共用同一批法宝：嵌阵着眼整体加成与五行联动，
   佩戴在身上则定向强化人物属性。二者只能择一。 */
D.EQ_SLOTS = [
  { k:'weapon', n:'兵器', el:'jin',   mult:1.55, aff:['atk','cdmg','crit','spd'], desc:'主杀伐' },
  { k:'offhand',n:'副手', el:'shui',  mult:1.25, aff:['all','cult','sect','luck'], desc:'法宝符箓' },
  { k:'armor',  n:'护身', el:'tu',    mult:1.65, aff:['hp','def','dodge'],        desc:'御敌之要' },
  { k:'crown',  n:'头冠', el:'mu',    mult:1.55, aff:['cult','heart','alch'],     desc:'养神之器' },
  { k:'boots',  n:'足履', el:'feng',  mult:1.55, aff:['spd','dodge','luck'],      desc:'轻身之物' },
  { k:'jade',   n:'玉佩', el:'guang', mult:1.35, aff:['luck','sect','heart'],     desc:'护身之玉' }
];
D.EQK = {};
D.EQ_SLOTS.forEach(function(s){ D.EQK[s.k] = s; });

/* ---------------- 功法栏位 ----------------
   参悟即有所得（未装备的被动按 25% 生效），装备才发挥全力；
   主动术法只有装备后才能带入战斗。 */
D.TECH_SLOT_GAIN = 6;                    // 每 6 个境界节点（2 个大境界）解锁 1 个槽
D.techSlots = function(node){
  var bonus = Math.floor(node / D.TECH_SLOT_GAIN);
  return { active: 2 + bonus, passive: 1 + bonus };
};

/* ---------------- 灵草（炼丹） ---------------- */
/* pill: qi修为 / break突破 / heal疗伤 / wash洗灵 / body淬体 / cult悟道 */
D.HERBS = [
  {k:'hh_jin1', n:'金精草',   el:'jin', t:1, y:[1,3], pill:'qi'},
  {k:'hh_jin2', n:'玄铁芝',   el:'jin', t:2, y:[5,20], pill:'body'},
  {k:'hh_jin3', n:'太白神蕨', el:'jin', t:3, y:[50,200], pill:'break'},
  {k:'hh_mu1',  n:'凝血草',   el:'mu',  t:1, y:[1,3], pill:'heal'},
  {k:'hh_mu2',  n:'青木藤',   el:'mu',  t:2, y:[5,20], pill:'qi'},
  {k:'hh_mu3',  n:'温玉参',   el:'mu',  t:3, y:[50,200], pill:'body'},
  {k:'hh_shui1',n:'寒潭莲',   el:'shui',t:1, y:[1,3], pill:'qi'},
  {k:'hh_shui2',n:'幽泉水藻', el:'shui',t:2, y:[5,20], pill:'cult'},
  {k:'hh_shui3',n:'太一真水草',el:'shui',t:3, y:[50,200], pill:'wash'},
  {k:'hh_huo1', n:'赤炎花',   el:'huo', t:1, y:[1,3], pill:'qi'},
  {k:'hh_huo2', n:'朱果',     el:'huo', t:2, y:[5,20], pill:'break'},
  {k:'hh_huo3', n:'九阳焚天芝',el:'huo',t:3, y:[50,200], pill:'body'},
  {k:'hh_tu1',  n:'厚土根',   el:'tu',  t:1, y:[1,3], pill:'heal'},
  {k:'hh_tu2',  n:'黄芽精',   el:'tu',  t:2, y:[5,20], pill:'qi'},
  {k:'hh_tu3',  n:'坤元参',   el:'tu',  t:3, y:[50,200], pill:'break'},
  {k:'hh_feng1',n:'青风藤',   el:'feng',t:1, y:[1,3], pill:'qi'},
  {k:'hh_feng2',n:'风灵子',   el:'feng',t:2, y:[5,20], pill:'cult'},
  {k:'hh_feng3',n:'太虚风羽草',el:'feng',t:3,y:[50,200], pill:'wash'},
  {k:'hh_lei1', n:'雷击木',   el:'lei', t:1, y:[1,3], pill:'qi'},
  {k:'hh_lei2', n:'紫电花',   el:'lei', t:2, y:[5,20], pill:'break'},
  {k:'hh_lei3', n:'庚雷竹',   el:'lei', t:3, y:[50,200], pill:'body'},
  {k:'hh_guang1',n:'曦光蕊',  el:'guang',t:1, y:[1,3], pill:'heal'},
  {k:'hh_guang2',n:'白昼花',  el:'guang',t:2, y:[5,20], pill:'qi'},
  {k:'hh_guang3',n:'大日金莲',el:'guang',t:3, y:[50,200], pill:'cult'},
  {k:'hh_an1',  n:'幽昙花',   el:'an',  t:1, y:[1,3], pill:'qi'},
  {k:'hh_an2',  n:'噬魂菇',   el:'an',  t:2, y:[5,20], pill:'body'},
  {k:'hh_an3',  n:'冥河莲',   el:'an',  t:3, y:[50,200], pill:'break'},
  {k:'hh_wu1',  n:'灵芝',     el:'tu',  t:1, y:[1,3], pill:'qi'},
  {k:'hh_wu2',  n:'雪莲',     el:'shui',t:2, y:[5,20], pill:'wash'},
  {k:'hh_wu3',  n:'龙涎草',   el:'mu',  t:3, y:[50,200], pill:'cult'}
];
D.HK = {};
D.HERBS.forEach(function(h){ D.HK[h.k] = h; });

D.PILLS = {
  qi:    {n:'聚气丹', desc:'服用立得修为',        c:'#7fb08a'},
  break: {n:'破障丹', desc:'提升突破成功率',      c:'#c9a86a'},
  heal:  {n:'回春丹', desc:'回复道心与气血',      c:'#c05a4a'},
  wash:  {n:'洗灵丹', desc:'洗涤灵根，降低纯度',  c:'#6fa3b8'},
  body:  {n:'淬体丹', desc:'永久提升根基属性',    c:'#a8895a'},
  cult:  {n:'悟道丹', desc:'限时大幅提升修炼速度', c:'#9a8cc8'}
};

/* ---------------- 矿石（炼器） ---------------- */
D.ORES = [
  {k:'or_jin1', n:'玄铁',     el:'jin', t:1},
  {k:'or_jin2', n:'太白精金', el:'jin', t:2},
  {k:'or_jin3', n:'庚金母',   el:'jin', t:3},
  {k:'or_mu1',  n:'灵木心',   el:'mu',  t:1},
  {k:'or_mu2',  n:'千年铁木', el:'mu',  t:2},
  {k:'or_mu3',  n:'建木残枝', el:'mu',  t:3},
  {k:'or_shui1',n:'寒晶',     el:'shui',t:1},
  {k:'or_shui2',n:'幽泉玉',   el:'shui',t:2},
  {k:'or_shui3',n:'太一真水', el:'shui',t:3},
  {k:'or_huo1', n:'火髓石',   el:'huo', t:1},
  {k:'or_huo2', n:'赤炎晶',   el:'huo', t:2},
  {k:'or_huo3', n:'太阳精金', el:'huo', t:3},
  {k:'or_tu1',  n:'厚土石',   el:'tu',  t:1},
  {k:'or_tu2',  n:'坤元玉',   el:'tu',  t:2},
  {k:'or_tu3',  n:'息壤',     el:'tu',  t:3},
  {k:'or_feng1',n:'风灵石',   el:'feng',t:1},
  {k:'or_feng2',n:'青风羽',   el:'feng',t:2},
  {k:'or_feng3',n:'逍遥风晶', el:'feng',t:3},
  {k:'or_lei1', n:'雷纹石',   el:'lei', t:1},
  {k:'or_lei2', n:'紫电晶',   el:'lei', t:2},
  {k:'or_lei3', n:'天雷木',   el:'lei', t:3},
  {k:'or_guang1',n:'曦光玉',  el:'guang',t:1},
  {k:'or_guang2',n:'白昼石',  el:'guang',t:2},
  {k:'or_guang3',n:'大日琉璃',el:'guang',t:3},
  {k:'or_an1',  n:'幽冥石',   el:'an',  t:1},
  {k:'or_an2',  n:'噬影晶',   el:'an',  t:2},
  {k:'or_an3',  n:'冥河沙',   el:'an',  t:3}
];
D.OK = {};
D.ORES.forEach(function(o){ D.OK[o.k] = o; });

/* ---------------- 探索区域 ---------------- */
D.REGIONS = [
  {id:'r0', n:'青云山麓', t:1, req:0,  el:'mu',   desc:'云雾缭绕，初入修行之地'},
  {id:'r1', n:'黑风谷',   t:2, req:1,  el:'feng', desc:'终年阴风怒号，妖兽出没'},
  {id:'r2', n:'赤炎熔岩', t:3, req:4,  el:'huo',  desc:'地火奔涌，火属灵材遍地'},
  {id:'r3', n:'寒潭水府', t:4, req:7,  el:'shui', desc:'千丈寒潭之下，暗藏水府'},
  {id:'r4', n:'万兽森林', t:5, req:10, el:'mu',   desc:'古木参天，妖兽成群'},
  {id:'r5', n:'紫雷荒原', t:6, req:13, el:'lei',  desc:'雷暴不息，寸草不生'},
  {id:'r6', n:'上古遗迹', t:7, req:16, el:'tu',   desc:'上古修士洞府，阵纹犹存'},
  {id:'r7', n:'幽冥黄泉', t:8, req:20, el:'an',   desc:'阴阳交界，亡魂游荡'},
  {id:'r8', n:'九霄云顶', t:9, req:24, el:'guang',desc:'离天三尺，仙人遗蜕'}
];

/* ---------------- 宗门建筑 ---------------- */
D.BUILDINGS = [
  {k:'lingtian', n:'灵田', el:'mu',   cost:60,  mult:1.9, desc:'产灵草'},
  {k:'lingkuang',n:'灵矿', el:'jin',  cost:70,  mult:1.9, desc:'产矿石'},
  {k:'danfang',  n:'丹房', el:'huo',  cost:120, mult:2.0, desc:'炼丹加成与产出'},
  {k:'qifang',   n:'器坊', el:'jin',  cost:140, mult:2.0, desc:'炼器加成与产出'},
  {k:'zhentang', n:'阵法堂',el:'tu',  cost:150, mult:2.0, desc:'阵法加成与产出'},
  {k:'jiangjing',n:'讲经堂',el:'shui',cost:110, mult:2.0, desc:'弟子修炼'},
  {k:'cangjing', n:'藏经阁',el:'feng',cost:180, mult:2.1, desc:'灵石与功法'},
  {k:'shanmen',  n:'山门', el:'lei',  cost:220, mult:2.2, desc:'宗门声望与产灵石'}
];
D.BK = {};
D.BUILDINGS.forEach(function(b){ D.BK[b.k] = b; });

/* 弟子姓名素材 */
D.DIS_N = ['云','清','玄','灵','素','子','墨','青','白','赤','孤','寒','流','无','太','明'];
D.DIS_N2 = ['尘','霄','风','雪','霜','月','阳','虚','真','一','涯','生','川','海','山','鸿'];
D.DIS_TITLE = ['剑童','药僮','外门弟子','内门弟子','记名弟子','杂役','执事'];

/* ---------------- 轮回星盘 ---------------- */
D.STARS = [
  {k:'purity', n:'灵根之星', max:8, cost:2, desc:'轮回初始灵根纯度 +7/级'},
  {k:'speed',  n:'速成之星', max:8, cost:2, desc:'修炼速度 +15%/级'},
  {k:'fortune',n:'福缘之星', max:6, cost:3, desc:'机缘触发率 +8%/级'},
  {k:'power',  n:'战意之星', max:8, cost:2, desc:'攻击 +15%/级'},
  {k:'guard',  n:'护道之星', max:8, cost:2, desc:'防御与气血 +14%/级'},
  {k:'alchemy',n:'丹道之星', max:6, cost:3, desc:'炼丹品质 +10%/级'},
  {k:'forge',  n:'器道之星', max:6, cost:3, desc:'炼器品质 +10%/级'},
  {k:'array',  n:'阵道之星', max:6, cost:3, desc:'灵阵威力 +10%/级'},
  {k:'sect',   n:'宗门之星', max:6, cost:3, desc:'宗门产出 +18%/级'},
  {k:'karma',  n:'因果之星', max:5, cost:4, desc:'因果波动减半 + 天劫 -6%/级'},
  {k:'heart',  n:'道心之星', max:5, cost:4, desc:'道心上限 +10/级，突破 +5%/级'},
  {k:'start',  n:'先觉之星', max:5, cost:5, desc:'轮回后开局直接提升 2 个境界节点/级'},
  {k:'keep',   n:'传承之星', max:4, cost:6, desc:'轮回保留 1 件法宝/级'},
  {k:'spirit', n:'灵晶之星', max:6, cost:3, desc:'轮回后继承 20% 灵石/级'},
  {k:'rootkeep',n:'本命之星',max:4, cost:7, desc:'轮回保留灵根纯度的 15%/级'},
  {k:'luck',   n:'天命之星', max:5, cost:5, desc:'掉落与品级 +8%/级'},
  {k:'tribu',  n:'渡劫之星', max:5, cost:4, desc:'天劫威力 -8%/级'},
  {k:'none',   n:'太初之星', max:1, cost:20, desc:'解锁隐藏：混沌灵根觉醒（下轮开局即带一异种灵根）'}
];

/* ---------------- 天劫类型 ---------------- */
D.TRIBULATIONS = [
  {n:'三重雷劫',   w:4},
  {n:'五行雷劫',   w:3},
  {n:'心魔劫',     w:2},
  {n:'阴火焚身劫', w:2},
  {n:'风雷合击劫', w:2},
  {n:'九天玄劫',   w:1}
];
})();
