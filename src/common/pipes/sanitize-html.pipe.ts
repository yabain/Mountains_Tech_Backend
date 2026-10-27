import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sanitizeHtml = require('sanitize-html') as typeof import('sanitize-html');
import type { IOptions } from 'sanitize-html';

/**
 * Whitelist des balises et attributs HTML autorisés pour les champs
 * contentHtml / rulesHtml (contenu riche produit par un éditeur WYSIWYG).
 *
 * Tout ce qui n'est pas dans cette liste est supprimé avant stockage.
 * En particulier : <script>, <iframe>, <object>, <embed>, les attributs
 * on*, href="javascript:..." et style contenant expression() sont éliminés.
 */
const ALLOWED_TAGS: string[] = [
  // Structure
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'div', 'span', 'section', 'article', 'blockquote', 'pre', 'code',
  // Listes
  'ul', 'ol', 'li',
  // Tableau
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  // Inline
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
  // Liens & médias
  'a', 'img', 'figure', 'figcaption',
  // Divers
  'details', 'summary',
];

const ALLOWED_ATTRIBUTES: IOptions['allowedAttributes'] = {
  // Liens : seuls les URLs http/https sont autorisés (pas de javascript:)
  a: ['href', 'title', 'target', 'rel'],
  // Images : src doit pointer vers http/https (voir allowedSchemes)
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  // Tableaux
  th: ['scope', 'colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
  // Attributs globaux inoffensifs
  '*': ['class', 'id', 'lang'],
};

const SANITIZE_OPTIONS: IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  // Seuls les schémas http/https/mailto sont autorisés dans les href/src
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'], // data: pour les images base64 éventuelles
  },
  // Forcer rel="noopener noreferrer" sur tous les liens avec target="_blank"
  transformTags: {
    a: (tagName, attribs) => {
      if (attribs['target'] === '_blank') {
        return {
          tagName,
          attribs: { ...attribs, rel: 'noopener noreferrer' },
        };
      }
      return { tagName, attribs };
    },
  },
  // Supprimer les balises vides (sauf br et img)
  exclusiveFilter: (frame) =>
    !['br', 'img', 'hr'].includes(frame.tag) &&
    frame.text.trim() === '' &&
    Object.keys(frame.attribs).length === 0,
};

/**
 * SanitizeHtmlPipe
 *
 * Utilisé sur les champs contentHtml et rulesHtml pour supprimer tout
 * contenu HTML dangereux (XSS) avant qu'il soit stocké en base.
 *
 * Usage dans un DTO :
 *   @Transform(({ value }) => value)
 *   @UsePipes(SanitizeHtmlPipe)  ← sur le paramètre body
 *
 * Ou directement sur le champ via un décorateur custom (voir @SanitizeHtml).
 *
 * Ce pipe est également enregistré globalement en tant que pipe de
 * transformation dans main.ts via ValidationPipe.
 */
@Injectable()
export class SanitizeHtmlPipe implements PipeTransform {
  /**
   * Si la valeur entrante est un objet (body complet), on sanitise
   * récursivement tous les champs dont le nom se termine par "Html".
   * Si c'est une string directe, on la sanitise telle quelle.
   */
  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    if (typeof value === 'string') {
      return sanitizeHtml(value, SANITIZE_OPTIONS);
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return this.sanitizeObject(value as Record<string, unknown>);
    }

    return value;
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...obj };
    for (const key of Object.keys(result)) {
      const val = result[key];
      // Sanitise tous les champs dont le nom contient "html" (insensible à la casse)
      if (typeof val === 'string' && /html/i.test(key)) {
        result[key] = sanitizeHtml(val, SANITIZE_OPTIONS);
      } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = this.sanitizeObject(val as Record<string, unknown>);
      }
    }
    return result;
  }
}
