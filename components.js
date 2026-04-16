import { domainFromUrl, formatLastOpened } from "./data.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderUnreadBadge(unreadCount) {
  if (!unreadCount) {
    return "";
  }
  return `<span class="badge badge-unread" aria-label="${unreadCount} unread">${unreadCount}</span>`;
}

export function renderSidebar(state, visibleApps, activeAppId) {
  const appsMarkup = visibleApps
    .map((app) => {
      const isActive = app.id === activeAppId;
      const activeClass = isActive ? "is-active" : "";
      const pinnedClass = app.pinned ? "is-pinned" : "";

      return `
        <li>
          <button
            class="sidebar-app ${activeClass} ${pinnedClass}"
            data-action="open-app"
            data-app-id="${escapeHtml(app.id)}"
            title="${escapeHtml(app.name)}"
            aria-label="Open ${escapeHtml(app.name)}"
          >
            <span class="sidebar-app-icon" style="--app-color:${escapeHtml(app.brandColor)}">${escapeHtml(app.icon)}</span>
            <span class="sidebar-app-name">${escapeHtml(app.name)}</span>
            ${app.pinned ? '<span class="pin-indicator" aria-hidden="true">PIN</span>' : ""}
            ${renderUnreadBadge(app.unreadCount)}
          </button>
        </li>
      `;
    })
    .join("");

  const noResults = visibleApps.length
    ? ""
    : '<div class="sidebar-empty">No apps match the current search.</div>';

  return `
    <div class="sidebar-top">
      <div class="brand-block">
        <div class="brand-mark" aria-hidden="true">WH</div>
        <div>
          <p class="brand-title">Workspace Hub</p>
          <p class="brand-subtitle">Windows Web Apps</p>
        </div>
      </div>
      <nav aria-label="Applications" class="sidebar-nav">
        <ul class="sidebar-list">${appsMarkup}</ul>
      </nav>
      ${noResults}
    </div>

    <div class="sidebar-bottom">
      <button class="sidebar-tool" data-action="show-home" title="Home Dashboard">
        Home
      </button>
      <button class="sidebar-tool" data-action="toggle-theme" title="Toggle Theme">
        ${state.ui.theme === "dark" ? "Light Theme" : "Dark Theme"}
      </button>
      <button class="sidebar-tool accent" data-action="show-add-app" title="Add App">
        Add App
      </button>
      <button class="sidebar-tool" data-action="toggle-right-panel" title="Toggle Utility Panel">
        ${state.ui.rightPanelCollapsed ? "Show Panel" : "Hide Panel"}
      </button>
    </div>
  `;
}

export function renderToolbar(state, activeTab, activeApp) {
  const canGoBack = Boolean(activeTab && activeTab.historyIndex > 0);
  const canGoForward = Boolean(activeTab && activeTab.historyIndex < activeTab.history.length - 1);
  const title = activeApp ? activeApp.name : "Home Dashboard";
  const subtitle = activeApp ? domainFromUrl(activeApp.url) : "Open an app to start working";

  return `
    <div class="toolbar-left">
      <button class="toolbar-btn" data-action="nav-back" ${canGoBack ? "" : "disabled"} aria-label="Back">Back</button>
      <button class="toolbar-btn" data-action="nav-forward" ${canGoForward ? "" : "disabled"} aria-label="Forward">Forward</button>
      <button class="toolbar-btn" data-action="reload" ${activeTab ? "" : "disabled"} aria-label="Reload">Reload</button>
      <div class="toolbar-title-wrap">
        <p class="toolbar-title">${escapeHtml(title)}</p>
        <p class="toolbar-subtitle">${escapeHtml(subtitle)}</p>
      </div>
    </div>

    <div class="toolbar-center">
      <label class="visually-hidden" for="toolbar-search">Search apps</label>
      <input
        id="toolbar-search"
        class="toolbar-search"
        type="search"
        data-action="search-input"
        placeholder="Search apps, categories, domains"
        value="${escapeHtml(state.ui.searchQuery)}"
      />
    </div>

    <div class="toolbar-right">
      <button class="toolbar-btn" data-action="toggle-app-pin" ${activeApp ? "" : "disabled"}>
        ${activeApp?.pinned ? "Unpin App" : "Pin App"}
      </button>
      <button class="toolbar-btn" data-action="toggle-tab-mute" ${activeTab ? "" : "disabled"}>
        ${activeTab?.isMuted ? "Unmute" : "Mute"}
      </button>
      <button class="toolbar-btn accent" data-action="open-external" ${activeApp ? "" : "disabled"}>
        Open in Browser
      </button>
      <button class="toolbar-btn" data-action="show-add-app">Add</button>
    </div>
  `;
}

