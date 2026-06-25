// FLOW: Listens for the browser's beforeinstallprompt event and renders an
// "Install app" button only when the PWA is actually installable (and not yet
// installed). Used in Layout. Renders nothing when install isn't available.

import { useEffect, useState } from "react";
import { IconDownload } from "./icons.jsx";

export default function InstallButton({ className = "" }) {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  async function install() {
    deferred.prompt();
    try {
      await deferred.userChoice;
    } finally {
      setDeferred(null);
    }
  }

  return (
    <button
      type="button"
      onClick={install}
      className={className || "btn-outline w-full justify-start text-sm"}
    >
      <IconDownload width={16} height={16} /> Install app
    </button>
  );
}
