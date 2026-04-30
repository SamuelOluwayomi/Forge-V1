// Simple HTML stripper to prevent basic XSS and normalize input
export function sanitizeText(input: string | undefined | null): string {
  if (!input) return "";
  return input
    // Remove all HTML tags
    .replace(/<[^>]*>?/gm, "")
    // Trim leading/trailing whitespace
    .trim();
}

// Validator for the Task Creation input
export function validateTaskInput(input: any) {
  const errors: string[] = [];

  const cleanTitle = sanitizeText(input.title);
  if (!cleanTitle || cleanTitle.length < 5 || cleanTitle.length > 100) {
    errors.push("Title must be between 5 and 100 characters.");
  }

  const cleanDesc = sanitizeText(input.description);
  if (!cleanDesc || cleanDesc.length < 20 || cleanDesc.length > 5000) {
    errors.push("Description must be between 20 and 5000 characters.");
  }

  const numAmount = parseFloat(input.amount);
  if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000) {
    errors.push("Amount must be a valid number between 0.01 and 1,000,000.");
  }

  const numReviewDays = parseInt(input.reviewDays, 10);
  if (isNaN(numReviewDays) || numReviewDays < 1 || numReviewDays > 7) {
    errors.push("Review window must be between 1 and 7 days (Contract requirement).");
  }

  const numDifficulty = parseInt(input.difficulty, 10);
  if (isNaN(numDifficulty) || numDifficulty < 1 || numDifficulty > 4) {
    errors.push("Difficulty must be between 1 and 4.");
  }

  let cleanUri = "";
  if (input.metadataUri) {
    cleanUri = sanitizeText(input.metadataUri);
    if (cleanUri.length > 200) {
      errors.push("Metadata URI must not exceed 200 characters.");
    }
    try {
      new URL(cleanUri);
    } catch {
      errors.push("Metadata URI must be a valid URL.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      title: cleanTitle,
      description: cleanDesc,
      amount: numAmount,
      reviewDays: numReviewDays,
      difficulty: numDifficulty,
      metadataUri: cleanUri,
      contactInfo: sanitizeText(input.contactInfo),
      expectedDays: input.expectedDays ? parseInt(input.expectedDays, 10) : null,
    },
  };
}

// Validator for verifying on-chain PDA structures before DB insertion
export function validateDbTaskEntry(input: any) {
  const errors: string[] = [];

  // Very basic base58 pubkey format check (just length and alphanumeric)
  const isPubkey = (str: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);

  if (!input.pda || !isPubkey(input.pda)) errors.push("Invalid PDA format.");
  if (!input.client || !isPubkey(input.client)) errors.push("Invalid client wallet format.");
  if (!input.task_id || isNaN(Number(input.task_id))) errors.push("Invalid task_id.");

  const cleanTitle = sanitizeText(input.title);
  if (!cleanTitle || cleanTitle.length > 100) errors.push("Invalid title.");

  const cleanDesc = sanitizeText(input.description);
  if (!cleanDesc || cleanDesc.length > 5000) errors.push("Invalid description.");

  if (!input.content_hash || input.content_hash.length !== 64) {
    errors.push("Invalid content hash format. Must be 64 char hex.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      pda: input.pda,
      client: input.client,
      task_id: Number(input.task_id),
      title: cleanTitle,
      description: cleanDesc,
      amount: Number(input.amount) || 0,
      difficulty: Number(input.difficulty) || 1,
      contact_info: sanitizeText(input.contact_info),
      listing_deadline: input.listing_deadline || null,
      task_type: input.task_type || "challenge",
      expected_days: input.expected_days ? parseInt(input.expected_days, 10) : null,
      skills: Array.isArray(input.skills) ? input.skills.map(sanitizeText) : [],
      ai_analysis: input.ai_analysis || null,
      content_hash: sanitizeText(input.content_hash),
    },
  };
}
