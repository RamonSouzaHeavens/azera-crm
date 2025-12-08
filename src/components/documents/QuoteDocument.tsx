import {
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 0,
    fontFamily: 'Helvetica'
  },
  header: {
    backgroundColor: '#f59e0b',
    padding: 16,
    paddingBottom: 10
  },
  body: {
    paddingHorizontal: 24,
    paddingVertical: 16
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },
  meta: {
    fontSize: 10,
    color: '#334155',
    marginTop: 2
  },
  section: {
    marginTop: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 12
  },
  sectionLabel: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 6
  },
  sectionValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },
  table: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 10
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  cellLeft: { flex: 3, fontSize: 11, color: '#0f172a' },
  cellRight: { flex: 1, fontSize: 11, textAlign: 'right', color: '#0f172a' },
  totalRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff7ed'
  },
  totalLabel: { flex: 3, fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#b45309' },
  totalValue: { flex: 1, fontSize: 12, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#b45309' }
})

export interface QuoteData {
  templateName: string
  clientName: string
  value: string
  validity: string
  notes: string
  date: string
}

export const QuoteDocument = ({ data }: { data: QuoteData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{data.templateName}</Text>
        <Text style={styles.meta}>Data: {data.date} • Validade: {data.validity} dias</Text>
        <Text style={[styles.meta, { marginTop: 4 }]}>#{Math.floor(Math.random() * 1000)}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Cliente</Text>
          <Text style={styles.sectionValue}>{data.clientName}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellLeft, { fontFamily: 'Helvetica-Bold' }]}>Descrição</Text>
            <Text style={[styles.cellRight, { fontFamily: 'Helvetica-Bold' }]}>Valor</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellLeft}>{data.notes}</Text>
            <Text style={styles.cellRight}>{data.value}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{data.value}</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
)
