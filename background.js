const LPU_LOGIN_URL = "http://10.10.0.1/24online/webpages/client.jsp";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("bg:onMessage", message);
  if (!message || message.action !== "CONNECT" || !message.account) {
    console.warn("Ignored message", message);
    return;
  }
  handleConnect(message.account);
});

function handleConnect(account) {
  chrome.tabs.query({}, tabs => {
    if (chrome.runtime.lastError) {
      console.error("tabs.query error:", chrome.runtime.lastError);
      return;
    }

    const portalTab = (tabs || []).find(t => {
      try { return t.url && t.url.includes("10.10.0.1"); } catch (e) { return false; }
    });

    if (portalTab) {
      chrome.tabs.update(portalTab.id, { active: true, url: LPU_LOGIN_URL }, tabCallback);
    } else {
      chrome.tabs.create({ url: LPU_LOGIN_URL, active: true }, tabCallback);
    }

    function tabCallback(tab) {
      if (chrome.runtime.lastError) {
        console.error("tabs.update/create error:", chrome.runtime.lastError);
        return;
      }
      if (!tab || !tab.id) {
        console.error("No tab returned from create/update", tab);
        return;
      }
      waitAndRun(tab.id, account);
    }
  });
}

function waitAndRun(tabId, account) {
  const MAX_ATTEMPTS = 30;
  const INTERVAL_MS = 1000;
  let attempts = 0;

  const intervalId = setInterval(() => {
    attempts++;
    chrome.tabs.get(tabId, tab => {
      if (chrome.runtime.lastError) {
        console.error("tabs.get error:", chrome.runtime.lastError);
        clearInterval(intervalId);
        return;
      }
      if (!tab) {
        clearInterval(intervalId);
        return;
      }
      if (tab.status === "complete") {
        console.log("Tab complete, injecting into", tabId, tab.url);
        chrome.scripting.executeScript(
          {
            target: { tabId },
            func: injectedAutoLogin,
            args: [account.username, account.password]
          },
          (results) => {
            if (chrome.runtime.lastError) {
              console.error("scripting.executeScript error:", chrome.runtime.lastError);
            } else {
              console.log("injection result:", results);
            }
          }
        );
        clearInterval(intervalId);
      }
    });

    if (attempts >= MAX_ATTEMPTS) {
      console.warn("waitAndRun timed out for tab", tabId);
      clearInterval(intervalId);
    }
  }, INTERVAL_MS);
}

// Runs inside the LPU page
function injectedAutoLogin(username, password) {
  // ...existing code...
  console.log("Injected auto-login running on", location.href);

  function tryFillAndLogin() {
    const userField =
      document.querySelector('input[name="username"]') ||
      document.querySelector('input[id="username"]') ||
      document.querySelector('input[name*="User"]') ||
      document.querySelector('input[id*="User"]') ||
      document.querySelector('input[type="text"]');

    const passField =
      document.querySelector('input[name="password"]') ||
      document.querySelector('input[id="password"]') ||
      document.querySelector('input[name*="Pass"]') ||
      document.querySelector('input[id*="Pass"]') ||
      document.querySelector('input[type="password"]');

    const tncCheckbox =
      document.querySelector('input[type="checkbox"]') ||
      document.querySelector('input[name*="Agree"], input[id*="Agree"]');

    const loginBtn =
      document.querySelector('input[type="submit"]') ||
      document.querySelector('input[value*="Login"]') ||
      document.querySelector('button[type="submit"]') ||
      document.querySelector('button[id*="login" i]') ||
      document.querySelector('button[name*="login" i]') ||
      document.querySelector('button');

    if (!userField || !passField) {
      return false;
    }

    userField.focus();
    userField.value = username;
    passField.focus();
    passField.value = password;

    if (tncCheckbox && !tncCheckbox.checked) tncCheckbox.click();
    if (loginBtn) setTimeout(() => loginBtn.click(), 300);
    return true;
  }

  function clickConnectIfLogoutPage() {
    const href = location.href || "";
    if (!href.includes("logout")) return false;
    const connectBtn = Array.from(
      document.querySelectorAll('button, input[type="button"], input[type="submit"]')
    ).find(el => {
      const txt = (el.innerText || el.value || "").toLowerCase();
      return txt.includes("connect");
    });
    if (connectBtn) { connectBtn.click(); return true; }
    return false;
  }

  if (clickConnectIfLogoutPage()) {
    let attempts = 0;
    const intId = setInterval(() => {
      attempts++;
      if (tryFillAndLogin() || attempts > 25) clearInterval(intId);
    }, 1000);
  } else {
    tryFillAndLogin();
  }
}
// ...existing code...
