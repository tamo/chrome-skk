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

    it('should handle "n" correctly', async () => {
      await page.keyboard.press('n');
      expect(await composition()).toBe('n');
      await page.keyboard.press('n');
      expect(await result()).toBe('ん');
      expect(await composition()).toBe('');
    });
  });

  describe('Kanji conversion', () => {
    it('should commit text to result area', async () => {
      await page.keyboard.press('Shift+a');
      expect(await composition()).toBe('▽あ');
      await page.keyboard.press('Enter');
      expect(await result()).toBe('あ');
      expect(await composition()).toBe('');
    });
  });

  describe('should convert "SaKu" to 咲く', () => {
    it('should handle multiple roman inputs', async () => {
      await page.keyboard.press('Shift+s');
      await page.keyboard.press('a');
      await page.keyboard.press('Shift+k');
      expect(await composition()).toBe('▽さ*k');
      await page.keyboard.press('u');
      expect(await composition()).toBe('▼咲く');
      await page.keyboard.press('Enter');
      expect(await result()).toBe('咲く');
    });
  });

  describe('Backspace handling', () => {
    it('should delete last character on backspace', async () => {
      await page.keyboard.press('Shift+a');
      await page.keyboard.press('i');
      await page.keyboard.press('Backspace');
      expect(await composition()).toBe('▽あ');
      expect(await composition()).not.toContain('い');
    });

    it('should clear composition on backspace when empty', async () => {
      await page.keyboard.press('Shift+a');
      await page.keyboard.press('Backspace');
      expect(await composition()).toBe('▽');
    });
  });

  describe('Double consonants', () => {
    it('should handle "tta" as small tsu + ta', async () => {
      await page.keyboard.press('t');
      await page.keyboard.press('t');
      expect(await result()).toBe('っ');
      expect(await composition()).toBe('t');
      await page.keyboard.press('a');
      expect(await result()).toBe('った');
    });
  });

  describe('Mode switching', () => {
    it('should maintain composition through mode switching', async () => {
      await page.keyboard.press('k');
      await page.keyboard.press('l');
      expect(await composition()).toBe('');
      expect(await mode()).toBe('skk-ascii');
    });
  });
});
