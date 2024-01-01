import { createRoot } from 'react-dom/client';
import App from './App';
import { MemoryRouter as Router } from 'react-router-dom';
const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

const wrapperStyle = {
  background: window.electron.isMac ? 'var(--bg-translucent)' : 'var(--bg)',
}

root.render(
  <Router>
    <div style={wrapperStyle}>
      <App />
    </div>
  </Router>
);
