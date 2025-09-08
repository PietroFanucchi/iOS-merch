import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Store, Users, Eye, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailSenderProps {
  launchId: string;
  impactedStores: any[];
  devices: any[];
  onStateChange?: (storeId: string, field: string, value: any) => void;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  store_category: string;
  motivo_invio?: string;
}

interface EmailReason {
  id: string;
  name: string;
  description?: string;
}

export function EmailSender({ launchId, impactedStores, devices, onStateChange }: EmailSenderProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailReasons, setEmailReasons] = useState<EmailReason[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [emailType, setEmailType] = useState<string>("");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [includeDirector, setIncludeDirector] = useState(true);
  const [includeTelefonia, setIncludeTelefonia] = useState(false);
  const [includeInformatica, setIncludeInformatica] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewStore, setPreviewStore] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{subject: string, content: string, cartelliLink?: string} | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [sendingMailApp, setSendingMailApp] = useState<string | null>(null);
  const [markingData, setMarkingData] = useState<string | null>(null);
  const [markingCartelli, setMarkingCartelli] = useState<string | null>(null);
  const [launchStoreStates, setLaunchStoreStates] = useState<Record<string, {date_communicated: boolean, mail_cartellini: boolean}>>({});

  useEffect(() => {
    fetchTemplates();
    fetchEmailReasons();
    fetchLaunchStoreStates();
  }, [launchId, impactedStores]);

  const fetchLaunchStoreStates = async () => {
    if (impactedStores.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from('launch_stores')
        .select('store_id, date_communicated, mail_cartellini')
        .eq('launch_id', launchId)
        .in('store_id', impactedStores.map(s => s.id));

      if (error) throw error;
      
      const statesMap: Record<string, {date_communicated: boolean, mail_cartellini: boolean}> = {};
      data?.forEach(item => {
        statesMap[item.store_id] = {
          date_communicated: item.date_communicated || false,
          mail_cartellini: item.mail_cartellini || false
        };
      });
      
      setLaunchStoreStates(statesMap);
    } catch (error) {
      console.error('Error fetching launch store states:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Errore",
        description: "Errore durante il caricamento dei template email.",
        variant: "destructive",
      });
    }
  };

  const fetchEmailReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('email_reasons')
        .select('*')
        .order('name');

      if (error) throw error;
      setEmailReasons(data || []);
    } catch (error) {
      console.error('Error fetching email reasons:', error);
      toast({
        title: "Errore",
        description: "Errore durante il caricamento dei motivi email.",
        variant: "destructive",
      });
    }
  };

  const handleSendEmails = async () => {
    if (!selectedTemplate || !emailType) {
      toast({
        title: "Campi obbligatori",
        description: "Seleziona un template e un motivo per l'invio.",
        variant: "destructive",
      });
      return;
    }

    if (!sendToAll && !selectedStore && selectedChains.length === 0) {
      toast({
        title: "Selezione obbligatoria",
        description: "Seleziona uno store specifico, una o più catene, o scegli di inviare a tutti.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      let storesToEmail = impactedStores;
      
      if (!sendToAll) {
        if (selectedStore) {
          // Filtra per store specifico
          storesToEmail = impactedStores.filter(s => s.id === selectedStore);
        } else if (selectedChains.length > 0) {
          // Filtra per catene selezionate
          storesToEmail = impactedStores.filter(s => selectedChains.includes(s.chain));
        }
      }
      
      const { data, error } = await supabase.functions.invoke('send-launch-emails', {
        body: {
          launchId,
          templateId: selectedTemplate,
          emailType,
          stores: storesToEmail,
          devices,
          recipients: {
            director: includeDirector,
            telefonia: includeTelefonia,
            informatica: includeInformatica
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Email inviate",
        description: `Email inviate con successo a ${storesToEmail.length} store.`,
      });

      // Se è un template per "Data Installazione, nominativo tattico e cartelli prezzo", aggiorna il campo date_communicated
      const selectedReason = emailReasons.find(r => r.id === emailType);
      if (selectedReason?.name.toLowerCase().includes('data installazione')) {
        const { error: updateError } = await supabase
          .from('launch_stores')
          .update({ date_communicated: true })
          .eq('launch_id', launchId)
          .in('store_id', storesToEmail.map(s => s.id));

        if (updateError) {
          console.error('Error updating date_communicated:', updateError);
        }
      }

    } catch (error) {
      console.error('Error sending emails:', error);
      toast({
        title: "Errore invio",
        description: "Errore durante l'invio delle email.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const generatePreview = async () => {
    if (!selectedTemplate || !emailType || !previewStore) {
      toast({
        title: "Campi obbligatori",
        description: "Seleziona template, motivo e store per l'anteprima.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingPreview(true);
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      const store = impactedStores.find(s => s.id === previewStore);
      
      if (!template || !store) {
        throw new Error('Template o store non trovato');
      }

      // Fetch launch details for placeholders
      const { data: launch, error: launchError } = await supabase
        .from('launches')
        .select('*')
        .eq('id', launchId)
        .single();

      if (launchError) throw launchError;

      // Process placeholders - aggiorna per usare i placeholder del template reale
      let processedSubject = template.subject;
      let processedContent = template.content;

      // Fetch launch_stores data for tactician and visit info
      const { data: launchStore } = await supabase
        .from('launch_stores')
        .select('tactician_id, visit_date, visit_time')
        .eq('launch_id', launchId)
        .eq('store_id', store.id)
        .single();

      // Fetch tactician name if available
      let tacticianName = "Non assegnato";
      if (launchStore?.tactician_id) {
        const { data: tactician } = await supabase
          .from('tacticians')
          .select('name')
          .eq('id', launchStore.tactician_id)
          .single();
        if (tactician) tacticianName = tactician.name;
      }

      // Get visit date if available
      let visitDate = "Da definire";
      if (launchStore?.visit_date) {
        visitDate = new Date(launchStore.visit_date).toLocaleDateString('it-IT');
      }

      // Generate orario installazione content
      let orarioInstallazioneContent = '';
      if (launchStore?.visit_time) {
        const visitTime = launchStore.visit_time;
        const [hours] = visitTime.split(':').map(Number);
        
        if (hours < 13) {
          orarioInstallazioneContent = "Il tattico arriverà in apertura, qualora ci sia vostra disponibilà di far entrare il tattico 30 minuti prima dell'apertura vi chiederei di farmelo sapere rispondendo a questa mail per verificare la disponibilità.";
        } else if (hours >= 14) {
          orarioInstallazioneContent = "Il tattico arriverà tra le 16:00 e le 18:00 per predisporre quanto possibile. Si ricorda tuttavia che, come in ogni lancio, i nuovi prodotti non potranno essere esposti prima della chiusura al pubblico in quanto ancora in embargo; <strong>sarà pertanto richiesta la disponibilità fino a un'ora dopo la chiusura</strong>.";
        }
      }

      // Generate cartelli link for preview
      let tipologiaCartelliContent = '';
      let cartelliLink = '';
      
      const selectedReason = emailReasons.find(r => r.id === emailType);
      if (selectedReason?.name.toLowerCase().includes('cartelli')) {
        // Generate cartelli link for preview with clean slug
        const storeSlug = store.name.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
          .replace(/\s+/g, '-')        // Replace spaces with hyphens
          .replace(/-+/g, '-')         // Replace multiple hyphens with single
          .replace(/^-|-$/g, '');      // Remove leading/trailing hyphens
        
        const launchSlug = launch?.name?.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
          .replace(/\s+/g, '-')        // Replace spaces with hyphens
          .replace(/-+/g, '-')         // Replace multiple hyphens with single
          .replace(/^-|-$/g, '') || 'unknown';      // Remove leading/trailing hyphens
          
        cartelliLink = `https://merch.pietrof.it/cartelli_prezzo/${launchSlug}/${storeSlug}`;
        tipologiaCartelliContent = `Link per scaricare i cartelli prezzo: <a href="${cartelliLink}" target="_blank" style="color: #007bff; text-decoration: underline;">${cartelliLink}</a>`;
      }

      const placeholders = {
        '[nome_lancio]': launch.name,
        '[motivo_mail]': selectedReason?.name || 'Motivo non definito',
        '[data_visita]': `<strong>${visitDate}</strong>`,
        '[nome_tattico]': `<strong>${tacticianName}</strong>`,
        '[orario_installazione]': orarioInstallazioneContent,
        '[nome_store]': store.name,
        '[indirizzo_store]': store.location,
        '[tipologia_invio_cartelli]': tipologiaCartelliContent,
        '[prodotti_lancio]': devices.map(d => `- ${d.name} (${d.color})`).join('\n'),
        // Fallback per vecchi placeholder
        '{{store.name}}': store.name,
        '{{store.location}}': store.location,
        '{{store.chain}}': store.chain,
        '{{launch.name}}': launch.name,
        '{{launch.description}}': launch.description || '',
        '{{devices.count}}': devices.length.toString(),
        '{{devices.list}}': devices.map(d => d.name).join(', ')
      };

      Object.entries(placeholders).forEach(([placeholder, value]) => {
        processedSubject = processedSubject.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        processedContent = processedContent.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      });

      setPreviewData({
        subject: processedSubject,
        content: processedContent,
        cartelliLink: cartelliLink || undefined
      });
      setShowPreview(true);

    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: "Errore anteprima",
        description: "Errore durante la generazione dell'anteprima.",
        variant: "destructive",
      });
    } finally {
      setGeneratingPreview(false);
    }
  };

  const sendViaMailApp = async (storeId: string) => {
    if (!selectedTemplate || !emailType) {
      toast({
        title: "Campi obbligatori",
        description: "Seleziona template e motivo per l'invio.",
        variant: "destructive",
      });
      return;
    }

    setSendingMailApp(storeId);
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      const store = impactedStores.find(s => s.id === storeId);
      
      if (!template || !store) {
        throw new Error('Template o store non trovato');
      }

      // Get launch details
      const { data: launch, error: launchError } = await supabase
        .from('launches')
        .select('*')
        .eq('id', launchId)
        .single();

      if (launchError) throw launchError;

      // Get launch store data for visit date
      const { data: launchStore, error: launchStoreError } = await supabase
        .from('launch_stores')
        .select('visit_date, visit_time, tactician_id')
        .eq('launch_id', launchId)
        .eq('store_id', storeId)
        .single();

      // Get tactician name if needed
      let tacticianName = "Non assegnato";
      if (launchStore?.tactician_id) {
        const { data: tactician } = await supabase
          .from('tacticians')
          .select('name')
          .eq('id', launchStore.tactician_id)
          .single();
        if (tactician) tacticianName = tactician.name;
      }

      // Get visit date
      let visitDate = "Da definire";
      if (launchStore?.visit_date) {
        visitDate = new Date(launchStore.visit_date).toLocaleDateString('it-IT');
      }

      // Generate orario installazione content
      let orarioInstallazioneContent = '';
      if (launchStore?.visit_time) {
        const visitTime = launchStore.visit_time;
        const [hours] = visitTime.split(':').map(Number);
        
        if (hours < 13) {
          orarioInstallazioneContent = "Il tattico arriverà in apertura, qualora ci sia vostra disponibilà di far entrare il tattico 30 minuti prima dell'apertura vi chiederei di farmelo sapere rispondendo a questa mail per verificare la disponibilità.";
        } else if (hours >= 14) {
          orarioInstallazioneContent = "Il tattico arriverà tra le 16:00 e le 18:00 per predisporre quanto possibile. Si ricorda tuttavia che, come in ogni lancio, i nuovi prodotti non potranno essere esposti prima della chiusura al pubblico in quanto ancora in embargo; <strong>sarà pertanto richiesta la disponibilità fino a un'ora dopo la chiusura</strong>.";
        }
      }

      // Generate cartelli link for preview
      let tipologiaCartelliContent = '';
      
      const selectedReason = emailReasons.find(r => r.id === emailType);
      if (selectedReason?.name.toLowerCase().includes('cartelli')) {
        // Generate cartelli link for preview with clean slug
        const storeSlug = store.name.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
          .replace(/\s+/g, '-')        // Replace spaces with hyphens
          .replace(/-+/g, '-')         // Replace multiple hyphens with single
          .replace(/^-|-$/g, '');      // Remove leading/trailing hyphens
        
        const launchSlug = launch?.name?.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
          .replace(/\s+/g, '-')        // Replace spaces with hyphens
          .replace(/-+/g, '-')         // Replace multiple hyphens with single
          .replace(/^-|-$/g, '') || 'unknown';      // Remove leading/trailing hyphens
          
        const cartelliLink = `https://merch.pietrof.it/cartelli_prezzo/${launchSlug}/${storeSlug}`;
        tipologiaCartelliContent = `Link per scaricare i cartelli prezzo: ${cartelliLink}`;
      }

      const placeholders = {
        '[nome_lancio]': launch.name,
        '[motivo_mail]': selectedReason?.name || 'Motivo non definito',
        '[data_visita]': `<strong>${visitDate}</strong>`,
        '[nome_tattico]': `<strong>${tacticianName}</strong>`,
        '[orario_installazione]': orarioInstallazioneContent,
        '[nome_store]': store.name,
        '[indirizzo_store]': store.location,
        '[tipologia_invio_cartelli]': tipologiaCartelliContent,
        '[prodotti_lancio]': devices.map(d => `- ${d.name} (${d.color})`).join('\n'),
        // Fallback per vecchi placeholder
        '{{store.name}}': store.name,
        '{{store.location}}': store.location,
        '{{store.chain}}': store.chain,
        '{{launch.name}}': launch.name,
        '{{launch.description}}': launch.description || '',
        '{{devices.count}}': devices.length.toString(),
        '{{devices.list}}': devices.map(d => d.name).join(', ')
      };

      let processedSubject = template.subject;
      let processedContent = template.content;

      Object.entries(placeholders).forEach(([placeholder, value]) => {
        processedSubject = processedSubject.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        processedContent = processedContent.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      });

      // Get email addresses
      const emails = [];
      
      // Director email
      if (includeDirector && store.director_email) {
        emails.push(store.director_email);
      }
      
      // Technical emails - handle both array and string formats
      if (includeTelefonia && store.email_technical) {
        if (Array.isArray(store.email_technical)) {
          // It's an array
          emails.push(...store.email_technical.filter(email => email && email.trim()));
        } else if (typeof store.email_technical === 'string') {
          // It's a string, might be comma-separated
          const techEmails = store.email_technical.split(',').map(email => email.trim()).filter(email => email);
          emails.push(...techEmails);
        }
      }
      
      // Informatics emails - handle both array and string formats
      if (includeInformatica && store.email_informatics) {
        if (Array.isArray(store.email_informatics)) {
          // It's an array
          emails.push(...store.email_informatics.filter(email => email && email.trim()));
        } else if (typeof store.email_informatics === 'string') {
          // It's a string, might be comma-separated
          const infoEmails = store.email_informatics.split(',').map(email => email.trim()).filter(email => email);
          emails.push(...infoEmails);
        }
      }

      if (emails.length === 0) {
        toast({
          title: "Nessuna email configurata",
          description: "Lo store selezionato non ha email configurate per i destinatari selezionati.",
          variant: "destructive",
        });
        return;
      }

      // Create mailto link
      const mailtoLink = `mailto:${emails.join(',')}?subject=${encodeURIComponent(processedSubject)}&body=${encodeURIComponent(processedContent.replace(/<[^>]*>/g, ''))}`;
      
      // Open mail app
      window.open(mailtoLink, '_self');

      toast({
        title: "App Posta aperta",
        description: `Email preparata per ${store.name}`,
      });

    } catch (error) {
      console.error('Error preparing mail app email:', error);
      toast({
        title: "Errore preparazione email",
        description: "Errore durante la preparazione dell'email per l'app Posta.",
        variant: "destructive",
      });
    } finally {
      setSendingMailApp(null);
    }
  };

  const markAsDataSent = async (storeId: string) => {
    setMarkingData(storeId);
    try {
      const currentState = launchStoreStates[storeId]?.date_communicated || false;
      const newState = !currentState;
      
      const { error } = await supabase
        .from('launch_stores')
        .update({ date_communicated: newState })
        .eq('launch_id', launchId)
        .eq('store_id', storeId);

      if (error) throw error;

      toast({
        title: newState ? "Marcato come inviato" : "Rimosso invio",
        description: newState ? "Store marcato con Data inviata" : "Store rimosso da Data inviata",
      });

      // Update local state
      setLaunchStoreStates(prev => ({
        ...prev,
        [storeId]: {
          ...prev[storeId],
          date_communicated: newState
        }
      }));

      // Notify parent component if callback exists
      if (onStateChange) {
        onStateChange(storeId, 'date_communicated', newState);
      }

    } catch (error) {
      console.error('Error marking data as sent:', error);
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento dello stato.",
        variant: "destructive",
      });
    } finally {
      setMarkingData(null);
    }
  };

  const markAsCartelliSent = async (storeId: string) => {
    setMarkingCartelli(storeId);
    try {
      const currentState = launchStoreStates[storeId]?.mail_cartellini || false;
      const newState = !currentState;
      
      const { error } = await supabase
        .from('launch_stores')
        .update({ mail_cartellini: newState })
        .eq('launch_id', launchId)
        .eq('store_id', storeId);

      if (error) throw error;

      toast({
        title: newState ? "Marcato come inviato" : "Rimosso invio",
        description: newState ? "Store marcato con Cartelli inviati" : "Store rimosso da Cartelli inviati",
      });

      // Update local state
      setLaunchStoreStates(prev => ({
        ...prev,
        [storeId]: {
          ...prev[storeId],
          mail_cartellini: newState
        }
      }));

      // Notify parent component if callback exists
      if (onStateChange) {
        onStateChange(storeId, 'mail_cartellini', newState);
      }

    } catch (error) {
      console.error('Error marking cartelli as sent:', error);
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento dello stato.",
        variant: "destructive",
      });
    } finally {
      setMarkingCartelli(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="card-apple">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invio Email per Lancio
          </CardTitle>
          <CardDescription>
            Configura e invia email automatiche agli store impattati dal lancio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Template Email</label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un template email" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.store_category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo Invio</label>
            <Select value={emailType} onValueChange={setEmailType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona il motivo dell'invio" />
              </SelectTrigger>
              <SelectContent>
                {emailReasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {/* Store Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="send-all"
                checked={sendToAll}
                onCheckedChange={(checked) => setSendToAll(checked === true)}
              />
              <label htmlFor="send-all" className="text-sm font-medium">
                Invia a tutti gli store impattati ({impactedStores.length})
              </label>
            </div>

            {!sendToAll && (
              <div className="space-y-4">
                {/* Chain Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filtra per Catene</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['MediaWorld', 'Comet', 'Euronics', 'Unieuro'].map((chain) => (
                      <div key={chain} className="flex items-center space-x-2">
                        <Checkbox
                          id={`chain-${chain}`}
                          checked={selectedChains.includes(chain)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedChains([...selectedChains, chain]);
                              setSelectedStore(""); // Resetta store specifico se si seleziona catena
                            } else {
                              setSelectedChains(selectedChains.filter(c => c !== chain));
                            }
                          }}
                        />
                        <label htmlFor={`chain-${chain}`} className="text-sm">
                          {chain} ({impactedStores.filter(s => s.chain === chain).length})
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedChains.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedChains.map((chain) => (
                        <Badge key={chain} variant="secondary" className="text-xs">
                          {chain}
                          <button
                            onClick={() => setSelectedChains(selectedChains.filter(c => c !== chain))}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Store Specific Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Oppure Store Specifico</label>
                  <Select 
                    value={selectedStore} 
                    onValueChange={(value) => {
                      setSelectedStore(value);
                      setSelectedChains([]); // Resetta catene se si seleziona store specifico
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona uno store" />
                    </SelectTrigger>
                    <SelectContent>
                      {impactedStores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name} - {store.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Recipients Selection */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Destinatari Email</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="director"
                  checked={includeDirector}
                  onCheckedChange={(checked) => setIncludeDirector(checked === true)}
                />
                <label htmlFor="director" className="text-sm">
                  Direttore (sempre incluso)
                </label>
                <Badge variant="secondary">Obbligatorio</Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="telefonia"
                  checked={includeTelefonia}
                  onCheckedChange={(checked) => setIncludeTelefonia(checked === true)}
                />
                <label htmlFor="telefonia" className="text-sm">
                  Telefonia
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="informatica"
                  checked={includeInformatica}
                  onCheckedChange={(checked) => setIncludeInformatica(checked === true)}
                />
                <label htmlFor="informatica" className="text-sm">
                  Informatica
                </label>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="border-t pt-6 space-y-4">
            <h4 className="text-sm font-medium">Genera Anteprima / Test App Posta</h4>
            
            {/* Traditional Preview Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Store per anteprima</label>
                <Select value={previewStore} onValueChange={setPreviewStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona store per anteprima" />
                  </SelectTrigger>
                  <SelectContent>
                    {impactedStores
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name} - {store.location}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={generatePreview}
                  disabled={generatingPreview || !selectedTemplate || !emailType || !previewStore}
                  variant="outline"
                  className="w-full"
                >
                  {generatingPreview ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Genera Anteprima
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Store List for Mail App */}
            <div className="border-t pt-4">
              <h5 className="text-sm font-medium mb-3">Invio con mailto</h5>
                <div className="space-y-2 border rounded-lg p-3 bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {impactedStores
                  .sort((a, b) => {
                    // Prima ordina per catena (Comet per primo)
                    const chainOrder = ['Comet', 'Euronics', 'MediaWorld', 'Unieuro'];
                    const aChainIndex = chainOrder.indexOf(a.chain);
                    const bChainIndex = chainOrder.indexOf(b.chain);
                    
                    if (aChainIndex !== bChainIndex) {
                      return (aChainIndex === -1 ? 999 : aChainIndex) - (bChainIndex === -1 ? 999 : bChainIndex);
                    }
                    
                    // Poi ordina alfabeticamente per nome
                    return a.name.localeCompare(b.name);
                  })
                  .map((store) => {
                  // Debug: log store data
                  console.log('Store debug:', {
                    name: store.name,
                    director_email: store.director_email,
                    email_technical: store.email_technical,
                    email_informatics: store.email_informatics,
                    email_technical_type: typeof store.email_technical,
                    email_informatics_type: typeof store.email_informatics,
                    email_technical_isArray: Array.isArray(store.email_technical),
                    email_informatics_isArray: Array.isArray(store.email_informatics),
                    includeDirector,
                    includeTelefonia,
                    includeInformatica
                  });

                  // Get email addresses for this store with improved logic
                  const emails = [];
                  
                  // Director email
                  if (includeDirector && store.director_email) {
                    emails.push(store.director_email);
                  }
                  
                  // Technical emails - handle both array and string formats
                  if (includeTelefonia && store.email_technical) {
                    if (Array.isArray(store.email_technical)) {
                      // It's an array
                      emails.push(...store.email_technical.filter(email => email && email.trim()));
                    } else if (typeof store.email_technical === 'string') {
                      // It's a string, might be comma-separated
                      const techEmails = store.email_technical.split(',').map(email => email.trim()).filter(email => email);
                      emails.push(...techEmails);
                    }
                  }
                  
                  // Informatics emails - handle both array and string formats
                  if (includeInformatica && store.email_informatics) {
                    if (Array.isArray(store.email_informatics)) {
                      // It's an array
                      emails.push(...store.email_informatics.filter(email => email && email.trim()));
                    } else if (typeof store.email_informatics === 'string') {
                      // It's a string, might be comma-separated
                      const infoEmails = store.email_informatics.split(',').map(email => email.trim()).filter(email => email);
                      emails.push(...infoEmails);
                    }
                  }

                  console.log('Final emails for store:', store.name, emails);

                  // Debug detailed email info - only for selected recipients
                  const missingEmails = [];
                  if (includeDirector && !store.director_email) {
                    missingEmails.push('Direttore');
                  }
                  if (includeTelefonia && (!store.email_technical || 
                    (Array.isArray(store.email_technical) && store.email_technical.filter(email => email && email.trim()).length === 0) ||
                    (typeof store.email_technical === 'string' && !store.email_technical.trim()))) {
                    missingEmails.push('Telefonia');
                  }
                  if (includeInformatica && (!store.email_informatics || 
                    (Array.isArray(store.email_informatics) && store.email_informatics.filter(email => email && email.trim()).length === 0) ||
                    (typeof store.email_informatics === 'string' && !store.email_informatics.trim()))) {
                    missingEmails.push('Informatica');
                  }

                  // Get current state from local state
                  const currentState = launchStoreStates[store.id] || { date_communicated: false, mail_cartellini: false };

                  return (
                    <div key={store.id} className="flex flex-col p-3 bg-background rounded border space-y-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{store.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{store.location}</p>
                        <p className="text-xs text-muted-foreground truncate">{store.chain}</p>
                        <div className="text-xs text-muted-foreground">
                          {emails.length > 0 ? (
                            <p className="text-green-600">✓ {emails.length} email configurate</p>
                          ) : (
                            <p className="text-red-600">❌ Mancano email per: {missingEmails.join(', ')}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          onClick={() => sendViaMailApp(store.id)}
                          disabled={sendingMailApp === store.id || !selectedTemplate || !emailType || emails.length === 0}
                          variant={emails.length === 0 ? "secondary" : "outline"}
                          size="sm"
                          className="flex-1"
                          title={
                            !selectedTemplate ? "Seleziona un template" :
                            !emailType ? "Seleziona il motivo dell'invio" :
                            emails.length === 0 ? "Nessuna email configurata per i destinatari selezionati" :
                            "Clicca per aprire l'app Posta"
                          }
                        >
                          {sendingMailApp === store.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1" />
                              Preparando...
                            </>
                          ) : (
                            <>
                              <Mail className="w-3 h-3 mr-1" />
                              Invia
                            </>
                          )}
                        </Button>
                        
                        <Button
                          onClick={() => markAsDataSent(store.id)}
                          disabled={markingData === store.id}
                          variant="outline"
                          size="sm"
                          className={`px-2 ${currentState.date_communicated ? 'bg-green-500 text-white hover:bg-green-600' : ''}`}
                          title="Marca come Data inviata"
                        >
                          {markingData === store.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                          ) : currentState.date_communicated ? (
                            "✓"
                          ) : (
                            "Data"
                          )}
                        </Button>
                        
                        <Button
                          onClick={() => markAsCartelliSent(store.id)}
                          disabled={markingCartelli === store.id}
                          variant="outline"
                          size="sm"
                          className={`px-2 ${currentState.mail_cartellini ? 'bg-green-500 text-white hover:bg-green-600' : ''}`}
                          title="Marca come Cartelli inviati"
                        >
                          {markingCartelli === store.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                          ) : currentState.mail_cartellini ? (
                            "✓"
                          ) : (
                            "Cartelli"
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                I bottoni "Invia" aprono l'app Posta di macOS con l'email pre-compilata. 
                Richiede template e motivo selezionati, e almeno un tipo di destinatario abilitato.
              </p>
            </div>
          </div>


          {/* Preview Info */}
          {selectedTemplate && emailType && (
            <div className="bg-muted p-4 rounded-lg">
              <h5 className="font-medium mb-2">Anteprima invio:</h5>
              <div className="text-sm space-y-1">
                <p><strong>Template:</strong> {templates.find(t => t.id === selectedTemplate)?.name}</p>
                <p><strong>Motivo:</strong> {emailReasons.find(r => r.id === emailType)?.name || 'Motivo non definito'}</p>
                <p><strong>Store:</strong> {
                  sendToAll 
                    ? `Tutti (${impactedStores.length})` 
                    : selectedChains.length > 0 
                      ? `Catene: ${selectedChains.join(', ')} (${impactedStores.filter(s => selectedChains.includes(s.chain)).length})`
                      : '1 selezionato'
                }</p>
                <p><strong>Dispositivi:</strong> {devices.length}</p>
                {emailReasons.find(r => r.id === emailType)?.name.toLowerCase().includes('cartelli') && (
                  <p className="text-primary">
                    <strong>Link Download:</strong> Link per scaricare i cartelli dal cloud dedicato
                  </p>
                )}
                {emailReasons.find(r => r.id === emailType)?.name.toLowerCase().includes('data installazione') && (
                  <p className="text-primary"><strong>Aggiornamento:</strong> Campo "data comunicata" verrà marcato</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Anteprima Email
            </DialogTitle>
            <DialogDescription>
              Anteprima della mail che verrà inviata al store selezionato
            </DialogDescription>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-4">
              {/* Email Headers */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Da:</span> Pietro Fanucchi - Apple BA
                  </div>
                  <div>
                    <span className="font-medium">A:</span> {
                      (() => {
                        const store = impactedStores.find(s => s.id === previewStore);
                        if (!store) return 'Store non trovato';
                        
                         const emails = [];
                         // Director email
                         if (includeDirector && store.director_email) {
                           emails.push(store.director_email);
                         }
                         
                         // Technical emails - handle both array and string formats
                         if (includeTelefonia && store.email_technical) {
                           if (Array.isArray(store.email_technical)) {
                             // It's an array
                             emails.push(...store.email_technical.filter(email => email && email.trim()));
                           } else if (typeof store.email_technical === 'string') {
                             // It's a string, might be comma-separated
                             const techEmails = store.email_technical.split(',').map(email => email.trim()).filter(email => email);
                             emails.push(...techEmails);
                           }
                         }
                         
                         // Informatics emails - handle both array and string formats
                         if (includeInformatica && store.email_informatics) {
                           if (Array.isArray(store.email_informatics)) {
                             // It's an array
                             emails.push(...store.email_informatics.filter(email => email && email.trim()));
                           } else if (typeof store.email_informatics === 'string') {
                             // It's a string, might be comma-separated
                             const infoEmails = store.email_informatics.split(',').map(email => email.trim()).filter(email => email);
                             emails.push(...infoEmails);
                           }
                         }
                        
                        return emails.length > 0 ? emails.join(', ') : 'Nessuna email configurata per i destinatari selezionati';
                      })()
                    }
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <span className="font-medium">Oggetto:</span> {previewData.subject}
                </div>
              </div>

              {/* Email Content */}
              <div className="border rounded-lg p-6 bg-background dark:bg-card">
                <div 
                  className="prose prose-slate dark:prose-invert max-w-none text-foreground"
                  style={{ 
                    /* Assicura che il grassetto sia ben visibile */
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: previewData.content
                      .replace(/\n/g, '<br/>')
                      .replace(/<strong>/g, '<strong style="font-weight: 700; color: inherit;">')
                      .replace(/<\/strong>/g, '</strong>') 
                  }}
                />
              </div>

              {/* Link Info */}
              {emailReasons.find(r => r.id === emailType)?.name.toLowerCase().includes('cartelli') && (
                <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg border border-primary/30">
                  <h5 className="font-medium text-primary dark:text-primary mb-2">
                    Link Download:
                  </h5>
                  <div className="space-y-2">
                    <p className="text-sm text-primary/80 dark:text-primary/90">
                      Link per scaricare i cartelli prezzo dal cloud dedicato
                    </p>
                    
                    <div className="space-y-1">
                      {previewData.cartelliLink ? (
                        <a 
                          href={previewData.cartelliLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-xs text-primary bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 p-2 rounded transition-colors cursor-pointer border border-primary/30"
                        >
                          🔗 {previewData.cartelliLink}
                        </a>
                      ) : (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded border">
                          Il link verrà generato automaticamente durante l'invio
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Chiudi
                </Button>
                <Button
                  onClick={() => {
                    setShowPreview(false);
                    // Opzionalmente potresti aprire direttamente l'invio
                  }}
                  className="btn-primary"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Procedi con invio
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}