interface Props { headers: string[]; children: React.ReactNode; empty?: string }
export default function Table({ headers, children, empty }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {!children && empty && <div className="text-center py-12 text-gray-400 text-sm">{empty}</div>}
    </div>
  )
}
export function Tr({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return <tr onClick={onClick} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}>{children}</tr>
}
export function Td({ children, className = '', colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={`px-4 py-3.5 text-gray-700 ${className}`}>{children}</td>
}
