// Imports
const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  dialog,
  ipcRenderer,
  protocol,
  net
} = require('electron');
const fs = require("node:fs");
const path = require("node:path");
const uuid = require("uuid");
const fsExtra = require('fs-extra');

// Global Variables
const userDataPath = app.getPath('userData');
console.info("userDataPath", userDataPath);

const configPath = path.join(userDataPath, "config.json");
const initialConfig = {
  "games": [
    {
      "id": 1,
      "name": "Resident Evil 6",
      "selected": false,
      "game_path": "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Resident Evil 6\\nativePC",
      "folder": "RE6"
    },
    {
      "id": 2,
      "name": "Resident Evil 5",
      "selected": false,
      "hierarchy": "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Resident Evil 6",
      "folder": "RE5"
    }
  ],
  "mods": [],
  "settings": {
    "isLoading": false
  }
}

const isDev = false;

// Check if configuration file exists
if(!fs.existsSync(configPath)) {
  fs.writeFile(configPath, JSON.stringify(initialConfig), err => {
    if(err) {
      console.error(err);
    }
  });

  initialConfig.games.forEach((game) => {
    fs.mkdirSync(`${userDataPath}\\${game.folder}`, { recursive: true })
    fs.mkdirSync(`${userDataPath}\\${game.folder}\\backup`, { recursive: true })
    fs.mkdirSync(`${userDataPath}\\${game.folder}\\mods`, { recursive: true })
  })

}

// Get user settings from config.json file
ipcMain.handle("load-config", () => {
  if(fs.existsSync(configPath)) {    
    const data = fs.readFileSync(configPath, 'utf-8');
    if(data) return JSON.parse(data);
  }
  return [];
});

// Save user settings into config.json file
ipcMain.handle("save-config", (event, newConfig) => {
  fs.writeFileSync(configPath, JSON.stringify(newConfig));
});

// Install mods
ipcMain.handle("install-mod", async (event, gameObj) => {
  const loadConfig = async () => {
    if(fs.existsSync(configPath)) {    
      const data = await fs.readFileSync(configPath, 'utf-8');
      if(data) return JSON.parse(data);
    }
    return [];
  }
  
  const modsPath = path.join(userDataPath, gameObj.folder, "mods");
  const config = await loadConfig();  

  let newConfig = {
    ...config,
    settings: {isLoading: true}
  }

  await fs.writeFileSync(configPath, JSON.stringify(newConfig));  

  dialog.showOpenDialog({
    properties: ["multiSelections", "openDirectory"],
    title: "Select your mods",
  }).then(async (result) => {
    if(result.canceled) {
      newConfig = {
        ...config,
        settings: {isLoading: false}
      }
    
      await fs.writeFileSync(configPath, JSON.stringify(newConfig));

      return;
    }

    const selectedDirectories = result.filePaths;

    let allFilePaths = [];

    selectedDirectories.forEach(async (directory) => {
      const folderName = path.basename(directory);
      const files = getAllFiles(directory);

      const backupPath = path.join(userDataPath, gameObj.folder, "backup", folderName);

      const modsFileName = [];
      const modFiles = [];

      files.forEach(file => {
        allFilePaths.push({ filePath: file, folderName: folderName });
        console.log("path.basename(file)", path.basename(file));
        // modsFileName.push({game: gameObj.folder, mod: folderName, file: path.basename(file)})
        modFiles.push(path.basename(file))/

        searchAndCopyFile(gameObj.game_path, path.basename(file), backupPath);
      });

      modsFileName.push({game: gameObj.folder, mod: folderName, files: modFiles});

      newConfig = {
        ...config,
        settings: {isLoading: true},
        modsFileName
      }
    
      await fs.writeFileSync(configPath, JSON.stringify(newConfig));
    });

    await copyFiles(allFilePaths).then(async () => {
      let currentConfig = await loadConfig();

      const newConfig = {
        ...currentConfig,
        settings: {isLoading: false}
      }

      await fs.writeFileSync(configPath, JSON.stringify(newConfig));
    });
  }).catch(err => {
    console.error(err);
  });

  const copyFiles = async (filePaths) => {
    filePaths.forEach(({ filePath, folderName }) => {
      const destinationPath = path.join(modsPath, folderName, path.basename(filePath));

      fsExtra.copy(filePath, destinationPath, (err) => {

      });
    });
  }

  const getAllFiles = (dirPath, arrayOfFiles = []) => {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      
      if(fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
      else {
        arrayOfFiles.push(fullPath);
      }
    });

    return arrayOfFiles;
  };

  const searchAndCopyFile = (dirPath, filename, targetDir) => {
    const files = fs.readdirSync(dirPath);
  
    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
  
      if(fs.statSync(fullPath).isDirectory()) {
        searchAndCopyFile(fullPath, filename, targetDir);
      }
      else if(file === filename) {                
        console.log("fullPath", fullPath);
        
        const mainFolder = gameObj.game_path.split("\\").pop();

        const destinationPath = path.join(targetDir, mainFolder, fullPath.split(mainFolder).pop());
        console.log("destinationPath", destinationPath);
        
        
        copyFilesPromise(fullPath, destinationPath, filename, dirPath);

      }
    });
  };

  const copyFilesPromise = async (fullPath, destinationPath, filename, dirPath) => {
    try {
      await fsExtra.copy(fullPath, destinationPath);
      copyFilesToGame(modsPath, filename, dirPath);

    } catch (err) {
      console.log("ERRO AQUI", err);
    }
  }

  const copyFilesToGame = (dirPath, filename, targetDir) => {
    const files = fs.readdirSync(dirPath);

    console.log("dirPath", dirPath);
    console.log("targetDir", targetDir);
    
    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      console.log("fullPath", fullPath);
      console.log("file", file);
  
      if(fs.statSync(fullPath).isDirectory()) {
        copyFilesToGame(fullPath, filename, targetDir);
      }
      else if(file === filename) {
        const destinationPath = path.join(targetDir, filename);
        console.log("destinationPath", destinationPath);

        try {
          fsExtra.copy(fullPath, destinationPath, (err) => {
            if(err) {
              console.error("ERROR 1", err);
            }
            else {
              console.log("SUCESSO");
            }
          });  
        } catch (error) {
          
        }

      }
    });
    
  }
});

