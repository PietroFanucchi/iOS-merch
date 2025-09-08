import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, FileText, Trash2 } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";

interface ChainPriceTag {
  id: string;
  chain: string;
  name: string;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ChainLogo {
  id: string;
  chain: string;
  logo_url: string;
}

const PriceTags = () => {
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Forza il refresh dei dati quando si cambia catena
  useEffect(() => {
    if (selectedChain) {
      queryClient.invalidateQueries({ queryKey: ["chain-price-tags", selectedChain] });
    }
  }, [selectedChain, queryClient]);

  // Fetch unique chains from stores
  const { data: chains, isLoading: chainsLoading } = useQuery({
    queryKey: ["chains"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("chain")
        .order("chain");
      
      if (error) throw error;
      
      // Get unique chains
      const uniqueChains = [...new Set(data.map(store => store.chain))];
      return uniqueChains;
    },
  });

  // Fetch chain logos
  const { data: chainLogos, isLoading: logosLoading } = useQuery({
    queryKey: ["chain-logos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chain_logos")
        .select("id, chain, logo_url");
      
      if (error) throw error;
      return data as ChainLogo[];
    },
  });

  // Fetch price tags for selected chain
  const { data: priceTags, isLoading: priceTagsLoading, refetch, error: priceTagsError } = useQuery({
    queryKey: ["chain-price-tags", selectedChain],
    queryFn: async () => {
      if (!selectedChain) return [];
      
      console.log('Fetching price tags for chain:', selectedChain);
      const { data, error } = await supabase
        .from("chain_price_tags")
        .select("*")
        .eq("chain", selectedChain)
        .order("name");
      
      if (error) {
        console.error('Error fetching price tags:', error);
        throw error;
      }
      console.log('Price tags fetched:', data);
      console.log('Price tags count:', data?.length || 0);
      return data as ChainPriceTag[];
    },
    enabled: !!selectedChain,
    staleTime: 0, // Forza sempre il refresh
    refetchOnWindowFocus: true,
  });

