const paths = {
  "arrow-up-right": "M7 17 17 7M7 7h10v10",
  "arrow-right": "M4 12h16m-6-6 6 6-6 6",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16",
  layers: "m12 3 10 5-10 5L2 8Zm-9 9 9 5 9-5m-18 5 9 5 9-5",
  menu: "M4 6h16M4 12h16M4 18h16",
  x: "m6 6 12 12M6 18 18 6",
  home: "m3 10 9-7 9 7v10H3Zm6 10v-7h6v7",
  grid: "M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  settings:
    "m10 3-1 3-3 1-3 3 2 3-1 4 4 1 2 3 3-2 4 1 1-4 3-2-2-3-1-4-4 1Zm5 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4",
  users:
    "M16 21v-2a6 6 0 0 0-12 0v2M14 4a4 4 0 0 1 0 8m6 9v-2a6 6 0 0 0-3-5M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  shield: "m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Zm-5 10 3 3 7-7",
  chart: "M3 3v18h18M7 14l4-5 4 3 6-7",
  file: "M14 2H4v20h16V8Zm0 0v6h6M8 13h8m-8 4h5",
  activity: "M2 12h5l3-9 4 18 3-9h5",
  logout: "M9 4H3v16h6m5-14 6 6-6 6m-7-6h13",
  search: "M21 21l-6-6m3-6a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  check: "m5 12 4 4L19 6",
  "chevron-down": "m6 9 6 6 6-6",
  mail: "M3 5h18v14H3Zm0 1 9 7 9-7",
  lock: "M5 10h14v11H5Zm3 0V6a4 4 0 0 1 8 0v4",
  eye: "M2 12S6 5 12 5s10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  plus: "M12 4v16M4 12h16",
  clock: "M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  briefcase: "M3 7h18v14H3Zm5 0V3h8v4M3 12h18m-11 0v3h4v-3",
  "external-link": "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
  github:
    "M9 19c-5 2-5-2-7-2m14 5v-4a4 4 0 0 0-1-3c4 0 7-2 7-6a5 5 0 0 0-1-3 5 5 0 0 0 0-4s-2-1-5 1a14 14 0 0 0-8 0C5 1 3 2 3 2a5 5 0 0 0 0 4 5 5 0 0 0-1 3c0 4 3 6 7 6a4 4 0 0 0-1 3v4",
  sparkles: "m12 2 2 7 7 3-7 2-2 8-2-8-8-2 8-3Z",
  globe:
    "M3 12h18M12 3c6 5 6 13 0 18-6-5-6-13 0-18Zm9 9a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  gamepad:
    "M6 7h12c4 0 7 13 3 13l-5-4H8l-5 4C-1 20 2 7 6 7Zm1 3v5m-3-2h6m6-2h1m2 3h1",
  terminal: "m5 7 5 5-5 5m8 0h6",
  zap: "m13 2-9 12h7l-1 8L21 9h-8Z",
  heart: "M12 21 3 12C-3 4 7 0 12 7c5-7 15-3 9 5Z",
};
export function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.sparkles}"/></svg>`;
}
export function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "The server could not complete this request. Please try again.",
    );
  }
  if (!response.ok) {
    const error = new Error(
      result.error || "Something went wrong. Please try again.",
    );
    error.fields = result.fields;
    error.status = response.status;
    throw error;
  }
  return result.data;
}
export function toast(message, type = "success") {
  const region = document.getElementById("toast-region");
  region.textContent = "";
  const item = document.createElement("div");
  item.className = `toast toast-${type}`;
  item.textContent = message;
  region.append(item);
  setTimeout(() => item.remove(), 5500);
}
export function navigate(path) {
  window.dispatchEvent(new CustomEvent("app:navigate", { detail: path }));
}
export const brand = `<span class="brand-symbol" aria-hidden="true">f<span>.</span></span><span>falloutjr<span class="brand-dot" aria-hidden="true">®</span></span>`;
