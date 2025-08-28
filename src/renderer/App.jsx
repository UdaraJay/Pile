import './App.scss';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import Pile from './pages/Pile';
import License from './pages/License';
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
import { AuthProvider } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { SyncInfraContextProvider } from './context/SyncInfraContext';
import { CloudPostsProvider } from './context/CloudPostsContext';
import { DebugProvider } from './context/DebugContext';
import DebugNotifications from './components/DebugNotifications';
import OAuthCallback from './pages/Auth/OAuthCallback';
import Profile from './pages/Profile';
import ConflictBanner from './components/Conflicts/Banner';
import ConflictsPage from './pages/Conflicts';
import AuthPage from './pages/Auth';
import './lib/syncTest.js'; // Make test functions available globally

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const transition = {
  type: 'spring',
  stiffness: 100,
  damping: 20,
  duration: 0.1,
};

function AnimatedPage({ children, _key = '', down = false }) {
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
}

export default function App() {
  const location = useLocation();

  return (
    <AuthProvider>
      <PilesContextProvider>
        <SyncProvider>
          <SyncInfraContextProvider>
            <CloudPostsProvider>
              <ToastsContextProvider>
                <AutoUpdateContextProvider>
                <AIContextProvider>
                  <DebugProvider>
                    <IndexContextProvider>
                      <HighlightsContextProvider>
                        <TagsContextProvider>
                          <TimelineContextProvider>
                            <LinksContextProvider>
                              <DebugNotifications />
                              <AnimatePresence mode="wait">
                                <Routes
                                  location={location}
                                  key={location.pathname}
                                >
                                  <Route
                                    path="/conflicts"
                                    element={
                                      <AnimatedPage _key="conflicts">
                                        <ConflictsPage />
                                      </AnimatedPage>
                                    }
                                  />
                                  <Route
                                    path="/"
                                    element={
                                      <AnimatedPage _key="home">
                                        <Home />
                                      </AnimatedPage>
                                    }
                                  />
                                  <Route
                                    path="/auth/signin"
                                    element={
                                      <AnimatedPage _key="auth-signin">
                                        <AuthPage />
                                      </AnimatedPage>
                                    }
                                  />
                                  <Route
                                    path="/auth/signup"
                                    element={
                                      <AnimatedPage _key="auth-signup">
                                        <AuthPage />
                                      </AnimatedPage>
                                    }
                                  />
                                  <Route
                                    path="/auth/callback"
                                    element={
                                      <AnimatedPage _key="auth-callback">
                                        <OAuthCallback />
                                      </AnimatedPage>
                                    }
                                  />
                                  <Route
                                    path="/profile"
                                    element={
                                      <AnimatedPage _key="profile">
                                        <Profile />
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
                                    <Route
                                      path="cloud/:pileId"
                                      element={
                                        <AnimatedPage down _key="pile-cloud">
                                          <Pile />
                                        </AnimatedPage>
                                      }
                                    />
                                  </Route>
                              </Routes>
                              </AnimatePresence>
                              <ConflictBanner />
                            </LinksContextProvider>
                          </TimelineContextProvider>
                        </TagsContextProvider>
                      </HighlightsContextProvider>
                    </IndexContextProvider>
                  </DebugProvider>
                </AIContextProvider>
                </AutoUpdateContextProvider>
              </ToastsContextProvider>
            </CloudPostsProvider>
          </SyncInfraContextProvider>
        </SyncProvider>
      </PilesContextProvider>
    </AuthProvider>
  );
}
