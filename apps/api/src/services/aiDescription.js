// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// apps/api/src/services/aiDescription.js — Claude Vision AI photo description

import Anthropic from '@anthropic-ai/sdk';

const LOCALE_TO_LANG = {
  'fr': 'French', 'fr-FR': 'French', 'fr-CH': 'French', 'fr-BE': 'French',
  'en': 'English', 'en-US': 'English', 'en-GB': 'English',
  'de': 'German', 'de-DE': 'German', 'de-CH': 'German', 'de-AT': 'German',
  'it': 'Italian', 'it-IT': 'Italian', 'it-CH': 'Italian',
  'es': 'Spanish', 'es-ES': 'Spanish',
  'pt': 'Portuguese', 'pt-PT': 'Portuguese', 'pt-BR': 'Portuguese',
  'nl': 'Dutch', 'nl-NL': 'Dutch', 'nl-BE': 'Dutch',
  'pl': 'Polish', 'pl-PL': 'Polish',
  'ru': 'Russian', 'ru-RU': 'Russian',
  'ja': 'Japanese', 'ja-JP': 'Japanese',
  'zh': 'Chinese', 'zh-CN': 'Chinese', 'zh-TW': 'Chinese',
  'ko': 'Korean', 'ko-KR': 'Korean',
  'ar': 'Arabic', 'ar-SA': 'Arabic',
  'sv': 'Swedish', 'sv-SE': 'Swedish',
  'da': 'Danish', 'da-DK': 'Danish',
  'fi': 'Finnish', 'fi-FI': 'Finnish',
  'no': 'Norwegian', 'nb': 'Norwegian',
};

/**
 * Generate a photo description using Claude Vision.
 * Returns description text and optional location name if Claude recognizes one.
 *
 * @param {Buffer} imageBuffer  - Raw image bytes
 * @param {string} mediaType    - MIME type, e.g. 'image/jpeg'
 * @param {string} locale       - BCP-47 locale string, e.g. 'fr' or 'en-US'
 * @param {object} [gallery]    - Optional gallery context: { title, subtitle, description }
 * @returns {Promise<{description: string, location: string|null}>}
 */
export async function generateDescription(imageBuffer, mediaType, locale, gallery = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const lang   = LOCALE_TO_LANG[locale] || LOCALE_TO_LANG[locale?.split('-')[0]] || 'English';
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const contextLines = [];
  if (gallery.title)       contextLines.push(`Gallery: ${gallery.title}`);
  if (gallery.subtitle)    contextLines.push(`Subtitle: ${gallery.subtitle}`);
  if (gallery.description) contextLines.push(`Description: ${gallery.description}`);
  const contextBlock = contextLines.length
    ? `Context about this gallery:\n${contextLines.join('\n')}\n\n`
    : '';

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [{
      role:    'user',
      content: [
        {
          type:   'image',
          source: {
            type:       'base64',
            media_type: mediaType,
            data:       imageBuffer.toString('base64'),
          },
        },
        {
          type: 'text',
          text: `${contextBlock}Analyze this photo and respond with a JSON object (no markdown, no code block) with exactly these two fields:
- "description": a caption in ${lang}, maximum 160 characters, suitable as image alt text. Be specific and descriptive.
- "location": if you can confidently identify a specific place (city, landmark, country), provide it in English as "City, Country" format. Otherwise null.

Example: {"description":"Athletes compete on a track at Stade de Gerland","location":"Lyon, France"}`,
        },
      ],
    }],
  });

  const block = response.content.find(b => b.type === 'text');
  if (!block?.text) throw new Error('No text block in Claude response');

  let parsed;
  try {
    const raw = block.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    parsed = JSON.parse(raw);
  } catch {
    // Fallback: treat entire response as description if JSON parse fails
    return { description: block.text.trim().slice(0, 160), location: null };
  }

  return {
    description: (parsed.description || '').trim().slice(0, 160),
    location:    parsed.location || null,
  };
}
