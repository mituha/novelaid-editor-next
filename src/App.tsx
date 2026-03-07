import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ProjectLauncher } from './pages/ProjectLauncher';
import { MainLayout } from './pages/MainLayout';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProjectLauncher />} />
        <Route path="/editor" element={<MainLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
