"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/primitives";

/** Debounced search box bound to ?q= (keeps other params). */
export function SearchInput({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [val, setVal] = useState(params.get("q") ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (val) sp.set("q", val);
      else sp.delete("q");
      router.replace(`${path}?${sp.toString()}`);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val]);

  return (
    <div className="relative w-full max-w-[320px]">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        type="search"
        className="h-10 pl-9"
      />
    </div>
  );
}
