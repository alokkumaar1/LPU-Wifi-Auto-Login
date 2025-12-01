
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("goBack").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("popup.html");
  });

  document.getElementById("saveBtn").addEventListener("click", () => {
    const name = document.getElementById("accountName").value.trim();
    const username = document.getElementById("userName").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!name || !username || !password) {
      alert("Please fill all fields.");
      return;
    }

    chrome.storage.sync.get(["accounts"], data => {
      const accounts = data.accounts || [];
      const existingIndex = accounts.findIndex(a => a.username === username);

      if (existingIndex >= 0) {
        accounts[existingIndex] = { name, username, password };
      } else {
        accounts.push({ name, username, password });
      }

      chrome.storage.sync.set({ accounts }, () => {
        alert("Account saved!");
        window.location.href = chrome.runtime.getURL("popup.html");
      });
    });
  });
});
