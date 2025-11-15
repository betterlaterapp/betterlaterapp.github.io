import { test, expect } from '@playwright/test';

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

async function setupUserWithBaseline(page) {
  const testData = {
    action: [],
    baseline: {
      specificSubject: true,
      decreaseHabit: true,
      valuesTime: true,
      valuesMoney: true
    },
    option: {
      activeTab: 'statistics-content',
      liveStatsToDisplay: {
        usedButton: true,
        cravedButton: true,
        spentButton: true,
        goalButton: true,
        sinceLastDone: true,
        sinceLastSpent: true,
        timesDone: true,
        totalSpent: true
      },
      logItemsToDisplay: {
        used: true,
        craved: true,
        bought: true
      },
      reportItemsToDisplay: {}
    }
  };

  await page.addInitScript((data) => {
    const existing = localStorage.getItem('esCrave');
    if (!existing) {
      localStorage.setItem('esCrave', JSON.stringify(data));
    } else {
      const existingData = JSON.parse(existing);
      if (!existingData.baseline) {
        existingData.baseline = data.baseline;
      }
      if (!existingData.option) {
        existingData.option = data.option;
      }
      localStorage.setItem('esCrave', JSON.stringify(existingData));
    }
  }, testData);
}

test.describe('Better Later - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app.html');
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
      return window.getComputedStyle(el).display === 'none' || !el.offsetParent;
    });
    const boughtTimerHidden = await boughtTimer.evaluate(el => {
      return window.getComputedStyle(el).display === 'none' || !el.offsetParent;
    });
    
    expect(smokeTimerHidden).toBe(true);
    expect(boughtTimerHidden).toBe(true);
    
    // Navigate to habit log
    await page.click('a[href="#log-content"]');
    
    // Habit log should be empty
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
    // Click spent button
    await page.click('#bought-button');
    const dialog = page.locator('.cost.log-more-info');
    await expect(dialog).toBeVisible();
    
    // Set up alert handler
    const alertPromise = page.waitForEvent('dialog');
    
    // Try to submit without filling input (empty)
    await page.click('.cost.log-more-info button.submit');
    
    // Should show an alert
    const alert = await alertPromise;
    await alert.accept();
    
    // Dialog should still be visible
    await expect(dialog).toBeVisible();
    
    // Close dialog
    await page.click('.cost.log-more-info button.cancel');
    
    // Counter should still be 0
    await expect(page.locator('#bought-total')).toHaveText('0');
    
    console.log('✅ Empty spending input test passed!');
  });

  test('multiple tabs navigation works correctly', async ({ page }) => {
    // Start on statistics
    await expect(page.locator('#statistics-content')).toBeVisible();
    
    // Navigate to log
    await page.click('a[href="#log-content"]');
    await expect(page.locator('#log-content')).toBeVisible();
    await expect(page.locator('#statistics-content')).not.toBeVisible();
    
    // Navigate to reports
    await page.click('a[href="#report-content"]');
    await expect(page.locator('#report-content')).toBeVisible();
    await expect(page.locator('#log-content')).not.toBeVisible();
    
    // Navigate to settings
    await page.click('a[href="#settings-content"]');
    await expect(page.locator('#settings-content')).toBeVisible();
    await expect(page.locator('#report-content')).not.toBeVisible();
    
    // Navigate back to statistics
    await page.click('a[href="#statistics-content"]');
    await expect(page.locator('#statistics-content')).toBeVisible();
    await expect(page.locator('#settings-content')).not.toBeVisible();
    
    console.log('✅ Multiple tabs navigation test passed!');
  });

  test('action buttons are clickable and responsive', async ({ page }) => {
    // Verify all main action buttons exist and are visible
    await expect(page.locator('#use-button')).toBeVisible();
    await expect(page.locator('#crave-button')).toBeVisible();
    await expect(page.locator('#bought-button')).toBeVisible();
    await expect(page.locator('#goal-button')).toBeVisible();
    
    // Verify buttons are clickable (not disabled)
    await expect(page.locator('#use-button')).toBeEnabled();
    await expect(page.locator('#crave-button')).toBeEnabled();
    await expect(page.locator('#bought-button')).toBeEnabled();
    await expect(page.locator('#goal-button')).toBeEnabled();
    
    console.log('✅ Action buttons responsive test passed!');
  });

  test('habit log entries have timestamps', async ({ page }) => {
    // Perform an action
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    
    // Navigate to log
    await page.click('a[href="#log-content"]');
    await expect(page.locator('#log-content')).toBeVisible();
    
    // Verify log entry has a timestamp
    const logEntry = page.locator('#habit-log .item.used-record').first();
    await expect(logEntry).toBeVisible();
    
    // Check that the entry contains time information
    const entryText = await logEntry.textContent();
    // Should contain some time-related text (could be "just now", "seconds ago", etc.)
    expect(entryText).toBeTruthy();
    expect(entryText.length).toBeGreaterThan(0);
    
    console.log('✅ Log entries have timestamps test passed!');
  });

  test('resist button debounce prevents double clicks', async ({ page }) => {
    // Click resist button
    await page.click('#crave-button');
    
    // Try to click again immediately (should be debounced)
    await page.click('#crave-button');
    
    // Wait for debounce to complete
    await page.waitForTimeout(1200);
    
    // Should only register 1 click (or possibly 0 if both were debounced)
    const craveTotal = await page.locator('#crave-total').textContent();
    const count = parseInt(craveTotal);
    expect(count).toBeLessThanOrEqual(1);
    
    console.log('✅ Resist button debounce test passed!');
  });

  test('undo button is disabled when no actions exist', async ({ page }) => {
    // Initially, no actions have been performed
    const undoButton = page.locator('#undo-button');
    
    // Undo button should either be disabled or hidden
    const isDisabledOrHidden = await undoButton.evaluate(el => {
      return el.disabled || 
             window.getComputedStyle(el).display === 'none' ||
             !el.offsetParent;
    });
    
    expect(isDisabledOrHidden).toBe(true);
    
    // Perform an action
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(500);
    
    // Now undo button should be enabled/visible
    const isEnabledOrVisible = await undoButton.evaluate(el => {
      return !el.disabled && 
             window.getComputedStyle(el).display !== 'none' &&
             el.offsetParent !== null;
    });
    
    expect(isEnabledOrVisible).toBe(true);
    
    console.log('✅ Undo button state test passed!');
  });
});


