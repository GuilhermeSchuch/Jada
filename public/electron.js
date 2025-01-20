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
const { exec, execSync } = require("node:child_process");

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
      "game_executable": "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Resident Evil 6\\BH6.exe",
      "folder": "RE6"
    },
    {
      "id": 2,
      "name": "Resident Evil 5",
      "selected": false,
      "hierarchy": "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Resident Evil 5\\nativePC",
      "game_executable": "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Resident Evil 6\\BH5.exe",
      "folder": "RE5"
    }
  ],
  "mods": [],
  "modsFileName": [],
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

  // initialConfig.games.forEach((game) => {
  //   fs.mkdirSync(`${userDataPath}\\${game.folder}`, { recursive: true })
  //   fs.mkdirSync(`${userDataPath}\\${game.folder}\\backup`, { recursive: true })
  //   fs.mkdirSync(`${userDataPath}\\${game.folder}\\mods`, { recursive: true })
  // })

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

  let allFilePaths = [];

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

    let duplicateMods = [];
    let duplicateFiles = [];
    let fileExists;

    const isModSelected = (modName) => {
      return config.mods.some(
        (mod) => mod.title === modName && mod.selected
      )
    }

    selectedDirectories.forEach(async (directory) => {
      const folderName = path.basename(directory);
      const files = getAllFiles(directory);

      const modExists = config.mods.some(
        (mod) => {
          if(mod.title === folderName && mod.game === gameObj.folder) {
            duplicateMods.push({existingMod: mod.title, uncopiedMod: folderName});
          }
        }
      );

      if(duplicateMods.length > 0) {
        const duplicateModsMessage = duplicateMods
          .map(
            (mod) => `- Existing Mod: ${mod.existingMod}, Uncopied Mod: ${mod.uncopiedMod}`
          )
          .join("\n");

        dialog.showMessageBox({
          type: "warning",
          title: "Jada",
          message: `The following mods already exist and were not copied:\n\n${duplicateModsMessage}\n\nPlease uninstall these mods before proceeding.`,
        }).then(async () => {
          const config = await loadConfig();
    
          const newConfig = {
            ...config,
            settings: { isLoading: false },
          };
    
          await fs.writeFileSync(configPath, JSON.stringify(newConfig));
        });
      
        return;
      }

      const backupPath = path.join(userDataPath, gameObj.folder, "backup", folderName);

      const modsFileName = [];
      const modFiles = [];

      files.forEach(file => {
        const fileName = path.basename(file);

        // Check if the file already exists
        fileExists = config.modsFileName.some(
          (mod) => {
            if(mod.files.includes(fileName) && mod.game === gameObj.folder) {
              if(isModSelected(mod.mod)) {
                return true;
              }
            }
            else {
              return false;
            }
          }
        );
        
        if(fileExists) {
          duplicateFiles.push(path.basename(file));
          console.log("duplicateFiles", duplicateFiles);
        }
        else {
          if(!duplicateFiles.length) {
            searchAndCopyFile(gameObj.game_path, path.basename(file), backupPath);
    
            allFilePaths.push({ filePath: file, folderName: folderName });
            console.log("allFilePaths", allFilePaths);

            console.log("path.basename(file)", path.basename(file));

            const modExtension = path.basename(file).split('.').pop();
            const extensions = [
              "info", "ini", "jpeg", "png", "webp", "jpg"
            ]

            if(!extensions.includes(modExtension) && !path.basename(file).toLowerCase().includes("readme")) {
              modFiles.push(path.basename(file));
            }
          }
        }
      });

      if(!fileExists && !duplicateFiles.length) {
        modsFileName.push({game: gameObj.folder, mod: folderName, files: modFiles});
  
        newConfig = {
          ...config,
          settings: {isLoading: true},
          modsFileName: [...config.modsFileName, ...modsFileName]
        }
      }
      else {
        newConfig = {
          ...config,
          settings: {isLoading: true},
        }
      }
    
      await fs.writeFileSync(configPath, JSON.stringify(newConfig));
    });

    if(duplicateFiles.length > 0) {
      dialog.showMessageBox({
        title: "Jada",
        type: "warning",
        message: `The mod was not installed!\n\nMods if the following files already exist and were not copied: ${duplicateFiles.join(", ")}`,
      }).then(async () => {
        const config = await loadConfig();

        newConfig = {
          ...config,
          settings: {isLoading: false},
        }
      
        await fs.writeFileSync(configPath, JSON.stringify(newConfig));
      })
      return;
    }

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
    })
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

  let filesCopied = [];

  const copyFilesToGame = async (dirPath, filename, targetDir) => {
    const files = fs.readdirSync(dirPath);

    console.log("FILENAME: ", filename);
  
    console.log("dirPath", dirPath);
    console.log("targetDir", targetDir);
  
    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      console.log("fullPath", fullPath);
      console.log("file", file);
  
      if(fs.statSync(fullPath).isDirectory()) {
        copyFilesToGame(fullPath, filename, targetDir);
      }
      else if (file === filename) {
        filesCopied.push(filename);
        const destinationPath = path.join(targetDir, filename);
        console.log("destinationPath", destinationPath);
  
        let attempt = 0;
        const maxRetries = 3;
  
        const tryCopy = () => {
          try {
            fsExtra.copySync(fullPath, destinationPath, { overwrite: true });
            console.log("SUCESSO: Arquivo copiado.");

            console.log("filesCopied", filesCopied);
            console.log("allFilePaths", allFilePaths);

            function validateCopiedFiles() {
              
            }

          } catch (err) {
            if (err.code === 'EBUSY' && attempt < maxRetries) {
              console.log(`Arquivo ocupado, tentativa ${attempt + 1} de ${maxRetries}...`);
              attempt++;
              setTimeout(tryCopy, 500); // Aguarda 500ms antes de tentar novamente
            } else {
              console.error("ERRO: Falha ao copiar arquivo:", err);
            }
          }
        };
  
        tryCopy(); // Chama a lógica de cópia com tentativas
      }
    });

    let currentConfig = await loadConfig();

      const newConfig = {
        ...currentConfig,
        settings: {isLoading: false}
      }

      await fs.writeFileSync(configPath, JSON.stringify(newConfig));
  };
  
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
  console.log("UNISTALL!!!");

  const mainFolder = gameObj.game_path.split("\\").pop();

  const loadConfig = async () => {
    if(fs.existsSync(configPath)) {    
      const data = await fs.readFileSync(configPath, 'utf-8');
      if(data) return JSON.parse(data);
    }
    return [];
  }
  
  const config = await loadConfig();

  let newConfig = {
    ...config,
    settings: {isLoading: true}
  }

  await fs.writeFileSync(configPath, JSON.stringify(newConfig));
  
  const backupPath = path.join(userDataPath, gameObj.folder, "backup", modObj.title);
  const modPath = path.join(userDataPath, gameObj.folder, "mods", modObj.title);
  const gamepath = path.join(gameObj.game_path.split(mainFolder)[0]);

  console.log("backupPath", backupPath);
  console.log("modPath", modPath);
  console.log("gamepath", gamepath);

  await fsExtra.copy(backupPath, gamepath).then(async (err) => {
    if(err) {
      console.error("ERROR", err);
    }
    else {
      console.log("DESINSTALADO");

      await removeFromFolder();
    }
  })

  async function removeFromFolder() {
    try {
      fsExtra.remove(backupPath, async (err) => {
        if(err) {
          console.log("ERRO", err)
        }
        else{
          console.log("REMOVIDO da pasta")

          fsExtra.remove(modPath, async (err) => {
            if(err) {
              console.log("ERRO", err)
            }
            else{
              console.log("REMOVIDO da pasta")
              let modsFileName = config.modsFileName.filter(mod => mod.mod !== modObj.title);

              newConfig = {
                ...config,
                modsFileName,
                settings: {isLoading: false}
              }

              await fs.writeFileSync(configPath, JSON.stringify(newConfig));
            }
          })
        }
      })
    } catch (error) {
      
    }

  }
});