// Remove mods
ipcMain.handle("remove-mod", async (event, gameObj, modObj) => {
  const mainFolder = gameObj.game_path.split("\\").pop();
  
  const backupPath = path.join(userDataPath, gameObj.folder, "backup", modObj.title);
  const gamepath = path.join(gameObj.game_path.split(mainFolder)[0]);

  console.log("backupPath", backupPath);
  console.log("gamepath", gamepath);

  await fsExtra.copy(backupPath, gamepath).then((err) => {
    if(err) {
      console.error("ERROR", err);
    }
    else {
      console.log("DESINSTALADO");
    }
  })
});

// Uninstall mods
ipcMain.handle("uninstall-mod", async (event, gameObj, modObj) => {
  const mainFolder = gameObj.game_path.split("\\").pop();
  
  const backupPath = path.join(userDataPath, gameObj.folder, "backup", modObj.title);
  const gamepath = path.join(gameObj.game_path.split(mainFolder)[0]);

  console.log("backupPath", backupPath);
  console.log("gamepath", gamepath);

  await fsExtra.copy(backupPath, gamepath).then((err) => {
    if(err) {
      console.error("ERROR", err);
    }
    else {
      console.log("DESINSTALADO");
      fsExtra.remove(backupPath, (err) => {
        if(err) {
          console.log("ERRO", err)
        }
        else{
          console.log("REMOVIDO da pasta")
        }
      })
    }
  })
});

// Append mods
ipcMain.handle("append-mod", async (event, gameObj, modObj) => {  
  const mainFolder = gameObj.game_path.split("\\").pop();

  const dirPath = path.join(userDataPath, gameObj.folder, "mods", modObj.title);
  const backupPath = path.join(userDataPath, gameObj.folder, "backup", modObj.title, modObj.modPath);

  console.log("dirPath", dirPath);
  console.log("backupPath", backupPath);

  async function getFileNames(directory) {
    try {
      const files = await fsExtra.readdir(directory);
      return files;
    } catch (error) {
      console.error(`Error reading directory ${directory}:`, error);
      return [];
    }
  }
  
  // Function to compare file names in two directories
  async function compareDirectories(dir1, dir2) {
    try {
      const filesDir1 = await getFileNames(dir1);
      const filesDir2 = await getFileNames(dir2);
  
      // Get common files in both directories
      const commonFiles = filesDir1.filter(file => filesDir2.includes(file));
  
      return commonFiles;
    } catch (error) {
      console.error('Error comparing directories:', error);
      return [];
    }
  }

  compareDirectories(dirPath, backupPath)
  .then(commonFiles => {
    console.log('Files found in both directories:', commonFiles);

    commonFiles.forEach(async (file) => {
      const modPath = path.join(dirPath, file);
      const gamepath = path.join(gameObj.game_path, modObj.modPath.split(mainFolder).pop(), file);

      console.log("modPath", modPath);
      console.log("gamepath", gamepath);

      await fsExtra.copy(modPath, gamepath).then((err) => {
        if(err) {
          console.error("ERROR", err);
        }
        else {
          console.log("APPEND");
        }
      })
    })
  })
  .catch(error => {
    console.error('Error:', error);
  });
  


});

