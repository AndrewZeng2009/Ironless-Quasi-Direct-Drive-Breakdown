import { expect, test, type Page } from '@playwright/test';

/* Smoke tests: load the page, wait for the 3D model, switch every viewer mode, check its
   behaviour through the engine state, and save one screenshot per mode to tests/screenshots/.
   Reduced motion is on (see playwright.config.ts), so camera moves and stage changes are instant. */

const SHOTS = 'tests/screenshots';

interface QddEngine {
  ready: boolean; mode: string; explode: number; section: boolean; sectionMode: string; openTop: boolean;
  stage: number; torqueStep: number; playing: boolean; selected: string | null; thetaC: number;
  setPlaying(on: boolean): void; setStage(n: number): void; setTorqueStep(n: number): void;
  nodes: { def: { group: string }; mesh: { visible: boolean } }[];
}
const engine = <T>(page: Page, fn: (e: QddEngine) => T) =>
  page.evaluate(`(${fn.toString()})(window.__qdd.engine)`) as Promise<T>;

async function openExplorer(page: Page, errors: string[]) {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.locator('#explorer-stage')).toHaveAttribute('data-status', 'ready', { timeout: 90_000 });
  await page.locator('#explorer').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
}

/** Wait a few frames so the engine applies the new state, then save the viewer. */
async function shoot(page: Page, name: string) {
  await page.evaluate(() => new Promise((r) => { let n = 0; const f = () => (++n > 2 ? r(null) : requestAnimationFrame(f)); f(); }));
  // Scroll the viewer card into view and clip to it. (Avoid fullPage captures: they leave the
  // page's IntersectionObservers in a stale state.)
  const box = await page.evaluate(() => {
    const card = document.querySelector('.stage-card')!;
    card.scrollIntoView({ block: 'start', behavior: 'instant' });
    const r = card.getBoundingClientRect();
    return { x: r.left, y: Math.max(0, r.top), width: r.width, height: Math.min(r.height, innerHeight - Math.max(0, r.top)) };
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: `${SHOTS}/${name}.png`, clip: box, timeout: 120_000 });
}

/** Groups with at least one visible mesh. Visibility is applied per rendered frame, so wait for two. */
const visibleGroups = async (page: Page) => {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return engine(page, (e) => [...new Set(e.nodes.filter((n) => n.mesh.visible).map((n) => n.def.group))].sort());
};

