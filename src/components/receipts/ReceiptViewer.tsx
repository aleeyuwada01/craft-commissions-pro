import { useState } from 'react';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { ReceiptPDF } from './ReceiptPDF';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Download, Eye } from 'lucide-react';

interface ReceiptItem {
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface ReceiptData {
    saleNumber: string;
    businessName: string;
    date: string;
    items: ReceiptItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: string;
    customerName?: string;
}

interface ReceiptViewerProps {
    data: ReceiptData;
}

export function ReceiptViewer({ data }: ReceiptViewerProps) {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewOpen(true)}
            >
                <Eye className="w-4 h-4 mr-2" />
                Preview Receipt
            </Button>

            <PDFDownloadLink
                document={<ReceiptPDF data={data} />}
                fileName={`receipt-${data.saleNumber}.pdf`}
            >
                {({ loading }) => (
                    <Button size="sm" disabled={loading}>
                        <Download className="w-4 h-4 mr-2" />
                        {loading ? 'Generating...' : 'Download PDF'}
                    </Button>
                )}
            </PDFDownloadLink>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Receipt Preview</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto">
                        <PDFViewer width="100%" height="600px">
                            <ReceiptPDF data={data} />
                        </PDFViewer>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
