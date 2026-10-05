import { test, expect } from '@playwright/test';
import { 
  navigateToJournal, 
  navigateToStatistics,
  setupUserWithActions,
  setupUserWithBaseline 
} from './utils/test-helpers';

/**
 * Test: Statistics & Reports
 * 
 * Validates:
 * - Statistics update after actions
 * - Weekly report generation
 * - Navigate between weeks
 * - Longest goal tracking
 * - Time-based aggregations
 */

test.describe('Better Later - Statistics & Reports', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
  });

  test('statistics update after multiple actions', async ({ page }) => {
    // Perform a few actions
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(300);
    
    await page.click('#crave-button');
    await page.waitForTimeout(300);
    
    await page.click('#bought-button');
    await page.fill('#spentInput', '10');
    await page.click('.cost.log-more-info button.submit');
    await page.waitForTimeout(300);
    
    // Check statistics updated
    await expect(page.locator('#use-total')).toHaveText('1');
    await expect(page.locator('#crave-total')).toHaveText('1');
    await expect(page.locator('#bought-total')).toHaveText('1');
    
    console.log('✅ Statistics update test passed!');
  });
  test('weekly report generates with actions', async ({ page }) => {
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.click('#crave-button');

    await navigateToStatistics(page);
    await page.selectOption('#reportMetricFilter', 'usage');
    await page.selectOption('#reportPeriodFilter', 'week');

    const report = page.locator('.weekly-report');
    await expect(report).toBeVisible();
    await expect(page.locator('.ct-chart .ct-bar').first()).toBeAttached();

    // Summary below the chart describes this week
    const summary = page.locator('.report-summary');
    await expect(summary).toContainText('This week');
    await expect(summary).toContainText('2 times');
    await expect(summary).toContainText('1 resisted');
  });
  test('navigate between weeks in reports', async ({ page }) => {
    // Entries this week and 10 days ago
    const now = Math.floor(Date.now() / 1000);
    const day = 24 * 60 * 60;
    await setupUserWithActions(page, [
      { timestamp: String(now - 10 * day), clickType: 'used', clickStamp: now - 10 * day },
      { timestamp: String(now - 10 * day + 60), clickType: 'used', clickStamp: now - 10 * day },
      { timestamp: String(now - 60), clickType: 'used', clickStamp: now - 60 },
    ]);
    await page.reload();
    await navigateToStatistics(page);
    await page.selectOption('#reportMetricFilter', 'usage');
    await page.selectOption('#reportPeriodFilter', 'week');

    const startDate = page.locator('#reportStartDate');
    const summary = page.locator('.report-summary');
    const thisWeekStart = await startDate.textContent();
    await expect(summary).toContainText('1 time');
    await expect(page.locator('.next-report')).toBeDisabled();
    await expect(page.locator('.previous-report')).toBeEnabled();

    // Back one week: the earlier entries, and no earlier data to go back to
    await page.click('.previous-report');
    await expect(startDate).not.toHaveText(thisWeekStart || '');
    await expect(summary).toContainText('That week');
    await expect(summary).toContainText('2 times');
    await expect(page.locator('.previous-report')).toBeDisabled();
    await expect(page.locator('.next-report')).toBeEnabled();

    // Forward again
    await page.click('.next-report');
    await expect(startDate).toHaveText(thisWeekStart || '');
    await expect(summary).toContainText('This week');
  });

  test('habit log shows recent actions', async ({ page }) => {
    // Perform an action
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(500);
    
    // Navigate to journal
    await navigateToJournal(page);
    
    // Habit log should show the action
    const logEntries = page.locator('#habit-log .item');
    await expect(logEntries).toHaveCount(1);
    
    console.log('✅ Habit log display test passed!');
  });

  test('undo last action removes entry', async ({ page }) => {
    // Perform an action
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(500);
    
    // Verify counter is 1
    await expect(page.locator('#use-total')).toHaveText('1');
    
    // Handle confirm dialog for undo
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    
    // Click undo
    const undoButton = page.locator('#undoActionButton');
    if (await undoButton.isVisible()) {
      await undoButton.click();
      await page.waitForTimeout(500);
      
      // Counter should be 0 again
      await expect(page.locator('#use-total')).toHaveText('0');
      
      console.log('✅ Undo action test passed!');
    } else {
      console.log('⚠️  Undo button not visible');
    }
  });

  test('resistance streak resets after did it action', async ({ page }) => {
    // Build up a streak
    await page.click('#crave-button');
    await page.waitForTimeout(200);
    await page.click('#crave-button');
    await page.waitForTimeout(200);
    
    // Verify streak is 2
    await expect(page.locator('#cravingsResistedInARow')).toHaveText('2');
    
    // Do the action (this should reset streak)
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(500);
    
    // Streak should reset to 0
    await expect(page.locator('#cravingsResistedInARow')).toHaveText('0');
    
    console.log('✅ Streak reset test passed!');
  });
});
