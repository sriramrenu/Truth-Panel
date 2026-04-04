'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FormQuestion {
	id: string;
	type: 'multiple_choice' | 'checkboxes' | 'short_text';
	questionText: string;
	options?: string[];
}

interface TruthPanelForm {
	id: string;
	title: string;
	description: string;
	createdAt: string;
	questions: FormQuestion[];
}

interface QuestionAnswer {
	questionId: string;
	questionText: string;
	answer: string | string[];
}

interface FormResponse {
	responseId: string;
	formId: string;
	formTitle: string;
	submittedAt: string;
	workerEmail: string;
	workerName: string;
	answers: QuestionAnswer[];
}

const FORMS_KEY = 'truth_panel_forms';

const getCurrentUser = () => {
	try {
		const raw = sessionStorage.getItem('truth_panel_user');
		if (!raw) return null;
		return JSON.parse(raw) as { email: string; name: string; role: string };
	} catch {
		return null;
	}
};

const readForms = (): TruthPanelForm[] => {
	try {
		const raw = localStorage.getItem(FORMS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

export default function AttendFormPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formId = searchParams.get('id');

	const [form, setForm] = useState<TruthPanelForm | null>(null);
	const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

	useEffect(() => {
		const forms = readForms();
		const targetForm = forms.find((item) => item.id === formId) ?? null;
		setForm(targetForm);
	}, [formId]);

	const currentQuestion = form?.questions[currentQuestionIndex];
	const totalQuestions = form?.questions.length ?? 0;
	const isLastQuestion = totalQuestions > 0 && currentQuestionIndex === totalQuestions - 1;

	const progress = useMemo(() => {
		if (!totalQuestions) return 0;
		return ((currentQuestionIndex + 1) / totalQuestions) * 100;
	}, [currentQuestionIndex, totalQuestions]);

	const hasCurrentAnswer = useMemo(() => {
		if (!currentQuestion) return false;
		const answer = answers[currentQuestion.id];

		if (currentQuestion.type === 'checkboxes') {
			return Array.isArray(answer) && answer.length > 0;
		}

		if (typeof answer === 'string') {
			return answer.trim().length > 0;
		}

		return false;
	}, [answers, currentQuestion]);

	const selectMultipleChoice = (questionId: string, option: string) => {
		setAnswers((prev) => ({ ...prev, [questionId]: option }));
	};

	const toggleCheckbox = (questionId: string, option: string) => {
		setAnswers((prev) => {
			const currentValue = prev[questionId];
			const list = Array.isArray(currentValue) ? currentValue : [];
			const next = list.includes(option) ? list.filter((item) => item !== option) : [...list, option];
			return { ...prev, [questionId]: next };
		});
	};

	const setShortText = (questionId: string, value: string) => {
		setAnswers((prev) => ({ ...prev, [questionId]: value }));
	};

	const handleSubmit = () => {
		if (!form) return;
		const user = getCurrentUser();
		if (!user) return;

		const response: FormResponse = {
			responseId: Date.now().toString(),
			formId: form.id,
			formTitle: form.title,
			submittedAt: new Date().toISOString(),
			workerEmail: user.email,
			workerName: user.name,
			answers: form.questions.map((question) => ({
				questionId: question.id,
				questionText: question.questionText,
				answer: answers[question.id] ?? '',
			})),
		};

		const userKey = `truth_panel_responses__${user.email}`;
		const existing: FormResponse[] = JSON.parse(localStorage.getItem(userKey) || '[]');
		localStorage.setItem(userKey, JSON.stringify([...(Array.isArray(existing) ? existing : []), response]));
		router.replace('/Frontend/WorkerPanel/Forms/Success');
	};

	if (!form || !currentQuestion) {
		return (
			<main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
				<div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center justify-center px-5 text-center">
					<p className="font-[var(--font-poppins)] text-lg font-medium">Form not found</p>
					<button
						type="button"
						onClick={() => router.push('/Frontend/WorkerPanel/Forms')}
						className="mt-4 rounded-xl bg-[var(--PBlue)] px-4 py-2 font-[var(--font-poppins)] text-sm text-white"
					>
						Back to Forms
					</button>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
			<div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col pb-24">
				<header className="bg-white px-4 pb-3 pt-4 shadow-[0_1px_10px_rgba(13,22,11,0.08)]">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => router.push('/Frontend/WorkerPanel/Forms')}
							className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--OffBlack)]/15 font-[var(--font-poppins)] text-lg"
							aria-label="Back to forms"
						>
							{'<'}
						</button>
						<h1 className="truncate font-[var(--font-poppins)] text-lg font-medium">{form.title || 'Untitled Form'}</h1>
					</div>

					<div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--OffWhite)]">
						<div className="h-full rounded-full bg-[var(--PBlue)] transition-all" style={{ width: `${progress}%` }} />
					</div>
				</header>

				<section className="flex-1 px-4 py-5">
					<article className="rounded-2xl bg-white p-4 shadow-sm">
						<p className="font-[var(--font-inter)] text-xs font-light text-[var(--PBlue)]">
							Question {currentQuestionIndex + 1} of {totalQuestions}
						</p>
						<h2 className="mt-2 font-[var(--font-poppins)] text-lg font-medium text-[var(--OffBlack)]">
							{currentQuestion.questionText}
						</h2>

						<div className="mt-4 space-y-2">
							{currentQuestion.type === 'multiple_choice'
								? (currentQuestion.options ?? []).map((option, optionIndex) => {
										const selected = answers[currentQuestion.id] === option;
										return (
											<button
												key={`${currentQuestion.id}-mc-${optionIndex}`}
												type="button"
												onClick={() => selectMultipleChoice(currentQuestion.id, option)}
												className={`w-full rounded-xl border px-3 py-3 text-left font-[var(--font-poppins)] text-sm transition ${
													selected
														? 'border-[var(--PBlue)] bg-[var(--PBlue)] text-white'
														: 'border-[var(--PBlue)] bg-white text-[var(--OffBlack)]'
												}`}
											>
												{option}
											</button>
										);
									})
								: null}

							{currentQuestion.type === 'checkboxes'
								? (currentQuestion.options ?? []).map((option, optionIndex) => {
										const selected =
											Array.isArray(answers[currentQuestion.id]) &&
											(answers[currentQuestion.id] as string[]).includes(option);

										return (
											<button
												key={`${currentQuestion.id}-cb-${optionIndex}`}
												type="button"
												onClick={() => toggleCheckbox(currentQuestion.id, option)}
												className={`w-full rounded-xl border px-3 py-3 text-left font-[var(--font-poppins)] text-sm transition ${
													selected
														? 'border-[var(--PBlue)] bg-[var(--PBlue)] text-white'
														: 'border-[var(--PBlue)] bg-white text-[var(--OffBlack)]'
												}`}
											>
												{option}
											</button>
										);
									})
								: null}

							{currentQuestion.type === 'short_text' ? (
								<input
									type="text"
									value={typeof answers[currentQuestion.id] === 'string' ? (answers[currentQuestion.id] as string) : ''}
									onChange={(event) => setShortText(currentQuestion.id, event.target.value)}
									placeholder="Type your answer here..."
									className="w-full border-b border-[color:var(--OffBlack)]/20 bg-transparent px-1 py-2 font-[var(--font-inter)] text-sm outline-none focus:border-[var(--PBlue)]"
								/>
							) : null}
						</div>
					</article>
				</section>
			</div>

			<footer className="fixed inset-x-0 bottom-0 z-20 flex justify-center border-t border-[color:var(--OffBlack)]/10 bg-white px-4 py-3">
				<div className="flex w-full max-w-[390px] items-center justify-between gap-3">
					{currentQuestionIndex === 0 ? (
						<div className="h-11 w-[120px]" />
					) : (
						<button
							type="button"
							onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
							className="h-11 w-[120px] rounded-xl border border-[var(--PBlue)] font-[var(--font-poppins)] text-sm font-medium text-[var(--PBlue)]"
						>
							Previous
						</button>
					)}

					{isLastQuestion ? (
						<button
							type="button"
							disabled={!hasCurrentAnswer}
							onClick={handleSubmit}
							className="h-11 w-[120px] rounded-xl bg-[var(--SYellow)] font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)] disabled:cursor-not-allowed disabled:opacity-40"
						>
							Submit
						</button>
					) : (
						<button
							type="button"
							disabled={!hasCurrentAnswer}
							onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
							className="h-11 w-[120px] rounded-xl bg-[var(--PBlue)] font-[var(--font-poppins)] text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
						>
							Next
						</button>
					)}
				</div>
			</footer>
		</main>
	);
}
