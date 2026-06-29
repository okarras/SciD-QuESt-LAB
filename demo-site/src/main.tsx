import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@orkg/scidquest/dist/contribute-standalone.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
