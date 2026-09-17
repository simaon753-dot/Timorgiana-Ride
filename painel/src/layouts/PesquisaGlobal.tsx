import { useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import * as D from '@radix-ui/react-dialog';
import { Car, LoaderCircle, MapPin, Route, Search, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router';
import { t, tl } from '@/i18n';
import { api } from '@/services/admin';
import type { LugarProposto, Parada, UtilizadorLinha } from '@/types/api';
import { GRUPOS } from './navegacao';

// A PESQUISA GLOBAL (⌘K).
//
// Não há um endpoint de "procurar em tudo" no servidor, e não faz falta: as
// contas procuram-se no servidor (são milhares), as páginas e as paragens
// filtram-se aqui (são dezenas), e uma viagem abre-se pelo número.
export function PesquisaGlobal({ aberta, aoMudar }: { aberta: boolean; aoMudar: (v: boolean) => void }) {
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');
  const [contas, setContas] = useState<UtilizadorLinha[]>([]);
  const [aProcurar, setAProcurar] = useState(false);
  const [paradas, setParadas] = useState<Parada[] | null>(null);
  const [lugares, setLugares] = useState<LugarProposto[] | null>(null);

  useEffect(() => {
    if (!aberta) {
      setTexto('');
      setContas([]);
      return;
    }
    // As paragens e os lugares só se pedem quando a pesquisa abre, e uma vez.
    if (paradas == null) api.paradas().then((r) => setParadas(r.paradas)).catch(() => setParadas([]));
    if (lugares == null) api.lugares('todos').then((r) => setLugares(r.lugares)).catch(() => setLugares([]));
  }, [aberta, paradas, lugares]);

  // Espera que se acabe de escrever: uma consulta por tecla enchia a rede de
  // Díli para mostrar resultados que ninguém chega a ler.
  useEffect(() => {
    const q = texto.trim().replace(/^#/, '');
    if (q.length < 2 || /^\d+$/.test(q) && q.length < 3) {
      setContas([]);
      return;
    }
    setAProcurar(true);
    const id = window.setTimeout(() => {
      api
        .utilizadores({ q })
        .then((r) => setContas(r.utilizadores))
        .catch(() => setContas([]))
        .finally(() => setAProcurar(false));
    }, 300);
    return () => window.clearTimeout(id);
  }, [texto]);

  const ir = (para: string) => {
    aoMudar(false);
    navegar(para);
  };

  const q = texto.trim().toLowerCase();
  const numeroViagem = /^#?\d{1,9}$/.test(texto.trim()) ? Number(texto.trim().replace('#', '')) : null;

  const paginas = useMemo(
    () => GRUPOS.flatMap((g) => g.itens).filter((i) => !q || t(i.rotulo).toLowerCase().includes(q)),
    [q]
  );
  const paradasFiltradas = q.length >= 2 ? (paradas ?? []).filter((p) => p.nome.toLowerCase().includes(q)).slice(0, 5) : [];
  const lugaresFiltrados = q.length >= 2 ? (lugares ?? []).filter((l) => `${l.nome} ${l.morada ?? ''}`.toLowerCase().includes(q)).slice(0, 5) : [];
  const motoristas = contas.filter((c) => c.driverStatus);
  const passageiros = contas.filter((c) => !c.driverStatus && !c.isAdmin);
  const admins = contas.filter((c) => c.isAdmin);

  const classeGrupo =
    '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-secundario';
  const classeItem =
    'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-texto data-[selected=true]:bg-teal-suave [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-secundario';

  const linhaConta = (c: UtilizadorLinha, icone: React.ReactNode) => (
    <Command.Item key={`c${c.id}`} value={`conta-${c.id}-${c.nome}`} onSelect={() => ir(`/contas?conta=${c.id}`)} className={classeItem}>
      {icone}
      <span className="min-w-0 flex-1 truncate">{c.nome}</span>
      <span className="numeros text-xs text-secundario">{c.telefone}</span>
    </Command.Item>
  );

  return (
    <D.Root open={aberta} onOpenChange={aoMudar}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-texto/40 data-[state=open]:animate-entrar" />
        <D.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-borda bg-white shadow-flutuante focus:outline-none data-[state=open]:animate-subir">
          <D.Title className="sr-only">{t('pesquisa.titulo')}</D.Title>
          <D.Description className="sr-only">{t('pesquisa.dica')}</D.Description>
          <Command shouldFilter={false} loop>
            <div className="flex items-center gap-3 border-b border-borda px-4">
              <Search className="size-4 shrink-0 text-secundario" aria-hidden />
              <Command.Input
                value={texto}
                onValueChange={setTexto}
                placeholder={t('cabecalho.pesquisar')}
                className="h-14 w-full bg-transparent text-[16px] text-texto outline-none placeholder:text-secundario sm:text-[15px]"
              />
              {aProcurar ? <LoaderCircle className="size-4 shrink-0 animate-spin text-secundario" aria-label={t('pesquisa.aProcurar')} /> : null}
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-secundario">
                {q.length < 2 ? t('pesquisa.dica') : t('pesquisa.vazio')}
              </Command.Empty>

              {numeroViagem ? (
                <Command.Group heading={t('pesquisa.viagens')} className={classeGrupo}>
                  <Command.Item value={`viagem-${numeroViagem}`} onSelect={() => ir(`/viagens?viagem=${numeroViagem}`)} className={classeItem}>
                    <Route /> {t('pesquisa.abrirViagem', { n: numeroViagem })}
                  </Command.Item>
                </Command.Group>
              ) : null}

              {motoristas.length ? (
                <Command.Group heading={t('pesquisa.motoristas')} className={classeGrupo}>
                  {motoristas.slice(0, 6).map((c) => linhaConta(c, <Car />))}
                </Command.Group>
              ) : null}
              {passageiros.length ? (
                <Command.Group heading={t('pesquisa.passageiros')} className={classeGrupo}>
                  {passageiros.slice(0, 6).map((c) => linhaConta(c, <User />))}
                </Command.Group>
              ) : null}
              {admins.length ? (
                <Command.Group heading={t('pesquisa.administradores')} className={classeGrupo}>
                  {admins.slice(0, 4).map((c) => linhaConta(c, <ShieldCheck />))}
                </Command.Group>
              ) : null}

              {paradasFiltradas.length ? (
                <Command.Group heading={t('pesquisa.paragens')} className={classeGrupo}>
                  {paradasFiltradas.map((p) => (
                    <Command.Item key={`p${p.id}`} value={`parada-${p.id}`} onSelect={() => ir('/paragens?vista=paradas')} className={classeItem}>
                      <MapPin />
                      <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                      <span className="text-xs text-secundario">{p.raio_m} m</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
              {lugaresFiltrados.length ? (
                <Command.Group heading={t('pesquisa.lugares')} className={classeGrupo}>
                  {lugaresFiltrados.map((l) => (
                    <Command.Item key={`l${l.id}`} value={`lugar-${l.id}`} onSelect={() => ir(`/paragens?estado=${l.estado}`)} className={classeItem}>
                      <MapPin />
                      <span className="min-w-0 flex-1 truncate">{l.nome}</span>
                      <span className="truncate text-xs text-secundario">{tl('estadoLugar', l.estado)}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {paginas.length ? (
                <Command.Group heading={t('pesquisa.paginas')} className={classeGrupo}>
                  {paginas.map((p) => {
                    const Icone = p.icone;
                    return (
                      <Command.Item key={p.para} value={`pagina-${p.para}`} onSelect={() => ir(p.para)} className={classeItem}>
                        <Icone /> {t(p.rotulo)}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ) : null}
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
