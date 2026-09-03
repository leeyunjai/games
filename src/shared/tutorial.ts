import { createStore } from './storage';

export interface TutorialSection {
  title: string;
  items: string[];
}

export interface TutorialContent {
  /** 한 줄 목표 */
  goal: string;
  sections: TutorialSection[];
  /** [키, 설명] 목록 */
  keys: [string, string][];
  /** 처음 보여줄 때만 쓰는 팁 */
  tip?: string;
}

const SEEN_KEY = 'tutorial-seen';

export function hasSeenTutorial(gameId: string): boolean {
  return createStore(gameId).get<boolean>(SEEN_KEY, false);
}

export function markTutorialSeen(gameId: string): void {
  createStore(gameId).set(SEEN_KEY, true);
}
