import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';
import { SecurityProvider } from './contexts/SecurityContext';
import { MainLayout } from './components/layout/MainLayout';

import { Home } from './pages/Home';
import { Sanitisation } from './pages/Sanitisation';
import { Trial } from './pages/Trial';
import { VaultPage } from './pages/VaultPage';
import { AgentPage } from './pages/AgentPage';
import { TestSecurityVaultPage } from './pages/TestSecurityVaultPage';

function App() {
  return (
    <Router>
      <SecurityProvider>
        <SessionProvider>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/sanitisation" element={<Sanitisation />} />
              <Route path="/trial" element={<Trial />} />
              <Route path="/vault" element={<VaultPage />} />
              <Route path="/agent" element={<AgentPage />} />
              <Route path="/test" element={<TestSecurityVaultPage />} />
            </Routes>
          </MainLayout>
        </SessionProvider>
      </SecurityProvider>
    </Router>
  );
}

export default App;
