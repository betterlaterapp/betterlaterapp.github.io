import { test, expect } from '@playwright/test';

/**
 * Smoke Test: Basic connectivity and app loading
 * 
 * This test simply verifies:
 * 1. The local server is running
 * 2. The app HTML loads
 * 3. Basic page structure exists
 */

test.describe('Smoke Test - App Loads', () => {
  test('app loads and returns HTML', async ({ page }) => {
    // Navigate to the app
    await page.goto('/app.html');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check that we got HTML back (title should exist)
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).toContain('Better Later');
    
    // Check that body exists
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check that main container exists
    const container = page.locator('.container.app-overlay');
    await expect(container).toBeVisible();
    
    console.log('✅ Smoke test passed! App loaded successfully.');
  });

  test('app has basic UI elements', async ({ page }) => {
    // Navigate to the app
    await page.goto('/app.html');
    await page.waitForLoadState('networkidle');
    
    // Check for header
    const header = page.locator('#header');
    await expect(header).toBeVisible();
    
    // Check for button bar
    const buttonBar = page.locator('.button-bar');
    await expect(buttonBar).toBeVisible();
    
    // Check that action buttons exist (don't need to be visible yet)
    const useButton = page.locator('#use-button');
    await expect(useButton).toBeAttached();
    
    const craveButton = page.locator('#crave-button');
    await expect(craveButton).toBeAttached();
    
    const boughtButton = page.locator('#bought-button');
    await expect(boughtButton).toBeAttached();
    
    const goalButton = page.locator('#goal-button');
    await expect(goalButton).toBeAttached();
    
    console.log('✅ Basic UI elements test passed!');
  });
});

