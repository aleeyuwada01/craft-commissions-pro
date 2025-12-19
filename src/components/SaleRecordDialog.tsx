import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useServices, Service } from '@/hooks/useServices';
import { calculateCommission } from '@/lib/commission';
import { formatCurrency } from '@/lib/currency';
import { logActivity } from '@/hooks/useActivityLog';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, DollarSign, TrendingUp, Building2 } from 'lucide-react';

export interface SaleRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  businessId: string;
  commissionType: 'percentage' | 'fixed';
  commissionPercentage: number;
  fixedCommission: number;
  onSuccess?: () => void;
}

/**
 * Helper function to auto-populate sale amount from selected service.
 * Exported for property-based testing.
 */
export function getServicePrice(services: Service[], serviceId: string): number | null {
  const service = services.find(s => s.id === serviceId);
  return service ? service.base_price : null;
}

export function SaleRecordDialog({
  open,
  onOpenChange,
  employeeId,
  businessId,
  commissionType,
  commissionPercentage,
  fixedCommission,
  onSuccess,
}: SaleRecordDialogProps) {
  const { toast } = useToast();
  const { services, loading: servicesLoading, error: servicesError } = useServices(businessId);
  
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [saleAmount, setSaleAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedServiceId('');
      setSaleAmount('');
    }
  }, [open]);

  // Auto-populate amount when service is selected (Requirements 1.2)
  useEffect(() => {
    if (selectedServiceId) {
      const price = getServicePrice(services, selectedServiceId);
      if (price !== null) {
        setSaleAmount(price.toString());
      }
    }
  }, [selectedServiceId, services]);

  // Calculate commission preview (Requirements 2.1)
  const commissionPreview = useMemo(() => {
    const amount = parseFloat(saleAmount) || 0;
    if (amount <= 0) return null;

    return calculateCommission({
      saleAmount: amount,
      commissionType,
      commissionPercentage,
      fixedCommission,
    });
  }, [saleAmount, commissionType, commissionPercentage, fixedCommission]);

  // Validation
  const isValid = selectedServiceId && parseFloat(saleAmount) > 0;
  const hasNoServices = !servicesLoading && services.length === 0;

  const handleSubmit = async () => {
    if (!isValid || !commissionPreview) return;

    setSubmitting(true);

    try {
      const amount = parseFloat(saleAmount);

      // Insert transaction (Requirements 1.3, 3.1)
      const { error: txnError } = await supabase
        .from('transactions')
        .insert({
          business_id: businessId,
          employee_id: employeeId,
          service_id: selectedServiceId,
          total_amount: amount,
          commission_amount: commissionPreview.commission,
          house_amount: commissionPreview.houseAmount,
          is_commission_paid: false,
        });

      if (txnError) {
        throw new Error(txnError.message);
      }

      // Log activity (Requirements 3.3)
      await logActivity({
        employeeId,
        action: 'sale_recorded',
        details: `Recorded sale of ${formatCurrency(amount)}`,
      });

      toast({
        title: 'Sale Recorded',
        description: `Successfully recorded sale of ${formatCurrency(amount)}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to record sale:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record sale',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Record Sale
          </DialogTitle>
          <DialogDescription>
            Record a new sale and your commission will be calculated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">Service</Label>
            {servicesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading services...
              </div>
            ) : servicesError ? (
              <div className="text-sm text-destructive">
                Failed to load services. Please try again.
              </div>
            ) : hasNoServices ? (
              <div className="text-sm text-muted-foreground">
                No active services available for this business.
              </div>
            ) : (
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
              >
                <SelectTrigger id="service">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {formatCurrency(service.base_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Sale Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter sale amount"
              value={saleAmount}
              onChange={(e) => setSaleAmount(e.target.value)}
              min="0"
              step="0.01"
              disabled={hasNoServices}
            />
            {!selectedServiceId && saleAmount === '' && (
              <p className="text-xs text-muted-foreground">
                Select a service to auto-populate the amount
              </p>
            )}
          </div>

          {/* Commission Preview (Requirements 2.1) */}
          {commissionPreview && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <TrendingUp className="w-4 h-4" />
                  Commission Preview
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Your Commission</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(commissionPreview.commission)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {commissionType === 'percentage'
                        ? `${commissionPercentage}% of sale`
                        : 'Fixed amount'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      House Amount
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(commissionPreview.houseAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Message (Requirements 1.5) */}
          {!selectedServiceId && saleAmount !== '' && (
            <p className="text-sm text-destructive">
              Please select a service before submitting.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || submitting || hasNoServices}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              'Record Sale'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