// Append mods
ipcMain.handle("append-mod", async (event, gameObj, modObj) => {
  let showError = false;

  const loadConfig = async () => {
    if(fs.existsSync(configPath)) {    
      const data = await fs.readFileSync(configPath, 'utf-8');
      if(data) return JSON.parse(data);
    }
    return [];
  }

  const getAllFiles = (dirPath, arrayOfFiles = []) => {
    const files = fs.readdirSync(dirPath);
  
    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
  
      if (fs.statSync(fullPath).isDirectory()) {
        // Recursively call `getAllFiles`, ensuring `arrayOfFiles` is passed correctly
        getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    });
  
    return arrayOfFiles;
  };
  
  const config = await loadConfig();

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

  function shouldExcludeFile(file) {
    const excludedExtensions = [
      ".config", 
      ".info",
      ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp",
      ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mpeg", ".mpg",
    ];
    return excludedExtensions.some((ext) => file.toLowerCase().endsWith(ext));
  }
  
  // Function to compare file names in two directories
  // async function compareDirectories(dir1, dir2) {
  //   try {
  //     const filesDir1 = await getFileNames(dir1);
  //     const filesDir2 = await getFileNames(dir2);
  
  //     // Get common files in both directories
  //     const commonFiles = filesDir1.filter(file => filesDir2.includes(file));
  
  //     return commonFiles;
  //   } catch (error) {
  //     console.error('Error comparing directories:', error);
  //     return [];
  //   }
  // }

  async function compareDirectories(dir1, dir2) {
    try {
      const filesDir1 = await getFileNames(dir1);
      const filesDir2 = await getFileNames(dir2);
  
      // Filter out excluded files
      const filteredDir1 = filesDir1.filter((file) => !shouldExcludeFile(file));
      const filteredDir2 = filesDir2.filter((file) => !shouldExcludeFile(file));
  
      // Get common files in both directories
      const commonFiles = filteredDir1.filter((file) => filteredDir2.includes(file));
  
      return commonFiles;
    } catch (error) {
      console.error('Error comparing directories:', error);
      return [];
    }
  }

  try {
    const commonFiles = await compareDirectories(dirPath, backupPath);

    console.log('Files found in both directories:', commonFiles);

    const files = await getAllFiles(path.join(userDataPath, gameObj.folder, "mods"));
    let otherModsName = [];
    let otherModsPath = [];
    let modsWithSameFiles = [];
    let allMods = [];

    files.forEach(async (file) => {
      if(!file.includes(`\\${modObj.title}\\`)) {
        const match = file.match(/mods\\([^\\]+)\\/);
        const directoryPath = file.match(/^(.*\\mods\\[^\\]*)/)[1];

        console.log("directoryPath", directoryPath);

        if(match && match[1] && !otherModsName.includes(match[1])) {
          otherModsName.push(match[1]);
          otherModsPath.push(directoryPath);
        }
      }
    })
    
    config.mods.forEach((mod) => allMods.push(mod));

    console.log("otherModsName", otherModsName);
    console.log("otherModsPath", otherModsPath);

    for (const [index, path] of otherModsPath.entries()) {
      const commonFiles = await compareDirectories(path, dirPath);
      if(commonFiles.length) {
        const modExtension = path.basename(otherModsName[index]).split('.').pop();
        const extensions = [
          ".info", ".ini", "jpeg", "png", "webp", "jpg"
        ]

        if(!extensions.includes(modExtension)) {
          modsWithSameFiles.push(otherModsName[index]);
        }
      }
    }

    console.log("modsWithSameFiles", modsWithSameFiles);

    // console.log("files", files);
    // console.log("modObj.title", modObj.title);
    // console.log("otherModsName", otherModsName);
    // console.log("allMods", allMods);

    modsWithSameFiles.forEach((modName) => {
      const modFound = allMods.find((teste) => teste.title == modName);
      if(modFound) {
        if (modFound.selected) showError = true;
      }
    })

    if(showError) {
      const duplicateModsMessage = modsWithSameFiles
      .map(
        (mod) => `- ${mod}`
      )
      .join("\n");

      dialog.showMessageBox({
        type: "warning",
        title: "Jada",
        message: `The mod could not be appended because the following mods already have these files:\n\n${duplicateModsMessage}\n\nPlease deactivate these mods before proceeding.`,
      }).then(async () => {
        const config = await loadConfig();

        const newConfig = {
          ...config,
          settings: { isLoading: false },
        };

        await fs.writeFileSync(configPath, JSON.stringify(newConfig));
      });
    
      return { modObj, error: true };
    }

    commonFiles.forEach(async (file) => {
      const modPath = path.join(dirPath, file);
      const gamepath = path.join(gameObj.game_path, modObj.modPath.split(mainFolder).pop(), file);

      // console.log("modPath", modPath);
      // console.log("gamepath", gamepath);

      // console.log("morgmonoada", file);

      // const fileExists = config.modsFileName.some(
      //   (mod) => {
      //     if(mod.files.includes(file) && mod.game === gameObj.folder) {
      //       if(isModSelected(mod.mod)) {
      //         return true;
      //       }
      //     }
      //     else {
      //       return false;
      //     }
      //   }
      // );

      // console.log("fileExists 13", fileExists)

      await fsExtra.copy(modPath, gamepath).then((err) => {
        if(err) {
          console.error("ERROR", err);
        }
        else {
          console.log("APPEND");
        }
      })
    })


  } catch (error) {
    console.log("ERROR 18", error);
    return { modObj, error: true };
  }

  return { modObj, error: false };
});

