import { test, expect } from '@playwright/test';

/**
 * Test: Data persistence across page reloads
 * 
 * Validates:
 * - Actions are saved to localStorage
 * - Data persists after page reload
 * - Counters restore correctly
 * - Timers restore correctly
 * - Habit log restores correctly
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
        sinceLastDone: true,
        sinceLastSpent: true,  // Required for bought timer visibility
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

  // CRITICAL FIX: Only set localStorage if it doesn't already exist
  // This prevents addInitScript from overwriting data on page reloads
  await page.addInitScript((data) => {
    const existing = localStorage.getItem('esCrave');
    if (!existing) {
      // Only set initial data if localStorage is empty
      localStorage.setItem('esCrave', JSON.stringify(data));
    } else {
      // Preserve existing data but ensure baseline and options are set
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

// Helper function to debug localStorage state
async function debugLocalStorage(page, label) {
  const storage = await page.evaluate(() => {
    const data = localStorage.getItem('esCrave');
    return data ? JSON.parse(data) : null;
  });
  
  console.log(`\n📦 [${label}] localStorage state:`);
  console.log(`   - Actions: ${storage?.action?.length || 0}`);
  if (storage?.action) {
    storage.action.forEach((action, i) => {
      console.log(`   - Action ${i}: ${action.clickType} at ${new Date(action.timestamp).toISOString()}`);
    });
  }
  console.log('');
  
  return storage;
}

test.describe('Better Later - Data Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app.html');
    await page.waitForLoadState('networkidle');
  });

  test('did it action persists across page reload', async ({ page }) => {
    // Perform action
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    
    // Verify initial state
    await expect(page.locator('#use-total')).toHaveText('1');
    await expect(page.locator('#smoke-timer')).toBeVisible();
    
    // CRITICAL: Wait for localStorage to be written
    // Verify the action was actually saved to localStorage
    await page.waitForFunction(() => {
      const data = localStorage.getItem('esCrave');
      if (!data) return false;
      const parsed = JSON.parse(data);
      return parsed.action && parsed.action.length > 0;
    }, { timeout: 5000 });
    
    // Extra safety: small delay to ensure write is complete
    await page.waitForTimeout(500);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Wait for app to reinitialize
    await page.waitForSelector('#use-total', { state: 'visible' });
    
    // Counter should still be 1
    await expect(page.locator('#use-total')).toHaveText('1');
    
    // Timer should still be visible
    await expect(page.locator('#smoke-timer')).toBeVisible();
    
    // Habit log entry should still exist
    await expect(page.locator('#habit-log .item.used-record')).toBeVisible();
    
    console.log('✅ Did It persistence test passed!');
  });

  test('resist action persists across page reload', async ({ page }) => {
    // Resist twice
    await page.click('#crave-button');
    await page.waitForTimeout(1100);
    await page.click('#crave-button');
    await page.waitForTimeout(1100);
    
    // Verify initial state
    await expect(page.locator('#crave-total')).toHaveText('2');
    await expect(page.locator('#cravingsResistedInARow')).toHaveText('2');
    
    // CRITICAL: Wait for localStorage to be written
    await page.waitForFunction(() => {
      const data = localStorage.getItem('esCrave');
      if (!data) return false;
      const parsed = JSON.parse(data);
      return parsed.action && parsed.action.length >= 2;
    }, { timeout: 5000 });
    
    await page.waitForTimeout(500);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Wait for app to reinitialize
    await page.waitForSelector('#crave-total', { state: 'visible' });
    
    // Counter should still be 2
    await expect(page.locator('#crave-total')).toHaveText('2');
    
    // Streak should still be 2
    await expect(page.locator('#cravingsResistedInARow')).toHaveText('2');
    
    console.log('✅ Resist persistence test passed!');
  });

  test('spending persists across page reload', async ({ page }) => {
    // Log spending
    await page.click('#bought-button');
    await page.waitForSelector('#spentInput', { state: 'visible' });
    await page.fill('#spentInput', '30');
    await page.click('.cost.log-more-info button.submit');
    
    // Verify initial state
    await expect(page.locator('#bought-total')).toHaveText('1');
    await expect(page.locator('.statistic.cost.totals.total')).toContainText('$30');
    
    // CRITICAL: Wait for localStorage to be written
    await page.waitForFunction(() => {
      const data = localStorage.getItem('esCrave');
      if (!data) return false;
      const parsed = JSON.parse(data);
      return parsed.action && parsed.action.length > 0 && parsed.action.some(a => a.clickType === 'bought');
    }, { timeout: 5000 });
    
    await page.waitForTimeout(500);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Wait for app to reinitialize
    await page.waitForSelector('#bought-total', { state: 'visible' });
    
    // Counter should still be 1
    await expect(page.locator('#bought-total')).toHaveText('1');
    
    // Total should still be $30
    await expect(page.locator('.statistic.cost.totals.total')).toContainText('$30');
    
    // Timer should be visible
    await expect(page.locator('#bought-timer')).toBeVisible();
    
    console.log('✅ Spending persistence test passed!');
  });

  test('multiple actions persist across reload', async ({ page }) => {
    // Perform multiple actions
    await page.click('#crave-button');
    await page.waitForTimeout(1100);
    
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(500);
    
    await page.click('#bought-button');
    await page.waitForSelector('#spentInput', { state: 'visible' });
    await page.fill('#spentInput', '20');
    await page.click('.cost.log-more-info button.submit');
    
    // Verify initial state
    await expect(page.locator('#crave-total')).toHaveText('1');
    await expect(page.locator('#use-total')).toHaveText('1');
    await expect(page.locator('#bought-total')).toHaveText('1');
    
    // CRITICAL: Wait for localStorage to be written with all 3 actions
    await page.waitForFunction(() => {
      const data = localStorage.getItem('esCrave');
      if (!data) return false;
      const parsed = JSON.parse(data);
      return parsed.action && parsed.action.length >= 3;
    }, { timeout: 5000 });
    
    await page.waitForTimeout(500);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Wait for app to reinitialize - wait for all counters
    await page.waitForSelector('#crave-total', { state: 'visible' });
    await page.waitForSelector('#use-total', { state: 'visible' });
    await page.waitForSelector('#bought-total', { state: 'visible' });
    
    // All counters should persist
    await expect(page.locator('#crave-total')).toHaveText('1');
    await expect(page.locator('#use-total')).toHaveText('1');
    await expect(page.locator('#bought-total')).toHaveText('1');
    
    // All habit log entries should exist
    await expect(page.locator('#habit-log .item.craved-record')).toBeVisible();
    await expect(page.locator('#habit-log .item.used-record')).toBeVisible();
    await expect(page.locator('#habit-log .item.bought-record')).toBeVisible();
    
    console.log('✅ Multiple actions persistence test passed!');
  });

  test('localStorage data structure is valid after actions', async ({ page }) => {
    // Perform some actions
    await page.click('#crave-button');
    await page.waitForTimeout(1100);
    
    await page.click('#use-button');
    await page.waitForSelector('.use.log-more-info', { state: 'visible' });
    await page.click('.use.log-more-info button.submit');
    
    // Check localStorage directly
    const storageData = await page.evaluate(() => {
      const data = localStorage.getItem('esCrave');
      return data ? JSON.parse(data) : null;
    });
    
    // Verify data structure
    expect(storageData).toBeTruthy();
    expect(storageData.action).toBeTruthy();
    expect(Array.isArray(storageData.action)).toBe(true);
    expect(storageData.action.length).toBe(2); // Should have 2 actions
    
    // Verify action records have required fields
    const craveAction = storageData.action.find(a => a.clickType === 'craved');
    expect(craveAction).toBeTruthy();
    expect(craveAction.timestamp).toBeTruthy();
    expect(craveAction.clickStamp).toBeTruthy();
    
    const useAction = storageData.action.find(a => a.clickType === 'used');
    expect(useAction).toBeTruthy();
    expect(useAction.timestamp).toBeTruthy();
    
    console.log('✅ localStorage structure test passed!');
  });

  test.skip('DIAGNOSTIC: localStorage persistence across reload with debugging', async ({ page }) => {
    console.log('\n🔍 Starting localStorage diagnostic test...');
    
    // Initial state
    await debugLocalStorage(page, 'INITIAL');
    
    // Perform action
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    
    // Wait for UI to update
    await expect(page.locator('#use-total')).toHaveText('1');
    
    // Check localStorage immediately after action
    await debugLocalStorage(page, 'AFTER ACTION');
    
    // Wait for localStorage write
    await page.waitForFunction(() => {
      const data = localStorage.getItem('esCrave');
      if (!data) return false;
      const parsed = JSON.parse(data);
      return parsed.action && parsed.action.length > 0;
    }, { timeout: 5000 });
    
    // Check localStorage after wait
    await debugLocalStorage(page, 'AFTER WAIT');
    
    // Extra safety delay
    await page.waitForTimeout(500);
    
    // Check localStorage right before reload
    const beforeReload = await debugLocalStorage(page, 'BEFORE RELOAD');
    expect(beforeReload.action.length).toBe(1);
    
    // Reload
    console.log('🔄 Reloading page...');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Check localStorage immediately after reload
    const afterReload = await debugLocalStorage(page, 'AFTER RELOAD');
    
    // Wait for app to fully initialize
    await page.waitForSelector('#use-total', { state: 'visible' });
    
    // Check localStorage after initialization
    const afterInit = await debugLocalStorage(page, 'AFTER INIT');
    
    // Verify persistence
    expect(afterInit.action.length).toBe(1);
    await expect(page.locator('#use-total')).toHaveText('1');
    
    console.log('✅ Diagnostic test passed!');
  });
});

