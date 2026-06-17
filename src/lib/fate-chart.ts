// Mythic GME 2 — Fate Chart with 3-threshold system and meaning tables.

export type OddsLevel =
  | 'impossible'
  | 'nearly_impossible'
  | 'very_unlikely'
  | 'unlikely'
  | '50/50'
  | 'likely'
  | 'very_likely'
  | 'nearly_certain'
  | 'certain'

export type FateResult =
  | 'exceptional_yes'
  | 'yes'
  | 'no'
  | 'exceptional_no'

export interface FateRoll {
  roll: number
  result: FateResult
  odds: OddsLevel
  chaosFactor: number
  randomEvent: boolean
}

const ODDS_LABELS: Record<OddsLevel, string> = {
  impossible: 'Impossible',
  nearly_impossible: 'Nearly Impossible',
  very_unlikely: 'Very Unlikely',
  unlikely: 'Unlikely',
  '50/50': '50/50',
  likely: 'Likely',
  very_likely: 'Very Likely',
  nearly_certain: 'Nearly Certain',
  certain: 'Certain',
}

const ODDS_ORDER: OddsLevel[] = [
  'impossible',
  'nearly_impossible',
  'very_unlikely',
  'unlikely',
  '50/50',
  'likely',
  'very_likely',
  'nearly_certain',
  'certain',
]

// 3-threshold Fate Chart from the Mythic GME 2 rulebook.
// Each cell has [exceptionalYes, yes, no] thresholds.
// roll ≤ EY → Exceptional Yes
// roll ≤ Yes → Yes
// roll ≤ No → No (regular)
// roll > No → Exceptional No
// 0 means impossible for that threshold (marked "X" in the book).

type Cell = [ey: number, yes: number, no: number]
const X = 0 // impossible marker

// FATE_CHART[oddsIndex][chaosIndex] where chaos 1-9 → index 0-8
const FATE_CHART: Cell[][] = [
  // Certain:          CF1         CF2         CF3         CF4         CF5         CF6         CF7         CF8         CF9
  /* Certain */       [[10,50,91],[13,65,94],[15,75,96],[17,85,98],[18,90,99],[19,95,100],[20,99,X],[20,99,X],[20,99,X]],
  /* Nearly Certain */ [[7,35,88],[10,50,91],[13,65,94],[15,75,96],[17,85,98],[18,90,99],[19,95,100],[20,99,X],[20,99,X]],
  /* Very Likely */    [[5,25,86],[7,35,88],[10,50,91],[13,65,94],[15,75,96],[17,85,98],[18,90,99],[19,95,100],[20,99,X]],
  /* Likely */         [[3,15,84],[5,25,86],[7,35,88],[10,50,91],[13,65,94],[15,75,96],[17,85,98],[18,90,99],[19,95,100]],
  /* 50/50 */          [[2,10,83],[3,15,84],[5,25,86],[7,35,88],[10,50,91],[13,65,94],[15,75,96],[17,85,98],[18,90,99]],
  /* Unlikely */       [[1,5,82],[2,10,83],[3,15,84],[5,25,86],[7,35,88],[10,50,91],[13,65,94],[15,75,96],[17,85,98]],
  /* Very Unlikely */  [[X,1,81],[1,5,82],[2,10,83],[3,15,84],[5,25,86],[7,35,88],[10,50,91],[13,65,94],[15,75,96]],
  /* Nearly Imp. */    [[X,1,81],[X,1,81],[1,5,82],[2,10,83],[3,15,84],[5,25,86],[7,35,88],[10,50,91],[13,65,94]],
  /* Impossible */     [[X,1,81],[X,1,81],[X,1,81],[1,5,82],[2,10,83],[3,15,84],[5,25,86],[7,35,88],[10,50,91]],
]

// The book orders odds from Certain (top) to Impossible (bottom), but
// ODDS_ORDER goes impossible → certain, so we need to reverse-map.
function getCell(odds: OddsLevel, chaosFactor: number): Cell {
  const oddsIndex = ODDS_ORDER.indexOf(odds)
  // ODDS_ORDER: impossible=0 … certain=8
  // FATE_CHART: certain=0 … impossible=8
  const chartRow = 8 - oddsIndex
  const chaosCol = Math.max(0, Math.min(8, chaosFactor - 1))
  return FATE_CHART[chartRow][chaosCol]
}

