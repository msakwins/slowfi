import Slowfi, { GlobalStyle } from "./components/Slowfi.jsx";
import { LangProvider } from "./ui/i18n.jsx";

export default function App() {
  return (
    <LangProvider>
      <GlobalStyle />
      <Slowfi />
    </LangProvider>
  );
}
