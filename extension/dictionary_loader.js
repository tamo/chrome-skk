function Dictionary() {
  this.userDict = {};
  this.systemDict = {};
  this.systemDictParam = {};
  const self = this;
  chrome.storage.sync.get('options', (data) => {
    console.dir({ status: 'loaded saved options', data: data });
    const param = data.options?.system_dictionary;
    if (param) {
      self.systemDictParam = param;
    }
  });
  chrome.storage.onChanged.addListener((changes) => {
    const param = changes.options?.newValue?.system_dictionary;
    if (param) {
      self.systemDictParam = param;
      self.reloadSystemDictionary();
    }
  });
  this.initSystemDictionary();
  this.initUserDictionary();
}

(() => {
  Dictionary.prototype.parseData = function (data) {
    // Not serious impl -- just check 'concat' function.
    const inConcat = /^\(concat (.*)\)$/;
    const inQuote = /"([^"\\]|\\.)*"/g;
    const octal = /\\([0-7]{3})/g;
    const octalChar = (oct) => String.fromCharCode(parseInt(oct, 8));
    const evalSexp = (word) =>
      word
        .match(inConcat)?.[1]
        ?.match(inQuote)
        ?.map((s) => s.replace(octal, (_, o) => octalChar(o)))
        ?.join('') ?? word;

    const parseEntry = (entry) => {
      const semicolon = entry.indexOf(';');
      if (semicolon < 0) return { word: evalSexp(entry) };
      return {
        word: evalSexp(entry.slice(0, semicolon)),
        annotation: evalSexp(entry.slice(semicolon + 1)),
      };
    };

    const result = {};
    const lines = data.split('\n');
    for (const [i, line] of lines.entries()) {
      if (line[0] == ';') continue;
      const space_pos = line.indexOf(' ');
      if (space_pos < 0) continue; // XXX: better abort?
      const reading = line.slice(0, space_pos);
      const entries = line
        .slice(space_pos + 1)
        .split('/')
        .filter((e) => e.length > 0)
        .map((e) => parseEntry(e));
      if (i % 1000 == 0) {
        this.log({ status: 'parsing', progress: i, total: lines.length });
      }
      result[reading] = entries;
    }
    return result;
  };

  Dictionary.prototype.log = function (obj) {
    chrome.runtime.sendMessage(
      {
        method: 'update_dictionary_load_status',
        body: obj,
      },
      function () {
        if (chrome.runtime.lastError) {
          console.log('dictionary logger', chrome.runtime.lastError.message);
        }
      },
    );
  };

  Dictionary.prototype.doUpdate = async function () {
    if (!this.systemDictParam.url) return;
    const self = this;
    const url = this.systemDictParam.url;
    const compression = this.systemDictParam.compression;
    const encoding = this.systemDictParam.encoding;
    self.log({ status: 'loading', url, compression, encoding });
    const response = await fetch(url);
    self.log({ status: 'loaded' });
    if (!response.ok) {
      self.log({ status: 'error', statusCode: response.status });
      throw new Error(
        `Failed to load ${url}: [${response.statusCode}] ${response.statusText}`,
      );
    }
    const binary = await response.arrayBuffer();
    const is_gz = compression == 'gz';
    if (is_gz) self.log({ status: 'decompressing' });
    const decompressed = is_gz ? pako.inflate(binary) : binary;
    const content = new TextDecoder(encoding).decode(decompressed);
    const systemDict = self.parseData(content);
    self.systemDict = systemDict;
    self.log({ status: 'parsed' });
    await chrome.storage.local.set({ systemDict });
    self.log({ status: 'written' });
  };

  Dictionary.prototype.reloadSystemDictionary = async function () {
    await this.doUpdate();
  };

  Dictionary.prototype.syncUserDictionary = function () {
    const userDict = this.userDict;
    chrome.storage.local.set({ userDict });
  };

  Dictionary.prototype.initSystemDictionary = function () {
    const self = this;
    chrome.storage.local.get('systemDict', (data) => {
      if (data.systemDict) {
        self.log({
          status: 'loaded_system_dict_from_storage',
          dict_size: Object.keys(data.systemDict).length,
        });
        self.systemDict = data.systemDict;
      } else {
        self.doUpdate();
      }
    });
  };

  Dictionary.prototype.initUserDictionary = function () {
    const self = this;
    chrome.storage.local.get('userDict', (data) => {
      if (!data.userDict) return;
      self.log({
        status: 'loaded_user_dict_from_storage',
        dict_size: Object.keys(data.userDict).length,
      });
      self.userDict = data.userDict;
    });
  };

  const zensuu = (d) => String.fromCharCode(d.charCodeAt(0) + 65248);
  const kansuu = (d) =>
    ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'][d];
  const grouping = new Intl.NumberFormat('ja-JP');
  Dictionary.prototype.numberFormat = function (rawWord, numbers) {
    let r = 0;
    const word = rawWord.replace(/#[0-8]/g, (n) => {
      const rawNumber = numbers[r++];
      switch (n) {
        case '#1':
          return rawNumber.split('').map(zensuu).join('');
        case '#2':
          return rawNumber.split('').map(kansuu).join('');
        case '#8':
          return grouping.format(rawNumber);
        default:
          return rawNumber; // XXX
      }
    });
    return word;
  };

  Dictionary.prototype.lookup = function (reading) {
    const numbers = [];
    const maskedReading = reading.replace(/[0-9]+/g, (match) => {
      numbers.push(match);
      return '#';
    });
    const userEntries = this.userDict[maskedReading] || [];
    const systemEntries = this.systemDict[maskedReading] || [];
    const word_set = {};
    const entries = [...userEntries, ...systemEntries].filter((entry) => {
      const rawWord = entry.word;
      const word = this.numberFormat(rawWord, numbers);
      const is_new = !word_set[word];
      word_set[word] = true;
      return is_new;
    });

    if (entries.size == 0) return null;
    return { reading: maskedReading, data: entries };
  };

  Dictionary.prototype.recordNewResult = function (reading, newEntry) {
    const userEntries = this.userDict[reading] || [];
    this.userDict[reading] = [
      newEntry,
      ...userEntries.filter((e) => e.word != newEntry.word),
    ];

    this.syncUserDictionary();
  };

  Dictionary.prototype.removeUserEntry = function (reading, word) {
    const userEntries = this.userDict[reading] || [];
    const oldLength = userEntries.length;
    if (oldLength == 0) return;
    const newEntries = userEntries.filter((e) => e.word != word);
    switch (newEntries.length) {
      case oldLength:
        return; // unchanged
      case 0:
        delete this.userDict[reading];
        break;
      default:
        this.userDict[reading] = newEntries;
    }
    this.syncUserDictionary();
  };

  const complete = (dict, reading) => {
    if (!reading || reading.length == 0) return [];
    const numbers = [];
    const maskedReading = reading.replace(/[0-9]+/g, (match) => {
      numbers.push(match);
      return '#';
    });
    return Object.keys(dict)
      .filter((key) => key.startsWith(maskedReading))
      .map((key) => {
        let r = 0;
        return key
          .replace(/[a-z]*$/, '')
          .replace(/#/g, () => numbers[r++] || '#');
      });
  };

  Dictionary.prototype.userComplete = function (reading) {
    return complete(this.userDict, reading);
  };

  Dictionary.prototype.systemComplete = function (reading) {
    return complete(this.systemDict, reading);
  };
})();
