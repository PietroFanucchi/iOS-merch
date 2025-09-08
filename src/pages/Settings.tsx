import { Settings as SettingsIcon, User, Shield, Database, Mail, Download, Upload, Image, Trash2, Plus, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";

export default function Settings() {
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useProfile();
  // Removed SMTP settings since using mailto
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [accountData, setAccountData] = useState({
    email: '',
    fullName: ''
  });
  const [chainLogos, setChainLogos] = useState<any[]>([]);
  const [availableChains, setAvailableChains] = useState<string[]>([]);
  const [selectedChain, setSelectedChain] = useState('');
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  });
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setAccountData({
        email: profile.email,
        fullName: profile.email // You might want to add a full_name field to profiles table
      });
    }
  }, [profile]);

  useEffect(() => {
    fetchChainLogos();
    fetchAvailableChains();
    fetchUsers();
  }, []);

  const fetchChainLogos = async () => {
    try {
      const { data, error } = await supabase
        .from('chain_logos')
        .select('*')
        .order('chain');
      
      if (error) throw error;
      setChainLogos(data || []);
    } catch (error) {
      console.error('Error fetching chain logos:', error);
    }
  };

  const fetchAvailableChains = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('chain')
        .not('chain', 'is', null);
      
      if (error) throw error;
      
      // Get unique chains
      const uniqueChains = [...new Set(data?.map(store => store.chain) || [])].sort();
      setAvailableChains(uniqueChains);
    } catch (error) {
      console.error('Error fetching available chains:', error);
    }
  };

  // SMTP functionality removed - using mailto instead

  const updatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non corrispondono.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve essere di almeno 6 caratteri.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Password aggiornata",
        description: "La password è stata cambiata con successo.",
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento della password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAccount = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: accountData.email
      });

      if (error) throw error;

      toast({
        title: "Account aggiornato",
        description: "Le informazioni dell'account sono state salvate.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento dell'account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    setLoading(true);
    try {
      // Fetch all main data tables
      const [stores, devices, tables, launches, visits] = await Promise.all([
        supabase.from('stores').select('*'),
        supabase.from('devices').select('*'),
        supabase.from('tables').select('*'),
        supabase.from('launches').select('*'),
        supabase.from('visits').select('*')
      ]);

      const exportData = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        data: {
          stores: stores.data || [],
          devices: devices.data || [],
          tables: tables.data || [],
          launches: launches.data || [],
          visits: visits.data || []
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `table-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Dati esportati",
        description: "Il backup è stato scaricato con successo.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Errore durante l'esportazione dei dati.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const importData = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.data) {
        throw new Error("Formato file non valido");
      }

      toast({
        title: "Importazione in corso",
        description: "Attendere, importazione dei dati in corso...",
      });

      // Import data (this is a simplified version - you might want to add more validation)
      if (importData.data.stores?.length > 0) {
        await supabase.from('stores').upsert(importData.data.stores);
      }
      if (importData.data.devices?.length > 0) {
        await supabase.from('devices').upsert(importData.data.devices);
      }
      if (importData.data.tables?.length > 0) {
        await supabase.from('tables').upsert(importData.data.tables);
      }

      toast({
        title: "Dati importati",
        description: "Il backup è stato importato con successo.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'importazione dei dati.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importData(file);
    }
  };

  const uploadChainLogo = async (file: File) => {
    if (!selectedChain) {
      toast({
        title: "Errore",
        description: "Seleziona una catena prima di caricare il logo.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create a unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${selectedChain.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${fileExtension}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('chain-logos')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chain-logos')
        .getPublicUrl(fileName);

      // Save or update logo record in database
      const { error: dbError } = await supabase
        .from('chain_logos')
        .upsert({
          chain: selectedChain,
          logo_url: urlData.publicUrl,
          logo_filename: fileName
        });

      if (dbError) throw dbError;

      toast({
        title: "Logo caricato",
        description: `Logo per ${selectedChain} caricato con successo.`,
      });

      // Refresh the logos list
      fetchChainLogos();
      setSelectedChain('');
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante il caricamento del logo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteChainLogo = async (logoId: string, filename: string) => {
    setLoading(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('chain-logos')
        .remove([filename]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('chain_logos')
        .delete()
        .eq('id', logoId);

      if (dbError) throw dbError;

      toast({
        title: "Logo eliminato",
        description: "Logo eliminato con successo.",
      });

      // Refresh the logos list
      fetchChainLogos();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione del logo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email');
      
      if (error) throw error;
      
      // Get last sign in data for each user using our custom function
      const usersWithLastAccess = await Promise.all((data || []).map(async (user) => {
        try {
          const { data: lastSignIn } = await supabase.rpc('get_user_last_sign_in', {
            user_uuid: user.user_id
          });
          
          return {
            ...user,
            last_sign_in_at: lastSignIn
          };
        } catch (error) {
          console.error('Error getting last sign in for user:', user.email, error);
          return {
            ...user,
            last_sign_in_at: null
          };
        }
      }));
      
      setUsers(usersWithLastAccess);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({
        title: "Campi obbligatori",
        description: "Inserisci email e password per il nuovo utente.",
        variant: "destructive",
      });
      return;
    }

    if (newUser.password.length < 6) {
      toast({
        title: "Password troppo corta",
        description: "La password deve essere di almeno 6 caratteri.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          role: newUser.role
        }
      });

      if (error) throw error;

      toast({
        title: "Utente creato",
        description: `Utente ${newUser.email} creato con successo con ruolo ${newUser.role}.`,
      });

      setNewUser({
        email: '',
        password: '',
        role: 'user'
      });

      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione dell'utente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        throw error;
      }

      toast({
        title: "Ruolo aggiornato",
        description: `Ruolo utente aggiornato con successo a ${newRole}.`,
      });

      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      console.error('Full error:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento del ruolo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Impostazioni</h1>
        <p className="text-muted-foreground">Configura le impostazioni del sistema di gestione tavoli</p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account e Sicurezza</TabsTrigger>
          {profile?.role === 'admin' && (
            <TabsTrigger value="users">Gestione Utenti</TabsTrigger>
          )}
          <TabsTrigger value="system">Sistema e Configurazioni</TabsTrigger>
        </TabsList>

        {/* Account e Sicurezza Tab */}
        <TabsContent value="account" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Settings */}
            <Card className="card-apple">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Impostazioni Account
                </CardTitle>
                <CardDescription>
                  Gestisci le informazioni del tuo profilo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={accountData.email}
                    onChange={(e) => setAccountData({...accountData, email: e.target.value})}
                    className="input-apple" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Ruolo</Label>
                  <Input 
                    id="role" 
                    value={profile?.role || 'Caricamento...'} 
                    className="input-apple" 
                    disabled 
                  />
                </div>
                <Button 
                  className="btn-primary w-full" 
                  onClick={updateAccount}
                  disabled={loading || profileLoading}
                >
                  {loading ? "Salvando..." : "Salva modifiche"}
                </Button>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="card-apple">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Sicurezza
                </CardTitle>
                <CardDescription>
                  Gestisci la sicurezza del tuo account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nuova password</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="input-apple" 
                    placeholder="Inserisci la nuova password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Conferma password</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="input-apple" 
                    placeholder="Conferma la nuova password"
                  />
                </div>
                <Button 
                  className="btn-primary w-full" 
                  onClick={updatePassword}
                  disabled={loading || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  {loading ? "Aggiornando..." : "Aggiorna password"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Gestione Utenti Tab - Only for Admins */}
        {profile?.role === 'admin' && (
          <TabsContent value="users" className="space-y-6">
            <Card className="card-apple">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Gestione Utenti
                </CardTitle>
                <CardDescription>
                  Crea nuovi utenti e gestisci i ruoli (Solo Admin)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Create New User Form */}
                <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus className="w-4 h-4" />
                    <h4 className="font-medium">Crea Nuovo Utente</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-user-email">Email</Label>
                      <Input 
                        id="new-user-email" 
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        placeholder="user@example.com"
                        className="input-apple" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-user-password">Password</Label>
                      <Input 
                        id="new-user-password" 
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        placeholder="Almeno 6 caratteri"
                        className="input-apple" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-user-role">Ruolo</Label>
                      <Select value={newUser.role} onValueChange={(value: 'admin' | 'user') => setNewUser({...newUser, role: value})}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleziona ruolo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Utente</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={createUser}
                    disabled={loading || !newUser.email || !newUser.password}
                    className="btn-primary w-full md:w-auto"
                  >
                    {loading ? "Creando..." : "Crea Utente"}
                  </Button>
                </div>

                {/* Users List */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <h4 className="font-medium">Utenti Esistenti ({users.length})</h4>
                  </div>
                  
                  {users.length > 0 ? (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted p-3 border-b border-border">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-medium">
                          <div>Email</div>
                          <div>Ruolo</div>
                          <div>Data Creazione</div>
                          <div>Ultimo Accesso</div>
                        </div>
                      </div>
                       <div className="divide-y divide-border">
                         {users.map((user) => (
                           <div key={`${user.user_id}-${user.role}`} className="p-3 hover:bg-muted/50 transition-colors">
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm items-center">
                               <div className="font-medium">{user.email}</div>
                               <div>
                                 <Select 
                                   key={`select-${user.user_id}-${user.role}`}
                                   value={user.role} 
                                   onValueChange={(newRole: 'admin' | 'user') => updateUserRole(user.user_id, newRole)}
                                   disabled={loading}
                                 >
                                   <SelectTrigger className="w-24">
                                     <SelectValue placeholder={user.role === 'admin' ? 'Admin' : 'Utente'} />
                                   </SelectTrigger>
                                   <SelectContent>
                                     <SelectItem value="user">Utente</SelectItem>
                                     <SelectItem value="admin">Admin</SelectItem>
                                   </SelectContent>
                                 </Select>
                               </div>
                               <div className="text-muted-foreground">
                                 {new Date(user.created_at).toLocaleDateString('it-IT')}
                               </div>
                               <div className="text-muted-foreground">
                                 {user.last_sign_in_at 
                                   ? new Date(user.last_sign_in_at).toLocaleDateString('it-IT', {
                                       year: 'numeric',
                                       month: 'short',
                                       day: 'numeric',
                                       hour: '2-digit',
                                       minute: '2-digit'
                                     })
                                   : 'Mai'
                                 }
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
                      <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nessun utente trovato</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Sistema e Configurazioni Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Settings */}
            <Card className="card-apple">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Sistema
                </CardTitle>
                <CardDescription>
                  Configurazioni avanzate del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Backup automatico</div>
                    <div className="text-xs text-muted-foreground">
                      Esegui backup automatici ogni giorno
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Modalità manutenzione</div>
                    <div className="text-xs text-muted-foreground">
                      Attiva per operazioni di manutenzione
                    </div>
                  </div>
                  <Switch />
                </div>
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="text-sm font-medium">Gestione Backup</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="btn-secondary flex items-center gap-2"
                      onClick={exportData}
                      disabled={loading}
                    >
                      <Download className="w-4 h-4" />
                      {loading ? "Esportando..." : "Esporta dati"}
                    </Button>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={loading}
                      />
                      <Button 
                        variant="outline" 
                        className="btn-secondary w-full flex items-center gap-2"
                        disabled={loading}
                      >
                        <Upload className="w-4 h-4" />
                        {loading ? "Importando..." : "Importa dati"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chain Logos Management */}
            <Card className="card-apple">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Gestione Loghi Catene
                </CardTitle>
                <CardDescription>
                  Carica e gestisci i loghi per le diverse catene di negozi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="chain-select">Seleziona Catena</Label>
                    <Select value={selectedChain} onValueChange={setSelectedChain}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Scegli una catena esistente..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border shadow-lg z-50">
                        {availableChains.map((chain) => (
                          <SelectItem key={chain} value={chain} className="hover:bg-accent">
                            {chain}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <FileUpload
                    onFileSelect={uploadChainLogo}
                    accept="image/*"
                    maxSize={2 * 1024 * 1024} // 2MB
                    disabled={loading || !selectedChain}
                  />
                </div>

                {/* Current Chain Logo */}
                {selectedChain && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      <h4 className="font-medium">Logo Attuale - {selectedChain}</h4>
                    </div>
                    
                    {(() => {
                      const currentLogo = chainLogos.find(logo => logo.chain === selectedChain);
                      return currentLogo ? (
                        <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{currentLogo.chain}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteChainLogo(currentLogo.id, currentLogo.logo_filename)}
                              disabled={loading}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="aspect-square rounded-md overflow-hidden bg-muted flex items-center justify-center max-w-32">
                            <img
                              src={currentLogo.logo_url}
                              alt={`Logo ${currentLogo.chain}`}
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = '<div class="text-muted-foreground text-sm">Immagine non disponibile</div>';
                              }}
                            />
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {new Date(currentLogo.created_at).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground border border-dashed border-border rounded-lg">
                          <Image className="w-6 h-6 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nessun logo per {selectedChain}</p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SMTP settings removed - using mailto */}
        </TabsContent>
      </Tabs>
    </div>
  );
}