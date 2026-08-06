/**
 * Contor de caractere. Rămâne discret până aproape de limită, ca să nu
 * pară o presiune când mai ai 19.000 de caractere disponibile.
 */
export default function CharCounter({
  value,
  max,
  min,
  className = '',
}: {
  value: string
  max: number
  min?: number
  className?: string
}) {
  const length = value.length
  const belowMin = min !== undefined && length > 0 && length < min
  const nearMax = length > max * 0.9

  return (
    <div className={`flex items-center justify-between mt-1.5 ${className}`}>
      <span className="text-[11px] text-[#9B9B9B]">
        {belowMin ? `Minim ${min} caractere` : ''}
      </span>
      <span className={`text-[11px] font-medium ${
        nearMax ? 'text-[#D97706]' : belowMin ? 'text-[#9B9B9B]' : 'text-[#9B9B9B]'
      }`}>
        {length.toLocaleString('ro-RO')}{nearMax ? ` / ${max.toLocaleString('ro-RO')}` : ''}
      </span>
    </div>
  )
}
