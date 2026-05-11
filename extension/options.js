const compressions = [
  ['gzip', 'gz'],
  ['none', ''],
];
const encodings = [
  ['EUC-JP', 'euc-jp'],
  ['UTF-8', 'utf-8'],
];

const buildSelect = (selectElement, options) => {
  for (const o of options) {
    const option = document.createElement('option');
    option.textContent = o[0];
    option.value = o[1];
    selectElement.appendChild(option);
  }
};

const onload = () => {
  const form = document.getElementById('system_dictionary');
  chrome.storage.sync.get('options', (data) => {
    console.dir({ status: 'loaded saved options', data: data });
    if (data.options?.system_dictionary) {
      for (key of ['url', 'compression', 'encoding']) {
        form[key].value = data.options.system_dictionary[key];
      }
    }
  });
  const url_input = form.url;
  const compression_input = form.compression;
  buildSelect(compression_input, compressions);
  const encoding_input = form.encoding;
  buildSelect(encoding_input, encodings);

  const reload_button = document.getElementById('reload_button');

  document.getElementById('reload_button').onclick = () => {
    const options = {
      system_dictionary: {
        url: url_input.value,
        compression: compression_input.value,
        encoding: encoding_input.value,
      },
    };
    // chrome storage API does not emit an event when the value is unchanged
    // Check the currently stored value to make sure the button is not disabled forever
    const isEqual = (obj1, obj2) => {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      return (
        keys1.length == keys2.length &&
        keys1.every((key) => obj1[key] === obj2[key])
      );
    };
    chrome.storage.sync.get('options', (data) => {
      if (
        data.options &&
        isEqual(data.options.system_dictionary, options.system_dictionary)
      ) {
        console.log(
          'The system dictionary parameters are unchanged. Do nothing.',
        );
        return;
      }
      chrome.storage.sync.set({ options });
      form.disabled = 'disabled';
      reload_button.disabled = 'disabled';
    });
  };
};

// request is supposed to be in {method, body} format.
const onReceive = (request) => {
  switch (request.method) {
    case 'update_dictionary_load_status':
      const body = request.body;
      const div = document.getElementById('reloading_message');
      div.innerHTML = '';
      if (body.status == 'written') {
        div.style.display = 'none';
        document.getElementById('system_dictionary').disabled = '';
        document.getElementById('reload_button').disabled = '';
        return;
      }
      div.style.display = 'block';
      div.appendChild(document.createTextNode(body.status));
      if (body.status == 'parsing') {
        div.appendChild(
          document.createTextNode(`: ${body.progress}/${body.total}`),
        );
      }
      return;

    default:
      console.log('Unexpected request: ' + request.method);
  }
};

window.addEventListener('load', onload);
chrome.runtime.onMessage.addListener(onReceive);
