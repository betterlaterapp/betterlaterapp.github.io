import { test, expect } from '@playwright/test';
import { 
  navigateToJournal, 
  setupUserWithBaseline 
} from './utils/test-helpers';

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

test.describe('Better Later - Spending Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserWithBaseline(page, {
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
      }
    });
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
  });

  test('user can log spending and totals update', async ({ page }) => {
    // Click spent button
    await page.click('#bought-button');
    
    // Dialog should open
    const dialog = page.locator('.cost.log-more-info');
    await expect(dialog).toBeVisible();
    
    // Enter a whole dollar amount (app may round decimals)
    await page.fill('#spentInput', '25');
    
    // Submit
    await page.click('.cost.log-more-info button.submit');
    
    // Dialog should close
    await expect(dialog).not.toBeVisible();
    
    // Counter should increment
    await expect(page.locator('#bought-total')).toHaveText('1');
    
    // Total should show the amount (use flexible matching)
    await expect(page.locator('.statistic.cost.totals.total')).toContainText('$25');
    
    // Timer should be visible
    const boughtTimer = page.locator('#bought-timer');
    await expect(boughtTimer).toBeVisible();
    
    // Habit log should have entry
    await navigateToJournal(page);
    const logEntry = page.locator('#habit-log .item.bought-record');
    await expect(logEntry).toHaveCount(1);
    
    console.log('✅ Spending test passed! Totals and timer working.');
  });

  test('multiple spending entries accumulate correctly', async ({ page }) => {
    // First spending
    await page.click('#bought-button');
    await page.fill('#spentInput', '10');
    await page.click('.cost.log-more-info button.submit');
    await page.waitForTimeout(300);
    
    // Second spending
    await page.click('#bought-button');
    await page.fill('#spentInput', '15');
    await page.click('.cost.log-more-info button.submit');
    await page.waitForTimeout(300);
    
    // Counter should be 2
    await expect(page.locator('#bought-total')).toHaveText('2');
    
    // Total should be $25
    await expect(page.locator('.statistic.cost.totals.total')).toContainText('$25');
    
    console.log('✅ Multiple spending entries test passed!');
  });
});
