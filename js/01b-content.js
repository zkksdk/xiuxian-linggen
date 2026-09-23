/* ===========================================================
   01b-content.js  —  内容层：奇遇 / 秘境 / 妖兽 / 随机机缘
   依赖：01-data.js（需在其后加载）
   =========================================================== */
(function(){
var U = XX.U, D = XX.D;

/* ================= 妖兽名录（按属性） ================= */
D.BEAST_N = {
  jin:  ['金甲蜈蚣','断岳猿','玄铁傀儡','白虹虎','裂山犀'],
  mu:   ['青纹妖狼','缠魂藤妖','千年树魅','碧眼蟾','翠羽蛇'],
  shui: ['寒潭蛟','幽泉鬼影','沧浪鲛人','玄水蟒','沉舟龟'],
  huo:  ['赤目魔猿','焚山蜥','离火鸦','熔岩魔君','焦尾狐'],
  tu:   ['黄沙石魈','厚土熊','山岳巨灵','坤元傀儡','裂地鼍'],
  feng: ['裂风隼','无形风魅','青萍妖','追云貔','回旋风灵'],
  lei:  ['紫电貔貅','雷罚妖将','惊蛰蟒','天威鹏','九霄雷兽'],
  guang:['曦光麒麟','白昼神鸟','金轮使者','明镜妖','大日金乌'],
  an:   ['噬魂鬼母','血月夜叉','黄泉渡者','无相魔','夜昙妖姬']
};
D.BEAST_P = ['凶','厉','古','幽','血','玄','荒','极','太','劫'];
D.BOSS_N = ['上古凶兽·饕餮','九尾天狐','太虚神龙','幽冥老祖','血河魔尊','无面目者','青莲剑仙','大梦真君'];

/* ================= 奇遇事件池 ================= */
/* do(g) 返回描述字符串；g 为 XX.G 实例 */
var E = D.EVENTS = [];

E.push({ n:'白发老者', w:8, txt:'山道旁躺着一位白发老者，气息奄奄，怀中紧抱一只玉瓶。他抬眼看你，似有哀求之意。',
  opts:[
    { t:'出手相救', d:'耗灵石为其续命', cost:{spirit:60},
      do:function(g){ g.addSpirit(-60); g.karma += 12; return '老者服下丹药，气色渐复，赠你一枚残破玉简而去。<span class="tag gold">因果 +12</span>'; } },
    { t:'取走玉瓶', d:'趁人之危，得丹药若干', 
      do:function(g){ var n=g.rnd(2,4); g.addItem('pill','cq_qi',n); g.karma -= 15; return '你取走玉瓶，老者含恨而终。<span class="tag cinn">因果 -15</span> 得丹药 '+n+' 枚。'; } },
    { t:'视而不见', d:'仙途无情，绕过即可',
      do:function(g){ return '你自他身侧走过，心中微动，终究未停步。'; } }
  ]});

E.push({ n:'顿悟之地', w:7, txt:'行至一处断崖，见崖壁上刻满剑痕，其中蕴含的剑意竟引动你体内灵力共振。',
  opts:[
    { t:'静坐参悟', d:'耗时良久，或有大收获', cost:{time:1},
      do:function(g){ var e=g.mainRoot(); if(!e) e='tu'; g.addPurity(e, g.rnd(6,14)); return '你于崖前枯坐一日一夜，忽有所悟——<b class="val">'+D.ROOT[e].n+'灵根</b>纯度大涨！'; } },
    { t:'以剑意砥砺己身', d:'道心提升，但会受伤',
      do:function(g){ g.heart = Math.min(g.maxHeart(), g.heart+18); g.hurt(0.18); return '剑意如潮冲刷道心，你口吐鲜血却神台清明。<span class="tag jade">道心 +18</span>'; } },
    { t:'拓下剑痕', d:'带走这份机缘',
      do:function(g){ g.addTechShard(); g.tagNext('craft',2); return '你以神识拓下剑痕，日后可徐徐参悟。<span class="tag gold">得功法碎片 ×1</span> <span class="tag purple">天工之印</span>'; } }
  ]});

E.push({ n:'上古遗迹', w:6, txt:'藤蔓之后露出一道石门，门上阵纹斑驳，隐约有灵气溢出。',
  opts:[
    { t:'强行破门', d:'实力考验，或有不测', 
      do:function(g){ return g.rollExplore(0.55, '破门成功，内中宝物尽归你所有！', '阵纹反噬，你被震得气血翻涌。'); } },
    { t:'以阵理推演开门', d:'需要阵法造诣', cost:{form:18},
      do:function(g){ g.addSpirit(0); g.addItem('ore', g.randOreKey(), 2); g.addItem('herb', g.randHerbKey(), 2); return '你依奇门之理推演阵眼，石门无声洞开。得矿石×2、灵草×2。'; } },
    { t:'在门外打坐，吸纳逸散灵气', d:'稳赚修为',
      do:function(g){ var q = g.qiRate()*g.rnd(40,90); g.addQi(q); return '你在门外静坐，将逸散灵气尽数纳入体内。<span class="tag jade">修为 +'+U.fmt(q)+'</span>'; } }
  ]});

E.push({ n:'魔修拦路', w:7, txt:'三名魔修自林间跃出，为首者舔了舔嘴唇："小娃娃，把储物袋留下，可饶你性命。"',
  opts:[
    { t:'拔剑迎战', d:'实力说话',
      do:function(g){ g.startBattle({kind:'evil', mult:1.0}); return ''; } },
    { t:'交出灵石', d:'破财免灾', cost:{spirit:120},
      do:function(g){ g.addSpirit(-120); g.heart -= 6; return '你抛下灵石仓皇退走。<span class="tag cinn">道心 -6</span>'; } },
    { t:'以魔道手段反噬', d:'需魔道筑基', req:function(g){ return g.hasBranch('魔道筑基'); },
      do:function(g){ g.karma -= 20; g.addSpirit(300); g.addPurity('an', 10); return '你狞笑一声，反将三魔修为吞噬殆尽。<span class="tag cinn">因果 -20</span> <b class="val">暗灵根 +10</b>'; } }
  ]});

E.push({ n:'灵泉', w:8, txt:'一泓清泉自石缝涌出，水面上浮着丝丝白气——是难得的灵泉。',
  opts:[
    { t:'沐浴其中', d:'洗涤肉身， purity 变化随机',
      do:function(g){ var ks = g.rootKeys(); var e = U.pick(ks); g.addPurity(e, g.rnd(4,10)); g.hurt(-0.25); return '灵泉入体，周身通透。<b class="val">'+D.ROOT[e].n+'灵根 +'+'若干</b>，气血尽复。'; } },
    { t:'尽数收取', d:'换作灵石',
      do:function(g){ var s = g.rnd(120,260) * (1+g.node*0.6); g.addSpirit(Math.floor(s)); return '你以玉瓶收尽灵泉，卖与坊市得灵石 <b class="val">'+U.fmt(Math.floor(s))+'</b>。'; } },
    { t:'引泉入田', d:'需宗门灵田',
      do:function(g){ g.addItem('herb', g.randHerbKey(), 3); return '你将泉水引回宗门灵田，灵草疯长。得灵草×3。'; } }
  ]});

E.push({ n:'仙鹤传书', w:5, txt:'一只白鹤自云端落下，足上系着一枚信封，封口钤着朱红小印。',
  opts:[
    { t:'拆阅', d:'或有门派邀约',
      do:function(g){ g.addSpirit(Math.floor(200*(1+g.node*0.8))); g.karma += 4; return '信中是一处秘境的指引。依言前往，拾得灵石一批。<span class="tag jade">因果 +4</span>'; } },
    { t:'放走白鹤', d:'不沾因果',
      do:function(g){ g.heart = Math.min(g.maxHeart(), g.heart+8); return '你解开绳索放它归去，心中一片澄澈。<span class="tag jade">道心 +8</span>'; } }
  ]});

E.push({ n:'市集偶遇', w:7, txt:'坊市中一位老道蹲在角落，面前摆着一堆看不出名堂的"破烂"。',
  opts:[
    { t:'花灵石淘一件', d:'赌运气', cost:{spirit:200},
      do:function(g){ g.addSpirit(-200);
        if (U.chance(0.18)){ g.addTreasure(g.makeTreasure({lucky:true})); return '你随手挑了一件，回去一擦——竟是件<b class="val">古宝</b>！'; }
        var k = g.randOreKey(); g.addItem('ore', k, 2); return '不过是寻常矿石罢了。得矿石×2。'; } },
    { t:'与他攀谈', d:'或得丹方心得',
      do:function(g){ g.addBuff('cult', 0.25, 300, '老道指点半日'); return '老道与你聊了些炼丹火候的门道。<span class="tag purple">修炼 +25%（5分钟）</span>'; } },
    { t:'离开', d:'不信这些把戏', do:function(g){ return '你摇摇头走开了。'; } }
  ]});

E.push({ n:'天降灵雨', w:4, txt:'天空毫无征兆地暗了下来，随即落下细密的灵雨，草木疯长，万物生发。',
  opts:[
    { t:'盘膝接引', d:'修为大增', do:function(g){ var q=g.qiRate()*g.rnd(200,400); g.addQi(q); return '你以身为器接引灵雨，修为暴涨 <b class="val">'+U.fmt(q)+'</b>！'; } },
    { t:'引雨浇灌灵田', d:'灵草大丰收', do:function(g){ var k=g.randHerbKey(); g.addItem('herb',k,5); return '灵田大熟，得灵草×5。'; } }
  ]});

E.push({ n:'走火入魔', w:3, req:function(g){ return g.heart < 55; }, txt:'你体内灵气骤然紊乱，一股暴戾之气直冲识海——走火入魔！',
  opts:[
    { t:'强行镇压', d:'耗道心压制',
      do:function(g){ g.heart = Math.max(0, g.heart-12); return '你咬破舌尖强压暴气，虽保住了修为，道心却再受损伤。<span class="tag cinn">道心 -12</span>'; } },
    { t:'顺其而行', d:'堕入魔道，反得力量',
      do:function(g){ g.karma -= 18; g.addPurity('an', 8); g.atkBonusP=1; g.addBuff('atk',0.30,600,'魔气灌注'); return '暴戾之气尽数融入经脉，你气息暴涨，眼中泛起血光。<span class="tag cinn">因果 -18</span> <span class="tag purple">攻击 +30%（10分钟）</span>'; } }
  ]});

E.push({ n:'前辈洞府', w:5, txt:'山壁上一处不起眼的裂缝后，是很久以前某位散修的坐化之地。',
  opts:[
    { t:'行礼后取物', d:'得法宝，因果微增',
      do:function(g){ g.karma += 8; g.addTreasure(g.makeTreasure({lv:1})); return '你朝遗蜕深施一礼，取走一件法宝。<span class="tag jade">因果 +8</span>'; } },
    { t:'尽取所有', d:'得更多，因果大损',
      do:function(g){ g.karma -= 25; var n=g.rnd(2,4); for(var i=0;i<n;i++) g.addTreasure(g.makeTreasure({lv:1})); return '你将洞府搜刮一空，连遗蜕上的玉佩也未放过。<span class="tag cinn">因果 -25</span> 得法宝×'+n+'。'; } },
    { t:'为前辈立碑', d:'道心大进',
      do:function(g){ g.heart = Math.min(g.maxHeart(), g.heart+15); g.karma += 15; return '你以石为碑，铭其名讳。<span class="tag jade">道心 +15 · 因果 +15</span>'; } }
  ]});

E.push({ n:'双生灵花', w:5, txt:'崖畔开着一朵奇异的花，一半赤红如火，一半湛蓝似冰——水火并存，竟不凋零。',
  opts:[
    { t:'吞服', d:'调和属性冲突',
      do:function(g){ g.addPurity('huo', 8); g.addPurity('shui', 8); g.harmony = true; return '花入腹中，水火二气竟在经脉中安然共存。<span class="tag gold">水火冲突已调和</span>'; } },
    { t:'入药', d:'得极品炼材', do:function(g){ g.addItem('herb','hh_wu3',2); return '你小心采下，这将是极好的药材。'; } }
  ]});

E.push({ n:'妖狐化形', w:4, txt:'一名白衣女子坐在溪边梳理长发，见你走近，回眸一笑，狐尾却藏不住地晃了晃。',
  opts:[
    { t:'与她攀谈', d:'或结善缘',
      do:function(g){ g.karma += 6; g.addPurity('mu', 6); g.addBuff('cult', 0.20, 600, '狐女指路'); return '她为你指了条捷径，临别赠你一枚灵果。<span class="tag purple">修炼 +20%（10分钟）</span>'; } },
    { t:'拔剑斩妖', d:'正道之举，得功勋',
      do:function(g){ g.startBattle({kind:'fox', mult:0.9}); return ''; } },
    { t:'不为所动', d:'道心坚定', do:function(g){ g.heart = Math.min(g.maxHeart(), g.heart+6); return '你目不斜视地走过，女子在身后轻笑一声化风而去。'; } }
  ]});

E.push({ n:'异种灵根觉醒', w:3, txt:'你于梦中见四象流转——风、雷、光、暗各据一方，醒来后体内忽有一丝陌生灵气游走。',
  opts:[
    { t:'引其入体', d:'觉醒一个异种灵根',
      do:function(g){ var all=['feng','lei','guang','an']; var cand=all.filter(function(k){return !g.roots[k]||g.roots[k]<=0;});
        if(!cand.length){ g.addPurity(U.pick(all), 12); return '四象灵气早已齐备，此番更臻精纯。'; }
        var k=U.pick(cand); g.addPurity(k, 20); return '你引导那丝灵气入体——<b class="val">'+D.ROOT[k].n+'灵根</b>觉醒了！'; } },
    { t:'压制下去', d:'保持灵根纯净',
      do:function(g){ g.heart = Math.min(g.maxHeart(), g.heart+10); return '你以道心将异气逼出体外，灵台复归清明。'; } }
  ]});

E.push({ n:'赌石坊', w:5, txt:'坊市角落里堆着上百块毫不起眼的原石，据说偶尔能开出极品灵材。',
  opts:[
    { t:'买三块试试', d:'花灵石赌一把', cost:{spirit:300},
      do:function(g){ g.addSpirit(-300); var got=[];
        for(var i=0;i<3;i++){ if(U.chance(0.35)){ var t = g.rnd(1,3); for(var j=0;j<t;j++){ var k=g.randOreKey(Math.min(3,t)); g.addItem('ore',k,1);} got.push('出玉'); } else got.push('空'); }
        return '三块原石：'+got.join(' / ')+'。开出的灵材已收入囊中。'; } },
    { t:'以神识挑选', d:'需高纯度灵根',
      do:function(g){ var best=g.rootKeys().sort(function(a,b){return g.roots[b]-g.roots[a];})[0];
        if(g.roots[best]>=70){ for(var i=0;i<4;i++) g.addItem('ore', g.randOreKey(3), 1); return '你神识一扫，挑出四块灵光内蕴者，皆出极品。'; }
        return '你神识尚浅，看不出其中门道，空手而归。'; } }
  ]});

E.push({ n:'剑冢', w:4, txt:'万剑插地成冢，每一柄都曾饮血。剑气纵横，割面生疼。',
  opts:[
    { t:'入冢取剑', d:'以身为试，重伤换宝',
      do:function(g){ g.hurt(0.35); g.addTreasure(g.makeTreasure({lv:2, el:'jin'})); return '你浑身浴血走出剑冢，手中多了一柄<b class="val">剑</b>。'; } },
    { t:'于冢外感悟剑意', d:'安全，提升灵根',
      do:function(g){ g.addPurity('jin', g.rnd(5,12)); return '剑意入心，<b class="val">金灵根</b>愈见锋锐。'; } }
  ]});

E.push({ n:'救命之恩', w:5, txt:'一名少年被妖兽追至绝路，此刻正朝你奔来，身后是三头目露凶光的巨狼。',
  opts:[
    { t:'出手相救', d:'战一场，结善缘',
      do:function(g){ g.karma += 18; g.startBattle({kind:'wolf', mult:1.1}); return ''; } },
    { t:'以他为饵', d:'坐收渔利，因果大损',
      do:function(g){ g.karma -= 30; var n=g.rnd(2,5); for(var i=0;i<n;i++) g.addItem('herb', g.randHerbKey(), 2); g.addPurity('an', 6); return '你静待妖兽饱食离去，从容收走现场遗物。<span class="tag cinn">因果 -30</span> <b class="val">暗灵根 +6</b>'; } }
  ]});

E.push({ n:'上古战场', w:4, txt:'荒原上白骨铺陈，残破的兵戈半没于黄沙。这里曾是两位大能的战场。',
  opts:[
    { t:'拾取残兵', d:'得炼器材料',
      do:function(g){ for(var i=0;i<3;i++) g.addItem('ore', g.randOreKey(2), 1); return '你捡了些尚存灵性的残兵碎片。'; } },
    { t:'超度亡魂', d:'道心与因果双增',
      do:function(g){ g.heart=Math.min(g.maxHeart(),g.heart+12); g.karma+=14; return '你诵经三日，无数冤魂得以解脱。<span class="tag jade">道心 +12 · 因果 +14</span>'; } },
    { t:'参悟战场杀意', d:'得杀伐之力',
      do:function(g){ g.karma-=8; g.addPurity('jin',8); g.atkPermanent=0.05; return '无尽杀意涌入识海，你的攻势愈发凌厉。<span class="tag gold">攻击永久 +5%</span>'; } }
  ]});

E.push({ n:'秘境之门', w:4, txt:'虚空中裂开一道缝隙，隐约可见其中琼楼玉宇，有大道之音传出。',
  opts:[
    { t:'踏入', d:'开启一次秘境探索',
      do:function(g){ g.startSecretRealm(); return ''; } },
    { t:'谨慎退开', d:'道心微增', do:function(g){ g.heart=Math.min(g.maxHeart(),g.heart+4); return '你压下贪念退开，裂缝缓缓闭合。'; } }
  ]});

E.push({ n:'丹道切磋', w:5, txt:'一位丹师在路边支起丹炉，扬言无人能在丹道上胜过他。',
  opts:[
    { t:'与之一较高下', d:'比炼丹造诣',
      do:function(g){ if(g.alchPower()>1.4){ g.addSpirit(500*(1+g.node*0.5)); g.karma+=5; return '你一炉成丹，异香扑鼻，丹师拱手认输，赠你灵石一笔。'; } g.addSpirit(-100); return '你火候稍逊，输了些灵石，却也学到不少。'; } },
    { t:'讨教丹方', d:'得药材',
      do:function(g){ g.addItem('herb', g.randHerbKey(), 3); return '丹师见你虚心，赠你灵草三株。'; } }
  ]});

E.push({ n:'月华洗礼', w:5, txt:'十五之夜，明月当空。你忽觉体内灵气随月华起伏，蠢蠢欲动。',
  opts:[
    { t:'对月吐纳', d:'修为与 purity 双收',
      do:function(g){ var q=g.qiRate()*g.rnd(120,220); g.addQi(q);
        var k=g.rootKeys().sort(function(a,b){return g.roots[b]-g.roots[a];})[0];
        g.addPurity(k, 8); return '一夜吐纳，修为 +<b class="val">'+U.fmt(q)+'</b>，<b class="val">'+D.ROOT[k].n+'灵根</b>亦见精进。'; } },
    { t:'以月华淬炼法宝', d:'提升法宝品级',
      do:function(g){ var t=g.bestTreasure(); if(!t) return '你身无长物，只得作罢。';
        t.g = Math.min(11, t.g+ (t.g<11?1:0)); t.s = t.g>=11?3:0;
        return '月华如练注入法宝——<b class="val">'+t.name+'</b> 品级提升！'; } }
  ]});

/* ================= 秘境事件池（多分支） ================= */
var S = D.SECRET_EVENTS = [];

S.push({ n:'幽径', w:10, txt:'秘境深处岔开两条路：左侧幽深寂静，右侧隐隐传来流水声。',
  opts:[
    { t:'走左侧暗道', d:'更危险，宝物更佳', do:function(g){ if(g.rollExplore(0.5,'','')){ g.addTreasure(g.makeTreasure({lv:2})); return '暗道尽头是一间石室，你取走其中法宝。'; } return ''; } },
    { t:'沿水声而行', d:'安全，收获稳定', do:function(g){ g.addItem('herb', g.randHerbKey(2), 3); return '溪畔灵草丛生，你采了三株。'; } }
  ]});

S.push({ n:'守门石像', w:10, txt:'两尊石像持戟而立，挡住了去路。眼中似有灵光流转。',
  opts:[
    { t:'强攻', d:'与石像一战', do:function(g){ g.startBattle({kind:'guard', mult:1.15}); return ''; } },
    { t:'以阵理解阵', d:'需要阵道', do:function(g){ if(g.formPower()>1.3){ g.addItem('ore', g.randOreKey(3),2); return '你以九宫之理推出石像破绽，两像轰然让开。'; } g.hurt(0.15); return '你推演失误，被石像震伤。'; } },
    { t:'原路返回', d:'保全自身', do:function(g){ g.endSecretRealm(true); return '你谨慎退出秘境。'; } }
  ]});

S.push({ n:'灵池', w:9, txt:'一方血色灵池翻涌，池边刻着"以血换力"四个大字。',
  opts:[
    { t:'跃入池中', d:'大幅提升修为与属性，损道心',
      do:function(g){ g.heart-=15; g.addQi(g.qiRate()*g.rnd(400,700)); g.hpPermanent=0.06; return '血池灌体，你痛得几乎晕厥，却觉肉身强横了几分。<span class="tag cinn">道心 -15</span> 气血永久 +6%'; } },
    { t:'取池水炼丹', d:'带走池水', do:function(g){ g.addItem('herb', U.pick(['hh_an2','hh_huo3','hh_lei3']), 2); return '你收了两瓶池水，可作奇药。'; } }
  ]});

S.push({ n:'古碑', w:9, txt:'一块丈高石碑矗立，碑上文字玄奥难明，却牵引着你的神识。',
  opts:[
    { t:'以神识硬解', d:'或得功法，或伤神魂',
      do:function(g){ if(U.chance(0.45)){ g.addTechShard(2); return '碑文在识海中化开——你悟得<b class="val">功法碎片 ×2</b>。'; } g.hurt(0.22); g.heart-=6; return '碑文反噬，你头痛欲裂。'; } },
    { t:'拓印带走', d:'稳妥', do:function(g){ g.addTechShard(); return '你拓下碑文，日后慢慢参详。<b class="val">功法碎片 ×1</b>'; } }
  ]});

S.push({ n:'秘境之主', w:7, txt:'琼楼尽头，一只浑身缠绕黑气的巨兽缓缓睁开了眼睛——它是此间之主。',
  opts:[
    { t:'决一死战', d:'终局之战，重赏',
      do:function(g){ g.startBattle({kind:'boss', mult:1.35, boss:true}); return ''; } },
    { t:'退出秘境', d:'已收获颇丰', do:function(g){ g.endSecretRealm(true); return '你悄然退走，秘境之门在身后闭合。'; } }
  ]});

/* ================= 修炼途中的随机机缘（挂机时自动触发） ================= */
D.IDLE_EVENTS = [
  {k:'wudao', n:'顿悟', w:5, cond:function(g){return true;},
   do:function(g){ g.addBuff('cult', 0.6, 180, '顿悟'); return '你忽然心头一片空明——<b class="val">顿悟！</b> 修炼速度 +60%（3分钟）'; }},
  {k:'lingqi', n:'灵气潮涌', w:6, cond:function(g){return true;},
   do:function(g){ var q=g.qiRate()*g.rnd(60,140); g.addQi(q); return '周遭灵气忽然潮涌，修为 +<b class="val">'+U.fmt(q)+'</b>'; }},
  {k:'heart', n:'道心澄明', w:4, cond:function(g){return g.heart<g.maxHeart();},
   do:function(g){ g.heart=Math.min(g.maxHeart(), g.heart+10); return '你于静坐中反观内照，<span class="tag jade">道心 +10</span>'; }},
  {k:'zouhuo', n:'走火入魔', w:3, cond:function(g){return g.heart<50;},
   do:function(g){ g.heart=Math.max(0,g.heart-14); g.qi = Math.max(0, g.qi*0.9); return '灵气逆行，你险些走火入魔！<span class="tag cinn">道心 -14</span>'; }},
  {k:'baowu', n:'拾得遗物', w:4, cond:function(g){return true;},
   do:function(g){ if(U.chance(0.25)){ g.addTreasure(g.makeTreasure({})); return '你在洞府角落拾得一件<b class="val">法宝</b>！'; } var k=g.randHerbKey(); g.addItem('herb',k,2); return '你拾得灵草 ×2。'; }},
  {k:'purity', n:'灵根自行演化', w:5, cond:function(g){return true;},
   do:function(g){ var k=g.mainRoot(); g.addPurity(k, g.rnd(1,3)); return '<b class="val">'+D.ROOT[k].n+'灵根</b>纯度自行提升。'; }},
  {k:'linshi', n:'灵脉渗流', w:4, cond:function(g){return true;},
   do:function(g){ var s=Math.floor(80*(1+g.node*0.7)); g.addSpirit(s); return '你座下灵脉渗出灵石：<b class="val">'+U.fmt(s)+'</b>'; }},
  {k:'xinmo', n:'心魔滋扰', w:2, cond:function(g){return g.karma<-30;},
   do:function(g){ g.heart=Math.max(0,g.heart-10); return '过往恶业化作心魔袭来，<span class="tag cinn">道心 -10</span>'; }}
];

/* ================= 道（无情/有情） ================= */
D.DAOS = {
  qing: {n:'有情道', desc:'以情证道。与人结缘，宗门弟子与道侣带来额外加成，但心易乱。',
         eff:{sect:0.35, heal:0.20, cult:0.05}, heart:0},
  wu:   {n:'无情道', desc:'断情绝欲。修炼速度极快，突破更稳，但弟子与宗门加成减半。',
         eff:{cult:0.45, breakthrough:0.10, sect:-0.5}, heart:-10}
};

/* ================= 突破天地异象文案 ================= */
D.BREAK_TEXT = [
  '周身灵气轰然一震，你只觉四肢百骸如沐春风。',
  '体内灵力骤然凝实，经脉拓宽了整整一圈。',
  '天上云气翻涌，隐约有紫气自东而来。',
  '你双目睁开时，有金光一闪而逝。',
  '骨骼发出细密的爆响，你体会到"脱胎换骨"四字的分量。',
  '识海之中浪涛拍岸，神识范围凭空扩展数丈。',
  '丹田处传来一声轻响，仿佛什么枷锁被打开了。'
];
})();