// Get mod list
ipcMain.handle("load-mod-list", async (event, gameObj) => {  
  const loadConfig = async () => {
    if(fs.existsSync(configPath)) {    
      const data = await fs.readFileSync(configPath, 'utf-8');
      if(data) return JSON.parse(data);
    }
    return [];
  }

  const saveConfig = async () => {
    const config = await loadConfig();

    const modsPath = path.join(userDataPath, gameObj.folder, "mods");
    const folders = await getFoldersInDirectory(modsPath);

    const mods = [];

    // Create a map of existing mods for quick lookup by title
    const existingModsMap = new Map(config.mods.map(mod => [mod.title, mod]));

    for(const folder of folders) {
      let directories = '';
      let backupPath = path.join(userDataPath, gameObj.folder, "backup", folder);
      let directory = getDirectories(backupPath);
    
      const imagePaths = path.join(modsPath, folder);
      const images = await hasImagesInFolder(imagePaths);
      let previewImage = '';
    
      if(images.length > 0) {
        previewImage = path.join(modsPath, folder, images[0]);        
      }
    
      while(directory.length) {
        directories = directories.concat("\\", directory[0]);
        backupPath = path.join(backupPath, directory[0]);
        directory = getDirectories(backupPath);
      }
    
      const existingMod = existingModsMap.get(folder);
    
      const modObj = {
        id: existingMod ? existingMod.id : uuid.v4(),
        title: folder,
        selected: existingMod ? existingMod.selected : true,
        game: gameObj.folder,
        modPath: directories,
        // fileNames: [],
        previewImage
      };
    
      mods.push(modObj);
    }
    

    const newConfig = {...config, mods};
    console.log("config6", newConfig);

    await fs.writeFileSync(configPath, JSON.stringify(newConfig));

    return newConfig;
  }

  function getDirectories(path) {
    return fs.readdirSync(path).filter(function (file) {
      return fs.statSync(path+'/'+file).isDirectory();
    });
  }


  async function getFoldersInDirectory(directoryPath) {
    try {
      console.log("directoryPath", directoryPath);
      
      const items = await fsExtra.readdir(directoryPath);
      
      const folders = await Promise.all(items.map(async item => {
        const itemPath = path.join(directoryPath, item);
        const stats = await fsExtra.stat(itemPath);
        return stats.isDirectory() ? item : null;
      }));

      console.log("folders", folders);
  
      return folders.filter(Boolean);
    } catch (err) {
      console.error('Error reading the directory:', err);
      return [];
    }
  }

  async function hasImagesInFolder(directoryPath) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

    try {
      const items = await fsExtra.readdir(directoryPath);
  
      // Check for image files based on their extension
      const images = items.filter(item => {
        const itemPath = path.join(directoryPath, item);
        const ext = path.extname(itemPath).toLowerCase();
        return imageExtensions.includes(ext);
      });

      return images;
    } catch (err) {
      console.error('Error reading the directory for images:', err);
      return false;
    }
  }

  return await saveConfig();
});


const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1200,
    minWidth: 700,
    height: 700,
    minHeight: 700,
    title: "Jada Mod Manager",
    fullscreen: false,
    resizable: true,
    // icon: path.join(__dirname, "src/assets/icon.ico"),
    autoHideMenuBar: true,    
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
  })

  win.loadURL(`file://${path.join(__dirname, "../build/index.html")}`);
  // win.loadURL("http://localhost:3000");
  // win.webContents.openDevTools();
}

const protocolName = "local-path";
protocol.registerSchemesAsPrivileged([
  { scheme: protocolName, privileges: { bypassCSP: true } },
]);

app.whenReady().then(() => {
  createWindow();

  protocol.registerFileProtocol(protocolName, (request, callback) => {
    const url = request.url.replace(`${protocolName}://`, "");
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      // Handle the error as needed
      console.error(error);
    }
  });
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});