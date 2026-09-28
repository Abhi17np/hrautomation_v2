import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const root = document.getElementById('root')!;
const tree = (
  <StrictMode>
    <App />
  </StrictMode>
);

// The page is prerendered at build time, so the markup is already there:
// hydrate it rather than throwing it away and painting twice.
if (root.firstChild) hydrateRoot(root, tree);
else createRoot(root).render(tree);
