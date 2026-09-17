import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { diaCurto } from '@/lib/formato';

// Os gráficos, num ficheiro à parte: o Recharts é pesado e só se descarrega
// quando se abre a página de Dados.

const EIXO = { fontSize: 12, fill: '#687572' };
const GRELHA = '#E5EAE8';

function Dica({ active, payload, label, formatarRotulo }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; formatarRotulo?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-borda bg-white px-3 py-2 text-xs shadow-flutuante">
      <p className="mb-1 font-semibold text-texto">{formatarRotulo ? formatarRotulo(String(label)) : label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-secundario">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="numeros font-semibold text-texto">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export interface PontoViagens {
  rotulo: string;
  concluidas: number;
  canceladas: number;
  semMotorista: number;
}

export function GraficoViagens({ dados, nomes, formatarRotulo }: { dados: PontoViagens[]; nomes: Record<'concluidas' | 'canceladas' | 'semMotorista', string>; formatarRotulo: (l: string) => string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={GRELHA} />
        <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={false} tickFormatter={formatarRotulo} minTickGap={12} />
        <YAxis tick={EIXO} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: '#F1F9F7' }} content={<Dica formatarRotulo={formatarRotulo} />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="concluidas" name={nomes.concluidas} stackId="v" fill="#0F766E" radius={[0, 0, 0, 0]} />
        <Bar dataKey="canceladas" name={nomes.canceladas} stackId="v" fill="#FF6B57" />
        <Bar dataKey="semMotorista" name={nomes.semMotorista} stackId="v" fill="#B7791F" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoAtivos({ dados, nomes }: { dados: { dia: string; motoristas: number; passageiros: number }[]; nomes: { motoristas: string; passageiros: string } }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke={GRELHA} />
        <XAxis dataKey="dia" tick={EIXO} tickLine={false} axisLine={false} tickFormatter={(d) => diaCurto(d)} minTickGap={16} />
        <YAxis tick={EIXO} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<Dica formatarRotulo={(d) => diaCurto(d)} />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Line type="monotone" dataKey="motoristas" name={nomes.motoristas} stroke="#0F766E" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="passageiros" name={nomes.passageiros} stroke="#2F5FB3" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GraficoMotivos({ dados }: { dados: { rotulo: string; n: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, dados.length * 44)}>
      <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }} barCategoryGap="30%">
        <CartesianGrid horizontal={false} stroke={GRELHA} />
        <XAxis type="number" tick={EIXO} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="rotulo" tick={{ ...EIXO, fill: '#17211F' }} tickLine={false} axisLine={false} width={190} />
        <Tooltip cursor={{ fill: '#F1F9F7' }} content={<Dica />} />
        <Bar dataKey="n" name="Viagens" fill="#FF6B57" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
