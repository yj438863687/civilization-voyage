/**
 * 童话的「记忆」：你在前面做过的事，后面会应验。
 *
 * - fableLive：小游戏进行中的实时数值。3D 画面每帧直接读它，所以你拨闸的时候，
 *   岛上的两块田是跟着指针涨水的，不用等结果。
 * - FableState：一条航线上已经发生的事（比如 gate=even、stakes=gap）。
 *   危机、岸上人物、最后那一页绘本都按它来讲。
 */
export type FableState = Record<string, string>;

export const fableLive = {
  /** 哪一座岛正在被玩：遭遇的 id */
  island: '',
  /** 0..1，比如分水指针的位置 */
  value: 0.5,
  /** 危机中的水位：0 平静，1 涨满 */
  flood: 0,
  /** 船的位置：岛上的人转头看它 */
  ship: { x: 0, z: 0 },
};

/** 童话小岛摆在材料旁边多远：船靠近材料时，岛正好在镜头里 */
export const ISLAND_OFFSET = { x: 7.5, z: -3 };
/** 危机里的村子相对危机点的位置 */
export const VILLAGE_OFFSET = { x: 9, z: -9 };
