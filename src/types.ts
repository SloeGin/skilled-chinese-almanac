import type { AlmanacEntry } from './data/yiEntries';

export type Language = 'zh' | 'en';

export interface GuidanceSet {
  yi: AlmanacEntry[];
  ji: AlmanacEntry[];
}
