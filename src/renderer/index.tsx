import { createRoot } from 'react-dom/client';
import App from './App';
import { MemoryRouter as Router } from 'react-router-dom';
const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

const wrapperStyle = window.electron.isMac ? {
  background: 'var(--bg-translucent)'
} : {
  background: 'var(--bg)',
  borderRadius: '8px',
  overflow: 'hidden',
}

root.render(
  <Router>
    <div style={wrapperStyle}>
      <App />
    </div>
  </Router>
);
