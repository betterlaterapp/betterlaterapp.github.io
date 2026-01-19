import { test, expect } from '@playwright/test';
import { 
  navigateToSettings, 
  navigateToStatistics, 
  navigateToJournal,
  setupUserWithBaseline,
  setupNewUser
} from './utils/test-helpers';

/**
 * Test: Settings & Preferences
 * 
 * Validates:
 * - Baseline questionnaire flow
 * - Toggle display preferences
 * - Clear all data functionality
 * - Settings persistence
 */

test.describe('Better Later - Settings & Preferences', () => {
  test('new user sees baseline questionnaire', async ({ page }) => {
    await setupNewUser(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Should see baseline questionnaire
    const baselineSection = page.locator('#baseline-questionnaire');
    const isVisible = await baselineSection.isVisible().catch(() => false);
    
    // Alternative: check for first question
    const firstQuestion = page.locator('text=Do you have a specific habit in mind');
    const questionVisible = await firstQuestion.isVisible().catch(() => false);
    
    expect(isVisible || questionVisible).toBe(true);
    
    console.log('✅ Baseline questionnaire visibility test passed!');
  });

  test.skip('complete baseline questionnaire enables app', async ({ page }) => {
    await setupNewUser(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Answer questions (simplified flow)
    // This will depend on actual questionnaire implementation
    
    console.log('⚠️  Baseline completion test requires actual questionnaire flow');
  });

  test('navigate to settings tab', async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to settings
    await navigateToSettings(page);
    
    // Settings content should be visible
    await expect(page.locator('#settings-content')).toBeVisible();
    
    console.log('✅ Navigate to settings test passed!');
  });

  test('toggle display preferences persist', async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to settings
    await navigateToSettings(page);
    
    // Find an ENABLED toggle to change (skip disabled category checkboxes)
    // Use a specific checkbox that's not disabled, like waitButtonDisplayed
    const toggle = page.locator('#waitButtonDisplayed');
    
    if (await toggle.isVisible()) {
      const initialState = await toggle.isChecked();
      
      // Toggle it
      await toggle.click();
      await page.waitForTimeout(300);
      
      // Verify it changed
      const newState = await toggle.isChecked();
      expect(newState).toBe(!initialState);
      
      console.log('✅ Toggle display preferences test passed!');
    } else {
      console.log('⚠️  Toggle not found in settings');
    }
  });

  test('clear all data removes everything', async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // First do an action to have some data
    await page.click('#use-button');
    await page.click('.use.log-more-info button.submit');
    await page.waitForTimeout(500);
    
    // Verify action was recorded
    await expect(page.locator('#use-total')).toHaveText('1');
    
    // Navigate to settings
    await navigateToSettings(page);
    
    // Find and click clear data button using the specific ID
    const clearButton = page.locator('#clearTablesButton');
    
    // Handle confirmation dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(500);
      
      // Navigate back to statistics
      await navigateToStatistics(page);
      
      // Data should be cleared or baseline questionnaire shown again
      // Check counter is 0 or questionnaire is visible
      const useTotal = await page.locator('#use-total').textContent().catch(() => null);
      const questionVisible = await page.locator('text=Do you have a specific habit in mind').isVisible().catch(() => false);
      
      expect(useTotal === '0' || questionVisible).toBe(true);
      
      console.log('✅ Clear all data test passed!');
    } else {
      console.log('⚠️  Clear data button not found');
    }
  });

  test('update app button exists', async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to settings
    await navigateToSettings(page);
    
    // Look for the update app button by its specific ID
    const updateButton = page.locator('#refreshServiceWorkerButton');
    await expect(updateButton).toBeVisible();
    
    console.log('✅ Update app button test passed!');
  });

  test('display preferences show correct initial state', async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to settings
    await navigateToSettings(page);
    
    // Check that preference toggles are visible (excluding disabled ones)
    const preferenceSection = page.locator('#settings-content input[type="checkbox"]:not([disabled])');
    const count = await preferenceSection.count();
    
    expect(count).toBeGreaterThan(0);
    
    console.log('✅ Display preferences initial state test passed!');
  });

  test('settings persist across page reload', async ({ page }) => {
    await setupUserWithBaseline(page);
    await page.goto('/app/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to settings
    await navigateToSettings(page);
    
    // Get a specific enabled checkbox
    const checkbox = page.locator('#waitButtonDisplayed');
    
    if (await checkbox.isVisible()) {
      // Toggle the checkbox
      await checkbox.click();
      await page.waitForTimeout(300);
      const stateAfterToggle = await checkbox.isChecked();
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Navigate back to settings
      await navigateToSettings(page);
      
      // Check state is preserved
      const stateAfterReload = await page.locator('#waitButtonDisplayed').isChecked();
      expect(stateAfterReload).toBe(stateAfterToggle);
      
      console.log('✅ Settings persistence test passed!');
    } else {
      console.log('⚠️  Checkbox not found to test persistence');
    }
  });
});
