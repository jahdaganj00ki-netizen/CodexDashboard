import {
  STORAGE_KEY,
  createId,
  createInitialState,
  domainFromUrl,
  normalizeUrl,
  nowIso,
  sortApps
} from "./data.js";
import {
  renderActiveAppView,
  renderAddAppModal,
  renderHomeDashboard,
  renderRightPanel,
  renderSidebar,
  renderTabBar,
  renderToolbar
} from "./components.js";

const stateNodes = {
  sidebar: document.getElementById("sidebar"),
  toolbar: document.getElementById("toolbar"),
  tabbar: document.getElementById("tabbar"),
  content: document.getElementById("main-content"),
  panel: document.getElementById("utility-panel"),
  modal: document.getElementById("modal-root"),
  toast: document.getElementById("toast-region")
};

const NO_PERSIST_ACTIONS = new Set(["TICK_CLOCK", "CLEAR_TOAST"]);
let state = loadState();
let persistTimer = null;
let toastTimer = null;

function loadState() {
  const base = createInitialState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return base;
    }

    const parsed = JSON.parse(raw);
    const apps = Array.isArray(parsed.apps) ? parsed.apps : base.apps;
    const tabs = Array.isArray(parsed.tabs) ? parsed.tabs : base.tabs;
    const notifications = Array.isArray(parsed.notifications) ? parsed.notifications : base.notifications;
    const ui = { ...base.ui, ...(parsed.ui || {}) };

    const safeState = {
      apps,
      tabs,
      notifications,
      ui
    };

    if (safeState.ui.activeTabId && !safeState.tabs.some((tab) => tab.tabId === safeState.ui.activeTabId)) {
      safeState.ui.activeTabId = safeState.tabs[0]?.tabId || null;
      safeState.ui.activeView = safeState.ui.activeTabId ? "app" : "home";
    }

    return safeState;
  } catch {
    return base;
  }
}

function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, 120);
}

function pushToast(message) {
  if (!message) {
    return;
  }

  dispatch({ type: "SET_TOAST", payload: message });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dispatch({ type: "CLEAR_TOAST" });
  }, 2200);
}

function getAppById(sourceState, appId) {
  return sourceState.apps.find((app) => app.id === appId) || null;
}

function getTabById(sourceState, tabId) {
  return sourceState.tabs.find((tab) => tab.tabId === tabId) || null;
}

function getActiveTab(sourceState) {
  return getTabById(sourceState, sourceState.ui.activeTabId);
}

function getActiveApp(sourceState) {
  const activeTab = getActiveTab(sourceState);
  if (!activeTab) {
    return null;
  }
  return getAppById(sourceState, activeTab.appId);
}

function openAppInState(sourceState, appId) {
  const app = getAppById(sourceState, appId);
  if (!app) {
    return sourceState;
  }

  const openedAt = nowIso();
  const existingTab = sourceState.tabs.find((tab) => tab.appId === appId);

  const updatedApps = sourceState.apps.map((candidate) =>
    candidate.id === appId ? { ...candidate, lastOpenedAt: openedAt } : candidate
  );

  if (existingTab) {
    return {
      ...sourceState,
      apps: updatedApps,
      ui: {
        ...sourceState.ui,
        activeView: "app",
        activeTabId: existingTab.tabId
      }
    };
  }

  const newTab = {
    tabId: createId("tab"),
    appId,
    title: app.name,
    openedAt,
    lastReloadAt: openedAt,
    isMuted: false,
    isPinnedTab: false,
    history: [app.url],
    historyIndex: 0
  };

  return {
    ...sourceState,
    apps: updatedApps,
    tabs: [...sourceState.tabs, newTab],
    ui: {
      ...sourceState.ui,
      activeView: "app",
      activeTabId: newTab.tabId
    }
  };
}

