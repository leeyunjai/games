import React from 'react';
import ReactDOM from 'react-dom/client';
import '../shared/base.css';
import './hub.css';
import { Hub } from './Hub';
import { registerServiceWorker } from '../shared/pwa';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Hub />
  </React.StrictMode>
);

registerServiceWorker('./');
