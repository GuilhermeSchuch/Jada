const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
});

contextBridge.exposeInMainWorld("electronAPI", {
  loadConfig: async () => ipcRenderer.invoke("load-config"),
  saveConfig: async (config) => ipcRenderer.invoke("save-config", config),
  installMod: async (gameObj) => ipcRenderer.invoke("install-mod", gameObj),
  loadModList: async (gameObj) => ipcRenderer.invoke("load-mod-list", gameObj),
  removeMod: async (gameObj, modObj) => ipcRenderer.invoke("remove-mod", gameObj, modObj),
  appendMod: async (gameObj, modObj) => ipcRenderer.invoke("append-mod", gameObj, modObj),
  uninstallMod: async (gameObj, modObj) => ipcRenderer.invoke("uninstall-mod", gameObj, modObj),
});


contextBridge.exposeInMainWorld("loader", {
  setLoading: async (loader) => !loader,
});