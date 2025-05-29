// components/ui/feedback.tsx
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { X } from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import * as RechartsPrimitive from "recharts"
import { Command as CommandPrimitive } from "cmdk"
import { Search as SearchIcon } from "lucide-react"
// Assuming Dialog and DialogContent are now exported from your new overlays.tsx or directly if not consolidated yet
// For this example, I'll assume they are part of an 'overlays' export from '@components/ui' if you've made that change.
// If Dialog is still separate, adjust the import.
import { Dialog, DialogContent } from "@/components/ui" // This assumes Dialog and DialogContent are re-exported from your ui/index.ts

import { cn } from "@/lib/utils"

// --- Alert ---
const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
))
Alert.displayName = "Alert"
const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => ( <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
))
AlertTitle.displayName = "AlertTitle"
const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => ( <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
))
AlertDescription.displayName = "AlertDescription"

// --- Sonner Toaster ---
type SonnerToasterProps = React.ComponentProps<typeof Sonner>
const SonnerToaster = ({ ...props }: SonnerToasterProps) => {
  const { theme = "system" } = useTheme()
  return (
    <Sonner
      theme={theme as SonnerToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

// --- Radix Toast ---
const ToastProvider = ToastPrimitives.Provider
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn("fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]", className)}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return ( <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} /> )
})
Toast.displayName = ToastPrimitives.Root.displayName
const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn("inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive", className)}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName
const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn("absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600", className)}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName
const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName
const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName
type RadixToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type RadixToastActionElement = React.ReactElement<typeof ToastAction>

// --- Custom Radix Toaster (useToast hook logic) ---
const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000
type ToasterToast = RadixToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: RadixToastActionElement
}
const actionTypes = { ADD_TOAST: "ADD_TOAST", UPDATE_TOAST: "UPDATE_TOAST", DISMISS_TOAST: "DISMISS_TOAST", REMOVE_TOAST: "REMOVE_TOAST" } as const
let count = 0
function genId() { count = (count + 1) % Number.MAX_SAFE_INTEGER; return count.toString() }
type ActionType = typeof actionTypes
type Action = | { type: ActionType["ADD_TOAST"]; toast: ToasterToast } | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> } | { type: ActionType["DISMISS_TOAST"]; toastId?: ToasterToast["id"] } | { type: ActionType["REMOVE_TOAST"]; toastId?: ToasterToast["id"] }
interface State { toasts: ToasterToast[] }
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) { return }
  const timeout = setTimeout(() => { toastTimeouts.delete(toastId); customRadixDispatch({ type: "REMOVE_TOAST", toastId: toastId }) }, TOAST_REMOVE_DELAY)
  toastTimeouts.set(toastId, timeout)
}
export const customRadixToastReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST": return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) }
    case "UPDATE_TOAST": return { ...state, toasts: state.toasts.map((t) => t.id === action.toast.id ? { ...t, ...action.toast } : t )}
    case "DISMISS_TOAST": {
      const { toastId } = action
      if (toastId) { addToRemoveQueue(toastId) } else { state.toasts.forEach((toast) => { addToRemoveQueue(toast.id) }) }
      return { ...state, toasts: state.toasts.map((t) => t.id === toastId || toastId === undefined ? { ...t, open: false } : t )}
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) { return { ...state, toasts: [] } }
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) }
  }
}
const listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] }
function customRadixDispatch(action: Action) { memoryState = customRadixToastReducer(memoryState, action); listeners.forEach((listener) => { listener(memoryState) }) }
type RadixCustomToast = Omit<ToasterToast, "id">
function customToast({ ...props }: RadixCustomToast) {
  const id = genId()
  const update = (props: ToasterToast) => customRadixDispatch({ type: "UPDATE_TOAST", toast: { ...props, id } })
  const dismiss = () => customRadixDispatch({ type: "DISMISS_TOAST", toastId: id })
  customRadixDispatch({ type: "ADD_TOAST", toast: { ...props, id, open: true, onOpenChange: (open) => { if (!open) dismiss() } } })
  return { id: id, dismiss, update }
}
function useCustomRadixToast() {
  const [state, setState] = React.useState<State>(memoryState)
  React.useEffect(() => {
    listeners.push(setState)
    return () => { const index = listeners.indexOf(setState); if (index > -1) { listeners.splice(index, 1) } }
  }, [state])
  return { ...state, toast: customToast, dismiss: (toastId?: string) => customRadixDispatch({ type: "DISMISS_TOAST", toastId }) }
}
function CustomRadixToaster() {
  const { toasts } = useCustomRadixToast()
  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (<ToastDescription>{description}</ToastDescription>)}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

