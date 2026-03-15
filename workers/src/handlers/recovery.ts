import { db, schema } from '../db.js';
import { eq, and } from 'drizzle-orm';

const { aiGenerationTasks, products, userProfiles, creditTransactions } = schema;

/**
 * Refund frozen credits for a failed/cancelled task.
 * Looks up the product via referenceId to find the user.
 */
export async function refundCreditsForTask(
  referenceId: string,
  referenceType: string,
  reason: string
): Promise<void> {
  if (referenceType !== 'product') return;

  const product = await db.query.products.findFirst({
    where: eq(products.id, referenceId),
  });
  if (!product) return;

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, product.userId),
  });
  if (!userProfile) return;

  const { nanoid } = await import('nanoid');
  const now = new Date();

  await db.transaction(async (tx) => {
    // Unfreeze and refund
    await tx
      .update(userProfiles)
      .set({
        creditsFrozen: Math.max((userProfile.creditsFrozen || 0) - 1, 0),
        creditsBalance: (userProfile.creditsBalance || 0) + 1,
        updatedAt: now,
      })
      .where(eq(userProfiles.userId, product.userId));

    await tx.insert(creditTransactions).values({
      id: nanoid(),
      userId: product.userId,
      type: 'refund',
      amount: 1,
      balanceAfter: (userProfile.creditsBalance || 0) + 1,
      referenceId,
      description: reason,
      createdAt: now,
    });

    // Update AI generation task status if exists
    // Find AI gen task associated with this product that is not completed
    const genTasks = await tx.query.aiGenerationTasks.findMany({
      where: and(
        eq(aiGenerationTasks.productId, referenceId),
        eq(aiGenerationTasks.status, 'processing')
      ),
    });

    for (const task of genTasks) {
      await tx
        .update(aiGenerationTasks)
        .set({
          status: 'failed',
          errorMessage: reason,
          updatedAt: now,
        })
        .where(eq(aiGenerationTasks.id, task.id));
    }

    // Update product status to failed
    await tx
      .update(products)
      .set({
        status: 'failed',
        updatedAt: now,
      })
      .where(eq(products.id, referenceId));
  });
}
