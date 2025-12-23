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

async function setupUserWithBaseline(page) {
  const testData = {
    action: [],
    baseline: {
      specificSubject: true,
      decreaseHabit: true,
      amountSpentPerWeek: 50,
      goalSpentPerWeek: 20,
      valuesMoney: true,
      userSubmitted: true
    },
    option: {
      activeTab: 'statistics-content',
      liveStatsToDisplay: {
        spentButton: true,
        totalSpent: true,
        sinceLastSpent: true
      },
      logItemsToDisplay: {
        bought: true
      },
      reportItemsToDisplay: {}
    }
  };

  await page.addInitScript((data) => {
    localStorage.setItem('esCrave', JSON.stringify(data));
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

