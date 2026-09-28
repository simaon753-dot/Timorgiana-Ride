// O CLIENTE HTTP do painel.
//
// A SESSÃO VIVE SÓ NESTE SEPARADOR (28/09/2026): `sessionStorage`, e não
// `localStorage`. Fechar o separador ou o navegador é sair. Antes ficava no
// navegador 30 dias, e quem abrisse o Mac do Simão entrava no painel sem
// palavra-passe. As regras que não se contornam estão no servidor
// (auth.js: 12 horas no máximo, 30 minutos parado); isto só não deixa o
// token à espera num disco.
//
// A autorização é sempre do servidor. Esconder um botão aqui é cortesia; quem
// decide se o pedido é aceite é a guarda `is_admin` de routes/admin.js.

const CHAVE_SESSAO = 'tr_token';

export class ErroApi extends Error {
  estado: number;
  constructor(mensagem: string, estado: number) {
    super(mensagem);
    this.estado = estado;
  }
}

export function quandoPerderSessao(fn: (motivo: MotivoSaida) => void) {
  aoPerderSessao = fn;
}

// O token que ficou no `localStorage` das versões anteriores apaga-se ao
// abrir: era esse que deixava o painel aberto a quem chegasse.
try {
  localStorage.removeItem(CHAVE_SESSAO);
} catch {
  // Sem armazenamento: não há nada para apagar.
}

export function lerSessao(): string {
  try {
    return sessionStorage.getItem(CHAVE_SESSAO) || '';
  } catch {
    return '';
  }
}

export function gravarSessao(token: string | null) {
  try {
    if (token) sessionStorage.setItem(CHAVE_SESSAO, token);
    else sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // Sem armazenamento (janela privada estrita): a sessão dura até fechar.
  }
}

// HÁ QUANTO TEMPO UMA PESSOA MEXEU NO PAINEL. Vai em cada pedido
// (`X-Painel-Toque`, em segundos): o servidor só conta como presença um toque
// recente, e não as perguntas que o painel faz sozinho de minuto a minuto.
let ultimoToque = Date.now();
export function segundosSemToque() {
  return Math.round((Date.now() - ultimoToque) / 1000);
}
if (typeof window !== 'undefined') {
  const tocou = () => {
    ultimoToque = Date.now();
  };
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    window.addEventListener(ev, tocou, { passive: true, capture: true });
  }
}

// PORQUE É QUE A SESSÃO ACABOU — para o ecrã de entrada o dizer.
export type MotivoSaida = 'inativo' | 'expirou' | null;
let aoPerderSessao: ((motivo: MotivoSaida) => void) | null = null;

type Opcoes = Omit<RequestInit, 'body'> & { corpo?: unknown };

export async function pedir<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const token = lerSessao();
  const { corpo, headers, ...resto } = opcoes;
  let r: Response;
  try {
    r = await fetch('/api' + caminho, {
      ...resto,
      headers: {
        ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        'X-Painel-Toque': String(segundosSemToque()),
        ...(headers || {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi('Sem ligação ao servidor. Verifique a internet e tente outra vez.', 0);
  }
  if (r.status === 401 || (r.status === 403 && caminho.startsWith('/admin'))) {
    const j = await r.json().catch(() => ({}));
    const inativo = (j as { motivo?: string }).motivo === 'painel_inativo';
    // No /auth/login um 401 é a palavra-passe errada, e não uma sessão perdida.
    if (!caminho.startsWith('/auth/login')) aoPerderSessao?.(inativo ? 'inativo' : 'expirou');
    throw new ErroApi((j as { error?: string }).error || 'A sessão terminou. Entre outra vez.', r.status);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroApi((j as { error?: string }).error || 'O pedido falhou.', r.status);
  return j as T;
}

// Ficheiros protegidos (documentos, comprovativos, fotografias da carga).
//
// Um <img src> não consegue mandar o cabeçalho Authorization. Busca-se por
// fetch, transforma-se em blob e aponta-se a imagem para ele — sem abrir os
// documentos de identificação a quem tenha só o endereço.
const cacheImagens = new Map<string, string>();

export async function imagemProtegida(caminho: string): Promise<string | null> {
  const cache = cacheImagens.get(caminho);
  if (cache) return cache;
  const r = await fetch(caminho, { headers: { Authorization: 'Bearer ' + lerSessao() } }).catch(() => null);
  if (!r || !r.ok) return null;
  const url = URL.createObjectURL(await r.blob());
  cacheImagens.set(caminho, url);
  return url;
}

export function limparImagens() {
  for (const url of cacheImagens.values()) URL.revokeObjectURL(url);
  cacheImagens.clear();
}

// Descarregar um ficheiro protegido (a exportação das viagens).
export async function descarregarProtegido(caminho: string, nome: string) {
  const r = await fetch(caminho, { headers: { Authorization: 'Bearer ' + lerSessao() } });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new ErroApi((j as { error?: string }).error || `HTTP ${r.status}`, r.status);
  }
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
