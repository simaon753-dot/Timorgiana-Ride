#!/bin/bash
# Liga (ou desliga) a cópia semanal neste Mac. Ver backend/COPIAS-LEIA-ME.md.
#
#   bash backend/scripts/instalar-copia-semanal.sh            # ligar
#   bash backend/scripts/instalar-copia-semanal.sh desligar   # desligar
#
# Escreve um agendamento do macOS (launchd) em ~/Library/LaunchAgents que
# corre o copia-semanal.sh aos domingos às 10:00. Os caminhos são calculados
# aqui, e não escritos no repositório, que é público.
set -euo pipefail

ROTULO=com.timorgiana.copia-semanal
PLIST="$HOME/Library/LaunchAgents/$ROTULO.plist"
GUIAO="$(cd "$(dirname "$0")" && pwd)/copia-semanal.sh"
REGISTO="$HOME/Library/Logs/timorgianaride-copia.log"

launchctl bootout "gui/$(id -u)/$ROTULO" 2>/dev/null || true

if [ "${1:-}" = "desligar" ]; then
  rm -f "$PLIST"
  echo "Cópia semanal desligada. As cópias já feitas ficam em ~/Documents/TimorgianaRide-copias."
  exit 0
fi

if ! security find-generic-password -s timorgianaride-copias -a copias >/dev/null 2>&1; then
  echo "Primeiro ponha a senha no Porta-chaves (passo 1 do backend/COPIAS-LEIA-ME.md)."
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$ROTULO</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$GUIAO</string></array>
  <key>StartCalendarInterval</key>
  <dict><key>Weekday</key><integer>0</integer><key>Hour</key><integer>10</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$REGISTO</string>
  <key>StandardErrorPath</key><string>$REGISTO</string>
</dict>
</plist>
EOF
plutil -lint "$PLIST" >/dev/null
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "Ligada: todos os domingos às 10:00. A fazer a primeira cópia agora…"
bash "$GUIAO" | tee -a "$REGISTO"
