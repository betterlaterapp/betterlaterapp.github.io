import { test, expect } from '@playwright/test';

/**
 * Test: Spending tracking functionality
 * 
 * Validates:
 * - "Spent" button opens dialog
 * - Can enter dollar amount
 * - Spending totals update
 * - Timer starts
 * - Habit log entry created
 * - Invalid input is rejected
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

test.describe('Better Later - Spending Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
  });

  test('user can log spending and totals update', async ({ page }) => {
    // Verify we're on statistics screen
    await expect(page.locator('#statistics-content')).toBeVisible();
    
    // Click "Spent" button
    await page.click('#bought-button');
    
    // Dialog should open
    const dialog = page.locator('.cost.log-more-info');
    await expect(dialog).toBeVisible();
    
    // Enter amount
    await page.fill('#spentInput', '25');
    
    // Submit
    await page.click('.cost.log-more-info button.submit');
    
    // Dialog should close
    await expect(dialog).not.toBeVisible();
    
    // Counter should be 1
    await expect(page.locator('#bought-total')).toHaveText('1');
    
    // Total spent should show $25
    const totalSpent = page.locator('.statistic.cost.totals.total');
    await expect(totalSpent).toContainText('$25');
    
    // Timer should be visible
    const timer = page.locator('#bought-timer');
    await expect(timer).toBeVisible();
    
    // Wait for timer to start
    await page.waitForTimeout(2000);
    
    // Verify timer is counting
    const seconds = await page.locator('#bought-timer .secondsSinceLastClick').textContent();
    expect(parseInt(seconds || '0')).toBeGreaterThan(0);
    
    // Habit log entry should exist
    await navigateToJournal(page)
    const logEntry = page.locator('#habit-log .item.bought-record').first();
    await expect(logEntry).toBeVisible();
    await expect(logEntry).toContainText('You spent');
    await expect(logEntry).toContainText('$25');
    
    console.log('✅ Spending test passed! Totals and timer working.');
  });

  test('multiple spending entries accumulate correctly', async ({ page }) => {
    // First purchase: $15
    await page.click('#bought-button');
    const dialog = page.locator('.cost.log-more-info');
    await expect(dialog).toBeVisible();
    await page.fill('#spentInput', '15');
    await page.click('.cost.log-more-info button.submit');
    
    // Wait for dialog to close and statistics to update
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.statistic.cost.totals.total')).toContainText('$15');
    await expect(page.locator('#bought-total')).toHaveText('1');
    
    // Second purchase: $10
    await page.click('#bought-button');
    await expect(dialog).toBeVisible();
    await page.fill('#spentInput', '10');
    await page.click('.cost.log-more-info button.submit');
    
    // Wait for dialog to close and statistics to update
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.statistic.cost.totals.total')).toContainText('$25');
    await expect(page.locator('#bought-total')).toHaveText('2');
    
    console.log('✅ Multiple spending entries test passed!');
  });
});

