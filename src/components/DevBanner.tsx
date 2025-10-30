import { AlertTriangle } from "lucide-react"

export const DevBanner = () => {
  const isDevelopment = import.meta.env.DEV && window.location.hostname === 'localhost'
  
  if (!isDevelopment) return null

  return (
    <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 flex items-center gap-2">
      <AlertTriangle className="h-4 w-4" />
      <span>Development Mode: Using mock authentication</span>
    </div>
  )
}