import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  template: string;          // template filename without .hbs
  context: Record<string, unknown>; // variables injected into the template
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly siteUrl: string;
  private readonly adminUrl: string;
  private readonly templateDir: string;
  private readonly templateCache = new Map<string, HandlebarsTemplateDelegate>();

  constructor(private readonly config: ConfigService) {
    this.from = config.get<string>('MAIL_FROM') ?? 'tientcheuigorcarel@gmail.com';
    this.siteUrl = config.get<string>('PUBLIC_URL') ?? 'http://localhost:3000';
    this.adminUrl = config.get<string>('ADMIN_URL') ?? 'http://localhost:4200';
    this.templateDir = path.join(__dirname, 'templates');

    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port: Number(config.get('SMTP_PORT') ?? 587),
      secure: Number(config.get('SMTP_PORT') ?? 587) === 465,
      auth: {
        user: config.getOrThrow<string>('SMTP_USER'),
        pass: config.getOrThrow<string>('SMTP_PASSWORD'),
      },
    });
  }

  // ─── Core send method ────────────────────────────────────────────────────

  async send(options: SendMailOptions, throwOnError = false): Promise<void> {
    try {
      const html = this.renderTemplate(options.template, {
        ...options.context,
        subject: options.subject,
        year: new Date().getFullYear(),
        siteUrl: this.siteUrl,
        adminUrl: this.adminUrl,
      });

      await this.transporter.sendMail({
        from: `"Mountains Tech" <${this.from}>`,
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject: options.subject,
        html,
      });

      this.logger.log(`Email envoyé → ${options.to} | ${options.subject}`);
    } catch (error) {
      this.logger.error(
        `Échec envoi email → ${options.to} | ${options.subject}`,
        error instanceof Error ? error.stack : String(error),
      );
      if (throwOnError) throw error;
    }
  }

  // ─── Transactional helpers ────────────────────────────────────────────────

  async sendMemberApplicationConfirmation(data: {
    to: string;
    representativeName: string;
    companyName: string;
    sectors: string[];
    applicationId: string;
  }): Promise<void> {
    await this.send({
      to: data.to,
      subject: 'Votre demande d\'adhésion a bien été reçue - Mountains Tech',
      template: 'member-application-confirmation',
      context: {
        ...data,
        sectors: data.sectors.join(', '),
      },
    });
  }

  async sendMemberApplicationReview(data: {
    to: string;
    representativeName: string;
    companyName: string;
    approved: boolean;
    reviewComment?: string;
    approvedAt?: string;
    memberUrl?: string;
  }): Promise<void> {
    const subject = data.approved
      ? `Félicitations ! Votre adhésion à Mountains Tech est approuvée`
      : `Résultat de votre candidature - Mountains Tech`;

    await this.send({
      to: data.to,
      subject,
      template: 'member-application-review',
      context: data,
    });
  }

  async sendEventRegistrationConfirmation(data: {
    to: string;
    firstName: string;
    lastName: string;
    eventTitle: string;
    startAt: string;
    endAt?: string;
    location?: string;
    registrationId: string;
    eventUrl?: string;
  }): Promise<void> {
    await this.send({
      to: data.to,
      subject: `Inscription confirmée : ${data.eventTitle}`,
      template: 'event-registration-confirmation',
      context: data,
    });
  }

  async sendHackathonTeamConfirmation(data: {
    to: string;
    leaderFirstName: string;
    leaderLastName: string;
    teamName: string;
    hackathonTitle: string;
    memberCount: number;
    projectIdea?: string;
    teamId: string;
    registrationDeadline?: string;
    startDate?: string;
    endDate?: string;
    hackathonUrl?: string;
  }): Promise<void> {
    await this.send({
      to: data.to,
      subject: `Équipe enregistrée pour ${data.hackathonTitle} - Mountains Tech`,
      template: 'hackathon-team-confirmation',
      context: data,
    });
  }

  async sendContactNotification(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    messageId: string;
    receivedAt: string;
  }): Promise<void> {
    // Notify admin
    await this.send({
      to: this.from,
      subject: `[Contact] ${data.subject}`,
      template: 'contact-notification',
      context: {
        ...data,
        adminUrl: `${this.adminUrl}/contacts`,
      },
    });

    // Acknowledge sender
    await this.send({
      to: data.email,
      subject: 'Votre message a été reçu - Mountains Tech',
      template: 'contact-acknowledgment',
      context: data,
    });
  }

  async sendAdminInvitation(data: {
    to: string;
    firstName: string;
    lastName: string;
    email: string;
    tempPassword: string;
    role: string;
  }): Promise<void> {
    await this.send({
      to: data.to,
      subject: 'Invitation - Accès à la plateforme Mountains Tech',
      template: 'admin-invitation',
      context: {
        ...data,
        loginUrl: `${this.adminUrl}/login`,
        adminEmail: this.from,
      },
    });
  }

  async sendNewsletterSubscriptionConfirmation(data: {
    to: string;
    firstName?: string;
    subscribedAt: string;
  }): Promise<void> {
    await this.send({
      to: data.to,
      subject: 'Vous êtes inscrit(e) à la newsletter Mountains Tech',
      template: 'newsletter-subscription',
      context: {
        ...data,
        email: data.to,
      },
    });
  }

  async sendAnnouncement(data: {
    to: string;
    firstName?: string;
    subject: string;
    contentHtml: string;
    unsubscribeUrl: string;
  }): Promise<void> {
    await this.send({
      to: data.to,
      subject: data.subject,
      template: 'announcement',
      context: data,
    });
  }

  async sendResetPassword(data: {
    to: string;
    firstName: string;
    lastName: string;
    email: string;
    resetUrl: string;
  }): Promise<void> {
    await this.send({
      to: data.to,
      subject: 'Réinitialisation de votre mot de passe - Mountains Tech',
      template: 'reset-password',
      context: data,
    });
  }

  async sendHackathonTeamStatus(data: {
    to: string;
    leaderFirstName: string;
    leaderLastName: string;
    teamName: string;
    hackathonTitle: string;
    approved: boolean;
    reviewComment?: string;
    startDate?: string;
    endDate?: string;
    hackathonUrl?: string;
  }): Promise<void> {
    const subject = data.approved
      ? `Équipe validée pour ${data.hackathonTitle} - Mountains Tech`
      : `Résultat candidature équipe - ${data.hackathonTitle}`;

    await this.send({
      to: data.to,
      subject,
      template: 'hackathon-team-status',
      context: data,
    });
  }

  async sendNewsletterUnsubscribeConfirmation(data: {
    to: string;
    firstName?: string;
    unsubscribedAt: string;
  }): Promise<void> {
    await this.send({
      to: data.to,
      subject: 'Désabonnement confirmé - Mountains Tech',
      template: 'newsletter-unsubscribe',
      context: { ...data, email: data.to },
    });
  }

  // ─── Template engine ──────────────────────────────────────────────────────

  private renderTemplate(templateName: string, context: Record<string, unknown>): string {
    // Load and compile the content template
    const contentTemplate = this.loadTemplate(templateName);
    const content = contentTemplate(context);

    // Wrap in the base layout
    const baseTemplate = this.loadTemplate('base');
    return baseTemplate({ ...context, content });
  }

  private loadTemplate(name: string): HandlebarsTemplateDelegate {
    if (this.templateCache.has(name)) {
      return this.templateCache.get(name)!;
    }

    const filePath = path.join(this.templateDir, `${name}.hbs`);
    const source = fs.readFileSync(filePath, 'utf-8');
    const compiled = Handlebars.compile(source);
    this.templateCache.set(name, compiled);
    return compiled;
  }
}
