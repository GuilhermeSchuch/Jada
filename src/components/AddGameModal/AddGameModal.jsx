// CSS
import "./AddGameModal.css";

// Hooks
import { useState } from "react";

// Utils
import ThrowError from "../../utils/ErrorHandler";

const AddGameModal = ({ setGames }) => {
  const [formContent, setFormContent] = useState({
    game_name: '',
    game_path: ''
  })  

  const handleSubmit = (e) => {
    e.preventDefault();

    if(formContent.game_name.length === 0) {
      ThrowError({
        title: "Game name invalid!",
        text: "Please, write the name of the game.",
        icon: "warning",
        confirmButtonText: "Got it!"
      })

      return;
    }

    if(formContent.game_path.length === 0) {
      ThrowError({
        title: "Game path invalid!",
        text: "Please, write the path of the game.",
        icon: "warning",
        confirmButtonText: "Got it!"
      })

      return;
    }

    const invalidCharacters  = /[\/\\:*?"<>[\]]/;
    if(invalidCharacters.test(formContent.game_name)) {
      ThrowError({
        title: "Game name invalid!",
        text: `The game name can not contain one of this characters: ${invalidCharacters}`,
        icon: "warning",
        confirmButtonText: "Got it!"
      })

      return;
    }

    if(isValidPath(formContent.game_path)) {
      window.electronAPI.addGame(formContent);
      let loadSettings;

      const attempter = setInterval(async () => {
        loadSettings = await window.electronAPI.loadConfig();
  
        if(loadSettings.settings) {
          console.log("loadSettings.settings", loadSettings.settings);
  
          if(!loadSettings.settings.isLoading) {
            setGames(loadSettings.games);
            setFormContent({game_name: '', game_path: ''});
  
            clearInterval(attempter);
          }
        }
      }, 1000)
    }
    else {
      ThrowError({
        title: "Game path invalid!",
        text: "The path you inserted is invalid, check the example and try again.",
        icon: "warning",
        confirmButtonText: "Got it!"
      })

      setFormContent({...formContent, game_path: ''});
    }
  }

  const handleInputs = (e) => {
    setFormContent({
      ...formContent,
      [e.target.name]: e.target.value
    });
  }

  const isValidPath = (path) => {
    if(typeof path !== "string") {
      return false;
    }

    if(path.trim() === "") {
      return false;
    }
  
    const initialString = /^[A-Z]:\\/;
    if(!initialString.test(path)) {
      return false;
    }

    const forbiddenChars = /[\\/:*?"<>|]/;
    if(!forbiddenChars.test(path)) {
      return false;
    }

    const hasReservedName = (input) => {
      const reservedNames = [
        "CON", "PRN", "AUX", "NUL",
        "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
      ];
    
      const normalizedInput = input.toUpperCase();
      const pathsArray = normalizedInput.split('\\');
    
      const hasReserved = pathsArray.some(path => reservedNames.includes(path));
      return hasReserved;
    };

    if(hasReservedName(path)) {
      return false;
    }
  
    return true;
  };
  
  return (
    <div className="modal fade" id="addGameModal" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="addGameModalLabel" aria-hidden="true">      
      <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h1 className="modal-title" id="addGameModalLabel">New game</h1>
            
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="game_name" className="col-form-label">Name:</label>
                <input
                  type="text"
                  className="form-control"
                  id="game_name"
                  name="game_name"
                  placeholder="Ex: Resident Evil 6"
                  value={formContent.game_name}
                  onChange={handleInputs}
                />
                <div className="form-text">The name will show for you when choosing a game.</div>
              </div>

              <div className="mb-3">
                <label htmlFor="game_path" className="col-form-label">Game path:</label>
                <input
                  type="text"
                  className="form-control"
                  id="game_path"
                  name="game_path"
                  placeholder="Ex: C:\Program Files (x86)\Steam\steamapps\common\Resident Evil 6\nativePC"
                  value={formContent.game_path}
                  onChange={handleInputs}
                />
                <div className="form-text">The game's main folder the mods will be added.</div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="close-modal"
                data-bs-dismiss="modal"
                onClick={() => setFormContent({game_name: '', game_path: ''})}
              >
                Close
              </button>
              <button type="submit">Add game</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddGameModal