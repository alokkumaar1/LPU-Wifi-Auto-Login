
function loadAccounts() {
  const select = document.getElementById("accountSelect");
  chrome.storage.sync.get(["accounts"], data => {
    const accounts = data.accounts || [];
    select.innerHTML = "";

    if (accounts.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No accounts saved yet";
      select.appendChild(opt);
      return;
    }

    accounts.forEach((acc, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = acc.name + " (" + acc.username + ")";
      select.appendChild(opt);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadAccounts();

  document.getElementById("gotoAdd").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("add.html");
  });

  document.getElementById("connectBtn").addEventListener("click", () => {
    chrome.storage.sync.get(["accounts"], data => {
      const accounts = data.accounts || [];
      const select = document.getElementById("accountSelect");
      const idx = select.value;

      if (idx === "" || !accounts[idx]) {
        alert("Please select a saved account first.");
        return;
      }

      chrome.runtime.sendMessage({
        action: "CONNECT",
        account: accounts[idx]
      });
    });
  });
});