// Get mod list
// ipcMain.handle("load-mod-list", async (event, gameObj) => {  
//   const loadConfig = async () => {
//     if(fs.existsSync(configPath)) {    
//       const data = await fs.readFileSync(configPath, 'utf-8');
//       if(data) return JSON.parse(data);
//     }
//     return [];
//   }

//   const saveConfig = async () => {
//     const config = await loadConfig();

//     const modsPath = path.join(userDataPath, gameObj.folder, "mods");
//     const folders = await getFoldersInDirectory(modsPath);

//     const mods = [];

//     // Create a map of existing mods for quick lookup by title
//     const existingModsMap = new Map(config.mods.map(mod => [mod.title, mod]));

//     for(const folder of folders) {
//       let directories = '';
//       let backupPath = path.join(userDataPath, gameObj.folder, "backup", folder);
//       let directory = getDirectories(backupPath);
    
//       const imagePaths = path.join(modsPath, folder);
//       const images = await hasImagesInFolder(imagePaths);
//       let previewImage = '';
    
//       if(images.length > 0) {
//         previewImage = path.join(modsPath, folder, images[0]);        
//       }      
    
//       while(directory.length) {
//         directories = directories.concat("\\", directory[0]);
//         backupPath = path.join(backupPath, directory[0]);
//         directory = getDirectories(backupPath);
//       }
    
