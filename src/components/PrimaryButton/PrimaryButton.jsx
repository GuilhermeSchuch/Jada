import "./PrimaryButton.css";

const PrimaryButton = ({ children, onClick }) => {
  return (
    <button
      className="primary-button"
      onClick={onClick}
    >
      { children }
    </button>
  )
}

export default PrimaryButton