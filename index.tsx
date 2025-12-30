
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("Iniciando Gold Clash...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Erro crítico: Elemento root não encontrado no DOM.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Aplicação renderizada com sucesso.");
  } catch (err) {
    console.error("Erro fatal durante a renderização:", err);
    rootElement.innerHTML = `
      <div style="background: white; padding: 20px; border: 4px solid black; margin: 20px; font-family: monospace;">
        <h2 style="color: red;">ERRO DE CARREGAMENTO</h2>
        <pre>${err instanceof Error ? err.message : String(err)}</pre>
        <p>Verifique o Console do Navegador (F12) para detalhes técnicos.</p>
      </div>
    `;
  }
}
