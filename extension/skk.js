const STATUS_DURATION = 2500;

function SKK(engineID, dictionary) {
  this.engineID = engineID;
  this.context = null;
  this.currentMode = 'hiragana';
  this.previousKana = 'hiragana';
  this.previousMode = null;
  this.roman = '';
  this.preedit = '';
  this.hint = '';
  this.oldRoman = '';
  this.oldPreedit = '';
  this.tabbing = null;
  this.okuriPrefix = '';
  this.okuriText = '';
  this.caret = null;
  this.entries = null;
  this.clickListener = null;
  this.dictionary = dictionary;
  this.timeout = null;
  this.private = false;
  this.createOffscreen = null;
  this.googleEntries = null;
  this.googleIndex = 0;
}

SKK.prototype.commitText = function (text) {
  chrome.input.ime.commitText({ contextID: this.context, text: text });
};

SKK.prototype.setComposition = function (text, cursor, args) {
  const allowed_fields = ['selectionStart', 'selectionEnd'];
  const obj = { contextID: this.context, text, cursor };
  args = args || {};
  for (const field of allowed_fields) {
    if (args[field]) {
      obj[field] = args[field];
    }
  }
  chrome.input.ime.setComposition(obj);
};

SKK.prototype.clearComposition = function () {
  chrome.input.ime.clearComposition({ contextID: this.context });
};

SKK.prototype.updateCandidates = async function () {
  if (this.inner_skk) {
    this.inner_skk.updateCandidates();
    return;
  }

  try {
    const data = this.entries;
    if (!data) {
      await chrome.input.ime.setCandidateWindowProperties({
        engineID: this.engineID,
        properties: { visible: false },
      });
      return;
    }

    const noList = data.index <= 2;
    const pageSize = noList ? 3 : 7;
    const start = noList ? 0 : data.index;
    if (!data.text || data.text.startsWith('+ ')) {
      const remain = Math.max(0, data.entries.length - start - pageSize);
      data.text = '+ ' + remain;
    }

    const candidates = data.entries
      .slice(start, start + pageSize)
      .map((entry, i) => ({
        candidate: entry.word,
        id: start + i,
        label: noList ? '' : data.label[i],
        annotation: entry.annotation,
      }));

    await chrome.input.ime.setCandidates({
      contextID: this.context,
      candidates,
    });
    await chrome.input.ime.setCandidateWindowProperties({
      engineID: this.engineID,
      properties: {
        visible: true,
        cursorVisible: true,
        vertical: true,
        windowPosition: 'composition',
        pageSize,
        auxiliaryText: data.text,
        auxiliaryTextVisible: !!data.text,
      },
    });
    await chrome.input.ime.setCursorPosition({
      contextID: this.context,
      candidateID: data.index,
    });
  } catch (e) {
    console.log(e);
  }

  if (!this.clickListener) {
    this.clickListener = (engineID, candidateID, button) => {
      if (!this.entries || button != 'left') return;

      this.entries.index = candidateID;

      if (this.currentMode == 'conversion') {
        const keyHandler = this.modes[this.currentMode].keyHandler;
        keyHandler(this, { key: 'Enter' });
      } else {
        this.preedit = this.entries.entries[candidateID].word;
        this.roman = '';
        this.caret = [...this.preedit].length;
        this.switchMode('conversion');
      }
      this.updateComposition();
      this.updateCandidates();
    };
    chrome.input.ime.onCandidateClicked.addListener(this.clickListener);
  }
};

SKK.prototype.lookup = function (reading, callback) {
  const result = this.dictionary.lookup(reading);
  callback(result?.data);
};

SKK.prototype.complete = function (dict_complete, text) {
  const entries = [];
  if (this.roman.length > 0) {
    for (const k in romanTable) {
      if (k.startsWith(this.roman)) {
        entries.push(...dict_complete(this.preedit + romanTable[k]));
      }
    }
  }
  entries.sort((a, b) => b.length - a.length);
  entries.push(
    ...dict_complete(this.preedit + this.roman).sort(
      (a, b) => b.length - a.length,
    ),
  );
  if (entries.length > 0) {
    const candidates = ['', '', '', ...new Set(entries)];
    this.entries = {
      index: 3,
      entries: candidates.map((e) => ({ word: e })),
      label: '       ',
      text,
    };
  } else {
    this.entries = null;
  }
  this.updateCandidates();
};