export function renderTabBar(tabsWithApps, activeTabId) {
  if (!tabsWithApps.length) {
    return '<div class="tabbar-empty">No open tabs. Select an app from the sidebar or dashboard.</div>';
  }

  const tabItems = tabsWithApps
    .map(({ tab, app }) => {
      const isActive = tab.tabId === activeTabId;
      const activeClass = isActive ? "is-active" : "";
      return `
        <div class="tab-item ${activeClass}">
          <button class="tab-main" data-action="activate-tab" data-tab-id="${escapeHtml(tab.tabId)}">
            <span class="tab-icon" style="--app-color:${escapeHtml(app.brandColor)}">${escapeHtml(app.icon)}</span>
            <span class="tab-title">${escapeHtml(tab.title)}</span>
            ${app.pinned ? '<span class="tab-pin" title="App pinned">PIN</span>' : ""}
            ${app.unreadCount ? `<span class="badge badge-unread">${app.unreadCount}</span>` : ""}
            ${tab.isMuted ? '<span class="tab-muted" title="Muted">MUTED</span>' : ""}
          </button>
          <button class="tab-close" data-action="close-tab" data-tab-id="${escapeHtml(tab.tabId)}" aria-label="Close ${escapeHtml(tab.title)}">x</button>
        </div>
      `;
    })
    .join("");

  return `<div class="tabbar-list">${tabItems}</div>`;
}

function renderCard(app) {
  const domain = domainFromUrl(app.url);

  return `
    <article class="app-card ${app.pinned ? "is-pinned" : ""}">
      <header class="app-card-header">
        <div class="app-id-block">
          <span class="app-icon" style="--app-color:${escapeHtml(app.brandColor)}">${escapeHtml(app.icon)}</span>
          <div>
            <h3>${escapeHtml(app.name)}</h3>
            <p>${escapeHtml(domain)}</p>
          </div>
        </div>
        <div class="app-flags">
          ${app.pinned ? '<span class="chip">Pinned</span>' : ""}
          ${app.unreadCount ? `<span class="chip unread">${app.unreadCount} unread</span>` : ""}
        </div>
      </header>

      <p class="app-description">${escapeHtml(app.description)}</p>

      <footer class="app-card-footer">
        <span class="chip">${escapeHtml(app.category)}</span>
        <span class="card-time">${escapeHtml(formatLastOpened(app.lastOpenedAt))}</span>
      </footer>

      <div class="app-card-actions">
        <button class="card-btn accent" data-action="open-app" data-app-id="${escapeHtml(app.id)}">Open</button>
        <button class="card-btn" data-action="toggle-app-pin" data-app-id="${escapeHtml(app.id)}">
          ${app.pinned ? "Unpin" : "Pin"}
        </button>
      </div>
    </article>
  `;
}

export function renderNoResultsState(query) {
  return `
    <section class="state-panel">
      <h2>No Results</h2>
      <p>No apps matched "${escapeHtml(query)}". Try another name, category, or domain.</p>
      <button class="card-btn" data-action="clear-search">Clear Search</button>
    </section>
  `;
}

export function renderEmptyState() {
  return `
    <section class="state-panel">
      <h2>Workspace Is Empty</h2>
      <p>Open an app from the sidebar or dashboard to create your first tab.</p>
      <div class="state-panel-actions">
        <button class="card-btn accent" data-action="show-home">Go to Home</button>
        <button class="card-btn" data-action="show-add-app">Add App</button>
      </div>
    </section>
  `;
}

export function renderHomeDashboard(state, visibleApps) {
  const pinnedCount = state.apps.filter((app) => app.pinned).length;
  const unreadTotal = state.apps.reduce((sum, app) => sum + app.unreadCount, 0);

  if (!visibleApps.length) {
    return renderNoResultsState(state.ui.searchQuery);
  }

  return `
    <section class="dashboard-head">
      <div>
        <h1>App Workspace</h1>
        <p>Launch, pin, and manage your web apps in a desktop-style shell.</p>
      </div>
      <div class="dashboard-stats">
        <article>
          <span class="stat-label">Apps</span>
          <span class="stat-value">${state.apps.length}</span>
        </article>
        <article>
          <span class="stat-label">Pinned</span>
          <span class="stat-value">${pinnedCount}</span>
        </article>
        <article>
          <span class="stat-label">Unread</span>
          <span class="stat-value">${unreadTotal}</span>
        </article>
      </div>
    </section>

    <section class="card-grid" aria-label="Application cards">
      ${visibleApps.map((app) => renderCard(app)).join("")}
    </section>
  `;
}

