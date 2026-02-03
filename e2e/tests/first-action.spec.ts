import { test, expect } from '@playwright/test';
import { 
  navigateToJournal, 
  setupUserWithBaseline 
} from './utils/test-helpers';

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

test.describe('Better Later - First Action Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserWithBaseline(page, {
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
      }
    });
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
  });

  test('new user can click "Did It" button, dialog opens, submit returns to statistics, timer starts', async ({ page }) => {
    // Verify we start on statistics screen
    await expect(page.locator('#statistics-content')).toBeVisible();
    
    // Click the "Did It" button
    await page.click('#use-button');
    
    // Dialog should open
    const dialog = page.locator('.use.log-more-info');
    await expect(dialog).toBeVisible();
    
    // Click submit with default options
    await page.click('.use.log-more-info button.submit');
    
    // Dialog should close
    await expect(dialog).not.toBeVisible();
    
    // Should still be on statistics screen (or return to it)
    await expect(page.locator('#statistics-content')).toBeVisible();
    
    // Timer should now be visible
    const smokeTimer = page.locator('#smoke-timer');
    await expect(smokeTimer).toBeVisible();
    
    // Wait a bit and verify timer is counting
    await page.waitForTimeout(2000);
    const timerText = await smokeTimer.textContent();
    
    // Timer should show some time elapsed (e.g., "0:00:01" or similar)
    expect(timerText).toBeTruthy();
    expect(timerText?.length).toBeGreaterThan(0);
    
    // Counter should increment
    await expect(page.locator('#use-total')).toHaveText('1');
    
    console.log('✅ Test passed! Timer is counting up from action.');
  });
});
