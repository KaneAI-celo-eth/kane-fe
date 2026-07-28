import { BrowserRouter, Routes, Route } from "react-router";
import { Landing } from "./pages/Landing";
import { GetStarted } from "./pages/GetStarted";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<GetStarted />} />
      </Routes>
    </BrowserRouter>
  );
}
