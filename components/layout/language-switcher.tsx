"use client";

import {
  getLocale,
  setLocale,
  locales,
  type Locale,
} from "@/src/paraglide/runtime.js";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const languageNames: Record<string, string> = {
  en: "EN",
  fr: "FR",
  "zh-CN": "ZH",
  ha: "HA",
  yo: "YO",
  ig: "IG",
};

export function LanguageSwitcher() {
  const [currentLang] = useState<string>(() => {
    try {
      return getLocale();
    } catch {
      return "en";
    }
  });

  const switchLanguage = (newLang: string) => {
    // Paraglide's setLocale handles cookie setting automatically
    setLocale(newLang as Locale, { reload: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-slate-700 hover:text-brand-primary dark:text-slate-200 dark:hover:text-white">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{languageNames[currentLang] || currentLang.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-slate-200 dark:border-white/10 dark:bg-brand-primary">
        {locales.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => switchLanguage(lang)}
            className={currentLang === lang ? "bg-accent font-semibold" : ""}
          >
            {languageNames[lang] || lang.toUpperCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
