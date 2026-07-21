export type ScorableQuestion = {
  id: string;
  options: { id: string; isCorrect: boolean }[];
};

export type QuizScoreResult = {
  score: number;
  passed: boolean;
  correctCount: number;
};

/**
 * Corrige um quiz: uma pergunta é considerada correta apenas se o conjunto de
 * alternativas marcadas for exatamente igual ao conjunto de alternativas
 * corretas (sem faltar nem sobrar nenhuma) — cobre single e multiple choice
 * com a mesma lógica. Extraído do route handler para ser testável.
 */
export function scoreQuiz(
  questions: ScorableQuestion[],
  answers: Record<string, string[] | undefined>,
  passingScore: number
): QuizScoreResult {
  let correctCount = 0;

  for (const question of questions) {
    const correctOptionIds = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
    const givenIds = new Set(answers[question.id] ?? []);
    const isCorrect =
      correctOptionIds.size === givenIds.size && [...correctOptionIds].every((id) => givenIds.has(id));
    if (isCorrect) correctCount += 1;
  }

  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const passed = score >= passingScore;

  return { score, passed, correctCount };
}
