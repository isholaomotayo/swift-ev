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

const languageLabels: Record<string, { short: string; full: string }> = {
  en: { short: "EN", full: "English" },
  fr: { short: "FR", full: "Français" },
  "zh-CN": { short: "ZH", full: "中文" },
  ha: { short: "HA", full: "Hausa" },
  yo: { short: "YO", full: "Yoruba" },
  ig: { short: "IG", full: "Igbo" },
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

  const activeLang = languageLabels[currentLang] || {
    short: currentLang.toUpperCase(),
    full: currentLang,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2.5 h-9 text-slate-700 hover:text-brand-primary dark:text-slate-200 dark:hover:text-white font-medium"
          aria-label="Select Language"
        >
          <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-semibold text-xs sm:text-sm">{activeLang.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 border-slate-200 dark:border-white/10 dark:bg-slate-900 shadow-lg z-50">
        {locales.map((lang) => {
          const info = languageLabels[lang] || {
            short: lang.toUpperCase(),
            full: lang,
          };
          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => switchLanguage(lang)}
              className={`cursor-pointer flex items-center justify-between gap-3 text-xs font-medium px-3 py-2 ${
                currentLang === lang
                  ? "bg-accent font-bold text-accent-foreground"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className="font-bold">{info.short}</span>
              <span className="text-muted-foreground text-[11px] font-normal">{info.full}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
