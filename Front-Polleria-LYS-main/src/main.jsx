
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "./App.css";
import App from './App.jsx'
import "./styles/login.css";
import './styles/global.css'
import "./styles/caja.css";
import "./styles/dashboard.css";
import { seedTestAccounts } from './services/authService.js'

seedTestAccounts()

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
