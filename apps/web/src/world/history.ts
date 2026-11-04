import type { Encounter, Outcome } from './encounters';
import type { FableState } from './fable';

export const ERA_NAMES: Record<string, string> = { A: '农业时代', B: '工业时代', C: '信息时代', D: '人工智能时代' };
export type HistoryActivity = 'allocation' | 'workshop' | 'dispatch' | 'review';
export interface HistoryScene {
  id: string;
  title: string;
  date: string;
  order: number;
  nature: '史实背景' | '古代传说' | '未来推演';
  who: string;
  image: string;
  paragraphs: string[];
  source: { title: string; url: string };
  activity: HistoryActivity;
  task: string;
  items: string[];
  labels: [string, string];
  options: [HistoryOption, HistoryOption];
}
interface HistoryOption { label: string; note: string; supply: number; trust: number; text: string }
export interface HistoryRoute {
  title: string;
  region: '中国' | '世界';
  period: string;
  question: string;
  opening: string;
  islands: [HistoryScene, HistoryScene];
  crisis: HistoryScene;
  ending: { name: string; date: string; order: number; deed: string; image: string; reflection: string; fictional?: boolean };
}
const care = (label: string, note: string, text: string, supply = -6, trust = 8): HistoryOption => ({ label, note, text, supply, trust });
const fast = (label: string, note: string, text: string, supply = 7, trust = -5): HistoryOption => ({ label, note, text, supply, trust });
function scene(id: string, title: string, date: string, order: number, who: string, image: string, paragraphs: string[], source: HistoryScene['source'], activity: HistoryActivity, task: string, items: string[], labels: [string, string], options: [HistoryOption, HistoryOption], nature: HistoryScene['nature'] = '史实背景'): HistoryScene {
  return { id, title, date, order, who, image, paragraphs, source, activity, task, items, labels, options, nature };
}
const waterSource = { title: '联合国教科文组织：都江堰', url: 'https://whc.unesco.org/en/list/1001/' };
const yuSource = { title: '《史记·夏本纪》：治水传说的文献记录', url: 'https://ctext.org/shiji/xia-ben-ji/zh' };
const urukSource = { title: '大都会艺术博物馆：乌鲁克', url: 'https://www.metmuseum.org/essays/uruk-the-first-city' };
const railSource = { title: '国家铁路局：百年京张', url: 'https://www.nra.gov.cn/tlfc/tpsy/202204/t20220405_293018.shtml' };
const bookSource = { title: '《海国图志》：原书', url: 'https://zh.wikisource.org/wiki/海國圖志' };
const wattSource = { title: '科学博物馆：瓦特与分离冷凝器', url: 'https://blog.sciencemuseum.org.uk/james-watt-and-the-separate-condenser/' };
const factorySource = { title: '英国议会：1833 年工厂法', url: 'https://www.parliament.uk/about/living-heritage/transformingsociety/livinglearning/19thcentury/overview/factoryact/' };
const chinaWireSource = { title: '中国电信博物馆：从1871年海缆到1881年津沪电报', url: 'https://museum.chinatelecom.com.cn/yj/txkp/202507/t20250709_88651.html' };
const schoolSource = { title: '上海档案馆：1896 年请设学堂', url: 'https://www.shda.gov.cn/dawh/dacq/202604/t20260410_76503.html' };
const morseSource = { title: '美国国会图书馆：1844 年第一封电报', url: 'https://www.loc.gov/item/mcc.019/' };
const cableSource = { title: '美国国务院历史办公室：1866 年跨洋电缆', url: 'https://history.state.gov/milestones/1866-1898/telegraph' };
const shannonSource = { title: '贝尔实验室：1948 年《通信的数学理论》', url: 'https://www.nokia.com/bell-labs/publications-and-media/publications/a-mathematical-theory-of-communication/' };
const planSource = { title: '国务院：2017 年新一代人工智能发展规划', url: 'https://app.www.gov.cn/govdata/gov/201707/20/408540/article.html' };
const privacySource = { title: '全国人大：2021 年个人信息保护法', url: 'https://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559.htm' };
const elizaSource = { title: '计算机历史博物馆：ELIZA（1966）', url: 'https://www.computerhistory.org/timeline/ai-robotics/' };
const goSource = { title: 'DeepMind：AlphaGo 与李世石（2016）', url: 'https://deepmind.google/research/alphago/' };

