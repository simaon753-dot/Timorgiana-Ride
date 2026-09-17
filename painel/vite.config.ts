import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// O painel é servido pelo mesmo servidor do Render, em /painel. A compilação
// vai direta para a pasta pública do backend: não há segundo alojamento, e o
// Render não precisa de compilar nada — publica o que está no repositório.
export default defineConfig({
  base: '/painel/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Workers em módulo ES, como o MapLibre os cria.
  worker: { format: 'es' },
  build: {
    outDir: '../backend/publico/painel',
    emptyOutDir: true,
    // O mapa (MapLibre, ~280 KB comprimido) e os gráficos são pesados e só se
    // usam em dois ecrãs: ficam em pedaços à parte, que só descarregam quando
    // se abrem. O aviso de tamanho fica acima do mapa, que é grande de propósito.
    chunkSizeWarningLimit: 1100,
  },
  server: {
    port: 5180,
    // Em desenvolvimento, a API vem do servidor de demonstração (dados
    // fictícios) — nunca da base de dados de produção.
    proxy: { '/api': 'http://localhost:4790', '/mapa': 'http://localhost:4790' },
  },
});
