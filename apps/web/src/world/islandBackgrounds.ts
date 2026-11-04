import media from './backgroundMedia.json';

export const ISLAND_BACKGROUNDS: Record<string,{image:keyof typeof media;text:string}> = {
  'A-water':{image:'water',text:'故事中的鲧一直在加高堤坝。这张都江堰的现代照片，供你对照“挡住水”和“给水出路”两种想法；它不是鲧时代的遗迹或影像。'},
  'A-stake':{image:'yu',text:'禹开渠、扶闸与经过家门的故事取自治水传说。画像是后人对传说人物的想象，帮助认识这一人物背景，不代表真实容貌。'},
  'A-bone':{image:'cangjie',text:'仓颉造字是传说。四目的造型和刻字的故事来自传说；这幅后世画像也属于人们对传说的想象。'},
  'A-granary':{image:'houji',text:'故事里的后稷把谷子留进陶罐：吃的是今天，留种想到的是明年。这幅后世画像补充人物与农耕传说的背景。'},
  'B-coal':{image:'rocket',text:'岛上的骡夫面对新来的机车，也面对自己的生计。图片帮助认识“龙号”的形象；游戏中的对话与选择仍是创作，并非历史人物的原话。'},
  'B-gauge':{image:'loom',text:'故事中的织工围着新织机，担心机器替代工作。版画补充卢德运动的背景，不是这座游戏作坊的实拍。'},
  'B-ticket':{image:'lin',text:'故事里，林则徐面对堆满书报的房间，请你接住被风吹散的译稿。画像补充人物背景，游戏中的交谈和操作属于创作。'},
  'B-shift':{image:'wei',text:'魏源在故事中接过译稿，决定书该不该印、该送给谁。画像帮助认识人物；这里的交谈是据背景创作的故事。'},
  'C-screen':{image:'telegraph',text:'岛上的线务员正在处理一根不能顺利上岸的电缆。图片是电键的实物示意，帮助理解怎样把字变成信号，并不是1871年上海的原设备。'},
  'C-dark':{image:'telegraph',text:'故事围绕报务员是否继续守在电台前展开。电键资料图帮助认识发报操作，不是加利福尼亚号船上设备的照片。'},
  'C-relay':{image:'pigeon',text:'故事中的人靠鸽子传递消息。信鸽插图补充这种通信方式的背景；它不代表故事里某一只真实的鸽子。'},
  'C-tz':{image:'pony',text:'骑手把消息带往下一处驿站，这段奔波让传信的代价变得具体。画作描绘驿马快信的形象，不是游戏故事发生时的现场照片。'},
  'D-log':{image:'computer',text:'故事中的值班军官要判断报警该不该上报。配图只表示计算设施，不是1983年的预警系统或值班室；设备给出信号，故事中的人仍要判断。'},
  'D-skip':{image:'computer',text:'深蓝的操作员在故事中面对棋局与计算结果。这里用计算设施作背景，不把天河二号说成深蓝主机，配图也不代表比赛现场。'},
  'D-star':{image:'eliza',text:'故事里的秘书与ELIZA交谈。界面示例帮助理解文字怎样被程序回应，不能据此认定程序理解了人的处境。'},
  'D-weight':{image:'go',text:'记谱员请你辨认棋局里值得记下的一手。棋盘图片只帮助认识围棋的布局，不是AlphaGo比赛现场照片。'},
};

export const BACKGROUND_MEDIA=media;
