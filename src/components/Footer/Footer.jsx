// CSS
import "./Footer.css";

const Footer = ({ selectedGame }) => {
  return (
    <footer className="container-fluid">
      <p>Selected game: <span>{ selectedGame?.name }</span></p>
      <p className="m-0">V1.0</p>
    </footer>
  )
}

export default Footer