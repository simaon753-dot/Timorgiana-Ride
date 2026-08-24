import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { getApiUrl } from '../serverUrl.js';
import { useAuth } from '../context/AuthContext.js';

// Uma imagem que só o servidor entrega a quem tem sessão iniciada.
//
// A forma óbvia — dar o endereço ao <Image> junto com os cabeçalhos —
// entrega o pedido ao carregador de imagens NATIVO do sistema. Se ele não
// enviar o cabeçalho de autorização, o servidor responde 401, a imagem
// falha em silêncio, e o que se vê é um espaço vazio sem nenhuma pista
// de que o problema foi de autenticação.
//
// Aqui o pedido é feito com `fetch`, que é JavaScript e envia sempre o
// cabeçalho. Só depois de ter os bytes é que a imagem é entregue ao
// <Image>. Custa uma cópia em memória e devolve em troca uma coisa que o
// outro caminho não dá: saber PORQUÊ quando falha.
//
// `caminho` é relativo à API (ex.: '/driver/retrato').
// `reserva` é o que se mostra enquanto não há imagem — ou quando não há.
export default function ImagemProtegida({
  caminho,
  chave,
  style,
  resizeMode = 'cover',
  reserva = null,
}) {
  const { token } = useAuth();
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!token || !caminho) {
      setDados(null);
      return undefined;
    }
    let vivo = true;

    (async () => {
      try {
        const r = await fetch(`${getApiUrl()}${caminho}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) {
          // 404 é resposta normal: simplesmente não existe imagem.
          if (r.status !== 404) console.warn(`ImagemProtegida ${caminho}: HTTP ${r.status}`);
          if (vivo) setDados(null);
          return;
        }
        const blob = await r.blob();
        const uri = await new Promise((resolve, reject) => {
          const leitor = new FileReader();
          leitor.onerror = reject;
          leitor.onloadend = () => resolve(leitor.result);
          leitor.readAsDataURL(blob);
        });
        if (vivo) setDados(uri);
      } catch (e) {
        console.warn(`ImagemProtegida ${caminho}: ${e?.message}`);
        if (vivo) setDados(null);
      }
    })();

    return () => {
      vivo = false;
    };
    // `chave` existe para forçar nova busca quando o conteúdo muda sem o
    // caminho mudar — a fotografia de turno é a mesma rota todos os dias.
  }, [token, caminho, chave]);

  if (!dados) return reserva ?? <View style={style} />;
  return (
    <Image
      source={{ uri: dados }}
      style={style}
      resizeMode={resizeMode}
      accessibilityIgnoresInvertColors
    />
  );
}
