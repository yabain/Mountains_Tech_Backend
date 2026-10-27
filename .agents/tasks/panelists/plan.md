# Implementation Plan — Panelists (embedded dans Event)

## Contexte découvert (grounding)

- **Build/test** : `npm run build` (`nest build`), `npm test` (jest, `rootDir: src`, `testRegex: .*\.spec\.ts$`). **Aucun test spec n'existe pour le module events** (`src/modules/events/**/*.spec.ts` absent). La vérification du projet pour cette feature est donc **`npx tsc --noEmit`** (exit 0). Baseline mesurée : **exit 0 avant tout changement**.
- **tsconfig** : `module: nodenext`, `moduleResolution: nodenext`, `strictNullChecks: true`, `noImplicitAny: false`, `experimentalDecorators/emitDecoratorMetadata: true`. Les imports relatifs existants sont **sans extension** (ex. `from './dto/create-event.dto'`, `from '../../schemas/event.schema'`) et compilent — conserver cette convention.
- **ValidationPipe global** (`src/main.ts`) : `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`, `transformOptions: { enableImplicitConversion: true }`. → la validation imbriquée `@ValidateNested` + `@Type(() => PanelistDto)` fonctionnera. Un `SanitizeHtmlPipe` global passe aussi sur les string (sans impact sur `name`/`role`/`photoUrl` qui ne contiennent pas de HTML).
- **Convention DTO** (`src/modules/events/dto/create-event.dto.ts`) : chaque champ est annoté `@ApiProperty`/`@ApiPropertyOptional` de `@nestjs/swagger` + validateurs `class-validator`. On appliquera la même convention aux nouveaux DTO.
- **Pattern de sérialisation du service** (`src/modules/events/events.service.ts`, helper privé existant à réutiliser tel quel) :
  ```ts
  private toObject(doc: EventDocument | EventRegistrationDocument): Record<string, unknown> {
    const obj = doc.toObject({ virtuals: true }) as unknown as Record<string, unknown>;
    delete obj['__v'];
    return obj;
  }
  ```
  → les nouvelles méthodes retournent `this.toObject(doc)` (pas de type de retour explicite, comme `findById` qui est inféré).
- **Pattern d'exceptions** (réutilisé tel quel, messages français exacts) :
  - `throw new NotFoundException('Événement introuvable')` — utilisé dans `findById`, `update`, `remove`, `register`, `findRegistrations`.
  - `throw new BadRequestException('...message...')` — utilisé dans `update` (transition) et `register`.
- **Injection du modèle** déjà présente dans le constructeur de `EventsService` : `@InjectModel(EventEntity.name) private readonly eventModel: Model<EventDocument>`. Les nouvelles méthodes utilisent `this.eventModel`. `Types` est déjà importé depuis `mongoose`.
- **Pattern `findByIdAndUpdate`** déjà utilisé dans `update` : `this.eventModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec()` puis `if (!updated) throw new NotFoundException('Événement introuvable')`. Les méthodes panelists réutilisent ce squelette (`{ new: true }` + check NotFound après).
- **Audit decorator** (`src/common/decorators/audit.decorator.ts`) : `Audit(meta: AuditMeta)` — applique `SetMetadata(AUDIT_KEY, meta)` + `UseInterceptors(AuditInterceptor)`. Les routes qui modifient portent `@Audit({ action, resource, category })`. La catégorie `'CONTENT'` et `resource: 'events'` sont déjà utilisées sur les routes admin existantes (create/update/delete).
- **Contrôleur admin** (`EventsAdminController`, `@Controller('admin/events')`, préfixe global `api/v1`) : `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('SUPER_ADMIN', 'ADMIN', 'EDITOR')`. Le décorateur `Audit` est déjà importé dans le contrôleur (`import { Audit } from '../../common/decorators/audit.decorator'`). **`Put` n'est PAS importé** (l'import `@nestjs/common` se termine par `UseGuards`) — à ajouter.
- **Ordre des routes admin** : `@Get()` (GET /), `@Get(':id')` (GET :id), `@Post()` (POST /), `@Patch(':id')`, `@Delete(':id')`, puis `@Get(':id/registrations')` **en dernier**. La route `:id/registrations` (2 segments) placée après `:id` (1 segment) fonctionne déjà → prouve qu'`/api/v1/admin/events/:id/panelists` (2 segments) n'est **pas shadowée** par `GET :id`. Placement choisi : **regrouper les 3 routes panelists à la fin de la classe, après `findRegistrations`**, pour suivre la convention « sous-ressources `:id/*` en dernier ».
- **Ne pas modifier** le contrôleur public `EventsPublicController`.

## Décisions de conception (gaps résolus)

