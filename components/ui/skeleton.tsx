import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-[#23272b]", // dark base
        className
      )}
      {...props}
    >
      <span
        className="absolute inset-0 block animate-skeleton-shimmer"
        style={{
          background:
            "linear-gradient(90deg, rgba(35,39,43,0) 0%, rgba(60,65,70,0.15) 50%, rgba(35,39,43,0) 100%)",
        }}
      />
    </div>
  )
}

// Add shimmer animation to global styles (to be added in globals.css):
// @keyframes skeleton-shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-skeleton-shimmer {
//   animation: skeleton-shimmer 1.2s infinite linear;
// }

export { Skeleton }
