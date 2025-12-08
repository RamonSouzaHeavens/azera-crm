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
    backgroundColor: '#0891b2',
    padding: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  headerSub: {
    color: '#bae6fd',
    fontSize: 10
  },
  section: {
    marginVertical: 8,
    marginHorizontal: 30,
    padding: 0
  },
  label: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 1
  },
  value: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
    fontFamily: 'Helvetica-Bold'
  },
  priceBox: {
    backgroundColor: '#f8fafc',
    marginHorizontal: 30,
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0891b2',
    marginTop: 10,
    marginBottom: 20
  },
  priceLabel: {
    fontSize: 12,
    color: '#64748b'
  },
  priceValue: {
    fontSize: 32,
    color: '#0891b2',
    fontFamily: 'Helvetica-Bold',
    marginTop: 4
  },
  detailsBox: {
    marginHorizontal: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4
  },
  detailsText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#334155'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f1f5f9',
    padding: 20,
    textAlign: 'center'
  },
  footerText: {
    fontSize: 9,
    color: '#94a3b8'
  }
})

export interface ProposalData {
  templateName: string
  clientName: string
  value: string
  validity: string
  notes: string
  date: string
}

export const ProposalDocument = ({ data }: { data: ProposalData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{data.templateName}</Text>
          <Text style={styles.headerSub}>Documento Oficial #{Math.floor(Math.random() * 1000)}</Text>
        </View>
        <View>
          <Text style={{ color: 'white', fontSize: 10 }}>EMISSÃO</Text>
          <Text style={{ color: 'white', fontSize: 12, fontFamily: 'Helvetica-Bold' }}>{data.date}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Preparado Exclusivamente para</Text>
        <Text style={{ ...styles.value, fontSize: 18 }}>{data.clientName}</Text>
      </View>

      <View style={styles.priceBox}>
        <Text style={styles.priceLabel}>INVESTIMENTO TOTAL</Text>
        <Text style={styles.priceValue}>{data.value}</Text>
        <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>
          Válido por {data.validity} dias a partir da data de emissão.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Escopo e Detalhes</Text>
        <View style={styles.detailsBox}>
          <Text style={styles.detailsText}>{data.notes}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Este documento é confidencial e contém informações proprietárias.
        </Text>
        <Text style={styles.footerText}>Gerado via Plataforma Pro • {data.date}</Text>
      </View>
    </Page>
  </Document>
)