SKK.prototype.userComplete = function () {
  this.complete(this.dictionary.userComplete.bind(this.dictionary), 'user');
  this.tabbing = null;
};

SKK.prototype.systemComplete = function () {
  this.complete(this.dictionary.systemComplete.bind(this.dictionary), 'system');
  this.tabbing = 'system';
};

SKK.prototype.narrowDown = function (entries, hint) {
  const words = this.dictionary.lookup(hint);
  if (!words) return [];
  const kanjis = words.data.flatMap((w) => [...w.word]);
  return entries.filter((e) => kanjis.some((k) => e.word.includes(k)));
};

SKK.prototype.processRoman = function (key, table, emitter) {
  const roman = this.roman + key;
  if (table[roman]) {
    this.roman = '';
    emitter(table[roman]);
    return true;
  }

  if (roman.length > 1 && roman[0] == roman[1]) {
    this.roman = roman.slice(1);
    emitter(table['xtu']);
  }

  if (Object.keys(table).some((k) => k.startsWith(roman))) {
    this.roman = roman;
    return true;
  }

  if (roman[0] == 'n') {
    emitter(table['nn']);
  }

  if (table[key]) {
    this.roman = '';
    emitter(table[key]);
    return true;
  } else if (Object.keys(table).some((k) => k.startsWith(key))) {
    this.roman = key;
    return true;
  } else {
    this.roman = '';
    return false;
  }
};

SKK.prototype.modes = {};
SKK.prototype.primaryModes = [];
SKK.registerMode = (modeName, mode) => {
  SKK.registerImplicitMode(modeName, mode);
  SKK.prototype.primaryModes.push(modeName);
};
SKK.registerImplicitMode = (modeName, mode) => {
  SKK.prototype.modes[modeName] = mode;
};
SKK.prototype.menuHeader = [
  { id: 'skk-options', label: 'SKK\u306E\u8A2D\u5B9A', style: 'check' },
  { id: 'skk-separator', style: 'separator' },
];

SKK.prototype.switchMode = function (newMode, isInner = false) {
  this.entries = null;
  this.oldPreedit = '';
  this.oldRoman = '';
  this.tabbing = null;
  if (newMode == this.currentMode) return;

  if (this.inner_skk) {
    this.inner_skk.switchMode(newMode, true);
    return;
  }

  this.previousMode = this.currentMode;
  this.currentMode = newMode;
  this.showStatus();
  const initHandler = this.modes[this.currentMode].initHandler;
  if (initHandler) {
    initHandler(this);
  }

  if (this.primaryModes.includes(this.previousMode) && !isInner) {
    this.previousKana = this.previousMode;
  }

  if (this.primaryModes.includes(this.currentMode)) {
    const items = structuredClone(this.menuHeader);
    for (modeName of this.primaryModes) {
      items.push({
        id: 'skk-' + modeName,
        label: this.modes[modeName].displayName,
        style: 'radio',
        checked: modeName == this.currentMode,
      });
    }

    chrome.input.ime.setMenuItems({ engineID: this.engineID, items });
  }
};

SKK.prototype.updateComposition = function () {
  if (this.inner_skk) {
    this.inner_skk.updateComposition();
    return;
  }

  const compositionHandler = this.modes[this.currentMode].compositionHandler;
  if (compositionHandler) {
    compositionHandler(this);
  } else {
    this.clearComposition();
  }
};

SKK.prototype.handleKeyEvent = function (keyevent) {
  const key = keyevent.key;

  // Do not handle modifier only keyevent.
  if (!key) return false;
  if (keyevent.ctrlKey && (key == 'Ctrl' || key == 'Control')) return false;
  if (keyevent.altKey && key == 'Alt') return false;

  const consumed = this.inner_skk
    ? this.inner_skk.handleKeyEvent(keyevent)
    : this.modes[this.currentMode].keyHandler?.(this, keyevent) ||
      // Hack for mock
      (!this.is_inner &&
        this.engineID == 'sample' &&
        key == 'Backspace' &&
        keyevent.type == 'keydown' &&
        !chrome.input.ime.deleteSurroundingText({
          contextID: this.context,
          engineID: this.engineID,
          length: 1,
          offset: -1,
        }));
  this.updateComposition();
  this.updateCandidates();
  return consumed;
};

