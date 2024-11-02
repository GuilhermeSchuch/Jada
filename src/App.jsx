// Router
import { HashRouter, Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home/Home";

// Components
import { Footer } from "./components";

function App() {
  return (
    <div className="App">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </HashRouter>

      <Footer />
    </div>
  );
}

export default App;
