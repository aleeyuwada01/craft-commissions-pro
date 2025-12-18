import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Camera, Sparkles, Shirt, Building2, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const businessTemplates = [
  {
    type: 'photography',
    name: 'Photography',
    icon: Camera,
    color: '#6366f1',
    services: [
      { name: 'Wedding Shoot', base_price: 500000 },
      { name: 'Event Coverage', base_price: 250000 },
      { name: 'Studio Session', base_price: 50000 },
      { name: 'Portrait Photography', base_price: 30000 },
    ],
  },
  {
    type: 'makeup',
    name: 'Makeup',
    icon: Sparkles,
    color: '#ec4899',
    services: [
      { name: 'Bridal Makeup', base_price: 150000 },
      { name: 'Glow Up', base_price: 25000 },
      { name: 'Eyebrow Shaping', base_price: 5000 },
      { name: 'Party Makeup', base_price: 35000 },
    ],
  },
  {
    type: 'clothing',
    name: 'Clothing',
    icon: Shirt,
    color: '#22c55e',
    services: [
      { name: 'T-Shirt', base_price: 8000 },
      { name: 'Dress', base_price: 25000 },
      { name: 'Alteration Service', base_price: 3000 },
      { name: 'Custom Tailoring', base_price: 50000 },
    ],
  },
  {
    type: 'custom',
    name: 'Custom Business',
    icon: Building2,
    color: '#f59e0b',
    services: [],
  },
];

export default function NewBusiness() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#6366f1');
  const [isCreating, setIsCreating] = useState(false);
  
  const navigate = useNavigate();
  const { createBusinessUnit } = useBusinessUnits();
  const { user } = useAuth();

  const handleCreate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a business type');
      return;
    }

    const template = businessTemplates.find((t) => t.type === selectedTemplate);
    if (!template) return;

    const name = selectedTemplate === 'custom' ? customName : template.name;
    const color = selectedTemplate === 'custom' ? customColor : template.color;

    if (!name.trim()) {
      toast.error('Please enter a business name');
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await createBusinessUnit(name, selectedTemplate, color);

      if (error) {
        toast.error('Failed to create business: ' + error.message);
        return;
      }

      // Create default services for the business
      if (data && template.services.length > 0) {
        const servicesWithBusinessId = template.services.map((service) => ({
          business_id: data.id,
          name: service.name,
          base_price: service.base_price,
        }));

        await supabase.from('services').insert(servicesWithBusinessId);
      }

      toast.success(`${name} business created successfully!`);
      navigate(`/business/${data?.id}`);
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Business</h1>
          <p className="text-muted-foreground">
            Choose a template or create a custom business
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {businessTemplates.map((template) => {
          const Icon = template.icon;
          const isSelected = selectedTemplate === template.type;

          return (
            <Card
              key={template.type}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                isSelected && 'ring-2 ring-primary'
              )}
              onClick={() => {
                setSelectedTemplate(template.type);
                if (template.type !== 'custom') {
                  setCustomName(template.name);
                  setCustomColor(template.color);
                }
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: template.color }} />
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground mt-4">
                  {template.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {template.services.length > 0
                    ? `${template.services.length} pre-configured services`
                    : 'Start from scratch'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTemplate === 'custom' && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Business Details</CardTitle>
            <CardDescription>
              Enter the details for your custom business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                placeholder="Enter business name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Brand Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTemplate && selectedTemplate !== 'custom' && (
        <Card>
          <CardHeader>
            <CardTitle>Pre-configured Services</CardTitle>
            <CardDescription>
              These services will be automatically added to your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {businessTemplates
                .find((t) => t.type === selectedTemplate)
                ?.services.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50"
                  >
                    <span className="text-foreground">{service.name}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(service.base_price)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={!selectedTemplate || isCreating}>
          {isCreating ? 'Creating...' : 'Create Business'}
        </Button>
      </div>
    </div>
  );
}