//       const existingMod = existingModsMap.get(folder);
    
//       const modObj = {
//         id: existingMod ? existingMod.id : uuid.v4(),
//         title: folder,
//         selected: existingMod ? existingMod.selected : true,
//         game: gameObj.folder,
//         modPath: directories,
//         previewImage
//       };
    
//       mods.push(modObj);
//     }
    

//     const newConfig = {...config, mods};
//     console.log("config6", newConfig);

//     await fs.writeFileSync(configPath, JSON.stringify(newConfig));

//     return newConfig;
//   }

//   function getDirectories(path) {
//     return fs.readdirSync(path).filter(function (file) {
//       return fs.statSync(path+'/'+file).isDirectory();
//     });
//   }

//   async function getFoldersInDirectory(directoryPath) {
//     try {
//       console.log("directoryPath", directoryPath);
      
//       const items = await fsExtra.readdir(directoryPath);
      
//       const folders = await Promise.all(items.map(async item => {
//         const itemPath = path.join(directoryPath, item);
//         const stats = await fsExtra.stat(itemPath);
//         return stats.isDirectory() ? item : null;
//       }));

//       console.log("folders", folders);
  
//       return folders.filter(Boolean);
//     } catch (err) {
//       console.error('Error reading the directory:', err);
//       return [];
//     }
//   }

//   async function hasImagesInFolder(directoryPath) {
//     const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

//     try {
//       const items = await fsExtra.readdir(directoryPath);
  
//       // Check for image files based on their extension
//       const images = items.filter(item => {
//         const itemPath = path.join(directoryPath, item);
//         const ext = path.extname(itemPath).toLowerCase();
//         return imageExtensions.includes(ext);
//       });

//       return images;
//     } catch (err) {
//       console.error('Error reading the directory for images:', err);
//       return false;
//     }
//   }

//   return await saveConfig();
// });

ipcMain.handle("load-mod-list", async (event, gameObj) => {
  const loadConfig = async () => {
    try {
      if (fs.existsSync(configPath)) {
        const data = await fs.readFileSync(configPath, "utf-8");
        if (data) return JSON.parse(data);
      }
    } catch (err) {
      console.error("Error loading config:", err);
    }
    return [];
  };

  const saveConfig = async () => {
    try {
      const config = await loadConfig();
      const modsPath = path.join(userDataPath, gameObj.folder, "mods");
      const folders = await getFoldersInDirectory(modsPath);

      const mods = [];
      const existingModsMap = new Map(config.mods.map((mod) => [mod.title, mod]));

      for (const folder of folders) {
        let directories = "";
        let backupPath = path.join(userDataPath, gameObj.folder, "backup", folder);

        let directory = getDirectories(backupPath);
        const imagePaths = path.join(modsPath, folder);
        const images = await hasImagesInFolder(imagePaths);
        let previewImage = "";

        if (images.length > 0) {
          previewImage = path.join(modsPath, folder, images[0]);
        }

        while (directory.length) {
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
          previewImage,
        };

        mods.push(modObj);
      }

      const newConfig = { ...config, mods };
      console.log("config6", newConfig);

      await fs.writeFileSync(configPath, JSON.stringify(newConfig));
      return newConfig;
    } catch (err) {
      console.error("Error saving config:", err);
      return { mods: [] }; // Return an empty mods list in case of error
    }
  };

  const getDirectories = (dirPath) => {
    try {
      return fs.readdirSync(dirPath).filter((file) =>
        fs.statSync(path.join(dirPath, file)).isDirectory()
      );
    } catch (err) {
      console.error("Error reading directories:", err);
      return [];
    }
  };

  const getFoldersInDirectory = async (directoryPath) => {
    try {
      const items = await fsExtra.readdir(directoryPath);
      const folders = await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(directoryPath, item);
          const stats = await fsExtra.stat(itemPath);
          return stats.isDirectory() ? item : null;
        })
      );
      return folders.filter(Boolean);
    } catch (err) {
      console.error("Error reading the directory:", err);
      return [];
    }
  };

  const hasImagesInFolder = async (directoryPath) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif"];
    try {
      const items = await fsExtra.readdir(directoryPath);
      const images = items.filter((item) => {
        const itemPath = path.join(directoryPath, item);
        const ext = path.extname(itemPath).toLowerCase();
        return imageExtensions.includes(ext);
      });
      return images;
    } catch (err) {
      console.error("Error reading the directory for images:", err);
      return [];
    }
  };

  try {
    return await saveConfig();
  } catch (err) {
    console.error("Error in load-mod-list handler:", err);
    return { error: "Failed to load mod list. Please try again later." };
  }
});

