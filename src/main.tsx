import React from "react";
import ReactDOM from "react-dom/client";
import "./theme.css";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { DocumentProvider } from "./contexts/DocumentContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <ProjectProvider>
        <ThemeProvider>
          <DocumentProvider>
            <App />
          </DocumentProvider>
        </ThemeProvider>
      </ProjectProvider>
    </AppProvider>
  </React.StrictMode>,
);
