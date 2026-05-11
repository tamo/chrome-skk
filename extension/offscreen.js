// request is supposed to be in {method, body} format.
const onReceive = (request) => {
  switch (request.method) {
    case 'read_clipboard':
      (async () => {
        //const text = await navigator.clipboard.readText();
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('paste');
        const text = success ? textarea.value : '';
        document.body.removeChild(textarea);

        chrome.runtime.sendMessage({
          method: 'read_clipboard_response',
          body: { content: text },
        });
      })();
      return true;

    default:
      console.log('Unexpected request: ' + request.method);
  }
};
chrome.runtime.onMessage.addListener(onReceive);
