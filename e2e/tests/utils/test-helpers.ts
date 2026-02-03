import { Page } from '@playwright/test';

/**
 * Shared Test Utilities for Better Later E2E Tests
 * 
 * This file contains:
 * - Navigation helpers
 * - Test data setup functions
 * - Common assertions
 */

// ============================================================
// Navigation Helpers
// ============================================================

/**
 * Navigate to the Settings tab via hamburger menu
 */
export async function navigateToSettings(page: Page): Promise<void> {
  await page.click('.hamburger-toggle');
  await page.waitForSelector('.hamburger-menu.show');
  await page.click('.hamburger-menu .settings-tab-toggler');
  await page.waitForTimeout(300);
}

/**
 * Navigate to the Journal tab via hamburger menu
 */
export async function navigateToJournal(page: Page): Promise<void> {
  await page.click('.hamburger-toggle');
  await page.waitForSelector('.hamburger-menu.show');
  await page.click('.hamburger-menu .journal-tab-toggler');
  await page.waitForTimeout(300);
}

/**
 * Navigate to the Statistics tab via hamburger menu
 */
export async function navigateToStatistics(page: Page): Promise<void> {
  await page.click('.hamburger-toggle');
  await page.waitForSelector('.hamburger-menu.show');
  await page.click('.hamburger-menu .statistics-tab-toggler');
  await page.waitForTimeout(300);
}

// ============================================================
// Test Data Setup
// ============================================================

/**
 * Default test data structure matching the current app schema (v3)
 * This should be kept in sync with storage.js migrations and app.js defaults
 */
export function getDefaultTestData(overrides: Partial<TestData> = {}): TestData {
  const defaultData: TestData = {
    version: 3,
    action: [],
    behavioralGoals: [],
    notifications: [],
    activeTimers: [],
    customUnits: [],
    statistics: {
      cost: {
        sinceTimerStart: {
          totalSeconds: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        },
        clickCounter: 0,
        totals: {
          total: 0,
          week: 0,
          month: 0,
          year: 0
        },
        firstClickStamp: 0,
        lastClickStamp: 0,
        betweenClicks: {
          total: 0,
          week: 0,
          month: 0,
          year: 0
        }
      },
      use: {
        sinceTimerStart: {
          totalSeconds: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        },
        betweenClicks: {
          total: 0,
          week: 0,
          month: 0,
          year: 0
        },
        clickCounter: 0,
        craveCounter: 0,
        cravingsInARow: 0,
        firstClickStamp: 0,
        lastClickStamp: 0,
        lastClickStampCrave: 0,
        didntPerDid: {
          total: 0,
          week: 0,
          month: 0,
          year: 0
        },
        resistStreak: {
          total: 0,
          week: 0,
          month: 0,
          year: 0
        }
      },
      wait: {
        untilTimerEnd: {
          totalSeconds: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        },
        clickCounter: 0,
        lastClickStamp: 0,
        longestWait: {
          total: 0,
          week: 0,
          month: 0,
          year: 0
        },
        completedWaits: 0,
        activeWaitUse: 0,
        activeWaitBought: 0,
        activeWaitBoth: 0
      }
    },
    baseline: {
      specificSubject: true,
      doLess: true,
      doMore: false,
      doEqual: false,
      userSubmitted: true,
      valuesTimesDone: true,
      valuesTime: true,
      valuesMoney: true,
      valuesHealth: true,
      amountDonePerWeek: 0,
      goalDonePerWeek: 0,
      usageTimeline: 'week',
      amountSpentPerWeek: 0,
      goalSpentPerWeek: 0,
      spendingTimeline: 'week',
      currentTimeHours: 0,
      currentTimeMinutes: 0,
      goalTimeHours: 0,
      goalTimeMinutes: 0,
      timeTimeline: 'week',
      statusType: '',
      wellnessText: '',
      wellnessMood: 2
    },
    option: {
      activeTab: 'statistics-content',
      liveStatsToDisplay: {
        goalButton: true,
        waitButton: true,
        undoButton: true,
        untilGoalEnd: true,
        longestGoal: true,
        usedButton: true,
        usedGoalButton: true,
        cravedButton: true,
        spentButton: true,
        boughtGoalButton: true,
        sinceLastDone: true,
        avgBetweenDone: true,
        timesDone: true,
        didntPerDid: true,
        resistedInARow: true,
        sinceLastSpent: true,
        avgBetweenSpent: true,
        totalSpent: true,
        moodTracker: true,
        timeSpentDoing: true,
        activeTimer: true
      },
      logItemsToDisplay: {
        goal: true,
        wait: true,
        used: true,
        craved: true,
        bought: true,
        mood: true,
        timed: true
      },
      reportItemsToDisplay: {
        useChangeVsBaseline: false,
        useChangeVsLastWeek: true,
        useVsResistsGraph: true,
        costChangeVsBaseline: false,
        costChangeVsLastWeek: true,
        useGoalVsThisWeek: false,
        costGoalVsThisWeek: false
      }
    }
  };

  // Deep merge overrides
  return deepMerge(defaultData, overrides);
}

/**
 * Set up a user with baseline settings completed
 * Injects test data into localStorage before page loads
 */
