// CSS
import "./Checkbox.css";

// Icons
import Bin from "../Icons/Bin";

const Checkbox = ({ data, selectedGame, onSelectionChange }) => {
  const showModPreview = (id) => {
    const previewElement = document.getElementById(`preview-${id}`);

    if(previewElement) {
      previewElement.classList.remove("preview-hidden");
      previewElement.classList.add("preview-visible");
    }
  }

  const hideModPreview = (id) => {
    const previewElement = document.getElementById(`preview-${id}`);

    if(previewElement) {
      previewElement.classList.add("preview-hidden");
      previewElement.classList.remove("preview-visible");
    }
  }

  return (
    <div className="checkbox-wrapper-4 d-flex align-items-center">
      <div className="m-0 p-0">
        <div
          className="mod-preview preview-hidden"
          id={`preview-${data.id}`}
          // const imagePath = `${window.location.origin}/resources/assets/images/re6.jpg`;
        >
          <img
            src={data.previewImage ? `local-path:///${data.previewImage}` : `${window.location.origin}/resources/assets/images/no-preview.jpg`}
            // src={data.previewImage ? `local-path:///${data.previewImage}` : "https://placehold.co/600x400?text=No+preview"}
          />
        </div>


        <input
          className="inp-cbx"
          id={data.id}
          name={data.id}
          type="checkbox"
          checked={data.selected}
          onChange={onSelectionChange}
        />

        <label
          className="cbx"
          htmlFor={data.id}
          onMouseOver={() => showModPreview(data.id)}
          onMouseOut={() => hideModPreview(data.id)}
        >
          <span>
            <svg width="12px" height="10px"></svg>
          </span>
          <span>{ data.title }</span>
        </label>

        <svg className="inline-svg">
          <symbol id="check-4" viewBox="0 0 12 10">
            <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
          </symbol>
        </svg>
      </div>

      {/* <div className="uninstall-mod cursor-pointer">
        <button>
          <Bin />
        </button>

      </div> */}

    </div>
  )
}

export default Checkbox