export function renderActiveAppView(state, activeTab, activeApp) {
  if (!activeApp || !activeTab) {
    return renderEmptyState();
  }

  const currentRoute = activeTab.history[activeTab.historyIndex] || activeApp.url;
  const routeLabel = currentRoute.replace(activeApp.url, "") || "/";

  return `
    <section class="active-app-layout">
      <header class="webview-toolbar">
        <div class="webview-domain">
          <span class="dot"></span>
          <span>${escapeHtml(domainFromUrl(activeApp.url))}</span>
          <span class="path-label">${escapeHtml(routeLabel)}</span>
        </div>
        <div class="webview-actions">
          <button class="card-btn" data-action="navigate-tab" data-route="/home">Home</button>
          <button class="card-btn" data-action="navigate-tab" data-route="/inbox">Inbox</button>
          <button class="card-btn" data-action="navigate-tab" data-route="/activity">Activity</button>
          <button class="card-btn" data-action="navigate-tab" data-route="/settings">Settings</button>
        </div>
      </header>

      <div class="webview-container">
        <article class="embedded-surface">
          <h2>${escapeHtml(activeApp.name)} Workspace</h2>
          <p>${escapeHtml(activeApp.description)}</p>

          <div class="embedded-meta">
            <span class="chip">Category: ${escapeHtml(activeApp.category)}</span>
            <span class="chip">Domain: ${escapeHtml(domainFromUrl(activeApp.url))}</span>
            <span class="chip">Pinned: ${activeApp.pinned ? "Yes" : "No"}</span>
            <span class="chip">Muted: ${activeTab.isMuted ? "Yes" : "No"}</span>
            <span class="chip unread">Unread: ${activeApp.unreadCount}</span>
            <span class="chip">Last open: ${escapeHtml(formatLastOpened(activeApp.lastOpenedAt))}</span>
          </div>

          <div class="embedded-grid">
            <section>
              <h3>Operational Summary</h3>
              <p>Tabs map to standalone hosted views. This panel simulates a WebView session container for desktop portability.</p>
            </section>
            <section>
              <h3>Current Route</h3>
              <p>${escapeHtml(currentRoute)}</p>
            </section>
            <section>
              <h3>Session Actions</h3>
              <div class="state-panel-actions">
                <button class="card-btn" data-action="mark-active-read">Mark Read</button>
                <button class="card-btn" data-action="reload">Reload Session</button>
                <button class="card-btn accent" data-action="open-external">Open Original URL</button>
              </div>
            </section>
          </div>
        </article>
      </div>
    </section>
  `;
}

export function renderRightPanel(state) {
  if (state.ui.rightPanelCollapsed) {
    return `
      <div class="right-panel-collapsed">
        <button class="toolbar-btn" data-action="toggle-right-panel">Utilities</button>
      </div>
    `;
  }

  const notificationsMarkup = state.notifications.length
    ? state.notifications
        .map(
          (item) => `
            <li class="notification-item">
              <p>${escapeHtml(item.title)}</p>
              <span>${escapeHtml(item.detail)}</span>
            </li>
          `
        )
        .join("")
    : '<li class="notification-item empty"><p>No notifications</p><span>Everything is up to date.</span></li>';

  return `
    <div class="right-panel-inner">
      <header class="right-panel-header">
        <h2>Utilities</h2>
        <button class="toolbar-btn" data-action="toggle-right-panel">Collapse</button>
      </header>

      <section class="clock-card">
        <p class="clock-label">Local Time</p>
        <p class="clock-value">${escapeHtml(state.ui.clockText)}</p>
      </section>

      <section>
        <h3>Notifications</h3>
        <ul class="notifications-list">${notificationsMarkup}</ul>
      </section>

      <section class="quick-actions">
        <h3>Quick Actions</h3>
        <button class="card-btn" data-action="mark-active-read">Mark active app as read</button>
        <button class="card-btn" data-action="clear-notifications">Clear notifications</button>
        <button class="card-btn" data-action="show-home">Go to dashboard</button>
      </section>
    </div>
  `;
}

export function renderAddAppModal(state) {
  if (!state.ui.showAddAppModal) {
    return "";
  }

  return `
    <div class="modal-backdrop" data-action="hide-add-app">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="add-app-title">
        <header class="modal-header">
          <h2 id="add-app-title">Add Web App</h2>
          <button class="toolbar-btn" data-action="hide-add-app">Close</button>
        </header>

        <form id="add-app-form" class="add-app-form">
          <label>
            Name
            <input name="name" required maxlength="48" placeholder="Example: Figma" />
          </label>

          <label>
            URL or domain
            <input name="url" required placeholder="https://www.figma.com or figma.com" />
          </label>

          <label>
            Category
            <input name="category" required maxlength="32" placeholder="Design" />
          </label>

          <label>
            Description
            <textarea name="description" rows="3" maxlength="180" placeholder="Design files, comments, and team libraries."></textarea>
          </label>

          <div class="modal-row">
            <label>
              Icon (2 letters)
              <input name="icon" maxlength="2" placeholder="FG" />
            </label>

            <label>
              Brand color
              <input name="brandColor" type="color" value="#2d6f7a" />
            </label>

            <label>
              Unread count
              <input name="unreadCount" type="number" min="0" max="999" value="0" />
            </label>
          </div>

          <div class="modal-row checkbox-row">
            <label><input type="checkbox" name="pinned" /> Pin in sidebar</label>
            <label><input type="checkbox" name="openNow" checked /> Open immediately</label>
          </div>

          <footer class="modal-actions">
            <button type="button" class="card-btn" data-action="hide-add-app">Cancel</button>
            <button type="submit" class="card-btn accent">Add App</button>
          </footer>
        </form>
      </section>
    </div>
  `;
}
