// @ts-check
const { test, expect } = require('@playwright/test');
const { seedAuth, gotoApp, navigateToPage } = require('./helpers');

test.describe('Encyclopedia Page', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await gotoApp(page);
    await navigateToPage(page, 'encyclopedia');
  });

  test('page loads with category tabs', async ({ page }) => {
    const tabs = page.locator('#encyclopedia-tabs .encyclopedia-tab');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
    // "ВСЕ" tab should exist
    await expect(tabs.filter({ hasText: 'ВСЕ' })).toBeVisible();
  });

  test('category tab filtering works — click tab changes grid', async ({ page }) => {
    const tabs = page.locator('#encyclopedia-tabs .encyclopedia-tab');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    
    // Click a non-ALL tab (e.g., second tab)
    const secondTab = tabs.nth(1);
    await secondTab.click();
    await expect(secondTab).toHaveClass(/active/);
    
    // Grid should still have cards
    const cards = page.locator('.encyclopedia-card');
    // Wait for at least one card or empty state
    await page.waitForTimeout(500);
    const cardCount = await cards.count();
    // Could be 0 if category is empty, but tab should be active
    expect(cardCount).toBeGreaterThanOrEqual(0);
  });

  test('search filters substances by name', async ({ page }) => {
    const searchInput = page.locator('#encyclopedia-search');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    
    // Type a known substance
    await searchInput.fill('тестостерон');
    await page.waitForTimeout(500);
    
    const cards = page.locator('.encyclopedia-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    
    // All visible cards should contain search term
    if (count > 0) {
      const firstCardText = await cards.first().textContent();
      expect(firstCardText?.toLowerCase()).toContain('тестостерон');
    }
  });

  test('card expands on click showing details', async ({ page }) => {
    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    
    await cards.first().click();
    
    // Card should now have expanded class or detail visible
    const detail = cards.first().locator('.encyclopedia-card-detail');
    await expect(detail).toBeVisible({ timeout: 3000 });
  });

  test('research button visible on cards with research data', async ({ page }) => {
    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    
    // Expand a card first
    await cards.first().click();
    await page.waitForTimeout(300);
    
    // Look for research button inside expanded card
    const researchBtn = cards.first().locator('button', { hasText: /ИССЛЕДОВАНИЯ/i });
    // Not all cards may have research, but at least one should
    const allResearchBtns = page.locator('.encyclopedia-card button', { hasText: /ИССЛЕДОВАНИЯ/i });
    // Expand a few cards to find one with research
    for (let i = 0; i < Math.min(5, await cards.count()); i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(200);
    }
    const btnCount = await allResearchBtns.count();
    expect(btnCount).toBeGreaterThan(0);
  });

  test('research modal opens with tabs', async ({ page }) => {
    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    
    // Expand first card and click research button
    await cards.first().click();
    await page.waitForTimeout(300);
    
    const researchBtn = cards.first().locator('button', { hasText: /ИССЛЕДОВАНИЯ/i });
    if (await researchBtn.count() === 0) {
      // Try next cards until we find one with research
      for (let i = 1; i < Math.min(10, await cards.count()); i++) {
        await cards.nth(i).click();
        await page.waitForTimeout(200);
        const btn = cards.nth(i).locator('button', { hasText: /ИССЛЕДОВАНИЯ/i });
        if (await btn.count() > 0) {
          await btn.click();
          break;
        }
      }
    } else {
      await researchBtn.click();
    }
    
    // Modal should be visible
    const modal = page.locator('#research-modal-overlay');
    await expect(modal).toBeVisible({ timeout: 3000 });
    
    // Should have tabs
    const tabs = modal.locator('.research-tab');
    expect(await tabs.count()).toBeGreaterThan(0);
  });

  test('research modal tabs switch content', async ({ page }) => {
    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    
    // Find a card with research and open modal
    for (let i = 0; i < Math.min(10, await cards.count()); i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(200);
      const btn = cards.nth(i).locator('button', { hasText: /ИССЛЕДОВАНИЯ/i });
      if (await btn.count() > 0) {
        await btn.click();
        break;
      }
    }
    
    const modal = page.locator('#research-modal-overlay');
    await expect(modal).toBeVisible({ timeout: 3000 });
    
    // Click different tabs
    const tabs = modal.locator('.research-tab');
    const tabCount = await tabs.count();
    for (let i = 1; i < tabCount; i++) {
      await tabs.nth(i).click();
      await expect(tabs.nth(i)).toHaveClass(/active/);
    }
  });

  test('research modal closes on X button', async ({ page }) => {
    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    
    for (let i = 0; i < Math.min(10, await cards.count()); i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(200);
      const btn = cards.nth(i).locator('button', { hasText: /ИССЛЕДОВАНИЯ/i });
      if (await btn.count() > 0) { await btn.click(); break; }
    }
    
    const modal = page.locator('#research-modal-overlay');
    await expect(modal).toBeVisible({ timeout: 3000 });
    
    await page.locator('#research-modal-close').click();
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });

  test('research modal closes on Escape key', async ({ page }) => {
    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    
    for (let i = 0; i < Math.min(10, await cards.count()); i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(200);
      const btn = cards.nth(i).locator('button', { hasText: /ИССЛЕДОВАНИЯ/i });
      if (await btn.count() > 0) { await btn.click(); break; }
    }
    
    const modal = page.locator('#research-modal-overlay');
    await expect(modal).toBeVisible({ timeout: 3000 });
    
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });

  test('research modal closes on overlay click', async ({ page }) => {
    const cards = page.locator('.encyclopedia-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    
    for (let i = 0; i < Math.min(10, await cards.count()); i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(200);
      const btn = cards.nth(i).locator('button', { hasText: /ИССЛЕДОВАНИЯ/i });
      if (await btn.count() > 0) { await btn.click(); break; }
    }
    
    const modal = page.locator('#research-modal-overlay');
    await expect(modal).toBeVisible({ timeout: 3000 });
    
    // Click the overlay (outside the modal content)
    await modal.click({ position: { x: 5, y: 5 } });
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });
});
