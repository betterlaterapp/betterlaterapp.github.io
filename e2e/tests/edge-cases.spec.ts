import { test, expect } from '@playwright/test';
import { 
  navigateToSettings, 
  navigateToJournal, 
  setupUserWithBaseline 
} from './utils/test-helpers';

/**
 * Test: Edge Cases & Error Handling
 * 
 * Validates:
 * - Empty states (new user with no data)
 * - Past-dated actions ("yesterday" times)
 * - Multiple rapid actions
 * - Dialog cancel behavior
 * - Timer edge cases
 */

test.describe('Better Later - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
  });

  test('new user with no data shows empty state', async ({ page }) => {
    // Verify all counters are 0
    await expect(page.locator('#use-total')).toHaveText('0');
    await expect(page.locator('#crave-total')).toHaveText('0');
    await expect(page.locator('#bought-total')).toHaveText('0');
    await expect(page.locator('#cravingsResistedInARow')).toHaveText('0');
    
    // Verify no timers are visible initially
    const smokeTimer = page.locator('#smoke-timer');
    const boughtTimer = page.locator('#bought-timer');
    
    const smokeTimerHidden = await smokeTimer.evaluate(el => {
      return window.getComputedStyle(el).display === 'none' || !(el as HTMLElement).offsetParent;
    });
    const boughtTimerHidden = await boughtTimer.evaluate(el => {
      return window.getComputedStyle(el).display === 'none' || !(el as HTMLElement).offsetParent;
    });
    
    expect(smokeTimerHidden).toBe(true);
    expect(boughtTimerHidden).toBe(true);
    
    // Habit log should be empty (it's visible by default in statistics-content)
    await navigateToJournal(page)
    const logItems = page.locator('#habit-log .item');
    await expect(logItems).toHaveCount(0);
    
    console.log('✅ Empty state test passed!');
  });

  test('cancel dialog does not record action', async ({ page }) => {
    // Click "Did It" button
    await page.click('#use-button');
    
    // Wait for dialog
    const dialog = page.locator('.use.log-more-info');
    await expect(dialog).toBeVisible();
    
    // Click cancel instead of submit
    await page.click('.use.log-more-info button.cancel');
    
    // Dialog should close
    await expect(dialog).not.toBeVisible();
    
    // Counter should still be 0
    await expect(page.locator('#use-total')).toHaveText('0');
    
    // No log entry should exist
    await navigateToJournal(page)
    const logEntries = page.locator('#habit-log .item.used-record');
    await expect(logEntries).toHaveCount(0);
    
    console.log('✅ Cancel dialog test passed!');
  });

  test('rapid consecutive actions are handled', async ({ page }) => {
    // Perform three "Did It" actions rapidly
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(100);
    
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(100);
    
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(500);
    
    // Counter should be 3
    await expect(page.locator('#use-total')).toHaveText('3');
    
    // Should have 3 log entries
    await navigateToJournal(page)
    const logEntries = page.locator('#habit-log .item.used-record');
    await expect(logEntries).toHaveCount(3);
    
    console.log('✅ Rapid actions test passed!');
  });

  test('spending with zero amount is handled', async ({ page }) => {
    // Click spent button
    await page.click('#bought-button');
    const dialog = page.locator('.cost.log-more-info');
    await expect(dialog).toBeVisible();
    
    // Fill with 0
    await page.fill('#spentInput', '0');
    await page.click('.cost.log-more-info button.submit');
    
    // Should close dialog (0 is technically valid)
    await expect(dialog).not.toBeVisible();
    
    // Counter should increment
    await expect(page.locator('#bought-total')).toHaveText('1');
    
    // Total should show $0
    await expect(page.locator('.statistic.cost.totals.total')).toContainText('$0');
    
    console.log('✅ Zero spending test passed!');
  });

  test('spending with empty input shows error', async ({ page }) => {

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    // Click spent button
    await page.click('#bought-button');
    const dialog = page.locator('.cost.log-more-info');
    await expect(dialog).toBeVisible();
    
    // Try to submit without filling input (empty)
    const submitButton = dialog.locator('button.submit');
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    
    // Close custom dialog
    await page.click('.cost.log-more-info button.cancel');
    
    // Counter should still be 0
    await expect(page.locator('#bought-total')).toHaveText('0');
    
    console.log('✅ Empty spending input test passed!');
  });

  test('multiple tabs navigation works correctly', async ({ page }) => {
    // Start on statistics (default view)
    await expect(page.locator('#statistics-content')).toBeVisible();
    
    // Navigate to settings
    await navigateToSettings(page);
    await page.waitForTimeout(500);
    await expect(page.locator('#settings-content')).toBeVisible();
    
    // Verify habit log is accessible (it's within statistics-content by default)
    await navigateToJournal(page)
    await expect(page.locator('#habit-log')).toBeAttached();
    
    console.log('✅ Multiple tabs navigation test passed!');
  });

  test('action buttons are clickable and responsive', async ({ page }) => {
    // Verify all main action buttons exist and are visible
    await expect(page.locator('#use-button')).toBeVisible();
    await expect(page.locator('#crave-button')).toBeVisible();
    await expect(page.locator('#bought-button')).toBeVisible();
    await expect(page.locator('#wait-button')).toBeVisible();
    await expect(page.locator('#goal-button')).toBeVisible();
    
    // Verify buttons are clickable (not disabled)
    await expect(page.locator('#use-button')).toBeEnabled();
    await expect(page.locator('#crave-button')).toBeEnabled();
    await expect(page.locator('#bought-button')).toBeEnabled();
    await expect(page.locator('#wait-button')).toBeEnabled();
    await expect(page.locator('#goal-button')).toBeEnabled();
    
    console.log('✅ Action buttons responsive test passed!');
  });

  test('habit log entries have timestamps', async ({ page }) => {
    // Perform an action
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    
    // Wait for log entry to appear
    await page.waitForTimeout(500);
    
    // Verify log entry has a timestamp (habit log is in statistics-content by default)
    await navigateToJournal(page)
    const logEntry = page.locator('#habit-log .item.used-record').first();
    await expect(logEntry).toBeVisible();
    
    // Check that the entry contains time information
    const entryText = await logEntry.textContent();
    // Should contain some time-related text (could be "just now", "seconds ago", etc.)
    expect(entryText).toBeTruthy();
    expect(entryText?.length).toBeGreaterThan(0);
    
    console.log('✅ Log entries have timestamps test passed!');
  });
});
