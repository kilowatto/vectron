export function createDockHeader(tag: string): HTMLDivElement {
  const header = document.createElement("div");
  header.className = "dock-header";
  header.innerHTML = `
    <span class="brand">VECTRON</span>
    <span class="tag">${tag}</span>
  `;
  return header;
}