/** 一条航线只有一个问题。岛屿按年代排列；玩家行动与台词均为创作。 */
export const HISTORY_ROUTES: Record<string, HistoryRoute> = {
  'A-near': {
    title: '水流向谁的田', region: '中国', period: '治水传说 → 战国', question: '能改变河流以后，谁来决定水的去向？',
    opening: '船从洪水传说驶向战国的岷江。你将看见，治水从一种本领，渐渐变成需要两岸共同维护的生活秩序。',
    islands: [
      scene('A-water', '堤外还有人', '鲧的传说', -3000, '鲧', 'water', ['古代文献讲到鲧筑堤治水，失败后由禹继续。传说没有可靠纪年；这里先读父辈的困境，再走向后人的办法。', '你进入的是据传说创作的村落。加高堤坝能暂时保住本村，水却开始积向邻村。土够用，人手不够，邻村派人来求你留一道泄水口。'], yuSource, 'allocation', '把八份土工和口粮分给本村加堤或邻村泄水渠。至少分四份给邻村，才能开出水口。', ['土工一队', '土工二队', '土工三队', '土工四队', '口粮一袋', '口粮二袋', '口粮三袋', '口粮四袋'], ['留在本村', '送去邻村'], [fast('先保本村', '省下物资，邻村承担涨水', '本村堤坝高了。邻村的田进了水；下次征人修堤，他们迟迟没有来。'), care('合修泄水渠', '出人出粮，给水留路', '水从渠口分走。邻村的人带着工具回来，两岸约好轮流看水。')], '古代传说'),
      scene('A-stake', '一条渠，两岸田', '禹的传说 · 在鲧之后', -2900, '禹', 'yu', ['传说中，禹承接鲧未竟的治水任务。疏导河道的叙述，让人开始思考怎样顺着水势安排土地。', '上一个村子的办法传到了这里。主渠已通，上游愿意出粮换更多水，下游却只有枯苗。现在由你安排开闸的时辰。'], yuSource, 'allocation', '把八个放水时辰分给上下游。至少四个时辰给下游，才能让两岸都开始下种。', ['清晨', '早饭后', '上午', '正午', '午后', '傍晚', '入夜', '深夜'], ['上游', '下游'], [fast('接受上游的粮', '船上更充足，下游继续等水', '上游送来粮食，下游错过了这一轮灌溉。看水人开始争论：粮多的人能不能一直先开闸？'), care('约定两岸轮灌', '拒绝额外报酬，按时轮灌', '两岸在渠边刻下轮灌的时辰。看水人有了共同遵守的约定。')], '古代传说'),
    ],
    crisis: scene('A-n-flood', '春汛前的一次商量', '战国 · 约公元前 256 年', -256, '岷江边的乡民', 'water', ['离开传说，船来到有工程遗存可考的都江堰。分水、排沙与泄洪相互配合，工程需要持续维护。', '春汛将至，沿岸请船队帮忙疏浚。若把口粮都留给航行，船能早到；若留下协修，两岸才赶得及开渠。'], waterSource, 'allocation', '安排八份出港物资；至少四份留作协修，才能赶在汛前完成。', ['木料', '绳索', '粮一', '粮二', '工时一', '工时二', '工时三', '工时四'], ['随船出港', '留岸协修'], [fast('按期出港', '留下物资，按原计划离岸', '船准时离岸。乡民仍在河边等人，汛前的维护少了一支力量。'), care('停航协修', '延迟一程，付出粮与工时', '船晚走了一天。渠口清了，两岸的人把下一季的看水名单一同定下来。')]),
    ending: { name: '李冰', date: '战国 · 约公元前三世纪', order: -256, deed: '秦国蜀郡守，主持都江堰工程。这里的回顾是据史实创作的对话。', image: 'water', reflection: '从筑堤到疏渠，变的是办法；从只保一家到共同看水，变的是人与人的约定。水利技术让人留下来，分水和维护的规矩才让两岸一起过下去。' },
  },
  'A-far': {
    title: '粮仓里的名字', region: '世界', period: '约公元前 3500—3200 年 · 两河流域', question: '有了粮仓与记账，丰收能不能成为每个人的保障？',
    opening: '船驶向两河流域。灌溉带来余粮，余粮聚成粮仓，粮仓又需要记录；沿途要问的是，记录会照顾谁，又会漏掉谁。',
    islands: [
      scene('A-bone', '把收成留下来', '约公元前 3500 年', -3500, '两河流域的管仓人', 'grain', ['灌溉农业支持了两河流域聚落的扩大，储粮与分配随之成为公共事务。这个管仓家庭与它的抉择是创作。', '本季大麦有余。船可以用高价换走，也可以留给下一季没有收成的家庭。仓门外，修渠的人也在等自己的份额。'], urukSource, 'allocation', '八份余粮中，至少四份留给修渠家庭和下一季播种。', ['大麦一', '大麦二', '大麦三', '大麦四', '大麦五', '大麦六', '大麦七', '大麦八'], ['装船交易', '留在粮仓'], [fast('收粮出港', '获取航行补给', '船舱满了。修渠家庭的口粮要等下一批收成。'), care('留下共同储备', '少装一批粮，保住下一季', '余粮留在仓里。修渠的家庭有了口粮，也答应照看下一段水道。')]),
      scene('A-granary', '泥板记得谁', '约公元前 3200 年', -3200, '乌鲁克的记账学徒', 'tablet', ['乌鲁克早期泥板记录物资与数量，书写的发展与管理活动关系密切。泥板不是现代意义的人人平等的账本。', '上一站的粮到了这里。交粮者有印记，搬粮和修渠的人却没有。学徒问你，花更多时间补上他们，还是照旧只记交粮者？'], urukSource, 'review', '翻看三条仓单，判断现有记录是否足以直接发粮。', ['仓单写了交粮者的名字', '仓单记了大麦总量', '修渠家庭与搬运者没有列入'], ['照单办理', '补查漏记者'], [fast('照原单发粮', '省下核对与等待', '账和实物相符，漏记的人仍领不到粮。数字没错，名单却不完整。'), care('补查后再发粮', '付出核对工时', '学徒另刻一块泥板，把参与劳作的人补上。仓门晚关了一会，漏记的人领到了粮。')]),
    ],
    crisis: scene('A-f-famine', '欠收后的仓门', '约公元前 3200 年 · 情境创作', -3200, '粮仓门前的家庭', 'grain', ['储备和账册都已经建立。现在一段欠收时节到来，船上也要靠这批粮继续走。', '这不是对某次古代饥荒的复原。你要决定，按先前留下的记录分粮，还是把船的份额先拿走。'], urukSource, 'allocation', '八份存粮至少四份留给仓单上的家庭。', ['存粮一', '存粮二', '存粮三', '存粮四', '存粮五', '存粮六', '存粮七', '存粮八'], ['随船带走', '按名单分粮'], [fast('先装船', '船先度过缺粮期', '船有了余粮，仓门前还有人在等。记账没有自动改变分配的次序。'), care('先兑现分粮约定', '船上收紧口粮', '船员少领了一份。仓门前的人按名单领粮，上一站的记录有了实际分量。')]),
    ending: { name: '乌鲁克的老书记员', date: '约公元前 3200 年 · 虚构人物', order: -3200, deed: '以早期城市管理为背景创作的记录者，用来回顾储粮与记账的关系。', image: 'tablet', fictional: true, reflection: '渠把粮食带到仓里，字把粮食记在泥板上。但账上写谁、荒年先分给谁，仍由人决定。技术让城市能容纳更多人，文明还要回答怎样让这些人一起生活。' },
  },
  'B-near': {
    title: '从一本书到一条路', region: '中国', period: '1839—1909 年', question: '学会新的技术以后，怎样让它成为更多人的出路？',
    opening: '从翻译外国材料到自主修建铁路，这一程沿着“看见、学习、动手”的先后走。机器进来以后，知识、工作和代价怎样分配？',
    islands: [
      scene('B-coal', '先把世界读清楚', '1839—1841 年', 1839, '林则徐', 'lin', ['林则徐组织翻译外国地理与书报资料，《四洲志》后来成为魏源编书的重要材料。', '在这间创作的译书房里，船上的时间只够赶译一部分。商人愿为船炮和货价付钱，港务与普通人的生活资料却无人催问。'], bookSource, 'review', '核对三份译稿，决定是否为未译的材料再留一天。', ['船炮规格已有译稿', '港口货价已有译稿', '工匠培训与地方生活材料仍未译完'], ['只带急用材料', '补齐后共同读'], [fast('先带走船炮资料', '尽快换取技术与货价', '译稿先到了商人手里。工匠想学怎样维修，只能等下一次。'), care('补译并让工匠共读', '多付译工口粮', '船晚开一天。工匠也拿到了译稿，提出先办一间能教维修的学堂。')]),
      scene('B-gauge', '书该送到哪里', '1842 年', 1842, '魏源', 'wei', ['魏源据《四洲志》等材料编纂《海国图志》，讨论世界地理与学习外国技术。版本在之后多年继续扩充。', '上一站带来的材料排上了书版。有限的纸墨是用来印少量高价本，还是多印简本给港口的学徒？这里的印书安排是创作。'], bookSource, 'allocation', '八份纸墨至少四份用于供学徒共读的简本。', ['纸一', '纸二', '纸三', '纸四', '墨一', '墨二', '刻工一', '刻工二'], ['精装售书', '学徒共读'], [fast('先印高价本', '用售书收入补给船队', '书卖出去了。码头学徒想借一本，仍须等人转借。'), care('给学徒留简本', '减少这批收入', '学徒轮流读书，把不懂的零件画下来。知识开始走出书房。')]),
    ],
    crisis: scene('B-n-boiler', '路通之前', '1909 年 · 京张铁路通车背景', 1909, '工地上的领工', 'zhan', ['1905—1909 年，詹天佑主持京张铁路建设。把书里的技术变成能使用的铁路，需要工程师，也需要工人的劳动。', '这段施工抉择是创作：赶工能保住船队的合同，安排休息与培训会增加眼前开支。前两站谈的“学会”，现在落在工地上。'], railSource, 'workshop', '四个工班中，至少给两个工班留出休息与学徒培训。', ['测量班', '开山班', '铺轨班', '机修班'], ['连班赶工', '休息与培训'], [fast('连班赶工', '保住眼前的合同收入', '合同如期交付，工人疲惫，学徒仍只能跟着做。'), care('调班并带学徒', '多付口粮，少赶一班', '工期留了余量。工人有了休息，机修学徒终于独立排除了一次故障。')]),
    ending: { name: '詹天佑', date: '1909 年 · 京张铁路', order: 1909, deed: '1861—1919 年。主持京张铁路的勘测、设计与施工。回顾台词为创作。', image: 'zhan', reflection: '从译书到印书，再到修路，技术终于从纸上走到土地上。自强既需要会设计的人，也需要能学习、有休息、被尊重的劳动者。一条路的价值，还在于它给谁带来了新的机会。' },
  },
  'B-far': {
    title: '机器转起来以后', region: '世界', period: '1769—1842 年 · 英国', question: '生产越来越快，人的生活也一定会更好吗？', opening: '先看蒸汽机怎样省煤，再进工厂看劳动怎样安排，最后问生产的收益能否换来生活的改善。',
    islands: [
      scene('B-ticket', '省下来的煤', '1769 年', 1769, '瓦特作坊的学徒', 'watt', ['1769 年，瓦特取得涉及分离冷凝器的专利，使蒸汽机能更有效地利用燃料。', '在据此创作的作坊里，节煤让订单增加。你能把省下的物资都投入增产，也能留一部分培训新工人、维护机器。'], wattSource, 'allocation', '八份节余中，至少四份用于维护与培训。', ['煤一', '煤二', '煤三', '煤四', '工时一', '工时二', '工时三', '工时四'], ['接单增产', '维护培训'], [fast('全力接新订单', '船队多得一批煤', '炉火烧得更久，订单多了，新学徒还没学会关机检修。'), care('先维护并带新人', '少接一批订单', '学徒学会检修，机器停下来保养。工人记得船队允许他们把活学明白。')]),
      scene('B-shift', '钟声下的童年', '1833 年', 1833, '纺织厂的成年织工', 'loom', ['1833 年英国工厂法限制纺织业童工劳动，并要求部分儿童每日接受教育。机器提高产量之后，劳动规则需要另行争取。', '在创作的工厂里，成年工人愿意接替短缺的工时。船队要决定是否付出额外工资，让孩子按安排去上课。'], factorySource, 'workshop', '给四组工人排班；至少两组安排成人替班与上课时间。所有方案都遵守已有法定限制。', ['纺纱组', '织布组', '搬运组', '整理组'], ['最低安排', '增加替班与教育'], [fast('只按最低安排排班', '减少额外工资', '工厂满足最低要求，家庭仍难以兼顾收入与孩子的学习。'), care('支付成人替班费用', '少拿一批货款', '孩子多留在课堂一会，成人工人领到替班工资。少出的布有了明确去处。')]),
    ],
    crisis: scene('B-f-strike', '交货日的工班表', '1842 年 · 情境创作', 1842, '码头工人的代表', 'loom', ['工业化没有只靠发明完成。劳动时间、教育与安全不断进入公共争论。', '船队交货在即，工人要求保留前一站答应的轮休与学习安排。守约会减少本航次余粮，压缩它们则能按最紧的期限交货。'], factorySource, 'workshop', '四个工班中，至少保留两班的轮休与学习安排。', ['早班', '午班', '晚班', '夜班'], ['压缩到最低', '保留约定'], [fast('压缩安排赶交货', '保住这次额外收益', '货交得早，工人把原来的承诺划掉。以后再谈新机器，他们先问合同。'), care('按原约定调班', '船队承担延期成本', '货晚交了。工人保住轮休，愿意与船队讨论下一轮改造。')]),
    ending: { name: '工厂调查员', date: '1842 年 · 虚构人物', order: 1842, deed: '以英国工业化时期的劳动调查为背景创作，回顾动力、生产与劳动生活。', image: 'loom', fictional: true, reflection: '瓦特改变了用煤的办法，工厂改变了工作的节奏。机器不会自己替人缩短工时，也不会自己把孩子送进课堂。技术带来更多产出，文明要决定这些产出怎样改善人的生活。' },
  },
  'C-near': {
    title: '电线接上之后', region: '中国', period: '1871—1896 年', question: '消息能够远行以后，谁有机会发声与学习？', opening: '从上海的海缆到津沪电报，再到培养人才：线路建起来以后，还要有人会用，也要有人能负担使用。',
    islands: [
      scene('C-screen', '海缆来到岸边', '1871 年 · 上海', 1871, '上海的线务学徒', 'telegraph', ['1871 年，国际海底电报线路延伸到上海，远距离通信开始改变口岸消息的往来。', '这里的接线站是创作。外商愿意包下时段，地方求医与家书只能排在后面。你为船队安排使用时段，也替普通来信留一个位置。'], chinaWireSource, 'dispatch', '线路只能先发两封：选择要优先送出的消息。', ['商船货价', '加急货单', '求医消息', '家人报平安'], ['商贸优先', '给普通来信留位'], [fast('先发两封货单', '货价消息换来补给', '船队及时谈定货价。求医的人仍在窗外等。'), care('给求医与家书留位', '放弃一部分报酬', '求医消息先送出。线务员第一次听见收信人的名字，而不只是账上的号码。')]),
      scene('C-dark', '津沪之间的两封信', '1881 年', 1881, '津沪电报线的报务员', 'sheng', ['1881 年津沪电报线开通，中国自主经营的近代电信事业继续发展。架线之外，资费、值班和人才培养同样影响使用。', '上一站的通信办法来到更长的线路。报务员问你：仍让高价货单排满，还是留出普通人的急用时段？'], chinaWireSource, 'dispatch', '先送出两封电报。带有求助内容的消息需要专人核对。', ['航运报价', '包线订单', '灾情求援', '外出工人家书'], ['照价排队', '保留求助时段'], [fast('按付费高低发报', '船队的商单先到', '商单很快收到回电，求助消息还在等可用的时段。'), care('先送求援与家书', '承担核对与转送费用', '报务员核对地名，送出求援。船队错过一点价差，也留下了新的值班规矩。')]),
    ],
    crisis: scene('C-n-wire', '谁来守下一班', '1896 年 · 办学背景下的情境创作', 1896, '新来的报务学徒', 'sheng', ['盛宣怀参与近代电报事业，也倡办学校培养人才。通信网络的延续，需要知识传给后来的人。', '一位熟练报务员离开了。临时雇人能接住眼前商单，留下时间训练学徒，则会少接几笔生意。'], schoolSource, 'workshop', '四班中至少两班留给资深报务员带教。', ['识码班', '核对班', '线路班', '夜值班'], ['接满商单', '留班带教'], [fast('临雇熟手接满商单', '先顾本航次利润', '商单照常发出。学徒仍只会抄录，下一次缺人还得再找熟手。'), care('留出带教班次', '付出口粮与培训时间', '学徒第一次独立值班。普通人的急用时段也有人接了。')]),
    ending: { name: '盛宣怀', date: '1896 年 · 电报与办学', order: 1896, deed: '1844—1916 年。参与中国近代电报事业，倡办近代学校。回顾台词为创作。', image: 'sheng', reflection: '海缆接通的是距离，津沪线路建立的是组织，学校培养的是后来守线的人。信息技术能把话送得很远；能不能让更多人用得上、听得懂、学得会，需要社会另作安排。' },
  },
  'C-far': {
    title: '连通不等于听见', region: '世界', period: '1844—1948 年', question: '传得更快、更准，是否就能让彼此更好地理解？', opening: '从一条电报线，到横跨大洋的电缆，再到信息论。这一程把“能不能传到”与“该听见什么”放在一起看。',
    islands: [
      scene('C-relay', '四十英里之外', '1844 年 · 美国', 1844, '摩尔斯身边的报务学徒', 'morse', ['1844 年，摩尔斯在华盛顿与巴尔的摩之间演示电报通信。消息的速度开始摆脱信使的脚程。', '在创作的报房里，商行与走失者的家人同时来发报。你只能先送两封。'], morseSource, 'dispatch', '从四封消息中先发两封。', ['批发商报价', '铁路货单', '寻找走失的家人', '医师出诊请求'], ['收入优先', '急用优先'], [fast('优先处理商单', '获得加急报酬', '货价先到了。家人仍站在窗边等消息。'), care('先发寻人与求医', '减少商单收入', '两封急用电报送出去。新技术第一次进入了这些家庭的日常。')]),
      scene('C-tz', '大洋两边的等待', '1866 年', 1866, '大西洋电缆站的值班员', 'cable', ['1866 年，跨大西洋电报通信建立了持久的连接。大洋不再意味着只能等船带回消息。', '线路昂贵，时段紧张。前一站的排序办法到了大洋两岸：商行愿意付得更多，海难家属只能凑出一笔普通资费。'], cableSource, 'dispatch', '从四封跨洋消息中先发两封。', ['证券报价', '包线商单', '海难生还名单', '移民家人来信'], ['按价排队', '留出普通窗口'], [fast('把窗口卖给商行', '换取更多补给', '海底的线更忙了，家属仍在海边等名单。'), care('保留普通人的窗口', '船队补贴转送费用', '生还名单送到另一岸。有人终于知道亲人还活着。')]),
    ],
    crisis: scene('C-f-wire', '有限的信道', '1948 年 · 情境创作', 1948, '通信实验室的工程师', 'shannon', ['香农在 1948 年发表《通信的数学理论》，研究信道容量、编码与噪声等问题。', '实验室能改进传输，眼前的线路容量仍然有限。船队要选择继续出售全部容量，还是为求助通信保留一部分。'], shannonSource, 'dispatch', '四类消息只能先送两类。', ['高价行情', '批量广告', '失联者求助', '紧急医疗联络'], ['全部出售', '保留公共通信'], [fast('先接高价消息', '靠线路收入补给船队', '线路利用率很好。有人却没有等到回应，因为他的消息还没排到。'), care('保留求助的容量', '减少线路收入', '求助消息送达。工程师把保留公共容量写进值班说明。')]),
    ending: { name: '克劳德·香农', date: '1948 年 · 信息论', order: 1948, deed: '1916—2001 年。提出通信的数学理论。这里讨论分配问题的台词为创作，并非他的原话。', image: 'shannon', reflection: '电报缩短等待，电缆跨过大洋，信息论解释怎样更可靠地传送。公式帮助我们算清能传多少；消息是否值得先传、费用由谁负担，仍是人与社会的决定。' },
  },
  'D-near': {
    title: '把什么交给机器', region: '中国', period: '2017—2035 年 · 含未来推演', question: '当技术能够替人作判断，怎样保留人的知情与决定？', opening: '先看发展规划，再看个人信息保护，最后进入明确虚构的未来港口。能力、边界与责任，要一起上船。',
    islands: [
      scene('D-log', '一张更快的调度表', '2017 年', 2017, '港口调度员', 'computer', ['2017 年，《新一代人工智能发展规划》发布。发展人工智能的同时，规划也提出关注伦理、法律与社会问题。', '这个试验港口是创作。系统能节省等待时间，但部分老工人不熟悉新终端。你可以立即换班，也可以付出时间让他们参与培训。'], planSource, 'workshop', '四班中至少两班留出培训与人工复核。', ['装卸班', '引航班', '维修班', '调度班'], ['立即全量排班', '培训后共同排班'], [fast('照系统立即排班', '尽快获得调度收益', '等待缩短了。不熟悉终端的人被排到临时岗位，却不知道怎样回到原来的工作。'), care('边培训边试运行', '支付学习与复核时间', '试验慢了一些。老工人指出一处潮汐资料的错误，调度表被改正。')]),
      scene('D-skip', '多问一句同不同意', '2021 年', 2021, '负责乘员信息的登记员', 'computer', ['2021 年，《个人信息保护法》施行，个人信息处理有了进一步的制度规范。具体游戏方案是创作，不作法律操作指引。', '上一站调度开始收集更多信息。基本运行不受影响的情况下，是否为可选的个性化服务另外征求意见、提供退出方式？'], privacySource, 'review', '查看系统提交的说明，再决定是否开放可选服务。', ['基本运行只用必要的值班信息', '可选服务还想采集个人日常偏好', '退出入口和单独说明尚未做好'], ['暂不开放可选服务', '先补齐说明和退出'], [fast('先不开可选服务', '省下改造成本，基本运行照常', '系统继续运行，个性化服务暂缓。船队保留物资，也没有为乘员增加一个可选择的方案。', 4, 0), care('做完说明与退出入口', '付出界面与沟通成本', '乘员看懂用途，有人选择参加，也有人退出。调度员学会把“能采集”与“愿意提供”分开。')]),
    ],
    crisis: scene('D-n-grant', '没有被算进来的港口', '2035 年 · 未来推演', 2035, '船上的轮值船长', 'computer', ['以下为未来情境创作，不是已经发生的事件或技术预测。', '系统给出最省能耗的路线，却略过一座物资不足的小港。船员发现，小港的数据已经很久没有更新。你是否先核查再决定绕行？'], planSource, 'review', '对照路线建议、资料日期与小港来信，作出航行决定。', ['最短路线能节约燃料', '小港资料半年未更新', '港口昨夜送来求援消息'], ['照原路线继续', '核查并保留人工决定'], [fast('继续原定路线', '船先保住燃料余量', '船顺利通过。你把未停靠的原因写进日志，小港的消息仍等待下一艘船。'), care('停下来核查并绕行', '耗费燃料，接近求援港', '船员核实来信后修改路线。系统提供计算，停不停靠由船上的人共同决定。')], '未来推演'),
    ending: { name: '船队的轮值船长', date: '2035 年 · 虚构人物', order: 2035, deed: '未来航程中的中国船长，负责回顾培训、知情选择与航行决定。', image: 'computer', fictional: true, reflection: '调度表能更快，数据也能更多。但船员要有学习的机会，乘员要知道自己交出了什么，最终的航行决定要有人负责。人工智能怎样进入文明，取决于我们怎样安排能力、边界与责任。' },
  },
  'D-far': {
    title: '会回答，能负责吗', region: '世界', period: '1950—2016 年', question: '机器表现出智能时，人应该相信到哪一步？', opening: '从图灵提出的问题，到 ELIZA 的对话，再到 AlphaGo 的棋局。机器的表现越来越强，我们对它的期待与判断也需要改变。',
    islands: [
      scene('D-weight', '像在理解你', '1950 → 1966 年', 1966, 'ELIZA 实验室的研究助理', 'eliza', ['1950 年，图灵讨论机器智能与模仿游戏。1966 年，魏岑鲍姆的 ELIZA 让人通过文字体验与程序对话。', '程序能根据文字作出回应，人却可能从中读出更多理解。这个创作的演示室需要决定，是只展示流畅回答，还是一同展示它的工作方式。'], elizaSource, 'review', '先读三条演示记录，决定怎样向来访者介绍程序。', ['程序能把提问换一种说法', '它没有核实来访者讲的事情', '听起来贴心并不能证明理解'], ['直接作流畅演示', '连同局限一起演示'], [fast('只做简短演示', '节省讲解时间', '来访者记住了回答。有几个人把程序当成能了解自己处境的顾问。'), care('解释回答的来源与局限', '延长讲解，减少场次', '来访者仍觉得新奇，也知道程序没有核实自己的生活。')]),
      scene('D-star', '棋盘上的一手', '2016 年', 2016, '观看 AlphaGo 对局的棋手', 'go', ['2016 年，AlphaGo 以 4 比 1 战胜李世石，展示出机器学习在围棋上的能力。', '从能对话到能赢棋，机器的表现变强了。可棋局里的成功，能不能直接当成它在别处也可靠的证据？你受邀为一场公开讲解挑选材料。'], goSource, 'review', '对照三份材料，决定演示是否可以推广到航海决策。', ['围棋对局有清楚的规则和胜负', '对局结果证明了围棋领域的能力', '没有提供恶劣天气中航行的试验'], ['只做围棋展示', '另做航行情境验证'], [fast('只完成棋局展示', '减少试验开支，保持原有人工航行', '演示顺利结束。船队没有新增试验，仍由原来的船员负责航行。', 4, 0), care('投入航行情境验证', '花物资验证新的用途', '试验暴露了过期资料的问题。棋手说，赢棋很了不起，可另一种工作需要另一份证据。')]),
    ],
    crisis: scene('D-f-proposal', '演示厅外的决定', '2016 年 · 情境创作', 2016, '船队的技术评估员', 'turing', ['这是据前两站提出的问题创作的评估情境，不是 AlphaGo 实际的航行应用。', '赞助人愿意为一次全自动航行演示付费。船员担心验证还不充分，希望保留人工确认与接管。你的前两次选择，会影响现在有没有人帮你复核。'], goSource, 'review', '看完演示合同，再决定接不接受这次委托。', ['赞助款足够补满船上物资', '完整的复杂海况验证尚未完成', '人工确认和接管会增加值班成本'], ['谢绝演示继续原航程', '改成有人工确认的试航'], [fast('谢绝演示，保持原航程', '不支出试航成本，也不接赞助', '船队照常航行。没有人冒险，也暂时没有新的验证结果。', 3, 0), care('协商保留确认与接管', '付出试航与值班物资', '赞助人接受了修改后的演示。船员逐项记录系统能做什么、何时需要接管。')]),
    ending: { name: '机器智能展的策展人', date: '2016 年 · 虚构人物', order: 2016, deed: '回顾图灵、ELIZA 与 AlphaGo 的当代记录者；不让早已去世的人物评论后来的事件。', image: 'turing', fictional: true, reflection: '图灵让人重新提出问题，ELIZA 让人看见期待怎样投向机器，AlphaGo 展示了新的能力。承认技术的进步，也要求证据、说明与责任，才能让信任跟得上能力。' },
  },
};

