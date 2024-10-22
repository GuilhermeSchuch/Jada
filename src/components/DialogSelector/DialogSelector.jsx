// CSS
import "./DialogSelector.css";

import PrimaryButton from "../PrimaryButton/PrimaryButton";

const DialogSelector = ({ data, title, handleSelection }) => {  
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
                    className="border dialog-item cursor-pointer"
                    data-bs-dismiss="modal"
                    onClick={() => handleSelection(item)}
                  >
                    { item.name }
                  </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default DialogSelector