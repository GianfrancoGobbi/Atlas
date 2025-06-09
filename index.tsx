import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// No global CSS import needed as Tailwind is loaded via CDN

// Ensure this file is correctly parsed.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);