SKK.prototype.createInnerSKK = function () {
  const outer_skk = this;
  const inner_skk = new SKK(this.engineID, this.dictionary);
  inner_skk.is_inner = true;
  inner_skk.context = this.context;
  inner_skk.commit_text = '';
  inner_skk.commit_cursor = 0;
  inner_skk.commitText = function (text) {
    inner_skk.commit_text =
      [...inner_skk.commit_text].slice(0, inner_skk.commit_cursor).join('') +
      text +
      [...inner_skk.commit_text].slice(inner_skk.commit_cursor).join('');
    inner_skk.commit_cursor += [...text].length;
  };

  inner_skk.getPrefix = function () {
    const prefix_text =
      '\u25bc' + // ▼
      outer_skk.preedit + // input text
      (outer_skk.okuriText.length > 0 ? '*' + outer_skk.okuriText : '') +
      '\u3010'; // 【

    const cursor = [...prefix_text].length + inner_skk.commit_cursor;
    return { text: prefix_text + this.commit_text, cursor };
  };

  inner_skk.setComposition = function (text, cursor, args) {
    const prefix = this.getPrefix();
    if (args?.selectionStart) {
      args.selectionStart += [...prefix.text].length;
    }
    if (args?.selectionEnd) {
      args.selectionEnd += [...prefix.text].length;
    }
    // Show 】 after the current composition
    outer_skk.setComposition(
      prefix.text + text + '\u3011',
      prefix.cursor,
      args,
    );
  };
  inner_skk.clearComposition = function () {
    const prefix = this.getPrefix();
    outer_skk.setComposition(prefix.text + '\u3011', prefix.cursor);
  };

  const original_handler = SKK.prototype.handleKeyEvent.bind(inner_skk);
  inner_skk.handleKeyEvent = function (keyevent) {
    if (original_handler(keyevent)) return true;

    let isDelete = false;
    switch ((keyevent.ctrlKey ? 'Ctrl+' : '') + keyevent.key) {
      case 'Left':
      case 'ArrowLeft':
      case 'Ctrl+b':
        if (inner_skk.commit_cursor > 0) {
          inner_skk.commit_cursor--;
        }
        break;

      case 'Delete':
      case 'Ctrl+d':
        isDelete = true;
      // fall through
      case 'Right':
      case 'ArrowRight':
      case 'Ctrl+f':
        if (inner_skk.commit_cursor < [...inner_skk.commit_text].length) {
          inner_skk.commit_cursor++;
        } else if (isDelete) break;
        if (!isDelete) break;

      case 'Backspace':
        if (inner_skk.commit_text == '') {
          outer_skk.finishInner(false);
        } else if (inner_skk.commit_cursor > 0) {
          inner_skk.commit_text =
            [...inner_skk.commit_text]
              .slice(0, inner_skk.commit_cursor - 1)
              .join('') +
            [...inner_skk.commit_text].slice(inner_skk.commit_cursor).join('');
          inner_skk.commit_cursor--;
        }
        break;

      case 'Enter':
        outer_skk.finishInner(true);
        break;

      case 'Esc':
      case 'Escape':
      case 'Ctrl+g':
        outer_skk.finishInner(false);
        break;

      case 'Ctrl+y':
        const readClipboardResponseHandler = (request) => {
          if (request.method === 'read_clipboard_response') {
            chrome.runtime.onMessage.removeListener(
              readClipboardResponseHandler,
            );
            const response = request.body;
            inner_skk.commitText(response.content);
            // Need to trigger an update since this code runs asynchronously
            inner_skk.updateComposition();
          }
        };
        chrome.runtime.onMessage.addListener(readClipboardResponseHandler);

        const setupOffscreenDocument = async (path) => {
          const url = chrome.runtime.getURL(path);
          const ctx = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [url],
          });
          if (ctx.length > 0) return; // already have one
          if (this.createOffscreen) {
            await this.createOffscreen;
          } else {
            this.createOffscreen = chrome.offscreen.createDocument({
              url: path,
              reasons: ['CLIPBOARD'],
              justification: 'Ctrl-y to paste in conversion',
            });
            await this.createOffscreen;
            this.createOffscreen = null;
          }
        };
        const paste = async () => {
          await setupOffscreenDocument('offscreen.html');
          chrome.runtime.sendMessage({
            target: 'offscreen',
            method: 'read_clipboard',
          });
        };
        paste();
        break;

      case 'Ctrl+Y':
        inner_skk.commit_text = '';
        inner_skk.commit_cursor = 0;
        this.googleIndex++;
        (async () => {
          if (!this.googleEntries?.length) {
            this.googleIndex = 0;
            try {
              const query = encodeURIComponent(
                outer_skk.preedit + outer_skk.okuriText,
              );
              const response = await fetch(
                `https://inputtools.google.com/request?itc=ja-t-ja-hira-i0-und&num=19&text=${query}`,
              );
              if (!response.ok) return;
              const json = await response.json();
              if (json?.[0] != 'SUCCESS') return;
              this.googleEntries = json[1]?.[0]?.[1];
            } catch (e) {
              console.error('Google Input Tools', e);
              return;
            }
          }
          const googleLength = this.googleEntries?.length;
          if (!googleLength) return;
          if (this.googleIndex >= googleLength) this.googleIndex = 0;
          const entry = this.googleEntries[this.googleIndex];
          const text =
            outer_skk.okuriText && entry.endsWith(outer_skk.okuriText)
              ? entry.slice(0, -outer_skk.okuriText.length)
              : entry;
          inner_skk.commitText(text);
          inner_skk.updateComposition();
        })();
    }

    return true;
  };

  outer_skk.inner_skk = inner_skk;
};

