// IMPORTS
import { buildEditorShell } from "./appShell.js";

// BUILD
/** Creates a page lifecycle controller */
function createPageLifecycle() {
  const cleanups = [];
  let destroyed = false;
  function add(fn) {
    if (typeof fn !== "function") return fn;
    if (destroyed) {
      fn();
      return fn;
    }
    cleanups.push(fn);
    return fn;
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (let i = cleanups.length - 1; i >= 0; i -= 1) {
      try {
        cleanups[i]();
      } catch (_e) {}
    }
    cleanups.length = 0;
  }
  return { add, destroy };
}


/** Creates the editor page runtime */
export function createEditorPageRuntime({ pageTitle, activeNavKey }) {
  const lifecycle = createPageLifecycle();
  const shell = buildEditorShell({ pageTitle, activeNavKey });
  const onPageHide = () => lifecycle.destroy();
  window.addEventListener("pagehide", onPageHide);
  lifecycle.add(() => window.removeEventListener("pagehide", onPageHide));
  return { shell, lifecycle };
}
