// CSS
import "./DialogSelector.css";

// Components
import { PrimaryButton, AddGameModal } from "../";

// Icons
import { DeleteIcon } from "../Icons";

const DialogSelector = ({ data, title, handleSelection, handleDeleteGame, setGames }) => {  
  return (
    <>
      <div data-bs-toggle="modal" data-bs-target="#gamesModal">
        <PrimaryButton>{ title }</PrimaryButton>
      </div>

      <div className="modal fade" id="gamesModal" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="gamesModalLabel" aria-hidden="true">      
        <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title" id="gamesModalLabel">{ title }</h1>
            </div>
            <div className="modal-body">
              {data && data.map((item) => (
                  <p
                    key={item.id}
                    className="border dialog-item"
                  >
                    <span
                      className="game-select-button cursor-pointer"
                      data-bs-dismiss="modal"
                      onClick={() => handleSelection(item)}
                    >
                      { item.name }
                    </span>

                    <button
                      className="game-delete-button"
                      onClick={() => handleDeleteGame(item)}
                    >
                      <DeleteIcon />
                    </button>
                  </p>
              ))}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                data-bs-toggle="modal"
                data-bs-target="#addGameModal"
              >
                Add game
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddGameModal setGames={setGames} />
    </>
  )
}

export default DialogSelector