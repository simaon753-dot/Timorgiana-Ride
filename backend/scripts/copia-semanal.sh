#!/bin/bash
# CÓPIA SEMANAL DA BASE DE DADOS PARA ESTE MAC (05/10/2026, pedido do Simão).
#
# PORQUE HÁ DUAS CÓPIAS. O GitHub já faz uma por dia (.github/workflows/
# copia-seguranca.yml), mas guarda-as só 90 dias e numa conta só. Esta é o
# segundo sítio: se o GitHub, a conta ou a Neon falharem, os dados estão aqui.
#
# A CÓPIA SAI CIFRADA, com o mesmo método e a mesma senha da do GitHub — uma
# só senha e uma só forma de abrir. A senha NÃO está neste ficheiro nem no
# repositório (que é público): vive no Porta-chaves do macOS, onde o Simão a
# pôs à mão (ver backend/COPIAS-LEIA-ME.md). O ficheiro em claro só existe
# por segundos, numa pasta temporária, e é apagado aconteça o que acontecer.
#
# Corre sozinho aos domingos às 10:00 (launchd). À mão:
#   bash backend/scripts/copia-semanal.sh
set -euo pipefail

BACKEND="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO="$HOME/Documents/TimorgianaRide-copias"
GUARDAR=12 # semanas (três meses)
NODE="${NODE:-/usr/local/bin/node}"

echo "── $(date '+%Y-%m-%d %H:%M') ──"

# A senha primeiro: sem ela não se escreve nada, nem em temporário.
SENHA="$(security find-generic-password -s timorgianaride-copias -a copias -w 2>/dev/null || true)"
SENHA="$(printf '%s' "$SENHA" | tr -d '[:space:]')"
if [ -z "$SENHA" ]; then
  echo "FALTA A SENHA no Porta-chaves (timorgianaride-copias). Ver backend/COPIAS-LEIA-ME.md."
  exit 1
fi
export SENHA

mkdir -p "$DESTINO"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

NOME="timorgianaride-mac-$(date +%Y-%m-%d).sql.gz.enc"

cd "$BACKEND"
"$NODE" scripts/copia-de-seguranca.mjs "$TMP/copia.sql" >/dev/null
gzip -9 -c "$TMP/copia.sql" \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass env:SENHA \
  > "$TMP/$NOME"
rm -f "$TMP/copia.sql"

# Uma cópia que não abre não é uma cópia: decifra-se já o que se cifrou.
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:SENHA -in "$TMP/$NOME" \
  | gunzip > "$TMP/verificar.sql"
if ! head -c 200 "$TMP/verificar.sql" | grep -q "Cópia de segurança da TimorgianaRide"; then
  echo "A cópia NÃO se consegue decifrar. Não foi guardada."
  exit 1
fi
LINHAS=$(grep -c '^INSERT' "$TMP/verificar.sql" || true)
if [ "$LINHAS" -lt 10 ]; then
  echo "A cópia tem só $LINHAS linhas de dados. Não pode estar certa; não foi guardada."
  exit 1
fi

mv "$TMP/$NOME" "$DESTINO/$NOME"
echo "✓ $DESTINO/$NOME ($(du -h "$DESTINO/$NOME" | cut -f1), $LINHAS linhas)"

# Só as últimas $GUARDAR. Os nomes têm a data, por isso a ordem alfabética é
# a ordem do tempo.
COPIAS=()
while IFS= read -r f; do COPIAS+=("$f"); done < <(ls -1 "$DESTINO"/timorgianaride-mac-*.sql.gz.enc 2>/dev/null | sort)
for ((i = 0; i < ${#COPIAS[@]} - GUARDAR; i++)); do
  rm -f "${COPIAS[$i]}" && echo "  apagada a antiga: $(basename "${COPIAS[$i]}")"
done
