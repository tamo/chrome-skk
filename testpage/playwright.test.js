import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('SKK Integration Tests', () => {
  const testPagePath = `file://${__dirname}/testpage.html`;
  const composition = (page) => page.locator('#ime-composition');
  const result = (page) => page.locator('#result');
  const mode = (page) =>
    page.locator('input[name="menu-item-group-1"]:checked');
  const candidates = (page) => page.locator('#candidates');
  const candidate = (page, i) => page.locator(`#candidate-${i}`);

  test.beforeEach(async ({ page }) => {
    await page.route('**/SKK-JISYO.L.gz', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/octet-stream',
        body: fs.readFileSync(`${__dirname}/SKK-JISYO.L.gz`)
      });
    });
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        text.startsWith(
          'update_dictionary_load_status {status: parsing, progress:',
        )
      )
        return;
      console.log(msg.text());
    });
    await page.goto(testPagePath);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Roman input conversion', () => {
    test('should convert "a" to あ (hiragana)', async ({ page }) => {
      await page.keyboard.press('a');
      await expect(result(page)).toHaveText('あ');
    });

    test('should convert "ka" to か (hiragana ka)', async ({ page }) => {
      await page.keyboard.press('k');
      await expect(composition(page)).toHaveText('k');
      await page.keyboard.press('a');
      await expect(result(page)).toHaveText('か');
      await expect(composition(page)).toBeEmpty();
    });

    test('should convert "tta" to った', async ({ page }) => {
      await page.keyboard.press('t');
      await page.keyboard.press('t');
      await expect(result(page)).toHaveText('っ');
      await expect(composition(page)).toHaveText('t');
      await page.keyboard.press('a');
      await expect(result(page)).toHaveText('った');
    });

    test('should convert "nn" to ん', async ({ page }) => {
      await page.keyboard.press('n');
      await expect(composition(page)).toHaveText('n');
      await page.keyboard.press('n');
      await expect(result(page)).toHaveText('ん');
      await expect(composition(page)).toBeEmpty();
    });
  });

  test.describe('Kanji conversion', () => {
    test('should commit preedit to result area', async ({ page }) => {
      await page.keyboard.press('Shift+a');
      await expect(composition(page)).toHaveText('▽あ');
      await page.keyboard.press('Enter');
      await expect(result(page)).toHaveText('あ');
      await expect(composition(page)).toBeEmpty();
    });

    test('should convert "SaKu" to 咲く', async ({ page }) => {
      await page.keyboard.press('Shift+s');
      await page.keyboard.press('a');
      await page.keyboard.press('Shift+k');
      await expect(composition(page)).toHaveText('▽さ*k');
      await page.keyboard.press('u');
      await expect(composition(page)).toHaveText('▼咲く');
      await page.keyboard.press('Enter');
      await expect(result(page)).toHaveText('咲く');
    });

    test('should convert "Tan" to 単', async ({ page }) => {
      await page.keyboard.press('Shift+t');
      await page.keyboard.press('a');
      await page.keyboard.press('n');
      await page.keyboard.press(' ');
      await expect(composition(page)).toHaveText('▼単');
      await page.keyboard.press('n');
      await expect(result(page)).toHaveText('単');
      await expect(composition(page)).toHaveText('n');
    });

    test('should convert "NegsSi" to 熱し', async ({ page }) => {
      await page.keyboard.press('Shift+n');
      await page.keyboard.press('e');
      await page.keyboard.press('g'); // ignored
      await page.keyboard.press('s');
      await page.keyboard.press('Shift+s');
      await page.keyboard.press('i');
      await expect(composition(page)).toHaveText('▼熱し');
      await page.keyboard.press('t');
      await expect(result(page)).toHaveText('熱し');
      await expect(composition(page)).toHaveText('t');
    });
  });

  test.describe('Backspace handling', () => {
    test('should delete last character on backspace', async ({ page }) => {
      await page.keyboard.press('Shift+a');
      await page.keyboard.press('i');
      await page.keyboard.press('Backspace');
      await expect(result(page)).toBeEmpty();
      await expect(composition(page)).toHaveText('▽あ');
      await expect(composition(page)).not.toContainText('い');
    });

    test('should delete last character after committing on backspace', async ({
      page,
    }) => {
      await page.keyboard.press('Shift+i');
      await page.keyboard.press('d');
      await page.keyboard.press('o');
      await page.keyboard.press(' ');
      await expect(composition(page)).toHaveText('▼井戸');
      await page.keyboard.press('Backspace');
      await expect(result(page)).toHaveText('井');
      await expect(composition(page)).toBeEmpty();
    });

    test('should clear composition on backspace when empty', async ({
      page,
    }) => {
      await page.keyboard.press('Shift+a');
      await page.keyboard.press('Backspace');
      await expect(composition(page)).toHaveText('▽');
      await page.keyboard.press('i');
      await expect(composition(page)).toHaveText('▽い');
      await page.keyboard.press(' ');
      await expect(composition(page)).toHaveText('▼胃');
      await page.keyboard.press('Control+g');
      await expect(composition(page)).toHaveText('▽い');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await expect(composition(page)).toHaveText('');
      await page.keyboard.press('i');
      await expect(result(page)).toHaveText('い');
      await expect(composition(page)).toBeEmpty();
    });
  });

  test.describe('Mode switching', () => {
    test('should switch modes', async ({ page }) => {
      await expect(mode(page)).toHaveValue('skk-hiragana');
      await page.keyboard.press('q');
      await expect(mode(page)).toHaveValue('skk-katakana');
      await page.keyboard.press('l');
      await expect(mode(page)).toHaveValue('skk-ascii');
      await page.keyboard.press('Control+j');
      await expect(mode(page)).toHaveValue('skk-hiragana');
    });

    test('should convert "Anq" to "アン"', async ({ page }) => {
      await expect(mode(page)).toHaveValue('skk-hiragana');
      await page.keyboard.press('Shift+a');
      await page.keyboard.press('n');
      await page.keyboard.press('q');
      await expect(result(page)).toHaveText('アン');
      await expect(composition(page)).toBeEmpty();
      await expect(mode(page)).toHaveValue('skk-hiragana');
    });

    test('should handle hankaku-katakana', async ({ page }) => {
      await expect(mode(page)).toHaveValue('skk-hiragana');
      await page.keyboard.press('Control+q');
      await expect(mode(page)).toHaveValue('skk-hankata');
      await page.keyboard.press('Shift+i');
      await page.keyboard.press('Shift+u');
      await expect(composition(page)).toHaveText('▼言う');
      await page.keyboard.press('t');
      await page.keyboard.press('e');
      await expect(result(page)).toHaveText('言ｳﾃ');
      await expect(composition(page)).toHaveText('');
      await expect(mode(page)).toHaveValue('skk-hankata');
    });

    test('should reset composition on mode switching', async ({ page }) => {
      await expect(mode(page)).toHaveValue('skk-hiragana');
      await page.keyboard.press('k');
      await page.keyboard.press('l');
      await expect(result(page)).toHaveText('');
      await expect(composition(page)).toHaveText('');
      await expect(mode(page)).toHaveValue('skk-ascii');
    });
  });

  test.describe('Completion', () => {
    test('should complete on tab', async ({ page }) => {
      await page.keyboard.press('Shift+m');
      await expect(candidates(page)).toBeHidden();
      await page.keyboard.press('o');
      await page.keyboard.press('f');
      await page.keyboard.press('u');
      await expect(composition(page)).toHaveText('▽もふ');
      await page.keyboard.press('Tab');
      await expect(result(page)).toHaveText('');
      await expect(composition(page)).toHaveText('▽もふく');
      await expect(candidate(page, 3)).toHaveText(' もふく'); // label is a space
      await page.keyboard.press(' ');
      await page.keyboard.press('Shift+m');
      await expect(result(page)).toHaveText('喪服');
      await expect(composition(page)).toHaveText('▽m');
      await expect(candidate(page, 3)).toHaveText(' もふく'); // from user dictionary
    });
  });
});
