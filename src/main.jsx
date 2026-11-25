import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
// Police Inter, servie par le site et incluse dans l'application : aucune
// requête vers un service tiers.
import "@fontsource-variable/inter";
// Le nom « slowfi » du logo.
import "@fontsource-variable/nunito";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
