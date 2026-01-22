import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 引入组件
import WelcomePage from './WelcomePage';
// 假设 ProdCalc.tsx 在同级目录或 components 目录下
import ProdCalc from './prodcalc/ProdCalc'; 

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/prodcalc" element={<ProdCalc />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;