import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global CSS for Material Icons and custom styling specific to this app
const globalStyle = document.createElement('style');
globalStyle.textContent = `
  body {
    font-family: 'Roboto', sans-serif;
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
  
  .camera-container {
    position: relative;
    overflow: hidden;
    border-radius: 8px;
  }
  
  canvas {
    position: absolute;
    top: 0;
    left: 0;
  }
  
  /* Loader Animation */
  .loader {
    border: 4px solid rgba(3, 218, 198, 0.3);
    border-radius: 50%;
    border-top: 4px solid #03DAC6;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(globalStyle);

createRoot(document.getElementById("root")!).render(<App />);