export function rollFateChart(odds: OddsLevel, chaosFactor: number): FateRoll {
  const roll = Math.floor(Math.random() * 100) + 1
  return resolveFateRoll(roll, odds, chaosFactor)
}

export function resolveFateRoll(roll: number, odds: OddsLevel, chaosFactor: number): FateRoll {
  const [ey, yes, no] = getCell(odds, chaosFactor)

  let result: FateResult
  if (ey > 0 && roll <= ey) {
    result = 'exceptional_yes'
  } else if (yes > 0 && roll <= yes) {
    result = 'yes'
  } else if (no === 0 || roll <= no) {
    // no === 0 (X) means Exceptional No is impossible, so everything above Yes is regular No
    result = 'no'
  } else {
    result = 'exceptional_no'
  }

  // Random Event: doubles (11,22,33…99) where the single digit ≤ Chaos Factor
  const tens = Math.floor(roll / 10)
  const ones = roll % 10
  const isDoubles = roll >= 11 && tens === ones
  const randomEvent = isDoubles && ones <= chaosFactor

  return { roll, result, odds, chaosFactor, randomEvent }
}

export function getOddsLabel(odds: OddsLevel): string {
  return ODDS_LABELS[odds]
}

export { ODDS_ORDER, ODDS_LABELS }

// ── Random Event Tables (Mythic GME 2) ──

const EVENT_FOCUS_TABLE: { min: number; max: number; focus: string }[] = [
  { min: 1,  max: 5,   focus: 'Remote Event' },
  { min: 6,  max: 10,  focus: 'Ambiguous Event' },
  { min: 11, max: 20,  focus: 'New NPC' },
  { min: 21, max: 40,  focus: 'NPC Action' },
  { min: 41, max: 45,  focus: 'NPC Negative' },
  { min: 46, max: 50,  focus: 'NPC Positive' },
  { min: 51, max: 55,  focus: 'Move Toward Thread' },
  { min: 56, max: 65,  focus: 'Move Away From Thread' },
  { min: 66, max: 70,  focus: 'Close Thread' },
  { min: 71, max: 80,  focus: 'PC Negative' },
  { min: 81, max: 85,  focus: 'PC Positive' },
  { min: 86, max: 100, focus: 'Current Context' },
]

// Actions table 1 (d100)
const ACTIONS_1 = [
  'Abandon','Accompany','Activate','Agree','Ambush','Arrive','Assist','Attack','Attain','Bargain',
  'Befriend','Bestow','Betray','Block','Break','Carry','Celebrate','Change','Close','Combine',
  'Communicate','Conceal','Continue','Control','Create','Deceive','Decrease','Defend','Delay','Deny',
  'Depart','Deposit','Destroy','Dispute','Disrupt','Distrust','Divide','Drop','Easy','Energize',
  'Escape','Expose','Fail','Fight','Flee','Free','Guide','Harm','Heal','Hinder',
  'Imitate','Imprison','Increase','Indulge','Inform','Inquire','Inspect','Invade','Leave','Lure',
  'Misuse','Move','Neglect','Observe','Open','Oppose','Overthrow','Praise','Proceed','Protect',
  'Punish','Pursue','Recruit','Refuse','Release','Relinquish','Repair','Repulse','Return','Reward',
  'Ruin','Separate','Start','Stop','Strange','Struggle','Succeed','Support','Suppress','Take',
  'Threaten','Transform','Trap','Travel','Triumph','Truce','Trust','Use','Usurp','Waste',
]

// Actions table 2 (d100)
const ACTIONS_2 = [
  'Advantage','Adversity','Agreement','Animal','Attention','Balance','Battle','Benefits','Building','Burden',
  'Bureaucracy','Business','Chaos','Comfort','Completion','Conflict','Cooperation','Danger','Defense','Depletion',
  'Disadvantage','Distraction','Elements','Emotion','Enemy','Energy','Environment','Expectation','Exterior','Extravagance',
  'Failure','Fame','Fear','Freedom','Friend','Goal','Group','Health','Hindrance','Home',
  'Hope','Idea','Illness','Illusion','Individual','Information','Innocent','Intellect','Interior','Investment',
  'Leadership','Legal','Location','Military','Misfortune','Mundane','Nature','Needs','News','Normal',
  'Object','Obscurity','Official','Opposition','Outside','Pain','Path','Peace','People','Personal',
  'Physical','Plot','Portal','Possessions','Poverty','Power','Prison','Project','Protection','Reassurance',
  'Representative','Riches','Safety','Strength','Success','Suffering','Surprise','Tactic','Technology','Tension',
  'Time','Trial','Value','Vehicle','Victory','Vulnerability','Weapon','Weather','Work','Wound',
]

