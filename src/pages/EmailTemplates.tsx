import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Mail } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  name: string;
  store_category: 'White' | 'Tier2';
  subject: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const EmailTemplates = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    store_category: '' as 'White' | 'Tier2' | '',
    subject: '',
    content: ''
  });
  const { toast } = useToast();

  const placeholders = [
    { key: '[nome_tattico]', description: 'Nome del tattico assegnato allo store' },
    { key: '[data_visita]', description: 'Data della visita programmata' },
    { key: '[orario_installazione]', description: 'Messaggio automatico basato sull\'orario di visita: prima delle 13 (apertura) o dopo le 14 (pomeriggio)' },
    { key: '[nome_store]', description: 'Nome dello store' },
    { key: '[indirizzo_store]', description: 'Indirizzo dello store' },
    { key: '[nome_lancio]', description: 'Nome del lancio' },
    { key: '[prodotti_lancio]', description: 'Lista automatica dei prodotti del lancio specifici per lo store. Formato: "• dispositivo (colore) X[quantità]" raggruppati automaticamente per nome e colore.' },
    { key: '[motivo_mail]', description: 'Motivo della mail (Cartelli prezzo / Nominativo Tattico e Data installazione)' },
    { key: '[tipologia_invio_cartelli]', description: 'Sostituito automaticamente con il link di download se si sceglie "Link Download", altrimenti rimosso se si sceglie "Allegati"' }
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as EmailTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i template email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.store_category || !formData.subject || !formData.content) {
      toast({
        title: "Errore",
        description: "Tutti i campi sono obbligatori",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update(formData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        
        toast({
          title: "Successo",
          description: "Template aggiornato con successo",
        });
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert([formData]);

        if (error) throw error;
        
        toast({
          title: "Successo",
          description: "Template creato con successo",
        });
      }

      setIsDialogOpen(false);
      setEditingTemplate(null);
      setFormData({ name: '', store_category: '', subject: '', content: '' });
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il template",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      store_category: template.store_category,
      subject: template.subject,
      content: template.content
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo template?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Template eliminato con successo",
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il template",
        variant: "destructive",
      });
    }
  };

  const insertPlaceholder = (placeholder: string, target: 'subject' | 'content' = 'content') => {
    if (target === 'subject') {
      const subjectInput = document.querySelector('input[id="subject"]') as HTMLInputElement;
      if (subjectInput) {
        const start = subjectInput.selectionStart || 0;
        const end = subjectInput.selectionEnd || 0;
        const text = subjectInput.value;
        const newText = text.substring(0, start) + placeholder + text.substring(end);
        
        setFormData(prev => ({ ...prev, subject: newText }));
        
        setTimeout(() => {
          subjectInput.focus();
          subjectInput.setSelectionRange(start + placeholder.length, start + placeholder.length);
        }, 0);
      }
    } else {
      const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + placeholder + text.substring(end);
        
        setFormData(prev => ({ ...prev, content: newText }));
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
        }, 0);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Caricamento template...</div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-8 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Template Email</h1>
          <p className="text-muted-foreground">
            Gestisci i template per l'invio delle email ai diversi store
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTemplate(null);
              setFormData({ name: '', store_category: '', subject: '', content: '' });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Template</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Es. Template Lancio White"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria Store</Label>
                  <Select 
                    value={formData.store_category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, store_category: value as 'White' | 'Tier2' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="White">White</SelectItem>
                      <SelectItem value="Tier2">Tier2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="subject">Oggetto Email</Label>
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertPlaceholder('[nome_lancio]', 'subject')}
                      className="h-6 px-2 text-xs"
                    >
                      [nome_lancio]
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertPlaceholder('[motivo_mail]', 'subject')}
                      className="h-6 px-2 text-xs"
                    >
                      [motivo_mail]
                    </Button>
                  </div>
                </div>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Es. Nuovo Lancio Apple - [nome_lancio]"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="content">Contenuto Email</Label>
                  <Textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Scrivi il contenuto del template qui..."
                    className="min-h-[300px]"
                    required
                  />
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Placeholder Disponibili</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Clicca per inserire nel contenuto
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {placeholders.map((placeholder) => (
                      <div key={placeholder.key} className="flex flex-col space-y-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertPlaceholder(placeholder.key)}
                          className="justify-start"
                        >
                          <code className="text-sm">{placeholder.key}</code>
                        </Button>
                        <p className="text-xs text-muted-foreground px-2">
                          {placeholder.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit">
                  {editingTemplate ? 'Aggiorna' : 'Crea'} Template
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessun template trovato</h3>
              <p className="text-muted-foreground text-center mb-4">
                Inizia creando il tuo primo template email per i lanci
              </p>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      <Badge variant={template.store_category === 'White' ? 'default' : 'secondary'}>
                        {template.store_category}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Oggetto:</strong> {template.subject}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {template.content.substring(0, 200)}
                    {template.content.length > 200 && '...'}
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Creato il {new Date(template.created_at).toLocaleDateString('it-IT')}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default EmailTemplates;