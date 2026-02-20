interface SectionRowProps {
  children: React.ReactNode
  onRemove: () => void
}

const SectionRow = ({ children, onRemove }: SectionRowProps) => {
  return (
    <div className="flex items-start gap-2 group">
      <div className="flex-1 flex items-start gap-2">{children}</div>
      <button
        onClick={onRemove}
        className="mt-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        title="Remove"
        aria-label="Remove item"
      >
        ✕
      </button>
    </div>
  )
}

export default SectionRow
