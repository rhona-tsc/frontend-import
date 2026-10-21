const origin = 'https://api.addressnow.co.uk';
const key = 'uu93-fd14-xw69-bu42';

// One shared download, even when the homepage form and popup are both open.
export function createAddressNowLoader({ document, window, timeoutMs = 15000 }) {
  let pending;
  return function load() {
    if (pending) return pending;
    pending = new Promise((resolve, reject) => {
      let timer;
      let finished = false;
      let cssReady = false;
      const started = Date.now();
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = `${origin}/css/addressnow-2.30.min.css?key=${key}`;
      stylesheet.dataset.addressLookup = 'stylesheet';
      const script = document.createElement('script');
      script.async = true;
      script.src = `${origin}/js/addressnow-2.30.min.js?key=${key}`;
      script.dataset.addressLookup = 'script';

      const fail = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        stylesheet.remove();
        script.remove();
        reject(new Error('Address suggestions are unavailable. Enter a full UK postcode instead.'));
      };
      const check = () => {
        if (finished) return;
        if (cssReady && typeof window.pca?.Address === 'function' && window.pca?.fieldMode) {
          finished = true;
          clearTimeout(timer);
          resolve(window.pca);
        } else if (Date.now() - started >= timeoutMs) {
          fail();
        } else {
          timer = setTimeout(check, 50);
        }
      };
      stylesheet.onload = () => { cssReady = true; };
      stylesheet.onerror = fail;
      script.onerror = fail;
      document.head.appendChild(stylesheet);
      if (typeof window.pca?.Address !== 'function' || !window.pca?.fieldMode) {
        document.head.appendChild(script);
      }
      check();
    }).catch(error => {
      pending = undefined; // A later open/focus can retry after a network failure.
      throw error;
    });
    return pending;
  };
}

let load;
export function loadAddressNow() {
  load ||= createAddressNowLoader({ document: window.document, window });
  return load();
}
