import './App.css';
import {
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import Pile from './pages/Pile';
import License from './pages/License';
import Credits from './pages/Credits';
import CreatePile from './pages/CreatePile';
import { PilesContextProvider } from './context/PilesContext';
import { IndexContextProvider } from './context/IndexContext';
import { TagsContextProvider } from './context/TagsContext';
import { TimelineContextProvider } from './context/TimelineContext';
import { AIContextProvider } from './context/AIContext';
import { HighlightsContextProvider } from './context/HighlightsContext';
import { LinksContextProvider } from './context/LinksContext';
import { ToastsContextProvider } from './context/ToastsContext';
import { AutoUpdateContextProvider } from './context/AutoUpdateContext';

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
      transition={{ ...transition }}
    >
      {children}
    </motion.div>
  );
};

export default function App() {
  const location = useLocation();

  return (
    <PilesContextProvider>
      <ToastsContextProvider>
        <AutoUpdateContextProvider>
          <AIContextProvider>
            <IndexContextProvider>
              <HighlightsContextProvider>
                <TagsContextProvider>
                  <TimelineContextProvider>
                    <LinksContextProvider>
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
                    </LinksContextProvider>
                  </TimelineContextProvider>
                </TagsContextProvider>
              </HighlightsContextProvider>
            </IndexContextProvider>
          </AIContextProvider>
        </AutoUpdateContextProvider>
      </ToastsContextProvider>
    </PilesContextProvider>
  );
}