export function historyFor(era: string | undefined, lane: string): HistoryRoute | null {
  return HISTORY_ROUTES[`${era}-${lane}`] ?? null;
}
export function sceneFor(id: string): HistoryScene | null {
  for (const route of Object.values(HISTORY_ROUTES)) {
    const found = [...route.islands, route.crisis].find(s => s.id === id);
    if (found) return found;
  }
  return null;
}
export function cooperationBonus(scene: HistoryScene, state: FableState): number {
  const route = Object.values(HISTORY_ROUTES).find(route => [...route.islands, route.crisis].some(island => island.id === scene.id));
  if (!route) return 0;
  const position = [...route.islands, route.crisis].findIndex(island => island.id === scene.id);
  return position > 0 && state[`history:${route.islands[position - 1].id}`] === 'care' ? 3 : 0;
}
export function historyOutcome(scene: HistoryScene, option: number, state: FableState, selected?: number[]): Outcome {
  const chosen = scene.options[option === 1 ? 1 : 0];
  const supported = cooperationBonus(scene, state) > 0;
  if (scene.activity === 'dispatch' && selected?.length === 2 && selected.filter(index => index >= 2).length === 1) {
    const waiting = scene.items.filter((_, index) => !selected.includes(index));
    const text = `你先发了「${scene.items[selected[0]]}」与「${scene.items[selected[1]]}」。一封商单带来部分收入，一封急用消息得到回应。「${waiting.join('」与「')}」还在等待。${supported ? '上一站留下的合作省回了 3 份补给。' : ''}`;
    return { text, supply: Math.round((scene.options[0].supply + scene.options[1].supply) / 2) + (supported ? 3 : 0), trust: 2, set: { [`history:${scene.id}`]: 'mixed', [`history:${scene.id}:text`]: text, [`history:${scene.id}:label`]: '一封商单，一封急用消息' } };
  }
  return { text: `${chosen.text}${supported ? '上一站留下的合作让人手更充足，船队省回了 3 份补给。' : ''}`, supply: chosen.supply + (supported ? 3 : 0), trust: chosen.trust, set: { [`history:${scene.id}`]: option === 1 ? 'care' : 'fast' } };
}
export function historyChoices(scene: HistoryScene): Encounter['game'] {
  return { kind: 'choice', ask: scene.task, options: scene.options.map((o, i) => ({ label: o.label, note: o.note, out: { text: o.text, supply: o.supply, trust: o.trust, set: { [`history:${scene.id}`]: i ? 'care' : 'fast' } } })) };
}
export function routeRecap(route: HistoryRoute, state: FableState): string[] {
  return [...route.islands, route.crisis].map(scene => {
    const decision = state[`history:${scene.id}`];
    return `${scene.date}，${scene.title}：${state[`history:${scene.id}:text`] ?? (decision ? historyOutcome(scene, decision === 'care' ? 1 : 0, state).text : '你还没有完成这一站的决定。')}`;
  });
}

/** 前站的具体决定在下一站继续出现；它提供合作，也带来尚未解决的事。 */
export function previousDecision(scene: HistoryScene, state: FableState): string | undefined {
  const route = Object.values(HISTORY_ROUTES).find(route => [...route.islands, route.crisis].some(island => island.id === scene.id));
  if (!route) return;
  const index = [...route.islands, route.crisis].findIndex(island => island.id === scene.id);
  if (index < 1) return;
  const previous = route.islands[index - 1];
  const chosen = state[`history:${previous.id}`];
  if (!chosen) return;
  return `上一站「${previous.title}」，你选择了「${state[`history:${previous.id}:label`] ?? previous.options[chosen === 'care' ? 1 : 0].label}」。${state[`history:${previous.id}:text`] ?? previous.options[chosen === 'care' ? 1 : 0].text} ${chosen === 'care' ? '愿意继续合作的人跟来了，这一站可省回 3 份补给。' : '船上留住了物资；上一站还未解决的处境也要继续记着。'}`;
}
