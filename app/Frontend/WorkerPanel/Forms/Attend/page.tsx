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

const FORMS_KEY = 'truth_panel_forms'; // Legacy fallback only

export default function AttendFormPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formId = searchParams.get('id');

	const [form, setForm] = useState<TruthPanelForm | null>(null);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [alreadySubmitted, setAlreadySubmitted] = useState(false);
	const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (!formId) return;
		
		const loadSurvey = async () => {
			try {
				const { fetchAllSurveys, fetchActiveSession } = await import('../../../../../utils/api');
				
				// Fetch the survey details from backend
				const surveysRes = await fetchAllSurveys();
				if (surveysRes?.success) {
					const found = surveysRes.data?.find((s: any) => s.id === formId);
					if (found) {
						// Normalize backend Questions structure to local shape
						setForm({
							id: found.id,
							title: found.title,
							description: found.description || '',
							createdAt: found.created_at,
							questions: (found.Questions || []).map((q: any) => ({
								id: q.id,
								type: q.question_type === 'MCQ' ? 'multiple_choice' : q.question_type,
								questionText: q.question_text,
								options: q.options || [],
							})),
						});
					}
				}
				
				// Auto-resolve the active live session for this survey
				const sessionRes = await fetchActiveSession(formId);
				if (sessionRes?.success && sessionRes.session?.id) {
					setSessionId(sessionRes.session.id);

					// Check if this worker already submitted for this session
					const { checkUserSubmission } = await import('../../../../../utils/api');
					const checkRes = await checkUserSubmission(sessionRes.session.id);
					if (checkRes?.already_submitted) setAlreadySubmitted(true);
				}
			} catch (err) {
				console.error('Failed to load survey', err);
			}
		};
		loadSurvey();
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

	const handleSubmit = async () => {
		if (!form || !sessionId) {
			console.error('Missing form or active session - cannot submit');
			return;
		}
		
		setIsSubmitting(true);
		try {
			const { submitUserResponse } = await import('../../../../../utils/api');
			
			// Submit each answer to the backend individually
			for (const question of form.questions) {
				const rawAnswer = answers[question.id];
				const answerValue = Array.isArray(rawAnswer) 
					? rawAnswer.join(', ') 
					: (rawAnswer || '');
				await submitUserResponse(sessionId, question.id, answerValue);
			}
			router.replace('/Frontend/WorkerPanel/Forms/Success');
		} catch (err) {
			console.error('Failed to submit responses', err);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (alreadySubmitted) {
		return (
			<main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
				<div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center justify-center px-5 text-center">
					<div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--PBlue)]">
						<span className="text-4xl text-white">✓</span>
					</div>
					<p className="font-[var(--font-poppins)] text-xl font-medium">Already Submitted</p>
					<p className="mt-2 font-[var(--font-inter)] text-sm text-[var(--OffBlack)]/60">
						You have already responded to this form. Each form can only be submitted once.
					</p>
					<button
						type="button"
						onClick={() => router.replace('/Frontend/WorkerPanel/Forms')}
						className="mt-6 rounded-xl bg-[var(--PBlue)] px-6 py-3 font-[var(--font-poppins)] text-sm text-white"
					>
						Back to Forms
					</button>
				</div>
			</main>
		);
	}

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
