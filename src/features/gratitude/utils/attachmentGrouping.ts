import type { Attachment } from '@/schemas/gratitudeEntrySchema';

export const groupAttachmentsByStatementIndex = (
  attachments: Attachment[] | null | undefined
): Map<number, Attachment[]> => {
  const grouped = new Map<number, Attachment[]>();

  for (const attachment of attachments ?? []) {
    const current = grouped.get(attachment.statement_index);
    if (current) {
      current.push(attachment);
    } else {
      grouped.set(attachment.statement_index, [attachment]);
    }
  }

  return grouped;
};
