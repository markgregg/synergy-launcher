import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import SynergyLauncher from './SynergyLauncher';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import { limitWindowHeight } from './utils';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <SynergyLauncher />
  </React.StrictMode>
);

serviceWorkerRegistration.register();

reportWebVitals();

limitWindowHeight(110);