function reduce(sourceState, action) {
  switch (action.type) {
    case "OPEN_APP":
      return openAppInState(sourceState, action.payload.appId);

    case "SHOW_HOME":
      return {
        ...sourceState,
        ui: { ...sourceState.ui, activeView: "home" }
      };

    case "ACTIVATE_TAB": {
      const tab = getTabById(sourceState, action.payload.tabId);
      if (!tab) {
        return sourceState;
      }

      const openedAt = nowIso();
      const apps = sourceState.apps.map((app) =>
        app.id === tab.appId ? { ...app, lastOpenedAt: openedAt } : app
      );

      return {
        ...sourceState,
        apps,
        ui: {
          ...sourceState.ui,
          activeView: "app",
          activeTabId: tab.tabId
        }
      };
    }

    case "CLOSE_TAB": {
      const closingId = action.payload.tabId;
      const closingIndex = sourceState.tabs.findIndex((tab) => tab.tabId === closingId);
      if (closingIndex === -1) {
        return sourceState;
      }

      const remainingTabs = sourceState.tabs.filter((tab) => tab.tabId !== closingId);
      const isActiveClosing = sourceState.ui.activeTabId === closingId;

      let nextActiveTabId = sourceState.ui.activeTabId;
      let nextView = sourceState.ui.activeView;

      if (isActiveClosing) {
        const fallback = remainingTabs[closingIndex] || remainingTabs[closingIndex - 1] || null;
        nextActiveTabId = fallback ? fallback.tabId : null;
        nextView = fallback ? "app" : "home";
      }

      if (!remainingTabs.length) {
        nextActiveTabId = null;
        nextView = "home";
      }

      return {
        ...sourceState,
        tabs: remainingTabs,
        ui: {
          ...sourceState.ui,
          activeTabId: nextActiveTabId,
          activeView: nextView
        }
      };
    }

    case "SET_SEARCH_QUERY":
      return {
        ...sourceState,
        ui: { ...sourceState.ui, searchQuery: action.payload.query }
      };

    case "CLEAR_SEARCH":
      return {
        ...sourceState,
        ui: { ...sourceState.ui, searchQuery: "" }
      };

    case "TOGGLE_PIN_APP": {
      const explicitAppId = action.payload?.appId || getActiveApp(sourceState)?.id;
      if (!explicitAppId) {
        return sourceState;
      }

      return {
        ...sourceState,
        apps: sourceState.apps.map((app) =>
          app.id === explicitAppId ? { ...app, pinned: !app.pinned } : app
        )
      };
    }

    case "TOGGLE_THEME":
      return {
        ...sourceState,
        ui: {
          ...sourceState.ui,
          theme: sourceState.ui.theme === "dark" ? "light" : "dark"
        }
      };

    case "TOGGLE_RIGHT_PANEL":
      return {
        ...sourceState,
        ui: {
          ...sourceState.ui,
          rightPanelCollapsed: !sourceState.ui.rightPanelCollapsed
        }
      };

    case "SHOW_ADD_APP":
      return {
        ...sourceState,
        ui: { ...sourceState.ui, showAddAppModal: true }
      };

    case "HIDE_ADD_APP":
      return {
        ...sourceState,
        ui: { ...sourceState.ui, showAddAppModal: false }
      };

    case "ADD_APP": {
      const payload = action.payload;
      const newApp = {
        id: createId("app"),
        name: payload.name,
        icon: payload.icon,
        brandColor: payload.brandColor,
        description: payload.description,
        url: payload.url,
        category: payload.category,
        pinned: payload.pinned,
        unreadCount: payload.unreadCount,
        lastOpenedAt: null
      };

      const nextState = {
        ...sourceState,
        apps: [...sourceState.apps, newApp],
        notifications: [
          {
            id: createId("note"),
            title: `${payload.name} added`,
            detail: `${domainFromUrl(payload.url)} is now available in your workspace.`,
            createdAt: nowIso()
          },
          ...sourceState.notifications
        ],
        ui: { ...sourceState.ui, showAddAppModal: false }
      };

      if (payload.openNow) {
        return openAppInState(nextState, newApp.id);
      }

      return nextState;
    }

    case "TOGGLE_TAB_MUTE": {
      const activeTabId = sourceState.ui.activeTabId;
      if (!activeTabId) {
        return sourceState;
      }

      return {
        ...sourceState,
        tabs: sourceState.tabs.map((tab) =>
          tab.tabId === activeTabId ? { ...tab, isMuted: !tab.isMuted } : tab
        )
      };
    }

    case "NAV_BACK": {
      const activeTabId = sourceState.ui.activeTabId;
      if (!activeTabId) {
        return sourceState;
      }

      return {
        ...sourceState,
        tabs: sourceState.tabs.map((tab) => {
          if (tab.tabId !== activeTabId || tab.historyIndex <= 0) {
            return tab;
          }
          return { ...tab, historyIndex: tab.historyIndex - 1 };
        })
      };
    }

    case "NAV_FORWARD": {
      const activeTabId = sourceState.ui.activeTabId;
      if (!activeTabId) {
        return sourceState;
      }

      return {
        ...sourceState,
        tabs: sourceState.tabs.map((tab) => {
          if (tab.tabId !== activeTabId || tab.historyIndex >= tab.history.length - 1) {
            return tab;
          }
          return { ...tab, historyIndex: tab.historyIndex + 1 };
        })
      };
    }

    case "RELOAD": {
      const activeTabId = sourceState.ui.activeTabId;
      if (!activeTabId) {
        return sourceState;
      }

      return {
        ...sourceState,
        tabs: sourceState.tabs.map((tab) =>
          tab.tabId === activeTabId ? { ...tab, lastReloadAt: nowIso() } : tab
        )
      };
    }

    case "NAVIGATE_TAB": {
      const activeTab = getActiveTab(sourceState);
      const activeApp = getActiveApp(sourceState);
      if (!activeTab || !activeApp) {
        return sourceState;
      }

      const route = action.payload.route;
      const baseUrl = activeApp.url.replace(/\/$/, "");
      const resolvedRoute = route.startsWith("/") ? route : `/${route}`;
      const nextUrl = `${baseUrl}${resolvedRoute}`;

      return {
        ...sourceState,
        tabs: sourceState.tabs.map((tab) => {
          if (tab.tabId !== activeTab.tabId) {
            return tab;
          }

          const trimmedHistory = tab.history.slice(0, tab.historyIndex + 1);
          const alreadyCurrent = trimmedHistory[trimmedHistory.length - 1] === nextUrl;
          if (alreadyCurrent) {
            return tab;
          }

          const history = [...trimmedHistory, nextUrl];
          return {
            ...tab,
            history,
            historyIndex: history.length - 1
          };
        })
      };
    }

    case "MARK_ACTIVE_READ": {
      const activeApp = getActiveApp(sourceState);
      if (!activeApp) {
        return sourceState;
      }

      return {
        ...sourceState,
        apps: sourceState.apps.map((app) =>
          app.id === activeApp.id ? { ...app, unreadCount: 0 } : app
        )
      };
    }

    case "CLEAR_NOTIFICATIONS":
      return {
        ...sourceState,
        notifications: []
      };

    case "TICK_CLOCK":
      return {
        ...sourceState,
        ui: {
          ...sourceState.ui,
          clockText: action.payload.timeText
        }
      };

    case "SET_TOAST":
      return {
        ...sourceState,
        ui: {
          ...sourceState.ui,
          toast: action.payload
        }
      };

    case "CLEAR_TOAST":
      if (!sourceState.ui.toast) {
        return sourceState;
      }
      return {
        ...sourceState,
        ui: {
          ...sourceState.ui,
          toast: ""
        }
      };

    default:
      return sourceState;
  }
}

