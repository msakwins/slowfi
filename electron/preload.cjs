// Pont entre la page et l'application : le système, le lancement d'une
// lecture, les capteurs et les mises à jour. Rien d'autre de Node n'est
// exposé.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("slowfi", {
  platform: process.platform,
  run: (script) => ipcRenderer.invoke("slowfi:run", script),
  sensors: () => ipcRenderer.invoke("slowfi:sensors"),
  sensorsAdmin: () => ipcRenderer.invoke("slowfi:sensors-admin"),
  sample: (withGpu) => ipcRenderer.invoke("slowfi:sample", withGpu),
  // Mises à jour : état courant, avis des changements, redémarrage.
  updateState: () => ipcRenderer.invoke("slowfi:update-state"),
  onUpdate: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("slowfi:update", listener);
    return () => ipcRenderer.removeListener("slowfi:update", listener);
  },
  installUpdate: () => ipcRenderer.invoke("slowfi:install-update"),
});
