import { CxIconName } from './cx-icon/cx-icon';

/**
 * The company values, in order, with their icons. Titles are translated as `ourValues.<key>` and
 * descriptions as `ourValues.<key>Text`. Shown on the About page and named in the Home story list.
 */
export const OUR_VALUES: readonly { key: string; icon: CxIconName }[] = [
  { key: 'teamSpirit', icon: 'team' },
  { key: 'responsibility', icon: 'responsibility' },
  { key: 'respect', icon: 'integrity' },
  { key: 'innovation', icon: 'innovation' },
  { key: 'professionalism', icon: 'professionalism' },
  { key: 'efficiency', icon: 'efficiency' },
  { key: 'personalGrowth', icon: 'personal-growth' },
  { key: 'trust', icon: 'trust' },
];
