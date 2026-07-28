import { BrowserRouter, Routes, Route } from "react-router";
import { Landing } from "./pages/Landing";
import { Console } from "./pages/Console";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Console />} />
      </Routes>
    </BrowserRouter>
  );
}
