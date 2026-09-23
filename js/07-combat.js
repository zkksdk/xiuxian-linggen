/* ===========================================================
   07-combat.js  —  回合制战斗（自动 / 手动 / 加速）
   =========================================================== */
(function(){
var U = XX.U, D = XX.D, G = XX.G;

/* 战斗属性取算 */
G.combatEl = function(){
  if (G.hasSpecial('wuxing')) return 'wuxing';
  return G.mainRoot();
};
G.elemMult = function(a, b){
  if (a === 'wuxing') return 1.4;
  if (!a || !b) return 1.0;
  if (a === b) return 1.05;
  if (D.KE[a] === b) return 1.40;
  if (D.KE[b] === a) return 0.72;
  if (D.SHENG[a] === b) return 1.12;
  if (D.SHENG[b] === a) return 0.92;
  return 1.0;
};

/* 打出敌人 */
G.makeEnemy = function(cfg){
  var n = G.node + (cfg.nodeBonus||0);
  var m = cfg.mult === undefined ? 1 : cfg.mult;
  var boss = !!cfg.boss;
  var hpB = boss ? 2.1 : 1.0, atkB = boss ? 1.28 : 1.0;
  var e = {
    name: cfg.name || '无名妖兽',
    el: cfg.el || U.pick(D.RK),
    maxhp: Math.floor((140 + 74*n) * m * hpB * (1 + (G.rebirth.count||0)*0.32)),
    atk: (8.5 + 3.1*n) * m * atkB * (1 + (G.rebirth.count||0)*0.22),
    def: (3 + 1.45*n) * m * (boss?1.25:1),
    spd: (9 + 0.75*n) * (boss?1.05:1),
    crit: U.clamp(0.05 + n*0.004, 0, 0.5),
    cdmg: 1.45 + n*0.01,
    dodge: boss ? 0.02 : 0.03,
    boss: boss,
    rage: 0,
    stun: 0
  };
  if (boss){ e.crit += 0.06; e.cdmg += 0.15; }
  e.hp = e.maxhp;
  return e;
};

/* 玩家技能列表：只有装备在功法栏的主动术法能带入战斗 */
G.playerSkills = function(){
  var out = [{ k:'basic', n:'灵力一击', pow:1.0, cd:0, cur:0, desc:'基础攻击' }];
  for (var id in G.techs){
    var t = D.TK[id];
    if (!t || t.kind !== 'active') continue;
    if (!G.isTechEquipped(id)) continue;
    var lv = G.techs[id];
    out.push({
      k: id, n: t.n, el: t.el, pow: t.pow * (1 + (lv-1)*0.14),
      cd: t.cd, cur: 0, heal: t.heal, drain: t.drain, debuff: t.debuff, buff: t.buff,
      desc: t.desc
    });
  }
  // 特殊词条技能（阵眼或随身皆可）
  var sps = G.specialAffixes();
  sps.forEach(function(s){
    if (out.some(function(x){ return x.k === 'sp_'+s.k; })) return;
    var sk = { k:'sp_'+s.k, n:s.n, sp:true, cd:4, cur:0, desc:s.desc, pow:1.0 };
    if (s.k === 'burst'){ sk.pow = 1.5; }
    if (s.k === 'dao'){ sk.pow = 0.8; sk.cd = 6; }
    if (s.k === 'grow'){ sk.pow = 0.9; sk.cd = 3; }
    out.push(sk);
  });
  return out;
};

/* ============ 开始战斗 ============ */
G.battle = null;
G.battleSpeed = 1;
G.battleHold = false;

G.startBattle = function(cfg){
  if (G.battle && !G.battle.over) return;
  G.recalc();
  var st = G.der.st;
  var wound = G._wound || 0;
  var ally = {
    name: G.name || '你',
    el: G.combatEl(),
    maxhp: st.hp,
    hp: Math.floor(st.hp * (1 - wound)),
    atk: st.atk, def: st.def, spd: st.spd,
    crit: st.crit, cdmg: st.cdmg, dodge: st.dodge,
    heal: st.heal,
    skills: G.playerSkills(),
    rage: 0, stun: 0,
    buff: { atk:0, def:0, t:0 }
  };
  var foe = G.makeEnemy(cfg);
  G.battle = {
    cfg: cfg || {},
    ally: ally, foe: foe,
    log: [], turn: 0, over: false, win: false,
    timer: 0, auto: true, waiting: false, fleeTried: 0,
    seq: 0
  };
  G.stats.battles++;
  G.blog('sys', '—— ' + (cfg.kind === 'tribulation' ? '天劫降临' : '遭遇 ' + foe.name) + ' ——');
  G.blog('sys', '你以 <b>' + D.elName(ally.el) + '</b> 属性迎敌，对方属 <b>' + D.elName(foe.el) + '</b>。');
  XX.UI.openBattle();
  XX.UI.renderBattle();
};

G.blog = function(cls, txt){
  if (!G.battle) return;
  G.battle.log.push({ c: cls, t: txt, i: G.battle.seq++ });
  if (G.battle.log.length > 120) G.battle.log.shift();
  XX.UI.battleLogDirty = true;
};

/* 伤害计算 */
G.deal = function(att, def, skill, isAlly){
  var pow = skill ? (skill.pow || 1) : 1;
  var atk = att.atk * (1 + (att.buff && att.buff.t > 0 ? att.buff.atk : 0)) * (1 + (att.grow || 0));
  var dfs = def.def * (1 + (def.buff && def.buff.t > 0 ? def.buff.def : 0));
  // 闪避
  if (Math.random() < def.dodge){
    G.blog('sys', def.name + ' 身形一晃，避开了这一击。');
    return 0;
  }
  var em = G.elemMult(att.el, def.el);
  var raw = atk * pow * em;
  var mit = dfs / (dfs + 60 + 34*G.node);
  var dmg = raw * (1 - mit);
  dmg *= U.rnd(0.92, 1.08);
  var crit = Math.random() < att.crit;
  if (crit) dmg *= att.cdmg;
  // 特殊词条（阵眼 / 随身 皆计入）
  if (G.hasSpecial('burst') && def.hp > def.maxhp*0.6) dmg *= 1.45;
  dmg = Math.max(1, Math.floor(dmg));
  def.hp -= dmg;
  if (def.hp < 0) def.hp = 0;
  // 来历·血煞：致命一击回复气血
  if (def.hp <= 0 && isAlly && G.hasOrigin('killHeal')){
    var kh = Math.floor(att.maxhp * 0.08);
    att.hp = Math.min(att.maxhp, att.hp + kh);
    G.blog('heal', '<span class="tag gold">血煞</span> 噬取生机 <b>+' + U.fmt(kh) + '</b>');
  }

  var cls = crit ? 'crit' : 'dmg';
  var tag = em > 1.2 ? '<span class="tag cinn">克制</span>' : (em < 0.9 ? '<span class="tag mute">受制</span>' : '');
  G.blog(cls, (crit ? '<b>暴击！</b>' : '') + att.name + ' 造成 <b>' + U.fmt(dmg) + '</b> 点伤害 ' + tag);

  // 吸血
  var drain = (skill && skill.drain) || 0;
  if (G.hasSpecial('drain')) drain += 0.15;
  if (drain > 0){
    var h = Math.floor(dmg * drain);
    att.hp = Math.min(att.maxhp, att.hp + h);
    G.blog('heal', att.name + ' 汲取生机 <b>+' + U.fmt(h) + '</b>');
  }
  // 眩晕
  if (isAlly && G.hasSpecial('seal') && Math.random() < 0.12){
    def.stun = 1;
    G.blog('sys', def.name + ' 被镇魂之力定住，无法行动！');
  }
  return dmg;
};

/* 玩家行动 */
G.allyAct = function(skillIdx){
  var B = G.battle; if (!B || B.over) return;
  var sk = B.ally.skills[skillIdx] || B.ally.skills[0];
  if (sk.cur > 0) return;
  if (sk.sp && sk.k === 'sp_dao'){ G.blog('sys','你运转太上忘情之法，心神俱寂。'); }
  G.deal(B.ally, B.foe, sk, true);
  if (sk.cd > 0) sk.cur = sk.cd + 1;
  // 治疗
  if (sk.heal){
    var h = Math.floor(B.ally.maxhp * sk.heal * (1 + B.ally.heal));
    B.ally.hp = Math.min(B.ally.maxhp, B.ally.hp + h);
    G.blog('heal', '你回复气血 <b>+' + U.fmt(h) + '</b>');
  }
  // buff / debuff
  if (sk.buff){ B.ally.buff.atk += sk.buff.atk||0; B.ally.buff.def += sk.buff.def||0; B.ally.buff.t = sk.buff.t; }
  if (sk.debuff){ B.foe.atk *= (1 + sk.debuff.atk); G.blog('sys', B.foe.name + ' 攻势被削弱。'); }
  B.ally.rage++;
  // 生生不息：每次行动后攻势渐长，可叠加
  if (G.hasSpecial('grow')){
    B.ally.grow = Math.min(1.0, (B.ally.grow || 0) + 0.04);
    var st = Math.round(B.ally.grow / 0.04);
    if (st <= 2 || st % 5 === 0) G.blog('sys', '<span class="tag purple">生生不息</span> ×'+st+'（攻击 +'+Math.round(B.ally.grow*100)+'%）');
  }
  if (B.foe.hp <= 0) return G.endBattle(true);
  // 叠浪：再行动
  if (G.hasSpecial('double') && Math.random() < 0.18){
    G.blog('sys', '潮汐叠浪，你再度出手！');
    B.timer = 0; B.extra = true;
    return;
  }
  B.timer = 0; B.turn++;
  B.actor = 'foe';
};

/* 敌人行动 */
G.foeAct = function(){
  var B = G.battle; if (!B || B.over) return;
  if (B.foe.stun > 0){ B.foe.stun--; G.blog('sys', B.foe.name + ' 被定住，动弹不得。'); B.timer=0; B.actor='ally'; return; }
  var sk = { pow: 1.0 };
  // 敌人偶尔用大招
  if (Math.random() < (B.foe.boss ? 0.35 : 0.2)){ sk = { pow: 1.6 }; G.blog('sys', B.foe.name + ' 蓄势待发，使出杀招！'); }
  B.lastFoeDmg = G.deal(B.foe, B.ally, sk, false);
  // 玩家反噬
  if (G.hasSpecial('thorn')){
    var back = Math.floor(B.foe.atk * 0.25);
    B.foe.hp = Math.max(0, B.foe.hp - back);
    G.blog('sys', '反噬之力灼伤 ' + B.foe.name + '，伤害 ' + U.fmt(back));
  }
  if (B.ally.hp <= 0) return G.endBattle(false);
  if (B.ally.buff.t > 0){ B.ally.buff.t--; if (B.ally.buff.t === 0){ B.ally.buff.atk = 0; B.ally.buff.def = 0; } }
  // 来历·雷罚：受击反伤
  if (B.lastFoeDmg > 0 && G.hasOrigin('backlash')){
    var bk = Math.max(1, Math.floor(B.lastFoeDmg * 0.10));
    B.foe.hp = Math.max(0, B.foe.hp - bk);
    G.blog('sys', '<span class="tag gold">雷罚</span> 反噬 ' + B.foe.name + '，伤害 ' + U.fmt(bk));
    if (B.foe.hp <= 0) return G.endBattle(true);
  }
  B.timer = 0; B.turn++;
  B.actor = 'ally';
};

/* 自动选择技能 */
G.autoPick = function(){
  var B = G.battle;
  var list = B.ally.skills;
  var hpFrac = B.ally.hp / B.ally.maxhp;
  // 危急时优先治疗
  if (hpFrac < 0.4){
    for (var i=0;i<list.length;i++) if (list[i].heal && list[i].cur <= 0) return i;
  }
  var best = 0, bestV = -1;
  for (var j=0;j<list.length;j++){
    var s = list[j];
    if (s.cur > 0) continue;
    var v = (s.pow||1);
    if (s.heal) v *= 0.7;
    if (s.drain) v *= 1.15;
    if (s.sp) v *= 1.25;
    if (v > bestV){ bestV = v; best = j; }
  }
  return bestV < 0 ? 0 : best;
};

/* 战斗主循环 */
G.battleTick = function(dt){
  var B = G.battle;
  if (!B || B.over) return;
  var spd = G.battleSpeed * (G.battleHold ? 3 : 1);
  var step = dt * spd;
  B.timer += step;
  var interval = 0.78;
  // 技能冷却（每回合推进一次）
  B.cdAcc = (B.cdAcc||0) + step;
  if (B.cdAcc >= interval){
    B.cdAcc = 0;
    B.ally.skills.forEach(function(s){ if (s.cur > 0) s.cur--; });
  }
  if (B.timer < interval) return;
  B.timer = 0;
  if (!B.actor) B.actor = (B.ally.spd >= B.foe.spd ? 'ally' : 'foe');
  if (B.actor === 'ally'){
    if (B.auto){ G.allyAct(G.autoPick()); }
    else { B.waiting = true; XX.UI.renderBattle(); return; }
  } else {
    G.foeAct();
  }
};

G.battleManual = function(idx){
  var B = G.battle; if (!B) return;
  B.waiting = false;
  G.allyAct(idx);
  XX.UI.renderBattle();
};
G.battleToggleAuto = function(){ if (G.battle) G.battle.auto = !G.battle.auto; XX.UI.renderBattle(); };
G.battleSetSpeed = function(s){ G.battleSpeed = s; XX.UI.renderBattle(); };
G.battleFlee = function(){
  var B = G.battle; if (!B) return;
  if (B.cfg.kind === 'tribulation' || B.cfg.kind === 'ascend'){ XX.UI.toast('天劫之下，无处可逃！'); return; }
  if (Math.random() < 0.6){ G.blog('sys','你且战且退，脱离了战斗。'); G.endBattle(false, true); }
  else { B.fleeTried++; G.blog('bad','退路被截断，逃跑失败！'); B.timer = 0; B.actor='foe'; }
};

G.endBattle = function(win, fled){
  var B = G.battle; if (!B || B.over) return;
  B.over = true; B.win = !!win;
  var cfg = B.cfg;
  if (win){
    G.stats.wins++;
    var wound = 1 - B.ally.hp / B.ally.maxhp;
    G._wound = U.clamp(wound * 0.5, 0, 0.8);
    if (cfg.kind === 'explore') G.onBattleReward(cfg);
  } else {
    G._wound = U.clamp((G._wound||0) + 0.35, 0, 0.85);
    if (!fled) G.blog('die', '你力有不逮，败下阵来……');
    if (G.secretActive) G.endSecretRealm(true);
  }
  XX.UI.renderBattle();
  setTimeout(function(){
    XX.UI.closeBattle();
    G.battle = null;
    if (win && cfg.onWin) cfg.onWin();
    if (!win && !fled && cfg.onLose) cfg.onLose();
    // 秘境续行
    if (win && G.secretActive) setTimeout(function(){ G.secretStep(); }, 260);
    XX.UI.renderView && XX.UI.renderView();
    XX.UI.renderHUD && XX.UI.renderHUD();
  }, win ? 900 : 1400);
};
})();
