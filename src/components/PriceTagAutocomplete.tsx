import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PriceTagAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onEnterPressed: () => void;
  placeholder?: string;
  className?: string;
}

export function PriceTagAutocomplete({
  value,
  onChange,
  onEnterPressed,
  placeholder = "Nome cartello prezzo",
  className,
}: PriceTagAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Query per recuperare tutti i nomi dei cartelli prezzo esistenti
  const { data: existingPriceTags = [] } = useQuery({
    queryKey: ["existing-price-tags"],
    queryFn: async () => {
      // Recupera i nomi dai cartelli manuali delle tabelle
      const { data: tablesData, error: tablesError } = await supabase
        .from("tables")
        .select("price_tags");

      if (tablesError) throw tablesError;

      const manualPriceTagNames = new Set<string>();
      
      // Estrai tutti i nomi dei cartelli manuali (non automatici)
      tablesData?.forEach((table) => {
        const priceTags = table.price_tags as any[];
        priceTags?.forEach((tag) => {
          if (!tag.isAutomatic && tag.name?.trim()) {
            manualPriceTagNames.add(tag.name.trim());
          }
        });
      });

      return Array.from(manualPriceTagNames).sort();
    },
  });

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Mostra i suggerimenti se ci sono e l'input è focalizzato
    if (inputFocused && newValue.length > 0) {
      const filtered = existingPriceTags.filter((tag) =>
        tag.toLowerCase().includes(newValue.toLowerCase())
      );
      setOpen(filtered.length > 0);
    } else {
      setOpen(false);
    }
  };

  const handleInputFocus = () => {
    setInputFocused(true);
    // Mostra suggerimenti se c'è già del testo
    if (value.length > 0) {
      const filtered = existingPriceTags.filter((tag) =>
        tag.toLowerCase().includes(value.toLowerCase())
      );
      setOpen(filtered.length > 0);
    }
  };

  const handleInputBlur = () => {
    setInputFocused(false);
    // Ritarda la chiusura per permettere la selezione dai suggerimenti
    setTimeout(() => setOpen(false), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !open) {
      e.preventDefault();
      onEnterPressed();
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  // Filtra i suggerimenti basandosi sull'input corrente
  const filteredSuggestions = existingPriceTags.filter((tag) =>
    tag.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          autoComplete="off"
        />
        {filteredSuggestions.length > 0 && value.length > 0 && (
          <ChevronsUpDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 opacity-50" />
        )}
      </div>
      
      {open && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover p-0 text-popover-foreground shadow-md">
          <Command>
            <CommandList className="max-h-[200px]">
              <CommandEmpty>Nessun suggerimento trovato.</CommandEmpty>
              <CommandGroup>
                {filteredSuggestions.slice(0, 8).map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    value={suggestion}
                    onSelect={() => handleSelect(suggestion)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === suggestion ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {suggestion}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}