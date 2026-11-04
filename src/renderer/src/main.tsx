import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './utils/monaco';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/request.css';
import './styles/response.css';
import './styles/pages.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
