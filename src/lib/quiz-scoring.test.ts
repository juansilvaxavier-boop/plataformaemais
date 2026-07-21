import { describe, expect, it } from "vitest";
import { scoreQuiz, type ScorableQuestion } from "./quiz-scoring";

const singleChoiceQuestion: ScorableQuestion = {
  id: "q1",
  options: [
    { id: "a", isCorrect: false },
    { id: "b", isCorrect: true },
    { id: "c", isCorrect: false },
  ],
};

const multipleChoiceQuestion: ScorableQuestion = {
  id: "q2",
  options: [
    { id: "x", isCorrect: true },
    { id: "y", isCorrect: true },
    { id: "z", isCorrect: false },
  ],
};

describe("scoreQuiz", () => {
  it("scores 100% when all answers are correct", () => {
    const result = scoreQuiz(
      [singleChoiceQuestion],
      { q1: ["b"] },
      70
    );
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.correctCount).toBe(1);
  });

  it("scores 0% when the answer is wrong", () => {
    const result = scoreQuiz([singleChoiceQuestion], { q1: ["a"] }, 70);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("requires the exact set of correct options for multiple choice (no partial credit)", () => {
    const missingOne = scoreQuiz([multipleChoiceQuestion], { q2: ["x"] }, 70);
    expect(missingOne.correctCount).toBe(0);

    const extraWrong = scoreQuiz([multipleChoiceQuestion], { q2: ["x", "y", "z"] }, 70);
    expect(extraWrong.correctCount).toBe(0);

    const exact = scoreQuiz([multipleChoiceQuestion], { q2: ["x", "y"] }, 70);
    expect(exact.correctCount).toBe(1);
  });

  it("treats a missing answer as incorrect rather than throwing", () => {
    const result = scoreQuiz([singleChoiceQuestion], {}, 70);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("applies the passing score as a strict cutoff", () => {
    const questions = [singleChoiceQuestion, multipleChoiceQuestion];
    // 1 de 2 corretas = 50%
    const result = scoreQuiz(questions, { q1: ["b"], q2: ["x"] }, 50);
    expect(result.score).toBe(50);
    expect(result.passed).toBe(true);

    const stricter = scoreQuiz(questions, { q1: ["b"], q2: ["x"] }, 51);
    expect(stricter.passed).toBe(false);
  });

  it("scores 0 for a quiz with no questions", () => {
    const result = scoreQuiz([], {}, 70);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });
});
