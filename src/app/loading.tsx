import { Card, Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Chargement">
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-52" />
        <Skeleton className="h-7 w-80" />
        <Skeleton className="h-4 w-[520px] max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
            <Skeleton className="mt-3 h-3 w-32" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-64" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <Skeleton className="h-4 w-40" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-3 h-[240px] w-full rounded-lg" />
          </Card>
        </div>
      </div>
    </div>
  );
}