// Add game to config.json file
ipcMain.handle("add-game", async (event, gameObj) => {
  const loadConfig = async () => {
    if(fs.existsSync(configPath)) {    
      const data = await fs.readFileSync(configPath, 'utf-8');
      if(data) return JSON.parse(data);
    }
    return [];
  }

  const getGameFolders = (data) => {
    if(!data || !Array.isArray(data.games)) {
      throw new Error("O objeto fornecido não contém um array 'games'.");
    }
  
    return data.games.map(game => game.folder);
  }

  const generateFolderName = (name) => {
    const existingFolders = getGameFolders(config);
    let folder = '';

    if(name.includes(' ')) {
      name.split(' ').forEach((breakedName) => {
        folder += Array.from(breakedName)[0]        
      })
    }
    else {
      folder = name;
    }
    
    let suffix = 1;
    let uniqueFolder = folder;

    while(existingFolders.includes(uniqueFolder)) {
      uniqueFolder = folder.substring(0, 10 - suffix.toString().length) + suffix;
      suffix++;
    }
  
    return uniqueFolder.toUpperCase();
  }

  let config = await loadConfig();

  let newConfig = {
    ...config,
    settings: { isLoading: true }
  }

  const newGameObj = {
    id: uuid.v6(),
    name: gameObj.game_name,
    selected: false,
    game_path: gameObj.game_path,
    folder: generateFolderName(gameObj.game_name)
  }

  console.log("newGameObj", newGameObj);

  newConfig = {
    ...config,
    settings: { isLoading: false },
    games: [...config.games, newGameObj]
  }

  try {
    await fs.writeFileSync(configPath, JSON.stringify(newConfig));
  } catch (error) {
    console.log("error", error);
  }

});

// Launche game exe
ipcMain.handle("launch-game", async (event, gameObj) => {  
  try {
    if(gameObj.game_executable.includes("steam")) {
      const steamAppsPath = path.join("C:\\Program Files (x86)\\Steam\\steamapps");
      const gameFolderName = path.basename(path.dirname(gameObj.name));
      
      const acfFiles = fs.readdirSync(steamAppsPath).filter(file => file.endsWith(".acf"));
  
      let appId = null;
  
      for(const acfFile of acfFiles) {
        const acfFilePath = path.join(steamAppsPath, acfFile);
        const content = fs.readFileSync(acfFilePath, "utf8");
  
        if(content.toLowerCase().includes(gameFolderName.toLowerCase())) {
          appId = path.basename(acfFile).match(/\d+/)[0];
          break;
        }
      }
  
      if(!appId) {
        throw new Error(`Could not determine appid for game: ${gameFolderName}`);
      }
  
      const isSteamRunning = execSync("tasklist").toString().toLowerCase().includes("steam.exe");
      if(!isSteamRunning) {
        execSync('"C:\\Program Files (x86)\\Steam\\Steam.exe"');
      }
      
      exec(`start steam://run/${appId}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error launching game: ${error.message}`);
          return;
        }
        console.log(`Game launched successfully (appid: ${appId})`);
      });
    }
    else {
      const quotedPath = `"${gameObj.game_executable}"`;
      exec(quotedPath, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error launching game: ${error.message}`);
          return;
        }
        console.log(`Game launched successfully`);
      });
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
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

  // win.loadURL(`file://${path.join(__dirname, "../build/index.html")}`);
  win.loadURL("http://localhost:3000");
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