// CSS
import "./Checkbox.css";

// Icons
import { DeleteIcon } from "../Icons";

// Swal
import Swal from "sweetalert2";

const Checkbox = ({ data, selectedGame, onSelectionChange, setIsLoading, getMods }) => {
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

  const handleDelete = () => {
    Swal.fire({
      title: "Delete this mod?",
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

        await window.electronAPI.uninstallMod(selectedGame, data);

        let loadSettings;

        const attempter = setInterval(async () => {
          loadSettings = await window.electronAPI.loadConfig();
    
          if(loadSettings.settings) {
            console.log("loadSettings.settings", loadSettings.settings);
    
            if(!loadSettings.settings.isLoading) {
              setIsLoading(false);
              clearInterval(attempter);
              await getMods(selectedGame);

              Swal.fire({
                title: "Success!",
                background: "rgb(12, 12, 10)",
                confirmButtonColor: "#3085d6",
                color: "#EEEEEE",
                text: "Your mod has been deleted.",
                icon: "success"
              });
            }
          }
        }, 1000)
      }
    });
  }

  return (
    <div className="checkbox-wrapper-4 d-flex align-items-center">
      <div className="d-flex align-items-center m-0 p-0">
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

      <button className="checkbox-delete-button" onClick={handleDelete}>
        <DeleteIcon />
      </button>
    </div>
  )
}

export default Checkbox