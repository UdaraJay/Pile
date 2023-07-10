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
import CreatePile from './pages/CreatePile';
import { PilesContextProvider } from './context/PilesContext';
import { PostsContextProvider } from './context/PostsContext';
import { TimelineContextProvider } from './context/TimelineContext';

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const transition = {
  type: 'spring',
  stiffness: 30,
  damping: 10,
};

const AnimatedPage = ({ children, _key = '', down = false }) => {
  return (
    <motion.div
      key={_key}
      initial={{ opacity: 0, translateY: down ? 0 : 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: down ? 0 : 160 }}
      transition={{ ...transition, duration: down ? 1 : 0.05 }}
    >
      {children}
    </motion.div>
  );
};

export default function App() {
  const location = useLocation();

  return (
    <PilesContextProvider>
      <PostsContextProvider>
        <TimelineContextProvider>
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
        </TimelineContextProvider>
      </PostsContextProvider>
    </PilesContextProvider>
  );
}