  // Mutation to upload PDF
  const uploadPdfMutation = useMutation({
    mutationFn: async ({ priceTagId, file }: { priceTagId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${priceTagId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("price-tags")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("price-tags")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("chain_price_tags")
        .update({ pdf_url: publicUrl })
        .eq("id", priceTagId);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      toast({
        title: "PDF caricato",
        description: "Il PDF è stato caricato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["chain-price-tags", selectedChain] });
      setUploadingPdf(null);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Errore durante il caricamento del PDF",
        variant: "destructive",
      });
      console.error("Error uploading PDF:", error);
      setUploadingPdf(null);
    },
  });

  // Mutation to delete PDF
  const deletePdfMutation = useMutation({
    mutationFn: async (priceTagId: string) => {
      const { error } = await supabase
        .from("chain_price_tags")
        .update({ pdf_url: null })
        .eq("id", priceTagId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "PDF rimosso",
        description: "Il PDF è stato rimosso con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["chain-price-tags", selectedChain] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Errore durante la rimozione del PDF",
        variant: "destructive",
      });
      console.error("Error deleting PDF:", error);
    },
  });

  const handleFileUpload = (priceTagId: string, file: File) => {
    if (file.type !== "application/pdf") {
      toast({
        title: "Errore",
        description: "Il file deve essere un PDF",
        variant: "destructive",
      });
      return;
    }

    setUploadingPdf(priceTagId);
    uploadPdfMutation.mutate({ priceTagId, file });
  };

  const syncChainPriceTags = async (chain: string) => {
    try {
      console.log('Starting full sync for chain:', chain);
      
      // 1. Trova tutti gli store di questa catena
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('chain', chain);

      if (storesError || !stores) {
        console.error('Error fetching stores:', storesError);
        return;
      }

      console.log('Found stores for chain:', stores.length);

      // 2. Trova tutti i tavoli associati a questi store
      const storeIds = stores.map(store => store.id);
      const { data: storeTables, error: storeTablesError } = await supabase
        .from('store_tables')
        .select(`
          table_id,
          tables (
            price_tags
          )
        `)
        .in('store_id', storeIds);

      if (storeTablesError || !storeTables) {
        console.error('Error fetching store tables:', storeTablesError);
        return;
      }

      console.log('Found tables for chain:', storeTables.length);

      // 3. Estrai tutti i cartelli prezzo unici da tutti i tavoli
      const currentPriceTags = new Set<string>();
      
      storeTables.forEach(storeTable => {
        const table = storeTable.tables;
        if (table?.price_tags && Array.isArray(table.price_tags)) {
          table.price_tags.forEach((priceTag: any) => {
            if (priceTag?.name) {
              currentPriceTags.add(priceTag.name);
            }
          });
        }
      });

      console.log('Current price tags in tables:', Array.from(currentPriceTags));

      // 4. Ottieni tutti i cartelli esistenti per questa catena
      const { data: existingChainTags, error: existingTagsError } = await supabase
        .from('chain_price_tags')
        .select('id, name')
        .eq('chain', chain);

      if (existingTagsError) {
        console.error('Error fetching existing chain tags:', existingTagsError);
        return;
      }

      const existingTagNames = new Set(existingChainTags?.map(tag => tag.name) || []);
      console.log('Existing price tags in chain_price_tags:', Array.from(existingTagNames));

      // 5. Aggiungi cartelli mancanti
      const toAdd = Array.from(currentPriceTags).filter(name => !existingTagNames.has(name));
      for (const priceTagName of toAdd) {
        const { error: insertError } = await supabase
          .from('chain_price_tags')
          .insert({
            chain: chain,
            name: priceTagName
          });

        if (insertError) {
          console.error('Error inserting price tag:', insertError);
        } else {
          console.log('Added price tag:', priceTagName);
        }
      }

      // 6. Elimina cartelli obsoleti
      const toRemove = Array.from(existingTagNames).filter(name => !currentPriceTags.has(name));
      for (const priceTagName of toRemove) {
        const { error: deleteError } = await supabase
          .from('chain_price_tags')
          .delete()
          .eq('chain', chain)
          .eq('name', priceTagName);

        if (deleteError) {
          console.error('Error deleting price tag:', deleteError);
        } else {
          console.log('Removed obsolete price tag:', priceTagName);
        }
      }

      toast({
        title: "Sincronizzazione completata",
        description: `${currentPriceTags.size} cartelli sincronizzati per ${chain} (+${toAdd.length} aggiunti, -${toRemove.length} rimossi)`,
      });

    } catch (error) {
      console.error('Error during sync:', error);
      toast({
        title: "Errore",
        description: "Errore durante la sincronizzazione",
        variant: "destructive",
      });
    }
  };

  if (chainsLoading) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">Cartelli Prezzo</h1>
        </div>
        <div>Caricamento catene...</div>
      </div>
    );
  }

  if (!selectedChain) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">Cartelli Prezzo</h1>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {chains?.map((chain) => {
            const chainLogo = chainLogos?.find(logo => logo.chain === chain);
            return (
              <Card key={chain} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {chainLogo ? (
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-muted">
                        <img 
                          src={chainLogo.logo_url} 
                          alt={`Logo ${chain}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground text-sm font-bold">
                          {chain.charAt(0)}
                        </span>
                      </div>
                    )}
                    {chain}
                  </CardTitle>
                <CardDescription>
                  Visualizza i cartelli prezzo per questa catena
                </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setSelectedChain(chain)} className="w-full">
                    Visualizza Cartelli
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedChain(null)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          {(() => {
            const chainLogo = chainLogos?.find(logo => logo.chain === selectedChain);
            return chainLogo ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-muted">
                <img 
                  src={chainLogo.logo_url} 
                  alt={`Logo ${selectedChain}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-bold">
                  {selectedChain?.charAt(0)}
                </span>
              </div>
            );
          })()}
          Cartelli Prezzo - {selectedChain}
        </h1>
        <Button variant="outline" onClick={async () => {
          console.log('Aggiorna button clicked for chain:', selectedChain);
          if (selectedChain) {
            await syncChainPriceTags(selectedChain);
            queryClient.invalidateQueries({ queryKey: ["chain-price-tags", selectedChain] });
            refetch();
          }
        }}>
          Aggiorna
        </Button>
      </div>

      {priceTagsLoading ? (
        <div>Caricamento cartelli prezzo...</div>
      ) : priceTagsError ? (
        <Card className="col-span-full">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="font-semibold mb-2 text-destructive">Errore nel caricamento</h3>
              <p className="text-muted-foreground mb-4">
                {priceTagsError.message || 'Errore sconosciuto durante il caricamento dei cartelli prezzo'}
              </p>
              <Button onClick={() => refetch()} variant="outline">
                Riprova
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {priceTags && priceTags.length > 0 ? (
            priceTags.map((priceTag) => (
              <Card key={priceTag.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{priceTag.name}</CardTitle>
                  <CardDescription>
                    Creato il {new Date(priceTag.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {priceTag.pdf_url ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">PDF allegato</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(priceTag.pdf_url!, "_blank")}
                          className="flex-1"
                        >
                          Visualizza PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePdfMutation.mutate(priceTag.id)}
                          disabled={deletePdfMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Carica PDF</label>
                      
                      <FileUpload
                        onFileSelect={(file) => handleFileUpload(priceTag.id, file)}
                        accept=".pdf"
                        maxSize={10 * 1024 * 1024} // 10MB
                        disabled={uploadingPdf === priceTag.id}
                        className="w-full"
                      />
                      
                      {uploadingPdf === priceTag.id && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Upload className="h-4 w-4 animate-spin" />
                          Caricamento in corso...
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">⚠️ Nessun cartello prezzo configurato per la catena {selectedChain}</h3>
                  <p className="text-muted-foreground mb-4">
                    Non ci sono cartelli prezzo per questa catena.
                    I cartelli vengono creati automaticamente quando aggiungi dispositivi ai tavoli.
                  </p>
                  <Button onClick={() => {
                    console.log('Tentativo sincronizzazione manuale per:', selectedChain);
                    if (selectedChain) {
                      syncChainPriceTags(selectedChain);
                    }
                  }} variant="outline">
                    Sincronizza Cartelli
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default PriceTags;