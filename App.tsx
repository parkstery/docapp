import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AppDetail from './components/AppDetail';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/app/:id" element={<AppDetail />} />
      </Routes>
    </HashRouter>
  );
};

export default App;