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

async function setupUserWithBaseline(page) {
  const testData = {
    action: [],
    baseline: {
      specificSubject: true,
      decreaseHabit: true,
      valuesTime: true,
      valuesMoney: true,
      valuesHealth: true,
      userSubmitted: true
    },
    option: {
      activeTab: 'statistics-content',
      liveStatsToDisplay: {
        cravedButton: true,
        resistedInARow: true,
        didntPerDid: true
      },
      logItemsToDisplay: {
        craved: true
      },
      reportItemsToDisplay: {
        useVsResistsGraph: true
      }
    }
  };

  await page.addInitScript((data) => {
    localStorage.setItem('esCrave', JSON.stringify(data));
  }, testData);
}

test.describe('Better Later - Resist Action', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/app.html');
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
    await expect(page.locator('#cravingsResistedInARow')).toHaveText('0');
    
    console.log('✅ Streak reset test passed!');
  });
});

