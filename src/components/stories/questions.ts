import type { ThreadEntry } from "@/types/stories";

/** One of the agent's questions in a story's chat (a decision while planning, or about main). */
export type QuestionEntry = Extract<ThreadEntry, { kind: "question" }>;

/** A, B, C…: an option's place, so a decision can be referred to ("decision #148, A"). */
export const letter = (i: number) => String.fromCharCode(65 + i);

/** The answer in words: the option chosen, or what the person wrote under "Something else". */
export const answerText = (e: QuestionEntry) => (e.answer ? (e.answer.text ?? e.options[e.answer.option] ?? "") : "");
