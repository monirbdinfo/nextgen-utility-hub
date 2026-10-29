import { checkImageUrl, PROVIDERS, searchLinks } from '../../calc/reverseImage';
import { defineStrings } from '../../i18n';
import { h } from '../../lib/dom';
import { toolForm } from './toolForm';
import type { ToolView } from './kit';

const S = defineStrings({
  en: {
    url: 'Address of the picture',
    urlHint:
      'A public web address ending in the picture itself, for example https://example.com/photo.jpg. Right-click a picture and choose “Copy image address”.',
    submit: 'Make search links',
    resultLabel: 'Search links',
    rUrl: 'Picture address',
    rProviders: 'Search providers',
    linksTitle: 'Open a search',
    open: 'Search with {name}',
    newTab: '(opens in a new tab)',
    linkNote:
      'Opening a link sends the picture’s address to that provider, which then fetches the picture. This site sends nothing itself.',
    deviceTitle: 'A picture on your device',
    deviceText:
      'To keep your picture private, this site never uploads files. To search with a picture on your device, open a provider below and choose the picture on its own page. The picture then goes to that provider only.',
    deviceLink: 'Open {name}',
    e_empty: 'Enter the address of a picture.',
    e_invalid: 'Enter a full web address, for example https://example.com/photo.jpg.',
    e_scheme: 'Only http:// and https:// addresses can be searched.',
    e_private:
      'That address is on a private network or this device, so search providers cannot reach it. Use a public address, or upload the picture on the provider’s page.',
    'e_too-long': 'That address is too long for a search link (at most 2,000 characters).',
    notesTitle: 'About reverse image search',
    n1: 'A reverse image search finds pages that show the same or similar pictures. It helps check where a photo came from or whether a profile picture is copied.',
    n2: 'Each provider has its own privacy policy and may keep the picture or address you send it. Do not search with private photos you do not want to share.',
    n3: 'Results differ between providers, so try more than one. A missing match does not prove a picture is original.',
  },
  bn: {
    url: 'ছবির ঠিকানা',
    urlHint:
      'ছবিটির নিজস্ব পাবলিক ওয়েব ঠিকানা, যেমন https://example.com/photo.jpg। ছবিতে রাইট-ক্লিক করে “Copy image address” বেছে নিন।',
    submit: 'সার্চ লিংক তৈরি করুন',
    resultLabel: 'সার্চ লিংক',
    rUrl: 'ছবির ঠিকানা',
    rProviders: 'সার্চ প্রোভাইডার',
    linksTitle: 'সার্চ খুলুন',
    open: '{name} দিয়ে সার্চ করুন',
    newTab: '(নতুন ট্যাবে খোলে)',
    linkNote:
      'লিংক খুললে ছবির ঠিকানাটি ওই প্রোভাইডারের কাছে যায়, তারপর তারা ছবিটি নিয়ে আসে। এই সাইট নিজে কিছুই পাঠায় না।',
    deviceTitle: 'আপনার ডিভাইসের ছবি',
    deviceText:
      'আপনার ছবি গোপন রাখতে এই সাইট কখনো ফাইল আপলোড করে না। ডিভাইসের ছবি দিয়ে সার্চ করতে নিচের কোনো প্রোভাইডার খুলুন এবং তাদের পেজেই ছবিটি বেছে নিন। তখন ছবিটি শুধু সেই প্রোভাইডারের কাছে যায়।',
    deviceLink: '{name} খুলুন',
    e_empty: 'একটি ছবির ঠিকানা লিখুন।',
    e_invalid: 'পূর্ণ ওয়েব ঠিকানা লিখুন, যেমন https://example.com/photo.jpg।',
    e_scheme: 'শুধু http:// ও https:// ঠিকানা দিয়ে সার্চ করা যায়।',
    e_private:
      'ঠিকানাটি একটি প্রাইভেট নেটওয়ার্ক বা এই ডিভাইসের, তাই সার্চ প্রোভাইডার সেখানে পৌঁছাতে পারবে না। পাবলিক ঠিকানা দিন, অথবা প্রোভাইডারের পেজে ছবিটি আপলোড করুন।',
    'e_too-long': 'সার্চ লিংকের জন্য ঠিকানাটি খুব লম্বা (সর্বোচ্চ ২,০০০ অক্ষর)।',
    notesTitle: 'রিভার্স ইমেজ সার্চ সম্পর্কে',
    n1: 'রিভার্স ইমেজ সার্চ একই বা কাছাকাছি ছবি থাকা পেজ খুঁজে দেয়। কোনো ছবি কোথা থেকে এসেছে বা কোনো প্রোফাইল ছবি নকল কি না তা যাচাইয়ে এটি কাজে লাগে।',
    n2: 'প্রতিটি প্রোভাইডারের নিজস্ব প্রাইভেসি নীতি আছে এবং তারা পাঠানো ছবি বা ঠিকানা রেখে দিতে পারে। যে ব্যক্তিগত ছবি শেয়ার করতে চান না, তা দিয়ে সার্চ করবেন না।',
    n3: 'প্রোভাইডারভেদে ফলাফল আলাদা হয়, তাই একাধিকটি চেষ্টা করুন। মিল না পাওয়া মানেই ছবিটি মৌলিক নয়।',
  },
});

export const reverseImageSearch: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const external = (href: string, text: string): HTMLElement =>
    h(
      'a',
      { href, target: '_blank', rel: 'noopener noreferrer', class: 'btn' },
      text,
      h('span', { class: 'sr-only' }, ` ${L('newTab')}`),
    );

  const form = toolForm(ctx, {
    prefix: 'ris',
    fields: [
      {
        key: 'url',
        kind: 'text',
        label: L('url'),
        hint: L('urlHint'),
        type: 'url',
        inputmode: 'url',
      },
    ],
    submit: L('submit'),
    resultLabel: L('resultLabel'),
    compute(v) {
      const checked = checkImageUrl(v.url ?? '');
      if (!checked.ok) return { field: 'url', error: checked.error };
      const links = searchLinks(checked.value);
      return {
        rows: [
          { label: L('rUrl'), value: checked.value, lang: 'en' },
          { label: L('rProviders'), value: PROVIDERS.map((p) => p.name).join(', '), lang: 'en' },
        ],
        notes: [L('linkNote')],
        extra: h(
          'nav',
          { class: 'link-list', 'aria-label': L('linksTitle') },
          ...links.map((l) => external(l.href, L('open', { name: l.provider.name }))),
        ),
      };
    },
    errorText: (code) => L(`e_${code}` as Parameters<typeof L>[0]),
    notesText: [L('n1'), L('n2'), L('n3')],
    notesTitle: L('notesTitle'),
  });

  const device = h(
    'section',
    { class: 'tool-section', 'aria-labelledby': 'ris-device-title' },
    h('h2', { id: 'ris-device-title', class: 'tool-section-title' }, L('deviceTitle')),
    h('p', {}, L('deviceText')),
    h(
      'div',
      { class: 'link-list' },
      ...PROVIDERS.map((p) => external(p.uploadPage, L('deviceLink', { name: p.name }))),
    ),
  );

  return h('div', { class: 'tool-stack' }, form, device);
};
