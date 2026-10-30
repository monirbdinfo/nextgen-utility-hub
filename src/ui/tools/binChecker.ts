import { networkForPrefix, parseBin, type CardNetwork } from '../../calc/cardCheck';
import { toBanglaDigits } from '../../calc/digits';
import { defineStrings } from '../../i18n';
import type { ToolView } from './kit';
import { toolForm, type Outcome } from './toolForm';

const NETWORK_NAME: Record<CardNetwork, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

/** 8 digits plus a few spaces or hyphens: long enough for a BIN, too short for a card number. */
const MAX_INPUT = 11;

const S = defineStrings({
  en: {
    bin: 'BIN / IIN (first 6 to 8 digits of the card)',
    hint: 'Enter only the first 6 to 8 digits. Never enter a full card number; this tool does not accept one.',
    submit: 'Check BIN',
    rBin: 'BIN entered',
    rNetwork: 'Card network',
    rLengths: 'Card number lengths this network issues',
    rIssuer: 'Issuing bank',
    rCountry: 'Country of issue',
    rType: 'Card type (debit, credit, prepaid)',
    unknown: 'Not recognised from the published ranges',
    notAvailable: 'Not available: no approved BIN data source',
    digits: '{lengths} digits',
    e_empty: 'Enter the first 6 to 8 digits of a card.',
    e_characters: 'Use digits only (spaces and hyphens are ignored).',
    'e_too-short': 'A BIN has at least 6 digits.',
    'e_too-long':
      'Enter at most 8 digits. Do not enter a full card number: only the first 6 to 8 digits are needed.',
    n1: 'The network is worked out on this device from the card networks’ published number ranges. Nothing is sent anywhere.',
    n2: 'The issuing bank, country and card type are not shown. They come from licensed BIN databases, which this site does not use, so it does not guess them.',
    n3: 'Ranges change and some networks share prefixes through partnerships, so the network shown can be wrong for a particular card.',
  },
  bn: {
    bin: 'BIN / IIN (কার্ডের প্রথম ৬ থেকে ৮টি অঙ্ক)',
    hint: 'শুধু প্রথম ৬ থেকে ৮টি অঙ্ক লিখুন। কখনো পূর্ণ কার্ড নম্বর লিখবেন না; এই টুল তা গ্রহণ করে না।',
    submit: 'BIN পরীক্ষা করুন',
    rBin: 'লেখা BIN',
    rNetwork: 'কার্ড নেটওয়ার্ক',
    rLengths: 'এই নেটওয়ার্কের কার্ড নম্বরের দৈর্ঘ্য',
    rIssuer: 'ইস্যুকারী ব্যাংক',
    rCountry: 'ইস্যুর দেশ',
    rType: 'কার্ডের ধরন (ডেবিট, ক্রেডিট, প্রিপেইড)',
    unknown: 'প্রকাশিত রেঞ্জ থেকে চেনা যায়নি',
    notAvailable: 'পাওয়া যায় না: অনুমোদিত কোনো BIN ডেটা সোর্স নেই',
    digits: '{lengths} অঙ্ক',
    e_empty: 'কার্ডের প্রথম ৬ থেকে ৮টি অঙ্ক লিখুন।',
    e_characters: 'শুধু অঙ্ক ব্যবহার করুন (স্পেস ও হাইফেন বাদ যায়)।',
    'e_too-short': 'একটি BIN-এ অন্তত ৬টি অঙ্ক থাকে।',
    'e_too-long':
      'সর্বোচ্চ ৮টি অঙ্ক লিখুন। পূর্ণ কার্ড নম্বর লিখবেন না: শুধু প্রথম ৬ থেকে ৮টি অঙ্ক দরকার।',
    n1: 'কার্ড নেটওয়ার্কগুলোর প্রকাশিত নম্বর রেঞ্জ থেকে এই ডিভাইসেই নেটওয়ার্ক বের করা হয়। কিছুই কোথাও পাঠানো হয় না।',
    n2: 'ইস্যুকারী ব্যাংক, দেশ ও কার্ডের ধরন দেখানো হয় না। এগুলো আসে লাইসেন্সকৃত BIN ডেটাবেস থেকে, যা এই সাইট ব্যবহার করে না, তাই অনুমানও করে না।',
    n3: 'রেঞ্জ বদলায় এবং অংশীদারত্বের কারণে কিছু নেটওয়ার্ক একই প্রিফিক্স ব্যবহার করে, তাই কোনো নির্দিষ্ট কার্ডের জন্য দেখানো নেটওয়ার্ক ভুল হতে পারে।',
  },
});

export const binChecker: ToolView = (ctx) => {
  const L = S(ctx.lang);
  const local = (s: string): string => (ctx.lang === 'bn' ? toBanglaDigits(s) : s);
  const view = toolForm(ctx, {
    prefix: 'bin',
    submit: L('submit'),
    errorText: (code) => L(`e_${code}` as Parameters<typeof L>[0]),
    notesText: [L('n1'), L('n2'), L('n3'), ctx.t('toolPrivacy')],
    fields: [{ key: 'bin', kind: 'text', label: L('bin'), hint: L('hint'), inputmode: 'numeric' }],
    compute({ bin = '' }): Outcome {
      const r = parseBin(bin);
      if (!r.ok) return { field: 'bin', error: r.error };
      const net = networkForPrefix(r.value);
      return {
        rows: [
          {
            label: L('rNetwork'),
            value: net ? NETWORK_NAME[net.network] : L('unknown'),
            lang: net ? 'en' : undefined,
            primary: true,
          },
          { label: L('rBin'), value: r.value, lang: 'en' },
          ...(net
            ? [
                {
                  label: L('rLengths'),
                  value: L('digits', { lengths: local(net.lengths.join(', ')) }),
                },
              ]
            : []),
          { label: L('rIssuer'), value: L('notAvailable') },
          { label: L('rCountry'), value: L('notAvailable') },
          { label: L('rType'), value: L('notAvailable') },
        ],
      };
    },
  });
  const input = view.querySelector<HTMLInputElement>('#bin-bin');
  if (input) {
    input.maxLength = MAX_INPUT;
    input.autocomplete = 'off';
  }
  return view;
};
