type Child = Node | string | null | undefined | false;

interface Props {
  class?: string;
  text?: string;
  html?: string;
  attrs?: Record<string, string>;
  style?: Partial<CSSStyleDeclaration>;
  on?: { [K in keyof HTMLElementEventMap]?: (e: HTMLElementEventMap[K]) => void };
}

/** Tạo phần tử DOM gọn: h('div', {class:'x', on:{click}}, child, ...) */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...kids: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    if (props.class) el.className = props.class;
    if (props.text !== undefined) el.textContent = props.text;
    if (props.html !== undefined) el.innerHTML = props.html;
    if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
    if (props.style) Object.assign(el.style, props.style);
    if (props.on) {
      for (const [k, fn] of Object.entries(props.on)) el.addEventListener(k, fn as EventListener);
    }
  }
  for (const k of kids) if (k !== null && k !== undefined && k !== false) el.append(k);
  return el;
}

export const clear = (el: Element) => el.replaceChildren();
