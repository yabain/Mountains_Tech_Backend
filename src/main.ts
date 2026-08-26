import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Global prefix ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? [],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ─── Validation ──────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Swagger / OpenAPI ───────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mountains Tech — API REST')
    .setDescription(
      'API NestJS versionnée pour le frontend public Angular et le backoffice d\'administration de Mountains Tech.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .addTag('Authentification', 'Login, refresh token, logout et profil connecté')
    .addTag('Health', 'État de l\'API et de la base de données')
    .addTag('Public — Accueil', 'Agrégat page d\'accueil : activités, événements, projets, membres, partenaires')
    .addTag('Public — Activités', 'Activités publiées')
    .addTag('Public — Contact', 'Envoi de messages de contact')
    .addTag('Public — Événements', 'Événements publiés et inscriptions')
    .addTag('Public — Hackathons', 'Hackathons publiés et inscription des équipes')
    .addTag('Public — Membres', 'Entreprises membres publiées et soumission de candidatures')
    .addTag('Public — Newsletter', 'Inscription à la newsletter')
    .addTag('Public — Paramètres', 'Paramètres publics du site')
    .addTag('Public — Projets', 'Projets publiés avec leurs partenaires')
    .addTag('Admin — Activités', 'Gestion CRUD des activités')
    .addTag('Admin — Annonces', 'Campagnes d\'annonces et envoi massif')
    .addTag('Admin — Contacts', 'Gestion des messages de contact')
    .addTag('Admin — Dashboard', 'Statistiques et indicateurs')
    .addTag('Admin — Événements', 'Gestion CRUD des événements et inscriptions')
    .addTag('Admin — Hackathons', 'Gestion CRUD des hackathons, équipes et validation')
    .addTag('Admin — Médias', 'Upload, liste et suppression de médias')
    .addTag('Admin — Membres', 'Gestion et validation des membres et candidatures')
    .addTag('Admin — Newsletter', 'Gestion des abonnés newsletter')
    .addTag('Admin — Paramètres', 'Configuration du site')
    .addTag('Admin — Partenaires', 'Gestion des partenaires')
    .addTag('Admin — Projets', 'Gestion CRUD des projets')
    .addTag('Admin — Utilisateurs', 'Gestion des comptes administrateurs')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // ─── Start ───────────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on http://localhost:${port}`);
  console.log(`Swagger docs    → http://localhost:${port}/api/docs`);
}
bootstrap();
