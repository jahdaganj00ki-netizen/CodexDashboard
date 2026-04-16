export const STORAGE_KEY = "workspace-hub-state-v1";

export const SEED_APPS = [
  {
    id: "gmail",
    name: "Gmail",
    icon: "GM",
    brandColor: "#d1493f",
    description: "Manage customer and internal email communication.",
    url: "https://mail.google.com",
    category: "Communication",
    pinned: true,
    unreadCount: 18,
    lastOpenedAt: null
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: "WA",
    brandColor: "#1fa85a",
    description: "Quick team and client messaging with media sharing.",
    url: "https://web.whatsapp.com",
    category: "Communication",
    pinned: true,
    unreadCount: 5,
    lastOpenedAt: null
  },
  {
    id: "notion",
    name: "Notion",
    icon: "NO",
    brandColor: "#88939f",
    description: "Project docs, notes, and collaborative knowledge base.",
    url: "https://www.notion.so",
    category: "Productivity",
    pinned: true,
    unreadCount: 0,
    lastOpenedAt: null
  },
  {
    id: "trello",
    name: "Trello",
    icon: "TR",
    brandColor: "#2e78b7",
    description: "Kanban board tracking for delivery and operations.",
    url: "https://trello.com",
    category: "Planning",
    pinned: false,
    unreadCount: 2,
    lastOpenedAt: null
  },
  {
    id: "slack",
    name: "Slack",
    icon: "SL",
    brandColor: "#8b5cf6",
    description: "Company channels, direct messages, and alerts.",
    url: "https://app.slack.com",
    category: "Communication",
    pinned: true,
    unreadCount: 9,
    lastOpenedAt: null
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    icon: "CG",
    brandColor: "#1f8f7a",
    description: "AI assistant for drafting, analysis, and coding support.",
    url: "https://chat.openai.com",
    category: "AI",
    pinned: false,
    unreadCount: 0,
    lastOpenedAt: null
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    icon: "GC",
    brandColor: "#3b74d8",
    description: "Meetings, deadlines, and schedule planning.",
    url: "https://calendar.google.com",
    category: "Scheduling",
    pinned: false,
    unreadCount: 1,
    lastOpenedAt: null
  },
  {
    id: "youtube-music",
    name: "YouTube Music",
    icon: "YM",
    brandColor: "#ef4444",
    description: "Background focus playlists and music library.",
    url: "https://music.youtube.com",
    category: "Media",
    pinned: false,
    unreadCount: 0,
    lastOpenedAt: null
  }
];

const DEFAULT_NOTIFICATIONS = [
  {
    id: "note-1",
    title: "Welcome to Workspace Hub",
    detail: "Pin your essential apps for quick access.",
    createdAt: new Date().toISOString()
  },
  {
    id: "note-2",
    title: "Tip",
    detail: "Use search to filter apps by name, domain, or category.",
    createdAt: new Date().toISOString()
  }
];

export function createId(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeUrl(value) {
  const raw = (value || "").trim();
  if (!raw) {
    return null;
  }

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(withScheme);
    if (!parsed.hostname) {
      return null;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "invalid-domain";
  }
}

export function formatLastOpened(iso) {
  if (!iso) {
    return "Never opened";
  }

  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) {
    return "Opened just now";
  }
  if (diffMin < 60) {
    return `Opened ${diffMin} min ago`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `Opened ${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Opened ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function sortApps(apps) {
  return [...apps].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }

    const aOpened = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
    const bOpened = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;

    if (aOpened !== bOpened) {
      return bOpened - aOpened;
    }

    return a.name.localeCompare(b.name);
  });
}

export function createInitialState() {
  return {
    apps: SEED_APPS.map((app) => ({ ...app })),
    tabs: [],
    ui: {
      activeView: "home",
      activeTabId: null,
      searchQuery: "",
      theme: "dark",
      rightPanelCollapsed: false,
      showAddAppModal: false,
      clockText: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      toast: ""
    },
    notifications: DEFAULT_NOTIFICATIONS.map((item) => ({ ...item }))
  };
}
