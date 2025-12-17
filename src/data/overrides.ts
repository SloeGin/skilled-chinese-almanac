export interface OverrideText {
  zh: string;
  en: string;
}

export interface DayOverride {
  /** 某天固定展示的宜内容标题（中英文） */
  yi?: OverrideText[];
  /** 某天固定展示的忌内容标题（中英文） */
  ji?: OverrideText[];
  /** 某天禁止发动技能） */
  locked?: boolean;
}

export const dayOverrides: Record<string, DayOverride> = {
  // 示例：2025-12-20 固定展示指定宜忌
  '2025-12-20': {
    yi: [
      { zh: '性别揭晓派对', en: 'Gender reveal gathering' },
    ],
    ji: [
      { zh: '强行摄入乳糖', en: 'Force-feed yourself lactose' },
      { zh: '给摄影师提要求', en: 'Micromanage the photographer' },
    ],
  },
  '2025-12-24': {
    yi: [
      { zh: '大吃大喝', en: 'Feast without restraint' },
    ],
  },
  '2025-12-25': {
    yi: [
      { zh: '拆礼物', en: 'Unwrap presents' },
    ],
    ji: [
      { zh: '质疑圣诞老人如何穿过燃气壁炉', en: 'Question how Santa squeezes through the gas fireplace' },
    ],
  },
  '2025-12-26': {
    yi: [
      { zh: '购物', en: 'Go on a shopping spree' },
    ],
    ji: [
      { zh: '节俭', en: 'Practice frugality' },
    ],
  },
  '2026-01-02': {
    yi: [
      { zh: '送生日礼物', en: 'Give birthday gifts' },
      { zh: '送生日礼物', en: 'Give birthday gifts' },
      { zh: '收生日礼物', en: 'Receive birthday gifts' },
      { zh: '收生日礼物', en: 'Receive birthday gifts' },
    ],
    ji: [
      { zh: '小气', en: 'Be stingy' },
      { zh: '抠门', en: 'Clutch your wallet too hard' },
      { zh: '人间蒸发', en: 'Disappear without a trace' },
      { zh: '“哎呀我都忘了”', en: '"Oh no, I totally forgot!"' },
    ],
    locked: true,
  },
};
