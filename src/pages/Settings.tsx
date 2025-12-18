import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Settings2 } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  is_active: boolean;
}

export default function BusinessSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<{ name: string; color: string; type: string } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Business form
  const [businessName, setBusinessName] = useState('');
  const [businessColor, setBusinessColor] = useState('#6366f1');

  // Service form
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    if (!id) return;

    const { data: businessData } = await supabase
      .from('business_units')
      .select('name, color, type')
      .eq('id', id)
      .single();

    if (businessData) {
      setBusiness(businessData);
      setBusinessName(businessData.name);
      setBusinessColor(businessData.color);
    }

    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', id)
      .order('name');

    if (servicesData) setServices(servicesData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleUpdateBusiness = async () => {
    if (!businessName.trim()) {
      toast.error('Please enter a business name');
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from('business_units')
      .update({ name: businessName, color: businessColor })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update business');
    } else {
      toast.success('Business updated');
      fetchData();
    }

    setIsSaving(false);
  };

  const handleDeleteBusiness = async () => {
    if (!confirm('Are you sure you want to delete this business? All employees, services, and transactions will be permanently deleted.')) {
      return;
    }

    const { error } = await supabase
      .from('business_units')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete business');
    } else {
      toast.success('Business deleted');
      navigate('/');
    }
  };

  const resetServiceForm = () => {
    setServiceName('');
    setServiceDescription('');
    setServicePrice('');
    setEditingService(null);
  };

  const handleOpenServiceDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setServiceName(service.name);
      setServiceDescription(service.description || '');
      setServicePrice(service.base_price.toString());
    } else {
      resetServiceForm();
    }
    setServiceDialogOpen(true);
  };

  const handleSaveService = async () => {
    if (!serviceName.trim() || !servicePrice) {
      toast.error('Please fill in name and price');
      return;
    }

    setIsSaving(true);

    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update({
            name: serviceName,
            description: serviceDescription || null,
            base_price: parseFloat(servicePrice),
          })
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('Service updated');
      } else {
        const { error } = await supabase.from('services').insert({
          business_id: id,
          name: serviceName,
          description: serviceDescription || null,
          base_price: parseFloat(servicePrice),
        });

        if (error) throw error;
        toast.success('Service added');
      }

      setServiceDialogOpen(false);
      resetServiceForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) {
      toast.error('Failed to delete service');
    } else {
      toast.success('Service deleted');
      fetchData();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/business/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">{business?.name}</p>
        </div>
      </div>

      {/* Business Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Business Details
          </CardTitle>
          <CardDescription>
            Update your business name and brand color
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Brand Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={businessColor}
                onChange={(e) => setBusinessColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <Input
                value={businessColor}
                onChange={(e) => setBusinessColor(e.target.value)}
                className="w-32"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleUpdateBusiness} disabled={isSaving}>
              Save Changes
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBusiness}
            >
              Delete Business
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Services & Products</CardTitle>
            <CardDescription>
              Manage the services and products for this business
            </CardDescription>
          </div>
          <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenServiceDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingService ? 'Edit Service' : 'Add New Service'}
                </DialogTitle>
                <DialogDescription>
                  Enter the service details and pricing
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Service Name *</Label>
                  <Input
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="e.g., Wedding Shoot"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Base Price ($) *</Label>
                  <Input
                    type="number"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <Button className="w-full" onClick={handleSaveService} disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingService ? 'Update' : 'Add Service'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No services configured yet
            </p>
          ) : (
            <div className="space-y-2">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {formatCurrency(service.base_price)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenServiceDialog(service)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteService(service.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
