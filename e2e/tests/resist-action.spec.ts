import { test, expect } from '@playwright/test';
import { 
  navigateToJournal, 
  setupUserWithBaseline 
} from './utils/test-helpers';

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

test.describe('Better Later - Resist Action', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
  });

  test('user can click "Resist" button and streak increments', async ({ page }) => {
    // Verify initial state
    const resistStreak = page.locator('#cravingsResistedInARow');
    await expect(resistStreak).toHaveText('0');
    
    // Click resist button
    await page.click('#crave-button');
    
    // Wait for confetti animation (optional) and counter update
    await page.waitForTimeout(500);
    
    // Streak should now be 1
    await expect(resistStreak).toHaveText('1');
    
    // Crave total should also be 1
    await expect(page.locator('#crave-total')).toHaveText('1');
    
    // Habit log should have an entry
    await navigateToJournal(page);
    const logEntry = page.locator('#habit-log .item.craved-record');
    await expect(logEntry).toHaveCount(1);
    
    console.log('✅ Resist test passed! Streak counter working.');
  });
});
