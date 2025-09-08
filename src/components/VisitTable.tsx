import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Check, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Store {
  id: string;
  name: string;
  chain: string;
  category: string;
  location: string;
}

interface Tactician {
  id: string;
  name: string;
  created_at: string;
}

interface Visit {
  id: string;
  store_id: string;
  tactician_id?: string;
  visit_date?: string;
  visit_time?: string;
  date_communicated: boolean;
  mail_cartellini: boolean;
  status: 'da_effettuare' | 'completata' | 'effettuata_non_completata';
  notes?: string;
}

interface VisitTableProps {
  stores: Store[];
  tacticians: Tactician[];
  launchDates: Date[];
  visits: Visit[];
  onVisitUpdate?: (storeId: string, field: string, value: any) => void;
  readOnly?: boolean;
}

const statusLabels = {
  da_effettuare: 'Da effettuare',
  completata: 'Completata',
  effettuata_non_completata: 'Effettuata non completata'
};

const statusColors = {
  da_effettuare: 'bg-yellow-100 text-yellow-800',
  completata: 'bg-green-100 text-green-800',
  effettuata_non_completata: 'bg-orange-100 text-orange-800'
};

export const VisitTable = ({ stores, tacticians, launchDates, visits, onVisitUpdate, readOnly = false }: VisitTableProps) => {
  const [openDateDialog, setOpenDateDialog] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState("");
  const [tempTime, setTempTime] = useState("");

  const getVisitForStore = (storeId: string) => {
    return visits.find(v => v.store_id === storeId);
  };

  const openDateSelector = (storeId: string) => {
    const visit = getVisitForStore(storeId);
    setTempDate(visit?.visit_date || "");
    setTempTime(visit?.visit_time || "");
    setOpenDateDialog(storeId);
  };

  const saveDateAndTime = () => {
    if (openDateDialog && tempDate && onVisitUpdate) {
      onVisitUpdate(openDateDialog, 'visit_date', tempDate);
      if (tempTime) {
        onVisitUpdate(openDateDialog, 'visit_time', tempTime);
      }
    }
    setOpenDateDialog(null);
    setTempDate("");
    setTempTime("");
  };

  const formatVisitDateTime = (date: string, time?: string) => {
    try {
      const visitDate = new Date(date);
      const dayName = format(visitDate, 'EEEE', { locale: it });
      const dayNumber = format(visitDate, 'd');
      const timeFormatted = time ? ` ore ${time.substring(0, 5)}` : '';
      
      // Capitalize first letter of day name
      const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      
      return `${capitalizedDayName} ${dayNumber}${timeFormatted}`;
    } catch (error) {
      return 'Data non valida';
    }
  };

  const getDateOptions = () => {
    return launchDates.map((date, index) => ({
      value: date.toISOString().split('T')[0],
      label: format(date, 'dd/MM/yyyy', { locale: it }),
      dayNumber: index + 1
    }));
  };

  if (stores.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nessun store in questa categoria
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[16%]">Nome Store</TableHead>
            <TableHead className="w-[16%]">Tattico</TableHead>
            <TableHead className="w-[13%]">Data Visita</TableHead>
            <TableHead className="w-16 text-center">Data Comunicata</TableHead>
            <TableHead className="w-20 text-center">Mail Cartellini</TableHead>
            <TableHead className="w-[10%]">Stato Visita</TableHead>
            <TableHead className="w-[27%]">Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stores.map((store) => {
            const visit = getVisitForStore(store.id);
            const dateOptions = getDateOptions();
            
            return (
              <TableRow key={store.id}>
                <TableCell className="font-medium">
                  <div className={`inline-block px-3 py-2 rounded-lg ${
                    visit?.status === 'completata' ? 'bg-green-500 text-white border border-green-600' :
                    visit?.status === 'effettuata_non_completata' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                    ''
                  }`}>
                    <div>{store.name}</div>
                    <div className={`text-xs ${
                      visit?.status === 'completata' ? 'text-green-100' : 'text-muted-foreground'
                    }`}>{store.location}</div>
                  </div>
                </TableCell>
                
                <TableCell>
                  {readOnly ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {(() => {
                        const tactician = tacticians.find(t => t.id === visit?.tactician_id);
                        return tactician?.name?.trim() || "Non assegnato";
                      })()}
                    </div>
                  ) : (
                    <Select 
                      value={visit?.tactician_id || ""} 
                      onValueChange={(value) => onVisitUpdate && onVisitUpdate(store.id, 'tactician_id', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        {tacticians.map((tactician) => (
                          <SelectItem key={tactician.id} value={tactician.id}>
                            {tactician.name?.trim()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                
                <TableCell>
                  {readOnly ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {visit?.visit_date ? formatVisitDateTime(visit.visit_date, visit.visit_time) : "TBD"}
                    </div>
                  ) : (
                    <Dialog open={openDateDialog === store.id} onOpenChange={(open) => !open && setOpenDateDialog(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => openDateSelector(store.id)}
                          className="h-auto py-2 px-2 justify-start text-left font-normal min-w-[110px] w-auto whitespace-nowrap"
                        >
                          <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="flex-1">
                            {visit?.visit_date ? 
                              formatVisitDateTime(visit.visit_date, visit.visit_time) : 
                              "TBD"
                            }
                          </span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Seleziona Data e Ora Visita</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="date">Data Visita</Label>
                            <Select value={tempDate} onValueChange={setTempDate}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona una data" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                {getDateOptions().map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.dayNumber}° giorno - {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="time">Orario</Label>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <Input
                                id="time"
                                type="time"
                                value={tempTime}
                                onChange={(e) => setTempTime(e.target.value)}
                                className="flex-1"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setOpenDateDialog(null)}>
                              Annulla
                            </Button>
                            <Button onClick={saveDateAndTime} disabled={!tempDate}>
                              Salva
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </TableCell>
                
                <TableCell className="text-center">
                  {readOnly ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {visit?.date_communicated ? "Sì" : "No"}
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVisitUpdate && onVisitUpdate(store.id, 'date_communicated', !visit?.date_communicated)}
                        className="h-8 w-8 p-0"
                      >
                        {visit?.date_communicated ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    </div>
                  )}
                </TableCell>
                
                <TableCell className="text-center">
                  {readOnly ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {visit?.mail_cartellini ? "Sì" : "No"}
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVisitUpdate && onVisitUpdate(store.id, 'mail_cartellini', !visit?.mail_cartellini)}
                        className="h-8 w-8 p-0"
                      >
                        {visit?.mail_cartellini ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    </div>
                  )}
                </TableCell>
                
                <TableCell>
                  {readOnly ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {statusLabels[visit?.status || 'da_effettuare']}
                    </div>
                  ) : (
                    <Select 
                      value={visit?.status || "da_effettuare"} 
                      onValueChange={(value) => onVisitUpdate && onVisitUpdate(store.id, 'status', value)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="da_effettuare">Da effettuare</SelectItem>
                        <SelectItem value="completata">Completata</SelectItem>
                        <SelectItem value="effettuata_non_completata">Effettuata non completata</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                
                <TableCell>
                  {readOnly ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground max-w-[200px] break-words">
                      {visit?.notes || "Nessuna nota"}
                    </div>
                  ) : (
                    <Textarea
                      placeholder="Note..."
                      value={visit?.notes || ""}
                      onChange={(e) => onVisitUpdate && onVisitUpdate(store.id, 'notes', e.target.value)}
                      className="min-h-[60px] resize-none"
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};