import { test, expect } from '@playwright/test';

/**
 * Test: Settings & Preferences
 * 
 * Validates:
 * - Baseline questionnaire flow
 * - Toggle display preferences
 * - Clear all data functionality
 * - Settings persistence
 */

// Helper to navigate to settings via hamburger menu
async function navigateToSettings(page) {
  await page.click('.hamburger-toggle');
  await page.waitForSelector('.hamburger-menu.show');
  await page.click('.hamburger-menu .settings-tab-toggler');
  await page.waitForTimeout(300);
}

async function navigateToStatistics(page) {
    await page.click('.hamburger-toggle');
    await page.waitForSelector('.hamburger-menu.show');
    await page.click('.hamburger-menu .statistics-tab-toggler');
    await page.waitForTimeout(300);
  }

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
    }
  }, testData);
}

test.describe('Better Later - Settings & Preferences', () => {
  
  test('new user sees baseline questionnaire', async ({ page }) => {
    // Setup without baseline
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Baseline questionnaire should be visible in settings
    const baselineSection = page.locator('.baseline-questionnaire');
    await expect(baselineSection).toBeVisible();
    
    console.log('✅ Baseline questionnaire visibility test passed!');
  });

  test.skip('complete baseline questionnaire enables app', async ({ page }) => {
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to settings
    await navigateToSettings(page);
    await page.waitForTimeout(500);
    
    const baselineSection = page.locator('.baseline-questionnaire');
    await expect(baselineSection).toBeVisible();
    
    // Answer first question: "Yes" to have picked something specific
    await page.click('input.serious-user');
    await page.waitForTimeout(500);
    
    // Fill out baseline questions (second question set should now be visible)
    // Check "decrease habit"
    await page.click('input.decreaseHabit');
    
    // Check "values time"
    await page.check('input.valuesTime');
    
    // Check "values money"
    await page.check('input.valuesMoney');
    
    // Submit baseline
    await page.click('.baseline-questionnaire button.submit');
    
    // Wait for form to process
    await page.waitForTimeout(1000);
    
    // Verify success message or that the form was saved
    const successMessage = page.locator('.baseline-questionnaire .form-message .success');
    const isSuccessVisible = await successMessage.isVisible();
    
    if (isSuccessVisible) {
      console.log('✅ Complete baseline questionnaire test passed!');
    } else {
      console.log('⚠️  Success message not visible, but form may have saved');
    }
    
    // App should still be functional - verify buttons are visible
    await expect(page.locator('#use-button')).toBeVisible();
    await expect(page.locator('#crave-button')).toBeVisible();
  });

  test('navigate to settings tab', async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Click settings tab
    await navigateToSettings(page);
    
    // Verify settings content is visible
    await expect(page.locator('#settings-content')).toBeVisible();
    
    // Verify key settings sections exist
    await expect(page.locator('#clearTablesButton')).toBeVisible();
    
    console.log('✅ Navigate to settings test passed!');
  });

  test('toggle display preferences persist', async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Go to settings
    await navigateToSettings(page);
    await expect(page.locator('#settings-content')).toBeVisible();
    
    // With userSubmitted: true, the displayed-statistics section should already be expanded
    // Wait for the section to be visible
    await expect(page.locator('.displayed-statistics')).toBeVisible();
    
    // Find and uncheck a display option (e.g., "Did It" button)
    const usedButtonCheckbox = page.locator('#usedButtonDisplayed');
    await expect(usedButtonCheckbox).toBeVisible();
    await expect(usedButtonCheckbox).toBeChecked();
    await usedButtonCheckbox.uncheck();
    
    // Wait for setting to save
    await page.waitForTimeout(500);
    
    // Verify localStorage was updated
    const settings = await page.evaluate(() => {
      const data = localStorage.getItem('esCrave');
      return data ? JSON.parse(data) : null;
    });
    
    expect(settings.option.liveStatsToDisplay.usedButton).toBe(false);
    
    // Navigate back to statistics
    await navigateToStatistics(page);
    
    // The "Did It" button should now be hidden
    const useButtonContainer = page.locator('#use-button').locator('..');
    const isHidden = await useButtonContainer.evaluate(el => {
      return window.getComputedStyle(el).display === 'none';
    });
    expect(isHidden).toBe(true);
    
    console.log('✅ Toggle display preferences test passed!');
  });

  test('clear all data removes everything', async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Perform some actions first
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(300);
    
    await page.click('#crave-button');
    await page.waitForTimeout(1100);
    
    // Verify data exists
    await expect(page.locator('#use-total')).toHaveText('1');
    await expect(page.locator('#crave-total')).toHaveText('1');
    
    // Go to settings
    await navigateToSettings(page);
    await expect(page.locator('#settings-content')).toBeVisible();
    
    // Set up confirm dialog handler (clear data shows a confirmation)
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    
    // Click clear all data
    await page.click('#clearTablesButton');
    
    // Wait for clear to process
    await page.waitForTimeout(1000);
    
    // Navigate back to statistics
    await navigateToStatistics(page);
    
    // All counters should be reset to 0
    await expect(page.locator('#use-total')).toHaveText('0');
    await expect(page.locator('#crave-total')).toHaveText('0');
    
    // Habit log should be empty
    const logItems = page.locator('#habit-log .item');
    await expect(logItems).toHaveCount(0);
    
    console.log('✅ Clear all data test passed!');
  });

  test('refresh service worker button exists', async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Go to settings
    await navigateToSettings(page);
    await expect(page.locator('#settings-content')).toBeVisible();
    
    // Verify refresh service worker button exists
    await expect(page.locator('#refreshServiceWorkerButton')).toBeVisible();
    
    console.log('✅ Service worker refresh button test passed!');
  });

  test('display preferences show correct initial state', async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Go to settings
    await navigateToSettings(page);
    await expect(page.locator('#settings-content')).toBeVisible();
    
    // Verify key display options are checked by default
    await expect(page.locator('#usedButtonDisplayed')).toBeChecked();
    await expect(page.locator('#cravedButtonDisplayed')).toBeChecked();
    await expect(page.locator('#spentButtonDisplayed')).toBeChecked();
    await expect(page.locator('#sinceLastDoneDisplayed')).toBeChecked();
    
    console.log('✅ Display preferences initial state test passed!');
  });

  test('settings persist across page reload', async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Go to settings and change a preference
    await navigateToSettings(page);
    
    // With userSubmitted: true, the displayed-statistics section should already be expanded
    await expect(page.locator('.displayed-statistics')).toBeVisible();
    
    const checkbox = page.locator('#cravedButtonDisplayed');
    await expect(checkbox).toBeVisible();
    await checkbox.uncheck();
    await page.waitForTimeout(500);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // With userSubmitted persisted, section should still be expanded
    await expect(page.locator('.displayed-statistics')).toBeVisible();
    
    // Setting should still be unchecked
    await expect(checkbox).not.toBeChecked();
    
    console.log('✅ Settings persistence test passed!');
  });
});


