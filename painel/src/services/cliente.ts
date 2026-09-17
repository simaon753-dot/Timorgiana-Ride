// O CLIENTE HTTP do painel.
//
// A sessão guarda-se com o MESMO nome que o painel antigo usava (`tr_token`):
// quem já tinha entrado lá continua com a sessão aberta aqui, sem ter de voltar
// a escrever a palavra-passe no dia da mudança.
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

let aoPerderSessao: (() => void) | null = null;
export function quandoPerderSessao(fn: () => void) {
  aoPerderSessao = fn;
}

export function lerSessao(): string {
  try {
    return localStorage.getItem(CHAVE_SESSAO) || '';
  } catch {
    return '';
  }
}

export function gravarSessao(token: string | null) {
  try {
    if (token) localStorage.setItem(CHAVE_SESSAO, token);
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // Sem armazenamento (janela privada estrita): a sessão dura até fechar.
  }
}

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
        ...(headers || {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi('Sem ligação ao servidor. Verifique a internet e tente outra vez.', 0);
  }
  if (r.status === 401 || (r.status === 403 && caminho.startsWith('/admin'))) {
    aoPerderSessao?.();
    throw new ErroApi('A sessão terminou. Entre outra vez.', r.status);
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
