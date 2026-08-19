#!/bin/bash
# Mostra o endereço a escrever no ⚙️ da app TimorgianaRide.
# Faz duplo-clique neste ficheiro sempre que a app disser "sem ligação".

cd "$(dirname "$0")"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║          TimorgianaRide · Servidor       ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

IP=""
for iface in en0 en1 en2; do
  CANDIDATE=$(ipconfig getifaddr "$iface" 2>/dev/null)
  if [ -n "$CANDIDATE" ]; then IP="$CANDIDATE"; break; fi
done

if [ -z "$IP" ]; then
  echo "  ✗ Sem ligação de rede. Liga o Wi-Fi e tenta de novo."
  echo ""
  read -n 1 -s -r -p "  Prime uma tecla para fechar..."
  exit 1
fi

if lsof -ti tcp:4000 >/dev/null 2>&1; then
  echo "  ✓ Servidor a correr"
else
  echo "  ✗ Servidor PARADO — arranca-o com:"
  echo "      cd backend && npm run dev"
  echo ""
fi

echo ""
echo "  Escreve isto no  ⚙️  da app:"
echo ""
echo "      $IP:4000"
echo ""

if curl -s --max-time 5 "http://$IP:4000/api/health" | grep -q TimorgianaRide; then
  echo "  ✓ Testado: o servidor responde neste endereço."
else
  echo "  ✗ O servidor não respondeu. Verifica se está a correr."
fi

echo ""
echo "  Lembra-te: telemóvel e Mac na MESMA rede Wi-Fi."
echo ""
read -n 1 -s -r -p "  Prime uma tecla para fechar..."
echo ""
