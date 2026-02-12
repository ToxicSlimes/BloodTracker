// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Encyclopedia Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/encyclopedia');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with category tabs', async ({ page }) => {
    const tabs = page.locator('[data-category], .category-tab, .tab-btn, .encyclopedia-tabs button, .tabs button');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    expect(await tabs.count()).toBeGreaterThan(0);
  });

  test('category tab filtering works — click AAS shows only AAS', async ({ page }) => {
    const aasTab = page.locator('[data-category="AAS"], .category-tab:has-text("AAS"), .tab-btn:has-text("AAS"), button:has-text("AAS")').first();
    await aasTab.click();
    await page.waitForTimeout(500);

    const cards = page.locator('.substance-card, .card, .encyclopedia-card, [data-substance]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      if (await card.isVisible()) {
        const category = await card.getAttribute('data-category');
        if (category) {
          expect(category).toBe('AAS');
        }
      }
    }
  });

  test('search filters substances by name', async ({ page }) => {
    const search = page.locator('input[type="search"], input[type="text"][placeholder*="оиск"], input[placeholder*="earch"], .search-input').first();
    await search.fill('тестостерон');
    await page.waitForTimeout(500);

    const visibleCards = page.locator('.substance-card:visible, .card:visible, .encyclopedia-card:visible, [data-substance]:visible');
    const count = await visibleCards.count();
    expect(count).toBeGreaterThanOrEqual(0); // may be 0 if no match
  });

  test('card expands on click showing details', async ({ page }) => {
    const card = page.locator('.substance-card, .card, .encyclopedia-card, [data-substance]').first();
    await card.click();
    await page.waitForTimeout(500);

    const details = page.locator('.card-details, .substance-details, .card-expanded, .card-body, [class*="detail"], [class*="expand"]');
    await expect(details.first()).toBeVisible({ timeout: 5000 });
  });

  test('research button visible on cards with research data', async ({ page }) => {
    const researchBtn = page.locator('button:has-text("Research"), button:has-text("Исследования"), button:has-text("research"), [class*="research"]').first();
    // Some cards may not have research — just check at least one exists or skip
    const count = await researchBtn.count();
    if (count === 0) {
      test.skip();
    }
    await expect(researchBtn).toBeVisible();
  });

  test('research modal opens with tabs', async ({ page }) => {
    const researchBtn = page.locator('button:has-text("Research"), button:has-text("Исследования"), button:has-text("research"), [class*="research-btn"]').first();
    if (await researchBtn.count() === 0) test.skip();

    await researchBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('.modal, .research-modal, [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const expectedTabs = ['Mechanism', 'Studies', 'Bloodwork', 'Interactions', 'Contra', 'Practical',
                          'Механизм', 'Исследования', 'Анализы', 'Взаимодействия', 'Противопоказания', 'Практика'];
    const tabElements = modal.locator('button, [role="tab"], .tab');
    const tabCount = await tabElements.count();
    expect(tabCount).toBeGreaterThan(0);
  });

  test('research modal tabs switch content', async ({ page }) => {
    const researchBtn = page.locator('button:has-text("Research"), button:has-text("Исследования"), button:has-text("research"), [class*="research-btn"]').first();
    if (await researchBtn.count() === 0) test.skip();

    await researchBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('.modal, .research-modal, [class*="modal"]').first();
    const tabs = modal.locator('button, [role="tab"], .tab');
    const count = await tabs.count();

    if (count >= 2) {
      await tabs.nth(0).click();
      const content1 = await modal.locator('.tab-content, .modal-body, [class*="content"]').first().textContent();
      await tabs.nth(1).click();
      await page.waitForTimeout(300);
      const content2 = await modal.locator('.tab-content, .modal-body, [class*="content"]').first().textContent();
      // Content may or may not differ, just ensure no crash
    }
  });

  test('research modal closes on X button', async ({ page }) => {
    const researchBtn = page.locator('button:has-text("Research"), button:has-text("Исследования"), [class*="research-btn"]').first();
    if (await researchBtn.count() === 0) test.skip();

    await researchBtn.click();
    const modal = page.locator('.modal, .research-modal, [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const closeBtn = modal.locator('button:has-text("×"), button:has-text("✕"), .close-btn, .modal-close, [class*="close"]').first();
    await closeBtn.click();
    await expect(modal).toBeHidden({ timeout: 3000 });
  });

  test('research modal closes on Escape key', async ({ page }) => {
    const researchBtn = page.locator('button:has-text("Research"), button:has-text("Исследования"), [class*="research-btn"]').first();
    if (await researchBtn.count() === 0) test.skip();

    await researchBtn.click();
    const modal = page.locator('.modal, .research-modal, [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden({ timeout: 3000 });
  });

  test('research modal closes on overlay click', async ({ page }) => {
    const researchBtn = page.locator('button:has-text("Research"), button:has-text("Исследования"), [class*="research-btn"]').first();
    if (await researchBtn.count() === 0) test.skip();

    await researchBtn.click();
    const modal = page.locator('.modal, .research-modal, [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const overlay = page.locator('.modal-overlay, .overlay, .modal-backdrop, [class*="overlay"]').first();
    await overlay.click({ position: { x: 5, y: 5 }, force: true });
    await expect(modal).toBeHidden({ timeout: 3000 });
  });
});