// Descriptions table 1 (d100)
const DESCRIPTIONS_1 = [
  'Adventurously','Aggressively','Anxiously','Awkwardly','Beautifully','Bleakly','Boldly','Bravely','Busily','Calmly',
  'Carefully','Carelessly','Cautiously','Ceaselessly','Cheerfully','Combatively','Coolly','Crazily','Curiously','Dangerously',
  'Defiantly','Deliberately','Delicately','Delightfully','Dimly','Efficiently','Emotionally','Energetically','Enormously','Enthusiastically',
  'Excitedly','Fearfully','Ferociously','Fiercely','Foolishly','Fortunately','Frantically','Freely','Frighteningly','Fully',
  'Generously','Gently','Gladly','Gracefully','Gratefully','Happily','Hastily','Healthily','Helpfully','Helplessly',
  'Hopelessly','Innocently','Intensely','Interestingly','Irritatingly','Joyfully','Kindly','Lazily','Lightly','Loosely',
  'Loudly','Lovingly','Loyally','Majestically','Meaningfully','Mechanically','Mildly','Miserably','Mockingly','Mysteriously',
  'Naturally','Neatly','Nicely','Oddly','Offensively','Officially','Partially','Passively','Peacefully','Perfectly',
  'Playfully','Politely','Positively','Powerfully','Quaintly','Quarrelsomely','Quietly','Roughly','Rudely','Ruthlessly',
  'Slowly','Softly','Strangely','Swiftly','Threateningly','Timidly','Very','Violently','Wildly','Yieldingly',
]

// Descriptions table 2 (d100)
const DESCRIPTIONS_2 = [
  'Abnormal','Amusing','Artificial','Average','Beautiful','Bizarre','Boring','Bright','Broken','Clean',
  'Cold','Colorful','Colorless','Comforting','Creepy','Cute','Damaged','Dark','Defeated','Dirty',
  'Disagreeable','Dry','Dull','Empty','Enormous','Extraordinary','Extravagant','Faded','Familiar','Fancy',
  'Feeble','Festive','Flawless','Forlorn','Fragile','Fragrant','Fresh','Full','Glorious','Graceful',
  'Hard','Harsh','Healthy','Heavy','Historical','Horrible','Important','Interesting','Juvenile','Lacking',
  'Large','Lavish','Lean','Less','Lethal','Lively','Lonely','Lovely','Magnificent','Mature',
  'Messy','Mighty','Military','Modern','Mundane','Mysterious','Natural','Normal','Odd','Old',
  'Pale','Peaceful','Petite','Plain','Poor','Powerful','Protective','Quaint','Rare','Reassuring',
  'Remarkable','Rotten','Rough','Ruined','Rustic','Scary','Shocking','Simple','Small','Smooth',
  'Soft','Strong','Stylish','Unpleasant','Valuable','Vibrant','Warm','Watery','Weak','Young',
]

export interface RandomEvent {
  focus: string
  action: string
  subject: string
}

export function rollRandomEvent(): RandomEvent {
  const focusRoll = Math.floor(Math.random() * 100) + 1
  const action1 = ACTIONS_1[Math.floor(Math.random() * 100)]
  const action2 = ACTIONS_2[Math.floor(Math.random() * 100)]
  const desc1 = DESCRIPTIONS_1[Math.floor(Math.random() * 100)]
  const desc2 = DESCRIPTIONS_2[Math.floor(Math.random() * 100)]

  const focusEntry = EVENT_FOCUS_TABLE.find(
    (e) => focusRoll >= e.min && focusRoll <= e.max,
  )!

  return {
    focus: focusEntry.focus,
    action: `${action1} / ${action2}`,
    subject: `${desc1} / ${desc2}`,
  }
}
