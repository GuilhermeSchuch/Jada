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
import useUpdateButtonsOnResize from "../../hooks/useUpdateButtonsOnResize";

// Swal
import Swal from "sweetalert2";

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
  
  useUpdateButtonsOnResize("primary-button", 800, selectedGame);


  const handleSelection = (item) => {
    console.log("Item selected", item);
    setSelectedGame(item);

    if(item.folder === "RE6" || item.name === "Resident Evil 6") {
      const imagePath = `${window.location.origin}/resources/assets/images/re6.jpg`;
      document.body.style.backgroundImage = `url(${imagePath})`;

      // document.body.style.backgroundImage = `url("/assets/images/re6.jpg")`;
    }
    else if(item.folder === "RE5" || item.name === "Resident Evil 5") {
      const imagePath = `${window.location.origin}/resources/assets/images/re5.jpg`;
      document.body.style.backgroundImage = `url(${imagePath})`;

      // document.body.style.backgroundImage = `url("/assets/images/re5.jpg")`;
    }
    else if(item.folder === "RE4R" || item.name === "Resident Evil 4 (Remake)") {
      const imagePath = `${window.location.origin}/resources/assets/images/re4r.webp`;
      document.body.style.backgroundImage = `url(${imagePath})`;

      // document.body.style.backgroundImage = `url("/assets/images/re4.webp")`;
    }

    const newGames = games.map((game) =>
      game.id === item.id ? { ...game, selected: true } : game
    );

    saveConfiguration(newGames);
    getMods(item);
  };

  const handleDeleteGame = async (gameToDelete) => {
    console.log("gameToDelete", gameToDelete);

    Swal.fire({
      title: "Delete this game and all the mods installed?",
      text: "You won't be able to revert this!",
      icon: "warning",
      background: "rgb(12, 12, 10)",
      color: "#EEEEEE",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if(result.isConfirmed) {
        setIsLoading(true);

        const config = await window.electronAPI.loadConfig();
        const games = config.games.filter((game) => game.id !== gameToDelete.id)

        const newConfig = {
          ...config,
          games
        }

        await window?.electronAPI?.saveConfig(newConfig);
        setGames(games);
        setIsLoading(false);

        Swal.fire({
          title: "Success!",
          background: "rgb(12, 12, 10)",
          confirmButtonColor: "#3085d6",
          color: "#EEEEEE",
          text: "Your game has been deleted.",
          icon: "success"
        });
      }
    });
  }
  
  const installMods = async () => {
    setIsLoading(true);

    const data = await window?.electronAPI?.installMod(selectedGame);
    // setConfigData(data);

    // if(data?.mods) {
    //   setMods(data.mods);
    // }

    let loadSettings;

    const attempter = setInterval(async () => {
      loadSettings = await window.electronAPI.loadConfig();

      if(loadSettings.settings) {
        console.log("loadSettings.settings", loadSettings.settings);

        if(!loadSettings.settings.isLoading) {
          setIsLoading(false);
          let mods = [];

          while(mods.length === 0) {
            mods = await getMods(selectedGame);
          }

          clearInterval(attempter);
        }
      }
    }, 1000)
  }

  const getMods = async (gameObj) => {
    const data = await window.electronAPI.loadModList(gameObj);
    console.log("dataMods", data);

    if(data?.mods) {
      setMods(data.mods);
    }

    return data?.mods;
  }

  const onSelectionChange = async (id) => {
    const data = await window.electronAPI.loadConfig();

    let changedMod = {};

    mods.map((mod) => {
      if(mod.id === id) changedMod = {...mod, selected: !mod.selected};
    });

    const updatedMods = mods.map((mod) =>
      mod.id === id ? { ...mod, selected: !mod.selected } : mod
    );

    setMods(updatedMods);
  
    const updatedConfig = { ...data, games, mods: updatedMods };
    console.log("updatedConfig", updatedConfig);

    window?.electronAPI?.saveConfig(updatedConfig);

    if(!changedMod.selected) {
      window.electronAPI.removeMod(selectedGame, changedMod);
    }
    else {
      const response = await window.electronAPI.appendMod(selectedGame, changedMod);
      const data = await window.electronAPI.loadConfig();
      console.log("response", response);

      const updatedMods = mods.map((mod) =>
        mod.id === response.modObj.id ? { ...mod, selected: !response.error } : mod
      );

      setMods(updatedMods);
  
      const updatedConfig = { ...data, games, mods: updatedMods };
      console.log("updatedConfig", updatedConfig);

      window?.electronAPI?.saveConfig(updatedConfig);
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

                <div className="mod-list-container mt-2">
                  {mods && mods.map((mod) => (
                    <Checkbox
                      key={mod.id}
                      data={mod}
                      selectedGame={selectedGame}
                      setIsLoading={setIsLoading}
                      setConfigData={setConfigData}
                      getMods={getMods}
                      setMods={setMods}
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
              setGames={setGames}
              title="Choose game"
              handleSelection={handleSelection}
              handleDeleteGame={handleDeleteGame}
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

      <Footer selectedGame={selectedGame}/>
    </div>
  )
}

export default Home