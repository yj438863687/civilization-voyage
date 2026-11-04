/**
 * 暗线 · 桃花源
 *
 * 不在任何航线上，铜针不指它。农业段的水面上漂着一路桃花瓣，顺着走到尽头，
 * 「山有小口，仿佛若有光」。进去，是陶渊明写下的那个地方。
 *
 * 出来时你可以「处处志之」。可到了下一个时代，记号还在，那里已经找不到了：
 * 工业时代是一片矿坑，信息时代是一块无信号的空白，智能时代是「该坐标无数据」。
 *
 * 它的意思是：每个时代都在把世界画进地图，而桃花源是地图之外的那个地方——
 * 你越会画图，它离你越远。
 *
 * 引文为陶渊明《桃花源记》原文；对话与回声为创作。
 */
import type { Encounter, Look } from './encounters';

export const TAOYUAN = {
  /** 山口的位置：西边雾里，离两条航线都远 */
  at: { x: -96, z: 30 },
  /** 花瓣从出港附近开始，一路往西漂 */
  trail: [
    { x: -9, z: 32 },
    { x: -16, z: 34 },
    { x: -32, z: 35 },
    { x: -52, z: 34 },
    { x: -72, z: 32 },
    { x: -90, z: 30 },
  ],
};

const SOURCE = '陶渊明《桃花源记》';

const LOOK_TAO: Look = { coat: '#9a8a6a', trim: '#c8a070', skin: '#c49a76', pants: '#5a4a34', hat: 'wrap', prop: 'none' };

export const TAOYUAN_HINT = { kicker: '落英缤纷', text: '水上漂着几片桃花，往西去了。' };

export const TAOYUAN_ENC: Encounter = {
  who: '桃花源中人',
  role: '「先世避秦时乱，率妻子邑人来此绝境」',
  look: LOOK_TAO,
  action: 'idle',
  line: '「林尽水源，便得一山，山有小口，仿佛若有光。」你舍了船，从口入。',
  dialog: [
    { them: '「初极狭，才通人。复行数十步，豁然开朗。」' },
    { them: '「土地平旷，屋舍俨然，有良田美池桑竹之属。阡陌交通，鸡犬相闻。」' },
    { them: '一个老人看见你，吃了一惊：你从哪里来？如今外面是什么世道？' },
    { you: '外面……有人在分水，有人在立桩。往后还会有铁轨、电缆，还有会自己掌舵的船。' },
    { them: '「问今是何世，乃不知有汉，无论魏晋。」——他们听你说完，都叹了一口气。' },
    { them: '你要走的时候，他们说：「不足为外人道也。」' },
  ],
  game: {
    kind: 'choice',
    ask: '出来之后',
    options: [
      {
        label: '处处志之',
        note: '在海图上做记号，以后好再来',
        out: { text: '你一路做了记号。「既出，得其船，便扶向路，处处志之。」', supply: 0, trust: 0, set: { taoyuan: 'marked' } },
      },
      {
        label: '不做记号',
        note: '答应过他们，不足为外人道',
        out: { text: '你什么记号也没做。回头看时，只有水上漂着几片桃花。', supply: 0, trust: 6, set: { taoyuan: 'kept' } },
      },
    ],
  },
};

/** 后来的时代，同一个地方 */
export const TAOYUAN_ECHO: Record<string, { kicker: string; marked: string; kept: string; prop: 'pit' | 'blank' | 'nodata' }> = {
  B: {
    kicker: '暗线 · 寻向所志',
    prop: 'pit',
    marked: '海图上的记号还在。你照着记号开过去，那里是一片新开的矿坑，桃树早就砍了。「寻向所志，遂迷，不复得路。」',
    kept: '你没有记号，只记得是往西。往西是一片新开的矿坑，烟囱底下，有一棵桃树还开着花。',
  },
  C: {
    kicker: '暗线 · 无信号',
    prop: 'blank',
    marked: '实时航图上，你做记号的那一片是空白：无信号。所有的线都绕开了它。',
    kept: '实时航图上，西边有一小块空白：无信号。你没有告诉任何人，那里也许有人。',
  },
  D: {
    kicker: '暗线 · 该坐标无数据',
    prop: 'nodata',
    marked: '你把记号输进去。它说：该坐标无数据，建议绕行。你在那个坐标上停了很久。',
    kept: '它没有提起那片海。你也没有问。只有你知道，地图之外还有一个地方。',
  },
};

export const TAOYUAN_FINALE = {
  quote: '南阳刘子骥，高尚士也，闻之，欣然规往。未果，寻病终。后遂无问津者。',
  source: SOURCE,
};
