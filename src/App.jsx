// Router
import { HashRouter, Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home/Home";

function App() {
  return (
    <div className="App">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;
