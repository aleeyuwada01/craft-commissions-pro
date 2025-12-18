import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  Settings2, 
  Camera, 
  Sparkles, 
  Shirt, 
  Package,
  Zap,
  Check,
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  is_active: boolean;
}

interface ServiceTemplate {
  name: string;
  description: string;
  suggestedPrice: number;
  category: string;
}

// Nigerian Business Service Templates
const serviceTemplates: Record<string, ServiceTemplate[]> = {
  photography: [
    // Studio Services
    { name: 'Studio Portrait', description: 'Professional studio portrait session', suggestedPrice: 15000, category: 'Studio' },
    { name: 'Passport Photos', description: '8 passport-sized photos', suggestedPrice: 2000, category: 'Studio' },
    { name: 'CV/LinkedIn Photo', description: 'Professional headshot for CV/LinkedIn', suggestedPrice: 5000, category: 'Studio' },
    { name: 'Family Portrait', description: 'Family studio session (up to 6 people)', suggestedPrice: 25000, category: 'Studio' },
    { name: 'Birthday Photoshoot', description: 'Birthday celebration photos', suggestedPrice: 20000, category: 'Studio' },
    
    // Events
    { name: 'Wedding Coverage', description: 'Full day wedding photography', suggestedPrice: 150000, category: 'Events' },
    { name: 'Traditional Wedding', description: 'Traditional/Engagement ceremony coverage', suggestedPrice: 100000, category: 'Events' },
    { name: 'Pre-Wedding Shoot', description: 'Pre-wedding/Engagement photoshoot', suggestedPrice: 80000, category: 'Events' },
    { name: 'Naming Ceremony', description: 'Baby naming ceremony coverage', suggestedPrice: 50000, category: 'Events' },
    { name: 'Birthday Party', description: 'Birthday party event coverage', suggestedPrice: 40000, category: 'Events' },
    { name: 'Burial/Funeral', description: 'Memorial service coverage', suggestedPrice: 60000, category: 'Events' },
    { name: 'Convocation/Graduation', description: 'Graduation ceremony coverage', suggestedPrice: 35000, category: 'Events' },
    { name: 'House Warming', description: 'House warming party coverage', suggestedPrice: 45000, category: 'Events' },
    
    // Corporate
    { name: 'Corporate Event', description: 'Conference/Seminar coverage', suggestedPrice: 80000, category: 'Corporate' },
    { name: 'Product Photography', description: 'Product shots for business', suggestedPrice: 30000, category: 'Corporate' },
    { name: 'Company Profile Photos', description: 'Staff and office photos', suggestedPrice: 50000, category: 'Corporate' },
    
    // Add-ons
    { name: 'Extra Hour', description: 'Additional coverage hour', suggestedPrice: 15000, category: 'Add-ons' },
    { name: 'Photo Album (20 pages)', description: 'Premium printed album', suggestedPrice: 45000, category: 'Add-ons' },
    { name: 'Canvas Print', description: 'Large canvas wall print', suggestedPrice: 25000, category: 'Add-ons' },
    { name: 'Video Highlight', description: '3-5 min highlight video', suggestedPrice: 50000, category: 'Add-ons' },
  ],
  makeup: [
    // Casual/Daily
    { name: 'Day/Casual Makeup', description: 'Light natural everyday look', suggestedPrice: 8000, category: 'Casual' },
    { name: 'Office/Corporate', description: 'Professional office-ready look', suggestedPrice: 10000, category: 'Casual' },
    { name: 'Date Night', description: 'Elegant evening look', suggestedPrice: 12000, category: 'Casual' },
    
    // Events
    { name: 'Bridal Makeup', description: 'Complete bridal glam package', suggestedPrice: 80000, category: 'Bridal' },
    { name: 'Traditional Bridal', description: 'Traditional wedding makeup', suggestedPrice: 60000, category: 'Bridal' },
    { name: 'Bridal Trial', description: 'Pre-wedding makeup trial', suggestedPrice: 25000, category: 'Bridal' },
    { name: 'Engagement Makeup', description: 'Introduction/Engagement look', suggestedPrice: 35000, category: 'Events' },
    { name: 'Birthday Glam', description: 'Birthday celebration makeup', suggestedPrice: 20000, category: 'Events' },
    { name: 'Party/Owambe', description: 'Owambe party makeup', suggestedPrice: 25000, category: 'Events' },
    { name: 'Graduation Makeup', description: 'Convocation day look', suggestedPrice: 18000, category: 'Events' },
    
    // Special
    { name: 'Editorial/Photoshoot', description: 'High-fashion editorial makeup', suggestedPrice: 40000, category: 'Special' },
    { name: 'Gele Tying', description: 'Traditional gele styling', suggestedPrice: 8000, category: 'Add-ons' },
    { name: 'Hair Styling', description: 'Professional hair styling', suggestedPrice: 15000, category: 'Add-ons' },
    { name: 'Touch-up Service', description: 'Event touch-up service', suggestedPrice: 10000, category: 'Add-ons' },
    { name: 'Lash Application', description: 'Mink lash application', suggestedPrice: 5000, category: 'Add-ons' },
    
    // Training
    { name: 'Personal Makeup Class', description: '1-on-1 makeup lesson', suggestedPrice: 50000, category: 'Training' },
    { name: 'Group Class (per person)', description: 'Group makeup training', suggestedPrice: 25000, category: 'Training' },
  ],
  clothing: [
    // Men Traditional
    { name: 'Agbada (Complete)', description: 'Full agbada set with cap', suggestedPrice: 85000, category: 'Men Traditional' },
    { name: 'Senator/Kaftan', description: 'Senator style or Kaftan', suggestedPrice: 45000, category: 'Men Traditional' },
    { name: 'Native (2-piece)', description: 'Native shirt and trouser', suggestedPrice: 35000, category: 'Men Traditional' },
    { name: 'Dashiki', description: 'Embroidered dashiki', suggestedPrice: 25000, category: 'Men Traditional' },
    
    // Women Traditional
    { name: 'Iro and Buba', description: 'Traditional wrapper set', suggestedPrice: 40000, category: 'Women Traditional' },
    { name: 'Aso-Oke (Bride)', description: 'Full bridal aso-oke', suggestedPrice: 150000, category: 'Women Traditional' },
    { name: 'Ankara Gown', description: 'Custom ankara dress', suggestedPrice: 35000, category: 'Women Traditional' },
    { name: 'Ankara Skirt & Blouse', description: 'Skirt and blouse set', suggestedPrice: 30000, category: 'Women Traditional' },
    { name: 'Lace Dress', description: 'Lace fabric dress', suggestedPrice: 55000, category: 'Women Traditional' },
    { name: 'Bubu/Boubou', description: 'Flowing boubou dress', suggestedPrice: 45000, category: 'Women Traditional' },
    
    // Modern/Corporate
    { name: 'Corporate Dress', description: 'Office-ready dress', suggestedPrice: 25000, category: 'Modern' },
    { name: 'Blazer', description: 'Custom tailored blazer', suggestedPrice: 35000, category: 'Modern' },
    { name: 'Trouser', description: 'Custom trouser', suggestedPrice: 18000, category: 'Modern' },
    { name: 'Shirt (Men)', description: 'Custom fitted shirt', suggestedPrice: 15000, category: 'Modern' },
    
    // Special Occasions
    { name: 'Wedding Dress', description: 'Bridal gown', suggestedPrice: 200000, category: 'Special' },
    { name: 'Dinner/Evening Gown', description: 'Elegant evening wear', suggestedPrice: 65000, category: 'Special' },
    { name: 'Aso-Ebi (Per Yard Work)', description: 'Group outfit sewing', suggestedPrice: 8000, category: 'Special' },
    
    // Alterations
    { name: 'Simple Alteration', description: 'Minor adjustments', suggestedPrice: 3000, category: 'Alterations' },
    { name: 'Major Alteration', description: 'Significant changes', suggestedPrice: 8000, category: 'Alterations' },
    { name: 'Restyling', description: 'Complete outfit rework', suggestedPrice: 15000, category: 'Alterations' },
  ],
  custom: [
    { name: 'Basic Service', description: 'Standard service offering', suggestedPrice: 10000, category: 'General' },
    { name: 'Premium Service', description: 'Premium tier service', suggestedPrice: 25000, category: 'General' },
    { name: 'Consultation', description: 'Professional consultation', suggestedPrice: 5000, category: 'General' },
    { name: 'Express/Rush Fee', description: 'Urgent delivery surcharge', suggestedPrice: 5000, category: 'Add-ons' },
    { name: 'Home Service', description: 'Service at client location', suggestedPrice: 10000, category: 'Add-ons' },
    { name: 'Package Deal', description: 'Bundled services discount', suggestedPrice: 50000, category: 'Packages' },
  ],
};

