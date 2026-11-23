export default function AdSlot({ className = '' }) {
  return (
    <div
      className={`w-full min-h-[40px] overflow-hidden bg-[#efece4]/80 md:min-h-[56px] ${className}`}
      aria-hidden="true"
      data-ad-slot="true"
    />
  )
}