export async function setupUserWithBaseline(
  page: Page, 
  overrides: Partial<TestData> = {}
): Promise<void> {
  const testData = getDefaultTestData(overrides);

  await page.addInitScript((data) => {
    // Only set if not already present, to allow persistence across reloads
    if (!localStorage.getItem('esCrave')) {
      localStorage.setItem('esCrave', JSON.stringify(data));
    }
  }, testData);
}

/**
 * Set up a completely new user (no localStorage data)
 * Clears any existing data
 */
export async function setupNewUser(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('esCrave');
  });
}

/**
 * Set up a user with specific action history
 */
export async function setupUserWithActions(
  page: Page,
  actions: ActionRecord[],
  overrides: Partial<TestData> = {}
): Promise<void> {
  const testData = getDefaultTestData({
    ...overrides,
    action: actions
  });

  await page.addInitScript((data) => {
    localStorage.setItem('esCrave', JSON.stringify(data));
  }, testData);
}

// ============================================================
// Type Definitions
// ============================================================

export interface TestData {
  version: number;
  action: ActionRecord[];
  behavioralGoals: any[];
  notifications: any[];
  activeTimers: any[];
  customUnits: any[];
  statistics: {
    cost: CostStatistics;
    use: UseStatistics;
    wait: WaitStatistics;
  };
  baseline: BaselineSettings;
  option: OptionSettings;
}

export interface ActionRecord {
  timestamp: string;
  clickType: 'used' | 'craved' | 'bought' | 'wait' | 'goal' | 'mood' | 'timed';
  clickStamp: number;
  spent?: string;
  waitStamp?: string;
  goalStamp?: string;
  waitType?: string;
  goalType?: string;
  status?: number;
  waitStopped?: number;
  goalStopped?: number;
  comment?: string;
  smiley?: number;
  duration?: number;
  unit?: string;
  quantity?: number;
}

export interface TimerDuration {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface AggregatedStats {
  total: number;
  week: number;
  month: number;
  year: number;
}

export interface CostStatistics {
  sinceTimerStart: TimerDuration;
  clickCounter: number;
  totals: AggregatedStats;
  firstClickStamp: number;
  lastClickStamp: number;
  betweenClicks: AggregatedStats;
}

export interface UseStatistics {
  sinceTimerStart: TimerDuration;
  betweenClicks: AggregatedStats;
  clickCounter: number;
  craveCounter: number;
  cravingsInARow: number;
  firstClickStamp: number;
  lastClickStamp: number;
  lastClickStampCrave: number;
  didntPerDid: AggregatedStats;
  resistStreak: AggregatedStats;
}

export interface WaitStatistics {
  untilTimerEnd: TimerDuration;
  clickCounter: number;
  lastClickStamp: number;
  longestWait: AggregatedStats;
  completedWaits: number;
  activeWaitUse: number;
  activeWaitBought: number;
  activeWaitBoth: number;
}

export interface BaselineSettings {
  specificSubject: boolean;
  doLess: boolean;
  doMore: boolean;
  doEqual: boolean;
  userSubmitted?: boolean;
  valuesTimesDone: boolean;
  valuesTime: boolean;
  valuesMoney: boolean;
  valuesHealth: boolean;
  amountDonePerWeek: number;
  goalDonePerWeek: number;
  usageTimeline: string;
  amountSpentPerWeek: number;
  goalSpentPerWeek: number;
  spendingTimeline: string;
  currentTimeHours: number;
  currentTimeMinutes: number;
  goalTimeHours: number;
  goalTimeMinutes: number;
  timeTimeline: string;
  statusType: string;
  wellnessText: string;
  wellnessMood: number;
}

export interface OptionSettings {
  activeTab: string;
  liveStatsToDisplay: {
    goalButton: boolean;
    waitButton: boolean;
    undoButton: boolean;
    untilGoalEnd: boolean;
    longestGoal: boolean;
    usedButton: boolean;
    usedGoalButton: boolean;
    cravedButton: boolean;
    spentButton: boolean;
    boughtGoalButton: boolean;
    sinceLastDone: boolean;
    avgBetweenDone: boolean;
    timesDone: boolean;
    didntPerDid: boolean;
    resistedInARow: boolean;
    sinceLastSpent: boolean;
    avgBetweenSpent: boolean;
    totalSpent: boolean;
    moodTracker: boolean;
    timeSpentDoing: boolean;
    activeTimer: boolean;
  };
  logItemsToDisplay: {
    goal: boolean;
    wait: boolean;
    used: boolean;
    craved: boolean;
    bought: boolean;
    mood: boolean;
    timed: boolean;
  };
  reportItemsToDisplay: {
    useChangeVsBaseline: boolean;
    useChangeVsLastWeek: boolean;
    useVsResistsGraph: boolean;
    costChangeVsBaseline: boolean;
    costChangeVsLastWeek: boolean;
    useGoalVsThisWeek: boolean;
    costGoalVsThisWeek: boolean;
  };
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];
      
      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        (result as any)[key] = deepMerge(targetValue as object, sourceValue as object);
      } else {
        (result as any)[key] = sourceValue;
      }
    }
  }
  
  return result;
}
