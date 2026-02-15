import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        textAlign: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottom: '1 solid #333',
    },
    businessName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 3,
    },
    receiptTitle: {
        fontSize: 12,
        color: '#555',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
    },
    infoLabel: {
        fontSize: 9,
        color: '#666',
    },
    infoValue: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    divider: {
        borderBottom: '1 dashed #ccc',
        marginVertical: 8,
    },
    itemHeader: {
        flexDirection: 'row',
        borderBottom: '1 solid #333',
        paddingBottom: 4,
        marginBottom: 4,
    },
    itemHeaderText: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    itemRow: {
        flexDirection: 'row',
        marginBottom: 3,
        paddingBottom: 3,
    },
    itemName: {
        flex: 3,
        fontSize: 9,
    },
    itemQty: {
        flex: 1,
        fontSize: 9,
        textAlign: 'center',
    },
    itemPrice: {
        flex: 2,
        fontSize: 9,
        textAlign: 'right',
    },
    itemTotal: {
        flex: 2,
        fontSize: 9,
        textAlign: 'right',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
    },
    summaryLabel: {
        fontSize: 10,
    },
    summaryValue: {
        fontSize: 10,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        paddingTop: 5,
        borderTop: '2 solid #333',
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    totalValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    footer: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 9,
        color: '#888',
    },
    paymentBadge: {
        backgroundColor: '#e8f5e9',
        padding: 5,
        borderRadius: 3,
        textAlign: 'center',
        marginTop: 10,
    },
    paymentText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
});

interface SaleItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface SaleReceiptData {
    receiptNumber: string;
    date: string;
    businessName: string;
    cashierName?: string;
    items: SaleItem[];
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    paymentMethod: string;
    customerName?: string;
}

interface SaleReceiptPDFProps {
    data: SaleReceiptData;
}

function formatNaira(amount: number): string {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SaleReceiptPDF({ data }: SaleReceiptPDFProps) {
    return (
        <Document>
            <Page size={[226, 'auto']} style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.businessName}>{data.businessName}</Text>
                    <Text style={styles.receiptTitle}>SALES RECEIPT</Text>
                </View>

                {/* Receipt Info */}
                <View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Receipt #:</Text>
                        <Text style={styles.infoValue}>{data.receiptNumber}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Date:</Text>
                        <Text style={styles.infoValue}>{data.date}</Text>
                    </View>
                    {data.cashierName && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Cashier:</Text>
                            <Text style={styles.infoValue}>{data.cashierName}</Text>
                        </View>
                    )}
                    {data.customerName && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Customer:</Text>
                            <Text style={styles.infoValue}>{data.customerName}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.divider} />

                {/* Items Header */}
                <View style={styles.itemHeader}>
                    <Text style={[styles.itemHeaderText, { flex: 3 }]}>Item</Text>
                    <Text style={[styles.itemHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                    <Text style={[styles.itemHeaderText, { flex: 2, textAlign: 'right' }]}>Price</Text>
                    <Text style={[styles.itemHeaderText, { flex: 2, textAlign: 'right' }]}>Total</Text>
                </View>

                {/* Items */}
                {data.items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemQty}>{item.quantity}</Text>
                        <Text style={styles.itemPrice}>{formatNaira(item.unitPrice)}</Text>
                        <Text style={styles.itemTotal}>{formatNaira(item.total)}</Text>
                    </View>
                ))}

                <View style={styles.divider} />

                {/* Summary */}
                <View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal:</Text>
                        <Text style={styles.summaryValue}>{formatNaira(data.subtotal)}</Text>
                    </View>
                    {data.taxAmount > 0 && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Tax:</Text>
                            <Text style={styles.summaryValue}>{formatNaira(data.taxAmount)}</Text>
                        </View>
                    )}
                    {data.discountAmount > 0 && (
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: '#2e7d32' }]}>Discount:</Text>
                            <Text style={[styles.summaryValue, { color: '#2e7d32' }]}>-{formatNaira(data.discountAmount)}</Text>
                        </View>
                    )}
                </View>

                {/* Total */}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL:</Text>
                    <Text style={styles.totalValue}>{formatNaira(data.totalAmount)}</Text>
                </View>

                {/* Payment Method */}
                <View style={styles.paymentBadge}>
                    <Text style={styles.paymentText}>
                        PAID - {data.paymentMethod.toUpperCase()}
                    </Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Thank you for your purchase!</Text>
                    <Text style={{ marginTop: 3 }}>Please keep this receipt for your records</Text>
                </View>
            </Page>
        </Document>
    );
}
