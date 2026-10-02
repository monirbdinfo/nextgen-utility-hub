const BN = '০১২৩৪৫৬৭৮৯';

/** Replace Bangla digits (০-৯) with ASCII digits. Every other character is left unchanged. */
export function toEnglishDigits(text: string): string {
  return text.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
}

/** Replace ASCII digits (0-9) with Bangla digits. Every other character is left unchanged. */
export function toBanglaDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => BN[Number(d)] as string);
}

export function countDigits(text: string): { bangla: number; english: number } {
  return {
    bangla: (text.match(/[০-৯]/g) ?? []).length,
    english: (text.match(/[0-9]/g) ?? []).length,
  };
}