function dispatch(action) {
  const nextState = reduce(state, action);
  const changed = nextState !== state;
  state = nextState;

  render();

  if (changed && !NO_PERSIST_ACTIONS.has(action.type)) {
    schedulePersist();
  }
}

function getVisibleApps(sourceState) {
  const query = sourceState.ui.searchQuery.trim().toLowerCase();
  const sorted = sortApps(sourceState.apps);

  if (!query) {
    return sorted;
  }

  return sorted.filter((app) => {
    const haystack = [
      app.name,
      app.category,
      app.description,
      domainFromUrl(app.url)
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function render() {
  document.documentElement.dataset.theme = state.ui.theme;

  const visibleApps = getVisibleApps(state);
  const activeTab = getActiveTab(state);
  const activeApp = getActiveApp(state);
  const tabsWithApps = state.tabs
    .map((tab) => ({ tab, app: getAppById(state, tab.appId) }))
    .filter((entry) => Boolean(entry.app));

  const displayApp = state.ui.activeView === "app" ? activeApp : null;
  const displayTab = state.ui.activeView === "app" ? activeTab : null;

  stateNodes.sidebar.innerHTML = renderSidebar(state, visibleApps, displayApp?.id || null);
  stateNodes.toolbar.innerHTML = renderToolbar(state, displayTab, displayApp);
  stateNodes.tabbar.innerHTML = renderTabBar(tabsWithApps, state.ui.activeTabId);

  if (state.ui.activeView === "home") {
    stateNodes.content.innerHTML = renderHomeDashboard(state, visibleApps);
  } else {
    stateNodes.content.innerHTML = renderActiveAppView(state, displayTab, displayApp);
  }

  stateNodes.panel.innerHTML = renderRightPanel(state);
  stateNodes.modal.innerHTML = renderAddAppModal(state);
  stateNodes.toast.innerHTML = state.ui.toast ? `<div class="toast">${state.ui.toast}</div>` : "";
}

function handleActionClick(target) {
  const action = target.dataset.action;

  if (!action) {
    return;
  }

  switch (action) {
    case "open-app":
      dispatch({ type: "OPEN_APP", payload: { appId: target.dataset.appId } });
      return;

    case "show-home":
      dispatch({ type: "SHOW_HOME" });
      return;

    case "activate-tab":
      dispatch({ type: "ACTIVATE_TAB", payload: { tabId: target.dataset.tabId } });
      return;

    case "close-tab":
      dispatch({ type: "CLOSE_TAB", payload: { tabId: target.dataset.tabId } });
      return;

    case "toggle-app-pin":
      dispatch({ type: "TOGGLE_PIN_APP", payload: { appId: target.dataset.appId || null } });
      return;

    case "toggle-theme":
      dispatch({ type: "TOGGLE_THEME" });
      return;

    case "toggle-right-panel":
      dispatch({ type: "TOGGLE_RIGHT_PANEL" });
      return;

    case "show-add-app":
      dispatch({ type: "SHOW_ADD_APP" });
      return;

    case "hide-add-app":
      dispatch({ type: "HIDE_ADD_APP" });
      return;

    case "toggle-tab-mute":
      dispatch({ type: "TOGGLE_TAB_MUTE" });
      return;

    case "nav-back":
      dispatch({ type: "NAV_BACK" });
      return;

    case "nav-forward":
      dispatch({ type: "NAV_FORWARD" });
      return;

    case "reload":
      dispatch({ type: "RELOAD" });
      pushToast("Session reloaded.");
      return;

    case "navigate-tab":
      dispatch({ type: "NAVIGATE_TAB", payload: { route: target.dataset.route || "/" } });
      return;

    case "clear-notifications":
      dispatch({ type: "CLEAR_NOTIFICATIONS" });
      pushToast("Notifications cleared.");
      return;

    case "mark-active-read":
      dispatch({ type: "MARK_ACTIVE_READ" });
      pushToast("Active app marked as read.");
      return;

    case "clear-search":
      dispatch({ type: "CLEAR_SEARCH" });
      return;

    case "open-external": {
      const active = getActiveApp(state);
      if (active) {
        window.open(active.url, "_blank", "noopener,noreferrer");
      }
      return;
    }

    default:
      return;
  }
}

document.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) {
    return;
  }

  if (actionTarget.classList.contains("modal-backdrop") && event.target.closest(".modal")) {
    return;
  }

  handleActionClick(actionTarget);
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.id === "toolbar-search") {
    dispatch({ type: "SET_SEARCH_QUERY", payload: { query: target.value } });
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== "add-app-form") {
    return;
  }

  event.preventDefault();
  const formData = new FormData(form);

  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const iconRaw = String(formData.get("icon") || "").trim();
  const brandColor = String(formData.get("brandColor") || "#2d6f7a").trim();
  const unreadRaw = Number(formData.get("unreadCount") || 0);
  const openNow = formData.get("openNow") === "on";
  const pinned = formData.get("pinned") === "on";

  const normalizedUrl = normalizeUrl(String(formData.get("url") || ""));
  if (!name || !category || !normalizedUrl) {
    pushToast("Please provide a valid name, category, and URL.");
    return;
  }

  const icon = (iconRaw || name.slice(0, 2)).toUpperCase().slice(0, 2);
  const unreadCount = Number.isFinite(unreadRaw) && unreadRaw > 0 ? Math.floor(unreadRaw) : 0;

  dispatch({
    type: "ADD_APP",
    payload: {
      name,
      url: normalizedUrl,
      category,
      description: description || `Workspace for ${name}.`,
      icon,
      brandColor,
      unreadCount,
      pinned,
      openNow
    }
  });

  pushToast(`${name} added to workspace.`);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.ui.showAddAppModal) {
    dispatch({ type: "HIDE_ADD_APP" });
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    const input = document.getElementById("toolbar-search");
    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    }
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      pushToast("Offline support could not be initialized.");
    });
  });
}

setInterval(() => {
  dispatch({
    type: "TICK_CLOCK",
    payload: {
      timeText: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    }
  });
}, 1000);

render();
