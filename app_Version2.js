(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const windowLayer = $("#windowLayer");
  const taskbarApps = $("#taskbarApps");
  const launcher = $("#launcher");
  const appSearch = $("#appSearch");
  const notificationPanel = $("#notificationPanel");
  const powerMenu = $("#powerMenu");
  const loginScreen = $("#loginScreen");
  const toast = $("#toast");

  const apps = {
    explorer: {
      title: "POM-2 // FILE_MANAGER.EXE",
      icon: "▰",
      src: "./apps/file-explorer.html",
      kind: "mockup"
    },
    settings: {
      title: "ZHAALTHUR // SETTINGS",
      icon: "⚙",
      src: "./apps/settings.html",
      kind: "mockup"
    },
    "task-manager": {
      title: "TASK MANAGER",
      icon: "▥",
      kind: "builtin"
    }
  };

  const windows = new Map();
  let activeId = null;
  let zIndex = 5;
  let toastTimer;

  function notify(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2300);
  }

  function clockText() {
    return new Intl.DateTimeFormat([], {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());
  }

  function updateClock() {
    const time = clockText();
    $("#clock").textContent = time;
    $("#taskbarClock").textContent = time;
  }

  updateClock();
  setInterval(updateClock, 1000);

  function taskManagerMarkup() {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
body{margin:0;padding:22px;color:#d9dedb;background:#10171d;font:12px "Segoe UI",Arial,sans-serif}
h1{margin:0 0 7px;font-size:23px;font-weight:400}
p{margin:0 0 20px;color:#929ca0;font-size:10px}
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}
.metric{padding:14px;border:1px solid #36443f;background:#151e22}
.metric span{display:block;color:#9daaa0;font-size:9px}
.metric strong{display:block;margin-top:8px;color:#73d8cb;font:18px "Courier New",monospace}
table{width:100%;border-collapse:collapse;font-size:10px}
th,td{padding:10px;text-align:left;border-bottom:1px solid #29342f}
th{color:#d2a85e;font:9px "Courier New",monospace}
button{padding:6px 9px;border:1px solid #594d39;color:#e4c78d;background:#24251f;cursor:pointer}
button:hover{background:#363226}
.status{color:#78c785}
@media(max-width:500px){.metrics{grid-template-columns:1fr}td:nth-child(3),th:nth-child(3){display:none}}
</style>
</head>
<body>
<h1>Task Manager</h1>
<p>PROCESS MONITOR · BROWSER PREVIEW DATA</p>
<div class="metrics">
  <div class="metric"><span>CPU</span><strong id="cpu">24%</strong></div>
  <div class="metric"><span>MEMORY</span><strong id="memory">5.8 GB</strong></div>
  <div class="metric"><span>PROCESSES</span><strong id="count">4</strong></div>
</div>
<table>
<thead><tr><th>PROCESS</th><th>STATUS</th><th>CPU</th><th>ACTION</th></tr></thead>
<tbody id="processes">
<tr><td>Zhaalthur Shell</td><td class="status">Running</td><td>4.2%</td><td>—</td></tr>
<tr><td>File Explorer</td><td class="status">Running</td><td>1.8%</td><td><button>End task</button></td></tr>
<tr><td>System Settings</td><td class="status">Running</td><td>0.9%</td><td><button>End task</button></td></tr>
<tr><td>Desktop Renderer</td><td class="status">Running</td><td>3.1%</td><td><button>End task</button></td></tr>
</tbody>
</table>
<script>
document.querySelector("#processes").addEventListener("click",event=>{
  if(!event.target.matches("button"))return;
  event.target.closest("tr").remove();
  document.querySelector("#count").textContent=document.querySelectorAll("#processes tr").length;
});
setInterval(()=>{
  document.querySelector("#cpu").textContent=(18+Math.floor(Math.random()*22))+"%";
  document.querySelector("#memory").textContent=(5.2+Math.random()*1.4).toFixed(1)+" GB";
},1800);
<\/script>
</body>
</html>`;
  }

  function setActive(id) {
    activeId = id;
    for (const [windowId, item] of windows) {
      item.element.classList.toggle("focused", windowId === id);
      item.taskButton.classList.toggle("active", windowId === id);
    }
    const app = apps[id];
    $("#activeAppName").textContent = app ? app.title : "DESKTOP";
  }

  function focusWindow(id) {
    const item = windows.get(id);
    if (!item) return;
    if (item.minimized) {
      item.element.hidden = false;
      item.minimized = false;
    }
    item.element.style.zIndex = String(++zIndex);
    setActive(id);
  }

  function closeWindow(id) {
    const item = windows.get(id);
    if (!item) return;
    item.element.remove();
    item.taskButton.remove();
    windows.delete(id);
    setActive([...windows.keys()].at(-1) || null);
  }

  function minimizeWindow(id) {
    const item = windows.get(id);
    if (!item) return;
    item.element.hidden = true;
    item.minimized = true;
    item.taskButton.classList.remove("active");
    setActive(null);
  }

  function maximizeWindow(id) {
    const item = windows.get(id);
    if (!item) return;
    item.maximized = !item.maximized;
    item.element.classList.toggle("maximized", item.maximized);

    if (item.maximized) {
      item.element.dataset.previousStyle =
        `${item.element.style.left}|${item.element.style.top}|${item.element.style.width}|${item.element.style.height}`;
      item.element.style.left = "0";
      item.element.style.top = "0";
      item.element.style.width = "100%";
      item.element.style.height = "100%";
    } else {
      const [left, top, width, height] =
        (item.element.dataset.previousStyle || "25px|25px|1050px|690px").split("|");
      item.element.style.left = left;
      item.element.style.top = top;
      item.element.style.width = width;
      item.element.style.height = height;
    }
  }

  function adaptMockupFrame(iframe, id) {
    iframe.addEventListener("load", () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;

        const style = doc.createElement("style");

        if (id === "settings") {
          style.textContent = `
            html,body{width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;overflow:auto!important}
            .titlebar{display:none!important}
            .settings-window{height:100%!important;min-height:0!important}
            .layout{min-height:0!important}
            .sidebar{padding-top:22px!important}
            .room{height:100%!important;min-height:0!important;padding:0!important}
          `;
        } else if (id === "explorer") {
          style.textContent = `
            html,body{width:100%!important;height:100%!important;min-width:0!important;min-height:0!important}
            .desktop{height:100%!important;padding:0!important}
            .explorer{width:100%!important;height:100%!important;min-height:0!important;max-width:none!important;border:0!important;box-shadow:none!important}
            .explorer>.titlebar{display:none!important}
            .explorer.maximized{position:relative!important;inset:auto!important}
          `;
        }

        doc.head.appendChild(style);

        // Route the mockup's titlebar runes to the containing browser window.
        const minimize = doc.getElementById("minimizeButton");
        const close = doc.getElementById("closeButton");
        const maximize = doc.getElementById("maximizeButton");

        if (minimize) {
          minimize.addEventListener("click", event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            minimizeWindow(id);
          }, true);
        }
        if (close) {
          close.addEventListener("click", event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            closeWindow(id);
          }, true);
        }
        if (maximize) {
          maximize.addEventListener("click", event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            maximizeWindow(id);
          }, true);
        }
      } catch (error) {
        console.info("Mockup framing skipped:", error);
      }
    });
  }

  function makeDraggable(element, handle) {
    let startX, startY, originalX, originalY;

    handle.addEventListener("pointerdown", event => {
      if (event.target.closest("button")) return;
      const item = windows.get(element.dataset.appId);
      if (item?.maximized) return;

      startX = event.clientX;
      startY = event.clientY;
      originalX = element.offsetLeft;
      originalY = element.offsetTop;
      handle.setPointerCapture(event.pointerId);

      const move = moveEvent => {
        element.style.left = `${Math.max(0, originalX + moveEvent.clientX - startX)}px`;
        element.style.top = `${Math.max(0, originalY + moveEvent.clientY - startY)}px`;
      };
      const stop = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", stop);
        handle.removeEventListener("pointercancel", stop);
      };

      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", stop);
      handle.addEventListener("pointercancel", stop);
    });
  }

  function openApp(id) {
    const app = apps[id];
    if (!app) return;

    launcher.hidden = true;
    notificationPanel.hidden = true;
    powerMenu.hidden = true;

    if (windows.has(id)) {
      focusWindow(id);
      return;
    }

    const element = document.createElement("section");
    element.className = "app-window focused";
    element.dataset.appId = id;
    element.style.zIndex = String(++zIndex);

    const titlebar = document.createElement("header");
    titlebar.className = "app-titlebar";
    titlebar.innerHTML = `
      <span class="app-title">${app.title}</span>
      <span class="app-controls">
        <button class="app-control" data-action="minimize" aria-label="Minimize">ᛁ</button>
        <button class="app-control" data-action="maximize" aria-label="Maximize">ᛜ</button>
        <button class="app-control close" data-action="close" aria-label="Close">ᚦ</button>
      </span>
    `;

    const content = document.createElement("div");
    content.className = "app-content";

    if (app.kind === "builtin") {
      const iframe = document.createElement("iframe");
      iframe.title = app.title;
      iframe.srcdoc = taskManagerMarkup();
      content.appendChild(iframe);
    } else {
      const iframe = document.createElement("iframe");
      iframe.title = app.title;
      iframe.src = app.src;
      iframe.loading = "eager";
      iframe.referrerPolicy = "no-referrer";
      adaptMockupFrame(iframe, id);
      content.appendChild(iframe);
    }

    element.append(titlebar, content);
    windowLayer.appendChild(element);

    const taskButton = document.createElement("button");
    taskButton.className = "taskbar-app active";
    taskButton.type = "button";
    taskButton.textContent = `${app.icon} ${app.title}`;
    taskbarApps.appendChild(taskButton);

    const item = { element, taskButton, minimized: false, maximized: false };
    windows.set(id, item);

    titlebar.addEventListener("click", event => event.stopPropagation());
    titlebar.addEventListener("dblclick", event => {
      if (!event.target.closest("button")) maximizeWindow(id);
    });

    titlebar.addEventListener("click", event => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "close") closeWindow(id);
      if (action === "minimize") minimizeWindow(id);
      if (action === "maximize") maximizeWindow(id);
    });

    taskButton.addEventListener("click", () => {
      const current = windows.get(id);
      if (current?.minimized) focusWindow(id);
      else if (activeId === id) minimizeWindow(id);
      else focusWindow(id);
    });

    element.addEventListener("pointerdown", () => focusWindow(id));
    makeDraggable(element, titlebar);
    setActive(id);
  }

  // Launch apps from desktop icons or launcher entries.
  $$("[data-app]").forEach(button => {
    button.addEventListener("click", () => openApp(button.dataset.app));
    button.addEventListener("dblclick", () => openApp(button.dataset.app));
  });

  $("#launcherButton").addEventListener("click", () => {
    launcher.hidden = !launcher.hidden;
    notificationPanel.hidden = true;
    if (!launcher.hidden) appSearch.focus();
  });
  $("#taskbarLauncher").addEventListener("click", () => {
    launcher.hidden = !launcher.hidden;
    notificationPanel.hidden = true;
    if (!launcher.hidden) appSearch.focus();
  });
  $("#closeLauncher").addEventListener("click", () => launcher.hidden = true);

  appSearch.addEventListener("input", () => {
    const query = appSearch.value.trim().toLowerCase();
    $$(".app-entry", launcher).forEach(entry => {
      entry.hidden = !entry.textContent.toLowerCase().includes(query);
    });
  });

  $("#notificationButton").addEventListener("click", () => {
    notificationPanel.hidden = !notificationPanel.hidden;
    launcher.hidden = true;
  });
  $("#closeNotifications").addEventListener("click", () => notificationPanel.hidden = true);
  $("#clearNotifications").addEventListener("click", () => {
    $$(".notification-item", notificationPanel).forEach(item => item.remove());
    notify("Notifications dismissed");
  });

  $("#powerButton").addEventListener("click", () => {
    powerMenu.hidden = !powerMenu.hidden;
    launcher.hidden = true;
    notificationPanel.hidden = true;
  });
  $("#closePowerMenu").addEventListener("click", () => powerMenu.hidden = true);

  $$("[data-power]", powerMenu).forEach(button => {
    button.addEventListener("click", () => {
      const action = button.dataset.power;
      powerMenu.hidden = true;

      if (action === "Lock") {
        loginScreen.hidden = false;
        return;
      }
      if (action === "Restart") {
        notify("Restarting browser preview...");
        setTimeout(() => location.reload(), 1200);
        return;
      }
      if (action === "Shut down") {
        notify("Preview shut down. Reload the page to start again.");
        return;
      }
      notify("Sleep mode is simulated in this preview");
    });
  });

  $("#lockButton").addEventListener("click", () => {
    launcher.hidden = true;
    loginScreen.hidden = false;
  });

  $("#loginForm").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("#operatorName").value.trim();
    if (!name) {
      $("#operatorName").focus();
      return;
    }
    loginScreen.hidden = true;
    notify(`Welcome, ${name}`);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      launcher.hidden = true;
      notificationPanel.hidden = true;
      powerMenu.hidden = true;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      launcher.hidden = false;
      notificationPanel.hidden = true;
      appSearch.focus();
    }
  });

  // Open the launcher on startup only after the user enters from the login screen.
})();