// --- Chart ---
const THEMES = { light: "", dark: ".dark" } as const
export type ChartConfig = {
  [k in string]: { label?: React.ReactNode; icon?: React.ComponentType } & ( | { color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> } )
}
type ChartContextProps = { config: ChartConfig }
const ChartContext = React.createContext<ChartContextProps | null>(null)
function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) { throw new Error("useChart must be used within a <ChartContainer />") }
  return context
}
const ChartContainer = React.forwardRef<
  HTMLDivElement, React.ComponentProps<"div"> & { config: ChartConfig; children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"] }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId(); const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`
  return (
    <ChartContext.Provider value={{ config }}>
      <div data-chart={chartId} ref={ref} className={cn("flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none", className)} {...props}>
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([_, config]) => config.theme || config.color)
  if (!colorConfig.length) { return null }
  return ( <style dangerouslySetInnerHTML={{ __html: Object.entries(THEMES).map(([theme, prefix]) => ` ${prefix} [data-chart=${id}] { ${colorConfig.map(([key, itemConfig]) => { const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color; return color ? `  --color-${key}: ${color};` : null }).join("\n")} } `).join("\n"), }} /> )
}
const ChartTooltip = RechartsPrimitive.Tooltip
const ChartTooltipContent = React.forwardRef<
  HTMLDivElement, React.ComponentProps<typeof RechartsPrimitive.Tooltip> & React.ComponentProps<"div"> & { hideLabel?: boolean; hideIndicator?: boolean; indicator?: "line" | "dot" | "dashed"; nameKey?: string; labelKey?: string }
>(({ active, payload, className, indicator = "dot", hideLabel = false, hideIndicator = false, label, labelFormatter, labelClassName, formatter, color, nameKey, labelKey, }, ref) => {
  const { config } = useChart()
  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) { return null }
    const [item] = payload; const key = `${labelKey || item.dataKey || item.name || "value"}`; const itemConfig = getPayloadConfigFromPayload(config, item, key); const value = !labelKey && typeof label === "string" ? config[label as keyof typeof config]?.label || label : itemConfig?.label
    if (labelFormatter) { return ( <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div> ) }
    if (!value) { return null }
    return <div className={cn("font-medium", labelClassName)}>{value}</div>
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey])
  if (!active || !payload?.length) { return null }
  const nestLabel = payload.length === 1 && indicator !== "dot"
  return (
    <div ref={ref} className={cn("grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl", className)}>
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`; const itemConfig = getPayloadConfigFromPayload(config, item, key); const indicatorColor = color || item.payload.fill || item.color
          return (
            <div key={item.dataKey} className={cn("flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground", indicator === "dot" && "items-center")}>
              {formatter && item?.value !== undefined && item.name ? (formatter(item.value, item.name, item, index, item.payload)) : (
                <>
                  {itemConfig?.icon ? (<itemConfig.icon />) : (!hideIndicator && ( <div className={cn("shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]", { "h-2.5 w-2.5": indicator === "dot", "w-1": indicator === "line", "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed", "my-0.5": nestLabel && indicator === "dashed", })} style={ { "--color-bg": indicatorColor, "--color-border": indicatorColor, } as React.CSSProperties } /> ))}
                  <div className={cn("flex flex-1 justify-between leading-none", nestLabel ? "items-end" : "items-center")}>
                    <div className="grid gap-1.5">{nestLabel ? tooltipLabel : null} <span className="text-muted-foreground">{itemConfig?.label || item.name}</span> </div>
                    {item.value && (<span className="font-mono font-medium tabular-nums text-foreground">{item.value.toLocaleString()}</span>)}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltip"
const ChartLegend = RechartsPrimitive.Legend
const ChartLegendContent = React.forwardRef<
  HTMLDivElement, React.ComponentProps<"div"> & Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & { hideIcon?: boolean; nameKey?: string }
>(({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
  const { config } = useChart()
  if (!payload?.length) { return null }
  return (
    <div ref={ref} className={cn("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className)}>
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`; const itemConfig = getPayloadConfigFromPayload(config, item, key)
        return (
          <div key={item.value} className={cn("flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground")}>
            {itemConfig?.icon && !hideIcon ? (<itemConfig.icon />) : (<div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />)}
            {itemConfig?.label}
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = "ChartLegend"
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) { return undefined }
  const payloadPayload = "payload" in payload && typeof payload.payload === "object" && payload.payload !== null ? payload.payload : undefined
  let configLabelKey: string = key
  if (key in payload && typeof payload[key as keyof typeof payload] === "string") { configLabelKey = payload[key as keyof typeof payload] as string }
  else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key as keyof typeof payloadPayload] === "string") { configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string }
  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config]
}

// --- Command ---
const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive ref={ref} className={cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className)} {...props} />
))
Command.displayName = CommandPrimitive.displayName
const CommandDialog = ({ children, ...props }: React.ComponentProps<typeof Dialog>) => { 
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg"> 
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}
const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" /> 
    <CommandPrimitive.Input ref={ref} className={cn("flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />
  </div>
))
CommandInput.displayName = CommandPrimitive.Input.displayName
const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List ref={ref} className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)} {...props} />
))
CommandList.displayName = CommandPrimitive.List.displayName
const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => ( <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} /> ))
CommandEmpty.displayName = CommandPrimitive.Empty.displayName
const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group ref={ref} className={cn("overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground", className)} {...props} />
))
CommandGroup.displayName = CommandPrimitive.Group.displayName
const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn("-mx-1 h-px bg-border", className)} {...props} />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName
const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn("relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", className)}
    {...props}
  />
))
CommandItem.displayName = CommandPrimitive.Item.displayName
const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return ( <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} /> )
}
CommandShortcut.displayName = "CommandShortcut"


export {
  Alert, AlertTitle, AlertDescription, alertVariants,
  SonnerToaster,
  ToastProvider, ToastViewport, Toast, ToastAction, ToastClose, ToastTitle, ToastDescription, toastVariants, type RadixToastProps, type RadixToastActionElement,
  CustomRadixToaster, useCustomRadixToast, customToast, // Export customToast as well
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle, useChart, type ChartConfig,
  Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator,
}