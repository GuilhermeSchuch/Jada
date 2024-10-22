// CSS
import "./Home.css";

// Components
import {
  DialogSelector,
  PrimaryButton,
  Checkbox,
  Loader,
  Footer
} from "../../components";

// Hooks
import { useEffect, useState } from "react";

const Home = () => {
  const [configData, setConfigData] = useState([]);
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [files, setFiles] = useState([]);
  const [mods, setMods] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const saveConfiguration = async (newGames) => {
    const config = {...configData, games: newGames}
    setGames(newGames);

    window?.electronAPI?.saveConfig(config);
  }

  useEffect(() => {
    const getData = async () => {
      const data = await window.electronAPI.loadConfig();

      if(data) {
        console.log("games", data.games);
        setConfigData(data);
        setGames(data.games);
      }
    }

    getData();
  }, []);
  

  const handleSelection = (item) => {
    console.log("Item selected", item);
    setSelectedGame(item);

    if(item.folder === "RE6" || item.name === "Resident Evil 6") {
      document.body.style.backgroundImage = `url("/assets/images/re6.jpg")`;
    }

    const newGames = games.map((game) =>
      game.id === item.id ? { ...game, selected: true } : game
    );

    saveConfiguration(newGames);
    getMods(item);
  };
  
  const installMods = async () => {
    setIsLoading(true);

    const data = await window?.electronAPI?.installMod(selectedGame);
    setConfigData(data);    

    if(data?.mods) {
      setMods(data.mods);
    }

    let loadSettings;

    const attempter = setInterval(async () => {
      loadSettings = await window.electronAPI.loadConfig();

      if(loadSettings.settings) {
        console.log("loadSettings.settings", loadSettings.settings);

        if(!loadSettings.settings.isLoading) {
          setIsLoading(false);
          clearInterval(attempter);
          getMods(selectedGame);
        }
      }
    }, 3000)
  }

  const getMods = async (gameObj) => {
    const data = await window.electronAPI.loadModList(gameObj);

    if(data?.mods) {
      setMods(data.mods);
    }
  }

  const onSelectionChange = (id) => {
    let changedMod = {};

    mods.map((mod) => {
      if(mod.id === id) changedMod = {...mod, selected: !mod.selected};
    });

    const updatedMods = mods.map((mod) =>
      mod.id === id ? { ...mod, selected: !mod.selected } : mod
    );

    setMods(updatedMods);
  
    const updatedConfig = { ...configData, games, mods: updatedMods };
    console.log("updatedConfig", updatedConfig);

    window?.electronAPI?.saveConfig(updatedConfig);

    if(!changedMod.selected) {
      window.electronAPI.uninstallMod(selectedGame, changedMod);
    }
    else {
      window.electronAPI.appendMod(selectedGame, changedMod);
    }
  };

  return (
    <div className="container-fluid">
      <div className="col-12">
        <div>
          <h1 className="text-center mt-3">Jada Mod Manager</h1>
        </div>

        <main className="d-flex mt-5">
          <div className="col-2"></div>

          <div className={selectedGame ? "mod-list col mx-5 p-2" : "col"}>
            {selectedGame && (
              <>
                <h2>Mod list</h2>

                <div className="mt-2">
                  {mods && mods.map((mod) => (
                    <Checkbox
                      key={mod.id}
                      data={mod}
                      onSelectionChange={() => onSelectionChange(mod.id)}
                    />                    
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="col-2 buttons-container">
            <DialogSelector
              data={games}
              title="Choose game"
              handleSelection={handleSelection}
            />

            {selectedGame && (
              <>
                <PrimaryButton onClick={installMods}>Install mods</PrimaryButton>

                <PrimaryButton onClick={() => getMods(selectedGame)}>Refresh mods</PrimaryButton>
              </>
            )}
          </div>

          {isLoading && (
            <div className="backdrop">
              <Loader />
              <p className="mt-3">Please wait</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Home