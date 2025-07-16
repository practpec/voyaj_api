// src/modules/subscriptions/infrastructure/services/StripeService.ts
import Stripe from 'stripe';
import { LoggerService } from '../../../../shared/services/LoggerService';

export class StripeService {
  private static instance: StripeService;
  private stripe: Stripe;
  private logger: LoggerService;

  private constructor() {
    this.logger = LoggerService.getInstance();
    
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY no está configurada en las variables de entorno');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      typescript: true
    });

    this.logger.info('StripeService inicializado correctamente');
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  // Crear o obtener customer de Stripe
  public async createOrGetCustomer(userId: string, email: string, name?: string): Promise<Stripe.Customer> {
    try {
      // Buscar customer existente por email
      const existingCustomers = await this.stripe.customers.list({
        email: email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        this.logger.info(`Customer existente encontrado para: ${email}`);
        return existingCustomers.data[0];
      }

      // Crear nuevo customer
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId: userId,
          platform: 'voyaj'
        }
      });

      this.logger.info(`Nuevo customer creado: ${customer.id} para usuario: ${userId}`);
      return customer;

    } catch (error) {
      this.logger.error('Error creando/obteniendo customer:', error);
      throw new Error('Error procesando información del cliente');
    }
  }

  // Crear suscripción
  public async createSubscription(
    customerId: string,
    priceId: string,
    trialDays?: number
  ): Promise<Stripe.Subscription> {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{
          price: priceId
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          platform: 'voyaj'
        }
      };

      // Agregar trial si se especifica
      if (trialDays && trialDays > 0) {
        subscriptionData.trial_period_days = trialDays;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);
      
      this.logger.info(`Suscripción creada: ${subscription.id} para customer: ${customerId}`);
      return subscription;

    } catch (error) {
      this.logger.error('Error creando suscripción:', error);
      throw new Error('Error procesando suscripción');
    }
  }

  // Cancelar suscripción
  public async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
        metadata: {
          canceled_by: 'user',
          canceled_at: new Date().toISOString()
        }
      });

      this.logger.info(`Suscripción ${cancelAtPeriodEnd ? 'programada para cancelar' : 'cancelada'}: ${subscriptionId}`);
      return subscription;

    } catch (error) {
      this.logger.error('Error cancelando suscripción:', error);
      throw new Error('Error cancelando suscripción');
    }
  }

  // Cambiar plan de suscripción
  public async changePlan(
    subscriptionId: string,
    newPriceId: string
  ): Promise<Stripe.Subscription> {
    try {
      // Obtener suscripción actual
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      if (!subscription.items.data[0]) {
        throw new Error('Suscripción sin items válidos');
      }

      // Actualizar suscripción con nuevo precio
      const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: 'create_prorations'
      });

      this.logger.info(`Plan cambiado para suscripción: ${subscriptionId} a precio: ${newPriceId}`);
      return updatedSubscription;

    } catch (error) {
      this.logger.error('Error cambiando plan:', error);
      throw new Error('Error cambiando plan de suscripción');
    }
  }

  // Obtener suscripción
  public async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice', 'customer']
      });

      return subscription;

    } catch (error) {
      this.logger.error('Error obteniendo suscripción:', error);
      throw new Error('Error obteniendo información de suscripción');
    }
  }

  // Crear payment intent para pagos únicos
  public async createPaymentIntent(
    amount: number,
    currency: string = 'mxn',
    customerId?: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: currency.toLowerCase(),
        customer: customerId,
        metadata: {
          platform: 'voyaj',
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      this.logger.info(`Payment Intent creado: ${paymentIntent.id} por ${amount} ${currency}`);
      return paymentIntent;

    } catch (error) {
      this.logger.error('Error creando payment intent:', error);
      throw new Error('Error procesando pago');
    }
  }

  // Verificar webhook
  public verifyWebhookSignature(
    payload: string,
    signature: string,
    endpointSecret: string
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );
    } catch (error) {
      this.logger.error('Error verificando webhook:', error);
      throw new Error('Webhook signature verification failed');
    }
  }

  // Listar facturas del customer
  public async getCustomerInvoices(
    customerId: string,
    limit: number = 10
  ): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit,
        expand: ['data.payment_intent']
      });

      return invoices.data;

    } catch (error) {
      this.logger.error('Error obteniendo facturas:', error);
      throw new Error('Error obteniendo historial de facturas');
    }
  }

  // Obtener upcoming invoice
  public async getUpcomingInvoice(customerId: string): Promise<Stripe.Invoice | null> {
    try {
      const invoice = await this.stripe.invoices.retrieveUpcoming({
        customer: customerId
      });

      return invoice;

    } catch (error) {
      // Es normal que no haya upcoming invoice
      this.logger.debug('No hay upcoming invoice para customer:', customerId);
      return null;
    }
  }
}