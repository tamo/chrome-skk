import { test, expect } from '@playwright/test';

test.describe('SKK Integration Tests', () => {
  const composition = (page) => page.locator('#ime-composition');
  const result = (page) => page.locator('#result');
  const mode = (page) =>
    page.locator('input[name="menu-item-group-1"]:checked');
  const candidates = (page) => page.locator('#candidates');
  const candidate = (page, i) => page.locator(`#candidate-${i}`);

  test.beforeEach(async ({ page }) => {
    await page.route('**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/SKK-JISYO.L.gz'))
        url.pathname = '/testpage/SKK-JISYO.L.gz';
      const response = await route.fetch({
        url: `http://127.0.0.1:8080${url.pathname}`,
      });
      await route.fulfill({ response });
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
    await page.goto('http://example.com/testpage/testpage.html');
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

    test('should convert "Qtan" to 単', async ({ page }) => {
      await page.keyboard.press('Shift+q');
      await expect(composition(page)).toHaveText('▽');
      await page.keyboard.press('t');
      await expect(composition(page)).toHaveText('▽t');
      await page.keyboard.press('a');
      await expect(composition(page)).toHaveText('▽た');
      await page.keyboard.press('n');
      await expect(composition(page)).toHaveText('▽たn');
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

    test('should convert "Dai>" and narrow with ";"', async ({ page }) => {
      await page.keyboard.press('Shift+d');
      await page.keyboard.press('a');
      await page.keyboard.press('i');
      await page.keyboard.press('Shift+>');
      await expect(composition(page)).toHaveText('▼第');
      await expect(candidate(page, 1)).toHaveText('大');
      await page.keyboard.press(';');
      await expect(result(page)).toBeEmpty();
      await expect(composition(page)).toHaveText('▽だい>;');
      await page.keyboard.press('o');
      await page.keyboard.press('o');
      await expect(composition(page)).toHaveText('▽だい>;おお');
      await page.keyboard.press(' ');
      await expect(composition(page)).toHaveText('▼大');
    });

    test('should convert "Dai1kai" to 第1回', async ({ page }) => {
      await page.keyboard.press('Shift+d');
      await page.keyboard.press('a');
      await page.keyboard.press('i');
      await page.keyboard.press('1');
      await page.keyboard.press('k');
      await page.keyboard.press('a');
      await page.keyboard.press('i');
      await page.keyboard.press(' ');
      await expect(composition(page)).toHaveText('▼第１回');
      await expect(candidate(page, 1)).toHaveText('第1回');
      await expect(candidate(page, 2)).toHaveText('第一回');
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

    test('should commit conversion on backspace', async ({ page }) => {
      await page.keyboard.press('Shift+i');
      await page.keyboard.press('d');
      await page.keyboard.press('o');
      await page.keyboard.press(' ');
      await expect(composition(page)).toHaveText('▼井戸');
      await page.keyboard.press('Backspace'); // commit and delete
      await expect(result(page)).toHaveText('井');
      await expect(composition(page)).toBeEmpty();
    });

    test('should leave preedit on backspace', async ({ page }) => {
      await page.keyboard.press('Shift+a');
      await expect(composition(page)).toHaveText('▽あ');
      await page.keyboard.press('Backspace');
      await expect(composition(page)).toHaveText('▽'); // still in preedit
      await page.keyboard.press('i');
      await expect(composition(page)).toHaveText('▽い');
      await page.keyboard.press(' ');
      await expect(composition(page)).toHaveText('▼胃');
      await page.keyboard.press('Control+g'); // same effect as Esc
      await expect(composition(page)).toHaveText('▽い');
      await page.keyboard.press('Backspace');
      await expect(composition(page)).toHaveText('▽');
      await page.keyboard.press('Backspace'); // leave preedit
      await expect(composition(page)).toHaveText('');
      await page.keyboard.press('i');
      await expect(result(page)).toHaveText('い');
      await expect(composition(page)).toBeEmpty();
    });
  });

  test.describe('Cursor motion', () => {
    test('should move cursor in preedit', async ({ page }) => {
      await page.keyboard.press('Shift+h');
      await page.keyboard.press('e');
      await page.keyboard.press('w');
      await page.keyboard.press('a');
      await expect(composition(page)).toHaveText('▽へわ');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('i');
      await expect(composition(page)).toHaveText('▽へいわ');
      await page.keyboard.press('s');
      await page.keyboard.press('a');
      await page.keyboard.press('Control+f'); // same as ArrowRight
      await page.keyboard.press('Backspace');
      await expect(composition(page)).toHaveText('▽へいさ');
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
      await page.keyboard.press('Shift+l');
      await expect(mode(page)).toHaveValue('skk-full-ascii');
      await page.keyboard.press('Control+j');
      await expect(mode(page)).toHaveValue('skk-hiragana');
      await page.keyboard.press('Control+q');
      await expect(mode(page)).toHaveValue('skk-hankata');
    });

    test('should convert "Anq" to "アン"', async ({ page }) => {
      await expect(mode(page)).toHaveValue('skk-hiragana');
      await page.keyboard.press('Shift+a');
      await page.keyboard.press('n');
      await expect(composition(page)).toHaveText('▽あn');
      await page.keyboard.press('q'); // convert without switching
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
      await expect(composition(page)).toHaveText('▼言う'); // hiragana
      await page.keyboard.press('t');
      await page.keyboard.press('e');
      await expect(result(page)).toHaveText('言ｳﾃ');
      await expect(composition(page)).toHaveText('');
      await expect(mode(page)).toHaveValue('skk-hankata'); // previous kana
    });

    test('should reset composition on mode switching', async ({ page }) => {
      await expect(mode(page)).toHaveValue('skk-hiragana');
      await page.keyboard.press('k'); // ignored
      await page.keyboard.press('l');
      await expect(result(page)).toHaveText('');
      await expect(composition(page)).toHaveText('');
      await expect(mode(page)).toHaveValue('skk-ascii');
    });

    test('should switch on "/"', async ({ page }) => {
      await expect(mode(page)).toHaveValue('skk-hiragana');
      await page.keyboard.press('/');
      await expect(mode(page)).toHaveValue('skk-hiragana'); // ascii-preedit
      await page.keyboard.press('u');
      await page.keyboard.press('i');
      await expect(composition(page)).toHaveText('▽ui');
      await page.keyboard.press(' ');
      await expect(result(page)).toHaveText('');
      await expect(composition(page)).toHaveText('▼ユーザーインターフェース');
      await expect(mode(page)).toHaveValue('skk-hiragana');
      await page.keyboard.press('Enter');
      await expect(mode(page)).toHaveValue('skk-hiragana');
    });
  });

  test.describe('Completion', () => {
    test('should complete on tab', async ({ page }) => {
      await page.keyboard.press('Shift+m');
      await expect(candidates(page)).toBeHidden(); // no completion
      await page.keyboard.press('o');
      await page.keyboard.press('f');
      await page.keyboard.press('u');
      await expect(composition(page)).toHaveText('▽もふ');
      await page.keyboard.press('Tab');
      await expect(result(page)).toHaveText('');
      await expect(composition(page)).toHaveText('▽もふく'); // completed
      await expect(candidate(page, 3)).toHaveText(' もふく'); // label is a space
    });

    test('should complete without tab', async ({ page }) => {
      await page.keyboard.press('Shift+m');
      await expect(candidates(page)).toBeHidden();
      await page.keyboard.press('o');
      await page.keyboard.press('f');
      await page.keyboard.press('u');
      await page.keyboard.press('Tab');
      await page.keyboard.press(' ');
      await expect(composition(page)).toHaveText('▼喪服');
      await page.keyboard.press('Shift+m'); // commit, record and complete
      await expect(result(page)).toHaveText('喪服');
      await expect(composition(page)).toHaveText('▽m');
      await expect(candidate(page, 3)).toHaveText(' もふく'); // from user dictionary
    });

    test('should not complete after deleting the entry', async ({ page }) => {
      await page.keyboard.press('Shift+m');
      await expect(candidates(page)).toBeHidden();
      await page.keyboard.press('o');
      await page.keyboard.press('f');
      await page.keyboard.press('u');
      await page.keyboard.press('Tab');
      await page.keyboard.press(' ');
      await page.keyboard.press('Shift+m');
      await expect(candidate(page, 3)).toHaveText(' もふく');
      await page.keyboard.press('Tab');
      await page.keyboard.press(' ');
      await expect(composition(page)).toHaveText('▼喪服');
      await page.keyboard.press('Shift+x'); // delete
      await page.keyboard.press('Shift+m');
      await expect(candidates(page)).toBeHidden();
    });
  });

  test.describe('Registration with innerSKK', () => {
    test('should register new entry', async ({ page }) => {
      await page.keyboard.press('Shift+y');
      await page.keyboard.press('o');
      await page.keyboard.press('-');
      await expect(composition(page)).toHaveText('▽よー');
      await page.keyboard.press(' ');
      await expect(composition(page)).toHaveText('▼魷');
      await page.keyboard.press(' ');
      await expect(composition(page)).toHaveText('▼よー【】');
      await page.keyboard.press('l');
      await expect(mode(page)).toHaveValue('skk-ascii');
      await page.keyboard.press('y');
      await page.keyboard.press('o');
      await expect(composition(page)).toHaveText('▼よー【yo】');
      await page.keyboard.press('Enter');
      await expect(result(page)).toHaveText('yo');
      await expect(mode(page)).toHaveValue('skk-hiragana');
      await page.keyboard.press('Shift+y');
      await page.keyboard.press('o');
      await page.keyboard.press('-');
      await expect(composition(page)).toHaveText('▽よー');
      await page.keyboard.press(' ');
      await expect(composition(page)).toHaveText('▼yo');
      await page.keyboard.press('Enter');
      await expect(mode(page)).toHaveValue('skk-hiragana');
    });
  });
});