test.describe('3D explorer', () => {
  let errors: string[];
  test.beforeEach(async ({ page }) => { errors = []; await openExplorer(page, errors); });
  test.afterEach(() => { expect(errors, 'console errors').toEqual([]); });

  test('loads the model and the hero', async ({ page }) => {
    expect(await engine(page, (e) => e.ready)).toBe(true);
    // performance marks: model parsed and the explorer scene attached
    const marks = await page.evaluate(() => performance.getEntriesByType('mark').map((m) => [m.name, Math.round(m.startTime)]));
    console.log('load marks (ms):', JSON.stringify(marks));
    expect(await engine(page, (e) => e.nodes.length)).toBe(102); // 95 GLB nodes + 7 decals
    await expect(page.locator('.hero-stage')).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
    // stock terminals are hidden by default
    expect(await visibleGroups(page)).not.toContain('terminals');
    await page.locator('section.hero').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/hero.png`, timeout: 120_000 });
  });

  test('explore: assembled, exploded, section and selection', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Explore/ })).toHaveAttribute('aria-selected', 'true');
    await shoot(page, 'mode-explore');

    await page.getByRole('button', { name: 'Explode', exact: true }).click();
    await expect.poll(() => engine(page, (e) => e.explode)).toBeCloseTo(1, 2);
    await shoot(page, 'mode-explore-exploded');
    await page.getByRole('button', { name: 'Assemble' }).click();
    await expect.poll(() => engine(page, (e) => e.explode)).toBeCloseTo(0, 2);

    await page.getByRole('button', { name: 'Section', exact: true }).click();
    expect(await engine(page, (e) => [e.section, e.sectionMode])).toEqual([true, 'axial']);
    await shoot(page, 'mode-explore-section');
    await page.getByRole('button', { name: 'Section', exact: true }).click();

    await page.locator('.q-row[data-group="sun"]').click();
    const card = page.getByTestId('info-card');
    await expect(card).toHaveAttribute('data-group', 'sun');
    await expect(card.getByRole('heading', { name: 'Sun gear' })).toBeVisible();
    await expect(card.locator('.src-tag')).toHaveText(['CAD (lobe count)', 'Article (ratio)']);
    await shoot(page, 'mode-explore-selected');
  });

  test('every part group can be selected and has an info card with sources', async ({ page }) => {
    const rows = page.locator('.q-row[data-group]');
    const n = await rows.count();
    expect(n).toBe(24);
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      const g = await row.getAttribute('data-group');
      await row.click();
      await expect(page.getByTestId('info-card')).toHaveAttribute('data-group', g!);
      expect(await page.locator('[data-testid=info-card] .src-tag').count()).toBeGreaterThan(0);
    }
    await page.getByRole('button', { name: 'Clear selection' }).click();
    await expect(page.getByTestId('info-card')).not.toHaveAttribute('data-group');
  });

  test('build sequence: stages 1 to 6', async ({ page }) => {
    await page.getByRole('tab', { name: /Build sequence/ }).click();
    expect(await engine(page, (e) => [e.mode, e.stage])).toEqual(['sequence', 1]);
    // stage 1 = gearbox core (plus the carrier's inserts and screws)
    expect(await visibleGroups(page)).toEqual(['carrier', 'fasteners', 'pbearings', 'pins', 'planets', 'ring', 'sun']);
    await shoot(page, 'mode-sequence-stage1');
    for (let s = 2; s <= 6; s++) {
      await page.getByRole('button', { name: new RegExp(`^Stage ${s}:`) }).click();
      await expect(page.locator('.stage-mode .t')).toHaveText(`Build sequence · stage ${s} of 6`);
    }
    expect(await visibleGroups(page)).toContain('pcb');
    await shoot(page, 'mode-sequence-stage6');
  });

  test('gearbox: exact 7:1 kinematics and readout', async ({ page }) => {
    await page.getByRole('tab', { name: /Gearbox/ }).click();
    expect(await engine(page, (e) => [e.mode, e.openTop])).toEqual(['gearbox', true]);
    expect(await visibleGroups(page)).toEqual(['carrier', 'pbearings', 'pins', 'planets', 'ring', 'sun']);
    // reduced motion pauses motion; play it, let it run, then pause and check the ratio
    await engine(page, (e) => e.setPlaying(true));
    await expect.poll(() => engine(page, (e) => e.thetaC), { timeout: 30_000 }).toBeGreaterThan(0.05);
    await engine(page, (e) => e.setPlaying(false));
    await page.waitForTimeout(300);
    const readout = await page.locator('.stage-readout').textContent();
    expect(readout).toMatch(/INPUT \(sun \+ rotor\) [\d.]+ rev\s+→\s+OUTPUT \(carrier\) [\d.]+ rev\s+·\s+ratio 7\.00 : 1/);
    await shoot(page, 'mode-gearbox');
  });

  test('motor: radial cut with magnets and coils', async ({ page }) => {
    await page.getByRole('tab', { name: /Motor section/ }).click();
    expect(await engine(page, (e) => [e.mode, e.section, e.sectionMode])).toEqual(['motor', true, 'radial']);
    expect(await visibleGroups(page)).toEqual(['coils', 'housing', 'magHal', 'magMain', 'rotor', 'stator']);
    await expect(page.locator('.stage-mode .h')).toContainText('illustrative timing');
    await shoot(page, 'mode-motor');
  });

  test('follow the torque: five steps', async ({ page }) => {
    await page.getByRole('tab', { name: /Follow the torque/ }).click();
    expect(await engine(page, (e) => [e.mode, e.section, e.sectionMode, e.torqueStep])).toEqual(['torque', true, 'axial', 1]);
    const titles = ['Command and commutation', 'Current through 36 coils', 'Force across a 0.7 mm gap', 'Rotor turns the sun', 'Carrier delivers ≈7× torque'];
    for (let s = 1; s <= 5; s++) {
      await page.locator('.toolbar').getByRole('button', { name: new RegExp(`^${s}`) }).click();
      await expect(page.locator('.stage-mode .t')).toHaveText(`Follow the torque · step ${s} of 5`);
      await expect(page.locator('.stage-mode .h')).toHaveText(titles[s - 1]);
      // the page's torque section stays in sync
      await expect(page.locator('#torque .q-cell').nth(s - 1)).toHaveAttribute('aria-pressed', 'true');
    }
    await shoot(page, 'mode-torque');
  });

  test('keyboard controls the viewer', async ({ page }) => {
    const canvas = page.getByTestId('explorer-canvas');
    await canvas.focus();
    await page.keyboard.press('e');
    await expect.poll(() => engine(page, (e) => e.explode)).toBeCloseTo(1, 2);
    await page.keyboard.press('s');
    expect(await engine(page, (e) => e.section)).toBe(true);
    await page.keyboard.press('r');
    await expect.poll(() => engine(page, (e) => [e.explode, e.section])).toEqual([0, false]);
    // mode tabs use arrow keys
    await page.getByRole('tab', { name: /Explore/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /Build sequence/ })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test('viewer stacks and nothing scrolls sideways', async ({ page }) => {
    const errors: string[] = [];
    await openExplorer(page, errors);
    const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    expect(sw).toBeLessThanOrEqual(w);
    expect((await page.locator('.stage').boundingBox())!.height).toBeGreaterThanOrEqual(440);
    await shoot(page, 'mobile-explore');
    expect(errors).toEqual([]);
  });
});
