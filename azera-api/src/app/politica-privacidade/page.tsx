import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade - Azera CRM',
  description: 'Política de Privacidade do Azera CRM',
};

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Política de Privacidade - Azera CRM
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Última atualização: 20 de novembro de 2025
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Quem somos</h2>
          <p className="text-gray-700 leading-relaxed">
            Azera CRM é uma plataforma desenvolvida por Ramon Souza (ou sua empresa), 
            com sede em Belo Horizonte, Minas Gerais, Brasil. 
            Nosso objetivo é ajudar empresas e profissionais a gerenciar leads, equipes e vendas.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Dados que coletamos</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Dados de cadastro: nome, e-mail, telefone e senha</li>
            <li>Dados da empresa: nome, logo e configurações</li>
            <li>Dados de leads: nome, telefone, e-mail, origem (incluindo leads do Facebook Ads)</li>
            <li>Dados de pagamento processados pelo Stripe (não armazenamos cartões)</li>
            <li>Dados de uso anônimos para melhoria do produto</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Como usamos seus dados</h2>
          <p className="text-gray-700">Para prestar o serviço, enviar notificações, processar pagamentos e melhorar o Azera CRM.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. Compartilhamento</h2>
          <p className="text-gray-700">
            Seus dados são compartilhados apenas com:
            <br />• Supabase (banco de dados)
            <br />• Stripe (pagamentos)
            <br />• Meta (integrações oficiais do Facebook, Instagram e WhatsApp)
            <br />• Membros da sua equipe (conforme permissões)
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Seus direitos (LGPD)</h2>
          <p className="text-gray-700">
            Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo e-mail: ramon@azera.space
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">6. Contato</h2>
          <p className="text-gray-700">
            Dúvidas? Entre em contato: <a href="mailto:ramon@azera.space" className="text-blue-600 underline">ramon@azera.space</a>
          </p>
        </section>
      </div>
    </div>
  );
}