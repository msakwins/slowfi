// Pont entre la page et l'application : le système, le lancement d'une
// lecture, et les capteurs. Rien d'autre de Node n'est exposé.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("slowfi", {
  platform: process.platform,
  run: (script) => ipcRenderer.invoke("slowfi:run", script),
  sensors: () => ipcRenderer.invoke("slowfi:sensors"),
  sensorsAdmin: () => ipcRenderer.invoke("slowfi:sensors-admin"),
  sample: (withGpu) => ipcRenderer.invoke("slowfi:sample", withGpu),
});
