import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/currency';

// Define styles
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 11,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottom: '2 solid #000',
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 10,
        color: '#666',
    },
    section: {
        marginBottom: 15,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    label: {
        fontWeight: 'bold',
    },
    value: {
        textAlign: 'right',
    },
    table: {
        marginTop: 10,
        marginBottom: 15,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        padding: 8,
        fontWeight: 'bold',
        borderBottom: '1 solid #000',
    },
    tableRow: {
        flexDirection: 'row',
        padding: 8,
        borderBottom: '1 solid #ddd',
    },
    col1: {
        width: '50%',
    },
    col2: {
        width: '15%',
        textAlign: 'right',
    },
    col3: {
        width: '15%',
        textAlign: 'right',
    },
    col4: {
        width: '20%',
        textAlign: 'right',
    },
    totalsSection: {
        marginTop: 20,
        paddingTop: 10,
        borderTop: '2 solid #000',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    grandTotal: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 10,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 9,
        color: '#666',
        borderTop: '1 solid #ddd',
        paddingTop: 10,
    },
});

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

interface ReceiptPDFProps {
    data: ReceiptData;
}

export const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ data }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>{data.businessName}</Text>
                <Text style={styles.subtitle}>Sales Receipt</Text>
            </View>

            {/* Receipt Info */}
            <View style={styles.section}>
                <View style={styles.row}>
                    <Text style={styles.label}>Receipt #:</Text>
                    <Text>{data.saleNumber}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Date:</Text>
                    <Text>{data.date}</Text>
                </View>
                {data.customerName && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Customer:</Text>
                        <Text>{data.customerName}</Text>
                    </View>
                )}
                <View style={styles.row}>
                    <Text style={styles.label}>Payment Method:</Text>
                    <Text>{data.paymentMethod.toUpperCase()}</Text>
                </View>
            </View>

            {/* Items Table */}
            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={styles.col1}>Item</Text>
                    <Text style={styles.col2}>Qty</Text>
                    <Text style={styles.col3}>Price</Text>
                    <Text style={styles.col4}>Total</Text>
                </View>
                {data.items.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                        <Text style={styles.col1}>{item.name}</Text>
                        <Text style={styles.col2}>{item.quantity}</Text>
                        <Text style={styles.col3}>{formatCurrency(item.unit_price)}</Text>
                        <Text style={styles.col4}>{formatCurrency(item.total)}</Text>
                    </View>
                ))}
            </View>

            {/* Totals */}
            <View style={styles.totalsSection}>
                <View style={styles.totalRow}>
                    <Text>Subtotal:</Text>
                    <Text>{formatCurrency(data.subtotal)}</Text>
                </View>
                {data.tax > 0 && (
                    <View style={styles.totalRow}>
                        <Text>Tax:</Text>
                        <Text>{formatCurrency(data.tax)}</Text>
                    </View>
                )}
                {data.discount > 0 && (
                    <View style={styles.totalRow}>
                        <Text>Discount:</Text>
                        <Text>-{formatCurrency(data.discount)}</Text>
                    </View>
                )}
                <View style={[styles.totalRow, styles.grandTotal]}>
                    <Text>TOTAL:</Text>
                    <Text>{formatCurrency(data.total)}</Text>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text>Thank you for your business!</Text>
                <Text>Generated by JB-Manager Super App</Text>
            </View>
        </Page>
    </Document>
);
