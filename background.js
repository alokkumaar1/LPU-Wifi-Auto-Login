
const LPU_LOGIN_URL = "https://10.10.0.1/24online/webpages/client.jsp";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "CONNECT" && message.account) {
    handleConnect(message.account);
  }
});

function handleConnect(account) {
  chrome.tabs.query({ url: "https://10.10.0.1/*" }, tabs => {
    if (tabs && tabs.length > 0) {
      const tab = tabs[0];
      chrome.tabs.update(tab.id, { active: true, url: LPU_LOGIN_URL }, () => {
        waitAndRun(tab.id, account);
      });
    } else {
      chrome.tabs.create({ url: LPU_LOGIN_URL, active: true }, tab => {
        waitAndRun(tab.id, account);
      });
    }
  });
}

function waitAndRun(tabId, account) {
  const MAX_ATTEMPTS = 30; // ~30 seconds
  const INTERVAL_MS = 1000;
  let attempts = 0;

  const intervalId = setInterval(() => {
    attempts++;
    chrome.tabs.get(tabId, tab => {
      if (!tab) {
        clearInterval(intervalId);
        return;
      }
      if (tab.status === "complete") {
        chrome.scripting.executeScript(
          {
            target: { tabId },
            func: injectedAutoLogin,
            args: [account.username, account.password]
          },
          () => {}
        );
        clearInterval(intervalId);
      }
    });

    if (attempts >= MAX_ATTEMPTS) {
      clearInterval(intervalId);
    }
  }, INTERVAL_MS);
}

// Runs inside the LPU page
function injectedAutoLogin(username, password) {
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

    console.log("tryFillAndLogin found:", { userField, passField, tncCheckbox, loginBtn });

    if (!userField || !passField) {
      return false;
    }

    userField.focus();
    userField.value = username;

    passField.focus();
    passField.value = password;

    if (tncCheckbox && !tncCheckbox.checked) {
      tncCheckbox.click();
    }

    if (loginBtn) {
      setTimeout(() => loginBtn.click(), 300);
    }

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

    if (connectBtn) {
      console.log("On logout/connect page, clicking Connect button");
      connectBtn.click();
      return true;
    }
    return false;
  }

  if (clickConnectIfLogoutPage()) {
    let attempts = 0;
    const maxAttempts = 25;
    const intId = setInterval(() => {
      attempts++;
      if (tryFillAndLogin()) {
        clearInterval(intId);
      }
      if (attempts >= maxAttempts) {
        clearInterval(intId);
      }
    }, 1000);
  } else {
    tryFillAndLogin();
  }
}