SKK.prototype.recordNewResult = function (entry) {
  if (this.private) return;
  this.dictionary.recordNewResult(
    this.preedit.replace(/[0-9]+/g, '#') + this.okuriPrefix,
    entry,
  );
};

SKK.prototype.finishInner = function (successfully) {
  if (successfully && this.inner_skk.commit_text.length > 0) {
    const new_word = this.inner_skk.commit_text;
    this.recordNewResult({ word: new_word });

    const numbers = this.preedit.match(/[0-9]+/g) || [];
    this.commitText(
      this.dictionary.numberFormat(new_word, numbers) + this.okuriText,
    );
  }

  this.inner_skk = null;
  this.roman = '';

  if (successfully) {
    this.entries = null;
    this.preedit = '';
    this.okuriText = '';
    this.okuriPrefix = '';
    this.switchMode(this.previousKana);
  } else {
    if (this.previousMode != 'conversion') {
      this.entries = null;
    }
    if (this.previousMode == 'okuri-preedit') {
      this.preedit += this.okuriText;
      this.previousMode = 'preedit';
    }
    this.preedit += this.hint ? ';' + this.hint : '';
    this.hint = '';
    this.okuriText = '';
    this.okuriPrefix = '';
    this.switchMode(this.previousMode);
  }
};

SKK.prototype.showStatus = async function () {
  if (this.inner_skk) {
    this.inner_skk.showStatus();
    return;
  }

  try {
    const isSet =
      (await chrome.input.ime.setCandidates({
        contextID: this.context,
        candidates: [
          {
            id: 0,
            label: this.private ? 'private' : 'SKK',
            candidate: this.currentMode,
          },
        ],
      })) &&
      (await chrome.input.ime.setCandidateWindowProperties({
        engineID: this.engineID,
        properties: {
          visible: true,
          cursorVisible: true,
          vertical: true,
          pageSize: 1,
          auxiliaryTextVisible: false,
        },
      })) &&
      (await chrome.input.ime.setCursorPosition({
        contextID: this.context,
        candidateID: 0,
      }));

    if (isSet) {
      clearTimeout(this.timeout);
      this.timeout = setTimeout(async () => {
        this.timeout = null;
        if (this.entries) return;
        try {
          await chrome.input.ime.setCandidateWindowProperties({
            engineID: this.engineID,
            properties: { visible: false },
          });
        } catch (e) {
          console.log(e);
        }
      }, STATUS_DURATION);
    }
  } catch (e) {
    console.log(e);
  }
};
