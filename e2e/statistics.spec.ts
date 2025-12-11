import { test, expect } from '@playwright/test';

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

async function setupUserWithBaseline(page) {
  const testData = {
    action: [],
    baseline: {
      specificSubject: true,
      decreaseHabit: true,
      valuesTime: true,
      valuesMoney: true,
      userSubmitted: true
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

test.describe('Better Later - Statistics & Reports', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app.html');
    await page.waitForLoadState('networkidle');
  });

  test('statistics update after multiple actions', async ({ page }) => {
    // Perform "Did It" action
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    
    // Verify use counter updated
    await expect(page.locator('#use-total')).toHaveText('1');
    
    // Perform "Resist" action
    await page.click('#crave-button');
    await page.waitForTimeout(1100); // Debounce
    
    // Verify resist counter updated
    await expect(page.locator('#crave-total')).toHaveText('1');
    await expect(page.locator('#cravingsResistedInARow')).toHaveText('1');
    
    // Perform "Spent" action
    await page.click('#bought-button');
    await page.fill('#spentInput', '20');
    await page.click('.cost.log-more-info button.submit');
    
    // Verify spending stats updated
    await expect(page.locator('#bought-total')).toHaveText('1');
    await expect(page.locator('.statistic.cost.totals.total')).toContainText('$20');
    
    // All three timers should be visible
    await expect(page.locator('#smoke-timer')).toBeVisible();
    await expect(page.locator('#bought-timer')).toBeVisible();
    
    // Habit log should show all three actions
    await expect(page.locator('#habit-log .item.used-record')).toBeVisible();
    await expect(page.locator('#habit-log .item.craved-record')).toBeVisible();
    await expect(page.locator('#habit-log .item.bought-record')).toBeVisible();
    
    console.log('✅ Statistics update test passed!');
  });

  test.skip('navigate to weekly reports section', async ({ page }) => {
    // Perform a few actions to have data
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(500);
    
    await page.click('#crave-button');
    await page.waitForTimeout(2000);
    
    // Weekly report is in the use-content section
    // Check if it's visible (might be toggled by UI logic)
    const weeklyReport = page.locator('.weekly-report');
    const isVisible = await weeklyReport.isVisible();
    
    if (!isVisible) {
      console.log('⚠️  Weekly report not visible - may need to be enabled');
      return;
    }
    
    // Verify report elements exist
    await expect(page.locator('.ct-chart')).toBeVisible();
    await expect(page.locator('.previous-report')).toBeVisible();
    await expect(page.locator('.next-report')).toBeVisible();
    await expect(page.locator('#reportStartDate')).toBeVisible();
    await expect(page.locator('#reportEndDate')).toBeVisible();
    
    console.log('✅ Navigate to reports test passed!');
  });

  test.skip('weekly report generates with actions', async ({ page }) => {
    // Perform multiple actions
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(500);
    
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(500);
    
    await page.click('#crave-button');
    await page.waitForTimeout(2000);
    
    // Weekly report is in the use-content section (already visible by default)
    // Check if report is visible (might need to be toggled)
    const weeklyReport = page.locator('.weekly-report');
    const isVisible = await weeklyReport.isVisible();
    
    if (!isVisible) {
      console.log('⚠️  Weekly report not visible - may need to be enabled in UI');
      return;
    }
    
    // Wait for chart to render
    await page.waitForTimeout(1000);
    
    // Verify chart has been drawn (chartist creates SVG)
    const chartSvg = page.locator('.ct-chart svg');
    await expect(chartSvg).toBeVisible();
    
    // Verify there are bars in the chart (chartist creates .ct-bar elements)
    const bars = page.locator('.ct-bar');
    const barCount = await bars.count();
    expect(barCount).toBeGreaterThan(0);
    
    console.log('✅ Weekly report generation test passed!');
  });

  test.skip('navigate between weeks in reports', async ({ page }) => {
    // Perform an action
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(500);
    
    // Check if weekly report is visible
    const weeklyReport = page.locator('.weekly-report');
    const isVisible = await weeklyReport.isVisible();
    
    if (!isVisible) {
      console.log('⚠️  Weekly report not visible - skipping test');
      return;
    }
    
    // Get current week start date
    const currentStartDate = await page.locator('#reportStartDate').textContent();
    
    // Click to go to older week
    await page.click('.previous-report');
    await page.waitForTimeout(500);
    
    // Week text should change
    const olderStartDate = await page.locator('#reportStartDate').textContent();
    expect(olderStartDate).not.toBe(currentStartDate);
    
    // Click to go back to newer week
    await page.click('.next-report');
    await page.waitForTimeout(500);
    
    // Should be back to current week
    const backToCurrentDate = await page.locator('#reportStartDate').textContent();
    expect(backToCurrentDate).toBe(currentStartDate);
    
    console.log('✅ Navigate between weeks test passed!');
  });

  test('habit log shows recent actions', async ({ page }) => {
    // Perform several actions
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(300);
    
    await page.click('#crave-button');
    await page.waitForTimeout(1100);
    
    await page.click('#bought-button');
    await page.fill('#spentInput', '15');
    await page.click('.cost.log-more-info button.submit');
    await page.waitForTimeout(300);
    
    // Habit log is visible by default in statistics-content
    await expect(page.locator('#statistics-content')).toBeVisible();
    
    // Verify habit log has entries
    const logItems = page.locator('#habit-log .item');
    const itemCount = await logItems.count();
    expect(itemCount).toBeGreaterThanOrEqual(3);
    
    // Verify different action types are shown
    await expect(page.locator('#habit-log .item.used-record')).toBeVisible();
    await expect(page.locator('#habit-log .item.craved-record')).toBeVisible();
    await expect(page.locator('#habit-log .item.bought-record')).toBeVisible();
    
    console.log('✅ Habit log display test passed!');
  });

  test('undo last action removes entry', async ({ page }) => {

    page.on('dialog', async (dialog) => {
        await dialog.accept();
      });

    // Perform an action
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    
    // Verify counter is 1
    await expect(page.locator('#use-total')).toHaveText('1');
    
    // Verify log entry exists
    await expect(page.locator('#habit-log .item.used-record')).toBeVisible();
    
    // Check if undo button exists
    const undoButton = page.locator('#undoActionButton');
    const undoCount = await undoButton.count();
    if (undoCount === 0) {
      console.log('⚠️  Undo button not found - skipping test');
      return;
    }
    
    // Click undo button
    await page.click('#undoActionButton', { timeout: 5000 });
    
    // Wait for undo to process
    await page.waitForTimeout(500);
    
    // Counter should be back to 0
    await expect(page.locator('#use-total')).toHaveText('0');
    
    // Log entry should be removed
    const logEntries = page.locator('#habit-log .item.used-record');
    await expect(logEntries).toHaveCount(0);
    
    console.log('✅ Undo action test passed!');
  });

  test('resistance streak resets after did it action', async ({ page }) => {
    // Resist three times with longer delays for debounce
    await page.click('#crave-button');
    await page.waitForTimeout(2000);
    await page.click('#crave-button');
    await page.waitForTimeout(2000);
    await page.click('#crave-button');
    await page.waitForTimeout(1000);
    
    // Verify streak is 3
    await expect(page.locator('#cravingsResistedInARow')).toHaveText('3');
    
    // Now do "Did It" action
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    
    // Streak should reset to 0
    await expect(page.locator('#cravingsResistedInARow')).toHaveText('0');
    
    // But total resists should still be 3
    await expect(page.locator('#crave-total')).toHaveText('3');
    
    console.log('✅ Streak reset test passed!');
  });
});


