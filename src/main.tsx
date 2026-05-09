import React from "react";
import ReactDOM from "react-dom/client";
import "./theme.css";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { DocumentProvider } from "./contexts/DocumentContext";
import { PanelProvider } from "./contexts/PanelContext";
import { AiProviderComponent } from "./novelaid-ai/contexts/AiContext";
import { ChatProvider } from "./novelaid-chat/contexts/ChatContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <ProjectProvider>
        <ThemeProvider>
          <DocumentProvider>
            <PanelProvider>
              <AiProviderComponent>
                <ChatProvider>
                  <App />
                </ChatProvider>
              </AiProviderComponent>
            </PanelProvider>
          </DocumentProvider>
        </ThemeProvider>
      </ProjectProvider>
    </AppProvider>
  </React.StrictMode>,
);
