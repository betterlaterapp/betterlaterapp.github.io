import { test, expect } from '@playwright/test';

/**
 * Test: New user can click "Did It" button and start timer
 * 
 * This test validates:
 * 1. New user can click "Did It" button
 * 2. Dialog opens
 * 3. Submit with default options works
 * 4. User returns to statistics screen
 * 5. Timer starts counting up
 */


async function navigateToJournal(page) {
    await page.click('.hamburger-toggle');
    await page.waitForSelector('.hamburger-menu.show');
    await page.click('.hamburger-menu .journal-tab-toggler');
    await page.waitForTimeout(300);
}

// Helper function to set up a new user with baseline settings
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

      amountDonePerWeek: 10,
      goalDonePerWeek: 5,
      usageTimeline: 'week',
      amountSpentPerWeek: 50,
      goalSpentPerWeek: 20,
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
        sinceLastDone: true,
        timesDone: true,
        avgBetweenDone: true,
        didntPerDid: true,
        resistedInARow: true,
        spentButton: true,
        boughtGoalButton: true,
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
        useVsResistsGraph: true,
        useChangeVsLastWeek: true,
        useChangeVsBaseline: false,
        costChangeVsLastWeek: true,
        costChangeVsBaseline: false,
        useGoalVsThisWeek: false,
        costGoalVsThisWeek: false
      }
    }
  };

  // Inject test data into localStorage before page loads
  await page.addInitScript((data) => {
    // Only set if not already present, to allow persistence across reloads
    if (!localStorage.getItem('esCrave')) {
      localStorage.setItem('esCrave', JSON.stringify(data));
    }
  }, testData);
}

test.describe('Better Later - First Action', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data
    await setupUserWithBaseline(page);
    
    // Navigate to app (baseURL is set in playwright.config.ts)
    await page.goto('/app/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('new user can click "Did It" button, dialog opens, submit returns to statistics, timer starts', async ({ page }) => {
    // Step 1: Verify we're on statistics screen
    await expect(page.locator('#statistics-content')).toBeVisible();
    
    // Step 2: Click "Did It" button
    await page.click('#use-button');
    
    // Step 3: Verify dialog opens
    const dialog = page.locator('.use.log-more-info');
    await expect(dialog).toBeVisible();
    
    // Step 4: Verify default "Now" option is selected
    const nowRadio = page.locator('#nowUseRadio');
    await expect(nowRadio).toBeChecked();
    
    // Step 5: Click Submit with default options
    await page.click('.use.log-more-info button.submit');
    
    // Step 6: Verify returned to statistics screen
    await expect(page.locator('#statistics-content')).toBeVisible();
    await expect(dialog).not.toBeVisible();
    
    // Step 7: Verify counter incremented
    await expect(page.locator('#use-total')).toHaveText('1');
    
    // Step 8: Verify timer is visible and started
    const timer = page.locator('#smoke-timer');
    await expect(timer).toBeVisible();
    
    // Step 9: Verify timer shows non-zero values
    // Wait a moment for timer to update
    await page.waitForTimeout(2000);
    
    // Check seconds are counting up
    const secondsElement = page.locator('#smoke-timer .secondsSinceLastClick');
    const secondsValue = await secondsElement.textContent();
    expect(parseInt(secondsValue || '0')).toBeGreaterThan(0);
    
    // Step 10: Verify habit log entry was created
    await navigateToJournal(page)
    const logEntry = page.locator('#habit-log .item.used-record').first();
    await expect(logEntry).toBeVisible();
    await expect(logEntry).toContainText('You did it');
    
    console.log('✅ Test passed! Timer is counting up from action.');
  });
});