const businessTypeIcons: Record<string, React.ElementType> = {
  photography: Camera,
  makeup: Sparkles,
  clothing: Shirt,
  custom: Package,
};

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

  // Template selection
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplates, setSelectedTemplates] = useState<ServiceTemplate[]>([]);

  const fetchData = async () => {
    if (!id) return;

    const { data: businessData } = await supabase
      .from('business_units')
      .select('name, color, type')
      .eq('id', id)
      .maybeSingle();

    if (businessData) {
      setBusiness(businessData);
      setBusinessName(businessData.name);
      setBusinessColor(businessData.color || '#22c55e');
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

  const toggleTemplateSelection = (template: ServiceTemplate) => {
    const isSelected = selectedTemplates.some(t => t.name === template.name);
    if (isSelected) {
      setSelectedTemplates(selectedTemplates.filter(t => t.name !== template.name));
    } else {
      setSelectedTemplates([...selectedTemplates, template]);
    }
  };

  const handleAddFromTemplates = async () => {
    if (selectedTemplates.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    setIsSaving(true);

    try {
      const servicesToAdd = selectedTemplates.map(t => ({
        business_id: id,
        name: t.name,
        description: t.description,
        base_price: t.suggestedPrice,
      }));

      const { error } = await supabase.from('services').insert(servicesToAdd);

      if (error) throw error;

      toast.success(`Added ${selectedTemplates.length} services`);
      setTemplateDialogOpen(false);
      setSelectedTemplates([]);
      setSelectedCategory('all');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getTemplatesForBusiness = () => {
    const type = business?.type || 'custom';
    return serviceTemplates[type] || serviceTemplates.custom;
  };

  const getCategories = () => {
    const templates = getTemplatesForBusiness();
    const categories = [...new Set(templates.map(t => t.category))];
    return categories;
  };

  const filteredTemplates = () => {
    const templates = getTemplatesForBusiness();
    if (selectedCategory === 'all') return templates;
    return templates.filter(t => t.category === selectedCategory);
  };

  const existingServiceNames = services.map(s => s.name.toLowerCase());

  const BusinessIcon = businessTypeIcons[business?.type || 'custom'] || Package;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/business/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: business?.color || '#22c55e' }}
          >
            <BusinessIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">{business?.name}</p>
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-border"
                />
                <Input
                  value={businessColor}
                  onChange={(e) => setBusinessColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
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
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Services & Pricing</CardTitle>
              <CardDescription>
                Manage services and products with flexible pricing
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {/* Quick Add from Templates */}
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Zap className="w-4 h-4 mr-2" />
                    Quick Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <BusinessIcon className="w-5 h-5" />
                      Add from Templates
                    </DialogTitle>
                    <DialogDescription>
                      Select services to add quickly. Prices can be edited later.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {/* Category Filter */}
                  <div className="flex gap-2 flex-wrap py-2">
                    <Button
                      variant={selectedCategory === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory('all')}
                    >
                      All
                    </Button>
                    {getCategories().map(cat => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>

                  {/* Templates List */}
                  <div className="flex-1 overflow-y-auto space-y-2 py-2">
                    {filteredTemplates().map((template) => {
                      const isSelected = selectedTemplates.some(t => t.name === template.name);
                      const alreadyExists = existingServiceNames.includes(template.name.toLowerCase());
                      
                      return (
                        <button
                          key={template.name}
                          onClick={() => !alreadyExists && toggleTemplateSelection(template)}
                          disabled={alreadyExists}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            alreadyExists 
                              ? 'opacity-50 cursor-not-allowed bg-muted' 
                              : isSelected 
                                ? 'border-primary bg-primary/10' 
                                : 'border-border hover:border-primary/50 hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{template.name}</p>
                                <Badge variant="secondary" className="text-xs">
                                  {template.category}
                                </Badge>
                                {alreadyExists && (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Already added
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{template.description}</p>
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <span className="text-sm font-semibold text-primary">
                                {formatCurrency(template.suggestedPrice)}
                              </span>
                              {isSelected && (
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="w-4 h-4 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      {selectedTemplates.length} selected
                    </p>
                    <Button 
                      onClick={handleAddFromTemplates} 
                      disabled={isSaving || selectedTemplates.length === 0}
                    >
                      {isSaving ? 'Adding...' : `Add ${selectedTemplates.length} Services`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Custom Service */}
              <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => handleOpenServiceDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Custom
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingService ? 'Edit Service' : 'Add Custom Service'}
                    </DialogTitle>
                    <DialogDescription>
                      Create a custom service with your own pricing
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Service Name *</Label>
                      <Input
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        placeholder="e.g., Studio Shoot, Bridal Makeup..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={serviceDescription}
                        onChange={(e) => setServiceDescription(e.target.value)}
                        placeholder="Brief description of the service"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Price (₦) *</Label>
                      <Input
                        type="number"
                        value={servicePrice}
                        onChange={(e) => setServicePrice(e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                      {servicePrice && (
                        <p className="text-sm text-muted-foreground">
                          = {formatCurrency(parseFloat(servicePrice) || 0)}
                        </p>
                      )}
                    </div>
                    <Button className="w-full" onClick={handleSaveService} disabled={isSaving}>
                      {isSaving ? 'Saving...' : editingService ? 'Update Service' : 'Add Service'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No services yet</h3>
              <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                Add services your business offers. Use &quot;Quick Add&quot; for common Nigerian business services or create custom ones.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                  <Zap className="w-4 h-4 mr-2" />
                  Quick Add Templates
                </Button>
                <Button onClick={() => handleOpenServiceDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-transparent hover:border-primary/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-muted-foreground truncate">{service.description}</p>
                    )}
                    <p className="text-sm font-semibold text-primary mt-1">
                      {formatCurrency(service.base_price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenServiceDialog(service)}
                      className="h-8 w-8"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteService(service.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
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

      {/* Tips */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Pro Tips</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Prices can be adjusted per sale when recording transactions</li>
                <li>• Use descriptive names so employees can quickly select services</li>
                <li>• Add &quot;Add-on&quot; services for extras like albums, touch-ups, etc.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
