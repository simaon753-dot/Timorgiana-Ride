import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { FornecedorSessao, useSessao } from '@/lib/sessao';
import { FornecedorDicas } from '@/components/ui/menu';
import { Avisos } from '@/components/ui/aviso';
import { Esqueleto } from '@/components/ui/esqueleto';
import { Estrutura } from '@/layouts/Estrutura';
import { Entrar } from '@/pages/Entrar';
import { NaoEncontrado } from '@/pages/NaoEncontrado';
import { Aprovacoes } from '@/pages/aprovacoes/Aprovacoes';
import { t } from '@/i18n';

// Os módulos pesados carregam só quando se abrem: os gráficos (Dados) e o
// mapa (dentro das Viagens) não entram no primeiro descarregamento.
const Emergencias = lazy(() => import('@/pages/Emergencias').then((m) => ({ default: m.Emergencias })));
const Viagens = lazy(() => import('@/pages/viagens/Viagens').then((m) => ({ default: m.Viagens })));
const Contas = lazy(() => import('@/pages/contas/Contas').then((m) => ({ default: m.Contas })));
const Paragens = lazy(() => import('@/pages/Paragens').then((m) => ({ default: m.Paragens })));
const Dados = lazy(() => import('@/pages/dados/Dados').then((m) => ({ default: m.Dados })));
const Pagamentos = lazy(() => import('@/pages/pagamentos/Pagamentos').then((m) => ({ default: m.Pagamentos })));
const Definicoes = lazy(() => import('@/pages/definicoes/Definicoes').then((m) => ({ default: m.Definicoes })));

function ACarregarPagina() {
  return (
    <div className="space-y-6" role="status" aria-label="A carregar">
      <Esqueleto className="h-8 w-56" />
      <Esqueleto className="h-4 w-80" />
      <Esqueleto className="h-72 w-full rounded-cartao" />
    </div>
  );
}

function Rotas() {
  const { estado } = useSessao();
  if (estado === 'a-verificar') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-secundario" role="status">
        {t('entrar.aVerificar')}
      </div>
    );
  }
  if (estado === 'fora') return <Entrar />;
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<Estrutura />}>
          <Route index element={<Navigate to="/aprovacoes" replace />} />
          <Route path="aprovacoes" element={<Aprovacoes />} />
          <Route path="emergencias" element={<Suspense fallback={<ACarregarPagina />}><Emergencias /></Suspense>} />
          <Route path="contas" element={<Suspense fallback={<ACarregarPagina />}><Contas /></Suspense>} />
          <Route path="viagens" element={<Suspense fallback={<ACarregarPagina />}><Viagens /></Suspense>} />
          <Route path="paragens" element={<Suspense fallback={<ACarregarPagina />}><Paragens /></Suspense>} />
          <Route path="dados" element={<Suspense fallback={<ACarregarPagina />}><Dados /></Suspense>} />
          <Route path="pagamentos" element={<Suspense fallback={<ACarregarPagina />}><Pagamentos /></Suspense>} />
          <Route path="definicoes" element={<Suspense fallback={<ACarregarPagina />}><Definicoes /></Suspense>} />
          <Route path="*" element={<NaoEncontrado />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <BrowserRouter basename="/painel">
      <FornecedorSessao>
        <FornecedorDicas delayDuration={250}>
          <Rotas />
          <Avisos />
        </FornecedorDicas>
      </FornecedorSessao>
    </BrowserRouter>
  );
}
