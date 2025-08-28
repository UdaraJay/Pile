import { createRoot } from 'react-dom/client';
import { HashRouter as Router } from 'react-router-dom';
import App from './App';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

const wrapperStyle = {
  background: window.electron?.isMac ? 'var(--bg-translucent)' : 'var(--bg)',
};

root.render(
  <Router>
    <div style={wrapperStyle}>
      <App />
    </div>
  </Router>,
);
