import './App.css';
import { useEffect, useState } from 'react';
import {
  MemoryRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import icon from '../../assets/icon.svg';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import Pile from './pages/Pile';
import License from './pages/License';
import Credits from './pages/Credits';
import CreatePile from './pages/CreatePile';
import { PilesContextProvider } from './context/PilesContext';
import { IndexContextProvider } from './context/IndexContext';
import { TagsContextProvider } from './context/TagsContext';

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const transition = {
  type: 'spring',
  stiffness: 100,
  damping: 20,
};

const AnimatedPage = ({ children, _key = '', down = false }) => {
  return (
    <motion.div
      key={_key}
      initial={{ opacity: 0, translateY: down ? 0 : 40 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: down ? 0 : 140 }}
      transition={{ ...transition, duration: 0.05 }}
    >
      {children}
    </motion.div>
  );
};

export default function App() {
  const location = useLocation();

  return (
    <PilesContextProvider>
      <IndexContextProvider>
        <TagsContextProvider>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route
                path="/"
                element={
                  <AnimatedPage _key="home">
                    <Home />
                  </AnimatedPage>
                }
              />
              <Route
                path="/license"
                element={
                  <AnimatedPage _key="license">
                    <License />
                  </AnimatedPage>
                }
              />
              <Route
                path="/credits"
                element={
                  <AnimatedPage _key="credits">
                    <Credits />
                  </AnimatedPage>
                }
              />
              <Route
                path="/new-pile"
                element={
                  <AnimatedPage _key="new-pile">
                    <CreatePile />
                  </AnimatedPage>
                }
              />
              <Route path="/pile">
                <Route
                  path=":pileName"
                  element={
                    <AnimatedPage down _key="pile">
                      <Pile />
                    </AnimatedPage>
                  }
                />
              </Route>
            </Routes>
          </AnimatePresence>
        </TagsContextProvider>
      </IndexContextProvider>
    </PilesContextProvider>
  );
}
