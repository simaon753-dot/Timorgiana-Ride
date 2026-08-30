import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

// Barreira de erro.
//
// Num APK de produção (ao contrário do Expo Go) um erro de JavaScript não
// apanhado passa pelo `ErrorUtils` e mata o processo: o Android mostra "a
// aplicação parou" e acabou. Não fica nada — nem o erro, nem o ecrã onde
// aconteceu. Quem está a usar a app do outro lado do mundo só consegue
// dizer "parou", que é verdade e não chega para arranjar nada.
//
// Esta barreira apanha o erro e MOSTRA-O. Deixa de ser preciso adivinhar.
//
// Deliberadamente sem `theme.js`, sem `i18n`, sem tipografia: se o que
// rebentou foi uma dessas coisas, a barreira que dependesse delas rebentava
// a seguir e não sobrava nada. Cores e textos estão aqui escritos à mão, em
// português, e é assim que devem ficar.
//
// Só componentes de classe podem ser barreiras de erro — o React não tem
// equivalente em ganchos para `componentDidCatch`.
export default class Barreira extends React.Component {
  state = { erro: null, pilha: null };

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    this.setState({ pilha: info?.componentStack ?? null });
    console.error('[Barreira]', erro, info?.componentStack);
  }

  render() {
    const { erro, pilha } = this.state;
    if (!erro) return this.props.children;

    // As primeiras linhas da pilha bastam: nomeiam o componente que
    // rebentou e os que o continham. O resto é o interior do React.
    const contexto = (pilha || '').trim().split('\n').slice(0, 8).join('\n');

    return (
      <View style={{ flex: 1, backgroundColor: '#0E5C54', paddingTop: 64 }}>
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>
            A aplicação encontrou um erro
          </Text>
          <Text style={{ color: '#FFFFFF', opacity: 0.85, marginTop: 8, fontSize: 15 }}>
            Tire uma fotografia a este ecrã e envie-a. O texto abaixo diz exactamente o que falhou.
          </Text>

          <View
            style={{
              backgroundColor: 'rgba(0,0,0,0.28)',
              borderRadius: 12,
              padding: 14,
              marginTop: 20,
            }}
          >
            <Text style={{ color: '#FF6B4A', fontSize: 14, fontWeight: '700' }}>
              {String(erro?.name || 'Erro')}
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 14, marginTop: 6 }}>
              {String(erro?.message || erro)}
            </Text>
            {contexto ? (
              <Text style={{ color: '#FFFFFF', opacity: 0.7, fontSize: 12, marginTop: 12 }}>
                {contexto}
              </Text>
            ) : null}
          </View>

          {/* Voltar a tentar em vez de fechar a app: muitas vezes o erro é
              de um ecrã só, e o resto continua a funcionar. */}
          <Pressable
            onPress={() => this.setState({ erro: null, pilha: null })}
            style={{
              backgroundColor: '#FF6B4A',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 20,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
              Tentar de novo
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}
