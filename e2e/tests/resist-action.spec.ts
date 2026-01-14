import { test, expect } from '@playwright/test';

/**
 * Test: Resist button and streak counter
 * 
 * Validates:
 * - "Resist" button works
 * - Confetti animation triggers
 * - Resist counter increments
 * - Streak counter updates
 * - Habit log entry created
 */


async function navigateToJournal(page) {
    await page.click('.hamburger-toggle');
    await page.waitForSelector('.hamburger-menu.show');
    await page.click('.hamburger-menu .journal-tab-toggler');
    await page.waitForTimeout(300);
}

async function setupUserWithBaseline(page) {
  const testData = {
    action: [],
    behavioralGoals: [],
    baseline: {
      specificSubject: true,
      decreaseHabit: true,
      increaseHabit: false,
      neutralHabit: false,
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
        sinceLastDone: true,
        avgBetweenDone: true,
        timesDone: true,
        didntPerDid: true,
        resistedInARow: true,
        sinceLastSpent: true,
        avgBetweenSpent: true,
        totalSpent: true,
        moodTracker: true
      },
      logItemsToDisplay: {
        goal: true,
        used: true,
        craved: true,
        bought: true,
        mood: true
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

  await page.addInitScript((data) => {
    // Only set if not already present, to allow persistence across reloads
    if (!localStorage.getItem('esCrave')) {
      localStorage.setItem('esCrave', JSON.stringify(data));
    }
  }, testData);
}

test.describe('Better Later - Resist Action', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
  });

  test('user can click "Resist" button and streak increments', async ({ page }) => {
    // Verify we're on statistics screen
    await expect(page.locator('#statistics-content')).toBeVisible();
    
    // Click "Resist" button
    await page.click('#crave-button');
    
    // Confetti should appear (canvas element for animation)
    await expect(page.locator('canvas')).toBeVisible();
    
    // Counter should increment to 1
    await expect(page.locator('#crave-total')).toHaveText('1');
    
    // Streak counter should show 1
    const streakCounter = page.locator('#cravingsResistedInARow');
    await expect(streakCounter).toHaveText('1');
    
    // Habit log entry should be created
    await navigateToJournal(page)
    const logEntry = page.locator('#habit-log .item.craved-record').first();
    await expect(logEntry).toBeVisible();
    await expect(logEntry).toContainText('You resisted it');
    
    
    // Click resist again
    await page.click('#crave-button');
    
    // Counter should be 2
    await expect(page.locator('#crave-total')).toHaveText('2');
    
    // Streak should be 2
    await expect(streakCounter).toHaveText('2');
    
    console.log('✅ Resist test passed! Streak counter working.');
  });

  test.skip('resist streak resets when user does the action', async ({ page }) => {
    // First, resist twice to build a streak
    await page.click('#crave-button');
    await expect(page.locator('#crave-total')).toHaveText('1');
    
    // Wait longer for debounce to clear
    await page.waitForTimeout(2000);
    await page.click('#crave-button');
    await page.waitForTimeout(500);
    await expect(page.locator('#crave-total')).toHaveText('2');
    await expect(page.locator('#cravingsResistedInARow')).toHaveText('2');
    
    // Now click "Did It" to break the streak
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    
    // Streak should reset to 0
    await navigateToJournal(page)
    await expect(page.locator('#cravingsResistedInARow')).toHaveText('0');
    
    console.log('✅ Streak reset test passed!');
  });
});

