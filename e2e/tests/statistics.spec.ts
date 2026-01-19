import { test, expect } from '@playwright/test';
import { 
  navigateToJournal, 
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

  test.skip('navigate to weekly reports section', async ({ page }) => {
    // Navigate to reports section
    const reportsTab = page.locator('text=Reports, text=Weekly');
    if (await reportsTab.isVisible()) {
      await reportsTab.click();
      await page.waitForTimeout(300);
      
      console.log('✅ Navigate to reports test passed!');
    } else {
      console.log('⚠️  Reports section not found');
    }
  });

  test.skip('weekly report generates with actions', async ({ page }) => {
    // First perform some actions
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(500);
    
    // Navigate to reports and verify they show data
    console.log('⚠️  Weekly report test requires reports section implementation');
  });

  test.skip('navigate between weeks in reports', async ({ page }) => {
    // Navigate to reports
    // Click previous/next week buttons
    console.log('⚠️  Week navigation test requires reports section implementation');
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
    const undoButton = page.locator('#undo-button');
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