1. **Sub-schéma Panelist** : utiliser `SchemaFactory.createForClass(Panelist)` (correspond au snippet primaire de la tâche et à la convention du repo qui emploie `createForClass` pour `EventSchema`/`EventRegistrationSchema`). La classe `Panelist` porte uniquement des `@Prop` (pas besoin de `@Schema()` pour un sub-schéma embarqué). Alternative inline `[{ name: String, role: String, photoUrl: String }]` écartée pour cohérence avec le repo.
2. **Imports mongoose** : la tâche propose `import * as mongoose from 'mongoose'` dans le snippet du schéma, mais il serait **inutile** (`SchemaFactory` vient de `@nestjs/mongoose`) et romprait le style existant (`event.schema.ts` importe `{ Document } from 'mongoose'`). → **ne pas ajouter cet import** ; réutiliser les imports existants (`Prop, Schema, SchemaFactory` de `@nestjs/mongoose`).
3. **DTOs — annotations Swagger** : le snippet de la tâche omet `@ApiProperty`, mais la convention du repo (tous les DTOs, ex. `create-event.dto.ts`) annote systématiquement chaque champ. Contrainte explicite « Conserve le style de code existant » → **ajouter `@ApiProperty`/`@ApiPropertyOptional`** sur les champs de `PanelistDto` (et `@ApiProperty({ type: [PanelistDto] })` sur `panelists` de `UpdatePanelistsDto`) pour des docs OpenAPI cohérentes. Sans incidence sur la validation runtime.
4. **Import inutilisé `ArrayMinSize`** : le snippet de `UpdatePanelistsDto` importe `ArrayMinSize` sans l'utiliser. Remplacer toute la liste par `[]` (tout effacer) est une opération valide → **ne pas imposer de taille minimale** et **omettre l'import `ArrayMinSize`** (import mort = risque lint, et empêcherait de vider la liste).
5. **`removePanelist` — mécanisme** : valider les bornes d'index nécessite de lire le doc d'abord (la longueur du tableau n'est pas connue côté requête). Approche choisie : (a) `findById` → `NotFoundException` si absent ; (b) vérifier `Number.isInteger(index) && index >= 0 && index < (doc.panelists ?? []).length`, sinon `BadRequestException('Index de panéliste invalide')` ; (c) suppression par `$unset: { \`panelists.${index}\`: 1 }` puis `$pull: { panelists: null }` (deux updates successifs, le second `findByIdAndUpdate(..., { new: true })` pour récupérer le doc final) ; (d) retourner `this.toObject(updated)`. Le `parseInt(index, 10)` se fait dans le contrôleur (le service reçoit un `number`).
6. **`@ApiParam`** : les routes admin existantes annotent systématiquement les params de chemin (`@ApiParam({ name: 'id', ... })`). On ajoute `@ApiParam` pour `:id` (et `:index` sur DELETE) afin de respecter la convention Swagger du repo, en complément des décorateurs du snippet de la tâche.

---

- [ ] 1. Modifier le schéma Event — ajouter le sub-schéma Panelist et le champ `panelists`.
      Ajouter (en haut du fichier, avant `EventEntity`) une classe `Panelist` avec 3 `@Prop` : `name` (string requis), `role` (string requis), `photoUrl` (string optionnel). Exporter `PanelistSchema = SchemaFactory.createForClass(Panelist)`. Ajouter à la fin de `EventEntity` le champ `@Prop({ type: [PanelistSchema], default: [] }) panelists!: Panelist[];` (assertion d'assignation `!` pour `strictNullChecks`, comme `title!: string`). **Conserver TOUS les champs existants** (`title`, `slug`, `excerpt`, `coverUrl`, `category`, `location`, `startAt`, `endAt`, `registrationRequired`, `capacity`, `status`, `publishedAt`, `createdBy`) et **TOUS les index** (`status: 1`, `startAt: 1`, `category: 1`, `title/excerpt text`). Exporter le type `Panelist` pour réusage. Ne pas toucher aux imports existants (n'ajouter **pas** `import * as mongoose`).
      Files: `src/schemas/event.schema.ts`
      Verify: `npx tsc --noEmit` depuis `c:\code\mountains_tech_backend` → exit 0 (aucun consommateur du champ `panelists` encore, le schéma compile seul).

- [ ] 2. Créer les DTO panelists.
      Créer `PanelistDto` (3 champs avec validateurs `@IsString`/`@IsNotEmpty`/`@IsOptional` + annotations `@ApiProperty`/`@ApiPropertyOptional` style `create-event.dto.ts`). `AddPanelistDto extends PanelistDto {}` (payload POST d'un seul panéliste). `UpdatePanelistsDto` avec `panelists!: PanelistDto[]` décoré `@ValidateNested({ each: true })` + `@Type(() => PanelistDto)` (validation imbriquée OK car `transform: true` global) + `@ApiProperty({ type: [PanelistDto] })`. **Ne pas importer `ArrayMinSize`** (import mort, et vider la liste doit rester possible). Imports : `class-validator` (`IsString, IsNotEmpty, IsOptional, ValidateNested`), `class-transformer` (`Type`), `@nestjs/swagger` (`ApiProperty, ApiPropertyOptional`).
      Files: `src/modules/events/dto/panelist.dto.ts` (nouveau)
      Verify: `npx tsc --noEmit` → exit 0 (le fichier compile seul).

- [ ] 3. Ajouter 3 méthodes à `EventsService`.
      Ajouter (section Admin, près des autres méthodes admin) :
      (a) `async addPanelist(eventId: string, dto: AddPanelistDto)` — `findByIdAndUpdate(eventId, { $push: { panelists: { name: dto.name, role: dto.role, photoUrl: dto.photoUrl } } }, { new: true }).exec()` ; si `!updated` → `throw new NotFoundException('Événement introuvable')` ; `return this.toObject(updated)`. Importer `AddPanelistDto`.
      (b) `async setPanelists(eventId: string, dto: UpdatePanelistsDto)` — `findByIdAndUpdate(eventId, { $set: { panelists: dto.panelists } }, { new: true }).exec()` ; même check NotFound ; `return this.toObject(updated)`. Importer `UpdatePanelistsDto`.
      (c) `async removePanelist(eventId: string, panelistIndex: number)` — `findById` → NotFound ; vérifier bornes (`Number.isInteger(panelistIndex) && panelistIndex >= 0 && panelistIndex < (doc.panelists ?? []).length`) sinon `throw new BadRequestException('Index de panéliste invalide')` ; `$unset: { [`panelists.${panelistIndex}`]: 1 }` (via `updateOne`) puis `findByIdAndUpdate(eventId, { $pull: { panelists: null } }, { new: true })` ; si `!updated` NotFound ; `return this.toObject(updated)`.
      Réutiliser le helper `toObject` existant sans le modifier. Les imports `NotFoundException`, `BadRequestException`, `Model`, `Types` sont déjà présents.
      Files: `src/modules/events/events.service.ts`
      Verify: `npx tsc --noEmit` → exit 0 (méthodes non encore appelées, compilent).

- [ ] 4. Ajouter les routes au contrôleur admin.
      Dans `EventsAdminController` (PAS le public). (a) Ajouter `Put` à l'import `@nestjs/common` existant (confirmé manquant — l'import se termine par `UseGuards`). (b) Ajouter l'import `import { AddPanelistDto, UpdatePanelistsDto } from './dto/panelist.dto'` (à côté des autres imports de DTO). (c) Ajouter 3 routes **à la fin de la classe, après `findRegistrations`** (convention « sous-ressources `:id/*` en dernier » ; pas de shadowing car `:id` = 1 segment, `:id/panelists` = 2 segments) :
      - `POST :id/panelists` → `@Audit({ action: 'UPDATE', resource: 'events', category: 'CONTENT' })`, `@HttpCode(HttpStatus.OK)`, `@ApiOperation`, `@ApiParam({ name: 'id' })`, `@ApiResponse` 200/404 ; handler `addPanelist(@Param('id') id, @Body() dto: AddPanelistDto)` → `const data = await this.eventsService.addPanelist(id, dto); return { success: true, data, message: 'Panéliste ajouté' };`.
      - `PUT :id/panelists` → même `@Audit`, `@ApiOperation`, `@ApiParam({ name: 'id' })`, `@ApiResponse` 200/404 ; handler `setPanelists(@Param('id') id, @Body() dto: UpdatePanelistsDto)` → `return { success: true, data, message: 'Panélistes mis à jour' };`.
      - `DELETE :id/panelists/:index` → `@Audit`, `@HttpCode(HttpStatus.OK)`, `@ApiOperation`, `@ApiParam({ name: 'id' })`, `@ApiParam({ name: 'index' })`, `@ApiResponse` 200/400/404 ; handler `removePanelist(@Param('id') id, @Param('index') index: string)` → `const data = await this.eventsService.removePanelist(id, parseInt(index, 10)); return { success: true, data, message: 'Panéliste retiré' };`.
      Suivre le style JSDoc/structure des routes admin existantes. Ne pas modifier `EventsPublicController`.
      Files: `src/modules/events/events.controller.ts`
      Verify: `npx tsc --noEmit` → exit 0 (tout est câblé).

- [ ] 5. Vérification finale.
      `npx tsc --noEmit` depuis `c:\code\mountains_tech_backend` → **0 erreur** (exit 0). Vérifier qu'aucune route panelists n'a été ajoutée au contrôleur public et que tous les champs/index existants du schéma Event sont intacts. (Optionnel, contrôle plus fort : `npm run build` → `nest build` réussit.)
      Files: —
      Verify: `npx tsc --noEmit` → exit 0 ; `grep` de confirmation optionnel uniquement pour s'assurer que `EventsPublicController` n'a pas été modifié.

## Notes pour l'implémenteur
- Les étapes 1→4 sont ordonnées par dépendance (DTOs consommés par le service, service consommé par le contrôleur). Chaque étape laisse le projet en état compilable.
- Pas de nouvelle collection, pas de nouveau module, pas de modification du module (`events.module.ts` inchangé — `panelists` est embedded dans `EventSchema` déjà enregistré).
- `findRegistrations` existe déjà comme sous-ressource `:id/*` en fin de contrôleur : c'est le modèle de placement à imiter.
