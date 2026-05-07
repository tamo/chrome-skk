describe('SKK Integration Tests', () => {
  let browser;
  let context;
  let page;
  const testPagePath = `file://${__dirname}/../testpage/testpage.html`;
  const composition = async () => await page.textContent('#ime-composition');
  const result = async () => await page.textContent('#result');
  const mode = async () =>
    await page.inputValue('input[name="menu-item-group-1"]:checked');

  beforeAll(async () => {
    const { chromium } = require('playwright');
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    context = await browser.newContext();
    page = await browser.newPage();
    await page.goto(testPagePath);
    await page.waitForLoadState('networkidle');
  });

  afterEach(async () => {
    await context.close();
  });

  describe('Roman input conversion', () => {
    it('should convert "a" to あ (hiragana)', async () => {
      await page.keyboard.press('a');
      expect(await result()).toBe('あ');
    });

    it('should convert "ka" to か (hiragana ka)', async () => {
      await page.keyboard.press('k');
      expect(await composition()).toBe('k');
      await page.keyboard.press('a');
      expect(await result()).toBe('か');
      expect(await composition()).toBe('');
    });

    it('should convert "tta" to った', async () => {
      await page.keyboard.press('t');
      await page.keyboard.press('t');
      expect(await result()).toBe('っ');
      expect(await composition()).toBe('t');
      await page.keyboard.press('a');
      expect(await result()).toBe('った');
    });

    it('should convert "nn" to ん', async () => {
      await page.keyboard.press('n');
      expect(await composition()).toBe('n');
      await page.keyboard.press('n');
      expect(await result()).toBe('ん');
      expect(await composition()).toBe('');
    });
  });

  describe('Kanji conversion', () => {
    it('should commit preedit to result area', async () => {
      await page.keyboard.press('Shift+a');
      expect(await composition()).toBe('▽あ');
      await page.keyboard.press('Enter');
      expect(await result()).toBe('あ');
      expect(await composition()).toBe('');
    });

    it('should convert "SaKu" to 咲く', async () => {
      await page.keyboard.press('Shift+s');
      await page.keyboard.press('a');
      await page.keyboard.press('Shift+k');
      expect(await composition()).toBe('▽さ*k');
      await page.keyboard.press('u');
      expect(await composition()).toBe('▼咲く');
      await page.keyboard.press('Enter');
      expect(await result()).toBe('咲く');
    });

    it('should convert "Tan" to 単', async () => {
      await page.keyboard.press('Shift+t');
      await page.keyboard.press('a');
      await page.keyboard.press('n');
      await page.keyboard.press(' ');
      expect(await composition()).toBe('▼単');
      await page.keyboard.press('n');
      expect(await result()).toBe('単');
      expect(await composition()).toBe('n');
    });

    it('should convert "NegsSi" to 熱し', async () => {
      await page.keyboard.press('Shift+n');
      await page.keyboard.press('e');
      await page.keyboard.press('g'); // ignored
      await page.keyboard.press('s');
      await page.keyboard.press('Shift+s');
      await page.keyboard.press('i');
      expect(await composition()).toBe('▼熱し');
      await page.keyboard.press('t');
      expect(await result()).toBe('熱し');
      expect(await composition()).toBe('t');
    });
  });

  describe('Backspace handling', () => {
    it('should delete last character on backspace', async () => {
      await page.keyboard.press('Shift+a');
      await page.keyboard.press('i');
      await page.keyboard.press('Backspace');
      expect(await result()).toBe('');
      expect(await composition()).toBe('▽あ');
      expect(await composition()).not.toContain('い');
    });

    it('should delete last character after committing on backspace', async () => {
      await page.keyboard.press('Shift+i');
      await page.keyboard.press('d');
      await page.keyboard.press('o');
      await page.keyboard.press(' ');
      expect(await composition()).toBe('▼井戸');
      await page.keyboard.press('Backspace');
      expect(await result()).toBe('井');
      expect(await composition()).toBe('');
    });

    it('should clear composition on backspace when empty', async () => {
      await page.keyboard.press('Shift+a');
      await page.keyboard.press('Backspace');
      expect(await composition()).toBe('▽');
      await page.keyboard.press('i');
      expect(await composition()).toBe('▽い');
      await page.keyboard.press(' ');
      expect(await composition()).toBe('▼胃');
      await page.keyboard.press('Control+g');
      expect(await composition()).toBe('▽い');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      expect(await composition()).toBe('');
      await page.keyboard.press('i');
      expect(await result()).toBe('い');
      expect(await composition()).toBe('');
    });
  });

  describe('Mode switching', () => {
    it('should switch modes', async () => {
      expect(await mode()).toBe('skk-hiragana');
      await page.keyboard.press('q');
      expect(await mode()).toBe('skk-katakana');
      await page.keyboard.press('l');
      expect(await mode()).toBe('skk-ascii');
      await page.keyboard.press('Control+j');
      expect(await mode()).toBe('skk-hiragana');
    });

    it('should convert "Anq" to "アン"', async () => {
      expect(await mode()).toBe('skk-hiragana');
      await page.keyboard.press('Shift+a');
      await page.keyboard.press('n');
      await page.keyboard.press('q');
      expect(await result()).toBe('アン');
      expect(await composition()).toBe('');
      expect(await mode()).toBe('skk-hiragana');
    });

    it('should handle hankaku-katakana', async () => {
      expect(await mode()).toBe('skk-hiragana');
      await page.keyboard.press('Control+q');
      expect(await mode()).toBe('skk-hankata');
      await page.keyboard.press('Shift+i');
      await page.keyboard.press('Shift+u');
      expect(await composition()).toBe('▼言う');
      await page.keyboard.press('t');
      await page.keyboard.press('e');
      expect(await result()).toBe('言ｳﾃ');
      expect(await composition()).toBe('');
      expect(await mode()).toBe('skk-hankata');
    });

    it('should reset composition on mode switching', async () => {
      expect(await mode()).toBe('skk-hiragana');
      await page.keyboard.press('k');
      await page.keyboard.press('l');
      expect(await result()).toBe('');
      expect(await composition()).toBe('');
      expect(await mode()).toBe('skk-ascii');
    });
  });
});
